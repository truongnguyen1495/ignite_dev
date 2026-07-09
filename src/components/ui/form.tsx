import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

const fieldClass =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

type FieldWrapperProps = {
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
};

function FieldWrapper({ label, error, hint, id, children }: FieldWrapperProps & { children: ReactNode }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export type InputProps = ComponentPropsWithoutRef<"input"> & FieldWrapperProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = "", ...props },
  ref
) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} id={id}>
      <input ref={ref} id={id} className={`${fieldClass} ${className}`} {...props} />
    </FieldWrapper>
  );
});

export type TextareaProps = ComponentPropsWithoutRef<"textarea"> & FieldWrapperProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className = "", ...props },
  ref
) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} id={id}>
      <textarea ref={ref} id={id} className={`${fieldClass} ${className}`} {...props} />
    </FieldWrapper>
  );
});

export type SelectProps = ComponentPropsWithoutRef<"select"> & FieldWrapperProps;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className = "", children, ...props },
  ref
) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} id={id}>
      <select ref={ref} id={id} className={`${fieldClass} ${className}`} {...props}>
        {children}
      </select>
    </FieldWrapper>
  );
});
