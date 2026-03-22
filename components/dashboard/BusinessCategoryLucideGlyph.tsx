"use client";

import { getBusinessCategoryLucideComponent } from "@/utils/businessCategoryIcons";

export function BusinessCategoryLucideGlyph({
  categoryName,
  size = 16,
  className,
  strokeWidth = 2,
}: {
  categoryName: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = getBusinessCategoryLucideComponent(categoryName);
  return <Icon size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}
