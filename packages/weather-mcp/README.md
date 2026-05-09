# weather-mcp

天气预报 MCP，用于集成 Agent，在天气将要下雨的时候通知你带伞。

## Usage

Set the required environment variable:

```bash
export APPCODE=your_app_code
```

Start from the monorepo root:

```bash
pnpm start:weather
```

Or start this package directly:

```bash
pnpm --filter weather-mcp start
```

Default endpoint:

```text
http://localhost:7777/mcp
```
