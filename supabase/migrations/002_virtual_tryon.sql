-- ============================================
-- AI 虛擬試穿功能 - 數據庫 Schema
-- ============================================

-- ============================================
-- 1. 用戶照片表
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 確保每個用戶只有一張活躍照片
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_photos_user_active
    ON public.user_photos(user_id)
    WHERE is_active = true;

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON public.user_photos(user_id);

-- 自動更新 updated_at
DROP TRIGGER IF EXISTS update_user_photos_updated_at ON public.user_photos;
CREATE TRIGGER update_user_photos_updated_at
    BEFORE UPDATE ON public.user_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. 虛擬試穿記錄表
-- ============================================
CREATE TABLE IF NOT EXISTS public.tryon_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    garment_id UUID NOT NULL REFERENCES public.garments(id) ON DELETE CASCADE,
    user_photo_id UUID NOT NULL REFERENCES public.user_photos(id) ON DELETE CASCADE,

    -- 任務狀態
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',

    -- AI 服務相關
    ai_provider TEXT NOT NULL DEFAULT 'replicate',
    ai_job_id TEXT,

    -- 結果
    result_image_key TEXT,
    error_message TEXT,

    -- 時間戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_date DATE DEFAULT CURRENT_DATE
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_user_id ON public.tryon_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_status ON public.tryon_jobs(status);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_created_at ON public.tryon_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_garment_id ON public.tryon_jobs(garment_id);
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_created_date ON public.tryon_jobs(created_date);

-- 自動更新 updated_at
DROP TRIGGER IF EXISTS update_tryon_jobs_updated_at ON public.tryon_jobs;
CREATE TRIGGER update_tryon_jobs_updated_at
    BEFORE UPDATE ON public.tryon_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Row Level Security (RLS)
-- ============================================

-- user_photos RLS
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own photos" ON public.user_photos;
CREATE POLICY "Users can view own photos"
    ON public.user_photos FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own photos" ON public.user_photos;
CREATE POLICY "Users can insert own photos"
    ON public.user_photos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own photos" ON public.user_photos;
CREATE POLICY "Users can update own photos"
    ON public.user_photos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own photos" ON public.user_photos;
CREATE POLICY "Users can delete own photos"
    ON public.user_photos FOR DELETE
    USING (auth.uid() = user_id);

-- tryon_jobs RLS
ALTER TABLE public.tryon_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tryon jobs" ON public.tryon_jobs;
CREATE POLICY "Users can view own tryon jobs"
    ON public.tryon_jobs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tryon jobs" ON public.tryon_jobs;
CREATE POLICY "Users can insert own tryon jobs"
    ON public.tryon_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tryon jobs" ON public.tryon_jobs;
CREATE POLICY "Users can update own tryon jobs"
    ON public.tryon_jobs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tryon jobs" ON public.tryon_jobs;
CREATE POLICY "Users can delete own tryon jobs"
    ON public.tryon_jobs FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 4. 限流機制：每用戶每天最多 10 次試穿
-- ============================================
CREATE OR REPLACE FUNCTION check_daily_tryon_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.tryon_jobs
    WHERE user_id = NEW.user_id
    AND created_date = CURRENT_DATE
  ) >= 10 THEN
    RAISE EXCEPTION 'Daily try-on limit reached (10 per day)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_daily_tryon_limit
  BEFORE INSERT ON public.tryon_jobs
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_tryon_limit();

-- ============================================
-- 5. Storage Buckets (需要在 Supabase Dashboard 執行)
-- ============================================
-- 注意：以下 SQL 僅供參考，實際需要在 Supabase Dashboard 手動創建
-- 或使用 Supabase CLI 創建

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('user-photos', 'user-photos', false);

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('tryon-results', 'tryon-results', false);
