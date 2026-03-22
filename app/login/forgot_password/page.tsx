"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import Image from "next/image";
import { useResetPasswordMutation } from "../_service/authApi";
import { toast } from "sonner";

type Step = "email" | "code";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");

  // Step 1 — email
  const [email, setEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  const emailInvalid = emailTouched && !email;
  const emailFormatInvalid = emailTouched && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const [forgotPassword] = useResetPasswordMutation();


  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    setIsSubmittingEmail(true);
    setEmailError("");
    try {
      await forgotPassword({ email }).unwrap().then(()=>{
        toast.success("Código de verificación enviado a tu email");
        router.push("/login")
      });
      setStep("code");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleResend = async () => {
    try {
      // await forgotPassword({ email }).unwrap();
      await new Promise((r) => setTimeout(r, 500)); // remove when using real API
    } catch {
      // handle silently or show a toast
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link className="auth-header__logo" href="/">
          <img
            src="/assets/strova-claro-nobg.png"
            alt="Strova"
            className="auth-header__logo-img"
            height={32}
            width={32}
          />
        </Link>
      </header>

      <div className="auth-card auth-card--signin">

        {/* ── STEP 1: Email ── */}
        {step === "email" && (
          <>
            <h1 className="auth-card__title">¿Olvidaste tu contraseña?</h1>
            <p className="auth-card__subtitle">
              Ingresa tu email y te enviaremos un código de verificación para restablecer tu contraseña.
            </p>

            {emailError && (
              <div className="auth-alert auth-alert--error">
                <Icon name="error_outline" />
                <span>{emailError}</span>
              </div>
            )}

            <form className="auth-card__form" onSubmit={handleEmailSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div
                  className={`input-wrapper ${emailFocused ? "focused" : ""} ${emailInvalid || emailFormatInvalid ? "error" : ""}`}
                >
                  <span className="input-icon"><Icon name="mail_outline" /></span>
                  <input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => { setEmailFocused(false); setEmailTouched(true); }}
                  />
                </div>
                {emailInvalid && <span className="form-error">El email es requerido</span>}
                {emailFormatInvalid && !emailInvalid && (
                  <span className="form-error">Ingresa un email válido</span>
                )}
              </div>

              <button
                type="submit"
                className="auth-btn auth-btn--primary"
                disabled={isSubmittingEmail}
              >
                {isSubmittingEmail ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <span>Enviar código</span>
                    <Icon name="send" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <p className="auth-card__footer">
          ¿Recordaste tu contraseña? <Link href="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}