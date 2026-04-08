"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";

export default function SignInRedirectIfAuthed() {
  const { token, isReady } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isReady || !token) return;
    const next = searchParams.get("next");
    const target =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/";
    router.replace(target);
  }, [isReady, token, router, searchParams]);

  return null;
}
