import { ListLogStoresRequest } from "@alicloud/sls20201230/dist/models/ListLogStoresRequest.js";
import type { ListLogStoresResponse } from "@alicloud/sls20201230/dist/models/ListLogStoresResponse.js";

import { errorToLogFields, logger } from "../../utils/logger.js";
import { createAliyunLogClient } from "./client.js";

export interface ListLogStoresOptions {
  projectName: string;
  logstoreName?: string;
  mode?: string;
  offset?: number;
  size?: number;
  telemetryType?: string;
}

export async function listLogStores(options: ListLogStoresOptions) {
  const client = createAliyunLogClient();
  const offset = options.offset ?? 0;
  const size = options.size ?? 200;
  const startedAt = Date.now();

  logger.info("Calling Aliyun Log ListLogStores.", {
    operation: "aliyun-log.listLogStores",
    projectName: options.projectName,
    logstoreName: options.logstoreName,
    mode: options.mode,
    telemetryType: options.telemetryType,
    offset,
    size
  });

  let response: ListLogStoresResponse;
  try {
    response = await client.listLogStores(
      options.projectName,
      new ListLogStoresRequest({
        logstoreName: options.logstoreName,
        mode: options.mode,
        offset,
        size,
        telemetryType: options.telemetryType
      })
    );
  } catch (error) {
    logger.error("Aliyun Log ListLogStores failed.", {
      operation: "aliyun-log.listLogStores",
      durationMs: Date.now() - startedAt,
      projectName: options.projectName,
      logstoreName: options.logstoreName,
      mode: options.mode,
      telemetryType: options.telemetryType,
      offset,
      size,
      ...errorToLogFields(error)
    });
    throw error;
  }

  const body = response.body;
  logger.info("Aliyun Log ListLogStores succeeded.", {
    operation: "aliyun-log.listLogStores",
    durationMs: Date.now() - startedAt,
    projectName: options.projectName,
    logstoreName: options.logstoreName,
    mode: options.mode,
    telemetryType: options.telemetryType,
    offset,
    size,
    total: body?.total ?? 0,
    count: body?.count ?? 0
  });

  return {
    projectName: options.projectName,
    total: body?.total ?? 0,
    count: body?.count ?? 0,
    logstores: body?.logstores ?? []
  };
}
