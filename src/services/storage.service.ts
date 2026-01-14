import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import { BUCKET_NAME, COMPRESS_QUALITY, MAX_IMAGE_WIDTH } from '../utils/constants';

export class StorageService {
  static async compressImage(uri: string): Promise<string> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_WIDTH } }],
      { compress: COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );

    return result.uri;
  }

  static async uploadImage(uri: string, userId: string): Promise<string> {
    const compressedUri = await this.compressImage(uri);

    const response = await fetch(compressedUri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const timestamp = Date.now();
    const filename = `${timestamp}.jpg`;
    const filePath = `${userId}/${filename}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    return data.path;
  }

  static async getImageUrl(imagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(imagePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  }

  static async deleteImage(imagePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([imagePath]);

    if (error) throw error;
  }

  // 上傳到自定義 bucket
  static async uploadToCustomBucket(
    uri: string,
    userId: string,
    bucketName: string,
    filename: string,
    upsert: boolean = false
  ): Promise<string> {
    const compressedUri = await this.compressImage(uri);

    const response = await fetch(compressedUri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const filePath = `${userId}/${filename}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert,
      });

    if (error) throw error;
    return data.path;
  }

  // 從自定義 bucket 獲取圖片 URL
  static async getImageUrlFromBucket(
    bucketName: string,
    imagePath: string
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(imagePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  }
}
