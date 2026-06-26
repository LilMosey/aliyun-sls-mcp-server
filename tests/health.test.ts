import { describe, expect, it } from "vitest";

import { getHealthResponse } from "../src/routes/health.js";

describe("health check", () => {
  it("returns service health", async () => {
    expect(getHealthResponse()).toEqual({
      status: "ok",
      service: "mcp-server"
    });
  });
});
