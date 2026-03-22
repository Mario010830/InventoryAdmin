"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";

const LocationPickerMap = dynamic(
  () => import("./LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 300,
          width: "100%",
          borderRadius: 8,
          background: "#f1f5f9",
        }}
      />
    ),
  },
);

interface Props {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export default function LocationPicker({ value, onChange }: Props) {
  const [initialCenter, setInitialCenter] = useState<[number, number]>([
    21.52, -78.9, // centro aproximado de Cuba
  ]);
  const [search, setSearch] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [openDropdown, setOpenDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Geolocalización inicial
  useEffect(() => {
    if (value) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setInitialCenter([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        // ignore, keep fallback
      },
    );
  }, [value]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Buscar en Nominatim con debounce
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setOpenDropdown(false);
      return;
    }

    if (debounceRef.current != null) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const params = new URLSearchParams({
          q: search.trim(),
          format: "json",
          limit: "5",
          addressdetails: "1",
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          headers: {
            "Accept-Language": "es",
            "User-Agent": "StrovaInventory/1.0",
          },
        });
        if (!res.ok) throw new Error("Error buscando dirección");
        const data = (await res.json()) as NominatimResult[];
        setResults(data);
        setOpenDropdown(true);
      } catch {
        setResults([]);
        setOpenDropdown(true);
      } finally {
        setLoadingSearch(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [search]);

  const handleSelectResult = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    onChange({ lat, lng });
    setInitialCenter([lat, lng]);
    setOpenDropdown(false);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("No se pudo obtener la ubicación");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        onChange(coords);
        setInitialCenter([coords.lat, coords.lng]);
      },
      () => {
        toast.error("No se pudo obtener la ubicación");
      },
    );
  };

  const handleClear = () => {
    onChange(null);
    // el mapa usará initialCenter nuevamente
  };

  return (
    <div>
      {/* Buscador */}
      <div style={{ position: "relative" }} ref={dropdownRef}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
          }}
        >
          <Icon name="search" />
          <input
            type="text"
            placeholder="Buscar dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "0.85rem",
              background: "transparent",
            }}
          />
          {loadingSearch && (
            <span
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
              }}
            >
              ...
            </span>
          )}
        </div>

        {openDropdown && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              background: "#ffffff",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
              maxHeight: 220,
              overflowY: "auto",
              zIndex: 40,
            }}
          >
            {results.length === 0 && !loadingSearch ? (
              <div
                style={{
                  padding: "8px 10px",
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                }}
              >
                No se encontraron resultados
              </div>
            ) : (
              results.map((r) => (
                <button
                  key={`${r.lat}-${r.lon}-${r.display_name}`}
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    border: "none",
                    background: "none",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  {r.display_name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div style={{ marginTop: 10 }}>
        <LocationPickerMap center={initialCenter} value={value} onChange={onChange} />
      </div>

      {/* Coordenadas y acciones */}
      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {value && (
          <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
            📍 {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        )}
        <button
          type="button"
          onClick={handleUseMyLocation}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            fontSize: "0.78rem",
            cursor: "pointer",
          }}
        >
          <Icon name="my_location" />
          Usar mi ubicación actual
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 999,
              border: "none",
              background: "none",
              fontSize: "0.78rem",
              color: "#ef4444",
              cursor: "pointer",
            }}
          >
            <Icon name="close" />
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}

