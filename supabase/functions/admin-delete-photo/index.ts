// @deno-types="https://esm.sh/v135/@supabase/supabase-js@2.39.3/dist/module/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    console.log('Deleting old photos created before 2026-01-14...')

    // 1. 查詢要刪除的照片
    const { data: photos, error: queryError } = await supabase
      .from('user_photos')
      .select('*')
      .eq('is_active', true)
      .lt('created_at', '2026-01-14')

    if (queryError) throw queryError

    console.log('Found', photos.length, 'old photos')

    if (photos.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No old photos to delete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. 刪除 Storage 中的圖片
    for (const photo of photos) {
      try {
        await supabase.storage
          .from('user-photos')
          .remove([photo.image_key])
        console.log('Deleted storage file:', photo.image_key)
      } catch (error) {
        console.error('Failed to delete storage file:', error)
      }
    }

    // 3. 刪除資料庫記錄
    const { error: deleteError } = await supabase
      .from('user_photos')
      .delete()
      .eq('is_active', true)
      .lt('created_at', '2026-01-14')

    if (deleteError) throw deleteError

    console.log('Successfully deleted', photos.length, 'photos')

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: photos.length,
        photos: photos.map(p => ({
          id: p.id.substring(0, 8),
          created_at: p.created_at,
          image_key: p.image_key,
        }))
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
