"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useGetPlansQuery } from "@/app/login/_service/authApi";
import type { RegistrationBillingCycle } from "@/lib/auth-types";
import {
  isEnterprisePlan,
  isProPlan,
  planFeatureLines,
  planMarketingDescription,
  planPriceParts,
  type PublicPlan,
} from "@/lib/plan-utils";
import "./pricing-cards.css";

export type PricingPlanCardsProps = {
  variant: "landing" | "signup";
  /** Registro: planes ya cargados por el padre. */
  plans?: PublicPlan[];
  /** Registro: ciclo controlado. Landing: opcional (si no hay, estado interno). */
  billingCycle?: RegistrationBillingCycle;
  onBillingCycleChange?: (c: RegistrationBillingCycle) => void;
  /** Solo signup */
  selectedPlanId?: number | null;
  onSelectPlan?: (id: number) => void;
};

export function PricingPlanCards({
  variant,
  plans: plansProp,
  billingCycle: billingProp,
  onBillingCycleChange: onBillingProp,
  selectedPlanId,
  onSelectPlan,
}: PricingPlanCardsProps) {
  const [internalCycle, setInternalCycle] = useState<RegistrationBillingCycle>("monthly");
  const billingCycle = billingProp ?? internalCycle;
  const setBillingCycle = onBillingProp ?? setInternalCycle;

  const skipFetch = variant === "signup";
  const { data: fetched = [], isLoading, isError } = useGetPlansQuery(undefined, { skip: skipFetch });

  const plans = useMemo(() => {
    if (variant === "signup" && plansProp) return plansProp;
    return fetched;
  }, [variant, plansProp, fetched]);

  if (!skipFetch && isLoading) {
    return <div className="pricing-plans-loading">Cargando planes…</div>;
  }
  if (!skipFetch && isError) {
    return <div className="pricing-plans-error">No se pudieron cargar los planes. Intenta más tarde.</div>;
  }
  if (plans.length === 0) {
    return <div className="pricing-plans-error">No hay planes disponibles.</div>;
  }

  return (
    <>
      <div className="pricing-billing">
        <div className="pricing-billing__inner" role="group" aria-label="Ciclo de facturación">
          <button
            type="button"
            className={`pricing-billing__btn ${billingCycle === "monthly" ? "pricing-billing__btn--active" : ""}`}
            onClick={() => setBillingCycle("monthly")}
          >
            Mensual
          </button>
          <button
            type="button"
            className={`pricing-billing__btn ${billingCycle === "annual" ? "pricing-billing__btn--active" : ""}`}
            onClick={() => setBillingCycle("annual")}
          >
            Anual
          </button>
        </div>
      </div>

      <div className="pricing__grid">
        {plans.map((plan) => {
          const popular = isProPlan(plan);
          const selected = variant === "signup" && selectedPlanId === plan.id;
          const { price, period } = planPriceParts(plan, billingCycle);
          const features = planFeatureLines(plan);

          return (
            <div
              key={plan.id}
              className={`pricing-card ${popular ? "highlighted" : ""} ${selected ? "selected" : ""}`}
            >
              {popular ? (
                <div className="pricing-card__badge">
                  <Icon name="star" />
                  Más Popular
                </div>
              ) : null}
              {selected ? (
                <span className="pricing-card__selected-mark" aria-hidden>
                  <Icon name="check" />
                </span>
              ) : null}
              <h3 className="pricing-card__name">{plan.displayName}</h3>
              <p className="pricing-card__desc">{planMarketingDescription(plan)}</p>
              <div className="pricing-card__price">
                <span className="price">{price}</span>
                <span className="period">{period}</span>
              </div>
              <ul className="pricing-card__features">
                {features.map((f) => (
                  <li key={f}>
                    <Icon name="check_circle" />
                    {f}
                  </li>
                ))}
              </ul>
              {variant === "landing" ? (
                <Link href="/login/register" className={`pricing-card__btn ${popular ? "primary" : ""}`}>
                  {ctaLandingLabel(plan)}
                  <Icon name="arrow_forward" />
                </Link>
              ) : (
                <button
                  type="button"
                  className={`pricing-card__btn ${selected ? "primary" : ""}`}
                  onClick={() => onSelectPlan?.(plan.id)}
                >
                  {selected ? (
                    <>
                      <Icon name="check_circle" />
                      Plan seleccionado
                    </>
                  ) : (
                    <>
                      Elegir este plan
                      <Icon name="arrow_forward" />
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ctaLandingLabel(plan: PublicPlan): string {
  if (isEnterprisePlan(plan)) return "Contactar ventas";
  if (plan.monthlyPrice === 0 && plan.annualPrice === 0) return "Comenzar gratis";
  return "Elegir plan";
}
