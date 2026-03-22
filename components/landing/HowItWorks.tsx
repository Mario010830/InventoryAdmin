"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

const STEPS = [
  {
    number: "01",
    icon: "person_add",
    title: "Regístrate",
    description:
      "Crea tu cuenta en segundos con email o Google. Sin tarjeta de crédito, sin compromisos.",
  },
  {
    number: "02",
    icon: "business",
    title: "Configura tu organización",
    description:
      "Crea tu empresa, agrega ubicaciones (almacenes, bodegas, tiendas) y define roles para tu equipo.",
  },
  {
    number: "03",
    icon: "category",
    title: "Carga tu catálogo",
    description:
      "Agrega categorías, productos con precios y costos, y vincula proveedores. Todo organizado desde el inicio.",
  },
  {
    number: "04",
    icon: "trending_up",
    title: "Gestiona y crece",
    description:
      "Registra movimientos de stock, recibe alertas de mínimos y toma decisiones con reportes en tiempo real.",
  },
];

const BEFORE_ITEMS = [
  { icon: "description", text: "Excel y hojas de cálculo manuales" },
  { icon: "error_outline", text: "Errores constantes de conteo" },
  { icon: "visibility_off", text: "Sin visibilidad del stock real" },
  { icon: "group_off", text: "Cada persona con su propia versión" },
  { icon: "notification_important", text: "Te enteras tarde de faltantes" },
];

const AFTER_ITEMS = [
  { icon: "cloud_sync", text: "Todo centralizado en la nube" },
  { icon: "verified", text: "Cada movimiento queda registrado" },
  { icon: "visibility", text: "Stock en tiempo real por ubicación" },
  { icon: "groups", text: "Equipo con roles y permisos claros" },
  { icon: "notifications_active", text: "Alertas automáticas de stock mínimo" },
];

const TESTIMONIALS = [
  {
    text: "Antes manejábamos el inventario en Excel y siempre teníamos errores de conteo. Con Strova, ahora cada movimiento queda registrado y las alertas de stock mínimo nos han salvado más de una vez.",
    name: "María Rodríguez",
    role: "Gerente de Operaciones, LogiTech Solutions",
    initials: "MR",
  },
  {
    text: "Pasamos de perder horas buscando datos en hojas de cálculo a tener todo en un dashboard. El equipo adoptó la herramienta en una semana.",
    name: "Carlos Méndez",
    role: "Director de Almacén, FreshMarket",
    initials: "CM",
  },
  {
    text: "Lo que más nos impactó fue el multi-almacén. Gestionamos 4 bodegas y ahora sabemos exactamente qué hay en cada una sin llamar a nadie.",
    name: "Lucía Fernández",
    role: "Coordinadora de Logística, TecnoPartes",
    initials: "LF",
  },
];

const LINE_DURATION = 2;
const NODE_DELAYS = [0, 0.6, 1.2, 1.8];

function TestimonialCarousel() {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const t = TESTIMONIALS[index];

  return (
    <div className="testimonial-carousel">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="testimonial__content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <Icon name="format_quote" className="testimonial__quote" />
          <p className="testimonial__text">&quot;{t.text}&quot;</p>
          <div className="testimonial__author">
            <div className="testimonial__avatar">{t.initials}</div>
            <div>
              <strong>{t.name}</strong>
              <span>{t.role}</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="testimonial-carousel__dots">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={TESTIMONIALS[i].name}
            type="button"
            className={`testimonial-carousel__dot ${i === index ? "active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`Testimonio ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const stepsRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(stepsRef, { once: true, amount: 0.3 });

  return (
    <>
      <section className="how-it-works section" id="how-it-works">
        <div className="container">
          <div className="how-it-works__header">
            <span className="section-label">Cómo Funciona</span>
            <h2 className="section-title">
              Empieza en <span className="gradient-text">4 simples pasos</span>
            </h2>
            <p className="section-subtitle">
              De cero a productividad en minutos. Sin instalación, sin
              configuraciones complejas.
            </p>
          </div>

          <div ref={stepsRef} className="how-it-works__steps">
            {/* Línea de fondo (track) */}
            <div className="steps-line-track" />

            {/* Línea animada que crece */}
            <motion.div
              className="steps-line-fill"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{
                duration: LINE_DURATION,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              {/* Punto brillante en la punta */}
              <motion.div
                className="steps-line-glow"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: [0, 1, 1, 0] } : { opacity: 0 }}
                transition={{
                  duration: LINE_DURATION,
                  ease: "easeInOut",
                  times: [0, 0.05, 0.9, 1],
                }}
              />
            </motion.div>

            {STEPS.map((step, index) => (
              <div key={step.number} className="step-card">
                {/* Nodo animado */}
                <motion.div
                  className="step-card__node"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={
                    isInView
                      ? { scale: 1, opacity: 1 }
                      : { scale: 0, opacity: 0 }
                  }
                  transition={{
                    delay: NODE_DELAYS[index],
                    duration: 0.5,
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                  }}
                >
                  <span className="step-card__number">{step.number}</span>
                  {/* Pulse ring al activarse */}
                  <motion.span
                    className="step-card__pulse"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={
                      isInView
                        ? { scale: [0.8, 1.8], opacity: [0.6, 0] }
                        : { scale: 0.8, opacity: 0 }
                    }
                    transition={{
                      delay: NODE_DELAYS[index] + 0.15,
                      duration: 0.7,
                      ease: "easeOut",
                    }}
                  />
                </motion.div>

                {/* Icono y texto con fade-up */}
                <motion.div
                  className="step-card__body"
                  initial={{ opacity: 0, y: 16 }}
                  animate={
                    isInView
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: 16 }
                  }
                  transition={{
                    delay: NODE_DELAYS[index] + 0.2,
                    duration: 0.5,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                >
                  <div className="step-card__icon">
                    <Icon name={step.icon} />
                  </div>
                  <h3 className="step-card__title">{step.title}</h3>
                  <p className="step-card__desc">{step.description}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="benefits section" id="benefits">
        <div className="container">
          <div className="benefits__header">
            <span className="section-label">El cambio</span>
            <h2 className="section-title">
              De caos en hojas de cálculo a{" "}
              <span className="gradient-text" style={{ textTransform: "uppercase", letterSpacing: "2px" }}>control total</span>
            </h2>
            <p className="section-subtitle">
              Así se ve el antes y el después de usar Strova.
            </p>
          </div>

          <div className="before-after">
            <div className="before-after__col before-after__col--before">
              <div className="before-after__label">
                <Icon name="close" />
                Sin Strova
              </div>
              <ul className="before-after__list">
                {BEFORE_ITEMS.map((item) => (
                  <li key={item.text}>
                    <Icon name={item.icon} />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="before-after__divider">
              <Icon name="arrow_forward" />
            </div>

            <div className="before-after__col before-after__col--after">
              <div className="before-after__label">
                <Icon name="check" />
                Con Strova
              </div>
              <ul className="before-after__list">
                {AFTER_ITEMS.map((item) => (
                  <li key={item.text}>
                    <Icon name={item.icon} />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <TestimonialCarousel />
        </div>
      </section>
    </>
  );
}
