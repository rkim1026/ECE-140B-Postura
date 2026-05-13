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
import uuid
from datetime import datetime
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID    = os.getenv("CLIENT_ID",    "chuach1234")
TOPIC_PREFIX = os.getenv("TOPIC_PREFIX", "chuach1234")
MQTT_BROKER  = os.getenv("MQTT_BROKER",  "broker.emqx.io")

TOPIC_DATA   = f"{TOPIC_PREFIX}/data"
TOPIC_CAL    = f"{TOPIC_PREFIX}/calibration"
TOPIC_STATUS = f"{TOPIC_PREFIX}/status"
TOPIC_CMD    = f"{TOPIC_PREFIX}/cmd"

CSV_FILE = "posture_data.csv"

CSV_HEADERS = (
    ["timestamp", "label",
     "vert", "d_vert", "cal_vert",
     "mean", "leanback_thresh"]
    + [f"dev{i}"    for i in range(64)]
    + [f"raw{i}"    for i in range(64)]
    + [f"cal{i}"    for i in range(64)]
    + [f"stddev{i}" for i in range(64)]
    + [f"valid{i}"  for i in range(64)]
)

VALID_LABELS = ["GOOD", "MILD_SLOUCH", "SEVERE_SLOUCH", "LEANING_BACK"]

clients: list[WebSocket] = []
latest_frame    = None
last_good_frame = None
calibration     = None
system_status   = "waiting"


def init_csv():
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, "w", newline="") as f:
            csv.writer(f).writerow(CSV_HEADERS)
        print(f"[CSV] Created {CSV_FILE}")
    else:
        print(f"[CSV] Found existing {CSV_FILE} ({count_csv_rows()} rows)")


def count_csv_rows() -> int:
    if not os.path.exists(CSV_FILE):
        return 0
    with open(CSV_FILE, "r") as f:
        return max(0, sum(1 for _ in f) - 1)


def save_to_csv(label: str, frame: dict, cal: dict) -> int:
    init_csv()
    row = (
        [datetime.now().isoformat(), label,
         frame.get("vert",    0),
         frame.get("d_vert",  0),
         frame.get("cal_vert",0),
         frame.get("mean",    0),
         cal.get("leanback_thresh", 0)]
        + frame.get("dev",  [0] * 64)
        + frame.get("grid", [0] * 64)
        + cal.get("baseline", [0] * 64)
        + cal.get("stddev",   [0] * 64)
        + cal.get("valid",    [0] * 64)
    )
    with open(CSV_FILE, "a", newline="") as f:
        csv.writer(f).writerow(row)
    total = count_csv_rows()
    print(f"[CSV] Saved row #{total} — label: {label}")
    return total


def on_connect(client, userdata, flags, reason_code, properties):
    print(f"[MQTT] Connected to {MQTT_BROKER} (rc={reason_code})")
    client.subscribe(TOPIC_DATA)
    client.subscribe(TOPIC_CAL)
    client.subscribe(TOPIC_STATUS)


def on_message(client, userdata, msg):
    global latest_frame, last_good_frame, calibration, system_status
    try:
        topic = msg.topic
        if topic == TOPIC_DATA:
            parsed          = json.loads(msg.payload.decode())
            latest_frame    = parsed
            last_good_frame = copy.deepcopy(parsed)
        elif topic == TOPIC_CAL:
            calibration = json.loads(msg.payload.decode())
            print(f"[MQTT] Calibration received — {calibration.get('frames','?')} frames "
                  f"| NatVert={calibration.get('cal_vert','?')}")
        elif topic == TOPIC_STATUS:
            system_status = msg.payload.decode()
            print(f"[MQTT] Status: {system_status}")
    except Exception as e:
        print(f"[MQTT] Parse error on {msg.topic}: {e}")


def on_disconnect(client, userdata, flags, reason_code, properties):
    print(f"[MQTT] Disconnected (rc={reason_code})")


mqtt_client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2,
    client_id=f"{CLIENT_ID}-server-{uuid.uuid4().hex[:6]}"
)
mqtt_client.on_connect    = on_connect
mqtt_client.on_message    = on_message
mqtt_client.on_disconnect = on_disconnect


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


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    print(f"[WS] Client connected ({len(clients)} total)")
    if calibration or last_good_frame:
        await websocket.send_text(json.dumps({
            "type":        "init",
            "status":      system_status,
            "frame":       last_good_frame,
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
    frame_snap = copy.deepcopy(last_good_frame)
    cal_snap   = copy.deepcopy(calibration)

    if frame_snap is None:
        return {"success": False,
                "error": "No frame received yet — is the ESP32 on and publishing?"}
    if cal_snap is None:
        return {"success": False,
                "error": "No calibration — press Start Calibration first"}

    body  = await request.json()
    label = body.get("label", "").strip()

    if label not in VALID_LABELS:
        return {"success": False, "error": f"Invalid label '{label}'"}

    total = save_to_csv(label, frame_snap, cal_snap)
    return {"success": True, "label": label, "csv_count": total}


@app.get("/api/status")
async def get_status():
    return {
        "status":             system_status,
        "has_frame":          last_good_frame is not None,
        "has_calibration":    calibration is not None,
        "calibration_frames": calibration.get("frames")   if calibration else None,
        "cal_vert":           calibration.get("cal_vert") if calibration else None,
        "csv_count":          count_csv_rows()
    }


@app.get("/api/calibration")
async def get_calibration():
    if calibration:
        return {"success": True, "calibration": calibration}
    return {"success": False, "error": "No calibration data yet"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)