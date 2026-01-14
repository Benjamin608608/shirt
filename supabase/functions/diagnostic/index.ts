// @deno-types="https://esm.sh/v135/@supabase/supabase-js@2.39.3/dist/module/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      checks: {},
    }

    // 1. 檢查最近的試穿任務
    console.log('Checking recent jobs...')
    const { data: recentJobs, error: jobsError } = await supabase
      .from('tryon_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (jobsError) {
      diagnostics.checks.recent_jobs = { status: 'ERROR', error: jobsError.message }
    } else {
      diagnostics.checks.recent_jobs = {
        status: 'OK',
        count: recentJobs.length,
        jobs: recentJobs.map(j => ({
          id: j.id.substring(0, 8),
          status: j.status,
          garment_id: j.garment_id.substring(0, 8),
          photo_id: j.user_photo_id.substring(0, 8),
          ai_job_id: j.ai_job_id ? j.ai_job_id.substring(0, 20) : null,
          result: j.result_image_key ? 'yes' : 'no',
          created_at: j.created_at,
        }))
      }

      // 檢查重複組合
      const combinations = new Map()
      recentJobs.forEach(job => {
        const key = `${job.garment_id}-${job.user_photo_id}`
        if (!combinations.has(key)) {
          combinations.set(key, [])
        }
        combinations.get(key).push({
          job_id: job.id.substring(0, 8),
          ai_job_id: job.ai_job_id ? job.ai_job_id.substring(0, 20) : null,
        })
      })

      const duplicates: any[] = []
      for (const [key, jobs] of combinations) {
        if (jobs.length > 1) {
          duplicates.push({
            combination: key,
            count: jobs.length,
            jobs: jobs,
          })
        }
      }

      diagnostics.checks.duplicates = {
        status: duplicates.length > 0 ? 'WARNING' : 'OK',
        count: duplicates.length,
        details: duplicates,
      }
    }

    // 2. 檢查 Replicate API 狀態
    if (REPLICATE_API_TOKEN) {
      console.log('Checking Replicate API...')
      try {
        const accountResponse = await fetch('https://api.replicate.com/v1/account', {
          headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` }
        })

        if (accountResponse.ok) {
          const account = await accountResponse.json()
          diagnostics.checks.replicate_api = {
            status: 'OK',
            account_type: account.type,
            username: account.username,
          }
        } else {
          diagnostics.checks.replicate_api = {
            status: 'ERROR',
            error: `HTTP ${accountResponse.status}`,
          }
        }
      } catch (error) {
        diagnostics.checks.replicate_api = {
          status: 'ERROR',
          error: error.message,
        }
      }
    }

    // 3. 檢查 Storage buckets
    console.log('Checking storage...')
    const buckets = ['garments', 'user-photos', 'tryon-results']
    const storageChecks: any = {}

    for (const bucket of buckets) {
      try {
        const { data: files, error } = await supabase.storage
          .from(bucket)
          .list('', { limit: 1 })

        if (error) {
          storageChecks[bucket] = { status: 'ERROR', error: error.message }
        } else {
          storageChecks[bucket] = { status: 'OK', accessible: true }
        }
      } catch (error) {
        storageChecks[bucket] = { status: 'ERROR', error: error.message }
      }
    }

    diagnostics.checks.storage = storageChecks

    // 4. 檢查用戶照片
    const { data: photos, error: photosError } = await supabase
      .from('user_photos')
      .select('*')
      .eq('is_active', true)
      .limit(5)

    if (photosError) {
      diagnostics.checks.user_photos = { status: 'ERROR', error: photosError.message }
    } else {
      diagnostics.checks.user_photos = {
        status: 'OK',
        count: photos.length,
        photos: photos.map(p => ({
          id: p.id.substring(0, 8),
          user_id: p.user_id.substring(0, 8),
          image_key: p.image_key,
          created_at: p.created_at,
        }))
      }
    }

    // 5. 檢查最近一個已完成任務的圖片尺寸
    const completedJob = recentJobs?.find(j => j.status === 'completed' && j.result_image_key)
    if (completedJob && completedJob.result_image_key) {
      console.log('Checking result image size...')
      try {
        const { data: urlData } = await supabase.storage
          .from('tryon-results')
          .createSignedUrl(completedJob.result_image_key, 60)

        if (urlData?.signedUrl) {
          const imageResponse = await fetch(urlData.signedUrl)
          const blob = await imageResponse.blob()

          diagnostics.checks.latest_result_image = {
            status: 'OK',
            job_id: completedJob.id.substring(0, 8),
            image_key: completedJob.result_image_key,
            file_size: blob.size,
            content_type: blob.type,
            url_accessible: true,
          }
        }
      } catch (error) {
        diagnostics.checks.latest_result_image = {
          status: 'ERROR',
          error: error.message,
        }
      }
    }

    // 6. 總結
    const allChecks = Object.values(diagnostics.checks)
    const errorCount = allChecks.filter((c: any) => c.status === 'ERROR').length
    const warningCount = allChecks.filter((c: any) => c.status === 'WARNING').length

    diagnostics.summary = {
      total_checks: allChecks.length,
      errors: errorCount,
      warnings: warningCount,
      overall_status: errorCount > 0 ? 'FAILED' : warningCount > 0 ? 'WARNING' : 'PASSED',
    }

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Diagnostic error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
