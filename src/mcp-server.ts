import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import { listLogStores } from "./mcp-services/aliyun-log/logstores.js";
import { queryLogs } from "./mcp-services/aliyun-log/logs.js";
import { listProjects } from "./mcp-services/aliyun-log/projects.js";

export function createMcpServer() {
  const server = new McpServer(
    {
      name: "mcp-service",
      version: "0.1.0"
    },
    {
      capabilities: {
        logging: {}
      }
    }
  );

  server.registerTool(
    "aliyun_log_list_projects",
    {
      title: "查询阿里云日志 Project",
      description:
        "查询当前阿里云日志服务账号在指定区域下可访问的 Project。projectName 不传时查询全部 Project。",
      inputSchema: {
        projectName: z
          .string()
          .optional()
          .describe("Project 名称，支持阿里云 ListProject 的模糊查询。"),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("分页起始位置，默认 0。"),
        size: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("每页数量，默认 100，最大 500。")
      }
    },
    async ({ projectName, offset, size }, extra) => {
      await server.sendLoggingMessage(
        {
          level: "info",
          data: {
            message: "开始查询阿里云日志 Project",
            projectName: projectName ?? null
          }
        },
        extra.sessionId
      );

      const result = await listProjects({
        projectName,
        offset,
        size
      });

      await server.sendLoggingMessage(
        {
          level: "info",
          data: {
            message: "阿里云日志 Project 查询完成",
            count: result.count,
            total: result.total
          }
        },
        extra.sessionId
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  server.registerTool(
    "aliyun_log_list_logstores",
    {
      title: "查询阿里云日志库",
      description:
        "查询某个阿里云日志 Project 下的 Logstore 列表。projectName 必填，logstoreName 支持模糊查询。",
      inputSchema: {
        projectName: z.string().describe("Project 名称，例如 k8s-dev。"),
        logstoreName: z
          .string()
          .optional()
          .describe("Logstore 名称，支持阿里云 ListLogStores 的模糊查询。"),
        mode: z
          .enum(["standard", "query"])
          .optional()
          .describe("Logstore 类型：standard 或 query。"),
        telemetryType: z
          .enum(["None", "Metrics"])
          .optional()
          .describe("数据类型：None 表示日志，Metrics 表示指标。"),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("分页起始位置，默认 0。"),
        size: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("每页数量，默认 200，最大 500。")
      }
    },
    async (
      { projectName, logstoreName, mode, telemetryType, offset, size },
      extra
    ) => {
      await server.sendLoggingMessage(
        {
          level: "info",
          data: {
            message: "开始查询阿里云日志库",
            projectName,
            logstoreName: logstoreName ?? null
          }
        },
        extra.sessionId
      );

      const result = await listLogStores({
        projectName,
        logstoreName,
        mode,
        telemetryType,
        offset,
        size
      });

      await server.sendLoggingMessage(
        {
          level: "info",
          data: {
            message: "阿里云日志库查询完成",
            projectName,
            count: result.count,
            total: result.total
          }
        },
        extra.sessionId
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  server.registerTool(
    "aliyun_log_query_logs",
    {
      title: "查询阿里云日志",
      description:
        "查询指定 Project + Logstore 的日志。有 query 时默认最近 15 分钟，空 query 默认最近 5 分钟，支持 pageNumber/pageSize 分页。",
      inputSchema: {
        projectName: z.string().describe("Project 名称，例如 k8s-dev。"),
        logstoreName: z.string().describe("Logstore 名称，例如 test。"),
        query: z
          .string()
          .optional()
          .describe("阿里云日志查询语句；不传或空字符串表示查询时间范围内的日志。"),
        from: z
          .number()
          .int()
          .optional()
          .describe("查询开始时间，Unix 秒级时间戳，需要和 to 同时传。"),
        to: z
          .number()
          .int()
          .optional()
          .describe("查询结束时间，Unix 秒级时间戳，需要和 from 同时传。"),
        minutes: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("查询最近多少分钟；不能和 from/to 同时传。"),
        pageNumber: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("页码，从 1 开始，默认 1。"),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("每页日志条数，默认 50，最大 100。"),
        reverse: z
          .boolean()
          .optional()
          .describe("是否按时间倒序返回，默认 true。")
      }
    },
    async (
      {
        projectName,
        logstoreName,
        query,
        from,
        to,
        minutes,
        pageNumber,
        pageSize,
        reverse
      },
      extra
    ) => {
      await server.sendLoggingMessage(
        {
          level: "info",
          data: {
            message: "开始查询阿里云日志",
            projectName,
            logstoreName,
            query: query ?? null,
            pageNumber: pageNumber ?? 1
          }
        },
        extra.sessionId
      );

      const result = await queryLogs({
        projectName,
        logstoreName,
        query,
        from,
        to,
        minutes,
        pageNumber,
        pageSize,
        reverse
      });

      await server.sendLoggingMessage(
        {
          level: "info",
          data: {
            message: "阿里云日志查询完成",
            projectName,
            logstoreName,
            count: result.count,
            hasMore: result.page.hasMore,
            progress: result.progress ?? null
          }
        },
        extra.sessionId
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  return server;
}
