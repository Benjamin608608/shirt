# 下一步：設定 Supabase 並啟動 App

## 🎉 專案已建立完成！

所有程式碼都已經寫好，現在只需要設定 Supabase 就可以開始測試了。

---

## ✅ 已完成的工作

- ✅ Expo 專案初始化
- ✅ 所有依賴套件安裝
- ✅ 完整的專案目錄結構
- ✅ 認證系統 (AuthService + useAuth hook)
- ✅ 衣服資料管理 (GarmentService)
- ✅ 圖片上傳服務 (StorageService)
- ✅ 深色主題 UI
- ✅ 三個主要畫面：
  - 登入/註冊畫面 (AuthScreen)
  - 衣櫃主畫面 (WardrobeScreen)
  - 新增衣服畫面 (AddGarmentScreen)
- ✅ Supabase SQL schema
- ✅ 完整文件

---

## 🚀 快速開始（3 個步驟）

### 步驟 1: 建立 Supabase 專案（5 分鐘）

1. 前往 https://supabase.com/dashboard
2. 點擊 "New Project"
3. 填寫：
   - 名稱：`shirt-wardrobe`
   - 密碼：（設定一個強密碼）
   - Region：Northeast Asia (Tokyo)
4. 等待 2 分鐘完成建立

### 步驟 2: 執行資料庫設定（5 分鐘）

#### 2.1 執行 SQL Schema

1. 在 Supabase Dashboard，點擊 **SQL Editor**
2. 點擊 "New query"
3. 複製 `supabase/migrations/001_initial_schema.sql` 的內容
4. 貼上並點擊 "Run"

#### 2.2 建立 Storage Bucket

1. 點擊 **Storage**
2. 點擊 "New Bucket"
3. 設定：
   - Name: `garments`
   - Public: ❌ 取消勾選
   - File size limit: `5242880` (5MB)
   - Allowed MIME types: `image/jpeg,image/png`

#### 2.3 設定 Storage Policies

在 Storage > garments > Policies，新增 3 個 policies：

```sql
-- 1. 上傳
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'garments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. 讀取
CREATE POLICY "Users can view own images"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'garments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. 刪除
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'garments'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 步驟 3: 設定環境變數（1 分鐘）

1. 在 Supabase Dashboard，點擊 **Settings** > **API**
2. 複製：
   - `Project URL`
   - `anon public` key（⚠️ 不是 service_role）
3. 編輯專案的 `.env` 檔案：

```env
EXPO_PUBLIC_SUPABASE_URL=https://你的專案.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
```

---

## 🎮 啟動 App

```bash
npx expo start
```

然後：
- 按 `w` 在瀏覽器開啟
- 按 `a` 啟動 Android Emulator
- 按 `i` 啟動 iOS Simulator
- 用手機的 Expo Go app 掃描 QR code

---

## ✨ 測試功能

1. **註冊新帳號**
   - 輸入 Email 和密碼
   - 點擊「註冊」

2. **新增第一件衣服**
   - 點擊右下角的 `+` 按鈕
   - 選擇照片
   - 選擇分類
   - 點擊「上傳」

3. **測試安全性（RLS）**
   - 建立第二個測試帳號
   - 確認兩個帳號看不到對方的衣服

---

## 📚 詳細文件

- **README.md** - 專案概述
- **docs/SETUP.md** - 詳細的 Supabase 設定指南

---

## 🐛 常見問題

### Q: 上傳圖片後看不到？

**檢查**：
1. Storage bucket 是否建立
2. Storage policies 是否設定正確
3. 在 Supabase Storage 中確認檔案是否上傳成功

### Q: RLS 錯誤：permission denied

**檢查**：
1. SQL schema 是否執行成功
2. RLS policies 是否建立（執行 `SELECT * FROM pg_policies WHERE tablename = 'garments';`）

### Q: 無法登入

**檢查**：
1. .env 檔案是否設定正確
2. Supabase URL 和 Key 是否正確
3. 是否有網路連線

---

## 🎯 下一步擴充功能

MVP 完成後可以考慮：
- [ ] 刪除衣服功能
- [ ] 編輯衣服分類
- [ ] 衣服標籤系統
- [ ] 穿搭組合功能
- [ ] AI 虛擬試穿（整合 AI 模型）

---

**準備好了嗎？開始設定 Supabase 並測試你的 App！** 🚀
