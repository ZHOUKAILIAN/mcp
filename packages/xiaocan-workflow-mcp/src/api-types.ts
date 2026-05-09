// ============================================================
// XiaoCan API type definitions — based on real captured traffic
// ============================================================

// --- Auth config (persisted) ---

export interface AuthData {
  token: string;         // X-Sivir JWT
  userId: number;        // X-Vayne
  silkId: number;        // x-Teemo
  cityCode: number;      // default city code
  updatedAt: string;
}

// --- RPC response ---

export interface RpcStatus {
  code: number;
  msg?: string;
}

export interface RpcEnvelope<T = unknown> {
  status: RpcStatus;
  [key: string]: unknown;
}

// --- Store / Promotion ---

export interface StoreBrief {
  store_id: number;
  name: string;
  longitude: number;
  latitude: number;
  icon: string;
  opening_hours?: string;
  store_platform?: number;
  address?: string;
}

export interface PromotionItem {
  id: number;
  name?: string;
  promotion_type?: number;
  store?: StoreBrief;
  icon?: string;
  banners?: string[];
  register_start_time?: number;
  register_end_time?: number;
  begin_hour?: number;
  begin_min?: number;
  end_hour?: number;
  end_min?: number;
  rebate_condition?: number;
  distance?: number;
  meituan_status?: PlatformStatus;
  eleme_status?: PlatformStatus;
  tp_promotion?: ThirdPartyStatus;
  num_extra_reward?: number;
  extra_reward_amount?: number;
  rebate_order_num?: number;
  left_order_num?: number;
}

export interface PlatformStatus {
  status: number;
  stock: number;
  price: number;
  rebate: number;
}

export interface ThirdPartyStatus {
  status?: number;
  tp_status?: number;
  stock: number;
  price: number;
  rebate: number;
}

export interface StoreInfo {
  name: string;
  storeId: number;
  promotionId: number;
  type: number;          // 1=美团 2=饿了么 3=京东
  startTime: string;
  endTime: string;
  openHours: string;
  leftNumber: number;
  distance: number;
  price: number;         // 满多少 (元)
  rebatePrice: number;   // 返多少 (元)
  rebateCondition: number; // 99=无需评价 2=图文评价
  icon: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

// --- Promotion Order ---

export interface PromotionOrder {
  promotion_order_id: number;
  order_id_str: string;
  status?: number;
  store_promotion?: {
    store?: StoreBrief;
    promotion?: PromotionItem;
  };
  create_time?: number;
  order_amount?: number;
  cashback_amount?: number;
}

// --- User Info ---

export interface UserInfo {
  silk_id: number;
  nickname: string;
  avatar: string;
  phone: string;
  real_name?: string;
  silk: number;
  withdrawing: number;
  withdraw_total: number;
  completed_number: number;
  register_time: number;
  invite_user_number: number;
  status: number;
}

// --- Address ---

export interface AddressVO {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  adcode: number;
  province: string;
  city: string;
  district: string;
}

// --- Grab order ---

export interface GrabOrderResult {
  success: boolean;
  message: string;
  promotionId: number;
  orderId?: string;
  promotionOrderId?: number;
  timeout?: number;
  rawResponse?: unknown;
}

// --- Mappings ---

export const PlatformType: Record<number, string> = {
  1: "美团",
  2: "饿了么",
  3: "京东",
};

export const RebateCondition: Record<number, string> = {
  99: "无需评价",
  2: "图文评价",
};

// --- Common city codes ---

export const CityCodes: Record<string, number> = {
  "上海": 310100, "北京": 110100, "广州": 440100, "深圳": 440300,
  "杭州": 330100, "成都": 510100, "武汉": 420100, "南京": 320100,
  "苏州": 320500, "重庆": 500000, "西安": 610100, "长沙": 430100,
};
