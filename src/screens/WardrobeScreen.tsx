import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGarments } from '../hooks/useGarments';
import { AuthService } from '../services/auth.service';
import GarmentCard from '../components/GarmentCard';
import { theme } from '../styles/theme';
import { GarmentCategory, CATEGORIES, CATEGORY_LABELS } from '../types/garment.types';

export default function WardrobeScreen() {
  const navigation = useNavigation<any>();
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategory | undefined>();
  const { garments, loading, refresh } = useGarments(selectedCategory);

  const handleLogout = async () => {
    await AuthService.signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.count}>共 {garments.length} 件</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>登出</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        data={[undefined, ...CATEGORIES]}
        keyExtractor={(item) => item || 'all'}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === item && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === item && styles.categoryTextActive,
              ]}
            >
              {item ? CATEGORY_LABELS[item] : '全部'}
            </Text>
          </TouchableOpacity>
        )}
      />

      {garments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>還沒有衣服</Text>
          <Text style={styles.emptyHint}>點擊下方按鈕新增第一件衣服</Text>
        </View>
      ) : (
        <FlatList
          data={garments}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <GarmentCard garment={item} />
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddGarment')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  count: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
  },
  logout: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption.fontSize,
  },
  categoryList: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  categoryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  categoryText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
  },
  categoryTextActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  listContent: {
    padding: theme.spacing.md,
  },
  cardWrapper: {
    flex: 1 / 2,
    paddingHorizontal: theme.spacing.sm,
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
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '300',
  },
});
