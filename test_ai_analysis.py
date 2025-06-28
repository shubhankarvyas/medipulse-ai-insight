#!/usr/bin/env python3
"""
Test script to demonstrate the improved AI analysis functionality
"""

import requests
import json
from PIL import Image, ImageDraw
import io

def create_sample_medical_image():
    """Create a sample medical-like image for testing"""
    # Create a simple grayscale image that resembles a medical scan
    img = Image.new('RGB', (512, 512), color='black')
    draw = ImageDraw.Draw(img)
    
    # Draw some circles to simulate brain-like structures
    draw.ellipse([100, 100, 400, 400], fill='gray', outline='white', width=2)
    draw.ellipse([150, 150, 350, 350], fill='lightgray', outline='white', width=1)
    draw.ellipse([200, 200, 300, 300], fill='darkgray', outline='white', width=1)
    
    return img

def test_mri_analysis():
    """Test the MRI analysis endpoint"""
    print("🧠 Testing MediPulse AI Analysis...")
    
    # Create sample image
    sample_image = create_sample_medical_image()
    
    # Convert to bytes
    img_byte_arr = io.BytesIO()
    sample_image.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    # Prepare the request
    files = {
        'file': ('test_scan.jpg', img_byte_arr, 'image/jpeg')
    }
    
    data = {
        'patient_id': 'test_patient_123',
        'uploaded_by': 'test_user_456'
    }
    
    try:
        # Make request to local backend
        response = requests.post(
            'http://localhost:8000/upload-mri',
            files=files,
            data=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Analysis completed successfully!")
            print(f"🎯 Primary Diagnosis: {result.get('diagnosis', 'N/A')}")
            print(f"📊 Confidence: {result.get('confidence', 0)*100:.1f}%")
            print(f"🤖 AI Analysis Available: {'Yes' if result.get('gemini_analysis') else 'No'}")
            print(f"📋 Comprehensive Report: {'Yes' if result.get('comprehensive_report') else 'No'}")
            
            # Display a sample of the analysis
            if result.get('gemini_analysis'):
                analysis = result['gemini_analysis']
                print(f"\n📝 Sample Analysis (first 200 chars):")
                print(f"{analysis[:200]}..." if len(analysis) > 200 else analysis)
            
        else:
            print(f"❌ Request failed with status: {response.status_code}")
            print(f"Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server.")
        print("Please ensure the FastAPI server is running on localhost:8000")
        print("Run: cd server && uvicorn main:app --reload")
    except Exception as e:
        print(f"❌ Error during testing: {e}")

if __name__ == "__main__":
    test_mri_analysis()
