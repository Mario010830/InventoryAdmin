 "use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Clock3, Database, FileText, Handshake, Scale, Settings2, ShieldCheck, Share2 } from "lucide-react";

const PRODUCT_LINKS = [
  { label: "Características", href: "#features" },
  { label: "Precios", href: "#cta" },
  { label: "Integraciones", href: "#" },
  { label: "Actualizaciones", href: "#" },
];

const COMPANY_LINKS = [
  { label: "Acerca de", action: "about" as const },
  { label: "Contacto", href: "https://wa.me/5358728126" },
];

const LEGAL_LINKS = [
  { label: "Privacidad", section: "privacy" as const },
  { label: "Términos", section: "terms" as const },
  { label: "Cookies", section: "cookies" as const },
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalSection, setLegalSection] = useState<"privacy" | "terms" | "cookies">("privacy");
  const [cookiePrefs, setCookiePrefs] = useState({
    essential: true,
    analytics: true,
    marketing: false,
  });
  const policyRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAboutOpen(false);
        setLegalOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!legalOpen) return;
    const el = policyRef.current;
    if (!el) return;
    const focusables = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    first?.focus();
  }, [legalOpen]);

  const trapPolicyFocus = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const el = policyRef.current;
    if (!el) return;
    const focusables = Array.from(
      el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((n) => !n.hasAttribute("disabled"));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const acceptAllCookies = () => {
    const next = { essential: true, analytics: true, marketing: true };
    setCookiePrefs(next);
    try {
      localStorage.setItem("tu-cuadre-cookie-preferences", JSON.stringify(next));
    } catch {
      // ignore storage errors in restricted environments
    }
    setLegalOpen(false);
  };

  const rejectOptionalCookies = () => {
    const next = { essential: true, analytics: false, marketing: false };
    setCookiePrefs(next);
    try {
      localStorage.setItem("tu-cuadre-cookie-preferences", JSON.stringify(next));
    } catch {
      // ignore storage errors in restricted environments
    }
    setLegalOpen(false);
  };

  const privacySections = useMemo(
    () => [
      {
        icon: Database,
        title: "Recolección de datos",
        text: "Recopilamos datos de cuenta, actividad operativa, eventos de uso y metadatos técnicos mínimos para operar de forma segura y eficiente.",
      },
      {
        icon: Settings2,
        title: "Uso de datos",
        text: "Usamos la información para autenticar usuarios, habilitar funcionalidades, personalizar experiencia, detectar incidencias y mejorar el servicio.",
      },
      {
        icon: Share2,
        title: "Compartición de datos",
        text: "Solo compartimos datos con proveedores tecnológicos y terceros estrictamente necesarios para prestar el servicio o cumplir requisitos legales.",
      },
      {
        icon: Clock3,
        title: "Periodo de conservación",
        text: "Conservamos la información durante el tiempo necesario para fines operativos, obligaciones regulatorias y resolución de disputas contractuales.",
      },
    ],
    [],
  );

  const termsSections = useMemo(
    () => [
      {
        icon: ShieldCheck,
        title: "Uso del servicio",
        text: "El cliente debe utilizar Tu Cuadre conforme a la ley, mantener credenciales seguras y garantizar la veracidad de los datos gestionados.",
      },
      {
        icon: Handshake,
        title: "Restricciones",
        text: "Se prohíbe ingeniería inversa no autorizada, uso malicioso, abuso de recursos, extracción masiva de datos y actividades que afecten la plataforma.",
      },
      {
        icon: Scale,
        title: "Responsabilidad",
        text: "Tu Cuadre aplica medidas razonables de seguridad y disponibilidad, pero la responsabilidad del uso operativo y decisiones de negocio corresponde al cliente.",
      },
      {
        icon: FileText,
        title: "Modificaciones",
        text: "Podemos actualizar estos términos por cambios normativos o funcionales. Publicaremos revisiones y, cuando aplique, notificaremos previamente.",
      },
    ],
    [],
  );

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__logo">
              <img
                src="/assets/elcuadre.png?v=2"
                alt="Tu Cuadre"
                className="footer__logo-img"
                height={32}
              />
            </div>
            <p className="footer__desc">
              Control de inventario inteligente para empresas que quieren crecer
              sin perder el control.
            </p>
            <div className="footer__social">
              <a href="/" className="social-icon" aria-label="Web">
                <Icon name="language" />
              </a>
              <a href="https://wa.me/5358728126" className="social-icon" aria-label="WhatsApp" target="_blank" rel="noreferrer">
                <Icon name="mail" />
              </a>
            </div>
          </div>

          <div className="footer__col">
            <h4>Producto</h4>
            <ul>
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <h4>Empresa</h4>
            <ul>
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  {link.action === "about" ? (
                    <button type="button" className="footer__link-btn" onClick={() => setAboutOpen(true)}>
                      {link.label}
                    </button>
                  ) : (
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <h4>Legal</h4>
            <ul>
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <button
                    type="button"
                    className="footer__link-btn"
                    onClick={() => {
                      setLegalSection(link.section);
                      setLegalOpen(true);
                    }}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p>
            © {currentYear} Tu Cuadre. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {aboutOpen && (
        <div className="footer-modal__backdrop" role="presentation" onClick={() => setAboutOpen(false)}>
          <div className="footer-modal" role="dialog" aria-modal="true" aria-label="Acerca de Tu Cuadre" onClick={(e) => e.stopPropagation()}>
            <div className="footer-modal__head">
              <h3>Acerca de Tu Cuadre</h3>
              <button type="button" onClick={() => setAboutOpen(false)} aria-label="Cerrar">
                <Icon name="close" />
              </button>
            </div>
            <div className="footer-modal__body">
              <p>
                Tu Cuadre es una plataforma profesional de gestion de inventario orientada a negocios que necesitan visibilidad operativa en tiempo real.
                Centraliza productos, movimientos, ubicaciones, proveedores y reportes en una sola experiencia clara y accionable.
              </p>
              <p>
                Nuestro objetivo es reducir errores, acelerar decisiones y brindar control confiable a equipos de todos los tamaños mediante herramientas
                modernas, seguras y faciles de adoptar.
              </p>
            </div>
          </div>
        </div>
      )}

      {legalOpen && (
        <div className="footer-modal__backdrop" role="presentation" onClick={() => setLegalOpen(false)}>
          <div
            ref={policyRef}
            className="policy-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Política de Privacidad"
            onKeyDown={trapPolicyFocus}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="policy-modal__head">
              <h3>Política de Privacidad</h3>
              <button type="button" onClick={() => setLegalOpen(false)} aria-label="Cerrar">
                <Icon name="close" />
              </button>
            </div>
            <div className="policy-modal__tabs">
              {LEGAL_LINKS.map((l) => (
                <button
                  type="button"
                  key={l.section}
                  className={legalSection === l.section ? "active" : ""}
                  onClick={() => setLegalSection(l.section)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="policy-modal__content">
              <div key={legalSection} className="policy-modal__content-fade">
                {legalSection === "privacy" && (
                  <div className="policy-list">
                    {privacySections.map((s) => (
                      <section key={s.title} className="policy-item">
                        <s.icon size={18} strokeWidth={2} aria-hidden />
                        <div>
                          <h4>{s.title}</h4>
                          <p>{s.text}</p>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
                {legalSection === "terms" && (
                  <div className="policy-list">
                    {termsSections.map((s) => (
                      <section key={s.title} className="policy-item">
                        <s.icon size={18} strokeWidth={2} aria-hidden />
                        <div>
                          <h4>{s.title}</h4>
                          <p>{s.text}</p>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
                {legalSection === "cookies" && (
                  <div className="policy-list">
                    <section className="policy-item">
                      <ShieldCheck size={18} strokeWidth={2} aria-hidden />
                      <div className="policy-item__row">
                        <div>
                          <h4>Cookies esenciales</h4>
                          <p>Necesarias para autenticación, seguridad y funcionamiento básico del producto.</p>
                        </div>
                        <button type="button" className="policy-switch active" disabled aria-label="Cookies esenciales activas" />
                      </div>
                    </section>
                    <section className="policy-item">
                      <Database size={18} strokeWidth={2} aria-hidden />
                      <div className="policy-item__row">
                        <div>
                          <h4>Analítica</h4>
                          <p>Nos ayudan a medir uso y rendimiento para mejorar funcionalidades y experiencia.</p>
                        </div>
                        <button
                          type="button"
                          className={`policy-switch ${cookiePrefs.analytics ? "active" : ""}`}
                          aria-label="Alternar cookies analíticas"
                          aria-pressed={cookiePrefs.analytics}
                          onClick={() => setCookiePrefs((p) => ({ ...p, analytics: !p.analytics }))}
                        />
                      </div>
                    </section>
                    <section className="policy-item">
                      <Share2 size={18} strokeWidth={2} aria-hidden />
                      <div className="policy-item__row">
                        <div>
                          <h4>Marketing</h4>
                          <p>Permiten personalizar comunicación comercial y campañas relevantes para tu negocio.</p>
                        </div>
                        <button
                          type="button"
                          className={`policy-switch ${cookiePrefs.marketing ? "active" : ""}`}
                          aria-label="Alternar cookies de marketing"
                          aria-pressed={cookiePrefs.marketing}
                          onClick={() => setCookiePrefs((p) => ({ ...p, marketing: !p.marketing }))}
                        />
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </div>
            <div className="policy-modal__footer">
              <button type="button" className="policy-btn policy-btn--ghost" onClick={rejectOptionalCookies}>
                Rechazar
              </button>
              <button type="button" className="policy-btn policy-btn--solid" onClick={acceptAllCookies}>
                Aceptar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
