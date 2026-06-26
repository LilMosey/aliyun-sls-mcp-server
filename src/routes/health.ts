import { Router } from "express";

import { env } from "../config/env.js";

export const healthRouter = Router();

export function getHealthResponse() {
  return {
    status: "ok",
    service: env.serviceName
  };
}

healthRouter.get("/", (_request, response) => {
  response.json(getHealthResponse());
});
