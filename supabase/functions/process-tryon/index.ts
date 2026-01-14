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

interface TryOnRequest {
  job_id: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { job_id }: TryOnRequest = await req.json()

    // 獲取任務信息
    const { data: job, error: jobError } = await supabase
      .from('tryon_jobs')
      .select(`
        *,
        garment:garments(*),
        user_photo:user_photos(*)
      `)
      .eq('id', job_id)
      .single()

    if (jobError) throw jobError

    // 更新狀態為 processing
    await supabase
      .from('tryon_jobs')
      .update({ status: 'processing' })
      .eq('id', job_id)

    // 獲取圖片的公開 URL
    const garmentUrl = await getSignedUrl('garments', job.garment.image_key)
    const userPhotoUrl = await getSignedUrl('user-photos', job.user_photo.image_key)

    // 調用 Replicate API
    const prediction = await createReplicatePrediction({
      garmentUrl,
      userPhotoUrl,
      category: job.garment.category,
    })

    // 保存 AI job ID
    await supabase
      .from('tryon_jobs')
      .update({ ai_job_id: prediction.id })
      .eq('id', job_id)

    // 啟動輪詢檢查結果（異步）- 不要 await，讓它在背景執行
    pollPredictionResult(job_id, prediction.id).catch((error) => {
      console.error('Polling error:', error)
      // 更新任務為失敗狀態
      supabase
        .from('tryon_jobs')
        .update({
          status: 'failed',
          error_message: `Polling error: ${error.message}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job_id)
        .then(() => console.log('Updated job to failed status'))
    })

    console.log('Job processing started, prediction ID:', prediction.id)

    return new Response(
      JSON.stringify({ success: true, job_id, prediction_id: prediction.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600)

  if (error) throw error
  return data.signedUrl
}

async function createReplicatePrediction(input: {
  garmentUrl: string
  userPhotoUrl: string
  category: string
}) {
  const categoryMapping: Record<string, string> = {
    'shirt': 'upper_body',
    'coat': 'upper_body',
    'dress': 'dresses',
    'pants': 'lower_body',
    'shoes': 'lower_body',
    'accessories': 'upper_body',
    'other': 'upper_body',
  }

  const aiCategory = categoryMapping[input.category] || 'upper_body'

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4', // IDM-VTON
      input: {
        garm_img: input.garmentUrl,
        human_img: input.userPhotoUrl,
        garment_des: 'clothing item',
        category: aiCategory,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Replicate API error: ${response.statusText} - ${errorText}`)
  }

  return await response.json()
}

async function pollPredictionResult(jobId: string, predictionId: string) {
  const maxAttempts = 60 // 5 分鐘（每 5 秒檢查一次）
  let attempts = 0

  console.log(`Starting polling for job ${jobId}, prediction ${predictionId}`)

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)) // 等待 5 秒
    attempts++

    try {
      console.log(`Polling attempt ${attempts}/${maxAttempts}`)

      const response = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          },
        }
      )

      if (!response.ok) {
        console.error('Replicate API error:', response.status, await response.text())
        continue
      }

      const prediction = await response.json()
      console.log(`Prediction status: ${prediction.status}`)

      if (prediction.status === 'succeeded') {
        console.log('Prediction succeeded! Output:', prediction.output)
        // 下載結果圖片並上傳到 Supabase Storage
        const resultUrl = prediction.output
        await downloadAndSaveResult(jobId, resultUrl)
        console.log('Result saved successfully')
        break
      } else if (prediction.status === 'failed') {
        console.error('Prediction failed:', prediction.error)
        await supabase
          .from('tryon_jobs')
          .update({
            status: 'failed',
            error_message: prediction.error || 'AI processing failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId)
        break
      } else if (prediction.status === 'canceled') {
        console.error('Prediction was canceled')
        await supabase
          .from('tryon_jobs')
          .update({
            status: 'failed',
            error_message: 'Processing was canceled',
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId)
        break
      }

      // 仍在處理中，繼續輪詢
      console.log('Still processing, continuing to poll...')

    } catch (error) {
      console.error('Polling error:', error)
      // 不要立即失敗，繼續嘗試
    }
  }

  // 超時處理
  if (attempts >= maxAttempts) {
    console.error('Polling timeout after', maxAttempts, 'attempts')
    await supabase
      .from('tryon_jobs')
      .update({
        status: 'failed',
        error_message: 'Processing timeout (exceeded 5 minutes)',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}

async function downloadAndSaveResult(jobId: string, resultUrl: string) {
  try {
    // 獲取任務信息
    const { data: job } = await supabase
      .from('tryon_jobs')
      .select('user_id')
      .eq('id', jobId)
      .single()

    // 下載結果圖片
    const imageResponse = await fetch(resultUrl)
    const imageBlob = await imageResponse.blob()
    const arrayBuffer = await imageBlob.arrayBuffer()

    // 上傳到 Supabase Storage
    const filename = `${jobId}.jpg`
    const filePath = `${job.user_id}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from('tryon-results')
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // 更新任務狀態
    await supabase
      .from('tryon_jobs')
      .update({
        status: 'completed',
        result_image_key: filePath,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  } catch (error) {
    console.error('Save result error:', error)
    await supabase
      .from('tryon_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}
