import { GetHistogramsRequest } from "@alicloud/sls20201230/dist/models/GetHistogramsRequest.js";
import type {
  GetHistogramsResponse,
  GetHistogramsResponseBody
} from "@alicloud/sls20201230/dist/models/GetHistogramsResponse.js";

import { errorToLogFields, logger } from "../../utils/logger.js";
import { createAliyunLogClient } from "./client.js";
import { readAliyunLogQueryConfig } from "./config.js";
import {
  buildEffectiveQuery,
  buildWarnings,
  resolveLogTarget,
  resolveTimeRange
} from "./logs.js";
import type { QueryLogsOptions } from "./logs.js";

export type QueryHistogramsOptions = Omit<
  QueryLogsOptions,
  "pageNumber" | "pageSize" | "reverse"
>;

export interface QueryHistogramBucket {
  from: number;
  to: number;
  count: number;
  progress?: string;
}

export interface QueryHistogramsResult {
  environment: string;
  projectName: string;
  logstoreName: string;
  from: number;
  to: number;
  query: string;
  total: number;
  progress?: string;
  warnings: string[];
  histograms: QueryHistogramBucket[];
}

function normalizeHistogramBucket(
  bucket: GetHistogramsResponseBody
): QueryHistogramBucket {
  return {
    from: bucket.from ?? 0,
    to: bucket.to ?? 0,
    count: bucket.count ?? 0,
    progress: bucket.progress
  };
}

function resolveHistogramProgress(histograms: QueryHistogramBucket[]) {
  if (histograms.some((histogram) => histogram.progress === "Incomplete")) {
    return "Incomplete";
  }

  if (histograms.some((histogram) => histogram.progress === "Complete")) {
    return "Complete";
  }

  return undefined;
}

export async function queryHistograms(
  options: QueryHistogramsOptions
): Promise<QueryHistogramsResult> {
  const target = resolveLogTarget(options);
  const config = readAliyunLogQueryConfig();
  const query = buildEffectiveQuery(options);
  const { from, to } = resolveTimeRange(options, config);
  const startedAt = Date.now();

  const client = createAliyunLogClient();
  logger.info("Calling Aliyun Log GetHistograms.", {
    operation: "aliyun-log.getHistograms",
    environment: target.environment,
    projectName: target.projectName,
    logstoreName: target.logstoreName,
    from,
    to,
    query
  });

  let response: GetHistogramsResponse;
  try {
    response = await client.getHistograms(
      target.projectName,
      target.logstoreName,
      new GetHistogramsRequest({
        from,
        to,
        query
      })
    );
  } catch (error) {
    logger.error("Aliyun Log GetHistograms failed.", {
      operation: "aliyun-log.getHistograms",
      durationMs: Date.now() - startedAt,
      environment: target.environment,
      projectName: target.projectName,
      logstoreName: target.logstoreName,
      from,
      to,
      query,
      ...errorToLogFields(error)
    });
    throw error;
  }

  const histograms = (response.body ?? []).map(normalizeHistogramBucket);
  const total = histograms.reduce(
    (sum, histogram) => sum + histogram.count,
    0
  );
  const progress = resolveHistogramProgress(histograms);

  logger.info("Aliyun Log GetHistograms succeeded.", {
    operation: "aliyun-log.getHistograms",
    durationMs: Date.now() - startedAt,
    environment: target.environment,
    projectName: target.projectName,
    logstoreName: target.logstoreName,
    from,
    to,
    query,
    total,
    count: histograms.length,
    progress
  });

  return {
    environment: target.environment,
    projectName: target.projectName,
    logstoreName: target.logstoreName,
    from,
    to,
    query,
    total,
    progress,
    warnings: buildWarnings(query),
    histograms
  };
}
