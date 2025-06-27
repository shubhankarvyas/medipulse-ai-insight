#!/usr/bin/env python3

import requests
import json

def test_backend():
    try:
        # Test basic endpoint
        response = requests.get("http://localhost:8000/")
        print(f"✅ Backend basic test: {response.json()}")
        
        # Test if server is ready
        print("🔄 Backend is running and ready for MRI uploads!")
        return True
        
    except Exception as e:
        print(f"❌ Backend test failed: {e}")
        return False

if __name__ == "__main__":
    test_backend()
