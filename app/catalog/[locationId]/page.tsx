"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Icon } from "@/components/ui/Icon";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { useFuseSearch } from "@/hooks/useFuseSearch";
import type { PublicCatalogItem } from "@/lib/dashboard-types";
import { getProxiedImageSrc } from "@/lib/proxiedImageSrc";
import { useFavorites } from "@/lib/useFavorites";
import { addItem, setLocation, updateQuantity } from "@/store/cartSlice";
import { useAppDispatch, useAppSelector } from "@/store/store";
import {
  useGetPublicCatalogQuery,
  useGetPublicLocationsQuery,
  useGetPublicTagsQuery,
} from "../_service/catalogApi";
import { useCatalogCtx } from "../layout";

const PRODUCT_FUSE_KEYS = [
  { name: "name" as const, weight: 0.5 },
  { name: "categoryName" as const, weight: 0.25 },
  { name: "description" as const, weight: 0.15 },
  { name: "tags.name" as const, weight: 0.1 },
];

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  return `${parseInt(h.substring(0, 2), 16)}, ${parseInt(h.substring(2, 4), 16)}, ${parseInt(h.substring(4, 6), 16)}`;
}

type SortKey =
  | "default"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc";
type ViewMode = "grid" | "list";

const LOW_STOCK_THRESHOLD = 5;

/* ── Dual-thumb price slider ── */
function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  formatPrice,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  formatPrice: (n: number) => string;
}) {
  const range = max - min || 1;
  const leftPct = ((value[0] - min) / range) * 100;
  const rightPct = ((value[1] - min) / range) * 100;

  return (
    <>
      <div className="filter-price-display">
        <span>{formatPrice(value[0])}</span>
        <span>{formatPrice(value[1])}</span>
      </div>
      <div className="filter-range-wrap">
        <div className="filter-range-track" />
        <div
          className="filter-range-fill"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        <input
          type="range"
          className="filter-range-input"
          min={min}
          max={max}
          step={0.01}
          value={value[0]}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), value[1] - 0.01);
            onChange([v, value[1]]);
          }}
        />
        <input
          type="range"
          className="filter-range-input"
          min={min}
          max={max}
          step={0.01}
          value={value[1]}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), value[0] + 0.01);
            onChange([value[0], v]);
          }}
        />
      </div>
    </>
  );
}

/* ── Sidebar filters (reused in desktop & mobile drawer) ── */
function FilterBody({
  categories,
  cat,
  setCat,
  tags,
  selectedTagSlugs,
  setSelectedTagSlugs,
  sort,
  setSort,
  hideOutOfStock,
  setHideOutOfStock,
  priceRange,
  setPriceRange,
  priceExtent,
  formatPrice,
}: {
  categories: { name: string; color: string; count: number }[];
  cat: string | null;
  setCat: (v: string | null) => void;
  tags: {
    id: number;
    name: string;
    slug: string;
    color: string;
    count: number;
  }[];
  selectedTagSlugs: string[];
  setSelectedTagSlugs: (v: string[] | ((prev: string[]) => string[])) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  hideOutOfStock: boolean;
  setHideOutOfStock: (v: boolean) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  priceExtent: [number, number];
  formatPrice: (n: number) => string;
}) {
  const [visibleTagCount, setVisibleTagCount] = useState(6);

  const toggleTag = (slug: string) => {
    setSelectedTagSlugs((prev) =>
      prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug],
    );
  };

  return (
    <>
      {/* Categorías */}
      {categories.length > 0 && (
        <div className="filter-section">
          <div className="filter-title">Categorías</div>
          <div className="filter-cat-list">
            <button
              type="button"
              className={`filter-cat${!cat ? " filter-cat--active" : ""}`}
              onClick={() => setCat(null)}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`filter-cat${cat === c.name ? " filter-cat--active" : ""}`}
                onClick={() => setCat(cat === c.name ? null : c.name)}
              >
                <span
                  className="filter-cat__dot"
                  style={{ background: c.color }}
                />
                {c.name}
                <span className="filter-cat__count">{c.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Etiquetas */}
      {tags.length > 0 && (
        <div className="filter-section">
          <div className="filter-title">Etiquetas</div>
          <div className="filter-cat-list">
            <button
              type="button"
              className={`filter-cat${selectedTagSlugs.length === 0 ? " filter-cat--active" : ""}`}
              onClick={() => setSelectedTagSlugs([])}
            >
              Todas
            </button>
            {tags.slice(0, visibleTagCount).map((t) => (
              <button
                key={t.slug}
                type="button"
                className={`filter-cat${selectedTagSlugs.includes(t.slug) ? " filter-cat--active" : ""}`}
                onClick={() => toggleTag(t.slug)}
              >
                <span
                  className="filter-cat__dot"
                  style={{ background: t.color }}
                />
                {t.name}
                <span className="filter-cat__count">{t.count}</span>
              </button>
            ))}
            {visibleTagCount < tags.length && (
              <button
                type="button"
                className="filter-cat filter-cat--more"
                onClick={() =>
                  setVisibleTagCount((prev) => Math.min(prev + 6, tags.length))
                }
              >
                Ver más
              </button>
            )}
          </div>
        </div>
      )}

      {/* Price range */}
      <div className="filter-section">
        <div className="filter-title">Precio</div>
        <PriceRangeSlider
          min={priceExtent[0]}
          max={priceExtent[1]}
          value={priceRange}
          onChange={setPriceRange}
          formatPrice={formatPrice}
        />
      </div>

      {/* Availability */}
      <div className="filter-section">
        <div className="filter-title">Disponibilidad</div>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={hideOutOfStock}
            onChange={(e) => setHideOutOfStock(e.target.checked)}
          />
          Solo en stock
        </label>
      </div>

      {/* Sort */}
      <div className="filter-section">
        <div className="filter-title">Ordenar por</div>
        <select
          className="filter-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="default">Relevancia</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
          <option value="name-asc">Nombre: A-Z</option>
          <option value="name-desc">Nombre: Z-A</option>
        </select>
      </div>
    </>
  );
}

/* ── Skeletons ── */
function Skeletons() {
  return (
    <div className="prod-grid">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="skel-card">
          <div className="skel-card__img" />
          <div className="skel-card__body">
            <div className="skel-line skel-line--lg" />
            <div className="skel-line skel-line--md" />
            <div className="skel-line skel-line--price" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Quick-view Modal ── */
function QuickView({
  item,
  onClose,
  onAdd,
  formatPrice,
}: {
  item: PublicCatalogItem;
  onClose: () => void;
  onAdd: () => void;
  formatPrice: (n: number) => string;
}) {
  const isElaborado = item.tipo === "elaborado";
  const sold = isElaborado ? false : item.stockAtLocation === 0;
  const low = isElaborado
    ? false
    : !sold && item.stockAtLocation <= LOW_STOCK_THRESHOLD;
  const cc = item.categoryColor ?? "#3b82f6";

  return (
    <div className="quickview-overlay" onClick={onClose}>
      <div className="quickview" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="quickview__close" onClick={onClose}>
          <Icon name="close" />
        </button>

        <div className="quickview__img-side">
          {item.imagenUrl ? (
            <img
              src={getProxiedImageSrc(item.imagenUrl) ?? item.imagenUrl}
              alt={item.name}
              className="quickview__img"
            />
          ) : (
            <div className="quickview__no-img">
              <Icon name="inventory_2" />
            </div>
          )}
        </div>

        <div className="quickview__body">
          {item.categoryName && (
            <span
              className="quickview__cat"
              style={{
                background: `rgba(${hexToRgb(cc)}, 0.1)`,
                color: cc,
                border: `1px solid rgba(${hexToRgb(cc)}, 0.2)`,
              }}
            >
              {item.categoryName}
            </span>
          )}
          <h2 className="quickview__name">{item.name}</h2>
          {item.description && (
            <p className="quickview__desc">{item.description}</p>
          )}
          <div className="quickview__price">{formatPrice(item.precio)}</div>

          {sold ? (
            <div className="quickview__stock quickview__stock--out">
              <Icon name="block" /> No disponible
            </div>
          ) : isElaborado ? (
            <div className="quickview__stock quickview__stock--ok">
              <Icon name="check_circle" /> Disponible
            </div>
          ) : low ? (
            <div className="quickview__stock quickview__stock--low">
              <Icon name="warning" /> ¡Solo quedan {item.stockAtLocation}{" "}
              unidades!
            </div>
          ) : (
            <div className="quickview__stock quickview__stock--ok">
              <Icon name="check_circle" /> En stock ({item.stockAtLocation}{" "}
              disponibles)
            </div>
          )}

          {item.code && (
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              SKU: {item.code}
            </div>
          )}

          <div className="quickview__actions">
            <button
              type="button"
              className="quickview__add-btn"
              onClick={() => {
                onAdd();
                onClose();
              }}
              disabled={sold}
            >
              <Icon name="add_shopping_cart" />
              {sold ? "Agotado" : "Agregar al carrito"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Product Card ── */
function Card({
  item,
  onQuickView,
  isFavorite,
  onToggleFavorite,
  formatPrice,
}: {
  item: PublicCatalogItem;
  onQuickView: (item: PublicCatalogItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent<HTMLButtonElement>) => void;
  formatPrice: (n: number) => string;
}) {
  const dispatch = useAppDispatch();
  const inCart = useAppSelector((s) =>
    s.cart.items.find((i) => i.productId === item.id),
  );
  const [addAnimating, setAddAnimating] = useState(false);
  const isElaborado = item.tipo === "elaborado";
  const sold = isElaborado ? false : item.stockAtLocation === 0;
  const low = isElaborado
    ? false
    : !sold && item.stockAtLocation <= LOW_STOCK_THRESHOLD;
  const cc = item.categoryColor ?? "#3b82f6";

  const add = () => {
    dispatch(
      addItem({
        productId: item.id,
        name: item.name,
        unitPrice: item.precio,
        quantity: 1,
        imagenUrl: item.imagenUrl,
        stockAtLocation: item.stockAtLocation,
        tipo: item.tipo,
      }),
    );
    setAddAnimating(true);
    window.setTimeout(() => setAddAnimating(false), 200);
  };

  const qty = (q: number) =>
    dispatch(updateQuantity({ productId: item.id, quantity: q }));

  return (
    <div className={`p-card${sold ? " p-card--sold" : ""}`}>
      <div className="p-card__img-area" onClick={() => onQuickView(item)}>
        {item.imagenUrl ? (
          <img
            src={getProxiedImageSrc(item.imagenUrl) ?? item.imagenUrl}
            alt={item.name}
            className="p-card__img"
            loading="lazy"
          />
        ) : (
          <div className="p-card__no-img">
            <Icon name="inventory_2" />
          </div>
        )}
        <div className="p-card__img-top">
          {item.categoryName && (
            <div className="p-card__cat-chip">
              <span
                className="p-card__cat-dot"
                style={{ backgroundColor: cc }}
              />
              <span className="p-card__cat-label">{item.categoryName}</span>
            </div>
          )}
          <FavoriteButton
            active={isFavorite}
            onToggle={(e) => {
              e.stopPropagation();
              onToggleFavorite(e);
            }}
            ariaAdd="Agregar producto a favoritos"
            ariaRemove="Quitar producto de favoritos"
            className="fav-btn--small"
          />
        </div>
        {sold && <span className="p-card__sold-tag">Agotado</span>}
        {low && !isElaborado && (
          <span className="p-card__low-stock">
            ¡Quedan {item.stockAtLocation}!
          </span>
        )}
      </div>

      <div className="p-card__info">
        <div className="p-card__name" onClick={() => onQuickView(item)}>
          {item.name}
        </div>
        {item.description && <p className="p-card__desc">{item.description}</p>}

        <div className="p-card__price-row">
          <span className="p-card__price">{formatPrice(item.precio)}</span>
        </div>

        {sold ? (
          <div className="p-card__avail p-card__avail--no">No disponible</div>
        ) : (
          <div className="p-card__avail p-card__avail--yes">
            {isElaborado ? "Disponible" : "En stock"}
          </div>
        )}

        {!sold &&
          (inCart ? (
            <div className="p-card__qty p-card__qty--active">
              <button
                type="button"
                className="p-card__qty-btn"
                onClick={() => qty(inCart.quantity - 1)}
              >
                −
              </button>
              <span className="p-card__qty-val">{inCart.quantity}</span>
              <button
                type="button"
                className="p-card__qty-btn"
                disabled={
                  !isElaborado && inCart.quantity >= item.stockAtLocation
                }
                onClick={() => qty(inCart.quantity + 1)}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`p-card__add${addAnimating ? " p-card__add--pulse" : ""}`}
              onClick={add}
            >
              <Icon name="add_shopping_cart" /> Agregar
            </button>
          ))}
      </div>
    </div>
  );
}

/* ── Page ── */
export default function CatalogProductsPage() {
  const { formatCup } = useDisplayCurrency();
  const params = useParams();
  const locationId = Number(params.locationId);
  const dispatch = useAppDispatch();
  const { search } = useCatalogCtx();
  const { favoriteProducts, toggleFavoriteProduct, isFavoriteProduct } =
    useFavorites();

  const [cat, setCat] = useState<string | null>(null);
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("default");
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [quickViewItem, setQuickViewItem] = useState<PublicCatalogItem | null>(
    null,
  );
  const [mobileFilters, setMobileFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);

  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useGetPublicCatalogQuery(locationId);
  const { data: locations } = useGetPublicLocationsQuery();
  const { data: publicTagsRaw } = useGetPublicTagsQuery();
  const publicTags = publicTagsRaw ?? [];
  const lastTagsRef = useRef<typeof publicTags>([]);
  if (publicTags.length > 0) lastTagsRef.current = publicTags;
  const tagsStable = publicTags.length > 0 ? publicTags : lastTagsRef.current;

  const loc = locations?.find((l) => l.id === locationId);

  const lat = loc?.latitude ?? loc?.lat ?? null;
  const lng = loc?.longitude ?? loc?.lng ?? null;

  useEffect(() => {
    if (loc) {
      dispatch(
        setLocation({
          id: loc.id,
          name: loc.name,
          whatsAppContact: loc.whatsAppContact ?? null,
          isOpenNow: loc.isOpenNow ?? null,
          todayOpen: loc.todayOpen ?? null,
          todayClose: loc.todayClose ?? null,
        }),
      );
    }
  }, [loc, dispatch]);

  const filteredBySearch = useFuseSearch(
    products ?? [],
    PRODUCT_FUSE_KEYS,
    search,
  );

  const priceExtent = useMemo<[number, number]>(() => {
    if (!products || products.length === 0) return [0, 100];
    let mn = Infinity;
    let mx = -Infinity;
    for (const p of products) {
      if (p.precio < mn) mn = p.precio;
      if (p.precio > mx) mx = p.precio;
    }
    return [Math.floor(mn), Math.ceil(mx)];
  }, [products]);

  useEffect(() => {
    setPriceRange(priceExtent);
  }, [priceExtent]);

  const categories = useMemo(() => {
    const m = new Map<string, { name: string; color: string; count: number }>();
    for (const p of filteredBySearch) {
      if (!p.categoryName) continue;
      const existing = m.get(p.categoryName);
      if (existing) existing.count++;
      else
        m.set(p.categoryName, {
          name: p.categoryName,
          color: p.categoryColor ?? "#3b82f6",
          count: 1,
        });
    }
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredBySearch]);

  const tagsWithCount = useMemo(() => {
    const countBySlug = new Map<string, number>();
    const slugToTag = new Map<
      string,
      { id: number; name: string; color: string; slug: string }
    >();
    for (const t of tagsStable) {
      slugToTag.set(t.slug, {
        id: t.id,
        name: t.name,
        color: t.color ?? "#3b82f6",
        slug: t.slug,
      });
    }
    for (const p of filteredBySearch) {
      const slugs = (p.tagIds ?? [])
        .map((id) => tagsStable.find((t) => t.id === id)?.slug)
        .filter(Boolean) as string[];
      for (const slug of slugs) {
        countBySlug.set(slug, (countBySlug.get(slug) ?? 0) + 1);
      }
    }
    return Array.from(slugToTag.entries())
      .filter(([slug]) => (countBySlug.get(slug) ?? 0) > 0)
      .map(([slug, t]) => ({ ...t, count: countBySlug.get(slug) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredBySearch, tagsStable]);

  const filtered = useMemo(() => {
    let r = [...filteredBySearch];
    if (cat) r = r.filter((p) => p.categoryName === cat);
    if (selectedTagSlugs.length > 0) {
      r = r.filter((p) => {
        const productSlugs = (p.tagIds ?? [])
          .map((id) => tagsStable.find((t) => t.id === id)?.slug)
          .filter(Boolean) as string[];
        return productSlugs.some((s) => selectedTagSlugs.includes(s));
      });
    }
    if (hideOutOfStock)
      r = r.filter((p) => p.tipo === "elaborado" || p.stockAtLocation > 0);
    r = r.filter((p) => p.precio >= priceRange[0] && p.precio <= priceRange[1]);
    switch (sort) {
      case "price-asc":
        r.sort((a, b) => a.precio - b.precio);
        break;
      case "price-desc":
        r.sort((a, b) => b.precio - a.precio);
        break;
      case "name-asc":
        r.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        r.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }
    return r;
  }, [
    filteredBySearch,
    cat,
    selectedTagSlugs,
    hideOutOfStock,
    sort,
    priceRange,
    tagsStable,
  ]);

  /** Agrupación por categoría para presentación (solo render). */
  const sectionsByCategory = useMemo(() => {
    const grouped = filtered.reduce(
      (acc, product) => {
        const key = product.categoryName ?? "Sin categoría";
        if (!acc[key]) {
          acc[key] = {
            name: key,
            color: product.categoryColor ?? "#64748b",
            products: [],
          };
        }
        acc[key].products.push(product);
        return acc;
      },
      {} as Record<
        string,
        { name: string; color: string; products: PublicCatalogItem[] }
      >,
    );
    const sections = Object.values(grouped);
    sections.sort((a, b) => {
      if (a.name === "Sin categoría") return 1;
      if (b.name === "Sin categoría") return -1;
      return a.name.localeCompare(b.name);
    });
    return sections;
  }, [filtered]);

  const favoriteProductEntities = useMemo(() => {
    if (!products || favoriteProducts.length === 0) return [];
    const ids = new Set(favoriteProducts);
    return products.filter((p) => ids.has(String(p.id)));
  }, [products, favoriteProducts]);

  const addFromQuickView = useCallback(
    (item: PublicCatalogItem) => {
      dispatch(
        addItem({
          productId: item.id,
          name: item.name,
          unitPrice: item.precio,
          quantity: 1,
          imagenUrl: item.imagenUrl,
          stockAtLocation: item.stockAtLocation,
          tipo: item.tipo,
        }),
      );
    },
    [dispatch],
  );

  const filterProps = {
    categories,
    cat,
    setCat,
    tags: tagsWithCount,
    selectedTagSlugs,
    setSelectedTagSlugs,
    sort,
    setSort,
    hideOutOfStock,
    setHideOutOfStock,
    priceRange,
    setPriceRange,
    priceExtent,
    formatPrice: formatCup,
  };

  const hasProducts = !isLoading && !isError && products && products.length > 0;

  return (
    <>
      {/* Breadcrumbs + top bar (full width, above the two-column layout) */}
      <div className="breadcrumbs">
        <Link href="/catalog">Tienda</Link>
        <span className="breadcrumbs__sep">/</span>
        <span className="breadcrumbs__current">{loc?.name ?? "Catálogo"}</span>
      </div>

      <div className="prod-topbar">
        <button
          type="button"
          className="prod-mobile-filter-btn"
          onClick={() => setMobileFilters(true)}
        >
          <Icon name="tune" /> Filtros
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1 className="prod-topbar__title">{loc?.name ?? "Catálogo"}</h1>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}
          >
            {loc && (loc.todayOpen || loc.todayClose) && (
              <span className="prod-topbar__schedule">
                Hoy: {loc.todayOpen ?? "—"} - {loc.todayClose ?? "—"}
              </span>
            )}
            {lat != null &&
              lng != null &&
              !Number.isNaN(lat) &&
              !Number.isNaN(lng) && (
                <a
                  href={`https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prod-topbar__maps"
                >
                  <span className="prod-topbar__maps-icon">
                    <Icon name="location_on" />
                  </span>
                  <span>Ver en Google Maps</span>
                </a>
              )}
          </div>
        </div>

        {hasProducts && (
          <span className="prod-topbar__count">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        )}

        <div className="prod-topbar__view">
          <button
            type="button"
            className={`prod-topbar__view-btn${view === "grid" ? " prod-topbar__view-btn--active" : ""}`}
            onClick={() => setView("grid")}
            title="Vista cuadrícula"
          >
            <Icon name="grid_view" />
          </button>
          <button
            type="button"
            className={`prod-topbar__view-btn${view === "list" ? " prod-topbar__view-btn--active" : ""}`}
            onClick={() => setView("list")}
            title="Vista lista"
          >
            <Icon name="view_list" />
          </button>
        </div>
      </div>

      {/* Two-column layout: sidebar aligned with products */}
      <div className="prod-layout">
        {/* LEFT: sidebar filters (desktop) */}
        {hasProducts && (
          <aside className="prod-sidebar">
            <FilterBody {...filterProps} />
          </aside>
        )}

        {/* RIGHT: products */}
        <div className="prod-content">
          {isLoading && <Skeletons />}

          {isError && (
            <div className="store-empty">
              <div className="store-empty__icon">
                <Icon name="wifi_off" />
              </div>
              <p className="store-empty__text">
                No pudimos cargar el catálogo.
              </p>
              <button
                type="button"
                className="store-empty__btn"
                onClick={refetch}
              >
                <Icon name="refresh" /> Reintentar
              </button>
            </div>
          )}

          {!isLoading && !isError && products && products.length === 0 && (
            <div className="store-empty">
              <div className="store-empty__icon">
                <Icon name="inventory_2" />
              </div>
              <p className="store-empty__text">Este local no tiene productos</p>
            </div>
          )}

          {hasProducts && filtered.length === 0 && (
            <div className="store-empty">
              <div className="store-empty__icon">
                <Icon name="search_off" />
              </div>
              <p className="store-empty__text">
                No se encontraron productos con esos filtros
              </p>
            </div>
          )}

          {hasProducts && favoriteProductEntities.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h2
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  margin: "0 0 8px",
                  color: "#0f172a",
                }}
              >
                Tus productos favoritos
              </h2>
              <div className="prod-grid">
                {favoriteProductEntities.map((item) => (
                  <Card
                    key={`fav-${item.id}`}
                    item={item}
                    onQuickView={setQuickViewItem}
                    isFavorite={true}
                    onToggleFavorite={() =>
                      toggleFavoriteProduct(String(item.id))
                    }
                    formatPrice={formatCup}
                  />
                ))}
              </div>
            </div>
          )}

          {hasProducts &&
            filtered.length > 0 &&
            sectionsByCategory.map((section) => (
              <section key={section.name} className="catalog-section">
                <div className="catalog-section-header">
                  <span
                    className="catalog-section-header__dot"
                    style={{ backgroundColor: section.color }}
                  />
                  <span className="catalog-section-header__name">
                    {section.name}
                  </span>
                  <span className="catalog-section-header__count">
                    {section.products.length}
                  </span>
                </div>
                <div
                  className={`prod-grid${view === "list" ? " prod-grid--list" : ""}`}
                >
                  {section.products.map((item) => (
                    <Card
                      key={item.id}
                      item={item}
                      onQuickView={setQuickViewItem}
                      isFavorite={isFavoriteProduct(String(item.id))}
                      onToggleFavorite={() =>
                        toggleFavoriteProduct(String(item.id))
                      }
                      formatPrice={formatCup}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFilters && (
        <div
          className="mobile-filter-overlay open"
          onClick={() => setMobileFilters(false)}
        >
          <div
            className="mobile-filter-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-filter-head">
              Filtros
              <button
                type="button"
                className="mobile-filter-close"
                onClick={() => setMobileFilters(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <FilterBody {...filterProps} />
          </div>
        </div>
      )}

      {/* Quick-view modal */}
      {quickViewItem && (
        <QuickView
          item={quickViewItem}
          onClose={() => setQuickViewItem(null)}
          onAdd={() => addFromQuickView(quickViewItem)}
          formatPrice={formatCup}
        />
      )}
    </>
  );
}
