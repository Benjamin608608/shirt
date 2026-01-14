/**
 * AI 試穿品質驗證系統 - 類型定義
 */

// ============================================
// 核心驗證結果類型
// ============================================

export interface QualityReport {
  overallScore: number // 0-100 總體評分
  recommendation: 'ACCEPT' | 'REVIEW' | 'RETRY' | 'REJECT' // 系統建議
  personConsistency: PersonConsistency // 人物一致性
  garmentConsistency: GarmentConsistency // 衣服一致性
  issues: QualityIssue[] // 品質問題清單
  userMessage: string // 給用戶的友好提示
}

// ============================================
// 人物一致性
// ============================================

export interface PersonConsistency {
  faceSimilarity: number // 人臉相似度 0-1
  faceDetectedOriginal: boolean // 原始照片是否檢測到人臉
  faceDetectedResult: boolean // 結果圖是否檢測到人臉
  landmarksDistance: number // 關鍵點距離（像素）
}

// ============================================
// 衣服一致性
// ============================================

export interface GarmentConsistency {
  colorDelta: number // Delta E 色差
  colorAccuracy: number // 顏色準確度 0-100
  structureSimilarity: number // 結構相似度 0-1
}

// ============================================
// 品質問題
// ============================================

export interface QualityIssue {
  type: QualityIssueType
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string // 中文描述
  metricValue?: number // 相關指標值
}

export type QualityIssueType =
  | 'FACE_MISMATCH' // 人臉不匹配
  | 'COLOR_SHIFT' // 顏色偏移
  | 'STRUCTURE_LOSS' // 結構細節丟失
  | 'POSE_UNNATURAL' // 姿態不自然
  | 'OVERALL_QUALITY' // 整體品質問題

// ============================================
// 驗證狀態
// ============================================

export type ValidationStatus = 'pending' | 'passed' | 'warning' | 'failed'

export type ValidationRecommendation = 'ACCEPT' | 'REVIEW' | 'RETRY' | 'REJECT'

export type UserFeedback = 'accepted' | 'retried' | 'rejected' | null

// ============================================
// 品質等級
// ============================================

export type QualityGrade =
  | 'EXCELLENT' // 90+: 完美
  | 'GOOD' // 80-89: 優秀
  | 'FAIR' // 70-79: 良好
  | 'POOR' // 60-69: 一般
  | 'FAILED' // <60: 失敗
  | 'PENDING' // 未評分

// ============================================
// Edge Function 請求/響應類型
// ============================================

export interface ValidationRequest {
  job_id: string
  original_photo_url: string
  garment_image_url: string
  result_image_url: string
  garment_category: string
}

export interface ValidationResponse {
  success: boolean
  quality_score: number
  validation_status: ValidationStatus
  recommendation: ValidationRecommendation
  issues: QualityIssue[]
  garment_consistency: GarmentConsistency
  processing_time_ms: number
}

// ============================================
// 數據庫存儲類型（對應 JSONB 欄位）
// ============================================

export interface DbPersonConsistency {
  face_similarity: number
  face_detected_original: boolean
  face_detected_result: boolean
  landmarks_distance: number
}

export interface DbGarmentConsistency {
  color_delta: number
  color_accuracy: number
  structure_similarity: number
}

export interface DbQualityIssue {
  type: string
  severity: string
  description: string
  metric_value?: number
}

// ============================================
// 輔助類型
// ============================================

// 評分顏色映射
export interface ScoreColorMap {
  [key: number]: string
}

// 問題嚴重度圖標
export interface SeverityIconMap {
  LOW: string
  MEDIUM: string
  HIGH: string
}

// 驗證狀態圖標
export interface ValidationStatusIconMap {
  pending: string
  passed: string
  warning: string
  failed: string
}

// ============================================
// BlazeFace 模型類型（來自 TensorFlow.js）
// ============================================

export interface FacePrediction {
  topLeft: [number, number]
  bottomRight: [number, number]
  landmarks: Array<[number, number]>
  probability: number[]
}

// ============================================
// 工具函數返回類型
// ============================================

export interface RGB {
  r: number
  g: number
  b: number
}

export interface Lab {
  l: number
  a: number
  b: number
}

// ============================================
// UI 組件 Props 類型
// ============================================

export interface QualityCardProps {
  qualityReport: QualityReport
  onRetry: () => void
  onAccept: () => void
  onDelete: () => void
}

export interface ScoreBarProps {
  label: string
  score: number // 0-100
  color: string
}

export interface IssueItemProps {
  issue: QualityIssue
}

export interface QualityBadgeProps {
  score: number
  size?: 'small' | 'medium' | 'large'
}

// ============================================
// 服務層配置類型
// ============================================

export interface ValidationConfig {
  // 閾值配置
  thresholds: {
    faceMinSimilarity: number // 人臉最小相似度
    colorMaxDeltaE: number // 最大色差
    structureMinSSIM: number // 最小結構相似度
  }

  // 評分權重
  weights: {
    person: number // 人物權重
    garment: number // 衣服權重
    quality: number // 整體品質權重
  }

  // 功能開關
  features: {
    useFaceDetection: boolean // 是否使用人臉檢測
    useColorAnalysis: boolean // 是否使用顏色分析
    useStructureCheck: boolean // 是否使用結構檢查
    saveDetailedLogs: boolean // 是否保存詳細日誌
  }
}

// 默認配置
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  thresholds: {
    faceMinSimilarity: 0.7,
    colorMaxDeltaE: 15,
    structureMinSSIM: 0.65,
  },
  weights: {
    person: 0.35,
    garment: 0.5,
    quality: 0.15,
  },
  features: {
    useFaceDetection: true,
    useColorAnalysis: true,
    useStructureCheck: true,
    saveDetailedLogs: false,
  },
}

// ============================================
// 統計分析類型
// ============================================

export interface QualityStatistics {
  totalJobs: number
  averageScore: number
  passedCount: number
  warningCount: number
  failedCount: number
  acceptedCount: number
  retriedCount: number
  rejectedCount: number
  commonIssues: Array<{
    type: QualityIssueType
    count: number
    percentage: number
  }>
}

// ============================================
// 錯誤類型
// ============================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public code: ValidationErrorCode,
    public details?: any
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export type ValidationErrorCode =
  | 'MODEL_LOAD_FAILED' // 模型載入失敗
  | 'IMAGE_DOWNLOAD_FAILED' // 圖片下載失敗
  | 'FACE_DETECTION_FAILED' // 人臉檢測失敗
  | 'VALIDATION_TIMEOUT' // 驗證超時
  | 'API_ERROR' // API 調用錯誤
  | 'UNKNOWN_ERROR' // 未知錯誤
