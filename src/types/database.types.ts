// Temporary placeholder - will be generated from Supabase CLI later
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
      garments: {
        Row: {
          id: string
          user_id: string
          category: string
          image_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          image_key: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          image_key?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_photos: {
        Row: {
          id: string
          user_id: string
          image_key: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_key: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_key?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tryon_jobs: {
        Row: {
          id: string
          user_id: string
          garment_id: string
          user_photo_id: string
          status: string
          ai_provider: string
          ai_job_id: string | null
          result_image_key: string | null
          error_message: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          created_date: string | null
        }
        Insert: {
          id?: string
          user_id: string
          garment_id: string
          user_photo_id: string
          status?: string
          ai_provider?: string
          ai_job_id?: string | null
          result_image_key?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          created_date?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          garment_id?: string
          user_photo_id?: string
          status?: string
          ai_provider?: string
          ai_job_id?: string | null
          result_image_key?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          created_date?: string | null
        }
      }
    }
  }
}
