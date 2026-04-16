import type { LoanResponse } from "@/lib/dashboard-types";
import { formatAmountWithCode } from "@/lib/displayCurrencyFormat";

/**
 * Importes del préstamo: si hay moneda de capital, se muestran en esa moneda;
 * si no, se usa el formateador global (p. ej. moneda de visualización / CUP).
 */
export function formatLoanMoneyDisplay(
  loan: Pick<LoanResponse, "principalCurrencyCode">,
  amount: number,
  opts: { fallback: (n: number) => string; decimals: number },
): string {
  const code = loan.principalCurrencyCode?.trim();
  if (code) {
    return formatAmountWithCode(Number(amount), code, opts.decimals);
  }
  return opts.fallback(Number(amount));
}
