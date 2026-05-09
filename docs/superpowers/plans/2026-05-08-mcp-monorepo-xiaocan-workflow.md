# MCP Monorepo and Xiaocan Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current weather MCP repository into a `mcp` monorepo and add a compliant Xiaocan manual workflow MCP.

**Architecture:** The root becomes a pnpm workspace with shared TypeScript defaults. `packages/weather-mcp` keeps the existing weather server behavior. `packages/xiaocan-workflow-mcp` is an independent MCP server with local JSON storage and workflow tools only.

**Tech Stack:** TypeScript, Node.js, pnpm workspaces, `@modelcontextprotocol/sdk`, Express SSE transport, Zod, fs-extra.

---

## File Structure

- Modify `package.json`: make root private workspace package with scripts for both MCP packages.
- Create `pnpm-workspace.yaml`: include `packages/*`.
- Create `tsconfig.base.json`: shared compiler options.
- Modify `tsconfig.json`: root build references for packages.
- Create `packages/weather-mcp/package.json`: weather package metadata and scripts.
- Create `packages/weather-mcp/tsconfig.json`: package-level TypeScript config.
- Move `src/**` to `packages/weather-mcp/src/**`: preserve weather MCP implementation.
- Create `packages/weather-mcp/README.md`: weather package usage.
- Create `packages/xiaocan-workflow-mcp/package.json`: Xiaocan workflow package metadata and scripts.
- Create `packages/xiaocan-workflow-mcp/tsconfig.json`: package-level TypeScript config.
- Create `packages/xiaocan-workflow-mcp/src/types.ts`: workflow types, status schema, transition rules.
- Create `packages/xiaocan-workflow-mcp/src/storage.ts`: JSON-backed repository.
- Create `packages/xiaocan-workflow-mcp/src/server.ts`: MCP tool registration and SSE transport.
- Create `packages/xiaocan-workflow-mcp/src/index.ts`: environment loading and server startup.
- Create `packages/xiaocan-workflow-mcp/README.md`: safety boundary and usage.
- Modify `README.md`: monorepo overview and commands.

### Task 1: Workspace Skeleton

**Files:**
- Modify: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Replace root package metadata**

Root `package.json` must be:

```json
{
  "name": "mcp",
  "version": "1.0.0",
  "private": true,
  "description": "MCP monorepo",
  "scripts": {
    "start:weather": "pnpm --filter weather-mcp start",
    "start:xiaocan": "pnpm --filter xiaocan-workflow-mcp start",
    "typecheck": "pnpm -r typecheck"
  },
  "keywords": [
    "mcp",
    "model-context-protocol"
  ],
  "author": "zhoukailian",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.17.30",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2"
  }
}
```

- [ ] **Step 2: Add pnpm workspace file**

`pnpm-workspace.yaml` must be:

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Add shared TypeScript config**

`tsconfig.base.json` must contain strict ES module Node settings used by both packages.

- [ ] **Step 4: Change root TypeScript config to project references**

Root `tsconfig.json` must reference `packages/weather-mcp` and `packages/xiaocan-workflow-mcp`.

### Task 2: Weather Package Migration

**Files:**
- Create: `packages/weather-mcp/package.json`
- Create: `packages/weather-mcp/tsconfig.json`
- Move: `src/**` to `packages/weather-mcp/src/**`
- Create: `packages/weather-mcp/README.md`

- [ ] **Step 1: Create weather package metadata**

Use package name `weather-mcp`, keep existing runtime dependencies, and define:

```json
{
  "scripts": {
    "start": "tsx --watch src/index.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Move existing source**

Move all current root `src` files into `packages/weather-mcp/src`.

- [ ] **Step 3: Add package tsconfig**

The package config extends `../../tsconfig.base.json`, sets `baseUrl` to `.`, maps `@/*` to `src/*`, includes `src/**/*`, and excludes `node_modules` and `dist`.

- [ ] **Step 4: Verify imports**

Ensure the existing `.js` extension imports still work under `moduleResolution: "node"`.

### Task 3: Xiaocan Workflow Domain and Storage

**Files:**
- Create: `packages/xiaocan-workflow-mcp/package.json`
- Create: `packages/xiaocan-workflow-mcp/tsconfig.json`
- Create: `packages/xiaocan-workflow-mcp/src/types.ts`
- Create: `packages/xiaocan-workflow-mcp/src/storage.ts`

- [ ] **Step 1: Create package metadata**

Use package name `xiaocan-workflow-mcp` with dependencies: `@modelcontextprotocol/sdk`, `dotenv`, `express`, `fs-extra`, and `zod`.

- [ ] **Step 2: Define workflow types**

Statuses must be exactly:

```ts
export const workflowStatuses = [
  "candidate",
  "claimed",
  "takeaway_ordered",
  "received",
  "reviewed",
  "ready_to_submit",
  "submitted",
  "cashback_received",
  "cancelled",
] as const;
```

Allowed transitions must permit linear advancement, cancellation from any non-final state, and no transition out of `cashback_received` or `cancelled`.

- [ ] **Step 3: Implement JSON storage**

Storage must create `data/workflows.json` if missing, preserve records as `{ workflows: WorkflowItem[] }`, and expose `list`, `get`, `create`, `update`, and `advance` methods.

### Task 4: Xiaocan MCP Server

**Files:**
- Create: `packages/xiaocan-workflow-mcp/src/server.ts`
- Create: `packages/xiaocan-workflow-mcp/src/index.ts`

- [ ] **Step 1: Add MCP server**

Register tools:

```text
create-workflow
list-workflows
get-workflow
update-workflow
advance-workflow
next-action
review-notes-draft
```

- [ ] **Step 2: Add HTTP SSE transport**

Use `/mcp` and `/mcp-messages`, matching the weather package transport pattern.

- [ ] **Step 3: Add startup entrypoint**

Load `.env`, default `PORT` to `7788`, and start the Xiaocan workflow server.

### Task 5: Documentation

**Files:**
- Modify: `README.md`
- Create: `packages/weather-mcp/README.md`
- Create: `packages/xiaocan-workflow-mcp/README.md`

- [ ] **Step 1: Document root usage**

Root README must show install, typecheck, and package start commands.

- [ ] **Step 2: Document Xiaocan safety boundary**

Xiaocan README must state that it does not call private APIs, capture app traffic, automate grabbing, publish reviews, or submit cashback.

### Task 6: Verification and Folder Rename

**Files:**
- Verify all modified files.
- Rename folder: `/Users/zhoukailian/Desktop/mySelf/weatherMCP` to `/Users/zhoukailian/Desktop/mySelf/mcp`.

- [ ] **Step 1: Install dependencies**

Run:

```bash
pnpm install
```

Expected: workspace lockfile updates successfully.

- [ ] **Step 2: Typecheck**

Run:

```bash
pnpm typecheck
```

Expected: both packages pass TypeScript checks.

- [ ] **Step 3: Rename repository directory**

From `/Users/zhoukailian/Desktop/mySelf`, run:

```bash
mv weatherMCP mcp
```

Expected: repository path becomes `/Users/zhoukailian/Desktop/mySelf/mcp`.

- [ ] **Step 4: Final status**

Run:

```bash
git status --short
```

Expected: only intentional monorepo, package, docs, and lockfile changes appear.
