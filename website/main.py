from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Depends, HTTPException, Response, Cookie
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import uvicorn
import asyncio
import json
import os
import uuid
import bcrypt
import mysql.connector
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
import pandas as pd
from datetime import datetime

load_dotenv()

# --- Config ---
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.emqx.io")
MQTT_TOPIC  = os.getenv("MQTT_TOPIC", "postura")
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "db"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "database": os.getenv("DB_NAME", "postura_db")
}

# --- Pydantic Models ---
class UserLogin(BaseModel):
    username: str # This is the Email
    password: str

class UserRegister(BaseModel):
    full_name: str
    username: str # This is the Email
    password: str

# --- Database Dependency ---
def get_db():
    conn = mysql.connector.connect(**DB_CONFIG)
    try:
        yield conn
    finally:
        conn.close()

# --- Auth Helper  ---
def get_current_user(session_token: str | None = Cookie(None), conn=Depends(get_db)):
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id FROM sessions WHERE session_token = %s", (session_token,))
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=401, detail="Invalid session")
        return session['user_id']
    finally:
        cursor.close()

# --- CSV Reader Helper ---
def get_csv_stats():
    csv_path = "posture_data.csv"
    if not os.path.exists(csv_path):
        return None

    try:
        df = pd.read_csv(csv_path)
        if df.empty:
            return None

        # 1. Convert timestamp column and categorize
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        total_rows = len(df)
        good_df = df[df['label'] == 'GOOD']
        severe_df = df[df['label'] == 'SEVERE_SLOUCH']
        # Everything else is "leaning"
        leaning_df = df[~df['label'].isin(['GOOD', 'SEVERE_SLOUCH'])]

        # 2. Calculate Percentages for cards
        good_pct = round((len(good_df) / total_rows) * 100) if total_rows > 0 else 0
        leaning_pct = round((len(leaning_df) / total_rows) * 100) if total_rows > 0 else 0
        severe_pct = round((len(severe_df) / total_rows) * 100) if total_rows > 0 else 0

        # 3. Calculate Durations (approx 5s per row)
        def format_time(seconds):
            h, m = divmod(seconds // 60, 60)
            return f"{h}h {m}m" if h > 0 else f"{m}m"

        # 4. Correct Resampling Logic for Line Chart
        # We create a temporary numeric column where GOOD = 100, others = 0
        df['quality_score'] = df['label'].apply(lambda x: 100 if x == 'GOOD' else 0)
        
        # Set index to timestamp to allow resampling the DataFrame
        df_resample = df.set_index('timestamp')
        
        # Resample the 'quality_score' column into 15-minute averages
        resampled = df_resample['quality_score'].resample('15min').mean().fillna(0)
        
        timeline = resampled.round().tolist()
        # Format the index timestamps directly into strings
        chart_labels = resampled.index.strftime('%H:%M').tolist()

        # 5. Extract Last 5 Alerts (Newest First)
        alerts = df[df['label'] != 'GOOD'].tail(5).copy()
        alerts_list = []
        for _, row in alerts.iloc[::-1].iterrows():
            alerts_list.append({
                "msg": row['label'].replace('_', ' ').title(),
                "time": row['timestamp'].strftime('%I:%M %p'),
                "type": "red" if "SEVERE" in row['label'] else "yellow"
            })

        return {
            "good_pct": good_pct,
            "leaning_pct": leaning_pct,
            "severe_pct": severe_pct,
            "good_time": format_time(len(good_df) * 5),
            "leaning_time": format_time(len(leaning_df) * 5),
            "severe_time": format_time(len(severe_df) * 5),
            "total_time": format_time(total_rows * 5),
            "chart_data": timeline[-12:],   # Last 3 hours of data
            "chart_labels": chart_labels[-12:],
            "alerts": alerts_list
        }
    except Exception as e:
        print(f"Error processing CSV: {e}")
        return None

# --- MQTT & Live Feed ---
clients: list[WebSocket] = []
current_frame = None

def on_message(client, userdata, msg):
    global current_frame
    try:
        data = json.loads(msg.payload.decode())
        current_frame = data
    except: pass

mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
mqtt_client.on_message = on_message

async def broadcast_loop():
    global current_frame
    while True:
        if current_frame and clients:
            payload = json.dumps({"type": "frame", **current_frame})
            for ws in clients[:]:
                try: await ws.send_text(payload)
                except: clients.remove(ws)
            current_frame = None
        await asyncio.sleep(0.1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    mqtt_client.connect(MQTT_BROKER, 1883, 60)
    mqtt_client.subscribe(f"{MQTT_TOPIC}/thermal")
    mqtt_client.loop_start()
    asyncio.create_task(broadcast_loop())
    yield
    mqtt_client.loop_stop()

app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# --- Page Routes ---

@app.get("/")
async def root(session_token: str = Cookie(None), conn=Depends(get_db)):
    if not session_token: return RedirectResponse("/login")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM sessions WHERE session_token = %s", (session_token,))
    if not cursor.fetchone():
        cursor.close()
        return RedirectResponse("/login")
    cursor.close()
    return RedirectResponse("/dashboard")

@app.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/dashboard")
async def dashboard_page(request: Request, user_id=Depends(get_current_user), conn=Depends(get_db)):
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT full_name, username FROM users WHERE id = %s", (user_id,))
    user_data = cursor.fetchone()
    cursor.close()

    stats = get_csv_stats()

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "user": user_data,
        "stats": stats
    })
# --- Auth API ---

@app.post("/api/register")
async def register(creds: UserRegister, conn=Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = %s", (creds.username,))
    if cursor.fetchone():
        cursor.close()
        raise HTTPException(status_code=400, detail="Account already exists.")

    hashed = bcrypt.hashpw(creds.password.encode(), bcrypt.gensalt()).decode()
    cursor.execute(
        "INSERT INTO users (username, full_name, password_hash) VALUES (%s, %s, %s)", 
        (creds.username, creds.full_name, hashed)
    )
    conn.commit()
    cursor.close()
    return {"success": True}

@app.post("/api/login")
async def login(creds: UserLogin, response: Response, conn=Depends(get_db)):
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, password_hash FROM users WHERE username = %s", (creds.username,))
    user = cursor.fetchone()

    if not user or not bcrypt.checkpw(creds.password.encode(), user['password_hash'].encode()):
        cursor.close()
        raise HTTPException(status_code=401, detail="Incorrect credentials.")

    token = str(uuid.uuid4())
    cursor.execute("INSERT INTO sessions (user_id, session_token) VALUES (%s, %s)", (user['id'], token))
    conn.commit()
    cursor.close()
    
    response.set_cookie(key="session_token", value=token, httponly=True)
    return {"success": True}

@app.post("/api/logout")
async def logout(response: Response, session_token: str = Cookie(None), conn=Depends(get_db)):
    if session_token:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE session_token = %s", (session_token,))
        conn.commit()
        cursor.close()
    response.delete_cookie("session_token")
    return {"success": True}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in clients: clients.remove(websocket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)