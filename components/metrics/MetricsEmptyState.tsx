"use client";

export function MetricsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#eceff4] bg-gradient-to-b from-slate-50 to-white px-8 py-14 text-center">
      <div className="text-indigo-200">
        <svg
          width="120"
          height="100"
          viewBox="0 0 120 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Abstract chart illustration"
        >
          <title>Abstract chart</title>
          <rect
            x="8"
            y="58"
            width="16"
            height="32"
            rx="3"
            fill="currentColor"
            opacity="0.35"
          />
          <rect
            x="32"
            y="42"
            width="16"
            height="48"
            rx="3"
            fill="currentColor"
            opacity="0.5"
          />
          <rect
            x="56"
            y="28"
            width="16"
            height="62"
            rx="3"
            fill="currentColor"
            opacity="0.65"
          />
          <rect
            x="80"
            y="48"
            width="16"
            height="42"
            rx="3"
            fill="currentColor"
            opacity="0.45"
          />
          <path
            d="M12 22C12 22 28 8 48 18C68 28 84 12 104 20"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.55"
          />
          <circle cx="104" cy="20" r="4" fill="currentColor" opacity="0.7" />
        </svg>
      </div>
      <p className="mt-2 font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}
