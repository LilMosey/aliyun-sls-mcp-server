# 阿里云日志 GetLogs MCP 分阶段计划

## 目标

基于阿里云日志服务 `GetLogs` API，提供可用于生产环境的 MCP 日志查询能力。整体目标不是简单透传接口，而是让大模型可以安全、稳定、分页地查询生产日志，并逐步支持常见排障场景。

## 现状

当前项目已经具备：

- 查询当前账号可访问的 Project：`aliyun_log_list_projects`
- 查询某个 Project 下的 Logstore：`aliyun_log_list_logstores`
- Streamable HTTP MCP 服务：`POST /mcp`
- Stateful session：支持 `mcp-session-id`
- SSE 长连接：支持服务端 logging notification

下一步要接入的是阿里云 `GetLogs` API。

## 总体原则

- 生产环境必须限制单次返回量，但要支持分页继续查询。
- 查询必须有明确的 Project、Logstore 和时间范围。
- 默认查询最近 15 分钟，最大时间范围通过配置控制。
- 单页最多 100 条，符合 `GetLogs` 的 `line` 最大值。
- 不直接把 SDK 原始响应丢给大模型，要整理成稳定结构。
- 错误返回要标准化，方便定位权限、参数、索引、超时等问题。
- 后续所有排障工具都复用底层 `queryLogs` 能力。

## V1：生产可用的 GetLogs 查询底座

### 要做什么

新增 MCP 工具：

```text
aliyun_log_query_logs
```

新增 HTTP 调试接口：

```text
GET /aliyun-log/projects/:projectName/logstores/:logstoreName/logs
```

### 工具参数

```ts
{
  projectName: string;
  logstoreName: string;
  query?: string;
  from?: number;
  to?: number;
  minutes?: number;
  pageNumber?: number;
  pageSize?: number;
  reverse?: boolean;
}
```

### 参数规则

- `projectName` 必填。
- `logstoreName` 必填。
- `from/to` 和 `minutes` 二选一。
- 如果都不传，默认最近 15 分钟。
- `pageNumber` 默认 1。
- `pageSize` 默认 50，最大 100。
- `reverse` 默认 `true`，优先返回最新日志。
- 空 `query` 允许，但空查询的最大时间范围更小。
- 非空 `query` 也必须受最大时间范围限制。

### 配置项

```bash
ALIYUN_LOG_DEFAULT_QUERY_MINUTES=15
ALIYUN_LOG_MAX_QUERY_MINUTES=30
ALIYUN_LOG_EMPTY_QUERY_MAX_MINUTES=5
ALIYUN_LOG_DEFAULT_PAGE_SIZE=50
ALIYUN_LOG_MAX_PAGE_SIZE=100
```

### 返回结构

```ts
{
  projectName: string;
  logstoreName: string;
  from: number;
  to: number;
  query: string;
  reverse: boolean;
  page: {
    pageNumber: number;
    pageSize: number;
    offset: number;
    hasMore: boolean;
  };
  count: number;
  logs: Array<{
    time?: string;
    level?: string;
    containerName?: string;
    podName?: string;
    namespace?: string;
    content?: string;
    raw: Record<string, unknown>;
  }>;
}
```

### 验收标准

- 可以通过 HTTP 接口查询指定 Project + Logstore 的日志。
- 可以通过 MCP 工具查询同样的数据。
- 不传时间时默认最近 15 分钟。
- `pageNumber/pageSize` 能正确转换成 `offset/line`。
- 超过最大时间范围会返回明确错误。
- 超过最大 `pageSize` 会返回明确错误。
- 编译通过：`npm run typecheck`、`npm run build`。

## V2：常用排障工具

### 要做什么

基于 V1 的 `queryLogs` 能力新增三个 MCP 工具：

```text
aliyun_log_query_recent_errors
aliyun_log_query_service_errors
aliyun_log_query_trace
```

### `aliyun_log_query_recent_errors`

查询某个 Project + Logstore 最近 N 分钟错误日志。

参数：

```ts
{
  projectName: string;
  logstoreName: string;
  minutes?: number;
  pageNumber?: number;
  pageSize?: number;
}
```

初始查询语句：

```text
level: ERROR
```

### `aliyun_log_query_service_errors`

查询某个 Project + Logstore 下，一批服务的 ERROR 日志。

参数：

```ts
{
  projectName: string;
  logstoreName: string;
  containerNames: string[];
  minutes?: number;
  pageNumber?: number;
  pageSize?: number;
}
```

基于字段：

```text
__container_name__
```

### `aliyun_log_query_trace`

通过 traceId 查询链路日志。

参数：

```ts
{
  projectName: string;
  logstoreNames: string[];
  traceId: string;
  minutes?: number;
  pageSize?: number;
}
```

第一阶段先在 `content` 里查 traceId。后续如果有独立 traceId 索引字段，再改为字段查询。

### 验收标准

- 三个工具都复用 V1 的时间、分页、返回结构和错误处理。
- 可以查询最近错误、一批服务错误和 traceId 日志。
- 多 Logstore trace 查询可以按 Logstore 分组返回。

## V3：生产安全增强

### 要做什么

补齐生产环境需要的安全和治理能力。

能力包括：

- Project 白名单。
- Logstore 白名单。
- 不同 Project 配置不同最大查询时间范围。
- 查询审计日志。
- 敏感字段脱敏。
- 查询超时控制。
- 返回内容长度限制。
- 禁止高风险查询组合。

### 建议配置

```bash
ALIYUN_LOG_ALLOWED_PROJECTS=k8s-dev,k8s-prod
ALIYUN_LOG_ALLOWED_LOGSTORES=test,test-user-platform
ALIYUN_LOG_QUERY_TIMEOUT_MS=10000
ALIYUN_LOG_MAX_CONTENT_LENGTH=2000
ALIYUN_LOG_AUDIT_ENABLED=true
```

### 脱敏范围

优先处理：

- `authorization`
- `token`
- `accessToken`
- `refreshToken`
- 手机号
- 身份证
- 邮箱

### 验收标准

- 未在白名单里的 Project / Logstore 不允许查询。
- 查询参数、时间范围、返回条数都会记录审计日志。
- 敏感字段不会原样返回给 MCP 客户端。
- 查询超时有明确错误。

## V4：诊断增强

### 要做什么

在安全查询基础上增加面向排障的聚合和摘要能力。

能力包括：

- 错误日志按服务聚合。
- 错误日志按异常类型聚合。
- trace 日志按时间排序。
- 找出最早错误。
- 找出错误最多的服务。
- 返回排障摘要。
- 根据 Logstore 索引信息提示查询建议。

### 可能新增工具

```text
aliyun_log_summarize_errors
aliyun_log_analyze_trace
aliyun_log_suggest_query_fields
```

### 验收标准

- 能给出结构化排障摘要。
- 摘要必须附带来源日志样例。
- 不在没有证据的情况下给确定性根因结论。
- 对缺少索引字段的查询给出提示。

## 推荐执行顺序

1. 先实现 V1：`aliyun_log_query_logs`。
2. 用真实 Project / Logstore 验证 GetLogs 权限、query 语法和分页。
3. 再实现 V2 的三个排障工具。
4. 在生产环境开放前完成 V3 的白名单、审计和脱敏。
5. 最后实现 V4 的聚合和诊断能力。

## 当前下一步

下一步建议开始实现 V1：

```text
aliyun_log_query_logs
```

它是后续所有日志查询和排障工具的底座。
