"use client";

export function TypingIndicator() {
  return (
    <output
      className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3 dark:bg-gray-800"
      aria-live="polite"
      aria-label="El asistente está escribiendo"
    >
      <span className="sr-only">Escribiendo…</span>
      <span
        className="size-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.32s] dark:bg-gray-400"
        aria-hidden
      />
      <span
        className="size-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.16s] dark:bg-gray-400"
        aria-hidden
      />
      <span
        className="size-1.5 animate-bounce rounded-full bg-gray-500 dark:bg-gray-400"
        aria-hidden
      />
    </output>
  );
}
