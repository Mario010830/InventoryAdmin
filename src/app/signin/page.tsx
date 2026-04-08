import SignInForm from "@/components/auth/SignInForm";
import type { Metadata } from "next";
import Image from "next/image";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Iniciar sesión | SILIPE",
  description: "Acceso al panel de administración SILIPE",
};

const BG_IMAGE = "/images/bg.png";

function SignInFormFallback() {
  return (
    <div className="flex w-full max-w-[420px] flex-col items-center justify-center py-16 text-center text-sm text-gray-500 dark:text-gray-400">
      Cargando formulario…
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-gray-50 dark:bg-gray-950">
      {/*
        flex + flex-1 basis-0 min-w-0: cada mitad respeta exactamente 50% del ancho
        (evita desborde horizontal típico de grid/flex con min-width:auto).
      */}
      <div className="flex min-h-[100dvh] w-full max-w-full flex-col lg:flex-row">
        {/* Formulario */}
        <div className="order-2 flex w-full min-w-0 flex-1 basis-0 flex-col justify-center px-5 py-10 sm:px-8 lg:order-1 lg:min-h-[100dvh] lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-[440px]">
            <Suspense fallback={<SignInFormFallback />}>
              <SignInForm />
            </Suspense>
          </div>
        </div>

        {/* Panel imagen: overflow-hidden recorta la foto al rectángulo; inset-0 en capas internas */}
        <div className="relative order-1 h-52 w-full min-w-0 shrink-0 overflow-hidden bg-slate-800 sm:h-60 lg:order-2 lg:h-auto lg:min-h-[100dvh] lg:flex-1 lg:basis-0 lg:shrink">
          <Image
            src={BG_IMAGE}
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1023px) 100vw, 50vw"
          />
          <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center px-6 text-center">
            <p
              className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              style={{
                textShadow:
                  "0 1px 2px rgba(0,0,0,0.55), 0 4px 20px rgba(0,0,0,0.45)",
              }}
            >
              SILIPE
            </p>
            <p
              className="mt-4 max-w-sm text-sm leading-relaxed text-white sm:text-base"
              style={{
                textShadow:
                  "0 1px 3px rgba(0,0,0,0.55), 0 2px 14px rgba(0,0,0,0.4)",
              }}
            >
              Sistema de Licencias de Pesca en Cuba
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
