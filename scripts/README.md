# 自动化设置脚本

## setup-backend.js

自动执行 Supabase 后端设置的脚本。

### 前置要求

确保已安装依赖：
```bash
npm install
```

### 使用方法

#### 1. 获取你的 Supabase 凭证

前往 https://app.supabase.com
1. 选择你的项目
2. 点击左侧 **Settings** → **API**
3. 复制以下信息：
   - **URL**: 在 "Project URL" 部分
   - **Service Role Key**: 在 "Project API keys" 部分（⚠️ 保密！）

#### 2. 设置环境变量

**macOS/Linux:**
```bash
export SUPABASE_URL="https://你的项目ID.supabase.co"
export SUPABASE_SERVICE_KEY="你的服务密钥"
```

**Windows (CMD):**
```cmd
set SUPABASE_URL=https://你的项目ID.supabase.co
set SUPABASE_SERVICE_KEY=你的服务密钥
```

**Windows (PowerShell):**
```powershell
$env:SUPABASE_URL="https://你的项目ID.supabase.co"
$env:SUPABASE_SERVICE_KEY="你的服务密钥"
```

#### 3. 运行脚本

```bash
node scripts/setup-backend.js
```

### 脚本会执行什么？

1. ✅ 创建数据库表（garments, user_photos, tryon_jobs）
2. ✅ 设置 Row Level Security (RLS) 策略
3. ✅ 创建 Storage Buckets（garments, user-photos, tryon-results）
4. ✅ 设置 Storage RLS 策略
5. ✅ 验证所有设置

### 预期输出

```
🚀 开始设置 Supabase 后端...

📝 执行 001_initial_schema.sql...
  ✅ 001_initial_schema.sql - 执行成功

📝 执行 002_virtual_tryon.sql...
  ✅ 002_virtual_tryon.sql - 执行成功

📝 执行 003_storage_setup.sql...
  ✅ 003_storage_setup.sql - 执行成功

🔍 验证设置...

📦 Storage Buckets:
  ✅ garments
  ✅ user-photos
  ✅ tryon-results

📊 数据库表:
  ✅ garments
  ✅ user_photos
  ✅ tryon_jobs

✨ 设置完成！

下一步:
  1. 运行应用: npm start
  2. 测试上传衣物功能
  3. 测试上传个人照片功能
```

### 安全提醒

⚠️ **重要**：
- 永远不要提交包含真实密钥的文件到 Git
- SERVICE_KEY 拥有完全访问权限，务必保密
- 使用完毕后可以清除环境变量：`unset SUPABASE_URL SUPABASE_SERVICE_KEY`

### 故障排除

**问题：缺少环境变量**
```
解决：确保正确设置了 SUPABASE_URL 和 SUPABASE_SERVICE_KEY
```

**问题：无法连接到 Supabase**
```
解决：检查 URL 是否正确，网络连接是否正常
```

**问题：权限错误**
```
解决：确保使用的是 SERVICE_KEY（服务密钥），而不是 ANON_KEY
```
