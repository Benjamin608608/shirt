import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTryOn } from '../hooks/useTryOn';
import { theme } from '../styles/theme';
import { TryOnJob } from '../types/tryon.types';
import { QualityReport, QualityIssue } from '../types/quality.types';
import { QualityValidationService } from '../services/qualityValidation.service';
import { TryOnService } from '../services/tryon.service';
import { UserPhotoService } from '../services/userPhoto.service';
import { StorageService } from '../services/storage.service';
import { supabase } from '../services/supabase';

interface RouteParams {
  job: TryOnJob;
  resultUrl: string;
}

export default function TryOnResultScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { job, resultUrl } = route.params as RouteParams;
  const { deleteJob } = useTryOn();

  const [qualityReport, setQualityReport] = useState<QualityReport | null>(
    null
  );
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{width: number, height: number} | null>(null);

  // 自動觸發品質驗證
  useEffect(() => {
    if (job && job.status === 'completed' && job.result_image_key) {
      performQualityValidation();
    }
  }, [job]);

  const performQualityValidation = async () => {
    try {
      setValidating(true);
      setValidationError(null);

      console.log('[TryOnResult] Starting quality validation...');

      // 獲取所有必要的圖片URLs
      const resultImageUrl = resultUrl;
      const userPhotoUrl = await UserPhotoService.getImageUrl(
        job.user_photo!.image_key
      );
      const garmentImageUrl = await StorageService.getImageUrl(
        job.garment!.image_key
      );

      // 執行驗證
      const report = await QualityValidationService.validateResult(
        job.id,
        userPhotoUrl,
        garmentImageUrl,
        resultImageUrl,
        job.garment!.category
      );

      setQualityReport(report);
      console.log('[TryOnResult] Validation completed:', report);
    } catch (error) {
      console.error('[TryOnResult] Validation error:', error);
      setValidationError('品質分析失敗，但您仍可查看結果');
    } finally {
      setValidating(false);
    }
  };

  const handleAccept = async () => {
    try {
      await supabase
        .from('tryon_jobs')
        .update({
          user_feedback: 'accepted',
          feedback_at: new Date().toISOString(),
        } as any)
        .eq('id', job.id);

      Alert.alert('已保存', '結果已保存到您的試穿歷史', [
        { text: '確定', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('[TryOnResult] Save feedback error:', error);
      Alert.alert('保存失敗', '請重試');
    }
  };

  const handleRetry = async () => {
    try {
      await supabase
        .from('tryon_jobs')
        .update({
          user_feedback: 'retried',
          feedback_at: new Date().toISOString(),
        } as any)
        .eq('id', job.id);

      Alert.alert('重新試穿', '即將返回試穿頁面', [
        {
          text: '確定',
          onPress: () => {
            navigation.navigate('TryOn' as never, { garment: job.garment } as never);
          },
        },
      ]);
    } catch (error) {
      console.error('[TryOnResult] Retry feedback error:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `看看我的虛擬試穿效果！品質評分：${qualityReport?.overallScore || '未評分'}/100`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = () => {
    Alert.alert('確認刪除', '確定要刪除這個試穿記錄嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteJob(job.id);
            Alert.alert('已刪除', '', [
              { text: '確定', onPress: () => navigation.goBack() },
            ]);
          } catch (error) {
            Alert.alert('刪除失敗', '請重試');
          }
        },
      },
    ]);
  };

  const calculateProcessTime = (job: TryOnJob): string => {
    if (!job.completed_at) return '未知';

    const start = new Date(job.created_at).getTime();
    const end = new Date(job.completed_at).getTime();
    const seconds = Math.round((end - start) / 1000);

    if (seconds < 60) return `${seconds} 秒`;
    return `${Math.round(seconds / 60)} 分鐘`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* 結果圖片 */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: resultUrl }}
          style={[
            styles.resultImage,
            imageSize && { aspectRatio: imageSize.width / imageSize.height }
          ]}
          resizeMode="contain"
          onLoad={(e) => {
            const { width, height } = e.nativeEvent.source;
            setImageSize({ width, height });
            console.log('🖼️ 結果圖片實際尺寸:', width, 'x', height);
            console.log('🖼️ 長寬比:', (width / height).toFixed(2));
          }}
        />
        {imageSize && (
          <View style={styles.imageSizeInfo}>
            <Text style={styles.imageSizeText}>
              圖片尺寸: {imageSize.width} × {imageSize.height}
            </Text>
            <Text style={styles.imageSizeText}>
              比例: {(imageSize.width / imageSize.height).toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* 品質評分卡片 */}
      {renderQualityCard()}

      {/* 操作按鈕 */}
      {renderActions()}

      {/* 基本信息 */}
      <View style={styles.info}>
        <Text style={styles.infoText}>
          處理時間：{calculateProcessTime(job)}
        </Text>
        <Text style={styles.infoText}>
          創建時間：{formatDate(job.created_at)}
        </Text>
      </View>

      {/* 免責聲明 */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          * 此為 AI 生成的虛擬試穿效果，僅供參考。實際穿著效果可能因體型、光線等因素有所差異。
        </Text>
      </View>
    </ScrollView>
  );

  // ========================================
  // 渲染品質評分卡片
  // ========================================
  function renderQualityCard() {
    if (validating) {
      return (
        <View style={styles.qualityCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.validatingText}>正在分析品質...</Text>
          <Text style={styles.validatingSubtext}>
            檢查人物一致性和衣服保真度
          </Text>
        </View>
      );
    }

    if (validationError) {
      return (
        <View style={styles.qualityCard}>
          <Text style={styles.errorText}>⚠️ {validationError}</Text>
          <TouchableOpacity
            style={styles.retryValidationButton}
            onPress={performQualityValidation}
          >
            <Text style={styles.retryValidationButtonText}>重新分析</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!qualityReport) return null;

    const scoreColor = QualityValidationService.getScoreColor(
      qualityReport.overallScore
    );
    const grade = QualityValidationService.getQualityGrade(
      qualityReport.overallScore
    );

    return (
      <View style={styles.qualityCard}>
        {/* 總分顯示 */}
        <View style={styles.scoreSection}>
          <Text style={styles.scoreLabel}>品質評分</Text>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>
              {qualityReport.overallScore}
            </Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <Text style={[styles.gradeText, { color: scoreColor }]}>
            {getGradeLabel(grade)}
          </Text>
        </View>

        {/* 用戶消息 */}
        <Text style={styles.userMessage}>{qualityReport.userMessage}</Text>

        {/* 詳細評分 */}
        <View style={styles.detailScores}>
          <ScoreBar
            label="人物一致性"
            score={Math.round(
              qualityReport.personConsistency.faceSimilarity * 100
            )}
            color={theme.colors.primary}
          />
          <ScoreBar
            label="衣服保真度"
            score={qualityReport.garmentConsistency.colorAccuracy}
            color={theme.colors.success}
          />
        </View>

        {/* 問題列表 */}
        {qualityReport.issues.length > 0 && (
          <View style={styles.issuesSection}>
            <Text style={styles.issuesTitle}>檢測到的問題</Text>
            {qualityReport.issues.map((issue, idx) => (
              <IssueItem key={idx} issue={issue} />
            ))}
          </View>
        )}
      </View>
    );
  }

  // ========================================
  // 渲染操作按鈕
  // ========================================
  function renderActions() {
    if (!qualityReport) {
      // 未驗證時顯示默認按鈕
      return (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Text style={styles.actionButtonText}>分享</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={styles.actionButtonText}>刪除</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 根據建議顯示不同按鈕
    const { recommendation } = qualityReport;

    if (recommendation === 'ACCEPT' || recommendation === 'REVIEW') {
      return (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
          >
            <Text style={styles.actionButtonText}>✓ 接受結果</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.retryButton]}
            onPress={handleRetry}
          >
            <Text style={styles.actionButtonText}>🔄 重新試穿</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={styles.actionButtonText}>🗑️ 刪除</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      // RETRY 或 REJECT
      return (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retryButton]}
            onPress={handleRetry}
          >
            <Text style={styles.actionButtonText}>🔄 重新試穿</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={styles.actionButtonText}>🗑️ 刪除</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  // ========================================
  // 輔助函數
  // ========================================
  function getGradeLabel(grade: string): string {
    const labels: { [key: string]: string } = {
      EXCELLENT: '完美',
      GOOD: '優秀',
      FAIR: '良好',
      POOR: '一般',
      FAILED: '較差',
      PENDING: '未評分',
    };
    return labels[grade] || grade;
  }
}

// ========================================
// 子組件：評分條
// ========================================
function ScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text style={[styles.scoreBarValue, { color }]}>{score}%</Text>
      </View>
      <View style={styles.scoreBarTrack}>
        <View
          style={[
            styles.scoreBarFill,
            { width: `${score}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

// ========================================
// 子組件：問題項目
// ========================================
function IssueItem({ issue }: { issue: QualityIssue }) {
  const severityColors = {
    LOW: '#3b82f6',
    MEDIUM: '#f59e0b',
    HIGH: '#ef4444',
  };

  const severityLabels = {
    LOW: '輕微',
    MEDIUM: '中等',
    HIGH: '嚴重',
  };

  return (
    <View style={styles.issueItem}>
      <Text style={styles.issueIcon}>
        {QualityValidationService.getSeverityIcon(issue.severity)}
      </Text>
      <View style={styles.issueContent}>
        <View style={styles.issueHeader}>
          <Text
            style={[
              styles.issueSeverity,
              { color: severityColors[issue.severity] },
            ]}
          >
            {severityLabels[issue.severity]}
          </Text>
        </View>
        <Text style={styles.issueDescription}>{issue.description}</Text>
      </View>
    </View>
  );
}

// ========================================
// 樣式
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  imageContainer: {
    width: '100%',
    minHeight: 400,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultImage: {
    width: '100%',
    aspectRatio: 1, // 預設 1:1，會被 onLoad 動態更新
  },
  imageSizeInfo: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
  },
  imageSizeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },

  // 品質卡片
  qualityCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  validatingText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontWeight: '600',
  },
  validatingSubtext: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
  },
  retryValidationButton: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  retryValidationButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },

  // 評分區域
  scoreSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  scoreLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    marginBottom: theme.spacing.sm,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreMax: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
  },
  gradeText: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: 'bold',
  },

  // 用戶消息
  userMessage: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },

  // 詳細評分
  detailScores: {
    marginBottom: theme.spacing.lg,
  },
  scoreBarContainer: {
    marginBottom: theme.spacing.md,
  },
  scoreBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  scoreBarLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
  },
  scoreBarValue: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: 'bold',
  },
  scoreBarTrack: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // 問題區域
  issuesSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background,
  },
  issuesTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  issueItem: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  issueIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  issueContent: {
    flex: 1,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  issueSeverity: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: 'bold',
  },
  issueDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
  },

  // 操作按鈕
  actions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: theme.colors.success,
  },
  retryButton: {
    backgroundColor: theme.colors.warning,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  actionButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },

  // 基本信息
  info: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    marginBottom: theme.spacing.xs,
  },

  // 免責聲明
  disclaimer: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  disclaimerText: {
    color: theme.colors.textDisabled,
    fontSize: theme.typography.small.fontSize,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
