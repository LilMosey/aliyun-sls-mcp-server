import { z } from "zod/v4";

export const aliyunLogToolNames = {
  listProjects: "aliyun_log_list_projects",
  listLogstores: "aliyun_log_list_logstores",
  queryLogs: "aliyun_log_query_logs"
} as const;

export const listProjectsToolConfig = {
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
};

export const listLogstoresToolConfig = {
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
};

export const queryLogsToolConfig = {
  title: "查询阿里云日志",
  description:
    "查询阿里云 SLS 日志，用于线上故障排查、日常研发查日志、服务报错日志查询、traceId/TID 链路日志查询。用户提到 test、staging 等环境，某个服务/容器的日志，最近 N 分钟报错日志，error/warn/info 日志，traceId/TID 查询时，应优先使用本工具。环境请传 environment，服务名请传 containerNames，日志级别请传 level，traceId/TID 请传 traceId。也支持直接传 query 使用阿里云 SLS 查询语法。优先传 environment，不传默认 test；也可以直接传 projectName + logstoreName 调试。服务端会把 query、containerNames、level、traceId、keywords 用 and 拼成最终查询条件。传 traceId 且不传 from/to/minutes 时默认查最近 7 天；普通非空查询默认最近 15 分钟。分页时如果返回 nextPage，下一次调用应直接使用 nextPage 参数，避免重新计算时间窗口。",
  inputSchema: {
    environment: z
      .string()
      .optional()
      .describe(
        "日志环境名称，例如 test、staging。不传时使用默认环境 test。用户说“测试环境”“staging 环境”等，一般映射到这个参数。"
      ),
    projectName: z
      .string()
      .optional()
      .describe("Project 名称，例如 k8s-dev。临时调试时可和 logstoreName 一起传。"),
    logstoreName: z
      .string()
      .optional()
      .describe("Logstore 名称，例如 test。临时调试时可和 projectName 一起传。"),
    query: z
      .string()
      .optional()
      .describe(
        "阿里云 SLS 原生查询语句。用户已经给出完整查询条件时传这里，例如 (_container_name_:order-service or _container_name_:pay-service) and level:error。可以和 containerNames、level、traceId、keywords 混用。"
      ),
    containerNames: z
      .array(z.string())
      .optional()
      .describe(
        "服务名/容器名列表，例如 lbk-crm-teacher-web-api、order-service、pay-service。用户说“查某个服务的日志/报错日志”时，一般传这里；多个服务会用 or 查询。"
      ),
    level: z
      .enum(["info", "warn", "error"])
      .optional()
      .describe(
        "日志级别，只支持 info、warn、error。用户说“报错日志”“错误日志”“error 日志”时，一般传 error。"
      ),
    traceId: z
      .string()
      .optional()
      .describe(
        "traceId 或 TID，用于查询整条链路日志，会拼成 content: \"traceId\"。不传时间范围时默认最近 7 天。"
      ),
    keywords: z
      .array(z.string())
      .optional()
      .describe("内容关键字列表，每个关键字会拼成 content: \"keyword\"，多个关键字用 and 连接。"),
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
      .describe("页码，从 1 开始，默认 1。翻页时优先使用上次返回的 nextPage.pageNumber。"),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("每页日志条数，默认 50，最大 100。"),
    reverse: z.boolean().optional().describe("是否按时间倒序返回，默认 true。")
  }
};
