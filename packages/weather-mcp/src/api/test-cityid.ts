import { WeatherClient } from "./weather.js";

async function test() {
  const appCode = "42d4d6ef385140b7b34779015fee189a"; // 替换为你的真实AppCode
  const weatherClient = new WeatherClient(appCode);
  const cityName = "杭州";
  try {
    const cityIdList = await weatherClient.getCityIdByName(cityName);
    if (!cityIdList.length) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `未找到城市“${cityName}”的ID，请检查名称是否正确`,
          },
        ],
      };
    }
    const response = await weatherClient.getWeather(cityIdList[0].cityId);
    const hourly = response.hourly || [];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ hourly }),
        },
      ],
    };
  } catch (err) {
    console.error("查询失败：", err);
  }
}

test();
