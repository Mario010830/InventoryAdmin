"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { useChatState } from "./useChatState";

export interface ChatWidgetProps {
  /** Base URL de la API (misma convención que `getApiUrl()`). Si se omite, se usa `getApiUrl()`. */
  apiUrl?: string;
  manualVersion?: string;
  /** Oculta el botón flotante inferior derecho. */
  hideFab?: boolean;
  /** Con `onOpenChange`, controla el panel desde fuera (p. ej. topbar). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChatWidget({
  apiUrl,
  manualVersion = "v1.0",
  hideFab = false,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: ChatWidgetProps) {
  const controlled =
    typeof openProp === "boolean" && typeof onOpenChangeProp === "function";
  const {
    messages,
    isLoading,
    isOpen,
    setIsOpen,
    sendMessage,
    clearConversation,
  } = useChatState({
    apiUrl,
    ...(controlled ? { open: openProp, onOpenChange: onOpenChangeProp } : {}),
  });

  return (
    <>
      {!hideFab && (
        <AnimatePresence mode="wait">
          {!isOpen && (
            <motion.button
              key="fab"
              type="button"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className="fixed right-6 bottom-6 z-[1200] flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-600"
              onClick={() => setIsOpen(true)}
              aria-label="Abrir asistente del manual"
              aria-haspopup="dialog"
            >
              <MessageCircle className="size-7" aria-hidden />
            </motion.button>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-widget-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-widget-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="fixed right-6 bottom-6 z-[1200] flex h-[min(520px,calc(100vh-5rem))] w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              onClose={() => setIsOpen(false)}
              onSend={(text) => void sendMessage(text)}
              onClear={clearConversation}
              manualVersion={manualVersion}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export type { ChatRequest, ChatResponse, ChatState, Message } from "./types";
