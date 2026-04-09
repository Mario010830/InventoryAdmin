import { useId } from "react";
import styled from "styled-components";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  id,
  className,
  disabled = false,
}) => {
  const autoId = useId();
  const switchId = id ?? autoId;

  return (
    <StyledSwitch
      className={className}
      data-disabled={disabled ? "true" : undefined}
    >
      <input
        type="checkbox"
        className="switch__input"
        id={switchId}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label className="switch__track" htmlFor={switchId}>
        <span className="switch__thumb" />
      </label>
    </StyledSwitch>
  );
};

const StyledSwitch = styled.div`
  display: inline-flex;
  align-items: center;

  .switch__input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .switch__track {
    position: relative;
    width: 44px;
    height: 24px;
    border-radius: 999px;
    background-color: #e5e7eb;
    border: 1px solid #cbd5e1;
    cursor: pointer;
    transition: background-color 0.18s ease, border-color 0.18s ease,
      box-shadow 0.18s ease;
    display: inline-flex;
    align-items: center;
    padding: 0 2px;
    box-sizing: border-box;
  }

  .switch__thumb {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.35);
    transform: translateX(0);
    transition: transform 0.18s ease;
  }

  .switch__input:checked + .switch__track {
    background-color: #2563eb;
    border-color: #1d4ed8;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  .switch__input:checked + .switch__track .switch__thumb {
    transform: translateX(18px);
  }

  &[data-disabled="true"] .switch__track {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export default Switch;
