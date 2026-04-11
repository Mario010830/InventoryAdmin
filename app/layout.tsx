import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ReduxProvider } from "../components/ReduxProvider";

/** URLs absolutas en metadata (iconos, OG). En producción define NEXT_PUBLIC_SITE_URL. */
function metadataBaseUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      /* continuar */
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "Tu Cuadre — Gestión de inventario simple y poderosa",
  description:
    "Controla productos, proveedores, ubicaciones y movimientos de stock desde una sola plataforma.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tu Cuadre",
  },
  icons: {
    icon: "/images/logocuadre.png",
    apple: "/images/logocuadre.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F766E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Tu Cuadre" />
        <link rel="apple-touch-icon" href="/images/logocuadre.png" />
      </head>
      <body>
        <ReduxProvider>{children}</ReduxProvider>
        <Toaster />
      </body>
    </html>
  );
}
