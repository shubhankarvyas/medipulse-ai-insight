import serial
import requests
import time

SERIAL_PORT = '/dev/ttyUSB0'  # Change to your port, e.g., COM3 on Windows
BAUD_RATE = 9600
BACKEND_URL = 'http://localhost:8000/submit-ecg'
PATIENT_ID = 'YOUR_PATIENT_UUID'  # Replace with actual patient UUID

ser = serial.Serial(SERIAL_PORT, BAUD_RATE)
print(f"Listening on {SERIAL_PORT} at {BAUD_RATE} baud...")

while True:
    try:
        line = ser.readline().decode().strip()
        if not line:
            continue
        # Expecting: ecg_value,temperature
        parts = line.split(",")
        if len(parts) != 2:
            print(f"Malformed line: {line}")
            continue
        ecg, temp = parts
        payload = {
            "patient_id": PATIENT_ID,
            "value": float(ecg),
            "temp": float(temp)
        }
        r = requests.post(BACKEND_URL, json=payload)
        print(f"Sent: {payload}, Response: {r.status_code}")
        time.sleep(1)
    except Exception as e:
        print(f"Error: {e}")
        time.sleep(2)
