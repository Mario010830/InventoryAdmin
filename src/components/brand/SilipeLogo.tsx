import React from "react";

type SilipeLogoProps = {
  variant?: "full" | "compact";
  /** Compacta el texto e icono para la barra superior móvil */
  size?: "default" | "sm";
  className?: string;
};

function FishIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.56 2.54 7.5 6-.94 3.47-3.94 6-7.5 6s-7.56-2.53-8.5-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 12v.5M16 17.93A9 9 0 0 0 22 12c0-2.5-1-4.73-2.62-6.43"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.49 15.89 5 18.5M7.5 8.1 5 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SilipeLogo({
  variant = "full",
  size = "default",
  className,
}: SilipeLogoProps) {
  const box =
    size === "sm"
      ? "h-8 w-8 rounded-lg"
      : "h-9 w-9 rounded-xl";
  const fish = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const title =
    size === "sm"
      ? "text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
      : "text-xl font-semibold tracking-tight text-gray-900 dark:text-white";

  if (variant === "compact") {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center bg-brand-500 text-white ${box} ${className ?? ""}`}
      >
        <FishIcon className={fish} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <span
        className={`inline-flex shrink-0 items-center justify-center bg-brand-500 text-white ${box}`}
      >
        <FishIcon className={fish} />
      </span>
      <span className={title}>SILIPE</span>
    </span>
  );
}
