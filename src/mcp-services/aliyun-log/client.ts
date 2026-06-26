import { createRequire } from "node:module";

import type { ListProjectRequest } from "@alicloud/sls20201230/dist/models/ListProjectRequest.js";
import type { ListProjectResponse } from "@alicloud/sls20201230/dist/models/ListProjectResponse.js";

import { readAliyunLogConfig } from "./config.js";

interface AliyunLogClient {
  listProject(request: ListProjectRequest): Promise<ListProjectResponse>;
}

type AliyunLogClientConstructor = new (config: {
  accessKeyId: string;
  accessKeySecret: string;
  regionId: string;
  endpoint: string;
}) => AliyunLogClient;

const require = createRequire(import.meta.url);
const slsSdk = require("@alicloud/sls20201230") as {
  default: AliyunLogClientConstructor;
};

export function createAliyunLogClient() {
  const config = readAliyunLogConfig();

  return new slsSdk.default({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    regionId: config.region,
    endpoint: config.endpoint
  });
}
