import { ListProjectRequest } from "@alicloud/sls20201230/dist/models/ListProjectRequest.js";
import type { Project } from "@alicloud/sls20201230/dist/models/Project.js";

import { createAliyunLogClient } from "./client.js";

export interface ListProjectsOptions {
  projectName?: string;
  offset?: number;
  size?: number;
}

export async function listProjects(options: ListProjectsOptions = {}) {
  const client = createAliyunLogClient();
  const response = await client.listProject(
    new ListProjectRequest({
      projectName: options.projectName,
      offset: options.offset ?? 0,
      size: options.size ?? 100,
      fetchQuota: false
    })
  );

  const body = response.body;

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
