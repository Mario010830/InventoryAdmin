"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Switch from "@/components/Switch";
import { Icon } from "@/components/ui/Icon";
import { useAppDispatch } from "@/store/store";
import { useLoginMutation } from "./_service/authApi";
import { type AuthState, loginSuccessfull } from "./_slices/authSlice";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const emailError = touched.email && !email;
  const emailInvalid =
    touched.email && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordError = touched.password && !password;

  const [login] = useLoginMutation();

  // const user = useAppSelector((state) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const emailNormalized = email.trim();
    if (!emailNormalized || !password) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) return;

    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await login({ email: emailNormalized, password }).unwrap();
      if (res.statusCode !== 200 || !res.result) {
        throw new Error("No se pudo iniciar sesión. Intenta de nuevo.");
      }
      dispatch(loginSuccessfull(res.result as AuthState));
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const fallback = "Ocurrió un error. Intenta de nuevo.";
      const apiMsg =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      setErrorMessage(
        apiMsg ?? (err instanceof Error ? err.message : fallback),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link className="auth-header__logo" href="/">
          <img
            src="/assets/elcuadre.png?v=2"
            alt="Tu Cuadre"
            className="auth-header__logo-img"
            height={32}
          />
        </Link>
      </header>

      <div className="auth-card auth-card--signin">
        <h1 className="auth-card__title">Inicia sesión en tu cuenta</h1>

        {errorMessage ? (
          <div className="auth-alert auth-alert--error">
            <Icon name="error_outline" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <form className="auth-card__form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div
              className={`input-wrapper ${emailFocused ? "focused" : ""} ${emailError || emailInvalid ? "error" : ""}`}
            >
              <span className="input-icon">
                <Icon name="mail_outline" />
              </span>
              <input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => {
                  setEmailFocused(false);
                  setTouched((t) => ({ ...t, email: true }));
                }}
              />
            </div>
            {emailError ? (
              <span className="form-error">El email es requerido</span>
            ) : null}
            {emailInvalid && !emailError ? (
              <span className="form-error">Ingresa un email válido</span>
            ) : null}
          </div>

          <div className="form-group">
            <div className="form-group__header">
              <label htmlFor="password">Contraseña</label>
              <Link className="form-link" href="/login/forgot_password">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div
              className={`input-wrapper ${passwordFocused ? "focused" : ""} ${passwordError ? "error" : ""}`}
            >
              <span className="input-icon">
                <Icon name="lock_outline" />
              </span>
              <input
                id="password"
                type={hidePassword ? "password" : "text"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => {
                  setPasswordFocused(false);
                  setTouched((t) => ({ ...t, password: true }));
                }}
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setHidePassword((v) => !v)}
                aria-label={
                  hidePassword ? "Mostrar contraseña" : "Ocultar contraseña"
                }
              >
                <Icon name={hidePassword ? "visibility_off" : "visibility"} />
              </button>
            </div>
            {passwordError ? (
              <span className="form-error">La contraseña es requerida</span>
            ) : null}
          </div>

          <label className="auth-checkbox">
            <Switch
              checked={rememberMe}
              onChange={(checked) => setRememberMe(checked)}
            />
            <span>Recordarme en este dispositivo</span>
          </label>

          <button
            type="submit"
            className="auth-btn auth-btn--primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <Icon name="arrow_forward" />
              </>
            )}
          </button>
        </form>
        <p className="auth-card__footer">
          ¿Nuevo en Tu Cuadre? <Link href="/login/register">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}
