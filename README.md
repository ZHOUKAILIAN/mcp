# MCP Monorepo

个人 MCP monorepo，基于 pnpm workspace。

## Packages

- `packages/weather-mcp`: 天气预报 MCP
- `packages/xiaocan-workflow-mcp`: 小蚕霸王餐 MCP — 支持搜索店铺/活动、本地流程跟踪

## Install

```bash
pnpm install
```

## Typecheck

```bash
pnpm typecheck
```

## Weather MCP

```bash
export APPCODE=your_app_code
pnpm start:weather
# SSE: http://localhost:7777/mcp
```

## XiaoCan MCP

```bash
pnpm start:xiaocan
# SSE: http://localhost:7788/mcp
```

### 工具列表

**小蚕 API 工具（直接调用小蚕 RPC 接口）：**

| 工具 | 说明 |
|------|------|
| `xiaocan-search-stores` | 搜索附近可抢单的店铺，返回距离/返现/名额/评价要求 |
| `xiaocan-get-promotion-detail` | 查看活动详情，列出所有平台（美团/饿了么/京东） |
| `xiaocan-grab-order` | 抢单（申请活动名额），传入 promotionId 和可选开始时间 |
| `xiaocan-search-address` | 搜索地址获取坐标和城市代码 |
| `xiaocan-login` | 设置小蚕登录凭据 |
| `xiaocan-login-status` | 查看登录状态 |
| `xiaocan-get-task-history` | 查看已提交订单记录 |

**本地流程跟踪工具：**

| 工具 | 说明 |
|------|------|
| `create-workflow` | 创建流程记录 |
| `list-workflows` | 列出所有流程 |
| `get-workflow` | 查看单个流程 |
| `update-workflow` | 更新流程字段 |
| `advance-workflow` | 推进流程状态 |
| `next-action` | 获取下一步建议 |
| `review-notes-draft` | 生成评价草稿 |

### 环境变量

| 变量 | 默认值 | 说明 |
|------|------|------|
| `PORT` | `7788` | MCP 服务器端口 |
| `XIAOCAN_CITY_CODE` | `310100` | 默认城市代码（上海） |
| `XIAOCAN_LAT` | `31.23037` | 默认纬度（上海外滩） |
| `XIAOCAN_LNG` | `121.47370` | 默认经度（上海外滩） |
| `XIAOCAN_GRAB_METHOD` | (自动探测) | 抢单 RPC 方法名，需抓包确认后设置 |

### 数据存储

- 工作流记录：`./data/workflows.json`
- 登录凭据：`~/.xiaocan-mcp/auth.json`

### 安全边界

- 抢单结果取决于真实的 RPC 方法名，当前为推测值，需抓包确认
- 不自动下单、不自动评价、不自动提交返现
- 订单提交仍需在小蚕 App 上手动完成
- API 调用使用小蚕微信小程序公开的 RPC 接口，不会绕过风控
