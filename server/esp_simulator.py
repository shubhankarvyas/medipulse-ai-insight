#!/usr/bin/env python3
"""
ESP32 ECG Data Simulator
Simulates ECG data for testing without requiring actual hardware
"""

import requests
import time
import json
import sys
import random
import math

BACKEND_URL = 'http://localhost:8000'

# Get patient email from command line or prompt user
if len(sys.argv) > 1:
    PATIENT_EMAIL = sys.argv[1]
else:
    PATIENT_EMAIL = input("Enter patient email address: ").strip()

if not PATIENT_EMAIL:
    print("❌ Patient email is required!")
    exit(1)

# Setup device and get patient ID
print(f"Setting up ECG device for {PATIENT_EMAIL}...")
setup_response = requests.post(f"{BACKEND_URL}/setup-ecg-device", json={
    "patient_email": PATIENT_EMAIL,
    "device_name": "ESP32 ECG Monitor (Simulator)"
})

if setup_response.status_code == 200:
    setup_data = setup_response.json()
    if setup_data.get("success"):
        PATIENT_ID = setup_data["patient_id"]
        print(f"✅ Device setup complete! Patient ID: {PATIENT_ID}")
    else:
        print(f"❌ Device setup failed: {setup_data.get('error')}")
        print("Make sure you are logged in to the web app and the user exists in the database.")
        exit(1)
else:
    print(f"❌ Failed to connect to backend: {setup_response.status_code}")
    exit(1)

print("📊 Starting ECG simulation...")
print("Press Ctrl+C to stop")

# Simulation variables
base_heart_rate = 72
time_offset = 0

try:
    while True:
        # Simulate realistic ECG values
        time_offset += 1
        
        # Simulate heart rate with some variation (60-85 BPM)
        heart_rate = base_heart_rate + random.randint(-8, 8)
        
        # Calculate RR interval from heart rate (in milliseconds)
        rr_interval = int(60000 / heart_rate) if heart_rate > 0 else 0
        
        # Simulate temperature with small variations (98-99°F)
        temp_f = 98.6 + random.uniform(-0.5, 0.5)
        
        # Simulate other ECG parameters
        qrs = random.randint(80, 120)  # QRS duration in ms
        hrv = random.randint(30, 60)   # Heart rate variability
        st = random.uniform(0.0, 0.2)  # ST segment elevation
        
        payload = {
            "patient_id": PATIENT_ID,
            "heart_rate": heart_rate,
            "rr_interval": rr_interval,
            "temperature": temp_f,
            "qrs_duration": qrs,
            "heart_rate_variability": hrv,
            "st_segment": st
        }
        
        r = requests.post(f"{BACKEND_URL}/submit-ecg", json=payload)
        if r.status_code == 200:
            response_data = r.json()
            if response_data.get("success"):
                print(f"✅ Sent ECG data: HR={heart_rate} BPM, Temp={temp_f:.1f}°F, RR={rr_interval}ms")
            else:
                print(f"❌ Backend error: {response_data}")
        else:
            print(f"❌ HTTP error {r.status_code}: {r.text}")
        
        time.sleep(2)  # Send data every 2 seconds
        
except KeyboardInterrupt:
    print("\n🛑 Simulation stopped by user")
except Exception as e:
    print(f"❌ Error: {e}")
