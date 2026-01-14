#!/usr/bin/env node

/**
 * 验证 Supabase 后端设置
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fxruuahiqnmcjtmckbxz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ 错误：请设置 SUPABASE_ANON_KEY 环境变量');
  console.log('\n从 Supabase Dashboard → Settings → API 获取 anon public key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
  console.log('\n🔍 验证 Supabase 后端设置...\n');

  let allGood = true;

  // 1. 检查 Storage Buckets
  console.log('📦 检查 Storage Buckets:');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.log(`  ❌ 无法获取 buckets: ${error.message}`);
      allGood = false;
    } else {
      const expectedBuckets = ['garments', 'user-photos', 'tryon-results'];
      const existingBuckets = buckets.map(b => b.name);

      expectedBuckets.forEach(name => {
        if (existingBuckets.includes(name)) {
          console.log(`  ✅ ${name}`);
        } else {
          console.log(`  ❌ ${name} - 未找到`);
          allGood = false;
        }
      });
    }
  } catch (err) {
    console.log(`  ❌ 错误: ${err.message}`);
    allGood = false;
  }

  // 2. 检查数据库表
  console.log('\n📊 检查数据库表:');
  const tables = ['garments', 'user_photos', 'tryon_jobs'];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(0);

      if (error && !error.message.includes('0 rows')) {
        console.log(`  ❌ ${table} - ${error.message}`);
        allGood = false;
      } else {
        console.log(`  ✅ ${table}`);
      }
    } catch (err) {
      console.log(`  ❌ ${table} - ${err.message}`);
      allGood = false;
    }
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  if (allGood) {
    console.log('\n✅ 所有设置验证通过！');
    console.log('\n下一步:');
    console.log('  1. 运行应用: npm start');
    console.log('  2. 测试上传衣物功能');
    console.log('  3. 测试上传个人照片功能\n');
  } else {
    console.log('\n⚠️  部分设置可能有问题，请检查上述错误');
    console.log('\n如需帮助，请查看:');
    console.log('  - BACKEND_SETUP.md');
    console.log('  - CLOUD_SETUP_GUIDE.md\n');
  }
}

verify().catch(console.error);
