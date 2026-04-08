"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, isReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/signin?next=${next}`);
    }
  }, [isReady, token, router, pathname]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-500 dark:bg-gray-900 dark:text-gray-400">
        Cargando…
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return <>{children}</>;
}
