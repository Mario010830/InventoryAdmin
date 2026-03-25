import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReduxProvider } from "../components/ReduxProvider";
import { Toaster } from "@/components/ui/sonner"


export const metadata: Metadata = {
  title: "Strova — Gestión de inventario simple y poderosa",
  description:
    "Controla productos, proveedores, ubicaciones y movimientos de stock desde una sola plataforma.",
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
    <html lang="en" >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body>
        <ReduxProvider>{children}</ReduxProvider>
        <Toaster/>
      </body>
    </html>
  );
}