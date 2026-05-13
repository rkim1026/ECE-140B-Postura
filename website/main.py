from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import uvicorn
import asyncio
import json
import os
import csv
import copy
from datetime import datetime
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv()

# ── MQTT Configuration ─────────────────────────────────────
CLIENT_ID    = os.getenv("CLIENT_ID",    "chuach1")
TOPIC_PREFIX = os.getenv("TOPIC_PREFIX", "chuach1")
MQTT_BROKER  = os.getenv("MQTT_BROKER",  "broker.emqx.io")

TOPIC_DATA   = f"{TOPIC_PREFIX}/data"
TOPIC_CAL    = f"{TOPIC_PREFIX}/calibration"
TOPIC_STATUS = f"{TOPIC_PREFIX}/status"
TOPIC_CMD    = f"{TOPIC_PREFIX}/cmd"

CSV_FILE = "posture_data.csv"
CSV_HEADERS = (
    ["timestamp", "label", "vert", "horiz", "mean", "missing"]
    + [f"dev{i}"    for i in range(64)]
    + [f"raw{i}"    for i in range(64)]
    + [f"cal{i}"    for i in range(64)]
    + [f"stddev{i}" for i in range(64)]
    + [f"valid{i}"  for i in range(64)]
)

# ── Shared State ───────────────────────────────────────────
clients: list[WebSocket] = []
latest_frame    = None
last_good_frame = None
calibration     = None
system_status   = "waiting"

# ── CSV Helpers ────────────────────────────────────────────
def init_csv():
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, "w", newline="") as f:
            csv.writer(f).writerow(CSV_HEADERS)

def count_csv_rows() -> int:
    if not os.path.exists(CSV_FILE): return 0
    with open(CSV_FILE, "r") as f:
        return max(0, sum(1 for _ in f) - 1)

def save_to_csv(label: str, frame: dict, cal: dict) -> int:
    init_csv()
    row = (
        [datetime.now().isoformat(), label,
         frame.get("vert", 0), frame.get("horiz", 0),
         frame.get("mean", 0), frame.get("missing", 0)]
        + frame.get("dev",   [0] * 64)
        + frame.get("grid",  [0] * 64)
        + cal.get("baseline", [0] * 64)
        + cal.get("stddev",   [0] * 64)
        + cal.get("valid",    [0] * 64)
    )
    with open(CSV_FILE, "a", newline="") as f:
        csv.writer(f).writerow(row)
    return count_csv_rows()

# ── MQTT Callbacks ─────────────────────────────────────────
def on_connect(client, userdata, flags, reason_code, properties):
    print(f"[MQTT] Connected to {MQTT_BROKER}")
    client.subscribe([(TOPIC_DATA, 0), (TOPIC_CAL, 0), (TOPIC_STATUS, 0)])

def on_message(client, userdata, msg):
    global latest_frame, last_good_frame, calibration, system_status
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode()) if topic != TOPIC_STATUS else msg.payload.decode()
        
        if topic == TOPIC_DATA:
            latest_frame = payload
            last_good_frame = copy.deepcopy(payload)
        elif topic == TOPIC_CAL:
            calibration = payload
        elif topic == TOPIC_STATUS:
            system_status = payload
    except Exception as e:
        print(f"[MQTT] Error: {e}")

mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"{CLIENT_ID}-server")
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# ── Broadcast Loop ─────────────────────────────────────────
async def broadcast_frames():
    global latest_frame
    while True:
        if latest_frame and clients:
            msg = json.dumps({
                "type": "frame",
                "status": system_status,
                "frame": latest_frame,
                "calibration": calibration,
                "csv_count": count_csv_rows()
            })
            for ws in clients[:]:
                try: await ws.send_text(msg)
                except: clients.remove(ws)
            latest_frame = None
        await asyncio.sleep(0.1)

# ── App Lifespan ───────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_csv()
    mqtt_client.connect(MQTT_BROKER, 1883, 60)
    mqtt_client.loop_start()
    asyncio.create_task(broadcast_frames())
    yield
    mqtt_client.loop_stop()

# ── FastAPI Setup ──────────────────────────────────────────
app = FastAPI(lifespan=lifespan)

# Mount the static directory so CSS/JS files are accessible at /static
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates directory for HTML files
templates = Jinja2Templates(directory="templates")

# ── Page Routes ────────────────────────────────────────────

@app.get("/")
async def home(request: Request):
    """Serves the login/index page."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/dashboard")
async def dashboard(request: Request):
    """Serves the main posture tracking dashboard."""
    return templates.TemplateResponse("dashboard.html", {"request": request})

# ── API & WebSocket Routes ─────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    await websocket.send_text(json.dumps({
        "type": "init",
        "status": system_status,
        "calibration": calibration,
        "csv_count": count_csv_rows()
    }))
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in clients: clients.remove(websocket)

@app.post("/api/calibrate")
async def trigger_calibrate():
    mqtt_client.publish(TOPIC_CMD, "CALIBRATE")
    return {"success": True}

@app.post("/api/save-posture")
async def collect_frame(request: Request):
    frame_snap = copy.deepcopy(last_good_frame)
    cal_snap   = copy.deepcopy(calibration)

    if not frame_snap or not cal_snap:
        return {"success": False, "error": "Missing data or calibration"}

    body = await request.json()
    label = body.get("label", "").strip()
    
    total = save_to_csv(label, frame_snap, cal_snap)
    return {"success": True, "label": label, "csv_count": total}

@app.get("/api/status")
async def get_status():
    return {
        "status": system_status,
        "has_frame": last_good_frame is not None,
        "has_calibration": calibration is not None,
        "csv_count": count_csv_rows()
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)