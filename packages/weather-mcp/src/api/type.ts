export type ApiConfig = {
  [apiName: string]: {
    path: string;
    token?: string;
  };
};
export type forecast24hoursParams = {
  cityId: number;
};

export interface Forecast24hoursCity {
  cityId: number;
  counname: string;
  ianatimezone: string;
  name: string;
  pname: string;
  secondaryname: string;
  timezone: string;
}

export interface Forecast24hoursHourly {
  condition: string;
  conditionId: string;
  date: string;
  hour: string;
  humidity: string;
  iconDay: string;
  iconNight: string;
  pop: string;
  pressure: string;
  qpf: string;
  realFeel: string;
  snow: string;
  temp: string;
  updatetime: string;
  uvi: string;
  windDegrees: string;
  windDir: string;
  windSpeed: string;
  windlevel: string;
}

export interface Forecast24hoursResult {
  city: Forecast24hoursCity;
  hourly: Forecast24hoursHourly[];
}

export interface CitySearchParams {
  keyWord: string;
}
export interface CityInfo {
  id: number;
  parentId: number;
  name: string;
  pname: string;
  counname: string;
  localName: string;
  localPname: string;
  localCounname: string;
  latitude: string;
  longtitude: string;
  city_lable: Record<string, unknown>[];
  cityId: number;
  cityType: number;
}

export interface CitySearchResult {
  city_list: CityInfo[];
}
