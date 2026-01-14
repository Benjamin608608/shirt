# Supabase Storage 設置指南

## 概述
本指南將引導你建立虛擬試穿功能所需的 Supabase Storage buckets 和相關權限配置。

## 所需 Storage Buckets

### 1. `user-photos` - 用戶個人照片
- **用途**: 存儲用戶上傳的全身照，用於虛擬試穿
- **類型**: 私有 (private)
- **大小限制**: 10MB
- **允許格式**: JPG, JPEG, PNG

### 2. `tryon-results` - 試穿結果
- **用途**: 存儲 AI 生成的試穿結果圖片
- **類型**: 私有 (private)
- **大小限制**: 20MB
- **允許格式**: JPG, JPEG, PNG

---

## 方法一：使用 Supabase Migration（推薦）

### 步驟 1: 運行本地 Supabase
```bash
# 啟動本地 Supabase 服務
npx supabase start

# 等待服務啟動完成
```

### 步驟 2: 運行 Migration
```bash
# 應用所有 migrations（包括 storage 設置）
npx supabase db reset

# 或者只應用新的 migration
npx supabase migration up
```

### 步驟 3: 驗證設置
```bash
# 檢查 migrations 狀態
npx supabase migration list

# 應該看到以下 migrations:
# ✓ 001_initial_schema.sql
# ✓ 002_virtual_tryon.sql
# ✓ 003_storage_setup.sql
```

---

## 方法二：使用 Supabase Dashboard（適用於生產環境）

### 步驟 1: 創建 Storage Buckets

1. 前往 [Supabase Dashboard](https://app.supabase.com)
2. 選擇你的專案
3. 點擊左側菜單 **Storage**
4. 點擊 **Create new bucket**

#### 創建 `user-photos` bucket:
- **Name**: `user-photos`
- **Public**: ❌ 關閉（私有）
- **File size limit**: `10 MB`
- **Allowed MIME types**: `image/jpeg, image/png, image/jpg`
- 點擊 **Create bucket**

#### 創建 `tryon-results` bucket:
- **Name**: `tryon-results`
- **Public**: ❌ 關閉（私有）
- **File size limit**: `20 MB`
- **Allowed MIME types**: `image/jpeg, image/png, image/jpg`
- 點擊 **Create bucket**

### 步驟 2: 設置 RLS 策略

#### 為 `user-photos` bucket 設置策略:

1. 點擊 `user-photos` bucket
2. 前往 **Policies** 標籤
3. 點擊 **New Policy** → **Create a policy from scratch**

創建以下 4 個策略：

**策略 1: 讀取自己的照片**
```sql
-- Policy Name: Users can read own user photos
-- Operation: SELECT

(bucket_id = 'user-photos') AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

**策略 2: 上傳自己的照片**
```sql
-- Policy Name: Users can upload own user photos
-- Operation: INSERT

(bucket_id = 'user-photos') AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

**策略 3: 更新自己的照片**
```sql
-- Policy Name: Users can update own user photos
-- Operation: UPDATE
-- USING 和 WITH CHECK 都使用:

(bucket_id = 'user-photos') AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

**策略 4: 刪除自己的照片**
```sql
-- Policy Name: Users can delete own user photos
-- Operation: DELETE

(bucket_id = 'user-photos') AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

#### 為 `tryon-results` bucket 設置策略:

**策略 1: 讀取自己的試穿結果**
```sql
-- Policy Name: Users can read own tryon results
-- Operation: SELECT

(bucket_id = 'tryon-results') AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

**策略 2: 系統寫入試穿結果**
```sql
-- Policy Name: Service can upload tryon results
-- Operation: INSERT

(bucket_id = 'tryon-results') AND (auth.role() = 'service_role'::text)
```

**策略 3: 刪除自己的試穿結果**
```sql
-- Policy Name: Users can delete own tryon results
-- Operation: DELETE

(bucket_id = 'tryon-results') AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

---

## 方法三：使用 SQL Editor（快速設置）

1. 前往 Supabase Dashboard
2. 點擊左側菜單 **SQL Editor**
3. 點擊 **New query**
4. 複製並執行 `supabase/migrations/003_storage_setup.sql` 的內容
5. 點擊 **Run**

---

## 驗證設置

### 1. 檢查 Buckets 是否創建成功
```sql
SELECT * FROM storage.buckets WHERE id IN ('user-photos', 'tryon-results');
```

應該看到 2 個 buckets。

### 2. 檢查 RLS 策略是否設置成功
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND (qual LIKE '%user-photos%' OR qual LIKE '%tryon-results%');
```

應該看到總共 7 個策略。

### 3. 測試上傳功能

運行應用程式，嘗試上傳個人照片：

```bash
# 在另一個終端運行應用
npm start
# 或
npx expo start
```

如果設置正確，你應該能夠：
- ✅ 選擇並上傳照片
- ✅ 看到上傳進度
- ✅ 照片成功顯示在個人照片頁面

---

## 常見問題

### Q1: 上傳失敗，提示 "Storage bucket not found"
**解決方法**: 確認 buckets 已創建，名稱完全匹配（區分大小寫）

### Q2: 上傳失敗，提示 "Permission denied"
**解決方法**: 檢查 RLS 策略是否正確設置，特別是 INSERT 和 UPDATE 策略

### Q3: 可以上傳但無法讀取照片
**解決方法**: 檢查 SELECT 策略，確保 `storage.foldername` 函數正確解析路徑

### Q4: 測試環境和生產環境需要分別設置嗎？
**答**: 是的。本地使用 migration，生產環境建議通過 Dashboard 或 SQL Editor 手動執行

---

## 檔案結構說明

上傳的照片會按以下結構存儲：

```
user-photos/
  └── {user_id}/
      └── profile.jpg          # 用戶當前的個人照片（會被覆蓋）

tryon-results/
  └── {user_id}/
      └── {job_id}.jpg         # 試穿結果照片
```

這種結構確保：
- ✅ 每個用戶只能訪問自己的照片
- ✅ RLS 策略可以輕鬆驗證權限
- ✅ 照片組織清晰，易於管理

---

## 下一步

設置完成後，你可以：

1. ✅ 測試個人照片上傳功能
2. ✅ 配置 AI 虛擬試穿服務（Replicate API）
3. ✅ 測試完整的虛擬試穿流程

如有問題，請參考：
- [Supabase Storage 文檔](https://supabase.com/docs/guides/storage)
- [Row Level Security 文檔](https://supabase.com/docs/guides/auth/row-level-security)
