// @deno-types="https://esm.sh/v135/@supabase/supabase-js@2.39.3/dist/module/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getImageDimensions(imageUrl: string) {
  const response = await fetch(imageUrl)
  const buffer = await response.arrayBuffer()
  const uint8Array = new Uint8Array(buffer)

  // Parse JPEG dimensions
  if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
    let i = 2
    while (i < uint8Array.length) {
      if (uint8Array[i] !== 0xFF) break

      const marker = uint8Array[i + 1]

      // SOF markers (Start Of Frame)
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
        const height = (uint8Array[i + 5] << 8) | uint8Array[i + 6]
        const width = (uint8Array[i + 7] << 8) | uint8Array[i + 8]
        return { width, height }
      }

      const length = (uint8Array[i + 2] << 8) | uint8Array[i + 3]
      i += length + 2
    }
  }

  throw new Error('Unable to parse image dimensions')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 獲取最新的用戶照片
    const { data: userPhoto } = await supabase
      .from('user_photos')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!userPhoto) {
      return new Response(
        JSON.stringify({ error: 'No user photo found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. 獲取該照片的 Storage URL
    const { data: photoUrlData } = await supabase.storage
      .from('user-photos')
      .createSignedUrl(userPhoto.image_key, 3600)

    const userPhotoUrl = photoUrlData?.signedUrl

    // 3. 獲取最新的試穿結果
    const { data: latestJob } = await supabase
      .from('tryon_jobs')
      .select('*')
      .eq('user_photo_id', userPhoto.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let resultImageUrl = null
    let resultDimensions = null

    if (latestJob && latestJob.result_image_key) {
      const { data: resultUrlData } = await supabase.storage
        .from('tryon-results')
        .createSignedUrl(latestJob.result_image_key, 3600)

      resultImageUrl = resultUrlData?.signedUrl

      if (resultImageUrl) {
        resultDimensions = await getImageDimensions(resultImageUrl)
      }
    }

    // 4. 獲取用戶照片尺寸
    const userPhotoDimensions = userPhotoUrl ? await getImageDimensions(userPhotoUrl) : null

    return new Response(
      JSON.stringify({
        user_photo: {
          id: userPhoto.id,
          created_at: userPhoto.created_at,
          image_key: userPhoto.image_key,
          dimensions: userPhotoDimensions,
          aspect_ratio: userPhotoDimensions ?
            (userPhotoDimensions.width / userPhotoDimensions.height).toFixed(3) : null,
          url: userPhotoUrl,
        },
        result_image: latestJob ? {
          job_id: latestJob.id,
          created_at: latestJob.created_at,
          image_key: latestJob.result_image_key,
          dimensions: resultDimensions,
          aspect_ratio: resultDimensions ?
            (resultDimensions.width / resultDimensions.height).toFixed(3) : null,
          url: resultImageUrl,
        } : null,
        analysis: {
          user_photo_ratio: userPhotoDimensions ?
            `${userPhotoDimensions.width}:${userPhotoDimensions.height}` : null,
          result_ratio: resultDimensions ?
            `${resultDimensions.width}:${resultDimensions.height}` : null,
          is_distorted: userPhotoDimensions && resultDimensions ?
            Math.abs(userPhotoDimensions.width / userPhotoDimensions.height -
                     resultDimensions.width / resultDimensions.height) > 0.05 : null,
        }
      }),
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
