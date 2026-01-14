-- ============================================
-- 1. 建立 garments table
-- ============================================
CREATE TABLE IF NOT EXISTS public.garments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('shirt', 'pants', 'coat', 'dress', 'shoes', 'accessories', 'other')),
    image_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_garments_user_id ON public.garments(user_id);
CREATE INDEX IF NOT EXISTS idx_garments_category ON public.garments(category);
CREATE INDEX IF NOT EXISTS idx_garments_created_at ON public.garments(created_at DESC);

-- 自動更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_garments_updated_at ON public.garments;
CREATE TRIGGER update_garments_updated_at
    BEFORE UPDATE ON public.garments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. 啟用 Row Level Security (RLS)
-- ============================================
ALTER TABLE public.garments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. 建立 RLS Policies
-- ============================================

-- 使用者只能讀取自己的衣服
DROP POLICY IF EXISTS "Users can view own garments" ON public.garments;
CREATE POLICY "Users can view own garments"
    ON public.garments
    FOR SELECT
    USING (auth.uid() = user_id);

-- 使用者只能新增自己的衣服
DROP POLICY IF EXISTS "Users can insert own garments" ON public.garments;
CREATE POLICY "Users can insert own garments"
    ON public.garments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 使用者只能更新自己的衣服
DROP POLICY IF EXISTS "Users can update own garments" ON public.garments;
CREATE POLICY "Users can update own garments"
    ON public.garments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 使用者只能刪除自己的衣服
DROP POLICY IF EXISTS "Users can delete own garments" ON public.garments;
CREATE POLICY "Users can delete own garments"
    ON public.garments
    FOR DELETE
    USING (auth.uid() = user_id);
