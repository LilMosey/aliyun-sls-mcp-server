# MCP 服务初始化设计

## 目标

初始化一个 TypeScript + Express 项目，作为后续 MCP 服务的基础工程。当前只实现健康检查，不实现 MySQL 元数据或阿里云日志的具体功能。

## 范围

本次只包含：

- Express 服务骨架。
- 健康检查接口。
- TypeScript 编译配置。
- 基础测试和构建脚本。
- MySQL 元数据 MCP 服务预留目录。
- 阿里云日志 MCP 服务预留目录。
- 中文 README。
- 当前项目记忆 `AGENTS.md`。

本次不包含：

- 连接 MySQL。
- 读取 MySQL 表结构。
- 生成索引建议。
- 连接阿里云日志。
- 实现 MCP tool/resource/prompt。

## 架构

服务入口是 `src/server.ts`，只负责启动 HTTP 服务。Express 应用在 `src/app.ts` 中组装，便于测试直接创建 app，而不需要真的监听端口。配置读取集中在 `src/config/env.ts`，健康检查路由放在 `src/routes/health.ts`。

后续 MCP 服务代码放在 `src/mcp-services` 下，按服务拆分目录：

- `mysql-metadata`：MySQL 实例元数据 MCP 服务。
- `aliyun-log`：阿里云日志 MCP 服务。

## 健康检查

`GET /health` 返回：

```json
{
  "status": "ok",
  "service": "mcp-server"
}
```

## Review 重点

用户对 TypeScript 不熟悉，所以每次生成 TS 代码后，需要说明从哪些文件开始看、每个文件负责什么、运行哪些命令验证。
