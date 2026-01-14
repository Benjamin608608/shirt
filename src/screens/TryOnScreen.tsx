import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useUserPhoto } from '../hooks/useUserPhoto';
import { useTryOn, useTryOnJob } from '../hooks/useTryOn';
import { UserPhotoService } from '../services/userPhoto.service';
import { StorageService } from '../services/storage.service';
import { TryOnService } from '../services/tryon.service';
import { theme } from '../styles/theme';
import { Garment } from '../types/garment.types';

interface RouteParams {
  garment: Garment;
}

export default function TryOnScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { garment } = route.params as RouteParams;

  const { userPhoto } = useUserPhoto();
  const { creating, createJob } = useTryOn();

  const [garmentImageUrl, setGarmentImageUrl] = useState('');
  const [userPhotoUrl, setUserPhotoUrl] = useState('');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // 監控當前任務
  const { job: currentJob, loading: jobLoading } = useTryOnJob(currentJobId || '');

  useEffect(() => {
    // 載入衣服圖片
    StorageService.getImageUrl(garment.image_key)
      .then(setGarmentImageUrl)
      .catch(console.error);

    // 載入用戶照片
    if (userPhoto) {
      UserPhotoService.getImageUrl(userPhoto.image_key)
        .then(setUserPhotoUrl)
        .catch(console.error);
    }
  }, [garment, userPhoto]);

  const handleStartTryOn = async () => {
    if (!userPhoto) {
      Alert.alert(
        '需要個人照片',
        '請先上傳您的照片',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '前往上傳',
            onPress: () => navigation.navigate('ProfilePhoto'),
          },
        ]
      );
      return;
    }

    try {
      console.log('[TryOnScreen] 開始創建試穿任務');
      console.log('[TryOnScreen] 衣服 ID:', garment.id);
      console.log('[TryOnScreen] 用戶照片 ID:', userPhoto.id);

      const job = await createJob({
        garment_id: garment.id,
        user_photo_id: userPhoto.id,
      });

      console.log('[TryOnScreen] 任務創建成功，job_id:', job.id);
      setCurrentJobId(job.id);
      Alert.alert('開始處理', '虛擬試穿正在處理中，預計需要 1-2 分鐘');
    } catch (error: any) {
      console.error('[TryOnScreen] 錯誤詳情:', error);

      // 檢查是否是每日限制錯誤
      if (error?.message?.includes('Daily try-on limit reached')) {
        Alert.alert('達到每日限制', '您今天已經使用了 10 次虛擬試穿功能，請明天再試');
      } else {
        const errorMessage = error?.message || error?.toString() || '未知錯誤';
        console.error('[TryOnScreen] 錯誤訊息:', errorMessage);
        Alert.alert(
          '處理失敗',
          `錯誤訊息: ${errorMessage}\n\n請檢查:\n1. Edge Function 是否已部署\n2. Replicate API Token 是否已設定\n3. 查看控制台日誌以獲取更多資訊`
        );
      }
    }
  };

  const handleViewResult = async () => {
    if (currentJob?.result_image_key) {
      const resultUrl = await TryOnService.getResultImageUrl(
        currentJob.result_image_key
      );
      navigation.navigate('TryOnResult', {
        job: currentJob,
        resultUrl,
      });
    }
  };

  const renderStatus = () => {
    if (!currentJob) return null;

    switch (currentJob.status) {
      case 'pending':
      case 'processing':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.statusText}>處理中...</Text>
            <Text style={styles.statusHint}>這可能需要 1-2 分鐘</Text>
          </View>
        );

      case 'completed':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusSuccess}>✓ 完成！</Text>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={handleViewResult}
            >
              <Text style={styles.viewButtonText}>查看結果</Text>
            </TouchableOpacity>
          </View>
        );

      case 'failed':
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusError}>處理失敗</Text>
            <Text style={styles.statusHint}>
              {currentJob.error_message || '請重試'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleStartTryOn}
            >
              <Text style={styles.retryButtonText}>重試</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>虛擬試穿</Text>

      <View style={styles.previewContainer}>
        <View style={styles.previewItem}>
          <Text style={styles.previewLabel}>您的照片</Text>
          {userPhotoUrl ? (
            <Image source={{ uri: userPhotoUrl }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.previewPlaceholderText}>未上傳</Text>
            </View>
          )}
        </View>

        <Text style={styles.plusIcon}>+</Text>

        <View style={styles.previewItem}>
          <Text style={styles.previewLabel}>選擇的衣服</Text>
          <Image source={{ uri: garmentImageUrl }} style={styles.previewImage} />
        </View>
      </View>

      {renderStatus()}

      {!currentJob && (
        <TouchableOpacity
          style={[
            styles.startButton,
            (creating || !userPhoto) && styles.startButtonDisabled,
          ]}
          onPress={handleStartTryOn}
          disabled={creating || !userPhoto}
        >
          {creating ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <Text style={styles.startButtonText}>開始虛擬試穿</Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.info}>
        <Text style={styles.infoTitle}>說明：</Text>
        <Text style={styles.infoText}>
          • AI 將根據您的照片和選擇的衣服生成試穿效果
        </Text>
        <Text style={styles.infoText}>
          • 處理時間約 1-2 分鐘
        </Text>
        <Text style={styles.infoText}>
          • 效果僅供參考，實際穿著可能有差異
        </Text>
        <Text style={styles.infoText}>
          • 每日限制 10 次試穿
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  previewItem: {
    flex: 1,
    alignItems: 'center',
  },
  previewLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    marginBottom: theme.spacing.sm,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.md,
  },
  previewPlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlaceholderText: {
    color: theme.colors.textDisabled,
  },
  plusIcon: {
    fontSize: 32,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.md,
  },
  statusContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  statusText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    marginTop: theme.spacing.md,
  },
  statusHint: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    marginTop: theme.spacing.sm,
  },
  statusSuccess: {
    color: theme.colors.success,
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  statusError: {
    color: theme.colors.error,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  viewButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  viewButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  retryButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  info: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  infoTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    marginBottom: theme.spacing.xs,
  },
});
