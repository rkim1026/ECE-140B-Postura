from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import uvicorn
import asyncio
import json
import os
import csv
from datetime import datetime
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID    = os.getenv("CLIENT_ID",    "chuach1")
TOPIC_PREFIX = os.getenv("TOPIC_PREFIX", "chuach1")
MQTT_BROKER  = os.getenv("MQTT_BROKER",  "broker.emqx.io")

TOPIC_DATA   = f"{TOPIC_PREFIX}/data"
TOPIC_CAL    = f"{TOPIC_PREFIX}/calibration"
TOPIC_STATUS = f"{TOPIC_PREFIX}/status"
TOPIC_CMD    = f"{TOPIC_PREFIX}/cmd"

CSV_FILE = "posture_data.csv"

# CSV column headers — 326 total columns
CSV_HEADERS = (
    ["timestamp", "label", "vert", "horiz", "mean", "missing"]
    + [f"dev{i}"    for i in range(64)]
    + [f"raw{i}"    for i in range(64)]
    + [f"cal{i}"    for i in range(64)]
    + [f"stddev{i}" for i in range(64)]
    + [f"valid{i}"  for i in range(64)]
)

# ── Shared state ───────────────────────────────────────────
clients: list[WebSocket] = []
latest_frame  = None
calibration   = None
system_status = "waiting"

# ── CSV helpers ────────────────────────────────────────────
def init_csv():
    """Create CSV with headers only if it doesn't exist."""
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(CSV_HEADERS)
        print(f"[CSV] Created {CSV_FILE}")
    else:
        print(f"[CSV] Found existing {CSV_FILE} ({count_csv_rows()} rows)")

def count_csv_rows() -> int:
    """Count data rows (excludes header). Returns 0 if file missing."""
    if not os.path.exists(CSV_FILE):
        return 0
    with open(CSV_FILE, "r") as f:
        return max(0, sum(1 for _ in f) - 1)

def save_to_csv(label: str, frame: dict, cal: dict) -> int:
    """
    Write one fully-featured row. Returns new total row count.
    Auto-creates the file with headers if it was deleted.
    """
    init_csv()  # safe to call repeatedly — only creates if missing

    dev    = frame.get("dev",  [0] * 64)
    raw    = frame.get("grid", [0] * 64)
    cal_b  = cal.get("baseline", [0] * 64)
    stddev = cal.get("stddev",   [0] * 64)
    valid  = cal.get("valid",    [0] * 64)

    row = (
        [datetime.now().isoformat(), label,
         frame.get("vert", 0), frame.get("horiz", 0),
         frame.get("mean", 0), frame.get("missing", 0)]
        + dev
        + raw
        + cal_b
        + stddev
        + valid
    )

    with open(CSV_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(row)

    total = count_csv_rows()
    print(f"[CSV] Saved row #{total} — label: {label}")
    return total

# ── MQTT callbacks ─────────────────────────────────────────
def on_connect(client, userdata, flags, reason_code, properties):
    print(f"[MQTT] Connected to {MQTT_BROKER} (rc={reason_code})")
    client.subscribe(TOPIC_DATA)
    client.subscribe(TOPIC_CAL)
    client.subscribe(TOPIC_STATUS)

def on_message(client, userdata, msg):
    global latest_frame, calibration, system_status
    try:
        topic = msg.topic
        if topic == TOPIC_DATA:
            latest_frame = json.loads(msg.payload.decode())
        elif topic == TOPIC_CAL:
            calibration  = json.loads(msg.payload.decode())
            print(f"[MQTT] Calibration received — {calibration.get('frames','?')} frames")
        elif topic == TOPIC_STATUS:
            system_status = msg.payload.decode()
            print(f"[MQTT] Status: {system_status}")
    except Exception as e:
        print(f"[MQTT] Parse error on {msg.topic}: {e}")

def on_disconnect(client, userdata, flags, reason_code, properties):
    print(f"[MQTT] Disconnected (rc={reason_code})")

mqtt_client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id=f"{CLIENT_ID}-server"
)
mqtt_client.on_connect    = on_connect
mqtt_client.on_message    = on_message
mqtt_client.on_disconnect = on_disconnect

# ── WebSocket broadcaster ──────────────────────────────────
async def broadcast_frames():
    global latest_frame
    while True:
        if latest_frame and clients:
            msg = json.dumps({
                "type":        "frame",
                "status":      system_status,
                "frame":       latest_frame,
                "calibration": calibration,
                "csv_count":   count_csv_rows()
            })
            dead = []
            for ws in clients:
                try:
                    await ws.send_text(msg)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                if ws in clients:
                    clients.remove(ws)
            latest_frame = None
        await asyncio.sleep(0.1)

# ── App lifespan ───────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_csv()
    mqtt_client.connect(MQTT_BROKER, 1883, 60)
    mqtt_client.loop_start()
    asyncio.create_task(broadcast_frames())
    yield
    mqtt_client.loop_stop()
    mqtt_client.disconnect()

app = FastAPI(lifespan=lifespan)
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Routes ─────────────────────────────────────────────────
@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    print(f"[WS] Client connected ({len(clients)} total)")

    # Send current state immediately on connect
    if calibration or latest_frame:
        await websocket.send_text(json.dumps({
            "type":        "init",
            "status":      system_status,
            "frame":       latest_frame,
            "calibration": calibration,
            "csv_count":   count_csv_rows()
        }))

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in clients:
            clients.remove(websocket)
        print(f"[WS] Client disconnected ({len(clients)} remaining)")

@app.post("/api/calibrate")
async def trigger_calibrate():
    mqtt_client.publish(TOPIC_CMD, "CALIBRATE")
    print("[API] Sent CALIBRATE to ESP32")
    return {"success": True, "message": "Calibration command sent"}

@app.post("/api/collect")
async def collect_frame(request: Request):
    global latest_frame, calibration

    if latest_frame is None:
        return {"success": False, "error": "No live frame available yet"}
    if calibration is None:
        return {"success": False, "error": "No calibration data — calibrate first"}

    body  = await request.json()
    label = body.get("label", "").strip()

    valid_labels = [
        "GOOD", "MILD_SLOUCH", "SEVERE_SLOUCH",
        "LEANING_BACK", "LATERAL_LEAN", "OVER_SHOULDER"
    ]
    if label not in valid_labels:
        return {"success": False, "error": f"Invalid label: {label}"}

    # Snapshot the frame (don't let broadcast clear it mid-write)
    frame_snapshot = dict(latest_frame)

    total = save_to_csv(label, frame_snapshot, calibration)
    return {"success": True, "label": label, "csv_count": total}

@app.get("/api/status")
async def get_status():
    return {
        "status":           system_status,
        "has_calibration":  calibration is not None,
        "calibration_frames": calibration.get("frames") if calibration else None,
        "csv_count":        count_csv_rows()
    }

@app.get("/api/calibration")
async def get_calibration():
    if calibration:
        return {"success": True, "calibration": calibration}
    return {"success": False, "error": "No calibration data yet"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)