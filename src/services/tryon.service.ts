import { supabase } from './supabase';
import { TryOnJob, CreateTryOnJobInput, TryOnStatus } from '../types/tryon.types';

const TRYON_RESULT_BUCKET = 'tryon-results';

export class TryOnService {
  // 創建試穿任務
  static async createTryOnJob(input: CreateTryOnJobInput): Promise<TryOnJob> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tryon_jobs')
      .insert({
        user_id: user.id,
        garment_id: input.garment_id,
        user_photo_id: input.user_photo_id,
        status: 'pending',
        ai_provider: 'replicate',
      } as any)
      .select()
      .single();

    if (error) throw error;

    // 調用 Edge Function 處理試穿
    await this.triggerTryOnProcessing((data as any).id);

    return data as TryOnJob;
  }

  // 觸發試穿處理（調用 Edge Function）
  private static async triggerTryOnProcessing(jobId: string): Promise<void> {
    console.log('[TryOnService] 調用 Edge Function process-tryon，job_id:', jobId);

    const { data, error } = await supabase.functions.invoke('process-tryon', {
      body: { job_id: jobId },
    });

    if (error) {
      console.error('[TryOnService] Edge Function 錯誤:', error);
      throw error;
    }

    console.log('[TryOnService] Edge Function 回應:', data);
  }

  // 獲取用戶的試穿記錄
  static async getTryOnJobs(status?: TryOnStatus): Promise<TryOnJob[]> {
    let query = supabase
      .from('tryon_jobs')
      .select(`
        *,
        garment:garments(*),
        user_photo:user_photos(*)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as TryOnJob[];
  }

  // 獲取單個試穿任務
  static async getTryOnJob(jobId: string): Promise<TryOnJob> {
    const { data, error } = await supabase
      .from('tryon_jobs')
      .select(`
        *,
        garment:garments(*),
        user_photo:user_photos(*)
      `)
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return data as TryOnJob;
  }

  // 獲取結果圖片 URL
  static async getResultImageUrl(imagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(TRYON_RESULT_BUCKET)
      .createSignedUrl(imagePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  }

  // 刪除試穿記錄
  static async deleteTryOnJob(jobId: string): Promise<void> {
    const { data: job } = await supabase
      .from('tryon_jobs')
      .select('result_image_key')
      .eq('id', jobId)
      .single() as { data: { result_image_key?: string } | null; error: any };

    // 刪除結果圖片
    if (job?.result_image_key) {
      await supabase.storage
        .from(TRYON_RESULT_BUCKET)
        .remove([job.result_image_key]);
    }

    const { error } = await supabase
      .from('tryon_jobs')
      .delete()
      .eq('id', jobId);

    if (error) throw error;
  }

  // 輪詢任務狀態（用於實時更新）
  static subscribeToJob(
    jobId: string,
    callback: (job: TryOnJob) => void
  ) {
    return supabase
      .channel(`tryon_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tryon_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          callback(payload.new as TryOnJob);
        }
      )
      .subscribe();
  }
}
