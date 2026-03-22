import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const PRODUCT_LINKS = [
  { label: "Características", href: "#features" },
  { label: "Precios", href: "#cta" },
  { label: "Integraciones", href: "#" },
  { label: "Actualizaciones", href: "#" },
];

const COMPANY_LINKS = [
  { label: "Acerca de", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Carreras", href: "#" },
  { label: "Contacto", href: "#" },
];

const LEGAL_LINKS = [
  { label: "Privacidad", href: "#" },
  { label: "Términos", href: "#" },
  { label: "Cookies", href: "#" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__logo">
              <img
                src="/assets/strova-claro-nobg.png"
                alt="Strova"
                className="footer__logo-img"
                height={32}
              />
            </div>
            <p className="footer__desc">
              Control de inventario inteligente para empresas que quieren crecer
              sin perder el control.
            </p>
            <div className="footer__social">
              <a href="#" className="social-icon" aria-label="Web">
                <Icon name="language" />
              </a>
              <a href="#" className="social-icon" aria-label="Email">
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
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <h4>Legal</h4>
            <ul>
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p>
            © {currentYear} Strova. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
