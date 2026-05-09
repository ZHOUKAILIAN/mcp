process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import to from "await-to-js";
import { ApiConfig } from "./type";
class Request {
  private baseUrl: string;
  private headers: Record<string, string>;
  private apiMap: ApiConfig = {
    forecast24hours: {
      path: "/whapi/json/alicityweather/forecast24hours",
      token: "008d2ad9197090c5dddc76f583616606",
    },
    limit: {
      path: "/whapi/json/alicityweather/limit",
      token: "27200005b3475f8b0e26428f9bfb13e9",
    },
    aqi: {
      path: "/whapi/json/alicityweather/aqi",
      token: "8b36edf8e3444047812be3a59d27bab9",
    },
    lifeIndex: {
      path: "/whapi/json/alicityweather/index",
      token: "5944a84ec4a071359cc4f6928b797f91",
    },
    forecast15days: {
      path: "/whapi/json/alicityweather/forecast15days",
      token: "f9f212e1996e79e0e602b08ea297ffb0",
    },
    alert: {
      path: "/whapi/json/alicityweather/alert",
      token: "7ebe966ee2e04bbd8cdbc0b84f7f3bc7",
    },
    condition: {
      path: "/whapi/json/alicityweather/condition",
      token: "50b53ff8dd7d9fa320d3d3ca32cf8ed1",
    },
    aqiforecast5days: {
      path: "/whapi/json/alicityweather/aqiforecast5days",
      token: "0418c1f4e5e66405d33556418189d2d0",
    },
    citySearch: {
      path: "/citymanage/json/h5/searchCity",
    },
  };
  private appCode: string;
  constructor(
    appCode: string,
    baseUrl: string,
    headers?: Record<string, string>
  ) {
    this.appCode = appCode;
    this.baseUrl = baseUrl;
    this.headers = {
      ...headers,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    };
  }

  // 请求拦截器（可自定义扩展）
  private requestInterceptor(config: RequestInit): RequestInit {
    return config;
  }

  // 响应拦截器（可自定义扩展）
  private async responseInterceptor(response: Response) {
    if (!response.ok) {
      // 这里可以统一处理错误
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = (await response.json()) as {
      data: unknown;
    };
    return result.data !== undefined ? result.data : result;
  }

  async get<Q, T>(api: string, params?: Q): Promise<T> {
    let query = params ? "?" + new URLSearchParams(params).toString() : "";
    const url = this.apiMap[api].path;
    const config: RequestInit = {
      method: "GET",
      headers: this.headers,
    };
    const interceptedConfig = this.requestInterceptor(config);
    const [fetchErr, response] = await to(
      fetch(this.baseUrl + url + query, interceptedConfig)
    );
    if (fetchErr) {
      throw new Error(fetchErr.message || `请求接口${url}失败`);
    }
    const [err, res] = await to(this.responseInterceptor(response));
    if (err) {
      throw new Error(err.message || `解析接口${url}响应失败`);
    }
    return res as T;
  }
  async post<Q, T>(
    api: string,
    data?: Q,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const apiToken = this.apiMap[api].token;
    const bodyData = Object.fromEntries(
      Object.entries({
        ...data,
        ...(apiToken && { token: apiToken }),
      }).map(([k, v]) => [k, v === undefined || v === null ? "" : String(v)])
    );
    if (apiToken) {
      headers = {
        ...headers,
        Authorization: `APPCODE ${this.appCode}`,
      };
    }
    const config: RequestInit = {
      method: "POST",
      headers: {
        ...this.headers,
        ...headers,
      },
      body: new URLSearchParams(bodyData).toString(),
    };
    const url = this.apiMap[api].path;
    const interceptedConfig = this.requestInterceptor(config);
    const [fetchErr, response] = await to(
      fetch(this.baseUrl + url, interceptedConfig)
    );
    if (fetchErr) {
      throw new Error(fetchErr.message || `请求接口${url}失败`);
    }
    // 再用 await to 包裹 responseInterceptor
    const [err, res] = await to(this.responseInterceptor(response));
    if (err) {
      throw new Error(err.message || `解析接口${url}响应失败`);
    }
    return res as T;
  }
}

export default Request;
