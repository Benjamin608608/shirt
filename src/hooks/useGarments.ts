import { useState, useEffect } from 'react';
import { Garment, GarmentCategory } from '../types/garment.types';
import { GarmentService } from '../services/garment.service';
import { ErrorHandler } from '../utils/errorHandler';

export function useGarments(category?: GarmentCategory) {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGarments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await GarmentService.getGarments(category);
      setGarments(data);
    } catch (err) {
      const appError = ErrorHandler.handle(err);
      setError(appError.userMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGarments();
  }, [category]);

  return {
    garments,
    loading,
    error,
    refresh: loadGarments,
  };
}
