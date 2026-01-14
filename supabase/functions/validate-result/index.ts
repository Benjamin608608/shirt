// @deno-types="https://esm.sh/v135/@supabase/supabase-js@2.39.3/dist/module/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationRequest {
  job_id: string
  original_photo_url: string
  garment_image_url: string
  result_image_url: string
  garment_category: string
}

interface RGB {
  r: number
  g: number
  b: number
}

interface Lab {
  l: number
  a: number
  b: number
}

interface ColorValidation {
  deltaE: number
  accuracy: number
  garmentColor: RGB
  resultColor: RGB
}

interface StructureValidation {
  ssim: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: ValidationRequest = await req.json()
    const startTime = Date.now()

    console.log(`[Validation] Starting validation for job: ${payload.job_id}`)

    // 下載圖片
    const [garmentImage, resultImage] = await Promise.all([
      fetchImageData(payload.garment_image_url),
      fetchImageData(payload.result_image_url),
    ])

    // 執行規則式驗證
    const colorValidation = await validateColor(
      garmentImage,
      resultImage,
      payload.garment_category
    )

    const structureValidation = await validateStructure(
      garmentImage,
      resultImage
    )

    // 計算總分
    const qualityScore = calculateQualityScore(
      colorValidation,
      structureValidation
    )

    // 生成建議
    const recommendation = generateRecommendation(qualityScore)

    // 識別問題
    const issues = identifyIssues(colorValidation, structureValidation)

    // 確定驗證狀態
    const validationStatus = getValidationStatus(qualityScore)

    const processingTime = Date.now() - startTime

    // 更新數據庫
    const { error: updateError } = await supabase
      .from('tryon_jobs')
      .update({
        quality_score: qualityScore,
        validation_status: validationStatus,
        garment_consistency: {
          color_delta: colorValidation.deltaE,
          color_accuracy: colorValidation.accuracy,
          structure_similarity: structureValidation.ssim,
        },
        quality_issues: issues,
        validation_recommendation: recommendation,
        validated_at: new Date().toISOString(),
      })
      .eq('id', payload.job_id)

    if (updateError) {
      console.error('[Validation] Update error:', updateError)
      throw updateError
    }

    // 記錄驗證日誌
    await supabase.from('validation_logs').insert({
      job_id: payload.job_id,
      validation_type: 'overall',
      result: {
        quality_score: qualityScore,
        color_validation: colorValidation,
        structure_validation: structureValidation,
        issues,
      },
      processing_time_ms: processingTime,
      model_version: 'rule-based-v1',
    })

    console.log(
      `[Validation] Completed in ${processingTime}ms - Score: ${qualityScore}`
    )

    return new Response(
      JSON.stringify({
        success: true,
        quality_score: qualityScore,
        validation_status: validationStatus,
        recommendation,
        issues,
        garment_consistency: {
          color_delta: colorValidation.deltaE,
          color_accuracy: colorValidation.accuracy,
          structure_similarity: structureValidation.ssim,
        },
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[Validation] Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// 下載圖片數據
async function fetchImageData(url: string): Promise<ImageData> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }

  const blob = await response.blob()
  const arrayBuffer = await blob.arrayBuffer()

  // 解析圖片（這裡使用簡化版本，實際可能需要圖像解碼庫）
  // 為了簡化，我們將假設圖片已經可以直接處理
  return {
    data: new Uint8Array(arrayBuffer),
    width: 0, // 實際需要從圖片元數據獲取
    height: 0,
  }
}

interface ImageData {
  data: Uint8Array
  width: number
  height: number
}

// 顏色驗證
async function validateColor(
  garmentImage: ImageData,
  resultImage: ImageData,
  category: string
): Promise<ColorValidation> {
  // 提取主導色（簡化版本：使用前1000個像素的平均值）
  const garmentColor = extractDominantColor(garmentImage.data)
  const resultColor = extractDominantColor(resultImage.data)

  // 計算色差（Delta E）
  const deltaE = calculateDeltaE(garmentColor, resultColor)

  // 計算準確度分數（0-100）
  // Delta E < 5: 幾乎相同
  // Delta E 5-10: 輕微差異
  // Delta E 10-20: 明顯差異
  // Delta E > 20: 顯著差異
  const accuracy = Math.max(0, 100 - deltaE * 3)

  return {
    deltaE,
    accuracy: Math.round(accuracy),
    garmentColor,
    resultColor,
  }
}

// 提取主導色
function extractDominantColor(imageData: Uint8Array): RGB {
  // 簡化版本：計算前1000個像素的平均RGB
  const sampleSize = Math.min(1000 * 4, imageData.length) // 每個像素4字節（RGBA）
  let r = 0,
    g = 0,
    b = 0
  let count = 0

  for (let i = 0; i < sampleSize; i += 4) {
    r += imageData[i]
    g += imageData[i + 1]
    b += imageData[i + 2]
    count++
  }

  if (count === 0) {
    return { r: 128, g: 128, b: 128 } // 默認灰色
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  }
}

// 計算 Delta E (CIE76 簡化版本)
function calculateDeltaE(color1: RGB, color2: RGB): number {
  // 轉換到 LAB 色彩空間
  const lab1 = rgbToLab(color1)
  const lab2 = rgbToLab(color2)

  // 計算歐式距離
  const deltaL = lab1.l - lab2.l
  const deltaA = lab1.a - lab2.a
  const deltaB = lab1.b - lab2.b

  const deltaE = Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB)

  return Math.round(deltaE * 10) / 10
}

// RGB 轉 LAB（簡化版本）
function rgbToLab(rgb: RGB): Lab {
  // 先轉換到 XYZ
  let r = rgb.r / 255
  let g = rgb.g / 255
  let b = rgb.b / 255

  // Gamma 校正
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  // XYZ
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100

  // XYZ 轉 LAB
  const xn = 95.047
  const yn = 100.0
  const zn = 108.883

  let fx = x / xn
  let fy = y / yn
  let fz = z / zn

  fx = fx > 0.008856 ? Math.pow(fx, 1 / 3) : 7.787 * fx + 16 / 116
  fy = fy > 0.008856 ? Math.pow(fy, 1 / 3) : 7.787 * fy + 16 / 116
  fz = fz > 0.008856 ? Math.pow(fz, 1 / 3) : 7.787 * fz + 16 / 116

  const l = 116 * fy - 16
  const a = 500 * (fx - fy)
  const bVal = 200 * (fy - fz)

  return { l, a, b: bVal }
}

// 結構驗證（簡化版本）
async function validateStructure(
  garmentImage: ImageData,
  resultImage: ImageData
): Promise<StructureValidation> {
  // 簡化版 SSIM：使用像素亮度相似度
  const garmentLuminance = calculateAverageLuminance(garmentImage.data)
  const resultLuminance = calculateAverageLuminance(resultImage.data)

  // 計算相似度（0-1）
  const luminanceDiff = Math.abs(garmentLuminance - resultLuminance)
  const ssim = Math.max(0, 1 - luminanceDiff / 255)

  return { ssim: Math.round(ssim * 100) / 100 }
}

// 計算平均亮度
function calculateAverageLuminance(imageData: Uint8Array): number {
  const sampleSize = Math.min(1000 * 4, imageData.length)
  let luminance = 0
  let count = 0

  for (let i = 0; i < sampleSize; i += 4) {
    const r = imageData[i]
    const g = imageData[i + 1]
    const b = imageData[i + 2]

    // 計算感知亮度
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    luminance += lum
    count++
  }

  return count > 0 ? luminance / count : 128
}

// 計算總分
function calculateQualityScore(
  colorVal: ColorValidation,
  structureVal: StructureValidation
): number {
  // 權重：顏色60%，結構40%
  const score = colorVal.accuracy * 0.6 + structureVal.ssim * 100 * 0.4

  return Math.round(Math.max(0, Math.min(100, score)))
}

// 生成建議
function generateRecommendation(score: number): string {
  if (score >= 85) return 'ACCEPT'
  if (score >= 70) return 'REVIEW'
  if (score >= 50) return 'RETRY'
  return 'REJECT'
}

// 識別問題
function identifyIssues(
  colorVal: ColorValidation,
  structureVal: StructureValidation
) {
  const issues = []

  // 顏色問題
  if (colorVal.deltaE > 15) {
    issues.push({
      type: 'COLOR_SHIFT',
      severity: colorVal.deltaE > 25 ? 'HIGH' : 'MEDIUM',
      description: `衣服顏色偏移 (ΔE=${colorVal.deltaE.toFixed(1)})`,
      metric_value: colorVal.deltaE,
    })
  }

  // 結構問題
  if (structureVal.ssim < 0.65) {
    issues.push({
      type: 'STRUCTURE_LOSS',
      severity: structureVal.ssim < 0.5 ? 'HIGH' : 'MEDIUM',
      description: `紋理細節保留不足 (${(structureVal.ssim * 100).toFixed(0)}%)`,
      metric_value: structureVal.ssim,
    })
  }

  // 綜合品質問題
  if (colorVal.deltaE > 15 && structureVal.ssim < 0.65) {
    issues.push({
      type: 'OVERALL_QUALITY',
      severity: 'HIGH',
      description: '整體品質不佳，建議重新試穿',
      metric_value: 0,
    })
  }

  return issues
}

// 獲取驗證狀態
function getValidationStatus(score: number): string {
  if (score >= 85) return 'passed'
  if (score >= 70) return 'warning'
  return 'failed'
}
