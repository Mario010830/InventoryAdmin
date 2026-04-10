"use client";

import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import {
  getCatalogPublicOrigin,
  publicStoreCatalogUrl,
  slugifyStoreName,
} from "@/lib/storeCatalogPublicUrl";
import { DetailSection } from "./DetailPrimitives";

export function LocationPublicCatalogSection({
  locationName,
}: {
  locationName: string;
}) {
  const origin = getCatalogPublicOrigin();
  const slug = slugifyStoreName(locationName);

  return (
    <DetailSection title="Catálogo público">
      {!origin ? (
        <p className="gd-catalog-public__hint gd-catalog-public__hint--warn">
          Configura{" "}
          <code className="gd-catalog-public__code">
            NEXT_PUBLIC_CATALOG_URL
          </code>{" "}
          (URL base del catálogo, sin barra final) para generar el enlace y el
          código QR de esta tienda.
        </p>
      ) : (
        <LocationPublicCatalogLinks
          catalogUrl={publicStoreCatalogUrl(origin, locationName)}
          slug={slug}
          locationName={locationName}
        />
      )}
    </DetailSection>
  );
}

function LocationPublicCatalogLinks({
  catalogUrl,
  slug,
  locationName,
}: {
  catalogUrl: string;
  slug: string;
  locationName: string;
}) {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      toast.success("Enlace copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <>
      <p className="gd-catalog-public__slug">
        Slug: <span className="gd-catalog-public__slug-value">{slug}</span>
      </p>
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
          Copiar link de la tienda
        </button>
      </div>
      <div
        className="gd-catalog-public__qr-wrap"
        role="img"
        aria-label="Código QR con el enlace al catálogo público de la tienda"
      >
        <QRCodeSVG
          value={catalogUrl}
          size={168}
          level="M"
          bgColor="#ffffff"
          fgColor="#0f172a"
          title={`QR catálogo ${locationName || "tienda"}`}
        />
      </div>
      <p className="gd-catalog-public__hint">
        Si dos tiendas comparten el mismo nombre visible, el slug coincidirá; el
        catálogo público puede resolver la ambigüedad.
      </p>
    </>
  );
}
