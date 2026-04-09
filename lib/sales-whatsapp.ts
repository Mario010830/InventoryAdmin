import type { RegistrationBillingCycle } from "@/lib/auth-types";

/** WhatsApp Ventas — mismo número que registro y cambio de plan (`wa.me` solo dígitos). */
export const SALES_WHATSAPP_PHONE_DIGITS = "5358499664";
export const SALES_WHATSAPP_DISPLAY = "+53 5 8499664";

function billingLabel(cycle: RegistrationBillingCycle): string {
  return cycle === "annual" ? "Anual" : "Mensual";
}

export function buildSignupSalesWhatsAppUrl(params: {
  organizationName: string;
  planDisplayName: string;
  billingCycle: RegistrationBillingCycle;
}): string {
  const text = [
    "Hola, acabo de registrarme en Tu Cuadre y quiero coordinar mi plan de pago.",
    "",
    `Organización: ${params.organizationName}`,
    `Plan deseado: ${params.planDisplayName}`,
    `Facturación: ${billingLabel(params.billingCycle)}`,
  ].join("\n");
  return `https://wa.me/${SALES_WHATSAPP_PHONE_DIGITS}?text=${encodeURIComponent(text)}`;
}

export function buildPlanChangeWhatsAppUrl(params: {
  organizationName: string;
  accountEmail: string;
  fullName?: string;
  currentPlanName: string;
  desiredPlanDisplayName: string;
  billingCycle: RegistrationBillingCycle;
}): string {
  const lines = [
    "Hola, quiero cambiar de plan en Tu Cuadre.",
    "",
    `Plan actual: ${params.currentPlanName}`,
    `Plan deseado: ${params.desiredPlanDisplayName}`,
    `Facturación deseada: ${billingLabel(params.billingCycle)}`,
    "",
    `Organización: ${params.organizationName}`,
    `Cuenta: ${params.accountEmail}`,
  ];
  if (params.fullName?.trim()) {
    lines.push(`Nombre: ${params.fullName.trim()}`);
  }
  return `https://wa.me/${SALES_WHATSAPP_PHONE_DIGITS}?text=${encodeURIComponent(lines.join("\n"))}`;
}
