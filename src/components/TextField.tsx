import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: boolean;
}

export function TextField({ label, helper, error, ...rest }: TextFieldProps) {
  const classes = ['field', error ? 'field--error' : ''].filter(Boolean).join(' ');
  return (
    <label className={classes}>
      {label && <span className="field__label">{label}</span>}
      <input {...rest} className="field__input" />
      {helper && <span className="field__helper">{helper}</span>}
    </label>
  );
}
