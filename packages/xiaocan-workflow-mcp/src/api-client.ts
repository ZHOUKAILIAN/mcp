import crypto from "crypto";
import type {
  AddressVO,
  AuthData,
  GrabOrderResult,
  PromotionItem,
  PromotionOrder,
  StoreInfo,
  UserInfo,
} from "./api-types.js";

export const BASE_URL = "https://gw.xiaocantech.com/rpc";
const PAGE_SIZE = 20;

// ---- Shared config ----

let authConfig: Partial<AuthData> = {};

export function setAuth(config: Partial<AuthData>): void {
  authConfig = { ...authConfig, ...config };
}

export function getAuth(): Partial<AuthData> {
  return { ...authConfig };
}

// ---- UUID / Nami ----

function generateNami(): string {
  const hex = Array.from({ length: 32 }, () =>
    "0123456789abcdef"[Math.floor(Math.random() * 16)]
  ).join("");
  // silkId (1 digit) + 15 random digits = 16 chars
  const silkId = String(authConfig.silkId ?? 0).slice(0, 1);
  return silkId + hex.slice(0, 15);
}

// ---- Auth hash ----

function md5(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

function generateAshe(server: string, method: string, ts: number, nami: string): string {
  const plain = `${server}.${method}`.toLowerCase();
  return md5(md5(plain) + ts + nami);
}

// ---- Shared headers ----

function buildHeaders(server: string, method: string): Record<string, string> {
  const nami = generateNami();
  const ts = Date.now();
  const ashe = generateAshe(server, method, ts, nami);
  const city = String(authConfig.cityCode ?? 0);

  const headers: Record<string, string> = {
    "servername": server,
    "methodname": method,
    "X-Ashe": ashe,
    "X-Nami": nami,
    "X-Garen": String(ts),
    "X-Platform": "Android",
    "x-Annie": "XC",
    "x-channel": "444",
    "X-Version": "3.15.6.5",
    "User-Agent": "XC;Android;3.15.6;",
    "Content-Type": "application/json; charset=utf-8",
    "X-CityCode": city,
    "X-City": city,
    "Host": "gw.xiaocantech.com",
  };

  // Auth headers if we have credentials
  if (authConfig.token) {
    headers["X-Sivir"] = authConfig.token;
  }
  if (authConfig.userId) {
    headers["X-Vayne"] = String(authConfig.userId);
  }
  if (authConfig.silkId) {
    headers["x-Teemo"] = String(authConfig.silkId);
  }

  return headers;
}

async function postRpc(
  server: string,
  method: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const headers = buildHeaders(server, method);

  const resp = await fetch(BASE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`XiaoCan HTTP ${resp.status}: ${resp.statusText}`);
  }

  const data: Record<string, unknown> = await resp.json() as Record<string, unknown>;
  const status = data.status as { code: number; msg?: string } | undefined;
  if (status?.code !== 0) {
    throw new Error(
      `XiaoCan error [${status?.code}]: ${status?.msg ?? "unknown"}`
    );
  }

  return data;
}

// ---- Parse helpers ----

function safeDivide(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null || b == null || b === 0) return 0;
  return Math.round((a / b) * 100) / 100;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parsePromotion(raw: Record<string, unknown>): StoreInfo[] {
  const results: StoreInfo[] = [];

  // Common fields (Fusion/Explore/old formats differ)
  const store = raw.store as Record<string, unknown> | undefined;
  const name = (raw.name ?? store?.name ?? "") as string;
  const storeId = (raw.id ?? store?.store_id ?? store?.id ?? 0) as number;
  const promotionId = (raw.id ?? raw.promotion_id ?? 0) as number;
  const openHours = (raw.opening_hours ?? store?.opening_hours ?? "") as string;
  const rebateCondition = (raw.rebate_condition ?? 0) as number;
  const distance = (raw.distance ?? 0) as number;
  const icon = (raw.icon ?? store?.icon ?? "") as string;
  const address = (raw.address ?? store?.address ?? "") as string;
  const lat = (raw.latitude ?? store?.latitude) as number | undefined;
  const lng = (raw.longitude ?? store?.longitude) as number | undefined;

  // Time: can be int or string
  function parseTime(rawH: unknown, rawM: unknown): string {
    const h = typeof rawH === "string" ? parseInt(rawH, 10) : (rawH as number);
    const m = rawM ? (typeof rawM === "string" ? parseInt(rawM, 10) : (rawM as number)) : 0;
    if (h == null || isNaN(h)) return "00:00";
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const startTime = parseTime(
    raw.start_time_hour ?? raw.begin_hour ?? 0,
    raw.start_time_minute ?? raw.begin_min ?? 0
  );
  const endTime = parseTime(
    raw.end_time_hour ?? 0,
    raw.end_time_minute ?? 0
  );

  const base = { name, storeId, promotionId, startTime, endTime, openHours, rebateCondition, distance, icon, address, latitude: lat, longitude: lng };

  // Detect format: new Explore (meituan_status is object), old (meituan_status is number), Fusion (order_money directly)
  const mtStatus = raw.meituan_status;
  const elmStatus = raw.eleme_status;

  if (typeof mtStatus === "object" && mtStatus !== null) {
    // New Explore format: meituan_status/eleme_status are objects
    const mt = mtStatus as Record<string, unknown>;
    if ((mt.status as number) !== 0) {
      results.push({ ...base, type: 1, leftNumber: (mt.stock as number) ?? 0, price: safeDivide(mt.price as number, 100), rebatePrice: safeDivide(mt.rebate as number, 100) });
    }
    if (typeof elmStatus === "object" && elmStatus !== null) {
      const elm = elmStatus as Record<string, unknown>;
      if ((elm.status as number) !== 0) {
        results.push({ ...base, type: 2, leftNumber: (elm.stock as number) ?? 0, price: safeDivide(elm.price as number, 100), rebatePrice: safeDivide(elm.rebate as number, 100) });
      }
    }
  } else if (typeof raw.order_money === "number" || typeof raw.user_rebate === "number") {
    // Fusion Search format: flat fields
    const platform = (raw.store_platform as number) ?? 1;
    results.push({
      ...base,
      type: platform,
      leftNumber: (raw.left_number as number) ?? 0,
      price: safeDivide(raw.order_money as number, 100),
      rebatePrice: safeDivide(raw.user_rebate as number, 100),
    });
  } else {
    // Old GetStorePromotionList format: mtStatus/elmStatus are numbers (0/1)
    if (mtStatus === 1 || (mtStatus as number) > 0) {
      results.push({
        ...base,
        type: 1,
        leftNumber: (raw.meituan_left_number as number) ?? 0,
        price: safeDivide(raw.meituan_order_money as number, 100),
        rebatePrice: safeDivide(raw.meituan_user_rebate as number, 100),
      });
    }
    if (elmStatus === 1 || (elmStatus as number) > 0) {
      results.push({
        ...base,
        type: 2,
        leftNumber: (raw.eleme_left_number as number) ?? 0,
        price: safeDivide(raw.eleme_order_money as number, 100),
        rebatePrice: safeDivide(raw.eleme_user_rebate as number, 100),
      });
    }
    // Third party
    const tp = raw.tp_promotion as Record<string, unknown> | undefined;
    if (tp && tp.tp_status !== 0 && tp.tp_status !== undefined) {
      results.push({
        ...base,
        type: 3,
        leftNumber: (tp.stock as number) ?? 0,
        price: safeDivide(tp.price as number, 100),
        rebatePrice: safeDivide(tp.rebate as number, 100),
      });
    }
  }

  return results;
}

// ---- Public API ----

// 探索页面搜索（App 主要在用这个）
export async function searchStores(params: {
  lat: number;
  lng: number;
  distItem?: number;
  pageNum?: number;
  pageSize?: number;
  isCanOrder?: boolean;
}): Promise<StoreInfo[]> {
  const data = await postRpc("SilkwormExplore", "ExploreMobile.ListExplorePromotionByFilter", {
    silk_id: authConfig.silkId ?? 0,
    loc: { lat: params.lat, lng: params.lng },
    dist_item: params.distItem ?? 30000,
    page: {
      page_num: params.pageNum ?? 1,
      page_size: params.pageSize ?? PAGE_SIZE,
    },
    filter: {
      data_type: 1,
      is_can_order: params.isCanOrder ?? true,
      ids: [],
    },
  });

  const list = data.list as PromotionItem[] | undefined;
  if (!list) return [];
  return list.flatMap(parsePromotion);
}

// 关键词搜索
export async function searchByKeyword(
  keyword: string,
  lat: number,
  lng: number,
  number = 20,
  offset = 0
): Promise<StoreInfo[]> {
  const data = await postRpc("SilkwormFusion", "FusionService.SearchPromotions", {
    number,
    offset,
    silk_id: authConfig.silkId ?? 0,
    lon: lng,
    keyword,
    lat,
  });

  const promotions = data.promotions as PromotionItem[] | undefined;
  if (!promotions) return [];
  return promotions.flatMap(parsePromotion);
}

// 旧版店铺列表
export async function getStoreList(
  lat: number,
  lng: number,
  offset = 0,
  number = PAGE_SIZE
): Promise<StoreInfo[]> {
  const data = await postRpc("Silkworm", "SilkwormService.GetStorePromotionList", {
    store_id: null,
    pcs: null,
    offset,
    ticket: null,
    mills: null,
    latitude: lat,
    city_code: null,
    store_platform: null,
    store_type: null,
    redPack: null,
    promotion_sort: 4,
    has_bonus_stock: null,
    number,
    rand_str: null,
    promotion_filter: null,
    promotion_category: null,
    silk_id: authConfig.silkId ?? 0,
    categories: null,
    store_category: null,
    search_word: null,
    longitude: lng,
    rec_stamp: null,
  });

  const list = data.promotion_list as PromotionItem[] | undefined;
  if (!list) return [];
  return list.flatMap(parsePromotion);
}

// 活动详情
export async function getPromotionDetail(promotionId: number): Promise<StoreInfo[]> {
  const data = await postRpc("Silkworm", "SilkwormService.GetStorePromotionDetail", {
    promotion_id: promotionId,
    silk_id: authConfig.silkId ?? 0,
  });

  const detail = data.promotion_detail as PromotionItem | undefined;
  if (!detail) return [];
  return parsePromotion(detail);
}

// 抢单
export async function grabOrder(
  promotionId: number,
  lat: number,
  lng: number,
  storePlatform = 1
): Promise<GrabOrderResult> {
  try {
    const data = await postRpc("Silkworm", "SilkwormService.GrabPromotionQuota", {
      latitude: lat,
      redpack_id: 200846920, // bonus redpack, hardcoded from capture
      city_code: authConfig.cityCode ?? 0,
      store_platform: storePlatform,
      longitude: lng,
      if_advance_order: false,
      promotion_id: promotionId,
      silk_id: authConfig.silkId ?? 0,
    });

    return {
      success: true,
      message: "抢单成功！本单需在1小时内提交外卖订单",
      promotionId,
      orderId: data.promotion_order_id as string,
      promotionOrderId: data.promotion_order_id as number,
      timeout: data.timeout as number,
      rawResponse: data,
    };
  } catch (e) {
    return {
      success: false,
      message: `抢单失败: ${e instanceof Error ? e.message : String(e)}`,
      promotionId,
    };
  }
}

// 已抢到的订单列表
export async function getPromotionOrders(
  orderStatus = 99 // 99 = all
): Promise<PromotionOrder[]> {
  const data = await postRpc("Silkworm", "SilkwormService.GetPromotionOrderList", {
    silk_id: authConfig.silkId ?? 0,
    order_status: orderStatus,
    offset: 0,
    number: 20,
  });

  return (data.order_list as PromotionOrder[]) ?? [];
}

// 用户信息
export async function getUserInfo(): Promise<UserInfo | null> {
  const data = await postRpc("Silkworm", "SilkwormService.GetClientUserInfo", {
    silk_id: authConfig.silkId ?? 0,
    if_need_notify_status: false,
    if_need_subscribe: false,
  });

  return (data.user_info as UserInfo) ?? null;
}

// 地址搜索
export async function searchAddress(
  keyword: string,
  region = "上海市",
  pageSize = 20
): Promise<AddressVO[]> {
  const data = await postRpc("SilkwormLbs", "SilkwormLbsService.Suggestion", {
    keyword,
    page: 1,
    page_size: pageSize,
    region,
    location: "0.0,0.0",
  });

  const raw = data.result as string;
  if (!raw) return [];

  try {
    const items = JSON.parse(raw) as Record<string, unknown>[];
    return items.map((item) => {
      const loc = item.location as { lat: number; lng: number } | undefined;
      return {
        id: (item.id as string) ?? "",
        title: (item.title as string) ?? "",
        address: (item.address as string) ?? "",
        latitude: loc?.lat ?? 0,
        longitude: loc?.lng ?? 0,
        adcode: (item.adcode as number) ?? 0,
        province: (item.province as string) ?? "",
        city: (item.city as string) ?? "",
        district: (item.district as string) ?? "",
      };
    });
  } catch {
    return [];
  }
}

// 提交订单返现
export async function submitOrder(params: {
  promotionOrderId: number;
  reviewText?: string;
  imageUrls?: string[];
}): Promise<{ success: boolean; message: string; rawResponse?: unknown }> {
  try {
    const data = await postRpc("Silkworm", "SilkwormService.ReviewPromotionOrder", {
      promotion_order_id: params.promotionOrderId,
      review_content: params.reviewText ?? "",
      images: params.imageUrls ?? [],
      silk_id: authConfig.silkId ?? 0,
    });

    return {
      success: true,
      message: "订单已提交，等待审核返现",
      rawResponse: data,
    };
  } catch (e) {
    return {
      success: false,
      message: `提交失败: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
