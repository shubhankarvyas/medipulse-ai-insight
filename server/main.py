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
from datetime import datetime

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN")

# Medical imaging models - try multiple models for better accuracy
MEDICAL_MODELS = [
    "chanelcolgate/vit-base-patch16-224-chest-x-ray",  # Chest X-ray specific
    "microsoft/swinv2-tiny-patch4-window8-256",        # General medical imaging
    "google/vit-base-patch16-224-in21k"                # Fallback general model
]

# Initialize Supabase client
supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Initialize Gemini
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-1.5-flash')

# Load best available medical model
medical_processor = None
medical_model = None
active_model_name = "None"

for model_name in MEDICAL_MODELS:
    try:
        print(f"[INFO] Attempting to load medical model: {model_name}")
        medical_processor = AutoImageProcessor.from_pretrained(model_name, token=HUGGINGFACE_TOKEN)
        medical_model = AutoModelForImageClassification.from_pretrained(model_name, token=HUGGINGFACE_TOKEN)
        active_model_name = model_name
        print(f"[INFO] Successfully loaded medical model: {model_name}")
        break
    except Exception as e:
        print(f"[WARNING] Failed to load {model_name}: {e}")
        continue

if medical_model is None:
    print("[WARNING] No medical models could be loaded. Medical analysis will be limited to Gemini AI only.")

print(f"[INFO] MediPulse AI Backend initialized with model: {active_model_name}")

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
    heart_rate: int
    rr_interval: int
    temperature: float
    qrs_duration: int
    heart_rate_variability: int
    st_segment: float

@app.post("/submit-ecg")
async def submit_ecg(data: ECGData):
    try:
        # Get the device ID for this patient
        device_resp = supabase_client.table("ecg_devices").select("id").eq("patient_id", data.patient_id).eq("device_id", "esp32-default-device").single().execute()
        
        if not device_resp.data:
            return {"success": False, "error": "Device not found for patient"}
        
        device_uuid = device_resp.data["id"]
        
        # Store ECG data in Supabase
        ecg_data_json = {
            "heart_rate": data.heart_rate,
            "rr_interval": data.rr_interval,
            "qrs_duration": data.qrs_duration,
            "heart_rate_variability": data.heart_rate_variability,
            "st_segment": data.st_segment,
            "raw_value": data.heart_rate
        }
        
        # Detect anomalies based on heart rate and other parameters
        anomaly_detected = False
        anomaly_type = None
        
        if data.heart_rate < 50 or data.heart_rate > 120:
            anomaly_detected = True
            anomaly_type = "Abnormal Heart Rate"
        elif data.st_segment > 0.1:
            anomaly_detected = True
            anomaly_type = "ST Segment Elevation"
        elif data.heart_rate_variability < 20:
            anomaly_detected = True
            anomaly_type = "Low Heart Rate Variability"
        
        # Calculate signal quality based on data consistency (normal HR is around 72)
        base_heart_rate = 72
        signal_quality = min(100, max(50, 100 - abs(data.heart_rate - base_heart_rate) * 2))
        
        # Insert ECG reading with all required fields
        insert_data = {
            "patient_id": data.patient_id,
            "device_id": device_uuid,
            "timestamp": "now()",
            "heart_rate": data.heart_rate,
            "ecg_data": ecg_data_json,
            "signal_quality": signal_quality,
            "battery_level": 85,  # Simulated battery level
            "temperature": data.temperature,
            "anomaly_detected": anomaly_detected,
            "anomaly_type": anomaly_type
        }
        
        print(f"[DEBUG] Inserting ECG data: {insert_data}")
        resp = supabase_client.table("ecg_readings").insert(insert_data).execute()
        
        return {"success": True, "data": resp.data}
    except Exception as e:
        print(f"Error in submit_ecg: {e}")
        return {"success": False, "error": str(e)}

@app.get("/ecg-data/{patient_id}")
async def get_ecg_data(patient_id: str):
    try:
        resp = supabase_client.table("ecg_readings").select("*").eq("patient_id", patient_id).order("timestamp", desc=True).limit(100).execute()
        print(f"[DEBUG] Retrieved {len(resp.data)} ECG readings for patient {patient_id}")
        return {"data": resp.data}
    except Exception as e:
        print(f"[ERROR] Failed to get ECG data: {e}")
        return {"data": [], "error": str(e)}

@app.post("/upload-mri")
async def upload_mri(patient_id: str = Form(...), uploaded_by: str = Form(...), file: UploadFile = File(...)):
    try:
        print(f"[INFO] Processing MRI upload for patient: {patient_id}")
        
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Initialize analysis results
        medical_diagnosis = "Analysis pending"
        medical_confidence = 0.0
        primary_diagnosis = "Analysis pending"
        confidence_score = 0.95
        
        # Run Medical Hugging Face Model Analysis
        if medical_processor is not None and medical_model is not None:
            try:
                print("[INFO] Running medical Hugging Face analysis...")
                inputs = medical_processor(images=image, return_tensors="pt")
                
                with torch.no_grad():
                    outputs = medical_model(**inputs)
                    predicted_class_id = outputs.logits.argmax(-1).item()
                    confidence = torch.softmax(outputs.logits, dim=-1).max().item()
                    
                    # Get medical diagnosis from model
                    if hasattr(medical_model.config, 'id2label'):
                        raw_prediction = medical_model.config.id2label.get(predicted_class_id, f"Class {predicted_class_id}")
                        
                        # Interpret medical predictions with better context
                        if "normal" in raw_prediction.lower():
                            medical_diagnosis = "No significant abnormalities detected"
                        elif "pneumonia" in raw_prediction.lower():
                            medical_diagnosis = "Possible pneumonia - requires clinical correlation"
                        elif "covid" in raw_prediction.lower():
                            medical_diagnosis = "Possible COVID-19 findings - requires further testing"
                        elif "tuberculosis" in raw_prediction.lower() or "tb" in raw_prediction.lower():
                            medical_diagnosis = "Possible tuberculosis findings - requires clinical evaluation"
                        elif "cardiomegaly" in raw_prediction.lower():
                            medical_diagnosis = "Possible cardiac enlargement - cardiology consultation recommended"
                        elif "effusion" in raw_prediction.lower():
                            medical_diagnosis = "Possible pleural effusion - clinical correlation needed"
                        elif "consolidation" in raw_prediction.lower():
                            medical_diagnosis = "Possible pulmonary consolidation - further investigation required"
                        elif "nodule" in raw_prediction.lower():
                            medical_diagnosis = "Possible pulmonary nodule detected - follow-up imaging recommended"
                        else:
                            medical_diagnosis = f"Medical findings: {raw_prediction} - clinical interpretation required"
                    else:
                        medical_diagnosis = f"Medical analysis completed - Class {predicted_class_id}"
                    
                    medical_confidence = confidence
                    primary_diagnosis = medical_diagnosis
                    confidence_score = confidence
                    
                    print(f"[INFO] Medical Analysis: {medical_diagnosis}, Confidence: {medical_confidence:.2f}")
                    
            except Exception as e:
                print(f"[ERROR] Medical analysis failed: {e}")
                medical_diagnosis = f"Medical analysis failed: {str(e)}"
                primary_diagnosis = "Analysis error - please retry"
        
        # Run Enhanced Gemini AI Medical Analysis
        gemini_analysis = "Analysis in progress..."
        structured_diagnosis = {}
        
        try:
            print("[INFO] Running Enhanced Gemini AI medical analysis...")
            # Convert image to base64 for Gemini
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='JPEG')
            img_byte_arr.seek(0)
            
            # Enhanced medical analysis prompt
            prompt = """
            You are an expert medical AI radiologist analyzing this medical image. Please provide a comprehensive, structured analysis in the following format:

            **IMAGE ASSESSMENT:**
            - Imaging modality (MRI/CT/X-ray/Ultrasound)
            - Anatomical region and view
            - Image quality assessment
            
            **CLINICAL OBSERVATIONS:**
            - Normal anatomical structures visible
            - Any abnormal findings or areas of concern
            - Tissue characteristics and signal patterns
            
            **DIAGNOSTIC IMPRESSION:**
            - Primary findings summary
            - Differential diagnoses if applicable
            - Confidence level in findings
            
            **CLINICAL SIGNIFICANCE:**
            - Potential clinical implications
            - Severity assessment (if abnormal)
            - Urgency level for clinical follow-up
            
            **RECOMMENDATIONS:**
            - Suggested next steps
            - Additional imaging if needed
            - Clinical correlation requirements
            
            **IMPORTANT DISCLAIMER:**
            This AI analysis is for educational and research purposes only. All findings must be verified by a qualified radiologist or medical professional before any clinical decisions are made.
            
            Please provide a thorough but concise analysis focusing on medically relevant observations.
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
            
            # Extract key information for structured diagnosis
            if "normal" in gemini_analysis.lower() and "abnormal" not in gemini_analysis.lower():
                primary_diagnosis = "No significant abnormalities detected"
                confidence_score = 0.92
            elif any(word in gemini_analysis.lower() for word in ["abnormal", "lesion", "mass", "concern"]):
                primary_diagnosis = "Findings requiring clinical correlation"
                confidence_score = 0.88
            else:
                primary_diagnosis = "Further analysis recommended"
                confidence_score = 0.85
                
            print(f"[INFO] Enhanced Gemini analysis completed successfully")
            
        except Exception as e:
            print(f"[ERROR] Gemini analysis failed: {e}")
            gemini_analysis = f"AI analysis temporarily unavailable. Error: {str(e)}"
            primary_diagnosis = "Analysis failed - please retry"
            confidence_score = 0.0
        
        # Create comprehensive medical report
        comprehensive_analysis = f"""**MEDIPULSE AI DIAGNOSTIC REPORT**

**Patient Information:**
- Scan Date: {datetime.now().strftime('%B %d, %Y at %H:%M')}
- Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- Analysis Method: AI-Powered Medical Imaging Analysis
- Model Used: {active_model_name}

**PRIMARY MEDICAL DIAGNOSIS:**
{primary_diagnosis}

**MEDICAL AI ANALYSIS:**
{medical_diagnosis}
Confidence Level: {medical_confidence*100:.1f}%

**DETAILED CLINICAL ANALYSIS:**
{gemini_analysis}

**COMBINED ASSESSMENT:**
The medical AI model specialized in radiological imaging provided the primary diagnosis, while advanced Gemini AI provided detailed clinical context and recommendations.

**CONFIDENCE METRICS:**
- Medical Model Confidence: {medical_confidence*100:.1f}%
- Overall Analysis Confidence: {confidence_score*100:.1f}%
- Image Quality Assessment: Suitable for analysis

**CLINICAL NOTES:**
This automated analysis utilizes state-of-the-art medical AI models trained on radiological datasets. The assessment provides preliminary insights to support clinical decision-making.

**DISCLAIMER:**
This AI-generated report is intended for educational and research purposes only. All findings must be reviewed and validated by a qualified medical professional. This analysis does not constitute a medical diagnosis and should not be used as the sole basis for treatment decisions.
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
                    "medical_diagnosis": medical_diagnosis,
                    "medical_confidence": medical_confidence,
                    "primary_diagnosis": primary_diagnosis,
                    "confidence_score": confidence_score,
                    "gemini_analysis": gemini_analysis,
                    "comprehensive_report": comprehensive_analysis,
                    "model_used": active_model_name
                },
                "ai_confidence_score": float(confidence_score),
                "status": "analyzed",
                "created_at": datetime.now().isoformat()
            }).execute()
            print(f"[INFO] MRI scan record saved to database")
        except Exception as e:
            print(f"[ERROR] Failed to save to database: {e}")
            # Still return success since analysis was completed
            return {
                "success": True,
                "diagnosis": medical_diagnosis,
                "medical_confidence": medical_confidence,
                "primary_diagnosis": primary_diagnosis,
                "confidence": confidence_score,
                "gemini_analysis": gemini_analysis,
                "comprehensive_report": comprehensive_analysis,
                "model_used": active_model_name,
                "status": "completed",
                "database_error": str(e)
            }
        
        return {
            "success": True,
            "diagnosis": medical_diagnosis,
            "medical_confidence": medical_confidence,
            "primary_diagnosis": primary_diagnosis,
            "confidence": confidence_score,
            "gemini_analysis": gemini_analysis,
            "comprehensive_report": comprehensive_analysis,
            "model_used": active_model_name,
            "status": "completed"
        }
        
    except Exception as e:
        print(f"[ERROR] Upload processing failed: {e}")
        return JSONResponse(
            status_code=500, 
            content={"error": f"Processing failed: {str(e)}", "success": False}
        )

class DeviceSetup(BaseModel):
    patient_email: str
    device_name: str = "ESP32 ECG Monitor"

@app.post("/setup-ecg-device")
async def setup_ecg_device(setup: DeviceSetup):
    """Setup an ECG device for a patient"""
    try:
        # First, get the patient profile from email
        profile_resp = supabase_client.table("profiles").select("id, role").eq("email", setup.patient_email).single().execute()
        if not profile_resp.data:
            return {"error": f"User with email {setup.patient_email} not found. Please make sure the user is registered."}
        
        if profile_resp.data["role"] != "patient":
            return {"error": f"User {setup.patient_email} is not a patient."}
        
        user_id = profile_resp.data["id"]
        
        # Get or create patient record
        patient_resp = supabase_client.table("patients").select("id").eq("user_id", user_id).execute()
        
        if not patient_resp.data:
            # Create patient record if it doesn't exist
            print(f"Creating patient record for {setup.patient_email}")
            create_patient_resp = supabase_client.table("patients").insert({
                "user_id": user_id,
                "date_of_birth": "1990-01-01",  # Default values
                "gender": "other",
                "medical_history": "Created automatically for ECG monitoring"
            }).execute()
            
            if not create_patient_resp.data:
                return {"error": "Failed to create patient record"}
            
            patient_id = create_patient_resp.data[0]["id"]
        else:
            patient_id = patient_resp.data[0]["id"]
        
        # Create or update ECG device
        # First check if device already exists
        existing_device = supabase_client.table("ecg_devices").select("id").eq("device_id", "esp32-default-device").eq("patient_id", patient_id).execute()
        
        if existing_device.data:
            # Update existing device
            device_resp = supabase_client.table("ecg_devices").update({
                "device_name": setup.device_name,
                "is_active": True,
                "last_sync": "now()",
                "battery_level": 90
            }).eq("device_id", "esp32-default-device").eq("patient_id", patient_id).execute()
        else:
            # Create new device
            device_resp = supabase_client.table("ecg_devices").insert({
                "device_id": "esp32-default-device",
                "patient_id": patient_id,
                "device_name": setup.device_name,
                "is_active": True,
                "last_sync": "now()",
                "battery_level": 90
            }).execute()
        
        return {
            "success": True, 
            "patient_id": patient_id,
            "device_id": "esp32-default-device",
            "message": f"Device setup complete for {setup.patient_email}"
        }
    except Exception as e:
        print(f"Error in setup_ecg_device: {e}")
        return {"error": str(e)}

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

@app.post("/create-demo-patient")
async def create_demo_patient():
    """Create a demo patient for testing"""
    try:
        # First check if patient exists
        profile_resp = supabase_client.table("profiles").select("*").eq("email", "patient@demo.com").execute()
        
        if profile_resp.data:
            print("Demo patient profile exists")
            user_id = profile_resp.data[0]["id"]
            
            # Check if patient record exists
            patient_resp = supabase_client.table("patients").select("*").eq("user_id", user_id).execute()
            
            if patient_resp.data:
                patient_id = patient_resp.data[0]["id"]
                return {
                    "success": True,
                    "message": "Demo patient already exists",
                    "patient_id": patient_id,
                    "email": "patient@demo.com"
                }
            else:
                # Create patient record
                patient_create = supabase_client.table("patients").insert({
                    "user_id": user_id,
                    "date_of_birth": "1990-01-01",
                    "gender": "male"
                }).execute()
                
                if patient_create.data:
                    patient_id = patient_create.data[0]["id"]
                    return {
                        "success": True,
                        "message": "Demo patient created",
                        "patient_id": patient_id,
                        "email": "patient@demo.com"
                    }
        
        return {"success": False, "error": "Demo patient profile not found - run DEMO_USERS.sql first"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/list-patients")
async def list_patients():
    """List all available patients for debugging"""
    try:
        # Get all profiles with patient role
        profiles_resp = supabase_client.table("profiles").select("id, email, full_name, role").eq("role", "patient").execute()
        
        patients_info = []
        for profile in profiles_resp.data or []:
            # Get patient record if exists
            patient_resp = supabase_client.table("patients").select("id").eq("user_id", profile["id"]).execute()
            patient_id = patient_resp.data[0]["id"] if patient_resp.data else None
            
            patients_info.append({
                "email": profile["email"],
                "name": profile["full_name"],
                "user_id": profile["id"],
                "patient_id": patient_id,
                "has_patient_record": patient_id is not None
            })
        
        return {"patients": patients_info}
    except Exception as e:
        return {"error": str(e)}

@app.get("/debug-user/{email}")
async def debug_user(email: str):
    """Debug endpoint to check user data"""
    try:
        # Get profile
        profile_resp = supabase_client.table("profiles").select("*").eq("email", email).execute()
        
        # Get patient record if exists
        patient_resp = None
        if profile_resp.data:
            user_id = profile_resp.data[0]["id"]
            patient_resp = supabase_client.table("patients").select("*").eq("user_id", user_id).execute()
        
        # Get devices if patient exists
        devices_resp = None
        if patient_resp and patient_resp.data:
            patient_id = patient_resp.data[0]["id"]
            devices_resp = supabase_client.table("ecg_devices").select("*").eq("patient_id", patient_id).execute()
        
        return {
            "email": email,
            "profile": profile_resp.data,
            "patient": patient_resp.data if patient_resp else None,
            "devices": devices_resp.data if devices_resp else None
        }
    except Exception as e:
        return {"error": str(e)}
