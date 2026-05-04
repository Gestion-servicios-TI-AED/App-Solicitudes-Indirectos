import { type HTMLAttributes } from "react";

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── CardHeader ───────────────────────────────────────────────────────────────

export function CardHeader({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-6 py-4 border-b border-gray-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── CardTitle ────────────────────────────────────────────────────────────────

export function CardTitle({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-base font-semibold text-gray-900 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

// ─── CardContent ──────────────────────────────────────────────────────────────

export function CardContent({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

// ─── CardFooter ───────────────────────────────────────────────────────────────

export function CardFooter({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
