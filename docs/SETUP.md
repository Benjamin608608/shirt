# Supabase 設定指南

## 步驟 1: 建立 Supabase 專案

1. 前往 https://supabase.com/dashboard
2. 登入或註冊帳號
3. 點擊 "New Project"
4. 填寫資訊：
   - **Name**: `shirt-wardrobe`
   - **Database Password**: 使用強密碼（請記住）
   - **Region**: Northeast Asia (Tokyo) - 建議選擇離使用者最近的
   - **Pricing Plan**: Free（測試階段）
5. 點擊 "Create new project"
6. 等待約 2 分鐘完成建立

## 步驟 2: 取得 API Keys

1. 進入專案 Dashboard
2. 點擊左側選單的 ⚙️ Settings
3. 選擇 "API"
4. 複製以下資訊：
   - **Project URL**: 類似 `https://xxxxx.supabase.co`
   - **anon public** key: 一長串的 JWT token

⚠️ **重要**: 只複製 `anon public` key，絕對不要使用 `service_role` key 在前端！

## 步驟 3: 設定環境變數

1. 在專案根目錄，將 `.env.example` 複製為 `.env`
2. 填入剛才複製的資訊：

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 步驟 4: 執行資料庫 Schema

1. 在 Supabase Dashboard，點擊左側的 🗄️ SQL Editor
2. 點擊 "New query"
3. 複製 `supabase/migrations/001_initial_schema.sql` 的完整內容
4. 貼上到 SQL Editor
5. 點擊右下角的 "Run" 按鈕
6. 確認沒有錯誤訊息

### 驗證資料庫設定

執行以下 SQL 確認 RLS 已啟用：

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'garments';
```

應該看到 `rowsecurity` 為 `true`。

查看所有 policies：

```sql
SELECT * FROM pg_policies WHERE tablename = 'garments';
```

應該看到 4 個 policies。

## 步驟 5: 建立 Storage Bucket

1. 在 Supabase Dashboard，點擊左側的 🗂️ Storage
2. 點擊 "Create a new bucket"
3. 填寫資訊：
   - **Name**: `garments`
   - **Public bucket**: ❌ 取消勾選（必須私有）
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg,image/png`
4. 點擊 "Create bucket"

## 步驟 6: 設定 Storage RLS Policies

1. 在 Storage 頁面，選擇剛建立的 `garments` bucket
2. 點擊 "Policies" 標籤
3. 點擊 "New Policy"

### Policy 1: 上傳權限

```sql
CREATE POLICY "Users can upload own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'garments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 2: 讀取權限

```sql
CREATE POLICY "Users can view own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'garments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 3: 刪除權限

```sql
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'garments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## 步驟 7: 設定 Authentication

1. 點擊左側的 🔐 Authentication
2. 選擇 "Providers"
3. 確認 "Email" provider 已啟用
4. 點擊 "Email" 進入設定
5. MVP 階段建議設定：
   - **Enable Email provider**: ✅ 勾選
   - **Confirm email**: ❌ 取消勾選（加速測試）
   - **Secure email change**: ✅ 保持勾選
6. 點擊 "Save"

## 完成！

現在可以啟動 App 進行測試：

```bash
npx expo start
```

## 測試清單

- [ ] 可以註冊新帳號
- [ ] 可以登入
- [ ] 可以上傳照片
- [ ] 建立第二個測試帳號，確認看不到對方的衣服
