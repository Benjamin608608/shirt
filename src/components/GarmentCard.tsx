import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Garment, CATEGORY_LABELS } from '../types/garment.types';
import { StorageService } from '../services/storage.service';
import { theme } from '../styles/theme';

interface Props {
  garment: Garment;
  onPress?: () => void;
}

export default function GarmentCard({ garment, onPress }: Props) {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    StorageService.getImageUrl(garment.image_key)
      .then(setImageUrl)
      .catch(console.error);
  }, [garment.image_key]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={styles.category}>
        {CATEGORY_LABELS[garment.category as keyof typeof CATEGORY_LABELS]}
      </Text>
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
  category: {
    padding: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
  },
});
