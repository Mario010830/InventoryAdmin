"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import {
  getCatalogPublicOrigin,
  publicStoreCatalogUrl,
  slugifyStoreName,
} from "@/lib/storeCatalogPublicUrl";
import { DetailSection } from "./DetailPrimitives";

const QR_SIZE = 152;

export function LocationPublicCatalogSection({
  locationName,
}: {
  locationName: string;
}) {
  const origin = getCatalogPublicOrigin();

  return (
    <DetailSection title="Catálogo público">
      <div className="gd-catalog-public">
        {!origin ? (
          <p className="gd-catalog-public__hint gd-catalog-public__hint--warn">
            El enlace público de la tienda no está activo. Hay que configurar en
            el servidor la variable{" "}
            <code className="gd-catalog-public__code">
              NEXT_PUBLIC_CATALOG_URL
            </code>{" "}
            con la web del catálogo (sin barra al final).
          </p>
        ) : (
          <LocationPublicCatalogLinks
            catalogUrl={publicStoreCatalogUrl(origin, locationName)}
            locationName={locationName}
          />
        )}
      </div>
    </DetailSection>
  );
}

function LocationPublicCatalogLinks({
  catalogUrl,
  locationName,
}: {
  catalogUrl: string;
  locationName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slug = slugifyStoreName(locationName);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const downloadQrPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("No se pudo generar la imagen");
      return;
    }
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-catalogo-${slug}.png`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("QR descargado");
    } catch {
      toast.error("No se pudo descargar el QR");
    }
  }, [slug]);

  return (
    <>
      <a
        href={catalogUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="gd-catalog-public__url"
      >
        {catalogUrl}
      </a>
      <div className="gd-catalog-public__actions">
        <a
          href={catalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="dt-btn-ghost"
        >
          <Icon name="open_in_new" aria-hidden />
          Ver catálogo público
        </a>
        <button type="button" className="dt-btn-ghost" onClick={copyLink}>
          <Icon name="content_copy" aria-hidden />
          Copiar enlace
        </button>
      </div>
      <div className="gd-catalog-public__qr-row">
        <div
          className="gd-catalog-public__qr-wrap"
          role="img"
          aria-label="Código QR del catálogo de la tienda"
        >
          <QRCodeCanvas
            ref={canvasRef}
            value={catalogUrl}
            size={QR_SIZE}
            level="M"
            bgColor="#ffffff"
            fgColor="#0f172a"
            marginSize={2}
          />
        </div>
        <button
          type="button"
          className="dt-btn-ghost gd-catalog-public__qr-download"
          onClick={downloadQrPng}
        >
          <Icon name="download" aria-hidden />
          Descargar QR
        </button>
      </div>
    </>
  );
}
