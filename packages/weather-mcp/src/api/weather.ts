process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import Request from "./request.js";
import to from "await-to-js";
import type {
  forecast24hoursParams,
  Forecast24hoursResult,
  CitySearchParams,
  CitySearchResult,
  CityInfo,
} from "./type";
export class WeatherClient {
  private appCode: string;
  constructor(appCode: string) {
    this.appCode = appCode;
  }

  // 获取城市Id
  async getCityIdByName(cityName: string): Promise<CityInfo[]> {
    const headers = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en,zh-CN;q=0.9,zh;q=0.8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      Origin: "https://html5.moji.com",
      Pragma: "no-cache",
      Referer: "https://html5.moji.com/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "sec-ch-ua":
        '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    };
    const request = new Request(this.appCode, "https://ssch.api.moji.com");
    const [err, res] = await to(
      request.post<CitySearchParams, CitySearchResult>(
        "citySearch",
        {
          keyWord: cityName,
        },
        headers
      )
    );
    if (err) {
      throw new Error(err.message || "获取城市ID失败");
    }
    return (res?.city_list || []) as CityInfo[];
  }

  // 获取天气预报
  async getWeather(cityId: number): Promise<Forecast24hoursResult> {
    const request = new Request(this.appCode, "https://aliv18.data.moji.com");

    const data = {
      cityId,
    };
    // 直接用 request 实例的 post 方法
    const [err, res] = await to(
      request.post<forecast24hoursParams, Forecast24hoursResult>(
        "forecast24hours",
        data
      )
    );
    if (err) {
      throw new Error(err.message || "获取天气失败");
    }
    return res;
  }
}
