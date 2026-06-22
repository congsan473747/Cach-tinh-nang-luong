import { UserInfo, NutritionalTargets } from "./types";

/**
 * Tính toán mục tiêu dinh dưỡng cá nhân hóa dựa trên chỉ số cơ thể
 */
export function calculateNutritionalTargets(info: UserInfo): NutritionalTargets {
  const { weight, height, age, gender, activityLevel, kidneyHealth, goal } = info;

  // 1. Tính chỉ số trao đổi cơ bản BMR (Mifflin-St Jeor)
  let bmr = 0;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // 2. Tính TDEE theo mức độ hoạt động thể chất
  let multiplier = 1.2;
  switch (activityLevel) {
    case 'sedentary': multiplier = 1.2; break; // Ít vận động
    case 'light': multiplier = 1.375; break; // Vận động nhẹ (1-3 ngày/tuần)
    case 'moderate': multiplier = 1.55; break; // Vận động vừa (3-5 ngày/tuần)
    case 'active': multiplier = 1.725; break; // Vận động nhiều (6-7 ngày/tuần)
    case 'extreme': multiplier = 1.9; break; // Vận động nặng/Vận động viên
  }
  const tdee = bmr * multiplier;

  // 3. Điều chỉnh lượng Calo tiêu hao dựa trên Mục tiêu
  let targetCalories = tdee;
  if (goal === 'lose_weight') {
    targetCalories = tdee - 500;
    // Đảm bảo ngưỡng calo tối thiểu an toàn để tránh suy dinh dưỡng cơ thể
    const minCal = gender === 'male' ? 1500 : 1200;
    if (targetCalories < minCal) targetCalories = minCal;
  } else if (goal === 'gain_weight') {
    targetCalories = tdee + 400;
  }

  targetCalories = Math.round(targetCalories);

  // 4. Phân phối các chất dinh dưỡng đa lượng (Macronutrients) theo tỷ lệ vàng khuyến nghị
  // Protein: Khoảng 22% tổng năng lượng (1g Protein = 4 kcal)
  // Fat: Khoảng 25% tổng năng lượng (1g Fat = 9 kcal)
  // Carbs: Phần calo còn lại (khoảng 53%) (1g Carbs = 4 kcal)
  const proteinKcal = targetCalories * 0.22;
  const fatKcal = targetCalories * 0.25;
  const carbsKcal = targetCalories - (proteinKcal + fatKcal);

  const targetProtein = Math.round(proteinKcal / 4);
  const targetFat = Math.round(fatKcal / 9);
  const targetCarbs = Math.round(carbsKcal / 4);

  // 5. Tính toán chỉ tiêu Kali (Potassium) - Cực kỳ quan trọng
  // Cho người bình thường: Khoảng 3500 - 4700mg. Đặt trung vị là 3800mg tăng cường huyết áp/tim mạch lành mạnh.
  // Cho người bị thận yếu hoặc có mục tiêu hỗ trợ bảo vệ thận: Phải bóp xuống dưới 2000mg để phòng ngừa tăng kali máu nguy hiểm.
  let targetPotassium = 3800; // mg
  if (kidneyHealth === 'kidney_disease' || goal === 'kidney_care') {
    targetPotassium = 2000; // Ngưỡng trần tối đa cho phép
  } else if (goal === 'heart_health') {
    targetPotassium = 4500; // Tăng dồi dào kali hỗ trợ huyết áp của tim
  }

  return {
    calories: targetCalories,
    potassium: targetPotassium,
    protein: targetProtein,
    fat: targetFat,
    carbs: targetCarbs
  };
}

/**
 * Các cụm nhãn hiển thị tiếng Việt súc tích
 */
export const TRANSLATIONS = {
  gender: {
    male: 'Nam',
    female: 'Nữ'
  },
  activity: {
    sedentary: 'Ít vận động (Nhập phòng, văn phòng)',
    light: 'Vận động nhẹ (Luyện tập 1-3 lần/tuần)',
    moderate: 'Vận động vừa (Thể thao 3-5 lần/tuần)',
    active: 'Vận động cường độ cao (Luyện tập 6-7 lần/tuần)',
    extreme: 'Vận động cực nhiều (Vận động viên thi đấu)'
  },
  kidney: {
    normal: 'Bình thường (Khoẻ mạnh)',
    kidney_disease: 'Có bệnh nền lý Thận (Cần kiểm soát Kali nghiêm ngặt!)'
  },
  goal: {
    lose_weight: 'Giảm cân lành mạnh',
    maintain: 'Giữ cân ổn định',
    gain_weight: 'Tăng cân khoa học',
    heart_health: 'Tim mạch dồi dào (Khuyến nghị Kali cao)',
    kidney_care: 'Chăm sóc hệ Thận (Giới hạn Kali thấp < 2000mg)'
  },
  mealType: {
    breakfast: 'Bữa sáng',
    lunch: 'Bữa trưa',
    dinner: 'Bữa tối',
    snack: 'Ăn phụ/Snack'
  }
};
