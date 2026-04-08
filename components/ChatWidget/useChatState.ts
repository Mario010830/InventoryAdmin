"use client";

import { useCallback, useState } from "react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type { ChatRequest, ChatResponse, Message } from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Acepta cuerpo plano `{ answer, sources }` o envuelto `{ result: { answer, ... } }` (mismo patrón que otras respuestas .NET). */
function parseChatResponse(json: unknown): ChatResponse {
  if (!json || typeof json !== "object") {
    return { answer: "" };
  }
  const o = json as Record<string, unknown>;
  const inner = o.result ?? o.Result;
  const payload =
    inner && typeof inner === "object" ? (inner as Record<string, unknown>) : o;

  const answer =
    (typeof payload.answer === "string" && payload.answer) ||
    (typeof payload.Answer === "string" && payload.Answer) ||
    "";

  const rawSources = payload.sources ?? payload.Sources;
  let sources: string[] | undefined;
  if (Array.isArray(rawSources)) {
    sources = rawSources.filter((s): s is string => typeof s === "string");
  }
  const tokensUsed =
    typeof payload.tokensUsed === "number"
      ? payload.tokensUsed
      : typeof payload.TokensUsed === "number"
        ? payload.TokensUsed
        : undefined;
  return { answer, sources, tokensUsed };
}

function friendlyError(status: number, bodyText: string): string {
  if (status === 401) {
    return "Tu sesión expiró o no estás autenticado. Iniciá sesión de nuevo e intentá otra vez.";
  }
  if (status === 403) {
    return "No tenés permiso para usar el asistente del manual.";
  }
  if (status === 408 || status === 504) {
    return "La solicitud tardó demasiado. Probá de nuevo en unos segundos.";
  }
  if (bodyText) return bodyText;
  return "No pudimos obtener una respuesta. Verificá tu conexión e intentá de nuevo.";
}

export interface UseChatStateOptions {
  apiUrl?: string;
  /** Modo controlado: panel abierto/cerrado desde el padre (p. ej. botón en el topbar). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useChatState(options?: UseChatStateOptions) {
  const baseUrl =
    typeof options?.apiUrl === "string" && options.apiUrl.trim().length > 0
      ? options.apiUrl.trim()
      : getApiUrl();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const openProp = options?.open;
  const onOpenChangeProp = options?.onOpenChange;
  const controlled =
    typeof openProp === "boolean" && typeof onOpenChangeProp === "function";
  const isOpen = controlled ? openProp : uncontrolledOpen;
  const setIsOpen = useCallback(
    (next: boolean) => {
      if (controlled) {
        onOpenChangeProp(next);
      } else {
        setUncontrolledOpen(next);
      }
    },
    [controlled, onOpenChangeProp],
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isLoading) return;

      const token = getToken();
      if (!token) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content:
              "No hay sesión activa. Iniciá sesión para consultar el manual.",
            timestamp: new Date(),
            isError: true,
          },
        ]);
        return;
      }

      const userMessage: Message = {
        id: newId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const conversationHistory: ChatRequest["conversationHistory"] = messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const url = `${baseUrl.replace(/\/$/, "")}/chat/ask`;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30_000);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            question: trimmed,
            conversationHistory,
          } satisfies ChatRequest),
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);

        const text = await response.text();
        let parsed: unknown = {};
        try {
          parsed = text ? JSON.parse(text) : {};
        } catch {
          parsed = {};
        }

        if (!response.ok) {
          const msg =
            typeof (parsed as { message?: string }).message === "string"
              ? (parsed as { message: string }).message
              : typeof (parsed as { Message?: string }).Message === "string"
                ? (parsed as { Message: string }).Message
                : "";
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content: friendlyError(response.status, msg),
              timestamp: new Date(),
              isError: true,
            },
          ]);
          return;
        }

        const data = parseChatResponse(parsed);
        const answerText = data.answer?.trim() || "(Sin contenido)";
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: answerText,
            sources: data.sources,
            timestamp: new Date(),
          },
        ]);
      } catch (e) {
        window.clearTimeout(timeoutId);
        const aborted = e instanceof DOMException && e.name === "AbortError";
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: aborted
              ? "La solicitud superó los 30 segundos. Intentá con una pregunta más corta."
              : "Ocurrió un error de red. Revisá tu conexión e intentá de nuevo.",
            timestamp: new Date(),
            isError: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, isLoading, messages],
  );

  return {
    messages,
    isLoading,
    isOpen,
    setIsOpen,
    sendMessage,
    clearConversation,
  };
}
