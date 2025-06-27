import os
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
import supabase
import torch
from transformers import AutoModelForImageClassification, AutoImageProcessor
from PIL import Image
import io
import google.generativeai as genai
import base64
from datetime import datetime

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN")
HUGGINGFACE_MODEL = os.getenv("HUGGINGFACE_MODEL", "google/vit-base-patch16-224")

# Initialize Supabase client
supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Initialize Gemini
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-1.5-flash')

# Load Hugging Face model (once at startup)
print(f"[INFO] Loading Hugging Face model: {HUGGINGFACE_MODEL}")
try:
    processor = AutoImageProcessor.from_pretrained(HUGGINGFACE_MODEL, token=HUGGINGFACE_TOKEN)
    model = AutoModelForImageClassification.from_pretrained(HUGGINGFACE_MODEL, token=HUGGINGFACE_TOKEN)
    print(f"[INFO] Successfully loaded model: {HUGGINGFACE_MODEL}")
except Exception as e:
    print(f"[ERROR] Failed to load Hugging Face model: {e}")
    processor = None
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
    try:
        print(f"[INFO] Processing MRI upload for patient: {patient_id}")
        
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Initialize analysis results
        hf_analysis = "Not available"
        hf_confidence = 0.0
        
        # Run Hugging Face model if available
        if processor is not None and model is not None:
            try:
                print("[INFO] Running Hugging Face analysis...")
                inputs = processor(images=image, return_tensors="pt")
                with torch.no_grad():
                    outputs = model(**inputs)
                    predicted_class_id = outputs.logits.argmax(-1).item()
                    confidence = torch.softmax(outputs.logits, dim=-1).max().item()
                    
                    # Get class label if available
                    if hasattr(model.config, 'id2label'):
                        hf_analysis = model.config.id2label.get(predicted_class_id, f"Class {predicted_class_id}")
                    else:
                        hf_analysis = f"Prediction: Class {predicted_class_id}"
                    hf_confidence = confidence
                    print(f"[INFO] HF Analysis: {hf_analysis}, Confidence: {hf_confidence:.2f}")
            except Exception as e:
                print(f"[ERROR] Hugging Face analysis failed: {e}")
                hf_analysis = f"Analysis failed: {str(e)}"
        
        # Run Gemini AI analysis
        gemini_analysis = "Not available"
        try:
            print("[INFO] Running Gemini AI analysis...")
            # Convert image to base64 for Gemini
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='JPEG')
            img_byte_arr.seek(0)
            
            # Create Gemini prompt for medical image analysis
            prompt = """
            You are a medical AI assistant analyzing this medical image. Please provide:
            1. Image type identification (MRI, CT, X-ray, etc.)
            2. Anatomical region visible
            3. Key observations and findings
            4. Potential abnormalities or areas of concern
            5. Recommendations for further analysis
            
            Please be thorough but note that this is for educational/research purposes and should not replace professional medical diagnosis.
            """
            
            # Prepare image for Gemini
            image_parts = [
                {
                    "mime_type": "image/jpeg",
                    "data": img_byte_arr.getvalue()
                }
            ]
            
            response = gemini_model.generate_content([prompt, image_parts[0]])
            gemini_analysis = response.text
            print(f"[INFO] Gemini analysis completed successfully")
            
        except Exception as e:
            print(f"[ERROR] Gemini analysis failed: {e}")
            gemini_analysis = f"Gemini analysis failed: {str(e)}"
        
        # Combine analyses for comprehensive report
        comprehensive_analysis = f"""
MEDICAL IMAGE ANALYSIS REPORT
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

HUGGING FACE MODEL ANALYSIS:
{hf_analysis}
Confidence Score: {hf_confidence:.2f}

GEMINI AI ANALYSIS:
{gemini_analysis}

RECOMMENDATION:
This automated analysis is for research and educational purposes. 
Please consult with a qualified medical professional for clinical diagnosis.
"""
        
        # Store result in mri_scans table with proper file_path
        try:
            # Generate a unique file path for storage reference
            file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'unknown'
            unique_filename = f"{patient_id}/{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
            
            result = supabase_client.table("mri_scans").insert({
                "patient_id": patient_id,
                "uploaded_by": uploaded_by,
                "file_name": file.filename,
                "file_path": unique_filename,  # Add the file path
                "file_size": len(contents),    # Use actual file size
                "ai_analysis_result": {
                    "hf_analysis": hf_analysis,
                    "hf_confidence": hf_confidence,
                    "gemini_analysis": gemini_analysis,
                    "comprehensive_report": comprehensive_analysis
                },
                "ai_confidence_score": float(hf_confidence),
                "status": "analyzed",
                "created_at": datetime.now().isoformat()
            }).execute()
            print(f"[INFO] MRI scan record saved to database")
        except Exception as e:
            print(f"[ERROR] Failed to save to database: {e}")
            # Still return success since analysis was completed
            return {
                "success": True,
                "diagnosis": hf_analysis,
                "confidence": hf_confidence,
                "gemini_analysis": gemini_analysis,
                "comprehensive_report": comprehensive_analysis,
                "status": "completed",
                "database_error": str(e)
            }
        
        return {
            "success": True,
            "diagnosis": hf_analysis,
            "confidence": hf_confidence,
            "gemini_analysis": gemini_analysis,
            "comprehensive_report": comprehensive_analysis,
            "status": "completed"
        }
        
    except Exception as e:
        print(f"[ERROR] Upload processing failed: {e}")
        return JSONResponse(
            status_code=500, 
            content={"error": f"Processing failed: {str(e)}", "success": False}
        )

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
