
# 🫀 MediPulse AI — Real-Time Health Monitoring Platform

**MediPulse AI** is a full-stack web platform for real-time health monitoring, diagnosis, and doctor-patient collaboration. It integrates IoT-based ECG and temperature sensors (via ESP32), AI-based medical image diagnosis (MRI/X-ray), and Supabase-powered user and device management.

![Dashboard Preview](./preview.png)

---

## 🚀 Features

- 🧑‍⚕️ Dual user roles: **Doctor** and **Patient**
- 📡 Live ECG + body temperature data via **ESP32**
- 📊 ECG signal analytics: HR, RR Interval, HRV, ST Segment, QRS Duration
- 🤖 AI diagnosis of MRI/X-ray images using Hugging Face or Gemini
- 🔁 Supabase Realtime integration for live dashboards
- 🧠 Chatbot powered by Gemini/GPT for health queries
- 📎 PDF health report generation
- 🔒 Secure authentication and RLS-based data access

---

## 🧱 Tech Stack

| Layer      | Tech                            |
|------------|----------------------------------|
| Frontend   | React, TypeScript, Tailwind CSS |
| Backend    | FastAPI                         |
| Realtime DB| Supabase                        |
| Auth       | Supabase Auth                   |
| AI         | Hugging Face, Gemini API        |
| IoT        | ESP32 + DS18B20 + AD8232        |

---

## 📂 Folder Structure

```bash
.
├── client/            # React frontend
├── server/            # FastAPI backend
├── supabase/          # SQL migrations & edge functions
├── docs/              # ERD, API docs, setup guide
└── README.md
```

---

## 🔧 Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/shubhankarvyas/medipulse-ai-insight.git
cd medipulse-ai-insight
```

### 2. Frontend Setup (`client/`)

```bash
cd client
npm install
cp .env.example .env     # Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

### 3. Backend Setup (`server/`)

```bash
cd server
pip install -r requirements.txt
cp .env.example .env     # Add SUPABASE_URL, SUPABASE_SERVICE_ROLE, HF_TOKEN
uvicorn main:app --reload
```

### 4. Supabase Setup

- Create project at [supabase.io](https://supabase.io)
- Run SQL from `supabase/schema.sql` to create tables and RLS
- Enable Realtime on `ecg_readings` table
- Create `mri-scans` bucket in Supabase Storage

---

## ⚙️ Hardware Setup (ESP32)

- Connect:
  - AD8232 → GPIO34
  - DS18B20 → GPIO4 (with 4.7kΩ pull-up)
- Upload Arduino code from `firmware/`
- Run `esp_reader.py` to stream data to backend

---

## 🧪 Simulate Data (No Hardware)

```bash
python simulate_ecg.py patient@example.com
```

---

## 📈 Live Features

| Metric         | Description                         |
|----------------|-------------------------------------|
| Heart Rate     | Real-time BPM from AD8232           |
| RR Interval    | Time between beats                  |
| Temperature    | Body temp from DS18B20              |
| HRV (RMSSD)    | Stress/fitness marker               |
| ST Segment     | Elevation analysis (ischemia sign)  |
| QRS Duration   | Ventricular depolarization duration |

---

## 🤖 AI MRI Diagnosis

- Upload MRI/X-ray via patient dashboard
- FastAPI uploads to Supabase Storage
- AI model (e.g., `nateraw/mednist-cnn`) analyzes image
- Doctor views result + confidence score

---

## 🩺 Doctor Dashboard

- View assigned patients
- Access live ECG + MRI results
- Download health reports (PDF)
- Respond via AI Chatbot

---

## 📄 PDF Report Generation

- Generates a report with:
  - Patient Info
  - Last ECG Readings
  - MRI Scan Result
- Uses `reportlab` or `pdfkit`
- Stored in Supabase + downloadable by patient/doctor

---

## 💬 Health Chatbot

- Powered by OpenAI GPT or Gemini
- Context-aware: uses patient’s latest ECG/MRI
- Patients can ask: “Why is my HRV low?” or “What does 0.1mV ST mean?”

---

## 🛡 Security

- Supabase Auth (email/password)
- RLS: Patient-only access to their own data
- Doctors see only their assigned patients

---

## 📚 Documentation

- [x] Supabase schema
- [x] API reference (FastAPI)
- [x] ESP32 pin diagram
- [x] .env variable guide

---

## 📌 To-Do / Improvements

- [ ] WebSocket streaming from ESP32
- [ ] Doctor-patient messaging
- [ ] AI-powered anomaly detection
- [ ] Admin role for hospital control

---

## 🙏 Credits

- ECG Signal: AD8232 Module
- AI Models: [Hugging Face](https://huggingface.co)
- Charts: Recharts, Chart.js
- UI Kit: shadcn/ui + Tailwind

---

## 📄 License

This project is licensed under the MIT License.
