"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetPublicLocationsQuery,
  useLazyGetPublicCatalogQuery,
} from "@/app/catalog/_service/catalogApi";
import { Icon } from "@/components/ui/Icon";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import type { PublicCatalogItem } from "@/lib/dashboard-types";
import { getProxiedImageSrc } from "@/lib/proxiedImageSrc";

const LOW_STOCK_THRESHOLD = 10;
const DEFAULT_ACCENT = "#0F766E";
const DEFAULT_BG = "rgba(15,118,110,.12)";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return DEFAULT_BG;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function mapApiItemToCard(
  item: PublicCatalogItem,
  formatCup: (n: number) => string,
): {
  id: number;
  cat: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  sc: "s-ok" | "s-lo" | "s-no";
  bg: string;
  cc: string;
  imagenUrl: string | null;
} {
  const stock = item.stockAtLocation ?? 0;
  const sc: "s-ok" | "s-lo" | "s-no" =
    stock <= 0 ? "s-no" : stock < LOW_STOCK_THRESHOLD ? "s-lo" : "s-ok";
  const stockLabel = stock <= 0 ? "Agotado" : `${stock} uds`;
  const cc = item.categoryColor || DEFAULT_ACCENT;
  return {
    id: item.id,
    cat: item.categoryName || "Sin categoría",
    name: item.name,
    sku: item.code || `#${item.id}`,
    price: formatCup(Number(item.precio)),
    stock: stockLabel,
    sc,
    bg: hexToRgba(cc, 0.12),
    cc,
    imagenUrl: item.imagenUrl,
  };
}

const CARD_W = 200;
const GAP = 28;
const STEP = CARD_W + GAP;
const SPEED = 0.6;

export function CatalogSection() {
  const { formatCup } = useDisplayCurrency();
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const rafRef = useRef<number>(0);

  const { data: locations } = useGetPublicLocationsQuery();
  const [fetchCatalog] = useLazyGetPublicCatalogQuery();
  const [mergedItems, setMergedItems] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locations?.length) {
      setMergedItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(locations.map((loc) => fetchCatalog(loc.id).unwrap()))
      .then((results) => {
        const seen = new Set<number>();
        const merged: PublicCatalogItem[] = [];
        for (const list of results) {
          if (!Array.isArray(list)) continue;
          for (const item of list) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              merged.push(item);
            }
          }
        }
        setMergedItems(merged);
      })
      .catch(() => setMergedItems([]))
      .finally(() => setLoading(false));
  }, [locations, fetchCatalog]);

  const products = useMemo(() => {
    if (!mergedItems.length) return [];
    return mergedItems.map((item) => mapApiItemToCard(item, formatCup));
  }, [mergedItems, formatCup]);

  const N = products.length;
  const TOTAL = STEP * N;

  const allCards = useMemo(() => {
    const list: { product: (typeof products)[0]; baseIdx: number }[] = [];
    if (N === 0) return list;
    for (let rep = 0; rep < 3; rep++) {
      products.forEach((p, i) => {
        list.push({ product: p, baseIdx: rep * N + i });
      });
    }
    return list;
  }, [products, N]);

  useEffect(() => {
    const track = trackRef.current;
    const wrap = wrapRef.current;
    if (!track || !wrap || N === 0) return;

    const getCenter = () => wrap.offsetWidth / 2;

    const place = () => {
      const pos = posRef.current;
      const cx = getCenter();
      const cards = track.querySelectorAll<HTMLDivElement>(
        ".catalog-track__card",
      );
      cards.forEach((c, idx) => {
        const raw = -pos + idx * STEP;
        const cx0 = raw + CARD_W / 2 - cx;
        const normDist = cx0 / (STEP * 2.2);
        const clampedDist = Math.max(-1, Math.min(1, normDist));
        const z = -Math.abs(clampedDist) * 180;
        const rotY = clampedDist * 28;
        const scale = 1 - Math.abs(clampedDist) * 0.22;
        const opacity = 1 - Math.abs(clampedDist) * 0.55;
        c.style.left = `${cx - CARD_W / 2 + raw}px`;
        c.style.transform = `translateY(-50%) perspective(1000px) rotateY(${rotY.toFixed(2)}deg) scale(${scale.toFixed(3)}) translateZ(${z.toFixed(1)}px)`;
        c.style.opacity = String(Math.max(0, opacity));
        c.style.zIndex = String(Math.round(scale * 100));
      });
    };

    const loop = () => {
      posRef.current += SPEED;
      if (posRef.current >= TOTAL) posRef.current -= TOTAL;
      place();
      rafRef.current = requestAnimationFrame(loop);
    };

    place();
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [N, TOTAL]);

  return (
    <section className="catalog-section">
      <div className="catalog-section__inner container">
        <header className="catalog-section__hdr">
          <span className="catalog-section__tag">Compra en Tu Cuadre</span>
          <h2 className="catalog-section__ttl">
            Explora productos
            <br />
            <span>y compra fácil</span>
          </h2>
          <p className="catalog-section__sub">
            Entra al catálogo de tu tienda favorita, elige lo que necesitas y
            compra con confianza.
          </p>
        </header>

        <div className="catalog-section__track-wrap" ref={wrapRef}>
          <div className="catalog-section__track" ref={trackRef}>
            {loading && (
              <p className="catalog-section__loading">Cargando productos…</p>
            )}
            {!loading && N === 0 && (
              <p className="catalog-section__empty">
                Aún no hay productos en venta.
              </p>
            )}
            {!loading &&
              allCards.map(({ product: p, baseIdx }) => (
                <div
                  key={`${baseIdx}-${p.id}`}
                  className="catalog-track__card"
                  style={{ top: "50%" }}
                >
                  <div className="catalog-track__card-inner">
                    <div
                      className="catalog-track__card-img"
                      style={{ background: p.bg }}
                    >
                      {p.imagenUrl ? (
                        <img
                          src={getProxiedImageSrc(p.imagenUrl) ?? p.imagenUrl}
                          alt={p.name}
                          className="catalog-track__card-img-el"
                        />
                      ) : (
                        <span className="catalog-track__card-img-icon">
                          <Icon name="inventory_2" />
                        </span>
                      )}
                    </div>
                    <div className="catalog-track__card-info">
                      <div>
                        <p
                          className="catalog-track__card-cat"
                          style={{ color: p.cc }}
                        >
                          {p.cat}
                        </p>
                        <p className="catalog-track__card-name">{p.name}</p>
                        <p className="catalog-track__card-sku">{p.sku}</p>
                      </div>
                      <div className="catalog-track__card-bot">
                        <span className="catalog-track__card-price">
                          {p.price}
                        </span>
                        <span className={`catalog-track__card-stk ${p.sc}`}>
                          {p.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="catalog-section__fade catalog-section__fade--l" />
          <div className="catalog-section__fade catalog-section__fade--r" />
        </div>

        <div className="catalog-section__cta">
          <Link href="/catalog" className="catalog-section__btn">
            Ir a comprar
          </Link>
        </div>
      </div>
    </section>
  );
}
