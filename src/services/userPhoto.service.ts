import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import { UserPhoto, CreateUserPhotoInput } from '../types/tryon.types';

const USER_PHOTO_BUCKET = 'user-photos';
const COMPRESS_QUALITY = 0.9;
const MAX_IMAGE_WIDTH = 1024;

export class UserPhotoService {
  // 壓縮圖片（適合全身照）
  static async compressImage(uri: string): Promise<string> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_WIDTH } }],
      { compress: COMPRESS_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  }

  // 上傳用戶照片
  static async uploadUserPhoto(uri: string, userId: string): Promise<string> {
    console.log('[UserPhotoService] Starting upload...');
    console.log('[UserPhotoService] URI:', uri);
    console.log('[UserPhotoService] User ID:', userId);

    const compressedUri = await this.compressImage(uri);
    console.log('[UserPhotoService] Image compressed:', compressedUri);

    const response = await fetch(compressedUri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    console.log('[UserPhotoService] Image size:', arrayBuffer.byteLength, 'bytes');

    const filename = 'profile.jpg';
    const filePath = `${userId}/${filename}`;
    console.log('[UserPhotoService] Upload path:', filePath);

    const { data, error } = await supabase.storage
      .from(USER_PHOTO_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true, // 覆蓋現有照片
      });

    if (error) {
      console.error('[UserPhotoService] Upload error:', error);
      throw new Error(`Storage 上傳失敗: ${error.message}`);
    }

    console.log('[UserPhotoService] Upload successful:', data.path);
    return data.path;
  }

  // 創建用戶照片記錄
  static async createUserPhoto(input: CreateUserPhotoInput): Promise<UserPhoto> {
    console.log('[UserPhotoService] Creating user photo record...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('[UserPhotoService] User ID:', user.id);
    console.log('[UserPhotoService] Image key:', input.image_key);

    // 先停用舊照片
    console.log('[UserPhotoService] Deactivating old photos...');
    await (supabase
      .from('user_photos') as any)
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // 創建新照片記錄
    console.log('[UserPhotoService] Inserting new photo record...');
    const { data, error } = await supabase
      .from('user_photos')
      .insert({
        user_id: user.id,
        image_key: input.image_key,
        is_active: true,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('[UserPhotoService] Database insert error:', error);
      throw new Error(`數據庫錯誤: ${error.message}`);
    }

    console.log('[UserPhotoService] Photo record created:', data);
    return data as UserPhoto;
  }

  // 獲取活躍的用戶照片
  static async getActiveUserPhoto(): Promise<UserPhoto | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_photos')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data as UserPhoto | null;
  }

  // 獲取圖片 URL
  static async getImageUrl(imagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(USER_PHOTO_BUCKET)
      .createSignedUrl(imagePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  }

  // 刪除用戶照片
  static async deleteUserPhoto(photoId: string): Promise<void> {
    const { data: photo } = await supabase
      .from('user_photos')
      .select('image_key')
      .eq('id', photoId)
      .single() as { data: { image_key: string } | null; error: any };

    if (photo?.image_key) {
      await supabase.storage
        .from(USER_PHOTO_BUCKET)
        .remove([photo.image_key]);
    }

    const { error } = await supabase
      .from('user_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;
  }
}
