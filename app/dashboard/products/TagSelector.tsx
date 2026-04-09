"use client";

import { useCallback, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { TAG_GROUPS } from "@/constants/tags";
import type { Tag } from "@/lib/dashboard-types";
import { useGetTagsQuery } from "./_service/productsApi";

interface TagSelectorProps {
  value: number[];
  onChange: (tagIds: number[]) => void;
}

interface GroupWithTags {
  name: string;
  color: string;
  tags: Tag[];
}

function buildGroupedTags(apiTags: Tag[]): GroupWithTags[] {
  const assigned = new Set<number>();
  const result: GroupWithTags[] = [];

  for (const group of TAG_GROUPS) {
    if (group.name === "Otros") continue;
    const tags = apiTags.filter((t) => group.tagSlugs.includes(t.slug));
    tags.forEach((t) => assigned.add(t.id));
    result.push({ name: group.name, color: group.color, tags });
  }

  const otros = apiTags.filter((t) => !assigned.has(t.id));
  if (otros.length > 0 || TAG_GROUPS.some((g) => g.name === "Otros")) {
    result.push({
      name: "Otros",
      color: "#64748b",
      tags: otros,
    });
  }

  return result.filter((g) => g.tags.length > 0);
}

export function TagSelector({ value, onChange }: TagSelectorProps) {
  const { data: tagsResult, isLoading } = useGetTagsQuery({ perPage: 200 });
  const apiTags = tagsResult?.data ?? [];

  const [search, setSearch] = useState("");

  const grouped = useMemo(() => buildGroupedTags(apiTags), [apiTags]);

  const toggleTag = useCallback(
    (id: number) => {
      if (value.includes(id)) {
        onChange(value.filter((x) => x !== id));
      } else {
        onChange([...value, id]);
      }
    },
    [value, onChange],
  );

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return grouped;
    return grouped
      .map((g) => ({
        ...g,
        tags: g.tags.filter((t) => t.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.tags.length > 0);
  }, [grouped, search]);

  const selectedTags = useMemo(() => {
    const map = new Map(apiTags.map((t) => [t.id, t]));
    return value.map((id) => map.get(id)).filter(Boolean) as Tag[];
  }, [apiTags, value]);

  if (isLoading) {
    return (
      <div className="tag-selector-v2">
        <div className="tag-selector-v2__loading">Cargando etiquetas…</div>
      </div>
    );
  }

  return (
    <div className="tag-selector-v2">
      <div className="tag-selector-v2__search-wrap">
        <input
          type="text"
          className="tag-selector-v2__search"
          placeholder="Buscar etiqueta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="tag-selector-v2__scroll">
        {filteredGroups.length === 0 ? (
          <div className="tag-selector-v2__empty">
            {search.trim()
              ? "No hay etiquetas que coincidan con la búsqueda"
              : "No hay etiquetas disponibles"}
          </div>
        ) : (
          filteredGroups.map((group) => {
            const selectedCount = group.tags.filter((t) =>
              value.includes(t.id),
            ).length;

            return (
              <div key={group.name} className="tag-selector-v2__group">
                <div className="tag-selector-v2__group-header">
                  <span
                    className="tag-selector-v2__group-dot"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="tag-selector-v2__group-name">
                    {group.name}
                  </span>
                  {selectedCount > 0 && (
                    <span className="tag-selector-v2__group-badge">
                      ({selectedCount})
                    </span>
                  )}
                </div>

                <div className="tag-selector-v2__pills">
                  {group.tags.map((tag) => {
                    const selected = value.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`tag-selector-v2__pill${selected ? " tag-selector-v2__pill--selected" : ""}`}
                        style={
                          selected
                            ? {
                                backgroundColor: `${tag.color || group.color}26`,
                                borderColor: tag.color || group.color,
                                color: tag.color || group.color,
                              }
                            : undefined
                        }
                        onClick={() => toggleTag(tag.id)}
                      >
                        {selected && (
                          <span className="tag-selector-v2__pill-check">
                            <Icon name="check" />
                          </span>
                        )}
                        <span className="tag-selector-v2__pill-label">
                          {tag.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="tag-selector-v2__footer">
        {selectedTags.length > 0 ? (
          <>
            <span className="tag-selector-v2__footer-label">
              Seleccionadas:{" "}
            </span>
            {selectedTags.slice(0, 3).map((t) => (
              <span key={t.id} className="tag-selector-v2__footer-pill">
                {t.name}
              </span>
            ))}
            {selectedTags.length > 3 && (
              <span className="tag-selector-v2__footer-more">
                +{selectedTags.length - 3} más
              </span>
            )}
          </>
        ) : (
          <span className="tag-selector-v2__footer-empty">
            Sin etiquetas seleccionadas
          </span>
        )}
      </div>
    </div>
  );
}
