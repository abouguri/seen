import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90",
  secondary:
    "bg-surface-2 text-label border border-separator hover:bg-surface-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className, disabled, ...props }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          "text-headline inline-flex min-h-11 items-center justify-center rounded-md px-5 transition-opacity disabled:cursor-not-allowed disabled:opacity-40",
          variantClasses[variant],
          className,
        )}
        {...props}
      />
    );
  },
);
