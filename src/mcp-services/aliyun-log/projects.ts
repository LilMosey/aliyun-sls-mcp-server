import { ListProjectRequest } from "@alicloud/sls20201230/dist/models/ListProjectRequest.js";
import type { ListProjectResponse } from "@alicloud/sls20201230/dist/models/ListProjectResponse.js";
import type { Project } from "@alicloud/sls20201230/dist/models/Project.js";

import { errorToLogFields, logger } from "../../utils/logger.js";
import { createAliyunLogClient } from "./client.js";

export interface ListProjectsOptions {
  projectName?: string;
  offset?: number;
  size?: number;
}

export async function listProjects(options: ListProjectsOptions = {}) {
  const client = createAliyunLogClient();
  const offset = options.offset ?? 0;
  const size = options.size ?? 100;
  const startedAt = Date.now();

  logger.info("Calling Aliyun Log ListProject.", {
    operation: "aliyun-log.listProject",
    projectName: options.projectName,
    offset,
    size
  });

  let response: ListProjectResponse;
  try {
    response = await client.listProject(
      new ListProjectRequest({
        projectName: options.projectName,
        offset,
        size,
        fetchQuota: false
      })
    );
  } catch (error) {
    logger.error("Aliyun Log ListProject failed.", {
      operation: "aliyun-log.listProject",
      durationMs: Date.now() - startedAt,
      projectName: options.projectName,
      offset,
      size,
      ...errorToLogFields(error)
    });
    throw error;
  }

  const body = response.body;
  logger.info("Aliyun Log ListProject succeeded.", {
    operation: "aliyun-log.listProject",
    durationMs: Date.now() - startedAt,
    projectName: options.projectName,
    offset,
    size,
    total: body?.total ?? 0,
    count: body?.count ?? 0
  });

  return {
    total: body?.total ?? 0,
    count: body?.count ?? 0,
    projects:
      body?.projects?.map((project: Project) => ({
        projectName: project.projectName,
        description: project.description,
        region: project.region,
        status: project.status,
        createTime: project.createTime,
        lastModifyTime: project.lastModifyTime
      })) ?? []
  };
}
