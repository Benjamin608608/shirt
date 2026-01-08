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
    }
  }
}
