"use client";

import type { Message } from "./types";

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex max-w-[90%] flex-col gap-2 ${isUser ? "ml-auto items-end" : "items-start"}`}
    >
      <div
        className={
          isUser
            ? "rounded-2xl rounded-br-sm bg-blue-600 px-3.5 py-2.5 text-sm text-white"
            : message.isError
              ? "rounded-2xl rounded-bl-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
              : "rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2.5 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100"
        }
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      {!isUser &&
        message.sources &&
        message.sources.length > 0 &&
        !message.isError && (
          <div className="flex flex-wrap gap-1.5 pl-0.5">
            {message.sources.map((src) =>
              isHttpUrl(src) ? (
                <a
                  key={src}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-full truncate rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-blue-600 underline-offset-2 hover:underline dark:border-gray-600 dark:bg-gray-900 dark:text-blue-400"
                >
                  {src}
                </a>
              ) : (
                <button
                  key={src}
                  type="button"
                  className="max-w-full truncate rounded-full border border-gray-200 bg-white px-2 py-0.5 text-left text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                  title={`Copiar: ${src}`}
                  onClick={() => {
                    void navigator.clipboard.writeText(src);
                  }}
                >
                  {src}
                </button>
              ),
            )}
          </div>
        )}
    </div>
  );
}
