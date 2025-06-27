import os
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
import supabase
import torch
from transformers import AutoModelForImageClassification, AutoFeatureExtractor
from PIL import Image
import io

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HUGGINGFACE_MODEL = os.getenv("HUGGINGFACE_MODEL", "amedical-ai/mednist-cnn")

# Initialize Supabase client
supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Load Hugging Face model (once at startup)
try:
    extractor = AutoFeatureExtractor.from_pretrained(HUGGINGFACE_MODEL)
    model = AutoModelForImageClassification.from_pretrained(HUGGINGFACE_MODEL)
except Exception as e:
    print(f"[ERROR] Failed to load Hugging Face model: {e}")
    extractor = None
    model = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ECGData(BaseModel):
    patient_id: str
    value: float
    temp: float

@app.post("/submit-ecg")
async def submit_ecg(data: ECGData):
    # Store ECG data in Supabase
    resp = supabase_client.table("ecg_readings").insert({
        "patient_id": data.patient_id,
        "heart_rate": data.value,
        "temperature": data.temp,
        "timestamp": "now()"
    }).execute()
    return {"success": True, "data": resp.data}

@app.get("/ecg-data/{patient_id}")
async def get_ecg_data(patient_id: str):
    resp = supabase_client.table("ecg_readings").select("*").eq("patient_id", patient_id).order("timestamp", desc=True).limit(100).execute()
    return {"data": resp.data}

@app.post("/upload-mri")
async def upload_mri(patient_id: str = Form(...), uploaded_by: str = Form(...), file: UploadFile = File(...)):
    if extractor is None or model is None:
        return JSONResponse(status_code=500, content={"error": "AI model not loaded. Check backend logs."})
    # Read image
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    # Run Hugging Face model
    inputs = extractor(images=image, return_tensors="pt")
    outputs = model(**inputs)
    pred = outputs.logits.argmax(-1).item()
    confidence = torch.softmax(outputs.logits, dim=-1).max().item()
    # Save file to Supabase Storage (not implemented here)
    # Store result in mri_scans table
    supabase_client.table("mri_scans").insert({
        "patient_id": patient_id,
        "uploaded_by": uploaded_by,
        "file_name": file.filename,
        "ai_analysis_result": str(pred),
        "ai_confidence_score": confidence
    }).execute()
    return {"diagnosis": str(pred), "confidence": confidence}

class ChatRequest(BaseModel):
    prompt: str
    context: str = ""

@app.post("/chat")
async def chat(req: ChatRequest):
    # Call Gemini API (pseudo, replace with real call)
    headers = {"Authorization": f"Bearer {GEMINI_API_KEY}"}
    payload = {"contents": [{"parts": [{"text": req.context + "\n" + req.prompt}]}]}
    async with httpx.AsyncClient() as client:
        r = await client.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + GEMINI_API_KEY, json=payload, headers=headers)
        data = r.json()
    return {"response": data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")}

@app.get("/generate-report/{patient_id}")
async def generate_report(patient_id: str):
    # Generate PDF (pseudo, not implemented)
    # Save to Supabase Storage, return link
    return {"url": "https://your-supabase-storage-link/report.pdf"}

@app.get("/")
async def root():
    return {"message": "FastAPI backend is running"}
