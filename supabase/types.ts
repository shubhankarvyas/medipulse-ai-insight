export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      mri_scans: {
        Row: {
          id: string
          patient_id: string
          uploaded_by: string
          file_path: string
          file_name: string
          file_size: number
          scan_type: string | null
          scan_date: string | null
          ai_analysis_result: Json | null
          ai_confidence_score: number | null
          doctor_notes: string | null
          status: 'pending' | 'analyzed' | 'reviewed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          uploaded_by: string
          file_path: string
          file_name: string
          file_size: number
          scan_type?: string | null
          scan_date?: string | null
          ai_analysis_result?: Json | null
          ai_confidence_score?: number | null
          doctor_notes?: string | null
          status?: 'pending' | 'analyzed' | 'reviewed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          uploaded_by?: string
          file_path?: string
          file_name?: string
          file_size?: number
          scan_type?: string | null
          scan_date?: string | null
          ai_analysis_result?: Json | null
          ai_confidence_score?: number | null
          doctor_notes?: string | null
          status?: 'pending' | 'analyzed' | 'reviewed'
          created_at?: string
          updated_at?: string
        }
      }
      // Add other table definitions as needed
    }
  }
}
