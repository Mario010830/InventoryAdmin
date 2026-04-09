"use client";

import { Icon } from "@/components/ui/Icon";

interface FavoriteButtonProps {
  active: boolean;
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaAdd?: string;
  ariaRemove?: string;
  className?: string;
}

export function FavoriteButton({
  active,
  onToggle,
  ariaAdd = "Agregar a favoritos",
  ariaRemove = "Quitar de favoritos",
  className = "",
}: FavoriteButtonProps) {
  return (
    <button
      type="button"
      aria-label={active ? ariaRemove : ariaAdd}
      className={`fav-btn${active ? " fav-btn--on" : ""} ${className}`}
      onClick={onToggle}
    >
      <Icon name={active ? "favorite" : "favorite_border"} />
    </button>
  );
}
