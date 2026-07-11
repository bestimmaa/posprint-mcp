import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getAuthToken, getHttpPort } from "../config.js";
import { createServer } from "../server.js";
import { isAuthenticatedRequest } from "./auth.js";

const MCP_PATH = "/mcp";
const HEALTHZ_PATH = "/healthz";

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendJsonRpcError(res: ServerResponse, statusCode: number, code: number, message: string): void {
  sendJson(res, statusCode, {
    jsonrpc: "2.0",
    error: { code, message },
    id: null
  });
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.length === 0) {
    return undefined;
  }

  return JSON.parse(raw);
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    sendJsonRpcError(res, 405, -32000, "Method not allowed. This server only supports stateless POST requests.");
    return;
  }

  let parsedBody: unknown;
  try {
    parsedBody = await readJsonBody(req);
  } catch {
    sendJsonRpcError(res, 400, -32700, "Parse error: invalid JSON body.");
    return;
  }

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, parsedBody);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      sendJsonRpcError(res, 500, -32603, "Internal server error");
    }
  }
}

export async function startHttpServer(): Promise<import("node:http").Server> {
  const authToken = getAuthToken();
  if (!authToken) {
    throw new Error(
      "MCP_TRANSPORT=http requires POSPRINT_AUTH_TOKEN to be set. Refusing to start an unauthenticated remote printer endpoint."
    );
  }

  const port = getHttpPort();

  const httpServer = createHttpServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === HEALTHZ_PATH) {
      sendJson(res, 200, { status: "ok" });
      return;
    }

    if (url.pathname !== MCP_PATH) {
      sendJsonRpcError(res, 404, -32601, "Not found");
      return;
    }

    if (!isAuthenticatedRequest(req, authToken)) {
      sendJsonRpcError(res, 401, -32001, "Unauthorized: missing or invalid bearer token");
      return;
    }

    void handleMcpRequest(req, res);
  });

  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, () => {
      const address = httpServer.address();
      const boundPort = typeof address === "object" && address ? address.port : port;
      console.error(`posprint-mcp listening on port ${boundPort} (${MCP_PATH})`);
      resolve(httpServer);
    });
  });
}
