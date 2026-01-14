import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Garment, CATEGORY_LABELS } from '../types/garment.types';
import { StorageService } from '../services/storage.service';
import { theme } from '../styles/theme';

interface Props {
  garment: Garment;
  onPress?: () => void;
  onTryOn?: (garment: Garment) => void;
}

export default function GarmentCard({ garment, onPress, onTryOn }: Props) {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    StorageService.getImageUrl(garment.image_key)
      .then(setImageUrl)
      .catch(console.error);
  }, [garment.image_key]);

  const handleTryOn = (e: any) => {
    e.stopPropagation();
    onTryOn?.(garment);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.placeholder} />
      )}
      <View style={styles.footer}>
        <Text style={styles.category}>
          {CATEGORY_LABELS[garment.category as keyof typeof CATEGORY_LABELS]}
        </Text>
        {onTryOn && (
          <TouchableOpacity style={styles.tryOnButton} onPress={handleTryOn}>
            <Text style={styles.tryOnButtonText}>試穿</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: theme.colors.surfaceHover,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  category: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    flex: 1,
  },
  tryOnButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  tryOnButtonText: {
    color: theme.colors.text,
    fontSize: theme.typography.small.fontSize,
    fontWeight: '600',
  },
});
