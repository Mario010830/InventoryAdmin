"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DatePickerSimple } from "@/components/DatePickerSimple";
import { PricingPlanCards } from "@/components/pricing";
import { Icon } from "@/components/ui/Icon";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegistrationBillingCycle } from "@/lib/auth-types";
import { isPaidPlan } from "@/lib/plan-utils";
import { useAppDispatch } from "@/store/store";
import {
  useGetPlansQuery,
  useLoginMutation,
  useRegiterWithOrganizationMutation,
} from "../_service/authApi";
import { type AuthState, loginSuccessfull } from "../_slices/authSlice";

/** WhatsApp Ventas — enlace wa.me usa solo dígitos. */
const SALES_WHATSAPP_PHONE_DIGITS = "5358499664";
const SALES_WHATSAPP_DISPLAY = "+53 5 8499664";

function buildSignupSalesWhatsAppUrl(params: {
  organizationName: string;
  planDisplayName: string;
  billingCycle: RegistrationBillingCycle;
}): string {
  const cicloFacturacion =
    params.billingCycle === "annual" ? "Anual" : "Mensual";
  const text = [
    "Hola, acabo de registrarme en Tu Cuadre y quiero coordinar mi plan de pago.",
    "",
    `Organización: ${params.organizationName}`,
    `Plan deseado: ${params.planDisplayName}`,
    `Facturación: ${cicloFacturacion}`,
  ].join("\n");
  return `https://wa.me/${SALES_WHATSAPP_PHONE_DIGITS}?text=${encodeURIComponent(text)}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phonePrefix, setPhonePrefix] = useState("+53");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [birthday, setBirthday] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [codeDirty, setCodeDirty] = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] =
    useState<RegistrationBillingCycle>("monthly");

  const [touchedPersonal, setTouchedPersonal] = useState<
    Record<string, boolean>
  >({});
  const [touchedOrg, setTouchedOrg] = useState<Record<string, boolean>>({});

  const {
    data: plans = [],
    isLoading: plansLoading,
    isError: plansQueryError,
  } = useGetPlansQuery(undefined, { skip: currentStep !== 2 });
  const [registerWithOrganization] = useRegiterWithOrganizationMutation();
  const [login] = useLoginMutation();

  useEffect(() => {
    if (currentStep !== 2) return;
    if (plans.length > 0 && selectedPlanId === null) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId, currentStep]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId),
    [plans, selectedPlanId],
  );
  const selectedIsPaid = isPaidPlan(selectedPlan);

  const passwordMismatch =
    !!password && !!confirmationPassword && password !== confirmationPassword;

  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const passwordValid = hasMinLength && hasUpperCase && hasSpecialChar;

  const phoneDigitsOnly = phoneDigits.replace(/\D/g, "");
  const phoneValidByPrefix =
    (phonePrefix === "+53" && /^\d{7,8}$/.test(phoneDigitsOnly)) ||
    (phonePrefix === "+1" && /^\d{10}$/.test(phoneDigitsOnly));
  const phoneFull = phoneDigitsOnly ? `${phonePrefix}${phoneDigitsOnly}` : "";

  const personalValid =
    fullName.length >= 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    birthday &&
    passwordValid &&
    !passwordMismatch &&
    !!phoneDigitsOnly &&
    phoneValidByPrefix;

  const orgValid = orgName.length >= 2 && orgCode.length >= 2;
  const planValid =
    !plansLoading &&
    !plansQueryError &&
    plans.length > 0 &&
    selectedPlanId !== null;

  const generateCode = () => {
    if (orgName && !codeDirty) {
      setOrgCode(
        orgName
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .substring(0, 10),
      );
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedPersonal({
      fullName: true,
      email: true,
      birthday: true,
      password: true,
      confirmationPassword: true,
      phone: true,
    });
    if (!personalValid) {
      if (passwordMismatch) setErrorMessage("Las contraseñas no coinciden.");
      else if (password.length > 0 && !passwordValid)
        setErrorMessage(
          "La contraseña requiere 6 caracteres, incluyendo al menos 1 letra en mayúsculas y 1 carácter especial.",
        );
      else if (!phoneDigitsOnly) setErrorMessage("El teléfono es requerido.");
      else if (!phoneValidByPrefix)
        setErrorMessage(
          phonePrefix === "+53"
            ? "Teléfono Cuba: 7 u 8 dígitos."
            : "Teléfono EE.UU./Canadá: 10 dígitos.",
        );
      return;
    }
    setErrorMessage("");
    setCurrentStep(1);
  };

  const handleOrgNext = (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedOrg({ name: true, code: true });
    if (!orgValid) return;
    setErrorMessage("");
    setCurrentStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planValid || selectedPlanId === null) {
      setErrorMessage(
        plansQueryError
          ? "No se pudieron cargar los planes. Recarga la página e inténtalo de nuevo."
          : plans.length === 0
            ? "No hay planes disponibles."
            : "Selecciona un plan.",
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const cycle: RegistrationBillingCycle = selectedIsPaid
      ? billingCycle
      : "monthly";

    try {
      await registerWithOrganization({
        organizationName: orgName,
        organizationCode: orgCode,
        fullName,
        email,
        password,
        confirmationPassword,
        birthday: new Date(birthday).toISOString(),
        phone: phoneFull || "",
        gender: null,
        planId: selectedPlanId,
        billingCycle: cycle,
      }).unwrap();

      if (selectedIsPaid) {
        const waUrl = buildSignupSalesWhatsAppUrl({
          organizationName: orgName.trim(),
          planDisplayName: selectedPlan?.displayName?.trim() || "Plan de pago",
          billingCycle,
        });
        window.location.href = waUrl;
        return;
      }

      const res = await login({ email, password }).unwrap();
      if (res.statusCode === 200 && res.result) {
        dispatch(loginSuccessfull(res.result as AuthState));
        router.push("/dashboard");
        router.refresh();
      } else {
        setErrorMessage(
          "Tu cuenta fue creada, pero no se pudo iniciar sesión automáticamente. Entra con tu email y contraseña desde Iniciar sesión.",
        );
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined;
      setErrorMessage(
        msg ??
          (err instanceof Error ? err.message : null) ??
          "Ocurrió un error. Intenta de nuevo.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const cardClass =
    currentStep === 0
      ? "auth-card auth-card--wide"
      : currentStep === 1
        ? "auth-card auth-card--wide auth-card--register-step2"
        : "auth-card auth-card--wide auth-card--register-pricing";

  return (
    <div className="auth-page auth-page--register">
      <div className="auth-page__bg-dashboard" />

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

      <div className={cardClass}>
        <div className="steps-indicator steps-indicator--3">
          <div
            className={`step-dot ${currentStep === 0 ? "active" : ""} ${currentStep > 0 ? "done" : ""}`}
          >
            {currentStep > 0 ? <Icon name="check" /> : <span>1</span>}
          </div>
          <div className={`step-line ${currentStep > 0 ? "active" : ""}`} />
          <div
            className={`step-dot ${currentStep === 1 ? "active" : ""} ${currentStep > 1 ? "done" : ""}`}
          >
            {currentStep > 1 ? <Icon name="check" /> : <span>2</span>}
          </div>
          <div className={`step-line ${currentStep > 1 ? "active" : ""}`} />
          <div className={`step-dot ${currentStep === 2 ? "active" : ""}`}>
            <span>3</span>
          </div>
        </div>

        {errorMessage ? (
          <div className="auth-alert auth-alert--error">
            <Icon name="error_outline" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {currentStep === 0 ? (
          <>
            <h1 className="auth-card__title">Crea tu cuenta de Tu Cuadre</h1>
            <p className="auth-card__subtitle">
              Paso 1 de 3 — Tus datos de administrador
            </p>

            <form className="auth-card__form" onSubmit={handleNextStep}>
              <div className="form-group">
                <label>Nombre completo</label>
                <div
                  className={`input-wrapper ${touchedPersonal.fullName && fullName.length < 3 ? "error" : ""}`}
                >
                  <span className="input-icon">
                    <Icon name="person_outline" />
                  </span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() =>
                      setTouchedPersonal((t) => ({ ...t, fullName: true }))
                    }
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                {touchedPersonal.fullName && fullName.length < 3 ? (
                  <span className="form-error">El nombre es requerido</span>
                ) : null}
              </div>

              <div className="form-group">
                <label>Email</label>
                <div
                  className={`input-wrapper ${touchedPersonal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "error" : ""}`}
                >
                  <span className="input-icon">
                    <Icon name="mail_outline" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() =>
                      setTouchedPersonal((t) => ({ ...t, email: true }))
                    }
                    placeholder="tu@email.com"
                  />
                </div>
                {touchedPersonal.email && !email ? (
                  <span className="form-error">El email es requerido</span>
                ) : null}
                {touchedPersonal.email &&
                email &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? (
                  <span className="form-error">Email inválido</span>
                ) : null}
              </div>

              <div className="form-group">
                <label>Teléfono *</label>
                <div className="input-wrapper input-wrapper--phone">
                  <Select
                    value={phonePrefix}
                    onValueChange={(val: string) => {
                      setPhonePrefix(val);
                      if (
                        val === "+53" &&
                        phoneDigits.replace(/\D/g, "").length > 8
                      )
                        setPhoneDigits((d) => d.replace(/\D/g, "").slice(0, 8));
                    }}
                  >
                    <SelectTrigger className="phone-prefix-trigger">
                      <SelectValue>
                        {phonePrefix === "+53" ? (
                          <span className="phone-option">
                            <img
                              src="https://flagcdn.com/w20/cu.png"
                              alt="CU"
                              width={20}
                              height={14}
                              className="phone-flag"
                            />
                            +53
                          </span>
                        ) : (
                          <span className="phone-option">
                            <img
                              src="https://flagcdn.com/w20/us.png"
                              alt="US"
                              width={20}
                              height={14}
                              className="phone-flag"
                            />
                            +1
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="+53">
                          <span className="phone-option">
                            <img
                              src="https://flagcdn.com/w20/cu.png"
                              alt="CU"
                              width={20}
                              height={14}
                              className="phone-flag"
                            />
                            +53
                          </span>
                        </SelectItem>
                        <SelectItem value="+1">
                          <span className="phone-option">
                            <img
                              src="https://flagcdn.com/w20/us.png"
                              alt="US"
                              width={20}
                              height={14}
                              className="phone-flag"
                            />
                            +1
                          </span>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phoneDigits}
                    onChange={(e) =>
                      setPhoneDigits(
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, phonePrefix === "+1" ? 10 : 8),
                      )
                    }
                    onBlur={() =>
                      setTouchedPersonal((t) => ({ ...t, phone: true }))
                    }
                    placeholder="+1 234 567"
                    className="phone-number-input"
                  />
                </div>
                {touchedPersonal.phone && !phoneDigitsOnly ? (
                  <span className="form-error">El teléfono es requerido</span>
                ) : null}
                {touchedPersonal.phone &&
                phoneDigitsOnly &&
                !phoneValidByPrefix ? (
                  <span className="form-error">
                    {phonePrefix === "+53"
                      ? "Introduce 7 u 8 dígitos (ej. 51234567)."
                      : "Introduce 10 dígitos (ej. 2345678901)."}
                  </span>
                ) : null}
              </div>

              <div className="form-group">
                <label>Fecha de nacimiento</label>
                <DatePickerSimple
                  date={birthday}
                  setDate={(date) => setBirthday(date ? date : "")}
                  emptyLabel="Select date"
                />
                {touchedPersonal.birthday && !birthday ? (
                  <span className="form-error">La fecha es requerida</span>
                ) : null}
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <div
                  className={`input-wrapper ${touchedPersonal.password && password.length > 0 && !passwordValid ? "error" : ""}`}
                >
                  <span className="input-icon">
                    <Icon name="lock_outline" />
                  </span>
                  <input
                    type={hidePassword ? "password" : "text"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() =>
                      setTouchedPersonal((t) => ({ ...t, password: true }))
                    }
                    placeholder="Escriba su contraseña"
                  />
                  <button
                    type="button"
                    className="input-toggle"
                    onClick={() => setHidePassword((v) => !v)}
                    aria-label={
                      hidePassword ? "Mostrar contraseña" : "Ocultar contraseña"
                    }
                  >
                    <Icon
                      name={hidePassword ? "visibility_off" : "visibility"}
                    />
                  </button>
                </div>
                <span className="form-hint">
                  Mínimo 6 caracteres, al menos 1 mayúscula y 1 carácter
                  especial.
                </span>
                {touchedPersonal.password &&
                password.length > 0 &&
                !passwordValid ? (
                  <span className="form-error">
                    La contraseña requiere 6 caracteres, incluyendo al menos 1
                    letra en mayúsculas y 1 carácter especial.
                  </span>
                ) : null}
              </div>

              <div className="form-group">
                <label>Confirmar contraseña</label>
                <div
                  className={`input-wrapper ${passwordMismatch && touchedPersonal.confirmationPassword ? "error" : ""}`}
                >
                  <span className="input-icon">
                    <Icon name="lock_outline" />
                  </span>
                  <input
                    type={hideConfirm ? "password" : "text"}
                    value={confirmationPassword}
                    onChange={(e) => setConfirmationPassword(e.target.value)}
                    onBlur={() =>
                      setTouchedPersonal((t) => ({
                        ...t,
                        confirmationPassword: true,
                      }))
                    }
                    placeholder="Repite tu contraseña"
                  />
                  <button
                    type="button"
                    className="input-toggle"
                    onClick={() => setHideConfirm((v) => !v)}
                    aria-label={
                      hideConfirm ? "Mostrar contraseña" : "Ocultar contraseña"
                    }
                  >
                    <Icon
                      name={hideConfirm ? "visibility_off" : "visibility"}
                    />
                  </button>
                </div>
                {passwordMismatch && touchedPersonal.confirmationPassword ? (
                  <span className="form-error">
                    Las contraseñas no coinciden
                  </span>
                ) : null}
              </div>

              <button
                type="submit"
                className="auth-btn"
                disabled={!personalValid}
              >
                <span>Siguiente</span>
                <Icon name="arrow_forward" />
              </button>
            </form>
          </>
        ) : currentStep === 1 ? (
          <>
            <h1 className="auth-card__title">Tu organización</h1>
            <p className="auth-card__subtitle">
              Paso 2 de 3 — Datos de tu empresa o negocio
            </p>

            <form className="auth-card__form" onSubmit={handleOrgNext}>
              <div className="form-group">
                <label>Nombre de la empresa</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Icon name="business" />
                  </span>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    onBlur={() => {
                      setTouchedOrg((t) => ({ ...t, name: true }));
                      generateCode();
                    }}
                    placeholder="Ej: Mi Empresa S.A."
                  />
                </div>
                {touchedOrg.name && orgName.length < 2 ? (
                  <span className="form-error">El nombre es requerido</span>
                ) : null}
              </div>

              <div className="form-group">
                <label>Código único</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <Icon name="tag" />
                  </span>
                  <input
                    value={orgCode}
                    onChange={(e) => {
                      setOrgCode(e.target.value);
                      setCodeDirty(true);
                      setTouchedOrg((t) => ({ ...t, code: true }));
                    }}
                    placeholder="MIEMPRESA"
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
                <span className="form-hint">
                  Identificador único de tu organización (se genera
                  automáticamente)
                </span>
                {touchedOrg.code && orgCode.length < 2 ? (
                  <span className="form-error">El código es requerido</span>
                ) : null}
              </div>

              <div className="auth-card__info">
                <Icon name="info_outline" />
                <span>
                  Como administrador, luego podrás agregar empleados y
                  asignarles roles desde el dashboard.
                </span>
              </div>

              <div className="btn-row">
                <button
                  type="button"
                  className="auth-btn auth-btn--outline"
                  onClick={() => {
                    setCurrentStep(0);
                    setErrorMessage("");
                  }}
                >
                  <Icon name="arrow_back" />
                  <span>Atrás</span>
                </button>
                <button type="submit" className="auth-btn" disabled={!orgValid}>
                  <span>Siguiente</span>
                  <Icon name="arrow_forward" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <form
            className="auth-card__form"
            onSubmit={handleFinalSubmit}
            style={{ gap: 0 }}
          >
            <p
              className="auth-card__subtitle"
              style={{ textAlign: "center", marginBottom: 0 }}
            >
              Paso 3 de 3 — Elige tu plan
            </p>

            <div className="register-pricing">
              <div className="register-pricing-head">
                <h2>Elige tu plan</h2>
                <p>Sin contratos. Sin sorpresas. Cancela cuando quieras.</p>
              </div>

              {plansLoading ? (
                <div className="pricing-plans-loading">Cargando planes…</div>
              ) : plansQueryError ? (
                <div className="pricing-plans-error" role="alert">
                  No se pudieron cargar los planes. Recarga la página.
                </div>
              ) : plans.length === 0 ? (
                <div className="pricing-plans-error" role="alert">
                  No hay planes disponibles.
                </div>
              ) : (
                <PricingPlanCards
                  variant="signup"
                  plans={plans}
                  billingCycle={billingCycle}
                  onBillingCycleChange={setBillingCycle}
                  selectedPlanId={selectedPlanId}
                  onSelectPlan={setSelectedPlanId}
                />
              )}

              {selectedIsPaid &&
              !plansLoading &&
              !plansQueryError &&
              plans.length > 0 ? (
                <div className="auth-card__info" style={{ marginTop: 12 }}>
                  <Icon name="info_outline" />
                  <span>
                    Al pulsar <strong>Crear cuenta</strong>, si el registro es
                    correcto, te llevaremos al WhatsApp de{" "}
                    <strong>Ventas</strong> ({SALES_WHATSAPP_DISPLAY}) con un
                    mensaje que incluye tu organización y el plan elegido, para
                    que podamos ayudarte a activarlo.
                  </span>
                </div>
              ) : null}

              <div className="btn-row" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="auth-btn auth-btn--outline"
                  onClick={() => {
                    setCurrentStep(1);
                    setErrorMessage("");
                  }}
                >
                  <Icon name="arrow_back" />
                  <span>Atrás</span>
                </button>
                <button
                  type="submit"
                  className="auth-btn"
                  disabled={isLoading || !planValid}
                >
                  {isLoading ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <span>Crear cuenta</span>
                      <Icon name="rocket_launch" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        <p className="auth-card__footer">
          ¿Ya tienes cuenta? <Link href="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
