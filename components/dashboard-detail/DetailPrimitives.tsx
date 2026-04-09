import type { ReactNode } from "react";

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="gd-detail-section">
      <h3 className="gd-detail-section__title">{title}</h3>
      <div className="gd-detail-section__divider" role="presentation" />
      <div className="gd-detail-section__grid">{children}</div>
    </section>
  );
}

export function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="gd-detail-field">
      <span className="gd-detail-field__label">{label}</span>
      <div className="gd-detail-field__value">{value}</div>
    </div>
  );
}

export function BoolBadge({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <span className={`dt-tag ${value ? "dt-tag--green" : "dt-tag--red"}`}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}
