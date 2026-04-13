"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const StatsSection = dynamic(
  () => import("./StatsSection").then((m) => m.StatsSection),
  { ssr: false },
);

/** Misma línea que el resto del landing: hasta 768px = móvil (no carga Three ni el chunk de esta sección). */
const DESKTOP_MQ = "(min-width: 769px)";

export function StatsSectionDesktopOnly() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => setShow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!show) return null;
  return <StatsSection />;
}
