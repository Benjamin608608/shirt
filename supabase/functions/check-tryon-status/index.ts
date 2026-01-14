// @deno-types="https://esm.sh/v135/@supabase/supabase-js@2.39.3/dist/module/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const REPLICATE_API_TOKEN = Deno.env.get('REPLICATE_API_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckStatusRequest {
  job_id: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { job_id }: CheckStatusRequest = await req.json()

    console.log('Checking status for job:', job_id)

    // 獲取任務
    const { data: job, error: jobError } = await supabase
      .from('tryon_jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (jobError) {
      console.error('Job query error:', jobError)
      throw jobError
    }

    if (!job) {
      throw new Error('Job not found')
    }

    console.log('Current job status:', job.status)
    console.log('AI job ID:', job.ai_job_id)

    // 如果沒有 AI job ID，無法檢查
    if (!job.ai_job_id) {
      return new Response(
        JSON.stringify({ status: job.status, message: 'No AI job ID yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 如果已經完成或失敗，直接返回
    if (job.status === 'completed' || job.status === 'failed') {
      return new Response(
        JSON.stringify({ status: job.status, job }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 檢查 Replicate 狀態
    console.log('Checking Replicate prediction:', job.ai_job_id)

    const replicateResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${job.ai_job_id}`,
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        },
      }
    )

    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text()
      console.error('Replicate API error:', replicateResponse.status, errorText)
      throw new Error(`Replicate API error: ${errorText}`)
    }

    const prediction = await replicateResponse.json()
    console.log('Prediction status:', prediction.status)

    // 更新數據庫狀態
    if (prediction.status === 'succeeded') {
      console.log('Prediction succeeded, downloading result...')

      // 下載並保存結果
      const resultUrl = prediction.output
      await downloadAndSaveResult(job_id, job.user_id, resultUrl)

      return new Response(
        JSON.stringify({ status: 'completed', message: 'Result saved' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (prediction.status === 'failed') {
      console.log('Prediction failed:', prediction.error)

      await supabase
        .from('tryon_jobs')
        .update({
          status: 'failed',
          error_message: prediction.error || 'AI processing failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job_id)

      return new Response(
        JSON.stringify({ status: 'failed', error: prediction.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // 仍在處理中，更新狀態為 processing
      if (job.status !== 'processing') {
        await supabase
          .from('tryon_jobs')
          .update({ status: 'processing' })
          .eq('id', job_id)
      }

      return new Response(
        JSON.stringify({ status: 'processing', prediction_status: prediction.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function downloadAndSaveResult(jobId: string, userId: string, resultUrl: string) {
  try {
    console.log('Downloading result from:', resultUrl)

    // 下載結果圖片
    const imageResponse = await fetch(resultUrl)
    const imageBlob = await imageResponse.blob()
    const arrayBuffer = await imageBlob.arrayBuffer()

    console.log('Downloaded', arrayBuffer.byteLength, 'bytes')

    // 上傳到 Supabase Storage
    const filename = `${jobId}.jpg`
    const filePath = `${userId}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from('tryon-results')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    console.log('Uploaded to storage:', filePath)

    // 更新任務狀態
    await supabase
      .from('tryon_jobs')
      .update({
        status: 'completed',
        result_image_key: filePath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log('Job marked as completed')
  } catch (error) {
    console.error('Save result error:', error)
    await supabase
      .from('tryon_jobs')
      .update({
        status: 'failed',
        error_message: `Failed to save result: ${error.message}`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
    throw error
  }
}
