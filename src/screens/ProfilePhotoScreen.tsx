import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useUserPhoto } from '../hooks/useUserPhoto';
import { StorageService } from '../services/storage.service';
import { UserPhotoService } from '../services/userPhoto.service';
import { ErrorHandler } from '../utils/errorHandler';
import { theme } from '../styles/theme';

const USER_PHOTO_BUCKET = 'user-photos';

export default function ProfilePhotoScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { userPhoto, loading, refresh } = useUserPhoto();
  const [imageUri, setImageUri] = useState<string>('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // 載入現有照片
  useEffect(() => {
    if (userPhoto) {
      StorageService.getImageUrlFromBucket(USER_PHOTO_BUCKET, userPhoto.image_key)
        .then(setCurrentImageUrl)
        .catch((err) => {
          console.error('Failed to load image URL:', err);
        });
    } else {
      setCurrentImageUrl('');
    }
  }, [userPhoto]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要權限', '請允許存取相簿');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      // 移除 aspect 限制，讓用戶自由裁剪，保持原始比例
      quality: 0.9,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const processImageTo3x4 = async (uri: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('無法創建 Canvas'));
          return;
        }

        const targetRatio = 3 / 4;
        const currentRatio = img.width / img.height;

        let targetWidth, targetHeight, offsetX = 0, offsetY = 0;

        if (currentRatio > targetRatio) {
          // 圖片太寬，需要上下加黑邊
          targetWidth = img.width;
          targetHeight = img.width / targetRatio;
          offsetY = (targetHeight - img.height) / 2;
        } else {
          // 圖片太高，需要左右加黑邊
          targetHeight = img.height;
          targetWidth = img.height * targetRatio;
          offsetX = (targetWidth - img.width) / 2;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 填充黑色背景
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // 繪製原圖到中心
        ctx.drawImage(img, offsetX, offsetY, img.width, img.height);

        // 轉換為 Data URL
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => reject(new Error('圖片載入失敗'));
      img.src = uri;
    });
  };

  const handleUpload = async () => {
    if (!imageUri || !user) return;

    try {
      setUploading(true);

      // 處理圖片為 3:4 比例（添加黑邊而非壓縮）
      const processedUri = await processImageTo3x4(imageUri);

      // 上傳到 Storage（覆蓋現有照片）
      const imageKey = await StorageService.uploadToCustomBucket(
        processedUri,
        user.id,
        USER_PHOTO_BUCKET,
        'profile.jpg',
        true // upsert: 覆蓋現有照片
      );

      // 創建資料庫記錄
      await UserPhotoService.createUserPhoto({ image_key: imageKey });

      Alert.alert('成功', '照片已上傳（已自動調整為 3:4 比例）');
      setImageUri('');
      refresh();
    } catch (error) {
      console.error('Upload error:', error);
      const appError = ErrorHandler.handle(error);
      Alert.alert('上傳失敗', appError.userMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!userPhoto) return;

    Alert.alert(
      '確認刪除',
      '確定要刪除這張照片嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserPhotoService.deleteUserPhoto(userPhoto.id);
              setCurrentImageUrl('');
              Alert.alert('成功', '照片已刪除');
              refresh();
            } catch (error) {
              Alert.alert('刪除失敗', '請重試');
            }
          },
        },
      ]
    );
  };

  // 顯示的圖片：優先顯示新選擇的，其次是現有的
  const displayImageUri = imageUri || currentImageUrl;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>個人照片</Text>
      <Text style={styles.subtitle}>
        上傳一張全身照，用於虛擬試穿功能
      </Text>

      {/* 照片預覽區 */}
      <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
        {displayImageUri ? (
          <Image source={{ uri: displayImageUri }} style={styles.photo} />
        ) : (
          <View style={styles.placeholder}>
            {loading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <>
                <Text style={styles.placeholderIcon}>📷</Text>
                <Text style={styles.placeholderText}>點擊選擇照片</Text>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* 新選擇照片後顯示上傳按鈕 */}
      {imageUri && (
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <Text style={styles.uploadButtonText}>上傳照片</Text>
          )}
        </TouchableOpacity>
      )}

      {/* 已有照片時顯示操作按鈕 */}
      {userPhoto && !imageUri && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={pickImage}
            disabled={uploading}
          >
            <Text style={styles.buttonText}>更換照片</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleDelete}
            disabled={uploading}
          >
            <Text style={styles.buttonText}>刪除照片</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 拍攝建議 */}
      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>拍攝建議：</Text>
        <Text style={styles.tipText}>• 使用全身照效果最佳</Text>
        <Text style={styles.tipText}>• 站立姿勢，面向鏡頭</Text>
        <Text style={styles.tipText}>• 背景簡潔，光線充足</Text>
        <Text style={styles.tipText}>• 穿著貼身衣物</Text>
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
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  placeholderText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  button: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: theme.colors.primary,
  },
  buttonDanger: {
    backgroundColor: theme.colors.error,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  tips: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  tipsTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  tipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    marginBottom: theme.spacing.xs,
  },
});
