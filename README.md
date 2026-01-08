# AI 虛擬試穿 / 個人衣櫃 App

這是一個個人數位衣櫃管理 App，使用 React Native (Expo) 和 Supabase 建立。

## 功能

- 使用者註冊 / 登入（Email + Password）
- 上傳衣服照片到個人衣櫃
- 依分類管理衣服
- 所有資料完全私有（RLS 保護）

## 技術棧

- **前端**: Expo / React Native (TypeScript)
- **後端**: Supabase
  - Authentication
  - PostgreSQL Database (with RLS)
  - Storage
- **開發環境**: GitHub Codespaces

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定 Supabase

#### 建立 Supabase 專案

1. 前往 https://supabase.com/dashboard
2. 點擊 "New Project"
3. 設定專案名稱和密碼
4. 選擇 Region（建議 Northeast Asia - Tokyo）

#### 執行資料庫 Schema

1. 前往 Supabase Dashboard > SQL Editor
2. 複製 `supabase/migrations/001_initial_schema.sql` 的內容
3. 執行 SQL

#### 建立 Storage Bucket

1. 前往 Supabase Dashboard > Storage
2. 點擊 "New Bucket"
3. 名稱：`garments`
4. Public：取消勾選（必須私有）
5. File size limit：5MB
6. Allowed MIME types：`image/jpeg, image/png`

#### 設定 Storage RLS Policies

在 Storage > Policies 頁面新增以下 policies：

```sql
-- 上傳
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'garments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 讀取
CREATE POLICY "Users can view own images"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'garments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 刪除
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'garments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. 設定環境變數

1. 複製 `.env.example` 為 `.env`
2. 從 Supabase Dashboard > Settings > API 取得：
   - `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
   - `anon public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. 填入 `.env` 檔案

### 4. 啟動開發伺服器

```bash
npx expo start
```

使用 Expo Go app 掃描 QR code 即可在手機上測試。

## 專案結構

```
src/
├── components/       # React 組件
├── hooks/           # Custom hooks
├── navigation/      # Navigation 設定
├── screens/         # 畫面組件
├── services/        # API 服務層
├── styles/          # 主題和樣式
├── types/           # TypeScript 型別定義
└── utils/           # 工具函式

supabase/
└── migrations/      # SQL schema

docs/                # 文件
```

## 安全性

- 所有資料都使用 Row Level Security (RLS) 保護
- 每位使用者只能存取自己的資料
- 絕對不在前端使用 service_role key
- Storage 使用 private bucket + signed URLs

## 開發指南

### 測試 RLS

建立兩個測試帳號，確認：
- 帳號 A 看不到帳號 B 的衣服
- 帳號 A 無法刪除帳號 B 的衣服

### 常見問題

**Q: 上傳圖片後看不到？**
- 檢查 Storage RLS policies 是否正確設定
- 確認檔案路徑格式為 `{user_id}/{timestamp}.jpg`

**Q: RLS 錯誤：permission denied？**
- 確認 RLS 已啟用
- 檢查 policies 是否正確

## License

MIT
