import { GetLogsRequest } from "@alicloud/sls20201230/dist/models/GetLogsRequest.js";
import type { GetLogsResponse } from "@alicloud/sls20201230/dist/models/GetLogsResponse.js";

import { errorToLogFields, logger } from "../../utils/logger.js";
import { createAliyunLogClient } from "./client.js";
import {
  readAliyunLogEnvironmentConfig,
  readAliyunLogQueryConfig
} from "./config.js";

export interface QueryLogsOptions {
  environment?: string;
  projectName?: string;
  logstoreName?: string;
  query?: string;
  from?: number;
  to?: number;
  minutes?: number;
  pageNumber?: number;
  pageSize?: number;
  reverse?: boolean;
}

export interface QueryLogsNextPage {
  environment?: string;
  projectName?: string;
  logstoreName?: string;
  query: string;
  from: number;
  to: number;
  pageNumber: number;
  pageSize: number;
  reverse: boolean;
}

export interface QueryLogsResult {
  environment: string;
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
  nextPage?: QueryLogsNextPage;
  count: number;
  progress?: string;
  warnings: string[];
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

interface QueryConfig {
  defaultQueryMinutes: number;
  maxQueryMinutes: number;
  emptyQueryMaxMinutes: number;
  defaultPageSize: number;
  maxPageSize: number;
}

interface LogTarget {
  source: "environment" | "direct";
  environment: string;
  projectName: string;
  logstoreName: string;
}

function assertNonEmpty(value: string, name: string) {
  if (!value.trim()) {
    throw new Error(`${name} cannot be empty.`);
  }
}

function assertInteger(value: number, name: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer.`);
  }
}

function assertPositiveInteger(value: number, name: string) {
  assertInteger(value, name);
  if (value <= 0) {
    throw new Error(`${name} must be greater than 0.`);
  }
}

function resolveTimeRange(options: QueryLogsOptions, config: QueryConfig) {
  const hasFrom = options.from !== undefined;
  const hasTo = options.to !== undefined;
  const hasMinutes = options.minutes !== undefined;

  if ((hasFrom || hasTo) && hasMinutes) {
    throw new Error("from/to and minutes cannot be used at the same time.");
  }

  let from: number;
  let to: number;

  if (hasFrom || hasTo) {
    if (!hasFrom || !hasTo) {
      throw new Error("from and to must be provided together.");
    }

    from = options.from as number;
    to = options.to as number;
    assertInteger(from, "from");
    assertInteger(to, "to");
  } else {
    const query = options.query?.trim() ?? "";
    const defaultMinutes = query
      ? config.defaultQueryMinutes
      : Math.min(config.defaultQueryMinutes, config.emptyQueryMaxMinutes);
    const minutes = options.minutes ?? defaultMinutes;
    assertPositiveInteger(minutes, "minutes");

    to = Math.floor(Date.now() / 1000);
    from = to - minutes * 60;
  }

  if (from >= to) {
    throw new Error("from must be less than to.");
  }

  const rangeMinutes = Math.ceil((to - from) / 60);
  const query = options.query?.trim() ?? "";
  const maxMinutes = query
    ? config.maxQueryMinutes
    : config.emptyQueryMaxMinutes;

  if (rangeMinutes > maxMinutes) {
    throw new Error(
      `Query time range cannot exceed ${maxMinutes} minutes for ${
        query ? "non-empty" : "empty"
      } query.`
    );
  }

  return { from, to };
}

function resolveLogTarget(options: QueryLogsOptions): LogTarget {
  const hasProjectName = options.projectName !== undefined;
  const hasLogstoreName = options.logstoreName !== undefined;

  if (hasProjectName || hasLogstoreName) {
    if (options.environment) {
      throw new Error(
        "environment cannot be used together with projectName/logstoreName."
      );
    }

    if (!options.projectName || !options.logstoreName) {
      throw new Error(
        "projectName and logstoreName must be provided together."
      );
    }

    assertNonEmpty(options.projectName, "projectName");
    assertNonEmpty(options.logstoreName, "logstoreName");

    return {
      source: "direct",
      environment: "custom",
      projectName: options.projectName,
      logstoreName: options.logstoreName
    };
  }

  const { defaultEnvironment, environments } = readAliyunLogEnvironmentConfig();
  const environment = options.environment ?? defaultEnvironment;
  const target = environments[environment];

  if (!target) {
    throw new Error(
      `Unknown aliyun log environment: ${environment}. Allowed environments: ${Object.keys(
        environments
      ).join(", ")}.`
    );
  }

  return {
    source: "environment",
    environment,
    projectName: target.projectName,
    logstoreName: target.logstoreName
  };
}

function resolvePage(options: QueryLogsOptions, config: QueryConfig) {
  const pageNumber = options.pageNumber ?? 1;
  const pageSize = options.pageSize ?? config.defaultPageSize;

  assertPositiveInteger(pageNumber, "pageNumber");
  assertPositiveInteger(pageSize, "pageSize");

  if (config.defaultPageSize > config.maxPageSize) {
    throw new Error(
      "ALIYUN_LOG_DEFAULT_PAGE_SIZE cannot be greater than ALIYUN_LOG_MAX_PAGE_SIZE."
    );
  }

  if (pageSize > config.maxPageSize) {
    throw new Error(
      `pageSize cannot be greater than configured max page size ${config.maxPageSize}.`
    );
  }

  return {
    pageNumber,
    pageSize,
    offset: (pageNumber - 1) * pageSize
  };
}

function pickString(log: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = log[name];
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return undefined;
}

function normalizeLog(log: Record<string, unknown>) {
  return {
    time: pickString(log, ["time", "__time__", "_time_"]),
    level: pickString(log, ["level"]),
    containerName: pickString(log, [
      "_container_name_",
      "__container_name__",
      "containerName"
    ]),
    podName: pickString(log, ["_pod_name_", "__pod_name__", "podName"]),
    namespace: pickString(log, [
      "_namespace_",
      "__namespace__",
      "namespace"
    ]),
    content: pickString(log, ["content", "message"]),
    raw: log
  };
}

function buildWarnings(query: string) {
  const warnings: string[] = [];

  if (query.includes("|")) {
    warnings.push(
      "当前 query 看起来包含分析语句；阿里云 GetLogs 对分析语句可能会忽略 line/offset，分页建议在 SQL 中使用 limit/offset。"
    );
  }

  return warnings;
}

function buildNextPage(
  target: LogTarget,
  query: string,
  from: number,
  to: number,
  pageNumber: number,
  pageSize: number,
  reverse: boolean,
  hasMore: boolean
): QueryLogsNextPage | undefined {
  if (!hasMore) {
    return undefined;
  }

  const common = {
    query,
    from,
    to,
    pageNumber: pageNumber + 1,
    pageSize,
    reverse
  };

  if (target.source === "environment") {
    return {
      environment: target.environment,
      ...common
    };
  }

  return {
    projectName: target.projectName,
    logstoreName: target.logstoreName,
    ...common
  };
}

export async function queryLogs(
  options: QueryLogsOptions
): Promise<QueryLogsResult> {
  const target = resolveLogTarget(options);
  const config = readAliyunLogQueryConfig();
  const query = options.query?.trim() ?? "";
  const { from, to } = resolveTimeRange(options, config);
  const { pageNumber, pageSize, offset } = resolvePage(options, config);
  const reverse = options.reverse ?? true;
  const startedAt = Date.now();

  const client = createAliyunLogClient();
  logger.info("Calling Aliyun Log GetLogs.", {
    operation: "aliyun-log.getLogs",
    environment: target.environment,
    projectName: target.projectName,
    logstoreName: target.logstoreName,
    from,
    to,
    query,
    reverse,
    pageNumber,
    pageSize,
    offset
  });

  let response: GetLogsResponse;
  try {
    response = await client.getLogs(
      target.projectName,
      target.logstoreName,
      new GetLogsRequest({
        from,
        to,
        query,
        line: pageSize,
        offset,
        reverse
      })
    );
  } catch (error) {
    logger.error("Aliyun Log GetLogs failed.", {
      operation: "aliyun-log.getLogs",
      durationMs: Date.now() - startedAt,
      environment: target.environment,
      projectName: target.projectName,
      logstoreName: target.logstoreName,
      from,
      to,
      query,
      reverse,
      pageNumber,
      pageSize,
      offset,
      ...errorToLogFields(error)
    });
    throw error;
  }

  const logs = (response.body ?? []).map((log) =>
    normalizeLog(log as Record<string, unknown>)
  );
  const hasMore = logs.length === pageSize;
  const nextPage = buildNextPage(
    target,
    query,
    from,
    to,
    pageNumber,
    pageSize,
    reverse,
    hasMore
  );
  logger.info("Aliyun Log GetLogs succeeded.", {
    operation: "aliyun-log.getLogs",
    durationMs: Date.now() - startedAt,
    environment: target.environment,
    projectName: target.projectName,
    logstoreName: target.logstoreName,
    from,
    to,
    query,
    reverse,
    pageNumber,
    pageSize,
    offset,
    count: logs.length,
    hasMore,
    progress: response.headers?.["x-log-progress"]
  });

  return {
    environment: target.environment,
    projectName: target.projectName,
    logstoreName: target.logstoreName,
    from,
    to,
    query,
    reverse,
    page: {
      pageNumber,
      pageSize,
      offset,
      hasMore
    },
    nextPage,
    count: logs.length,
    progress: response.headers?.["x-log-progress"],
    warnings: buildWarnings(query),
    logs
  };
}
