export type GarmentCategory =
  | 'shirt'
  | 'pants'
  | 'coat'
  | 'dress'
  | 'shoes'
  | 'accessories'
  | 'other';

export interface Garment {
  id: string;
  user_id: string;
  category: GarmentCategory;
  image_key: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGarmentInput {
  category: GarmentCategory;
  image_key: string;
}

export const CATEGORY_LABELS: Record<GarmentCategory, string> = {
  shirt: '上衣',
  pants: '褲子',
  coat: '外套',
  dress: '洋裝',
  shoes: '鞋子',
  accessories: '配件',
  other: '其他',
};

export const CATEGORIES: GarmentCategory[] = [
  'shirt',
  'pants',
  'coat',
  'dress',
  'shoes',
  'accessories',
  'other',
];
