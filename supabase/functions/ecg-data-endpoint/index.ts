
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify API key for ESP32 authentication
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey || apiKey !== Deno.env.get('ESP32_API_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData = await req.json()
    
    // Validate required fields
    const requiredFields = ['device_id', 'patient_id', 'heart_rate', 'ecg_data']
    for (const field of requiredFields) {
      if (!requestData[field]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Get device information
    const { data: device, error: deviceError } = await supabase
      .from('ecg_devices')
      .select('id, patient_id')
      .eq('device_id', requestData.device_id)
      .eq('is_active', true)
      .single()

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: 'Device not found or inactive' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify patient ID matches device
    if (device.patient_id !== requestData.patient_id) {
      return new Response(
        JSON.stringify({ error: 'Patient ID mismatch' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Detect anomalies (basic heart rate thresholds)
    const heartRate = requestData.heart_rate
    let anomalyDetected = false
    let anomalyType = null

    if (heartRate < 50) {
      anomalyDetected = true
      anomalyType = 'Severe Bradycardia'
    } else if (heartRate < 60) {
      anomalyDetected = true
      anomalyType = 'Bradycardia'
    } else if (heartRate > 120) {
      anomalyDetected = true
      anomalyType = 'Severe Tachycardia'
    } else if (heartRate > 100) {
      anomalyDetected = true
      anomalyType = 'Tachycardia'
    }

    // Insert ECG reading
    const { error: insertError } = await supabase
      .from('ecg_readings')
      .insert({
        device_id: device.id,
        patient_id: requestData.patient_id,
        timestamp: new Date().toISOString(),
        heart_rate: heartRate,
        ecg_data: requestData.ecg_data,
        signal_quality: requestData.signal_quality || 100,
        battery_level: requestData.battery_level,
        temperature: requestData.temperature,
        activity_level: requestData.activity_level,
        anomaly_detected: anomalyDetected,
        anomaly_type: anomalyType
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save ECG data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update device last sync time and battery level
    await supabase
      .from('ecg_devices')
      .update({ 
        last_sync: new Date().toISOString(),
        battery_level: requestData.battery_level 
      })
      .eq('id', device.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        anomaly_detected: anomalyDetected,
        anomaly_type: anomalyType 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
