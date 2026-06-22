import { useState, useEffect, useMemo, useRef, FormEvent, MouseEvent } from "react";
import { 
  Flame, 
  HeartPulse, 
  Plus, 
  Search, 
  Trash2, 
  User, 
  Calculator, 
  Utensils, 
  History, 
  MessageSquare, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  Apple, 
  Check, 
  Leaf, 
  Grid,
  ChevronRight,
  Smile,
  X
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell
} from "recharts";

import { UserInfo, NutritionalTargets, FoodItem, MealLogItem, ChatMessage } from "./types";
import { INITIAL_FOOD_DATABASE } from "./foodDatabase";
import { calculateNutritionalTargets, TRANSLATIONS } from "./utils";

// Các màu đại diện cho biểu đồ dinh dưỡng
const COLORS = [
  "#22c55e", // Thực vật - Màu xanh lục (Green-500)
  "#ef4444", // Động vật - Màu đỏ (Red-500)
];

const MACRO_COLORS = {
  protein: "#f43f5e", // Rose-500
  fat: "#eab308",     // Amber-500
  carbs: "#0ea5e9"    // Sky-500
};

export default function App() {
  // --- STATE BAN ĐẦU ---
  const [userInfo, setUserInfo] = useState<UserInfo>(() => {
    const saved = localStorage.getItem("fitnutri_user_info");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      age: 28,
      weight: 65,
      height: 168,
      gender: "male",
      activityLevel: "moderate",
      kidneyHealth: "normal",
      goal: "maintain"
    };
  });

  const [mealLogs, setMealLogs] = useState<MealLogItem[]>(() => {
    const saved = localStorage.getItem("fitnutri_meal_logs");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    
    // Gieo dữ liệu (mock data) ban đầu cho ngày hôm nay để biểu đồ trông sinh động, trực quan
    const todayStr = new Date().toISOString().split("T")[0];
    return [
      {
        id: "mock_1",
        foodId: "plant_banana",
        name: "Chuối chín",
        type: "plant",
        calories: Math.round(89 * 1.5), // 150g
        potassium: Math.round(358 * 1.5),
        protein: parseFloat((1.1 * 1.5).toFixed(1)),
        fat: parseFloat((0.3 * 1.5).toFixed(1)),
        carbs: parseFloat((22.8 * 1.5).toFixed(1)),
        amountGrams: 150,
        mealType: "breakfast",
        timestamp: `${todayStr}T07:30:00.000Z`
      },
      {
        id: "mock_2",
        foodId: "animal_egg",
        name: "Trứng gà tươi",
        type: "animal",
        calories: Math.round(155 * 1.2), // 120g (khoảng 2 quả)
        potassium: Math.round(138 * 1.2),
        protein: parseFloat((13.0 * 1.2).toFixed(1)),
        fat: parseFloat((11.0 * 1.2).toFixed(1)),
        carbs: parseFloat((1.1 * 1.2).toFixed(1)),
        amountGrams: 120,
        mealType: "breakfast",
        timestamp: `${todayStr}T07:35:00.000Z`
      },
      {
        id: "mock_3",
        foodId: "animal_chicken_breast",
        name: "Ức gà phi lê (không da)",
        type: "animal",
        calories: Math.round(165 * 1.5), // 150g
        potassium: Math.round(256 * 1.5),
        protein: parseFloat((31.0 * 1.5).toFixed(1)),
        fat: parseFloat((3.6 * 1.5).toFixed(1)),
        carbs: 0.0,
        amountGrams: 150,
        mealType: "lunch",
        timestamp: `${todayStr}T12:15:00.000Z`
      },
      {
        id: "mock_4",
        foodId: "plant_spinach",
        name: "Cải bó xôi (Rau Bina)",
        type: "plant",
        calories: Math.round(23 * 1.0), // 100g
        potassium: Math.round(558 * 1.0),
        protein: parseFloat((2.9 * 1.0).toFixed(1)),
        fat: parseFloat((0.4 * 1.0).toFixed(1)),
        carbs: parseFloat((3.6 * 1.0).toFixed(1)),
        amountGrams: 100,
        mealType: "lunch",
        timestamp: `${todayStr}T12:20:00.000Z`
      }
    ];
  });

  const [customFoods, setCustomFoods] = useState<FoodItem[]>(() => {
    const saved = localStorage.getItem("fitnutri_custom_foods");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  // Giao diện Tab định danh hiện tại
  const [activeTab, setActiveTab] = useState<'dashboard' | 'food_explorer' | 'logs' | 'calculator' | 'advisor_chat'>('dashboard');

  // Bộ lọc thực phẩm
  const [foodSearch, setFoodSearch] = useState("");
  const [selectedFoodOrigin, setSelectedFoodOrigin] = useState<'all' | 'plant' | 'animal'>('all');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string>("Tất cả");

  // State Thao tác Thêm Nhật ký Ăn uống
  const [selectedFoodToLog, setSelectedFoodToLog] = useState<FoodItem | null>(null);
  const [logAmountGrams, setLogAmountGrams] = useState<number>(100);
  const [logMealType, setLogMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');

  // State Tạo Thực phẩm mới tùy chỉnh
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [newFoodName, setNewFoodName] = useState("");
  const [newFoodType, setNewFoodType] = useState<'plant' | 'animal'>('plant');
  const [newFoodCategory, setNewFoodCategory] = useState("Rau xanh / Hoa quả");
  const [newFoodCalories, setNewFoodCalories] = useState<number>(80);
  const [newFoodPotassium, setNewFoodPotassium] = useState<number>(150);
  const [newFoodProtein, setNewFoodProtein] = useState<number>(2);
  const [newFoodFat, setNewFoodFat] = useState<number>(0.5);
  const [newFoodCarbs, setNewFoodCarbs] = useState<number>(18);
  const [newFoodServingSize, setNewFoodServingSize] = useState("100g");
  const [newFoodDesc, setNewFoodDesc] = useState("");

  // Thao tác Chatbot AI
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("fitnutri_chat_history");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      {
        id: "welcome",
        role: "model",
        content: "Xin chào! Tôi là **Bác sĩ FitNutri**, chuyên gia cố vấn dinh dưỡng của bạn. Tôi thấy chỉ số thể trạng của bạn đã sẵn sàng. Bạn cần tôi phân tích bữa ăn, gợi ý thực đơn giàu Kali cho tim mạch hay giới hạn Kali hỗ trợ bảo vệ Thận hôm nay?",
        timestamp: new Date().toISOString()
      }
    ];
  });
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- LƯU TRỮ VÀO LOCALSTORAGE KHI THAY ĐỔI ---
  useEffect(() => {
    localStorage.setItem("fitnutri_user_info", JSON.stringify(userInfo));
  }, [userInfo]);

  useEffect(() => {
    localStorage.setItem("fitnutri_meal_logs", JSON.stringify(mealLogs));
  }, [mealLogs]);

  useEffect(() => {
    localStorage.setItem("fitnutri_custom_foods", JSON.stringify(customFoods));
  }, [customFoods]);

  useEffect(() => {
    localStorage.setItem("fitnutri_chat_history", JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    if (activeTab === "advisor_chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  // --- TÍNH TOÁN CÁC CHỈ SỐ MỤC TIÊU ---
  const targets: NutritionalTargets = useMemo(() => {
    return calculateNutritionalTargets(userInfo);
  }, [userInfo]);

  // Hợp nhất cơ sở dữ liệu thực phẩm mặc định và thực phẩm tự tạo của người dùng
  const foodDatabase = useMemo(() => {
    return [...INITIAL_FOOD_DATABASE, ...customFoods];
  }, [customFoods]);

  // Trích xuất danh mục thực phẩm độc nhất để lọc
  const foodCategories = useMemo(() => {
    const categories = new Set<string>();
    foodDatabase.forEach(item => categories.add(item.category));
    return ["Tất cả", ...Array.from(categories)];
  }, [foodDatabase]);

  // Lọc thực phẩm để hiển thị
  const filteredFoods = useMemo(() => {
    return foodDatabase.filter(food => {
      const matchesSearch = food.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
                            (food.description && food.description.toLowerCase().includes(foodSearch.toLowerCase()));
      const matchesOrigin = selectedFoodOrigin === 'all' || food.type === selectedFoodOrigin;
      const matchesCategory = selectedFoodCategory === "Tất cả" || food.category === selectedFoodCategory;
      return matchesSearch && matchesOrigin && matchesCategory;
    });
  }, [foodDatabase, foodSearch, selectedFoodOrigin, selectedFoodCategory]);

  // Nhật ký ăn uống của NGÀY HÔM NAY (để hiện trên Dashboard chính)
  const todayMealLogs = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return mealLogs.filter(log => log.timestamp.startsWith(todayStr));
  }, [mealLogs]);

  // --- TỔNG HỢP DINH DƯỠNG ĐÃ TIÊU THỤ HÔM NAY ---
  const todayTotals = useMemo(() => {
    return todayMealLogs.reduce(
      (acc, log) => {
        acc.calories += log.calories;
        acc.potassium += log.potassium;
        acc.protein += log.protein;
        acc.fat += log.fat;
        acc.carbs += log.carbs;
        if (log.type === "plant") {
          acc.plantProtein += log.protein;
          acc.plantCalories += log.calories;
        } else {
          acc.animalProtein += log.protein;
          acc.animalCalories += log.calories;
        }
        return acc;
      },
      { calories: 0, potassium: 0, protein: 0, fat: 0, carbs: 0, plantProtein: 0, animalProtein: 0, plantCalories: 0, animalCalories: 0 }
    );
  }, [todayMealLogs]);

  // Phân tích tỷ lệ đạm thực vật vs động vật hấp thụ
  const proteinOriginData = useMemo(() => {
    return [
      { name: "Đạm Thực Vật 🌱", value: parseFloat(todayTotals.plantProtein.toFixed(1)) },
      { name: "Đạm Động Vật 🥩", value: parseFloat(todayTotals.animalProtein.toFixed(1)) },
    ].filter(d => d.value > 0);
  }, [todayTotals]);

  // Dữ liệu so sánh cột kép cho Recharts
  const chartComparisonData = useMemo(() => {
    return [
      {
        name: "Calo (kcal / 10)",
        "Đã ăn": Math.round(todayTotals.calories / 10),
        "Mục tiêu": Math.round(targets.calories / 10),
        rawEaten: todayTotals.calories,
        rawTarget: targets.calories,
        unit: "kcal"
      },
      {
        name: "Kali (mg / 20)",
        "Đã ăn": Math.round(todayTotals.potassium / 20),
        "Mục tiêu": Math.round(targets.potassium / 20),
        rawEaten: todayTotals.potassium,
        rawTarget: targets.potassium,
        unit: "mg"
      },
      {
        name: "Đạm Carbs Béo (g)",
        "Đã ăn": Math.round(todayTotals.protein + todayTotals.fat + todayTotals.carbs),
        "Mục tiêu": Math.round(targets.protein + targets.fat + targets.carbs),
        rawEaten: `Đạm: ${Math.round(todayTotals.protein)}g / Béo: ${Math.round(todayTotals.fat)}g`,
        rawTarget: `Đạm: ${Math.round(targets.protein)}g / Béo: ${Math.round(targets.fat)}g`,
        unit: "g"
      }
    ];
  }, [todayTotals, targets]);

  // --- HÀM THAO TÁC SỰ KIỆN ---

  // Thao tác cập nhật Hồ sơ Chỉ số
  const handleUpdateProfile = (e: FormEvent) => {
    e.preventDefault();
    setActiveTab('dashboard');
  };

  // Thao tác Thêm Nhật ký Ăn uống thực phẩm
  const handleOpenAddLogModal = (food: FoodItem) => {
    setSelectedFoodToLog(food);
    // Nhận định lượng khẩu phần chuẩn (thường là 100g)
    setLogAmountGrams(100);
  };

  const handleConfirmAddLog = () => {
    if (!selectedFoodToLog) return;
    
    const factor = logAmountGrams / 100;
    const newLogItem: MealLogItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      foodId: selectedFoodToLog.id,
      name: selectedFoodToLog.name,
      type: selectedFoodToLog.type,
      calories: Math.round(selectedFoodToLog.calories * factor),
      potassium: Math.round(selectedFoodToLog.potassium * factor),
      protein: parseFloat((selectedFoodToLog.protein * factor).toFixed(1)),
      fat: parseFloat((selectedFoodToLog.fat * factor).toFixed(1)),
      carbs: parseFloat((selectedFoodToLog.carbs * factor).toFixed(1)),
      amountGrams: logAmountGrams,
      mealType: logMealType,
      timestamp: new Date().toISOString()
    };

    setMealLogs(prev => [newLogItem, ...prev]);
    setSelectedFoodToLog(null);
    setActiveTab('dashboard'); // Chuyển sang màn tổng quan để người dùng xem biểu đồ và chỉ số tăng tiến!
  };

  // Thao tác xóa bản ghi nhật ký ăn uống
  const handleDeleteLogItem = (id: string) => {
    setMealLogs(prev => prev.filter(item => item.id !== id));
  };

  // Thao tác Xóa tất cả nhật ký ăn uống hôm nay để làm mới
  const handleClearTodayLogs = () => {
    if (confirm("Bạn có chắc chắn muốn xóa sạch nhật ký ăn uống của ngày hôm nay?")) {
      const todayStr = new Date().toISOString().split("T")[0];
      setMealLogs(prev => prev.filter(log => !log.timestamp.startsWith(todayStr)));
    }
  };

  // Thao tác Tạo mới Món ăn tùy chỉnh
  const handleCreateCustomFood = (e: FormEvent) => {
    e.preventDefault();

    if (!newFoodName.trim()) {
      alert("Vui lòng điền tên món ăn!");
      return;
    }

    const newFood: FoodItem = {
      id: `custom_${Date.now()}`,
      name: newFoodName,
      type: newFoodType,
      category: newFoodCategory,
      calories: Number(newFoodCalories),
      potassium: Number(newFoodPotassium),
      protein: Number(newFoodProtein),
      fat: Number(newFoodFat),
      carbs: Number(newFoodCarbs),
      servingSizeInfo: newFoodServingSize,
      description: newFoodDesc || "Món ăn tùy biến tự tạo bởi chuyên viên."
    };

    setCustomFoods(prev => [newFood, ...prev]);
    setShowCustomFoodModal(false);
    
    // Reset form
    setNewFoodName("");
    setNewFoodDesc("");
    
    // Chọn danh mục tự động và mở rộng danh sách thực phẩm
    setSelectedFoodOrigin(newFoodType);
    setSelectedFoodCategory("Tất cả");
    setFoodSearch(newFoodName);
  };

  // Xóa món ăn tùy chỉnh đã lưu
  const handleDeleteCustomFood = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (confirm("Xóa thực phẩm tự thiết kế này khỏi danh sách?")) {
      setCustomFoods(prev => prev.filter(food => food.id !== id));
    }
  };

  // --- THAO TÁC GỌI API TRÒ CHUYỆN AI VY CHUYÊN SÂU ---
  const handleSendChatMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsgText = chatInput;
    setChatInput("");
    setChatError(null);

    // 1. Thêm tin nhắn của User vào mảng trạng thái
    const userMsg: ChatMessage = {
      id: `chat_user_${Date.now()}`,
      role: "user",
      content: userMsgText,
      timestamp: new Date().toISOString()
    };
    
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);

    // Lồng ghép thông tin dinh dưỡng hôm nay vào ngữ cảnh gửi tới AI
    const currentNutrientReport = {
      userBody: {
        tuoi: userInfo.age,
        canNang: userInfo.weight,
        chieuCao: userInfo.height,
        gioiTinh: userInfo.gender === 'male' ? 'Nam' : 'Nữ',
        mucTieu: TRANSLATIONS.goal[userInfo.goal],
        sucKhoeThan: TRANSLATIONS.kidney[userInfo.kidneyHealth]
      },
      targets: {
        calo: `${targets.calories} kcal`,
        kali: `${targets.potassium} mg`,
        protein: `${targets.protein} g`,
        fat: `${targets.fat} g`,
        carbs: `${targets.carbs} g`
      },
      consumedToday: {
        caloDaAn: `${todayTotals.calories} kcal`,
        kaliDaAn: `${todayTotals.potassium} mg`,
        proteinDaAn: `${todayTotals.protein} g (Thực vật: ${todayTotals.plantProtein.toFixed(1)}g, Động vật: ${todayTotals.animalProtein.toFixed(1)}g)`,
        fatDaAn: `${todayTotals.fat} g`,
        carbsDaAn: `${todayTotals.carbs} g`
      },
      foodsEatenList: todayMealLogs.map(log => `${log.name} (${log.amountGrams}g, ${TRANSLATIONS.mealType[log.mealType]})`)
    };

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          history: updatedMessages.slice(-8, -1), // Giới hạn history ngắn để giữ hiệu suất token
          userInfo: currentNutrientReport
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      
      const responseText = data.text || "Xin lỗi, tôi chưa giải nghĩa được nội dung này.";
      
      const modelMsg: ChatMessage = {
        id: `chat_model_${Date.now()}`,
        role: "model",
        content: responseText,
        timestamp: new Date().toISOString()
      };

      setChatMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      console.error("Lỗi trò chuyện dinh dưỡng AI:", err);
      setChatError(err.message || "Không thể kết nối với máy chủ AI. Vui lòng kiểm tra khóa API trong Secrets.");
    } finally {
      setIsChatLoading(false);
    }
  };

  // Kêu gọi các gợi ý soạn tin sẵn
  const handleSelectQuickPrompt = (promptText: string) => {
    setChatInput(promptText);
  };

  // Tính tỷ lệ phần trăm đã tiêu hao
  const calPercent = (eaten: number, target: number) => {
    if (!target) return 0;
    return Math.min(Math.round((eaten / target) * 100), 200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-teal-100 antialiased">
      {/* --- HEADER CHÍNH CỦA APP --- */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Thương Hiệu */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-md shadow-teal-100 flex items-center justify-center">
                <HeartPulse className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 flex items-center gap-1.5">
                  FitNutri <span className="text-xs bg-emerald-100 text-emerald-800 font-normal px-2 py-0.5 rounded-full font-sans">Chuyên Gia Y Tế</span>
                </h1>
                <p className="text-[10px] text-slate-400">Tính Calo, Kali & Dinh Dưỡng Thực-Động Vật</p>
              </div>
            </div>

            {/* Thông báo tình trạng thận ở góc Header */}
            <div className="hidden md:flex items-center space-x-4">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                userInfo.kidneyHealth === 'kidney_disease' 
                  ? 'bg-amber-50 border border-amber-200 text-amber-800' 
                  : 'bg-emerald-50 border border-emerald-100 text-emerald-800'
              }`}>
                {userInfo.kidneyHealth === 'kidney_disease' ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Chế độ bệnh lý Thận (Giới hạn Kali: 2000mg tối đa)</span>
                  </>
                ) : (
                  <>
                    <Leaf className="h-4 w-4 text-emerald-600" />
                    <span>Hệ Thận khỏe mạnh (Kali tiêu chuẩn: 3800mg - 4500mg)</span>
                  </>
                )}
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 flex items-center space-x-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>{TRANSLATIONS.gender[userInfo.gender]}, {userInfo.age} tuổi • {userInfo.weight}kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- THANH TÙY CHỌN CHUYỂN TAB --- */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center overflow-x-auto space-x-1 py-2 scrollbar-none">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200 font-semibold'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <Grid className="h-4 w-4" />
              <span>Bảng Điều Khiển</span>
            </button>

            <button
              onClick={() => setActiveTab('food_explorer')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'food_explorer'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200 font-semibold'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <Apple className="h-4 w-4" />
              <span>Kho Thực Phẩm ({foodDatabase.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200 font-semibold'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Nhật Ký Ăn Uống ({todayMealLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'calculator'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200 font-semibold'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <Calculator className="h-4 w-4" />
              <span>Tính Chỉ Số BMR/TDEE</span>
            </button>

            <button
              onClick={() => setActiveTab('advisor_chat')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap relative ${
                activeTab === 'advisor_chat'
                  ? 'bg-white text-emerald-700 shadow-sm border border-slate-200 font-semibold'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chuyên Gia Dinh Dưỡng AI</span>
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* --- PHÂN THÂN CHỨA NỘI DUNG CHÍNH --- */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* --- TAP 1: BẢNG ĐIỀU KHIỂN (DASHBOARD TỔNG QUAN) --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* LỜI KHUYÊN SỨC KHỎE TỪ CHUYÊN GIA (BANNER CHỦ CHỐT) */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm relative overflow-hidden ${
              userInfo.kidneyHealth === 'kidney_disease'
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex gap-3 items-start">
                <div className={`p-2 rounded-lg mt-1 md:mt-0 ${
                  userInfo.kidneyHealth === 'kidney_disease' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Chỉ định Chuyên môn ngày hôm nay</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {userInfo.kidneyHealth === 'kidney_disease' ? (
                      "Báo cáo y học: Do có lý lịch suy thận, lượng Kali mục tiêu cần giới hạn dưới 2000mg. Tránh ăn dồn dập các món giàu Kali như Chuối chín, Quả bơ hay Cải bó xôi trong cùng một bữa. Hãy phân nhỏ hoặc thay thế bằng Táo tây, Đậu hũ, Cơm trắng."
                    ) : (
                      "Khuyến cáo sức khỏe: Kali dồi dào (3500-4700mg) hỗ trợ đẩy natri dư, ổn định HA tim mạch. Nên bổ sung đạm Thực vật (nhóm quả bơ, rau chân vịt, khoai dẻo) đan xen thịt ức gà và cá để tối ưu năng lượng hoạt động."
                    )}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('advisor_chat')}
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold px-4 py-2 rounded-lg flex items-center space-x-1.5 transition whitespace-nowrap"
              >
                <span>Hỏi Bác sĩ AI</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* --- VÒNG CÁC CHỈ SỐ TIÊU THỤ HẰNG NGÀY --- */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Calories */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 font-medium">Năng lượng (Calo)</span>
                  <span className="p-1 px-1.5 bg-orange-50 text-orange-600 rounded-md text-[10px] font-bold flex items-center gap-0.5">
                    <Flame className="h-3 w-3" /> Calories
                  </span>
                </div>
                <div className="my-4">
                  <p className="text-2xl font-bold tracking-tight text-slate-800">{todayTotals.calories} <span className="text-xs font-normal text-slate-400">kcal</span></p>
                  <p className="text-[10px] text-slate-400 mt-0.5">mục tiêu: {targets.calories} kcal</p>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Tiến độ</span>
                    <span>{calPercent(todayTotals.calories, targets.calories)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(calPercent(todayTotals.calories, targets.calories), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Potassium (Kali) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 font-medium">Kali (Potassium / K)</span>
                  <span className={`p-1 px-1.5 rounded-md text-[10px] font-bold flex items-center gap-0.5 ${
                    userInfo.kidneyHealth === 'kidney_disease' ? 'bg-amber-100 text-amber-700' : 'bg-teal-50 text-teal-600'
                  }`}>
                    <HeartPulse className="h-3 w-3" /> Kali
                  </span>
                </div>
                <div className="my-4">
                  <p className={`text-2xl font-bold tracking-tight ${
                    userInfo.kidneyHealth === 'kidney_disease' && todayTotals.potassium > targets.potassium
                      ? 'text-red-600 animate-pulse'
                      : 'text-slate-800'
                  }`}>
                    {todayTotals.potassium} <span className="text-xs font-normal text-slate-400">mg</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {userInfo.kidneyHealth === 'kidney_disease' ? `mức trần: 2000 mg` : `mục tiêu: ${targets.potassium} mg`}
                  </p>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>{userInfo.kidneyHealth === 'kidney_disease' ? "Áp lực lọc Thận" : "Tiến độ"}</span>
                    <span>{calPercent(todayTotals.potassium, targets.potassium)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        userInfo.kidneyHealth === 'kidney_disease' && todayTotals.potassium > targets.potassium
                          ? 'bg-red-600'
                          : 'bg-teal-500'
                      }`} 
                      style={{ width: `${Math.min(calPercent(todayTotals.potassium, targets.potassium), 100)}%` }}
                    ></div>
                  </div>
                  {userInfo.kidneyHealth === 'kidney_disease' && todayTotals.potassium > targets.potassium && (
                    <span className="text-[9px] text-red-600 font-semibold block mt-1 animate-pulse">⚠️ Vượt ngưỡng an toàn Thận!</span>
                  )}
                </div>
              </div>

              {/* Protein (Chất Đạm) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 font-medium font-sans">Chất Đạm (Protein)</span>
                  <span className="p-1 px-1.5 bg-rose-50 text-rose-600 rounded-md text-[10px] font-bold">
                    🍗 Protein
                  </span>
                </div>
                <div className="my-4">
                  <p className="text-2xl font-bold tracking-tight text-slate-800">{todayTotals.protein.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span></p>
                  <p className="text-[10px] text-slate-400 mt-0.5">mục tiêu: {targets.protein} g</p>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Tiến độ</span>
                    <span>{calPercent(todayTotals.protein, targets.protein)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-rose-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(calPercent(todayTotals.protein, targets.protein), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Fat (Chất béo) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 font-medium">Chất béo (Fat)</span>
                  <span className="p-1 px-1.5 bg-amber-50 text-amber-600 rounded-md text-[10px] font-bold">
                    🥑 Fat
                  </span>
                </div>
                <div className="my-4">
                  <p className="text-2xl font-bold tracking-tight text-slate-800">{todayTotals.fat.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span></p>
                  <p className="text-[10px] text-slate-400 mt-0.5">mục tiêu: {targets.fat} g</p>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Tiến độ</span>
                    <span>{calPercent(todayTotals.fat, targets.fat)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(calPercent(todayTotals.fat, targets.fat), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Carbs (Tinh bột) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-500 font-medium">Tinh bột (Carbs)</span>
                  <span className="p-1 px-1.5 bg-sky-50 text-sky-600 rounded-md text-[10px] font-bold">
                    🌾 Carbs
                  </span>
                </div>
                <div className="my-4">
                  <p className="text-2xl font-bold tracking-tight text-slate-800">{todayTotals.carbs.toFixed(1)} <span className="text-xs font-normal text-slate-400">g</span></p>
                  <p className="text-[10px] text-slate-400 mt-0.5">mục tiêu: {targets.carbs} g</p>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Tiến độ</span>
                    <span>{calPercent(todayTotals.carbs, targets.carbs)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-sky-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(calPercent(todayTotals.carbs, targets.carbs), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- KHU VỰC BIỂU ĐỒ TRỰC QUAN (RECHARTS) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Cột kép so sánh mục tiêu vs thực tế */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      📊 Biểu đồ so sánh Chỉ số thực thụ
                    </h3>
                    <p className="text-xs text-slate-500">Đã nạp thực tế so với chỉ số TDEE & Thận thiết kế</p>
                  </div>
                  <span className="text-[10px] text-slate-400 italic">Giá trị tương đối đã chuẩn hóa</span>
                </div>

                <div className="h-64">
                  {todayMealLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl p-4 border border-dashed text-slate-400">
                      <Utensils className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-xs">Chưa có món ăn nào hôm nay để hiển thị biểu đồ so sánh.</p>
                      <button onClick={() => setActiveTab('food_explorer')} className="text-xs text-emerald-600 font-semibold underline mt-1">Đến Kho Thực Phẩm</button>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                        <RechartsTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-lg text-xs shadow-xl border border-slate-700">
                                  <p className="font-semibold mb-1 text-teal-400">{data.name}</p>
                                  <p>Đã nạp hằng ngày: <span className="font-mono text-emerald-300">{data.rawEaten} {data.unit}</span></p>
                                  <p>Ngưỡng mục tiêu: <span className="font-mono text-slate-300">{data.rawTarget} {data.unit}</span></p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Đã ăn" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Mục tiêu" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Biểu đồ phân bổ tỷ lệ Đạm Động vật & Thực vật */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    🌱 Phân bổ nguồn gốc Protein
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">Sự cân bằng hoàn hảo giữa động vật và thực vật</p>
                </div>

                <div className="h-44 flex items-center justify-center relative">
                  {proteinOriginData.length === 0 ? (
                    <div className="text-center p-4 text-xs text-slate-400">
                      <p>Ăn đậu hũ 🌱, hạt điều hoặc thịt nạc Ức gà 🥩 để xem phân tích cơ cấu Protein của bạn.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={proteinOriginData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {proteinOriginData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name.includes("Thực Vật") ? 0 : 1]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value) => [`${value} gr`, "Lượng đạm"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {proteinOriginData.length > 0 && (
                    <div className="absolute text-center">
                      <p className="text-xl font-bold text-slate-800 font-mono">{(todayTotals.plantProtein + todayTotals.animalProtein).toFixed(0)}g</p>
                      <p className="text-[9px] text-slate-400">Tổng Đạm hôm nay</p>
                    </div>
                  )}
                </div>

                {proteinOriginData.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2.5 mt-2">
                    <div className="flex items-center space-x-1.5 justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span className="text-slate-600 font-medium">Thực vật: <b>{todayTotals.plantProtein.toFixed(1)}g</b></span>
                    </div>
                    <div className="flex items-center space-x-1.5 justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                      <span className="text-slate-600 font-medium">Động vật: <b>{todayTotals.animalProtein.toFixed(1)}g</b></span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --- NHẠT KÝ TÓM TẮT HÔM NAY (BỮA ĐÃ ĂN) --- */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Bữa ăn đã lưu hôm nay ({todayMealLogs.length} món)</h3>
                  <p className="text-xs text-slate-500">Giúp người dùng kiểm tra nhanh và xóa món bị bốc nhầm.</p>
                </div>
                {todayMealLogs.length > 0 && (
                  <button 
                    onClick={handleClearTodayLogs}
                    className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline flex items-center space-x-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Làm mới ngày ăn</span>
                  </button>
                )}
              </div>

              {todayMealLogs.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">Hôm nay bạn chưa ăn món nào. Hãy bấm sang <b>Kho thực phẩm</b> để thêm bữa sáng, trưa hoặc tối!</p>
                  <button 
                    onClick={() => setActiveTab('food_explorer')}
                    className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Chọn món ăn ngay 🌱
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="pb-3 pt-1 font-medium">Món Ăn</th>
                        <th className="pb-3 pt-1 font-medium">Phân nhóm</th>
                        <th className="pb-3 pt-1 font-medium">Bữa ăn</th>
                        <th className="pb-3 pt-1 font-medium text-right">Khối lượng</th>
                        <th className="pb-3 pt-1 font-medium text-right text-orange-600">Calo</th>
                        <th className="pb-3 pt-1 font-medium text-right text-teal-600">Kali (K)</th>
                        <th className="pb-3 pt-1 font-medium text-right text-rose-500">Đạm (P)</th>
                        <th className="pb-3 pt-1 font-medium text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {todayMealLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 font-semibold text-slate-800">{log.name}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              log.type === 'plant' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {log.type === 'plant' ? '🌱 Thực vật' : '🥩 Động vật'}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-500">{TRANSLATIONS.mealType[log.mealType]}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-700 font-mono">{log.amountGrams}g</td>
                          <td className="py-2.5 text-right font-medium text-orange-600 font-mono">{log.calories} kcal</td>
                          <td className="py-2.5 text-right font-medium text-teal-600 font-mono">{log.potassium} mg</td>
                          <td className="py-2.5 text-right font-semibold text-slate-700 font-mono">{log.protein}g</td>
                          <td className="py-2.5 text-center">
                            <button 
                              onClick={() => handleDeleteLogItem(log.id)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50/50 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: KHO THỰC PHẨM (FOOD EXPLORER & CREATOR) --- */}
        {activeTab === 'food_explorer' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Thanh tìm kiếm và bộ lọc nhanh */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold font-display text-slate-900">Danh Mục Thực Phẩm Dinh Dưỡng</h2>
                  <p className="text-xs text-slate-500">Tìm kiếm, lọc nguồn thực vật và động vật tinh hoa giàu đạm, kali.</p>
                </div>
                
                {/* Nút thiết kế thực phẩm tùy chỉnh mới */}
                <button 
                  onClick={() => setShowCustomFoodModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 self-start shadow-md shadow-emerald-100"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tự Thiết Kế Món Ăn</span>
                </button>
              </div>

              {/* Ba cột tìm kiếm & lọc bộ phận */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Tìm kiếm tên */}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                    placeholder="Tìm tên thực phẩm (ví dụ: chuối, ức gà, trứng...)"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 text-xs border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                  />
                  {foodSearch && (
                    <button onClick={() => setFoodSearch("")} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Chọn Nguồn gốc */}
                <div>
                  <select
                    value={selectedFoodOrigin}
                    onChange={(e) => {
                      setSelectedFoodOrigin(e.target.value as any);
                      setSelectedFoodCategory("Tất cả");
                    }}
                    className="w-full px-3 py-2 bg-slate-50 text-xs border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition font-medium"
                  >
                    <option value="all">Nguồn gốc: Tất Cả 🌱🥩</option>
                    <option value="plant">Nguồn Thực Vật 🌱 (Chay)</option>
                    <option value="animal">Nguồn Động Vật 🥩 (Mặn)</option>
                  </select>
                </div>

                {/* Chọn Phân nhóm nhỏ */}
                <div>
                  <select
                    value={selectedFoodCategory}
                    onChange={(e) => setSelectedFoodCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 text-xs border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition font-medium"
                  >
                    <option value="Tất cả">Danh Mục: Tất cả</option>
                    {foodCategories.filter(cat => cat !== "Tất cả").map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* DANH SÁCH THỰC PHẨM ĐÃ LỌC */}
            {filteredFoods.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-sm text-slate-400">Không tìm thấy thực phẩm nào tương ứng bộ lọc hiện tại.</p>
                <button 
                  onClick={() => { setFoodSearch(""); setSelectedFoodOrigin("all"); setSelectedFoodCategory("Tất cả"); }}
                  className="mt-2 text-xs text-emerald-600 font-semibold underline"
                >
                  Xoá bộ lọc tìm kiếm
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFoods.map((food) => {
                  const isCustom = food.id.startsWith("custom_");
                  return (
                    <div 
                      key={food.id}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-250 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                    >
                      {/* Phần Thân trên thực phẩm */}
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">{food.category}</span>
                          <div className="flex space-x-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                              food.type === 'plant' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {food.type === 'plant' ? '🌱 Thực vật' : '🥩 Động vật'}
                            </span>
                            {isCustom && (
                              <button
                                onClick={(e) => handleDeleteCustomFood(food.id, e)}
                                className="text-slate-300 hover:text-red-500 hover:bg-slate-100 p-0.5 rounded transition"
                                title="Xóa món tự tạo"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-slate-800 tracking-tight mb-1">{food.name}</h3>
                        <p className="text-[11px] text-slate-400 italic mb-3">Định lượng chuẩn: {food.servingSizeInfo}</p>
                        
                        {food.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">{food.description}</p>
                        )}

                        {/* MẢNG THÔNG SỐ DINH DƯỠNG TRÊN 100g */}
                        <div className="grid grid-cols-5 gap-1.5 bg-slate-50 p-2.5 rounded-xl text-center">
                          <div className="border-r border-slate-100 last:border-0">
                            <p className="text-[10px] text-slate-400">Calo</p>
                            <p className="text-xs font-bold text-orange-600 font-mono mt-0.5">{food.calories}</p>
                            <span className="text-[8px] text-slate-400 font-sans block">kcal</span>
                          </div>
                          <div className="border-r border-slate-100 last:border-0">
                            <p className="text-[10px] text-slate-400">Kali (K)</p>
                            <p className="text-xs font-bold text-teal-600 font-mono mt-0.5">{food.potassium}</p>
                            <span className="text-[8px] text-slate-400 font-sans block">mg</span>
                          </div>
                          <div className="border-r border-slate-100 last:border-0">
                            <p className="text-[10px] text-zinc-500">Đạm (P)</p>
                            <p className="text-xs font-bold text-rose-500 font-mono mt-0.5">{food.protein}g</p>
                            <span className="text-[8px] text-slate-400 font-sans block">Carbs {food.carbs}</span>
                          </div>
                          <div className="border-r border-slate-100 last:border-0">
                            <p className="text-[10px] text-slate-400">Béo (F)</p>
                            <p className="text-xs font-semibold text-slate-700 font-mono mt-0.5">{food.fat}g</p>
                            <span className="text-[8px] text-slate-400 font-sans block">g</span>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">Tinh bột</p>
                            <p className="text-xs font-semibold text-slate-700 font-mono mt-0.5">{food.carbs}g</p>
                            <span className="text-[8px] text-slate-400 font-sans block">g</span>
                          </div>
                        </div>
                      </div>

                      {/* Nút tác vụ chân thẻ */}
                      <div className="p-4 border-t border-slate-100 bg-slate-50/20 group-hover:bg-slate-50/60 transition-colors flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400">Cần ăn thực tế bao nhiêu?</span>
                        <button 
                          onClick={() => handleOpenAddLogModal(food)}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Thêm Bữa Ăn</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: NHẬT KÝ ĂN UỐNG (DAILY LOGS DETAILS) --- */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900">Chi Tiết Lịch Sử Nhật Ký Ăn Uống</h2>
                <p className="text-xs text-slate-500">Lưu lại tất cả nhật ký món ăn, giúp bạn phân rã năng lượng nạp vào trong tuần qua.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('food_explorer')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  + Ghi chép Món ăn mới
                </button>
              </div>
            </div>

            {/* BẢNG LỊCH SỬ ĂN CHUYÊN SÂU */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {mealLogs.length === 0 ? (
                <div className="text-center py-12 p-6">
                  <p className="text-xs text-slate-400">Hệ thống của chúng tôi hiện chưa lưu lại nhật ký ăn uống lịch sử nào.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-slate-500">
                        <th className="p-4 font-semibold">Thời Gian</th>
                        <th className="p-4 font-semibold">Thực Phẩm</th>
                        <th className="p-4 font-semibold">Nguồn Gốc</th>
                        <th className="p-4 font-semibold">Phân Loại Bữa</th>
                        <th className="p-4 font-semibold text-right">Gram nạp</th>
                        <th className="p-4 font-semibold text-right text-orange-600">Calo (kcal)</th>
                        <th className="p-4 font-semibold text-right text-teal-600">Kali (mg)</th>
                        <th className="p-4 font-semibold text-right text-rose-500">Đạm (Protein)</th>
                        <th className="p-4 font-semibold text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mealLogs.map((log) => {
                        const dateObj = new Date(log.timestamp);
                        const displayTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')} - ${dateObj.toLocaleDateString('vi-VN')}`;
                        return (
                          <tr key={log.id} className="hover:bg-slate-50 transition">
                            <td className="p-4 text-slate-500 font-mono whitespace-nowrap">{displayTime}</td>
                            <td className="p-4 font-semibold text-slate-800">{log.name}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                log.type === 'plant' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {log.type === 'plant' ? '🌱 Thực vật' : '🥩 Động vật'}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600">{TRANSLATIONS.mealType[log.mealType]}</td>
                            <td className="p-4 text-right font-semibold text-slate-705 font-mono">{log.amountGrams}g</td>
                            <td className="p-4 text-right font-medium text-orange-600 font-mono">{log.calories} kcal</td>
                            <td className="p-4 text-right font-medium text-teal-600 font-mono">{log.potassium} mg</td>
                            <td className="p-4 text-right font-semibold text-slate-700 font-mono">{log.protein}g</td>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => handleDeleteLogItem(log.id)}
                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: MÁY TÍNH CHỈ SỐ BMR/TDEE & HỒ SƠ --- */}
        {activeTab === 'calculator' && (
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
              <h2 className="text-lg font-bold font-display flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Máy Tính Chỉ Số Sức Khoẻ & Thể Thức Dinh Dưỡng
              </h2>
              <p className="text-xs text-emerald-100 mt-1">Cung cấp tuổi, chiều cao, cân nặng để tính toán mức Calories tối thiểu (BMR), khả năng vận động (TDEE) và dải Kali an toàn tự động.</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
              
              {/* Giới tính và Tuổi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Giới Tính Sinh Học</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUserInfo(prev => ({ ...prev, gender: "male" }))}
                      className={`py-2 text-xs font-semibold rounded-xl border transition ${
                        userInfo.gender === "male"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Nam
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserInfo(prev => ({ ...prev, gender: "female" }))}
                      className={`py-2 text-xs font-semibold rounded-xl border transition ${
                        userInfo.gender === "female"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Nữ
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Tuổi Của Bạn (Năm)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={userInfo.age}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, age: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition block text-xs"
                    required
                  />
                </div>
              </div>

              {/* Chiều cao và Cân nặng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Chiều Cao (cm)</label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={userInfo.height}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, height: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition block text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Cân Nặng Hiện Tại (kg)</label>
                  <input
                    type="number"
                    min="30"
                    max="200"
                    value={userInfo.weight}
                    onChange={(e) => setUserInfo(prev => ({ ...prev, weight: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition block text-xs"
                    required
                  />
                </div>
              </div>

              {/* Mức độ vận động hằng ngày */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Mức Độ Vận Động Hằng Tuần</label>
                <select
                  value={userInfo.activityLevel}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, activityLevel: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition block text-xs font-medium"
                >
                  <option value="sedentary">Ít vận động (Ngồi nhiều, làm việc văn phòng)</option>
                  <option value="light">Vận động nhẹ (Luyện tập nhẹ 1-3 ngày/tuần)</option>
                  <option value="moderate">Vận động vừa (Thể dục tích cực 3-5 ngày/tuần)</option>
                  <option value="active">Vận động cường độ cao (Luyện tập khắc nghiệt 6-7 ngày/tuần)</option>
                  <option value="extreme">Vận động cực nặng (Vận động viên, chuyên viên mang vác)</option>
                </select>
              </div>

              {/* Sức khoẻ Thận hiện tại */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  Thể Trạng Sức Khoẻ Hệ Thận 
                  <span className="text-[10px] text-amber-600 font-medium">(Quan trọng cho Kali!)</span>
                </label>
                <p className="text-[10px] text-slate-400 mb-3">Thận là màng lọc chính của Kali. Người bị suy giảm chức năng thận bắt buộc phải đưa Kali về dưới 2000mg để chống biến chứng tim mạch.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div 
                    onClick={() => setUserInfo(prev => ({ ...prev, kidneyHealth: "normal" }))}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      userInfo.kidneyHealth === "normal"
                        ? "border-emerald-500 bg-emerald-50/40 text-slate-900"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border border-slate-300 mt-0.5 flex items-center justify-center ${userInfo.kidneyHealth === 'normal' ? 'bg-emerald-600 border-emerald-600' : ''}`}>
                      {userInfo.kidneyHealth === 'normal' && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Thận Khỏe Mạnh</p>
                      <p className="text-[10px] text-slate-400">Cho phép dải Kali tiêu chuẩn hoặc cao (3500mg-4700mg) giúp bảo vệ xơ vữa thành mạch tốt.</p>
                    </div>
                  </div>

                  <div 
                    onClick={() => setUserInfo(prev => ({ ...prev, kidneyHealth: "kidney_disease" }))}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      userInfo.kidneyHealth === "kidney_disease"
                        ? "border-amber-500 bg-amber-50/40 text-slate-900"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border border-slate-300 mt-0.5 flex items-center justify-center ${userInfo.kidneyHealth === 'kidney_disease' ? 'bg-amber-650 border-amber-600' : ''}`}>
                      {userInfo.kidneyHealth === 'kidney_disease' && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-800">Có bệnh lý nền Thận</p>
                      <p className="text-[10px] text-slate-400">Giới hạn Kali ở mức trần dưới 2000mg tự động để bảo vệ áp lực cầu thận tối đa.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mục tiêu Dinh dưỡng mong muốn */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Mục Tiêu Cá Nhân Thể Hình</label>
                <select
                  value={userInfo.goal}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, goal: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition block text-xs font-medium"
                >
                  <option value="maintain">Giữ cân nặng ổn định hiện tại</option>
                  <option value="lose_weight">Giảm cân chậm và giảm lượng calo nạp</option>
                  <option value="gain_weight">Tăng cân khoa học (Phát triển cơ bắp)</option>
                  <option value="heart_health">Tăng cường huyết áp / Hỗ trợ tim mạch (Giàu Kali)</option>
                  <option value="kidney_care">Chủ động giảm tải cho Thận (Kiểm soát Kali thấp)</option>
                </select>
              </div>

              {/* Nút lưu hồ sơ */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition shadow-md shadow-emerald-50"
                >
                  Cập nhật & Xem Bảng Điều Khiển
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TAB 5: TRÒ CHUYỆN CHUYÊN GIA DINH DƯỠNG AI (CHAT ADVISOR) --- */}
        {activeTab === 'advisor_chat' && (
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] animate-fade-in">
            {/* Header Chat */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500 rounded-lg text-white">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Trò chuyện Chuyên gia Dinh dưỡng FitNutri AI</h3>
                  <p className="text-[10px] text-slate-400">Hỗ trợ gợi ý cụ thể thực đơn mặn/chay, tính Kali, Protein, Fat, Carbs</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (confirm("Xóa lịch sử tư vấn này?")) {
                    setChatMessages([
                      {
                        id: "welcome",
                        role: "model",
                        content: "Xin chào! Lịch sử trò chuyện đã được dọn sạch. Bạn cần tôi tư vấn thực đơn như thế nào hôm nay?",
                        timestamp: new Date().toISOString()
                      }
                    ]);
                  }
                }}
                className="text-[10px] text-slate-400 hover:text-white underline font-medium"
              >
                Xoá lịch sử
              </button>
            </div>

            {/* Dải thông số người dùng để AI nhìn thấy rõ */}
            <div className="bg-slate-50 border-b border-slate-200 p-2.5 px-4 text-[10px] text-slate-500 flex justify-between items-center whitespace-nowrap overflow-x-auto">
              <span>Hồ sơ: <b>{userInfo.age}t</b>, <b>{userInfo.weight}kg</b>, Thể trạng Thận: <b className={userInfo.kidneyHealth === 'kidney_disease' ? 'text-amber-700' : 'text-emerald-700'}>{TRANSLATIONS.kidney[userInfo.kidneyHealth]}</b></span>
              <span>Hôm nay: <b className="text-orange-600">{todayTotals.calories} kcal</b> / <b className="text-teal-600">{todayTotals.potassium} mg Kali</b> nạp</span>
            </div>

            {/* Nơi chứa các tin nhắn cuộn */}
            <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50/40">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-slate-900 text-white rounded-br-none' 
                      : 'bg-white text-slate-800 shadow-sm border border-slate-200 rounded-bl-none'
                  }`}>
                    {/* Render text with simple bold/list parsing */}
                    <div className="space-y-1">
                      {msg.content.split("\n").map((line, i) => {
                        let parsed = line;
                        // Phác họa định dạng in đậm thô **...** thành em
                        const boldRegex = /\*\*(.*?)\*\*/g;
                        const hasBold = boldRegex.test(parsed);
                        
                        if (line.startsWith("* ") || line.startsWith("- ")) {
                          return (
                            <div key={i} className="flex items-start gap-1.5 pl-2">
                              <span className="text-emerald-500 mt-0.5">•</span>
                              <p dangerouslySetInnerHTML={{ __html: line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                            </div>
                          );
                        }
                        return (
                          <p 
                            key={i} 
                            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} 
                          />
                        );
                      })}
                    </div>
                    <span className="text-[9px] text-slate-400 block mt-1 text-right font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-none border border-slate-200 p-4 text-xs shadow-sm flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-slate-400 italic font-medium">Bác sĩ AI đang cân nhắc thực đơn dinh dưỡng...</span>
                  </div>
                </div>
              )}

              {chatError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p>{chatError}</p>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Các Gợi ý soạn thảo nhanh */}
            <div className="p-2 border-t border-slate-100 bg-slate-50 overflow-x-auto flex space-x-2 whitespace-nowrap scrollbar-none">
              <button 
                onClick={() => handleSelectQuickPrompt("Thiết kế thực đơn 1 ngày dưới 2000mg Kali cho tôi.")}
                className="bg-white hover:bg-slate-100 px-3 py-1 rounded-full text-[10px] font-medium border border-slate-200 text-slate-600"
              >
                🥗 Thực đơn ít Kali cho Thận
              </button>
              <button 
                onClick={() => handleSelectQuickPrompt("Tỷ lệ đạm Thực vật & Động vật hôm nay của tôi thế nào?")}
                className="bg-white hover:bg-slate-100 px-3 py-1 rounded-full text-[10px] font-medium border border-slate-200 text-slate-600"
              >
                🌱 Đánh giá cân bằng Đạm
              </button>
              <button 
                onClick={() => handleSelectQuickPrompt("Loại thực phẩm nào giàu Kali giúp kiểm soát cơ, huyết áp tốt?")}
                className="bg-white hover:bg-slate-100 px-3 py-1 rounded-full text-[10px] font-medium border border-slate-200 text-slate-600"
              >
                🍌 Kẻ thù hay Bạn tốt: Thực phẩm Kali cao
              </button>
              <button 
                onClick={() => handleSelectQuickPrompt("Làm sao để vừa tăng cơ (đạm cao) vừa bảo vệ thận?")}
                className="bg-white hover:bg-slate-100 px-3 py-1 rounded-full text-[10px] font-medium border border-slate-200 text-slate-600"
              >
                💪 Tăng cơ nhưng Bảo vệ Thận
              </button>
            </div>

            {/* Thanh gõ tin nhắn */}
            <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Hỏi chuyên gia về món ăn hoặc đề xuất thực đơn... (ví dụ: chuối có nhiều Kali quá không?)"
                className="flex-grow px-3 py-2 bg-slate-50 text-xs border border-slate-250 rounded-xl focus:border-slate-800 focus:bg-white focus:outline-none transition"
                disabled={isChatLoading}
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition whitespace-nowrap disabled:opacity-50"
                disabled={!chatInput.trim() || isChatLoading}
              >
                Gửi AI
              </button>
            </form>
          </div>
        )}
      </main>

      {/* --- MODAL 1: THÊM NHẬT KÝ ĂN UỐNG (LOG MEAL) --- */}
      {selectedFoodToLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Utensils className="h-4 w-4" /> Ghi Nhận Khẩu Phần Ăn
              </h3>
              <button onClick={() => setSelectedFoodToLog(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase font-sans">{selectedFoodToLog.category}</span>
                <h4 className="text-base font-bold text-slate-800">{selectedFoodToLog.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{selectedFoodToLog.description}</p>
              </div>

              {/* Nhập định lượng */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Khối Lượng Tiêu Thụ (Grams)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={logAmountGrams}
                    onChange={(e) => setLogAmountGrams(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition text-xs font-mono font-semibold text-center"
                    required
                  />
                  <span className="text-xs font-medium text-slate-500">gr</span>
                </div>
              </div>

              {/* Chọn Bữa ăn */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phân Loại Vào Bữa Ăn</label>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => (
                    <button
                      key={meal}
                      type="button"
                      onClick={() => setLogMealType(meal)}
                      className={`py-2 text-[10px] font-semibold rounded-lg border transition ${
                        logMealType === meal
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {TRANSLATIONS.mealType[meal]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Các thông số dinh dưỡng ước tính */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">栄養 Giá trị dinh dưỡng nạp thực tế:</p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Calo</span>
                    <span className="font-bold text-orange-600 font-mono">{Math.round(selectedFoodToLog.calories * (logAmountGrams / 100))}</span>
                    <span className="text-[8px] text-slate-400 block font-sans">kcal</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Kali (K)</span>
                    <span className="font-bold text-teal-600 font-mono">{Math.round(selectedFoodToLog.potassium * (logAmountGrams / 100))}</span>
                    <span className="text-[8px] text-slate-400 block font-sans">mg</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Đạm (P)</span>
                    <span className="font-bold text-rose-500 font-mono">{(selectedFoodToLog.protein * (logAmountGrams / 100)).toFixed(1)}</span>
                    <span className="text-[8px] text-slate-400 block font-sans">g</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Chất béo</span>
                    <span className="font-bold text-slate-700 font-mono">{(selectedFoodToLog.fat * (logAmountGrams / 100)).toFixed(1)}</span>
                    <span className="text-[8px] text-slate-400 block font-sans">g</span>
                  </div>
                </div>
              </div>

              {/* Thao tác */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedFoodToLog(null)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleConfirmAddLog}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
                >
                  Xác nhận lưu bữa ăn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: TỰ THIẾT KẾ MÓN ĂN MỚI (CREATE CUSTOM FOOD) --- */}
      {showCustomFoodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Tự Thiết Kế Món Ăn Mới
              </h3>
              <button onClick={() => setShowCustomFoodModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomFood} className="p-6 space-y-4">
              {/* Tên thức phẩm + Loại thực vật/động vật */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tên Món Ăn / Thực phẩm</label>
                  <input
                    type="text"
                    value={newFoodName}
                    onChange={(e) => setNewFoodName(e.target.value)}
                    placeholder="ví dụ: Hạt hướng dương sấy"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phân Nhóm Nguồn Gốc</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewFoodType("plant")}
                      className={`py-2 text-[10px] font-semibold rounded-xl border transition ${
                        newFoodType === "plant"
                          ? "bg-emerald-650 border-emerald-600 bg-emerald-50 text-emerald-800 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      🌱 Thực vật Chay
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewFoodType("animal")}
                      className={`py-2 text-[10px] font-semibold rounded-xl border transition ${
                        newFoodType === "animal"
                          ? "bg-red-50 border-red-200 text-red-800 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      🥩 Động vật Mặn
                    </button>
                  </div>
                </div>
              </div>

              {/* Danh mục và serving size */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Danh mục con</label>
                  <input
                    type="text"
                    value={newFoodCategory}
                    onChange={(e) => setNewFoodCategory(e.target.value)}
                    placeholder="ví dụ: Đậu & Hạt, Hải Sản..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quy cách Đóng gói/Một suất ăn</label>
                  <input
                    type="text"
                    value={newFoodServingSize}
                    onChange={(e) => setNewFoodServingSize(e.target.value)}
                    placeholder="ví dụ: 100g, 1 bát ăn cơm..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition text-xs"
                    required
                  />
                </div>
              </div>

              {/* Thông số dinh dưỡng trên 100g */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Chỉ số Dinh dưỡng gốc (Giá trị ứng trên 100g thực tế)</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Calo (kcal)</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={newFoodCalories}
                      onChange={(e) => setNewFoodCalories(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs font-mono text-center font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Kali (mg)</label>
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      value={newFoodPotassium}
                      onChange={(e) => setNewFoodPotassium(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs font-mono text-center font-semibold text-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Đạm/Protein (g)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={newFoodProtein}
                      onChange={(e) => setNewFoodProtein(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs font-mono text-center font-semibold text-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Chất béo/Fat (g)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={newFoodFat}
                      onChange={(e) => setNewFoodFat(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs font-mono text-center font-semibold text-slate-700"
                    />
                  </div>
                </div>

                <div className="w-1/2">
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Tinh bột/Carbs (g)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newFoodCarbs}
                    onChange={(e) => setNewFoodCarbs(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none text-xs font-mono text-center font-semibold text-slate-700"
                  />
                </div>
              </div>

              {/* Mô tả ngắn */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả ngắn gọn công dụng cốt lõi</label>
                <textarea
                  value={newFoodDesc}
                  onChange={(e) => setNewFoodDesc(e.target.value)}
                  placeholder="ví dụ: Hạt điều chứa nhiều chất béo chưa bão hòa, bổ não và rất giàu đạm chay."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition text-xs h-16 resize-none"
                />
              </div>

              {/* Tác vụ */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomFoodModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
                >
                  Lưu món ăn tùy biến mới 🌱
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CHÂN FOOTER THƯƠNG HIỆU --- */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-12">
        <p className="font-semibold text-slate-500">FitNutri Việt Nam © 2026</p>
        <p className="mt-1">Nền tảng học thuật Dinh dưỡng Thượng tầng tích hợp Trí tuệ Nhân tạo Gemini 3.5-flash</p>
        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">BMR / TDEE / Mifflin-St Jeor / Potassium Kidney Protection System</p>
      </footer>
    </div>
  );
}
