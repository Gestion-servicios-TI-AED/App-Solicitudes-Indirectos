import { type InputHTMLAttributes, forwardRef, useId } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Show a red asterisk next to the label */
  required?: boolean;
  /** Extra classes for the wrapper div */
  wrapperClassName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      required,
      id: idProp,
      wrapperClassName = "",
      className = "",
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;

    return (
      <div className={`flex flex-col gap-1 w-full ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-gray-700 select-none"
          >
            {label}
            {required && (
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`
            block w-full rounded-md border px-3 py-2 text-sm text-gray-900
            placeholder:text-gray-400
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400
            ${error
              ? "border-red-400 focus:ring-red-400 focus:border-red-400"
              : "border-gray-300 hover:border-gray-400"
            }
            ${className}
          `}
          {...props}
        />

        {error && (
          <p id={`${id}-error`} className="text-xs text-red-500 mt-0.5">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
