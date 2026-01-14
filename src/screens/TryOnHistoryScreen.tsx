import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTryOn } from '../hooks/useTryOn';
import { TryOnService } from '../services/tryon.service';
import { theme } from '../styles/theme';
import { TryOnJob } from '../types/tryon.types';

export default function TryOnHistoryScreen() {
  const navigation = useNavigation<any>();
  const { jobs, loading, refresh } = useTryOn();

  const renderJob = ({ item }: { item: TryOnJob }) => {
    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => handleJobPress(item)}
      >
        <JobStatusBadge status={item.status} />

        {item.result_image_key && (
          <ResultImage imageKey={item.result_image_key} />
        )}

        <View style={styles.jobInfo}>
          <Text style={styles.jobDate}>
            {formatDate(item.created_at)}
          </Text>
          {item.status === 'completed' && (
            <Text style={styles.jobAction}>點擊查看</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleJobPress = async (job: TryOnJob) => {
    if (job.status === 'completed' && job.result_image_key) {
      const resultUrl = await TryOnService.getResultImageUrl(
        job.result_image_key
      );
      navigation.navigate('TryOnResult', { job, resultUrl });
    }
  };

  return (
    <View style={styles.container}>
      {jobs.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>還沒有試穿記錄</Text>
          <Text style={styles.emptyHint}>前往衣櫃開始虛擬試穿</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'completed':
        return styles.badgeSuccess;
      case 'processing':
      case 'pending':
        return styles.badgeProcessing;
      case 'failed':
        return styles.badgeError;
      default:
        return styles.badgeDefault;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'processing':
        return '處理中';
      case 'pending':
        return '等待中';
      case 'failed':
        return '失敗';
      default:
        return status;
    }
  };

  return (
    <View style={[styles.badge, getBadgeStyle()]}>
      <Text style={styles.badgeText}>{getStatusText()}</Text>
    </View>
  );
}

function ResultImage({ imageKey }: { imageKey: string }) {
  const [imageUrl, setImageUrl] = React.useState('');

  React.useEffect(() => {
    TryOnService.getResultImageUrl(imageKey)
      .then(setImageUrl)
      .catch(console.error);
  }, [imageKey]);

  if (!imageUrl) return null;

  return <Image source={{ uri: imageUrl }} style={styles.resultPreview} />;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffMins < 1440) return `${Math.round(diffMins / 60)} 小時前`;
  return date.toLocaleDateString('zh-TW');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  jobCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  badgeSuccess: {
    backgroundColor: theme.colors.success,
  },
  badgeProcessing: {
    backgroundColor: theme.colors.warning,
  },
  badgeError: {
    backgroundColor: theme.colors.error,
  },
  badgeDefault: {
    backgroundColor: theme.colors.textDisabled,
  },
  badgeText: {
    color: theme.colors.text,
    fontSize: theme.typography.small.fontSize,
    fontWeight: '600',
  },
  resultPreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  jobInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobDate: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
  },
  jobAction: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption.fontSize,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.h3.fontSize,
    marginBottom: theme.spacing.sm,
  },
  emptyHint: {
    color: theme.colors.textDisabled,
    fontSize: theme.typography.caption.fontSize,
  },
});
