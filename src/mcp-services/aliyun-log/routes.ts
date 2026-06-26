import { Router } from "express";

import { readAliyunLogConfig } from "./config.js";
import { listProjects } from "./projects.js";

export const aliyunLogRouter = Router();

aliyunLogRouter.get("/projects", async (request, response, next) => {
  try {
    const projectName =
      typeof request.query.projectName === "string"
        ? request.query.projectName
        : readAliyunLogConfig().defaultProjectName;
    const offset =
      typeof request.query.offset === "string"
        ? Number(request.query.offset)
        : undefined;
    const size =
      typeof request.query.size === "string"
        ? Number(request.query.size)
        : undefined;

    const result = await listProjects({
      projectName,
      offset,
      size
    });

    response.json(result);
  } catch (error) {
    next(error);
  }
});
