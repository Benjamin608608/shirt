import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { GarmentService } from '../services/garment.service';
import { StorageService } from '../services/storage.service';
import { useAuth } from '../hooks/useAuth';
import { ErrorHandler } from '../utils/errorHandler';
import { theme } from '../styles/theme';
import { GarmentCategory, CATEGORIES, CATEGORY_LABELS } from '../types/garment.types';

export default function AddGarmentScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState<string>('');
  const [category, setCategory] = useState<GarmentCategory>('shirt');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('需要權限', '請允許存取相簿');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!imageUri || !user) return;

    try {
      setUploading(true);

      const imageKey = await StorageService.uploadImage(imageUri, user.id);

      await GarmentService.createGarment({
        category,
        image_key: imageKey,
      });

      Alert.alert('成功', '衣服已新增');
      navigation.goBack();
    } catch (error) {
      const appError = ErrorHandler.handle(error);
      Alert.alert('上傳失敗', appError.userMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>點擊選擇照片</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>選擇分類</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryOption,
              category === cat && styles.categoryOptionActive,
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text
              style={[
                styles.categoryOptionText,
                category === cat && styles.categoryOptionTextActive,
              ]}
            >
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.uploadButton, (!imageUri || uploading) && styles.uploadButtonDisabled]}
        onPress={handleUpload}
        disabled={!imageUri || uploading}
      >
        {uploading ? (
          <ActivityIndicator color={theme.colors.text} />
        ) : (
          <Text style={styles.uploadButtonText}>上傳</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  imagePickerButton: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  preview: {
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
  placeholderText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    marginBottom: theme.spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.xl,
  },
  categoryOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    margin: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  categoryOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryOptionText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
  },
  categoryOptionTextActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
});
