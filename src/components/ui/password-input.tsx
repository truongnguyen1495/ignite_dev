"use client";

import { forwardRef, useId, useState, type ComponentPropsWithoutRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FieldWrapper, fieldClass, type FieldWrapperProps } from "@/components/ui/form";

export type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & FieldWrapperProps;

// Its own file rather than a fourth export from form.tsx: the show/hide toggle
// needs state, and putting "use client" on form.tsx would drag Input, Textarea
// and Select across the boundary too — every plain field in the app, including
// the ones rendered straight from Server Components.
//
// Replaces three near-identical hand-rolled copies (login, register, change
// password) and covers the seven fields that had no reveal at all.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, error, hint, id, className = "", ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  // Some callers pass no id (the label is then purely decorative). Generating
  // one keeps label/input associated so the label stays clickable and screen
  // readers announce the field.
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldWrapper label={label} error={error} hint={hint} id={inputId}>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          // pr-10 reserves the toggle's width so a long password never runs
          // underneath the eye.
          className={`${fieldClass} pr-10 ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // Off the tab order deliberately: tabbing out of a password field
          // should reach the submit button, not a display toggle.
          tabIndex={-1}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FieldWrapper>
  );
});
