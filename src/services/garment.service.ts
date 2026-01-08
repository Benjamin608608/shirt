import { supabase } from './supabase';
import { GarmentCategory, Garment, CreateGarmentInput } from '../types/garment.types';

export class GarmentService {
  static async getGarments(category?: GarmentCategory): Promise<Garment[]> {
    let query = supabase
      .from('garments')
      .select('*')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  static async createGarment(input: CreateGarmentInput): Promise<Garment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('garments')
      .insert({
        user_id: user.id,
        category: input.category,
        image_key: input.image_key,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data as Garment;
  }

  static async deleteGarment(id: string): Promise<void> {
    const { error } = await supabase
      .from('garments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
