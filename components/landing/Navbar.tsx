"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (id: string) => {
    scrollToSection(id);
    setMobileOpen(false);
  };

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar__container container">
        <Link href="/" className="navbar__logo">
          <img
            src="/assets/elcuadre.png?v=2"
            alt="Tu Cuadre"
            className="navbar__logo-img"
            height={32}
          />
        </Link>

        <ul className="navbar__links">
          <li>
            <a onClick={() => handleNavClick("features")} role="button">
              Características
            </a>
          </li>
          <li>
            <a onClick={() => handleNavClick("how-it-works")} role="button">
              Cómo Funciona
            </a>
          </li>
          <li>
            <a onClick={() => handleNavClick("benefits")} role="button">
              Beneficios
            </a>
          </li>
          <li>
            <a onClick={() => handleNavClick("cta")} role="button">
              Precios
            </a>
          </li>
        </ul>

        <div className="navbar__actions">
          <Link href="/login" className="btn-ghost">
            Iniciar Sesión
          </Link>
          <Link href="/login" className="btn-nav-primary">
            Comenzar Gratis
            <Icon name="arrow_forward" />
          </Link>
        </div>

        <button
          type="button"
          className="navbar__toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menú"
        >
          <Icon name={mobileOpen ? "close" : "menu"} />
        </button>
      </div>

      {mobileOpen && (
        <div className="navbar__mobile">
          <a onClick={() => handleNavClick("features")} role="button">
            Características
          </a>
          <a onClick={() => handleNavClick("how-it-works")} role="button">
            Cómo Funciona
          </a>
          <a onClick={() => handleNavClick("benefits")} role="button">
            Beneficios
          </a>
          <a onClick={() => handleNavClick("cta")} role="button">
            Precios
          </a>
          <div className="navbar__mobile-actions">
            <Link
              href="/login"
              className="btn-outline"
              onClick={() => setMobileOpen(false)}
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/login"
              className="btn-primary"
              onClick={() => setMobileOpen(false)}
            >
              Comenzar Gratis
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
