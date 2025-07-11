import serial
import requests
import time
import json
import sys

SERIAL_PORT = '/dev/cu.SLAB_USBtoUART'  # Change to your port, e.g., COM3 on Windows
BAUD_RATE = 9600
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
    "device_name": "ESP32 ECG Monitor"
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

ser = serial.Serial(SERIAL_PORT, BAUD_RATE)
print(f"Listening on {SERIAL_PORT} at {BAUD_RATE} baud...")

while True:
    try:
        line = ser.readline().decode().strip()
        if not line:
            continue
        # Expecting: heartRate,rrInterval,tempF,qrs,hrv,st
        parts = line.split(",")
        if len(parts) != 6:
            print(f"Malformed line: {line} (expected 6 values, got {len(parts)})")
            continue
        
        heart_rate, rr_interval, temp_f, qrs, hrv, st = parts
        
        # Convert to proper data types
        try:
            heart_rate = int(heart_rate) if heart_rate != '0' else 0
            rr_interval = int(rr_interval) if rr_interval != '0' else 0
            temp_f = float(temp_f)
            qrs = int(qrs)
            hrv = int(hrv)
            st = float(st)
        except ValueError as e:
            print(f"Error converting values: {e}, line: {line}")
            continue
        
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
                print(f"✅ Sent ECG data: HR={heart_rate}, Temp={temp_f:.1f}°F")
            else:
                print(f"❌ Backend error: {response_data}")
        else:
            print(f"❌ HTTP error {r.status_code}: {r.text}")
        time.sleep(0.5)  # Reduced delay for more responsive updates
    except serial.SerialException as e:
        print(f"Serial error: {e}")
        time.sleep(2)
        try:
            ser.close()
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE)
            print("Reconnected to serial port")
        except:
            print("Failed to reconnect to serial port")
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(2)
