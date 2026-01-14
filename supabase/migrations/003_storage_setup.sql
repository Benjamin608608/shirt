-- ============================================
-- Storage Buckets 配置
-- ============================================
-- 用於虛擬試穿功能的圖片儲存

-- ============================================
-- 1. 創建 Storage Buckets
-- ============================================

-- 創建衣物照片 bucket (私有)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'garments',
  'garments',
  false,
  10485760,  -- 10MB 限制
  ARRAY['image/jpeg', 'image/png', 'image/jpg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 創建用戶照片 bucket (私有)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-photos',
  'user-photos',
  false,  -- 私有 bucket，需要透過 signed URL 訪問
  10485760,  -- 10MB 限制
  ARRAY['image/jpeg', 'image/png', 'image/jpg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 創建試穿結果 bucket (私有)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tryon-results',
  'tryon-results',
  false,  -- 私有 bucket，需要透過 signed URL 訪問
  20971520,  -- 20MB 限制
  ARRAY['image/jpeg', 'image/png', 'image/jpg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Storage RLS Policies - garments bucket
-- ============================================

DROP POLICY IF EXISTS "Users can read own garments" ON storage.objects;
CREATE POLICY "Users can read own garments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'garments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can upload own garments" ON storage.objects;
CREATE POLICY "Users can upload own garments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'garments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own garments" ON storage.objects;
CREATE POLICY "Users can update own garments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'garments' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'garments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own garments" ON storage.objects;
CREATE POLICY "Users can delete own garments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'garments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 3. Storage RLS Policies - user-photos bucket
-- ============================================

-- 用戶可以讀取自己的照片
DROP POLICY IF EXISTS "Users can read own user photos" ON storage.objects;
CREATE POLICY "Users can read own user photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 用戶可以上傳自己的照片
DROP POLICY IF EXISTS "Users can upload own user photos" ON storage.objects;
CREATE POLICY "Users can upload own user photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 用戶可以更新自己的照片
DROP POLICY IF EXISTS "Users can update own user photos" ON storage.objects;
CREATE POLICY "Users can update own user photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 用戶可以刪除自己的照片
DROP POLICY IF EXISTS "Users can delete own user photos" ON storage.objects;
CREATE POLICY "Users can delete own user photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 4. Storage RLS Policies - tryon-results bucket
-- ============================================

-- 用戶可以讀取自己的試穿結果
DROP POLICY IF EXISTS "Users can read own tryon results" ON storage.objects;
CREATE POLICY "Users can read own tryon results"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tryon-results' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 系統（Edge Functions）可以寫入試穿結果
DROP POLICY IF EXISTS "Service can upload tryon results" ON storage.objects;
CREATE POLICY "Service can upload tryon results"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tryon-results' AND
  auth.role() = 'service_role'
);

-- 用戶可以刪除自己的試穿結果
DROP POLICY IF EXISTS "Users can delete own tryon results" ON storage.objects;
CREATE POLICY "Users can delete own tryon results"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tryon-results' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
