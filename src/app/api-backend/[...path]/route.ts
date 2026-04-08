import * as http from "node:http";
import * as https from "node:https";
import { URL } from "node:url";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * URL del backend .NET (solo servidor). Prioridad:
 * `API_URL` → `NEXT_PUBLIC_API_URL` → https://localhost:44384
 * Si ya termina en `/api`, no se duplica al construir rutas.
 */
function getApiRoot(): string {
  const raw =
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "https://localhost:44384";
  return raw.replace(/\/$/, "");
}

const apiRoot = getApiRoot();

function isLocalDevApi(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    const u = new URL(apiRoot);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

const allowInsecureTls = isLocalDevApi();

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

function buildTargetUrl(pathSegments: string[], search: string): string {
  const path = pathSegments.join("/");
  const base = apiRoot.endsWith("/api") ? apiRoot : `${apiRoot}/api`;
  return `${base}/${path}${search}`;
}

function forwardRequestHeaders(request: NextRequest): http.OutgoingHttpHeaders {
  const out: http.OutgoingHttpHeaders = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || HOP_BY_HOP.has(lower)) return;
    out[key] = value;
  });
  return out;
}

function forwardResponseHeaders(
  incoming: http.IncomingHttpHeaders
): Headers {
  const out = new Headers();
  for (const [key, value] of Object.entries(incoming)) {
    if (!key || HOP_BY_HOP.has(key.toLowerCase())) continue;
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => out.append(key, v));
    } else {
      out.set(key, value);
    }
  }
  return out;
}

function proxyRequest(
  targetUrl: string,
  method: string,
  headers: http.OutgoingHttpHeaders,
  body: Buffer | null
): Promise<{
  statusCode: number;
  statusMessage: string;
  headers: Headers;
  body: Buffer;
}> {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const isHttps = url.protocol === "https:";
    const port = url.port
      ? Number(url.port)
      : isHttps
        ? 443
        : 80;

    const lib = isHttps ? https : http;
    const req = lib.request(
      {
        hostname: url.hostname,
        port,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        ...(isHttps && allowInsecureTls
          ? { rejectUnauthorized: false }
          : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 502,
            statusMessage: res.statusMessage ?? "",
            headers: forwardResponseHeaders(res.headers),
            body: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on("error", reject);
    if (body && body.length > 0) {
      req.write(body);
    }
    req.end();
  });
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  if (!segments?.length) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const target = buildTargetUrl(segments, request.nextUrl.search);
  const headers = forwardRequestHeaders(request);

  let bodyBuf: Buffer | null = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const ab = await request.arrayBuffer();
    bodyBuf = Buffer.from(ab);
  }

  try {
    const res = await proxyRequest(
      target,
      request.method,
      headers,
      bodyBuf
    );
    return new NextResponse(new Uint8Array(res.body), {
      status: res.statusCode,
      statusText: res.statusMessage,
      headers: res.headers,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream error";
    const body: Record<string, string> = {
      message: "No se pudo conectar con la API.",
      detail: message,
    };
    if (process.env.NODE_ENV === "development") {
      body.upstreamUrl = target;
    }
    return NextResponse.json(body, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
