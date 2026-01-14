import { useState, useEffect } from 'react';
import { UserPhoto } from '../types/tryon.types';
import { UserPhotoService } from '../services/userPhoto.service';
import { ErrorHandler } from '../utils/errorHandler';

export function useUserPhoto() {
  const [userPhoto, setUserPhoto] = useState<UserPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadUserPhoto = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await UserPhotoService.getActiveUserPhoto();
      setUserPhoto(data);
    } catch (err) {
      const appError = ErrorHandler.handle(err);
      setError(appError.userMessage);
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (uri: string, userId: string) => {
    try {
      setUploading(true);
      setError(null);

      const imageKey = await UserPhotoService.uploadUserPhoto(uri, userId);
      const photo = await UserPhotoService.createUserPhoto({ image_key: imageKey });

      setUserPhoto(photo);
      return photo;
    } catch (err) {
      const appError = ErrorHandler.handle(err);
      setError(appError.userMessage);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string) => {
    try {
      setError(null);
      await UserPhotoService.deleteUserPhoto(photoId);
      setUserPhoto(null);
    } catch (err) {
      const appError = ErrorHandler.handle(err);
      setError(appError.userMessage);
      throw err;
    }
  };

  useEffect(() => {
    loadUserPhoto();
  }, []);

  return {
    userPhoto,
    loading,
    error,
    uploading,
    uploadPhoto,
    deletePhoto,
    refresh: loadUserPhoto,
  };
}
