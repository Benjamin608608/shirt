import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../services/supabase';
import { UserPhotoService } from '../services/userPhoto.service';
import { theme } from '../styles/theme';

export default function DiagnosticScreen() {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<any>(null);

  const runDiagnostic = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('diagnostic');

      if (error) throw error;

      setDiagnostic(data);
      Alert.alert('診斷完成', '查看下方結果');
    } catch (error: any) {
      Alert.alert('診斷失敗', error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearOldPhoto = async () => {
    Alert.alert(
      '確認刪除',
      '確定要刪除當前照片嗎？刪除後請立即上傳新照片。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const activePhoto = await UserPhotoService.getActiveUserPhoto();
              if (!activePhoto) {
                Alert.alert('提示', '沒有活躍照片');
                return;
              }

              await UserPhotoService.deleteUserPhoto(activePhoto.id);

              Alert.alert(
                '已刪除',
                '舊照片已刪除。請前往「個人照片」頁面上傳新照片，這次不會強制 3:4 裁剪。',
                [
                  {
                    text: '確定',
                    onPress: () => runDiagnostic(),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('刪除失敗', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>系統診斷</Text>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.button}
          onPress={runDiagnostic}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>🔍 執行診斷</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={clearOldPhoto}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🗑️ 刪除舊照片</Text>
        </TouchableOpacity>
      </View>

      {diagnostic && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>總結</Text>
            <Text style={styles.text}>
              狀態: {diagnostic.summary?.overall_status}
            </Text>
            <Text style={styles.text}>
              錯誤: {diagnostic.summary?.errors}
            </Text>
            <Text style={styles.text}>
              警告: {diagnostic.summary?.warnings}
            </Text>
          </View>

          {diagnostic.checks?.user_photos && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>用戶照片</Text>
              <Text style={styles.text}>
                數量: {diagnostic.checks.user_photos.count}
              </Text>
              {diagnostic.checks.user_photos.photos?.map((p: any) => (
                <View key={p.id} style={styles.item}>
                  <Text style={styles.smallText}>ID: {p.id}</Text>
                  <Text style={styles.smallText}>路徑: {p.image_key}</Text>
                  <Text style={styles.smallText}>
                    創建: {new Date(p.created_at).toLocaleString('zh-TW')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {diagnostic.checks?.duplicates &&
            diagnostic.checks.duplicates.count > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚠️ 重複試穿</Text>
                <Text style={styles.warningText}>
                  發現 {diagnostic.checks.duplicates.count} 組重複的衣服+照片組合
                </Text>
                {diagnostic.checks.duplicates.details?.map((d: any, i: number) => (
                  <View key={i} style={styles.item}>
                    <Text style={styles.smallText}>
                      重複 {d.count} 次
                    </Text>
                    <Text style={styles.smallText}>
                      {d.jobs.map((j: any) => j.job_id).join(', ')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

          <View style={styles.section}>
            <Text style={styles.hint}>
              💡 如果照片是舊的（2026-01-13 之前上傳），建議刪除後重新上傳，新版本不會強制
              3:4 裁剪。
            </Text>
          </View>
        </>
      )}
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
  section: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  dangerButton: {
    backgroundColor: theme.colors.error,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  text: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    marginBottom: theme.spacing.xs,
  },
  smallText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    marginBottom: 2,
  },
  warningText: {
    color: theme.colors.warning,
    fontSize: theme.typography.body.fontSize,
    marginBottom: theme.spacing.sm,
  },
  item: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
  },
  hint: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    fontStyle: 'italic',
  },
});
