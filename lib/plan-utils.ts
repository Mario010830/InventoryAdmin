/** Plan público devuelto por GET /plan (normalizado a camelCase). */
export interface PublicPlan {
  id: number;
  displayName: string;
  /** Slug del plan desde la API (ej. free, pro, enterprise). */
  name: string;
  /** Descripción de marketing si la API la envía. */
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  productsLimit: number;
  usersLimit: number;
  locationsLimit: number;
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePlan(item: Record<string, unknown>): PublicPlan {
  const desc = item.description ?? item.Description;
  return {
    id: num(item.id ?? item.Id ?? item.planId ?? item.PlanId, -1),
    displayName: String(item.displayName ?? item.DisplayName ?? ""),
    name: String(item.name ?? item.Name ?? "").toLowerCase(),
    ...(typeof desc === "string" && desc.trim()
      ? { description: desc.trim() }
      : {}),
    monthlyPrice: num(item.monthlyPrice ?? item.MonthlyPrice, 0),
    annualPrice: num(item.annualPrice ?? item.AnnualPrice, 0),
    productsLimit: num(
      item.productsLimit ??
        item.ProductsLimit ??
        item.maxProducts ??
        item.MaxProducts,
      -1,
    ),
    usersLimit: num(
      item.usersLimit ?? item.UsersLimit ?? item.maxUsers ?? item.MaxUsers,
      -1,
    ),
    locationsLimit: num(
      item.locationsLimit ??
        item.LocationsLimit ??
        item.maxLocations ??
        item.MaxLocations,
      -1,
    ),
  };
}

/** Orden fijo para UI: Free → Pro → Enterprise; el resto al final por nombre. */
function planTierRank(plan: PublicPlan): number {
  const n = plan.name;
  if (n === "free") return 0;
  if (n === "pro") return 1;
  if (n === "enterprise") return 2;
  const d = plan.displayName.toLowerCase().trim();
  if (d === "free") return 0;
  if (d === "pro") return 1;
  if (d.includes("enterprise")) return 2;
  return 50;
}

export function sortPlansDisplayOrder(plans: PublicPlan[]): PublicPlan[] {
  return [...plans].sort((a, b) => {
    const ra = planTierRank(a);
    const rb = planTierRank(b);
    if (ra !== rb) return ra - rb;
    return a.displayName.localeCompare(b.displayName, "es");
  });
}

export function isProPlan(plan: PublicPlan): boolean {
  return plan.name === "pro" || plan.displayName.toLowerCase().trim() === "pro";
}

export function parsePlansFromApi(raw: unknown): PublicPlan[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const inner = o.result ?? o.Result ?? o.data ?? o.Data;
    if (Array.isArray(inner)) list = inner;
    else if (Array.isArray(o.plans)) list = o.plans as unknown[];
  }
  const parsed = list
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object",
    )
    .map(normalizePlan)
    .filter((p) => p.id >= 0 && p.displayName.length > 0);
  return sortPlansDisplayOrder(parsed);
}

export function formatPlanLimit(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value === -1 ? "Ilimitado" : String(value);
}

export function formatPlanPriceDisplay(value: number): string {
  if (value === 0) return "Gratis";
  return new Intl.NumberFormat("es-419", {
    style: "currency",
    currency: "CUP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function isPaidPlan(plan: PublicPlan | undefined): boolean {
  if (!plan) return false;
  if (isEnterprisePlan(plan)) return true;
  return plan.monthlyPrice > 0 || plan.annualPrice > 0;
}

export function isEnterprisePlan(plan: PublicPlan): boolean {
  const d = plan.displayName.toLowerCase();
  return plan.name.includes("enterprise") || d.includes("enterprise");
}

/** Texto corto bajo el nombre del plan (landing / registro). */
export function planMarketingDescription(plan: PublicPlan): string {
  if (plan.description?.trim()) return plan.description.trim();
  const n = plan.name;
  if (n === "free") return "Perfecto para emprendedores";
  if (n === "pro") return "Para negocios en crecimiento";
  if (n === "enterprise") return "Para operaciones a gran escala";
  return "Plan flexible para tu organización";
}

export type PlanBillingCycle = "monthly" | "annual";


const ENTERPRISE_DEFAULT_MONTHLY_CUP = 4000;

function enterpriseBillingAmount(
  plan: PublicPlan,
  cycle: PlanBillingCycle,
): number {
  const monthly =
    plan.monthlyPrice > 0 ? plan.monthlyPrice : ENTERPRISE_DEFAULT_MONTHLY_CUP;
  const annual =
    plan.annualPrice > 0 ? plan.annualPrice : monthly * 12;
  return cycle === "annual" ? annual : monthly;
}

/** Precio principal + periodo (estilo landing: .price + .period). */
export function planPriceParts(
  plan: PublicPlan,
  cycle: PlanBillingCycle,
): { price: string; period: string } {
  const raw = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const amount = isEnterprisePlan(plan)
    ? enterpriseBillingAmount(plan, cycle)
    : raw;
  if (!isEnterprisePlan(plan) && raw < 0)
    return { price: "Custom", period: "a medida" };
  if (amount === 0)
    return {
      price: "Gratis",
      period: cycle === "annual" ? "al año" : "para siempre",
    };
  const formatted = formatPlanPriceDisplay(amount);
  return { price: formatted, period: cycle === "annual" ? "/año" : "/mes" };
}

/** Una línea (registro / resúmenes). */
export function planPriceLabel(
  plan: PublicPlan,
  cycle: PlanBillingCycle,
): string {
  const raw = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const amount = isEnterprisePlan(plan)
    ? enterpriseBillingAmount(plan, cycle)
    : raw;
  if (!isEnterprisePlan(plan) && raw < 0) return "Custom";
  if (amount === 0) return "Gratis para siempre";
  const formatted = formatPlanPriceDisplay(amount);
  return cycle === "annual" ? `${formatted} / año` : `${formatted} / mes`;
}

/** Tres bullets según límites reales del plan. */
export function planFeatureLines(plan: PublicPlan): string[] {
  const p = plan.productsLimit;
  const u = plan.usersLimit;
  const l = plan.locationsLimit;
  return [
    p === -1 ? "Productos ilimitados" : `Hasta ${p} productos`,
    u === -1 ? "Usuarios ilimitados" : `Hasta ${u} usuarios`,
    l === -1 ? "Ubicaciones ilimitadas" : `Hasta ${l} ubicaciones`,
  ];
}
