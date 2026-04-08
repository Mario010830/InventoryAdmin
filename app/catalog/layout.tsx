"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useAppSelector, useAppDispatch } from "@/store/store";
import { clearSession } from "@/lib/auth-api";
import { useLogoutMutation } from "@/app/login/_service/authApi";
import { logoutSuccessfull } from "@/app/login/_slices/authSlice";
import { removeAuthCookie } from "@/app/login/_service/sessionCookie";
import { CartDrawer } from "./components/CartDrawer";
import { TopbarCurrencySelector } from "@/components/TopbarCurrencySelector";
import "./catalog.css";

interface CatalogCtx {
  search: string;
  setSearch: (v: string) => void;
  openCart: () => void;
}

const CatalogContext = createContext<CatalogCtx>({
  search: "",
  setSearch: () => {},
  openCart: () => {},
});

export const useCatalogCtx = () => useContext(CatalogContext);

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const openCart = useCallback(() => setCartOpen(true), []);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [logoutMutation] = useLogoutMutation();
  const authUser = useAppSelector((s) => s.auth);

  const count = useAppSelector((s) =>
    s.cart.items.reduce((a, i) => a + i.quantity, 0)
  );

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      /* ignorar */
    }
    dispatch(logoutSuccessfull());
    clearSession();
    removeAuthCookie();
    router.push("/login");
  };

  const hideCart =
    pathname === "/catalog" && searchParams.get("tab") === "productos";

  return (
    <CatalogContext.Provider value={{ search, setSearch, openCart }}>
      <div className="store-layout">
        <nav className="store-nav">
          <Link href="/" className="store-nav__brand">
            <img src="/assets/elcuadre.png?v=2" alt="Tu Cuadre" className="store-nav__logo" />
            <span className="store-nav__brand-label">Tienda</span>
          </Link>

          <div className="store-nav__spacer" />

          <TopbarCurrencySelector />

          <div className="store-nav__actions">
            {!hideCart && (
              <button type="button" className="store-nav__cart" onClick={openCart}>
                <Icon name="shopping_cart" />
                {count > 0 && <span className="store-nav__cart-count">{count}</span>}
                <span className="store-nav__cart-label">Carrito</span>
                {count > 0 && <span className="store-nav__badge">{count > 99 ? "99+" : count}</span>}
              </button>
            )}

            {authUser ? (
              <>
                <Link href="/dashboard" className="store-nav__link-btn" title="Panel">
                  <Icon name="dashboard" />
                  <span className="store-nav__link-text">Panel</span>
                </Link>
                <button
                  type="button"
                  className="store-nav__link-btn store-nav__logout"
                  title="Cerrar sesión"
                  onClick={() => void handleLogout()}
                >
                  <Icon name="logout" />
                  <span className="store-nav__link-text">Cerrar sesión</span>
                </button>
              </>
            ) : (
              <Link href="/login" className="store-nav__link-btn" title="Iniciar sesión">
                <Icon name="person_outline" />
                <span className="store-nav__link-text">Iniciar sesión</span>
              </Link>
            )}
          </div>
        </nav>

        <main className="store-main">{children}</main>

        {!hideCart && <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />}
      </div>
    </CatalogContext.Provider>
  );
}
