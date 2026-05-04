import { type TextareaHTMLAttributes, forwardRef, useId } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** Show a red asterisk next to the label */
  required?: boolean;
  /** Show remaining / max character count */
  showCount?: boolean;
  /** Extra classes for the wrapper div */
  wrapperClassName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      required,
      showCount = false,
      id: idProp,
      wrapperClassName = "",
      className = "",
      maxLength,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;

    // Compute character count for the counter badge
    const currentLength =
      typeof value === "string"
        ? value.length
        : typeof defaultValue === "string"
        ? defaultValue.length
        : 0;

    return (
      <div className={`flex flex-col gap-1 w-full ${wrapperClassName}`}>
        {/* Label row */}
        <div className="flex items-center justify-between">
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

          {showCount && maxLength != null && (
            <span
              className={`text-xs tabular-nums ${
                currentLength >= maxLength ? "text-red-500" : "text-gray-400"
              }`}
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={id}
          required={required}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          rows={4}
          className={`
            block w-full rounded-md border px-3 py-2 text-sm text-gray-900
            placeholder:text-gray-400 resize-y
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

Textarea.displayName = "Textarea";
