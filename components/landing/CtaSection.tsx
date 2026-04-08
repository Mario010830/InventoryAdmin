"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PricingPlanCards } from "@/components/pricing";

export function CtaSection() {
  return (
    <>
      <section className="pricing section" id="cta">
        <div className="container">
          <div className="pricing__header">
            <span className="section-label">Precios</span>
            <h2 className="section-title">
              Un plan para cada{" "}
              <span className="gradient-text">etapa de tu negocio</span>
            </h2>
            <p className="section-subtitle">
              Sin contratos. Sin sorpresas. Cancela cuando quieras.
            </p>
          </div>

          <PricingPlanCards variant="landing" />
        </div>
      </section>

      <section className="final-cta section">
        <div className="container">
          <div className="final-cta__box">
            <div className="final-cta__glow" />
            <h2 className="final-cta__title">
              ¿Listo para transformar tu{" "}
              <span className="gradient-text">gestión de inventario?</span>
            </h2>
            <p className="final-cta__desc">
              Únete a cientos de empresas que ya optimizaron sus operaciones con
              Tu Cuadre. Empieza gratis hoy, sin compromiso.
            </p>
            <div className="final-cta__actions">
              <Link href="/login/register" className="btn-primary btn-large">
                Crear Cuenta Gratis
                <Icon name="rocket_launch" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
