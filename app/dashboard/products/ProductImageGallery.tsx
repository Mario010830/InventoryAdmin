"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getProxiedImageSrc } from "@/lib/proxiedImageSrc";
import type { ProductImageResponse } from "@/lib/dashboard-types";
import {
  extractImagenUrlFromUnknown,
  useDeleteProductImageMutation,
  useGetProductImagesQuery,
  useLazyGetProductQuery,
  useReorderProductImagesMutation,
  useSetProductImageMainMutation,
  useUploadProductImagesMutation,
} from "./_service/productsApi";

const MAX_IMAGES = 8;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function urlsMatch(a: string, b: string): boolean {
  const t1 = a.trim();
  const t2 = b.trim();
  if (!t1 || !t2) return false;
  if (t1 === t2) return true;
  try {
    const u1 = new URL(t1, "http://_");
    const u2 = new URL(t2, "http://_");
    return u1.pathname === u2.pathname && u1.search === u2.search;
  } catch {
    return false;
  }
}

async function syncImagenUrlAfterMutation(
  raw: unknown,
  fetchProduct: ReturnType<typeof useLazyGetProductQuery>[0],
  productId: number,
  onImagenUrlChange: (url: string) => void,
  fallbackUrl?: string,
) {
  const fromBody = extractImagenUrlFromUnknown(raw);
  if (fromBody) {
    onImagenUrlChange(fromBody);
    return;
  }
  try {
    const p = await fetchProduct(productId).unwrap();
    onImagenUrlChange(p.imagenUrl ?? "");
  } catch {
    if (fallbackUrl !== undefined) onImagenUrlChange(fallbackUrl);
  }
}

type PendingUpload = { clientId: string; name: string; error?: string };

export function ProductImageGallery({
  mode,
  productId,
  imagenUrl,
  onImagenUrlChange,
  disabled,
  createSlot,
}: {
  mode: "create" | "edit";
  productId?: number;
  imagenUrl: string;
  onImagenUrlChange: (url: string) => void;
  disabled?: boolean;
  /** Solo en modo create: uploader simple existente. */
  createSlot?: ReactNode;
}) {
  const pid = mode === "edit" ? productId : undefined;
  const skipImages = mode !== "edit" || !pid;

  const { data: apiImages = [], refetch: refetchImages } = useGetProductImagesQuery(pid!, {
    skip: skipImages,
  });
  const [uploadImages] = useUploadProductImagesMutation();
  const [setMain] = useSetProductImageMainMutation();
  const [reorderImages] = useReorderProductImagesMutation();
  const [deleteImage] = useDeleteProductImageMutation();
  const [fetchProduct] = useLazyGetProductQuery();

  const [ordered, setOrdered] = useState<ProductImageResponse[]>([]);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | "legacy" | null>(null);
  const [showUrlField, setShowUrlField] = useState(false);
  const [flashUrl, setFlashUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const prevImagenUrl = useRef(imagenUrl);

  useEffect(() => {
    if (skipImages) return;
    setOrdered((prev) => {
      const next = apiImages.filter((x) => x.id > 0 && x.url);
      if (prev.length === next.length && prev.every((p, i) => p.id === next[i]?.id && p.url === next[i]?.url)) {
        return prev;
      }
      return next;
    });
  }, [apiImages, skipImages]);

  useEffect(() => {
    if (prevImagenUrl.current !== imagenUrl && imagenUrl) {
      setFlashUrl(imagenUrl);
      const t = window.setTimeout(() => setFlashUrl(null), 700);
      prevImagenUrl.current = imagenUrl;
      return () => window.clearTimeout(t);
    }
    prevImagenUrl.current = imagenUrl;
  }, [imagenUrl]);

  const showLegacyThumb =
    mode === "edit" &&
    !skipImages &&
    ordered.length === 0 &&
    imagenUrl.trim().length > 0;

  const apiCount = ordered.length;
  const pendingCount = pending.length;
  const legacyCount = showLegacyThumb ? 1 : 0;
  const filledCount = apiCount + pendingCount + legacyCount;
  const displayCount = mode === "create" ? (imagenUrl.trim() ? 1 : 0) : filledCount;
  const emptySlots = Math.max(0, MAX_IMAGES - filledCount);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) return "Formato no permitido (JPEG, PNG, GIF, WebP).";
    if (file.size > MAX_BYTES) return "Supera 5 MB.";
    return null;
  };

  const handlePickFiles = async (files: FileList | null) => {
    if (!files?.length || !pid || disabled) return;
    const arr = Array.from(files);
    const room = MAX_IMAGES - filledCount;
    if (room <= 0) {
      setPending((p) => [
        ...p,
        {
          clientId: `err-limit-${Date.now()}`,
          name: arr[0]?.name ?? "",
          error: "Límite de 8 imágenes alcanzado.",
        },
      ]);
      window.setTimeout(() => {
        setPending((p) => p.filter((x) => !x.clientId.startsWith("err-limit")));
      }, 4000);
      return;
    }

    const toUpload = arr.slice(0, room);
    const batchId = Date.now();
    const newPending: PendingUpload[] = toUpload.map((f, i) => {
      const err = validateFile(f);
      return {
        clientId: `up-${batchId}-${i}`,
        name: f.name,
        error: err ?? undefined,
      };
    });

    setPending((p) => [...p, ...newPending]);

    const validFiles = toUpload.filter((f) => !validateFile(f));
    if (validFiles.length === 0) return;

    const validClientIds = newPending.filter((x) => !x.error).map((x) => x.clientId);
    setUploading(true);
    try {
      const raw = await uploadImages({ productId: pid, files: validFiles }).unwrap();
      await syncImagenUrlAfterMutation(raw, fetchProduct, pid, onImagenUrlChange);
      await refetchImages();
      setPending((p) => p.filter((x) => !validClientIds.includes(x.clientId)));
    } catch {
      setPending((p) =>
        p.map((x) =>
          validClientIds.includes(x.clientId) ? { ...x, error: "Error al subir. Revisa formato o tamaño." } : x,
        ),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSetMain = async (imageId: number, imageUrl: string) => {
    if (!pid || disabled) return;
    try {
      const raw = await setMain({ productId: pid, imageId }).unwrap();
      await syncImagenUrlAfterMutation(raw, fetchProduct, pid, onImagenUrlChange, imageUrl);
    } catch {
      /* toast / silent */
    }
  };

  const handleReorder = async (from: number, to: number) => {
    if (!pid || disabled || from === to || from < 0 || to < 0) return;
    const next = [...ordered];
    const [removed] = next.splice(from, 1);
    if (!removed) return;
    next.splice(to, 0, removed);
    const prevSnap = [...ordered];
    setOrdered(next);
    const imageIds = next.map((x) => x.id);
    try {
      const raw = await reorderImages({ productId: pid, imageIds }).unwrap();
      await syncImagenUrlAfterMutation(raw, fetchProduct, pid, onImagenUrlChange);
      await refetchImages();
    } catch {
      setOrdered(prevSnap);
    }
  };

  const handleDeleteApi = async (imageId: number) => {
    if (!pid || disabled) return;
    setDeleteConfirm(null);
    const prevOrdered = [...ordered];
    setOrdered((o) => o.filter((x) => x.id !== imageId));
    try {
      const raw = await deleteImage({ productId: pid, imageId }).unwrap();
      await syncImagenUrlAfterMutation(raw, fetchProduct, pid, onImagenUrlChange, "");
      await refetchImages();
    } catch {
      setOrdered(prevOrdered);
    }
  };

  const titleRow = (
    <div className="product-gallery__title-row">
      <h3 className="product-gallery__title">Imágenes del producto</h3>
      <span className="product-gallery__counter">
        {displayCount} / {MAX_IMAGES}
      </span>
    </div>
  );

  if (mode === "create") {
    return (
      <div className="product-gallery product-gallery--create">
        {titleRow}
        <p className="product-gallery__notice">
          Podrás agregar más imágenes después de crear el producto.
        </p>
        {createSlot}
      </div>
    );
  }

  if (!pid) return null;

  const mainImage = ordered.find((img) => urlsMatch(imagenUrl, img.url));
  const secondaryImages = ordered.filter((img) => !urlsMatch(imagenUrl, img.url));

  const heroSrc = mainImage
    ? (getProxiedImageSrc(mainImage.url) ?? mainImage.url)
    : showLegacyThumb
      ? (getProxiedImageSrc(imagenUrl) ?? imagenUrl)
      : null;

  const heroDeleteTarget: number | "legacy" | null = mainImage
    ? mainImage.id
    : showLegacyThumb
      ? "legacy"
      : null;

  return (
    <div className="product-gallery">
      {titleRow}

      {/* --- Hero: imagen principal destacada --- */}
      {heroSrc ? (
        <div className={`product-gallery__hero${flashUrl && heroSrc && urlsMatch(flashUrl, heroSrc) ? " product-gallery__hero--flash" : ""}`}>
          <div className="product-gallery__hero-img">
            <img src={heroSrc} alt="Imagen principal" />
            <span className="product-gallery__badge">Principal</span>
          </div>
          <div className="product-gallery__hero-actions">
            {deleteConfirm === heroDeleteTarget ? (
              <div className="product-gallery__hero-confirm">
                <span>¿Eliminar esta imagen?</span>
                <div className="product-gallery__hero-confirm-row">
                  <button type="button" className="modal-btn modal-btn--secondary" onClick={() => setDeleteConfirm(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="modal-btn modal-btn--danger"
                    onClick={() => {
                      if (heroDeleteTarget === "legacy") {
                        onImagenUrlChange("");
                        setDeleteConfirm(null);
                      } else if (typeof heroDeleteTarget === "number") {
                        void handleDeleteApi(heroDeleteTarget);
                      }
                    }}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="modal-btn modal-btn--secondary product-gallery__hero-delete"
                disabled={disabled}
                onClick={() => setDeleteConfirm(heroDeleteTarget)}
              >
                <Icon name="delete" />
                Eliminar principal
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="product-gallery__hero product-gallery__hero--empty">
          <div className="product-gallery__hero-img product-gallery__hero-img--empty">
            <Icon name="image" />
          </div>
          <p className="product-gallery__hero-hint">
            Sube una imagen para establecerla como principal.
          </p>
        </div>
      )}

      {/* --- Track: imágenes secundarias --- */}
      {(secondaryImages.length > 0 || pending.length > 0 || emptySlots > 0) && (
        <>
          <span className="product-gallery__section-label">Más imágenes</span>
          <div className="product-gallery__track">
            {secondaryImages.map((img, index) => {
              const flashing = Boolean(flashUrl && urlsMatch(flashUrl, img.url));
              return (
                <div
                  key={img.id}
                  className={`product-gallery__thumb-wrap${flashing ? " product-gallery__thumb-wrap--flash" : ""}${deleteConfirm === img.id ? " product-gallery__thumb-wrap--open" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex === null || dragIndex === index) return;
                    void handleReorder(dragIndex, index);
                    setDragIndex(null);
                  }}
                >
                  <div className="product-gallery__thumb product-gallery__thumb--filled">
                    <button
                      type="button"
                      className="product-gallery__drag"
                      draggable={!disabled}
                      onDragStart={(e) => {
                        setDragIndex(index);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(index));
                      }}
                      onDragEnd={() => setDragIndex(null)}
                      disabled={disabled}
                      aria-label="Arrastrar para reordenar"
                    >
                      <Icon name="drag_indicator" />
                    </button>
                    <img src={getProxiedImageSrc(img.url) ?? img.url} alt="" />
                    <div className="product-gallery__overlay">
                      {deleteConfirm === img.id ? (
                        <div className="product-gallery__confirm">
                          <span>¿Eliminar esta imagen?</span>
                          <div className="product-gallery__confirm-actions">
                            <button type="button" className="modal-btn modal-btn--secondary" onClick={() => setDeleteConfirm(null)}>
                              Cancelar
                            </button>
                            <button type="button" className="modal-btn" onClick={() => void handleDeleteApi(img.id)}>
                              Confirmar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="product-gallery__overlay-btn"
                            disabled={disabled}
                            onClick={() => void handleSetMain(img.id, img.url)}
                          >
                            Hacer principal
                          </button>
                          <button
                            type="button"
                            className="product-gallery__overlay-btn product-gallery__overlay-btn--danger"
                            disabled={disabled}
                            onClick={() => setDeleteConfirm(img.id)}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {pending.map((p) => (
              <div key={p.clientId} className="product-gallery__thumb-wrap">
                <div className="product-gallery__thumb product-gallery__thumb--filled product-gallery__thumb--pending">
                  {p.error ? (
                    <span className="product-gallery__pending-error" title={p.error}>
                      {p.error}
                    </span>
                  ) : (
                    <>
                      <div className="img-uploader__spinner" />
                      <span className="product-gallery__pending-name">{p.name}</span>
                    </>
                  )}
                </div>
              </div>
            ))}

            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`empty-${i}`} className="product-gallery__thumb-wrap product-gallery__thumb-wrap--empty">
                <div className="product-gallery__thumb product-gallery__thumb--empty">
                  <Icon name="add" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        className="product-gallery__file-input"
        onChange={(e) => {
          void handlePickFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        className="modal-btn modal-btn--secondary product-gallery__upload-btn"
        disabled={disabled || uploading || filledCount >= MAX_IMAGES}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? "Subiendo…" : "Subir imágenes"}
      </button>

      <button
        type="button"
        className="product-gallery__url-toggle"
        onClick={() => setShowUrlField((v) => !v)}
      >
        <Icon name={showUrlField ? "expand_less" : "link"} />
        {showUrlField ? "Ocultar URL principal" : "O ingresa URL de imagen principal"}
      </button>

      {showUrlField && (
        <input
          type="url"
          className="product-gallery__url-input"
          value={imagenUrl}
          onChange={(e) => onImagenUrlChange(e.target.value)}
          placeholder="https://..."
          disabled={disabled}
        />
      )}
    </div>
  );
}
