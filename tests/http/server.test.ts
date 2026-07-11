import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/printing/posprintClient.js", () => ({
  printMarkdown: vi.fn()
}));

const ORIGINAL_ENV = { ...process.env };

async function importFreshServerModule() {
  vi.resetModules();
  return import("../../src/http/server.js");
}

function baseUrl(server: Server): string {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server is not listening on a TCP port");
  }
  return `http://127.0.0.1:${address.port}`;
}

describe("startHttpServer", () => {
  let server: Server | undefined;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.PORT = "0";
    process.env.POSPRINT_AUTH_TOKEN = "test-secret-token";
  });

  afterEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    if (server) {
      await new Promise((resolve) => server!.close(resolve));
      server = undefined;
    }
  });

  it("refuses to start without POSPRINT_AUTH_TOKEN", async () => {
    delete process.env.POSPRINT_AUTH_TOKEN;
    const { startHttpServer } = await importFreshServerModule();

    await expect(startHttpServer()).rejects.toThrow(/POSPRINT_AUTH_TOKEN/);
  });

  it("responds to /healthz without authentication", async () => {
    const { startHttpServer } = await importFreshServerModule();
    server = await startHttpServer();

    const response = await fetch(`${baseUrl(server)}/healthz`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("rejects /mcp requests without a bearer token", async () => {
    const { startHttpServer } = await importFreshServerModule();
    server = await startHttpServer();

    const response = await fetch(`${baseUrl(server)}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    expect(response.status).toBe(401);
  });

  it("rejects /mcp requests with an invalid bearer token", async () => {
    const { startHttpServer } = await importFreshServerModule();
    server = await startHttpServer();

    const response = await fetch(`${baseUrl(server)}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer wrong-token" },
      body: JSON.stringify({})
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 for unknown paths", async () => {
    const { startHttpServer } = await importFreshServerModule();
    server = await startHttpServer();

    const response = await fetch(`${baseUrl(server)}/unknown`);
    expect(response.status).toBe(404);
  });

  it("handles an authenticated MCP initialize request", async () => {
    const { startHttpServer } = await importFreshServerModule();
    server = await startHttpServer();

    const response = await fetch(`${baseUrl(server)}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: "Bearer test-secret-token"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "vitest", version: "1.0" }
        }
      })
    });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("\"serverInfo\"");
    expect(body).toContain("posprint-mcp");
  });
});
