"use client";

import { MessageCircle, Send, Trash2, X } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import type { Message } from "./types";

const MAX_LEN = 500;
const COUNTER_FROM = 400;

export interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  onClear: () => void;
  manualVersion?: string;
}

export function ChatPanel({
  messages,
  isLoading,
  onClose,
  onSend,
  onClear,
  manualVersion = "v1.0",
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const showWelcome = messages.length === 0;
  const messageScrollKey = messages.map((m) => m.id).join("|");

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when message ids or loading state change
  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageScrollKey, isLoading]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (isLoading || !draft.trim()) return;
    onSend(draft);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg" aria-hidden>
            🤖
          </span>
          <h2
            id="chat-widget-title"
            className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            Asistente del manual
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Limpiar conversación"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Cerrar asistente"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-3">
          {showWelcome && (
            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2.5 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                Hola, soy el asistente del manual. Preguntame cualquier cosa
                sobre el sistema.
              </div>
            </div>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <TypingIndicator />
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <footer className="shrink-0 border-t border-gray-200 bg-transparent dark:border-gray-700">
        <form onSubmit={handleSubmit} className="p-2">
          <div className="flex items-end gap-2">
            <div className="relative min-w-0 flex-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
                onKeyDown={onKeyDown}
                placeholder="Escribe tu pregunta…"
                disabled={isLoading}
                rows={2}
                maxLength={MAX_LEN}
                aria-label="Escribe tu pregunta para el manual"
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
              />
              {draft.length >= COUNTER_FROM && (
                <span className="pointer-events-none absolute right-2 bottom-1 text-[10px] text-gray-400 dark:text-gray-500">
                  {draft.length}/{MAX_LEN}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !draft.trim()}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-600"
              aria-label="Enviar pregunta"
            >
              <Send className="size-4" aria-hidden />
            </button>
          </div>
        </form>
        <p className="flex items-center justify-center gap-1 px-2 pb-2 text-center text-[10px] text-gray-400 dark:text-gray-500">
          <MessageCircle className="size-3 opacity-70" aria-hidden />
          Powered by manual {manualVersion}
        </p>
      </footer>
    </div>
  );
}
