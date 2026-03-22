"use client";

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={`material-icons ${className ?? ""}`}
      style={{ fontSize: "inherit", width: "1em", height: "1em" }}
      aria-hidden
    >
      {name}
    </span>
  );
}
