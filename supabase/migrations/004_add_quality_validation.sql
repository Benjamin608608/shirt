-- ============================================
-- AI 試穿品質驗證系統 - 數據庫 Schema 擴展
-- ============================================

-- ============================================
-- 1. 擴展 tryon_jobs 表 - 添加品質驗證欄位
-- ============================================

-- 總體品質評分 (0-100)
ALTER TABLE public.tryon_jobs
ADD COLUMN IF NOT EXISTS quality_score INTEGER
CHECK (quality_score >= 0 AND quality_score <= 100);

-- 驗證狀態
ALTER TABLE public.tryon_jobs
ADD COLUMN IF NOT EXISTS validation_status TEXT
CHECK (validation_status IN ('pending', 'passed', 'warning', 'failed'))
DEFAULT 'pending';

-- 人物一致性檢測結果 (JSONB)
-- 範例: {
--   "face_similarity": 0.87,
--   "face_detected_original": true,
--   "face_detected_result": true,
--   "landmarks_distance": 12.5
-- }
ALTER TABLE public.tryon_jobs
ADD COLUMN IF NOT EXISTS person_consistency JSONB;

-- 衣服一致性檢測結果 (JSONB)
-- 範例: {
--   "color_delta": 8.2,
--   "color_accuracy": 92,
--   "structure_similarity": 0.78
-- }
ALTER TABLE public.tryon_jobs
ADD COLUMN IF NOT EXISTS garment_consistency JSONB;

-- 品質問題標記 (JSONB 陣列)
-- 範例: [
--   {
--     "type": "COLOR_SHIFT",
--     "severity": "MEDIUM",
--     "description": "衣服顏色略有偏移",
--     "metric_value": 12.5
--   }
-- ]
ALTER TABLE public.tryon_jobs
ADD COLUMN IF NOT EXISTS quality_issues JSONB DEFAULT '[]'::jsonb;

-- 驗證建議
ALTER TABLE public.tryon_jobs
ADD COLUMN IF NOT EXISTS validation_recommendation TEXT
CHECK (validation_recommendation IN ('ACCEPT', 'REVIEW', 'RETRY', 'REJECT'));

-- 用戶反饋
ALTER TABLE public.tryon_jobs
ADD COLUMN IF NOT EXISTS user_feedback TEXT
CHECK (user_feedback IN ('accepted', 'retried', 'rejected'));

-- 驗證時間戳
ALTER TABLE public.tryon_jobs
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- 用戶反饋時間戳
ALTER TABLE public.tryon_jobs
ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

-- ============================================
-- 2. 索引優化
-- ============================================

-- 驗證狀態索引（用於查詢特定驗證狀態的任務）
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_validation_status
ON public.tryon_jobs(validation_status);

-- 品質評分索引（用於排序和統計）
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_quality_score
ON public.tryon_jobs(quality_score DESC);

-- 用戶反饋索引
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_user_feedback
ON public.tryon_jobs(user_feedback);

-- 複合索引：用戶 + 驗證狀態（用於用戶查看自己的驗證結果）
CREATE INDEX IF NOT EXISTS idx_tryon_jobs_user_validation
ON public.tryon_jobs(user_id, validation_status);

-- ============================================
-- 3. 驗證日誌表（可選，用於詳細追蹤）
-- ============================================

CREATE TABLE IF NOT EXISTS public.validation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.tryon_jobs(id) ON DELETE CASCADE,

    -- 驗證類型
    validation_type TEXT NOT NULL CHECK (validation_type IN (
        'face_detection',
        'color_analysis',
        'structure_check',
        'overall'
    )),

    -- 驗證結果 (JSONB)
    result JSONB NOT NULL,

    -- 處理時間（毫秒）
    processing_time_ms INTEGER,

    -- 模型版本
    model_version TEXT,

    -- 時間戳
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_validation_logs_job_id
ON public.validation_logs(job_id);

CREATE INDEX IF NOT EXISTS idx_validation_logs_type
ON public.validation_logs(validation_type);

CREATE INDEX IF NOT EXISTS idx_validation_logs_created_at
ON public.validation_logs(created_at DESC);

-- ============================================
-- 4. Row Level Security (RLS) for validation_logs
-- ============================================

ALTER TABLE public.validation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own validation logs" ON public.validation_logs;
CREATE POLICY "Users can view own validation logs"
ON public.validation_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tryon_jobs
        WHERE tryon_jobs.id = validation_logs.job_id
        AND tryon_jobs.user_id = auth.uid()
    )
);

-- Service role 可以插入驗證日誌
DROP POLICY IF EXISTS "Service role can insert validation logs" ON public.validation_logs;
CREATE POLICY "Service role can insert validation logs"
ON public.validation_logs FOR INSERT
WITH CHECK (true);

-- ============================================
-- 5. 輔助函數：獲取品質評級
-- ============================================

CREATE OR REPLACE FUNCTION get_quality_grade(score INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF score IS NULL THEN
        RETURN 'PENDING';
    ELSIF score >= 90 THEN
        RETURN 'EXCELLENT';
    ELSIF score >= 80 THEN
        RETURN 'GOOD';
    ELSIF score >= 70 THEN
        RETURN 'FAIR';
    ELSIF score >= 60 THEN
        RETURN 'POOR';
    ELSE
        RETURN 'FAILED';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 6. 視圖：品質統計
-- ============================================

CREATE OR REPLACE VIEW quality_statistics AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN validation_status = 'passed' THEN 1 END) as passed_count,
    COUNT(CASE WHEN validation_status = 'warning' THEN 1 END) as warning_count,
    COUNT(CASE WHEN validation_status = 'failed' THEN 1 END) as failed_count,
    ROUND(AVG(quality_score), 2) as avg_quality_score,
    COUNT(CASE WHEN user_feedback = 'accepted' THEN 1 END) as accepted_count,
    COUNT(CASE WHEN user_feedback = 'retried' THEN 1 END) as retried_count,
    COUNT(CASE WHEN user_feedback = 'rejected' THEN 1 END) as rejected_count
FROM public.tryon_jobs
WHERE quality_score IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- 7. 註解
-- ============================================

COMMENT ON COLUMN public.tryon_jobs.quality_score IS '品質評分 (0-100)：綜合人物和衣服一致性的總分';
COMMENT ON COLUMN public.tryon_jobs.validation_status IS '驗證狀態：pending=未驗證, passed=通過, warning=警告, failed=失敗';
COMMENT ON COLUMN public.tryon_jobs.person_consistency IS '人物一致性：包含人臉相似度、檢測狀態、關鍵點距離等';
COMMENT ON COLUMN public.tryon_jobs.garment_consistency IS '衣服一致性：包含顏色差異、結構相似度等';
COMMENT ON COLUMN public.tryon_jobs.quality_issues IS '品質問題清單：陣列，每個問題包含類型、嚴重度、描述';
COMMENT ON COLUMN public.tryon_jobs.validation_recommendation IS '系統建議：ACCEPT=接受, REVIEW=審查, RETRY=重試, REJECT=拒絕';
COMMENT ON COLUMN public.tryon_jobs.user_feedback IS '用戶反饋：accepted=接受結果, retried=重新試穿, rejected=拒絕刪除';
COMMENT ON COLUMN public.tryon_jobs.validated_at IS '驗證完成時間';
COMMENT ON COLUMN public.tryon_jobs.feedback_at IS '用戶反饋提交時間';

COMMENT ON TABLE public.validation_logs IS '驗證日誌表：記錄每次品質驗證的詳細過程和結果';
COMMENT ON FUNCTION get_quality_grade(INTEGER) IS '根據評分返回品質等級：EXCELLENT/GOOD/FAIR/POOR/FAILED';
COMMENT ON VIEW quality_statistics IS '品質統計視圖：按日期統計驗證結果和用戶反饋';
