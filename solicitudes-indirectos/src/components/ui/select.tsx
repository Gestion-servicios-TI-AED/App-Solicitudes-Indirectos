import { type SelectHTMLAttributes, forwardRef, useId } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  /** Show a red asterisk next to the label */
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  /** Extra classes for the wrapper div */
  wrapperClassName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      required,
      options,
      placeholder,
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

        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`
            block w-full rounded-md border px-3 py-2 text-sm text-gray-900
            bg-white appearance-none
            bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")]
            bg-no-repeat bg-[right_0.75rem_center]
            pr-8
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
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {error && (
          <p id={`${id}-error`} className="text-xs text-red-500 mt-0.5">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
