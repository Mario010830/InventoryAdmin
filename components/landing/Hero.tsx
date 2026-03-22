"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const ROTATING_WORDS = ["Organiza", "Optimiza", "Controla"];

const TAGS = [
  { icon: "inventory_2", text: "Productos" },
  { icon: "swap_horiz", text: "Movimientos" },
  { icon: "warehouse", text: "Multi-almacén" },
  { icon: "local_shipping", text: "Proveedores" },
  { icon: "admin_panel_settings", text: "Roles" },
  { icon: "notifications_active", text: "Alertas" },
];

function scrollToFeatures() {
  const el = document.getElementById("features");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export function Hero() {
  const [wordIndex, setWordIndex] = useState(0);

  const nextWord = useCallback(() => {
    setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextWord, 2800);
    return () => clearInterval(timer);
  }, [nextWord]);

  return (
    <section className="hero">
      <div className="hero__bg">
        <div className="hero__grid" />
        <div className="hero__glow hero__glow--1" />
        <div className="hero__glow hero__glow--2" />
      </div>

      {/* Animated flying birds */}
      <div className="hero__birds">
        <div className="bird-container bird-container--one">
          <div className="bird bird--one" />
        </div>
        <div className="bird-container bird-container--two">
          <div className="bird bird--two" />
        </div>
        <div className="bird-container bird-container--three">
          <div className="bird bird--three" />
        </div>
        <div className="bird-container bird-container--four">
          <div className="bird bird--four" />
        </div>
        <div className="bird-container bird-container--five">
          <div className="bird bird--five" />
        </div>
        <div className="bird-container bird-container--six">
          <div className="bird bird--six" />
        </div>
        <div className="bird-container bird-container--seven">
          <div className="bird bird--seven" />
        </div>
      </div>

      <div className="hero__container container">
        <div className="hero__content">
          <div className="hero__badge">
            <span className="hero__badge-dot" />
            <span>Multi-almacén, proveedores, movimientos en tiempo real</span>
            <Icon name="arrow_forward" />
          </div>

          <h1 className="hero__title">
            <span className="hero__title-rotating">
              <AnimatePresence mode="wait">
                <motion.span
                  key={ROTATING_WORDS[wordIndex]}
                  className="hero__title-gradient hero__title-word"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                >
                  {ROTATING_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>{" "}
            tu inventario
            <br />
            con <span className="hero__title-gradient">Strova</span>
          </h1>

          <p className="hero__subtitle">
            Controla productos, proveedores, ubicaciones y movimientos de stock
            desde una sola plataforma. Toma decisiones con datos reales y nunca
            pierdas una venta por falta de inventario.
          </p>

          <div className="hero__actions">
            <Link href="/login" className="btn-primary btn-hero">
              Comenzar Gratis
              <Icon name="rocket_launch" />
            </Link>
            <button type="button" className="btn-outline" onClick={scrollToFeatures}>
              <Icon name="play_circle" />
              Ver Características
            </button>
          </div>

          <div className="hero__trust">
            <div className="hero__trust-check">
              <Icon name="check_circle" />
              <span>Sin tarjeta de crédito</span>
            </div>
            <div className="hero__trust-check">
              <Icon name="check_circle" />
              <span>Setup en 5 minutos</span>
            </div>
            <div className="hero__trust-check">
              <Icon name="check_circle" />
              <span>Soporte incluido</span>
            </div>
          </div>
        </div>

        <div className="hero__visual">
          <div className="hero__dashboard">
            <div className="dashboard-header">
              <div className="dashboard-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="dashboard-title">Strova — Dashboard</span>
            </div>
            <div className="dashboard-body">
              <div className="dashboard-sidebar">
                <div className="sidebar-item active">
                  <Icon name="dashboard" />
                  <span>Dashboard</span>
                </div>
                <div className="sidebar-item">
                  <Icon name="inventory" />
                  <span>Productos</span>
                </div>
                <div className="sidebar-item">
                  <Icon name="swap_horiz" />
                  <span>Movimientos</span>
                </div>
                <div className="sidebar-item">
                  <Icon name="local_shipping" />
                  <span>Proveedores</span>
                </div>
                <div className="sidebar-item">
                  <Icon name="warehouse" />
                  <span>Ubicaciones</span>
                </div>
              </div>
              <div className="dashboard-content">
                <div className="stat-cards">
                  <div className="stat-card">
                    <span className="stat-icon stat-icon--purple">
                      <Icon name="inventory_2" />
                    </span>
                    <div>
                      <span className="stat-value">2,847</span>
                      <span className="stat-label">Productos</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon stat-icon--green">
                      <Icon name="trending_up" />
                    </span>
                    <div>
                      <span className="stat-value">+23%</span>
                      <span className="stat-label">Entradas</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon stat-icon--amber">
                      <Icon name="warning" />
                    </span>
                    <div>
                      <span className="stat-value">12</span>
                      <span className="stat-label">Stock bajo</span>
                    </div>
                  </div>
                </div>
                <div className="chart-placeholder">
                  <div className="chart-bars">
                    <div className="bar" style={{ height: "40%" }} />
                    <div className="bar" style={{ height: "65%" }} />
                    <div className="bar" style={{ height: "45%" }} />
                    <div className="bar" style={{ height: "80%" }} />
                    <div className="bar" style={{ height: "55%" }} />
                    <div className="bar" style={{ height: "90%" }} />
                    <div className="bar" style={{ height: "70%" }} />
                    <div className="bar active" style={{ height: "85%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hero__float-card hero__float-card--1">
            <Icon name="check_circle" className="fc-icon fc-icon--green" />
            <div>
              <strong>Movimiento #1284</strong>
              <span>Entrada registrada con éxito</span>
            </div>
          </div>

          <div className="hero__float-card hero__float-card--2">
            <Icon name="notifications_active" className="fc-icon fc-icon--amber" />
            <div>
              <strong>Alerta de stock mínimo</strong>
              <span>Teclado Logitech — Quedan 3 uds.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero__tags container">
        {TAGS.map((tag) => (
          <div key={tag.text} className="hero__tag">
            <Icon name={tag.icon} />
            <span>{tag.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
