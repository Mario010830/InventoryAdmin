"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./locations-grid.css";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

// Fix default marker icon paths when bundling with Next.js/webpack
L.Marker.prototype.options.icon = L.icon({
  iconUrl: iconUrl as unknown as string,
  shadowUrl: iconShadowUrl as unknown as string,
  iconAnchor: [12, 41],
  popupAnchor: [0, -41],
});

interface MapProps {
  center: [number, number];
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
}

function MarkerController({ value, onChange }: MapProps) {
  const map = useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  useMemo(() => {
    if (value) {
      map.setView([value.lat, value.lng]);
    }
  }, [value, map]);

  if (!value) return null;

  const position: LatLngExpression = [value.lat, value.lng];

  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend(e) {
          const marker = e.target as L.Marker;
          const p = marker.getLatLng();
          onChange({ lat: p.lat, lng: p.lng });
        },
      }}
    />
  );
}

export default function LocationPickerMap({ center, value, onChange }: MapProps) {
  const initialCenter: LatLngExpression = value
    ? [value.lat, value.lng]
    : center;

  const zoom = value ? 13 : 5;

  return (
    <MapContainer
      className="location-picker-map"
      center={initialCenter}
      zoom={zoom}
      scrollWheelZoom
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerController center={center} value={value} onChange={onChange} />
    </MapContainer>
  );
}

