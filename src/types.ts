export interface UserInfo {
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'extreme';
  kidneyHealth: 'normal' | 'kidney_disease'; // Cực kỳ quan trọng để đánh giá giới hạn Kali
  goal: 'lose_weight' | 'maintain' | 'gain_weight' | 'heart_health' | 'kidney_care';
}

export interface NutritionalTargets {
  calories: number; // kcal
  potassium: number; // mg
  protein: number; // g
  fat: number; // g
  carbs: number; // g
}

export interface FoodItem {
  id: string;
  name: string;
  type: 'plant' | 'animal';
  category: string;
  calories: number; // kcal per 100g
  potassium: number; // mg per 100g
  protein: number; // g per 100g
  fat: number; // g per 100g
  carbs: number; // g per 100g
  servingSizeInfo: string; // ví dụ: "100g", "1 quả chuối"
  description?: string;
}

export interface MealLogItem {
  id: string;
  foodId: string;
  name: string;
  type: 'plant' | 'animal';
  calories: number; // calculated based on weight
  potassium: number; // calculated based on weight
  protein: number; // calculated based on weight
  fat: number; // calculated based on weight
  carbs: number; // calculated based on weight
  amountGrams: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  timestamp: string; // ISO 8601 string
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}
