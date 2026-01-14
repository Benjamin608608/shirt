#!/usr/bin/env node

/**
 * Supabase 后端自动设置脚本
 *
 * 使用方法:
 * 1. 设置环境变量:
 *    export SUPABASE_URL="你的 Supabase URL"
 *    export SUPABASE_SERVICE_KEY="你的服务密钥"
 *
 * 2. 运行脚本:
 *    node scripts/setup-backend.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupBackend() {
  log('\n🚀 开始设置 Supabase 后端...\n', 'blue');

  // 检查环境变量
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('❌ 错误：缺少环境变量', 'red');
    log('\n请设置以下环境变量:', 'yellow');
    log('  export SUPABASE_URL="你的 Supabase URL"', 'yellow');
    log('  export SUPABASE_SERVICE_KEY="你的服务密钥"\n', 'yellow');
    process.exit(1);
  }

  // 创建 Supabase 客户端（使用服务密钥）
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 读取 migration 文件
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const migrations = [
      '001_initial_schema.sql',
      '002_virtual_tryon.sql',
      '003_storage_setup.sql',
    ];

    // 执行每个 migration
    for (const migrationFile of migrations) {
      const filePath = path.join(migrationsDir, migrationFile);

      log(`\n📝 执行 ${migrationFile}...`, 'blue');

      if (!fs.existsSync(filePath)) {
        log(`  ⚠️  文件不存在: ${filePath}`, 'yellow');
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf8');

      // 使用 RPC 执行 SQL
      const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

      if (error) {
        // 某些错误是可以接受的（比如 "already exists"）
        if (error.message.includes('already exists')) {
          log(`  ✅ ${migrationFile} - 已存在，跳过`, 'yellow');
        } else {
          log(`  ❌ 错误: ${error.message}`, 'red');
        }
      } else {
        log(`  ✅ ${migrationFile} - 执行成功`, 'green');
      }
    }

    // 验证设置
    log('\n\n🔍 验证设置...', 'blue');

    // 检查 buckets
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      log(`  ❌ 无法获取 buckets: ${bucketsError.message}`, 'red');
    } else {
      const expectedBuckets = ['garments', 'user-photos', 'tryon-results'];
      const existingBuckets = buckets.map(b => b.name);

      log('\n📦 Storage Buckets:', 'blue');
      expectedBuckets.forEach(name => {
        if (existingBuckets.includes(name)) {
          log(`  ✅ ${name}`, 'green');
        } else {
          log(`  ❌ ${name} - 未找到`, 'red');
        }
      });
    }

    // 检查表
    log('\n📊 数据库表:', 'blue');
    const tables = ['garments', 'user_photos', 'tryon_jobs'];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(0);

      if (error && !error.message.includes('0 rows')) {
        log(`  ❌ ${table} - ${error.message}`, 'red');
      } else {
        log(`  ✅ ${table}`, 'green');
      }
    }

    log('\n\n✨ 设置完成！', 'green');
    log('\n下一步:', 'blue');
    log('  1. 运行应用: npm start', 'yellow');
    log('  2. 测试上传衣物功能', 'yellow');
    log('  3. 测试上传个人照片功能\n', 'yellow');

  } catch (error) {
    log(`\n❌ 设置失败: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// 运行设置
setupBackend();
