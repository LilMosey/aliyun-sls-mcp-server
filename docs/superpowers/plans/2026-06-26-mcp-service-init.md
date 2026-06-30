# MCP 服务初始化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 初始化 TypeScript + Express MCP 服务骨架，并只提供健康检查。

**Architecture:** `src/server.ts` 负责启动进程，`src/app.ts` 负责组装 Express 应用，`src/routes/health.ts` 提供健康检查，`src/config/env.ts` 集中读取环境变量。MySQL 元数据 MCP 服务和阿里云日志 MCP 服务先只保留目录，不实现功能。

**Tech Stack:** TypeScript、Node.js、Express、Vitest、MCP SDK。

---

### Task 1: 项目配置

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.env.example`

- [x] **Step 1: 创建 npm 和 TypeScript 配置**

配置 `dev`、`build`、`start`、`test`、`typecheck` 脚本，并使用严格 TypeScript 配置。

- [x] **Step 2: 创建环境变量示例**

提供 `PORT=3000` 和 `SERVICE_NAME=aliyun-sls-mcp-server`。

### Task 2: 健康检查服务

**Files:**
- Create: `src/server.ts`
- Create: `src/app.ts`
- Create: `src/config/env.ts`
- Create: `src/routes/health.ts`
- Create: `tests/health.test.ts`

- [x] **Step 1: 先写健康检查测试**

测试健康检查响应体为 `{ "status": "ok", "service": "aliyun-sls-mcp-server" }`。当前沙箱不允许测试进程监听临时端口，所以 HTTP 路径通过启动服务后 `curl http://localhost:3000/health` 验证。

- [x] **Step 2: 实现 Express 应用和健康检查路由**

实现 `createApp()`，挂载 JSON 中间件、根路径信息和 `/health` 路由。

- [x] **Step 3: 实现服务入口**

`src/server.ts` 调用 `createApp()` 并监听配置端口。

### Task 3: MCP 服务目录和中文文档

**Files:**
- Create: `src/mcp-services/mysql-metadata/.gitkeep`
- Create: `src/mcp-services/aliyun-log/.gitkeep`
- Create: `README.md`
- Create: `AGENTS.md`

- [x] **Step 1: 创建 MCP 服务预留目录**

保留 MySQL 元数据 MCP 服务和阿里云日志 MCP 服务的目录边界。

- [x] **Step 2: 创建中文 README**

说明项目定位、启动方式、健康检查、代码结构和 TS review 流程。

- [x] **Step 3: 创建项目记忆**

记录用户偏好、项目定位和后续 TS 代码 review 要求。

### Task 4: 验证与发布

**Files:**
- Modify: `package-lock.json`

- [ ] **Step 1: 安装依赖**

Run: `npm install`

- [ ] **Step 2: 运行验证**

Run:

```bash
npm run typecheck
npm test
npm run build
```

- [ ] **Step 3: 初始化 git 并推送**

Run:

```bash
git init
git remote add origin https://github.com/LilMosey/aliyun-sls-mcp-server.git
git add -A
git commit -m "chore: initialize mcp server"
git branch -M main
git push -u origin main
```
