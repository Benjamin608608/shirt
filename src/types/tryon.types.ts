import { Garment } from './garment.types';

// 用戶照片
export interface UserPhoto {
  id: string;
  user_id: string;
  image_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPhotoInput {
  image_key: string;
}

// 試穿任務狀態
export type TryOnStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 試穿任務
export interface TryOnJob {
  id: string;
  user_id: string;
  garment_id: string;
  user_photo_id: string;
  status: TryOnStatus;
  ai_provider: string;
  ai_job_id?: string;
  result_image_key?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  created_date?: string;

  // 關聯數據（join 查詢時返回）
  garment?: Garment;
  user_photo?: UserPhoto;
}

export interface CreateTryOnJobInput {
  garment_id: string;
  user_photo_id: string;
}

// AI 服務配置
export interface AIConfig {
  provider: 'replicate' | 'stability' | 'other';
  model: string;
  apiKey: string;
}

// 試穿結果
export interface TryOnResult {
  job: TryOnJob;
  resultImageUrl?: string;
}
