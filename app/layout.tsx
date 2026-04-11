import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ReduxProvider } from "../components/ReduxProvider";

export const metadata: Metadata = {
  title: "Tu Cuadre — Gestión de inventario simple y poderosa",
  description:
    "Controla productos, proveedores, ubicaciones y movimientos de stock desde una sola plataforma.",
  icons: {
    icon: [{ url: "/assets/logocuadre.PNG?v=2", type: "image/png" }],
    apple: "/assets/logocuadre.PNG?v=2",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
      </head>
      <body>
        <ReduxProvider>{children}</ReduxProvider>
        <Toaster />
      </body>
    </html>
  );
}
