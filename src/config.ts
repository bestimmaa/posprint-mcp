export type TransportMode = "stdio" | "http";

const DEFAULT_HTTP_PORT = 3000;

export function getTransportMode(env: NodeJS.ProcessEnv = process.env): TransportMode {
  return env.MCP_TRANSPORT === "http" ? "http" : "stdio";
}

export function getHttpPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PORT;
  if (!raw) {
    return DEFAULT_HTTP_PORT;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }

  return port;
}

export function getAuthToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const token = env.POSPRINT_AUTH_TOKEN;
  return token && token.length > 0 ? token : undefined;
}

export function getDefaultPrinterUri(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const uri = env.PRINTER_URI;
  return uri && uri.trim().length > 0 ? uri : undefined;
}
