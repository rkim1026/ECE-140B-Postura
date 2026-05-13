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
    username: str # Email
    password: str

class UserRegister(BaseModel):
    full_name: str
    username: str # Email
    password: str

# --- Database Dependency ---
def get_db():
    conn = mysql.connector.connect(**DB_CONFIG)
    try:
        yield conn
    finally:
        conn.close()

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
    """Redirects to dashboard if logged in, otherwise login page."""
    if not session_token: return RedirectResponse("/login")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM sessions WHERE session_token = %s", (session_token,))
    if not cursor.fetchone(): return RedirectResponse("/login")
    return RedirectResponse("/dashboard")

@app.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/dashboard")
async def dashboard_page(request: Request, session_token: str = Cookie(None), conn=Depends(get_db)):
    if not session_token: return RedirectResponse("/login")
    return templates.TemplateResponse("dashboard.html", {"request": request})

# --- Auth API ---

@app.post("/api/register")
async def register(creds: UserRegister, conn=Depends(get_db)):
    cursor = conn.cursor()
    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE username = %s", (creds.username,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    hashed = bcrypt.hashpw(creds.password.encode(), bcrypt.gensalt()).decode()
    cursor.execute(
        "INSERT INTO users (username, full_name, password_hash) VALUES (%s, %s, %s)", 
        (creds.username, creds.full_name, hashed)
    )
    conn.commit()
    return {"success": True}

@app.post("/api/login")
async def login(creds: UserLogin, response: Response, conn=Depends(get_db)):
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, password_hash FROM users WHERE username = %s", (creds.username,))
    user = cursor.fetchone()

    # Generic error message for security
    if not user or not bcrypt.checkpw(creds.password.encode(), user['password_hash'].encode()):
        raise HTTPException(status_code=401, detail="Incorrect credentials. Please try again.")

    token = str(uuid.uuid4())
    cursor.execute("INSERT INTO sessions (user_id, session_token) VALUES (%s, %s)", (user['id'], token))
    conn.commit()
    
    response.set_cookie(key="session_token", value=token, httponly=True)
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