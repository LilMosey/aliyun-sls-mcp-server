# MCP-SERVER

这是一个 TypeScript + Express 项目骨架，用来承载后续的 MCP 服务。

当前只实现健康检查，不实现具体 MCP 功能。

## 服务规划

- MySQL 元数据 MCP 服务：后续用于告诉大模型某个 MySQL 实例有哪些表、表结构是什么、字段含义是什么，以及是否需要补充索引等建议。
- 阿里云日志 MCP 服务：后续用于封装阿里云日志相关能力。

## 本地启动

```bash
npm install
npm run dev
```

默认端口是 `3000`，可以通过 `.env` 修改：

```bash
cp .env.example .env
```

## 健康检查

```bash
curl http://localhost:3000/health
```

预期返回：

```json
{
  "status": "ok",
  "service": "mcp-server"
}
```

## 常用命令

```bash
npm run typecheck
npm test
npm run build
npm start
```

## 代码结构

- `src/server.ts`：进程入口，负责监听端口。
- `src/app.ts`：Express 应用组装入口。
- `src/config/env.ts`：环境变量读取和校验。
- `src/routes/health.ts`：健康检查路由。
- `src/mcp-services/mysql-metadata`：MySQL 元数据 MCP 服务预留目录。
- `src/mcp-services/aliyun-log`：阿里云日志 MCP 服务预留目录。

## Review TS 代码的建议流程

你对 TypeScript 还不熟，所以每次看 AI 生成的 TS 代码，建议按下面顺序 review：

1. 先看 `package.json`：确认新增依赖是不是必要，脚本命令是否清楚。
2. 再看入口文件：本项目先看 `src/server.ts`，确认服务从哪里启动、监听哪个端口。
3. 再看应用组装：看 `src/app.ts`，确认中间件、路由注册、返回结构是否符合预期。
4. 再看配置读取：看 `src/config/env.ts`，确认环境变量有没有默认值、有没有基本校验。
5. 再看具体路由：看 `src/routes/health.ts`，确认接口路径、状态码、返回 JSON。
6. 最后看测试：看 `tests/health.test.ts`，确认测试覆盖了健康检查返回体；HTTP 路径可以启动服务后用 `curl http://localhost:3000/health` 手动确认。
7. 跑一遍命令：`npm run typecheck`、`npm test`、`npm run build`。

如果你不确定某段 TS，可以重点问三个问题：

- 这个文件对外暴露了什么？
- 这个函数接收什么输入，返回什么输出？
- 这里失败时会发生什么？
