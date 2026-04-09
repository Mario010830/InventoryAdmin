import { type NextRequest, NextResponse } from "next/server";

/** Headers que suelen aceptar túneles para devolver el recurso real */
const TUNNEL_FETCH_HEADERS: Record<string, string> = {
  "ngrok-skip-browser-warning": "true",
  "bypass-tunnel-reminder": "true",
  Accept: "image/*,*/*;q=0.8",
};

/** Hosts permitidos (sin esquema): la API a veces devuelve http y TUNNEL_URL es https — mismos orígenes distintos. */
function allowedImageHosts(): Set<string> {
  const set = new Set<string>();
  const add = (url: string | undefined) => {
    if (!url) return;
    try {
      set.add(new URL(url).host.toLowerCase());
    } catch {
      /* ignore */
    }
  };
  const addHost = (host: string) => {
    const h = host.trim().toLowerCase();
    if (h) set.add(h);
  };
  add(process.env.TUNNEL_URL);
  add(process.env.API_IMAGE_ORIGIN);
  add(process.env.NEXT_PUBLIC_API_IMAGE_ORIGIN);
  add(process.env.NEXT_PUBLIC_API_URL);
  add("http://inventorydevelop.us-east-2.elasticbeanstalk.com");
  add("https://inventorydevelop.us-east-2.elasticbeanstalk.com");
  add("http://162.220.165.172:5000");
  add("https://162.220.165.172:5000");
  /** Menú El Yerro / CDN de imágenes del scraper */
  add("https://elyerromenu.com");
  add("https://www.elyerromenu.com");
  /** Lista extra: "host1,host2" o URLs completas separadas por coma */
  const extra = process.env.NEXT_PUBLIC_PROXY_IMAGE_HOSTS ?? "";
  for (const part of extra.split(",")) {
    const p = part.trim();
    if (!p) continue;
    if (p.startsWith("http://") || p.startsWith("https://")) add(p);
    else addHost(p);
  }
  return set;
}

function resolveTargetUrl(pathParam: string): string | null {
  const p = pathParam.trim();
  if (!p) return null;

  const allowedHosts = allowedImageHosts();

  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      const u = new URL(p);
      if (allowedHosts.has(u.host.toLowerCase())) return p;
    } catch {
      return null;
    }
    return null;
  }

  const base =
    process.env.TUNNEL_URL?.replace(/\/$/, "") ??
    process.env.API_IMAGE_ORIGIN?.replace(/\/$/, "") ??
    "http://inventorydevelop.us-east-2.elasticbeanstalk.com";
  const pathPart = p.startsWith("/") ? p : `/${p}`;
  try {
    const joined = new URL(pathPart, `${base}/`);
    if (allowedHosts.has(joined.host.toLowerCase())) return joined.href;
  } catch {
    return null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return new NextResponse("Missing path", { status: 400 });
  }

  let target: string | null;
  try {
    target = resolveTargetUrl(decodeURIComponent(path));
  } catch {
    return new NextResponse("Invalid path", { status: 400 });
  }

  if (!target) {
    return new NextResponse("URL not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(target, {
      headers: TUNNEL_FETCH_HEADERS,
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status });
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const buf = await upstream.arrayBuffer();

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }
}
