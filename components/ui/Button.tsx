import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-solid" | "icon" | "icon-danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

// One geometry, five variants (SEEN Interaction Plan §3.1): 44px tall,
// --r-md radius, --t-hover fills/colour, --t-press scale on :active.
// Hover moves lighter (--accent-hi / --danger-hi), never darker — with a
// black on-accent label, --accent already sits at 4.63:1, and darkening
// it on hover (e.g. #6B51F5) drops below the 4.5:1 floor.
const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hi",
  secondary: "bg-surface-2 text-label border border-separator hover:bg-surface-3",
  ghost: "bg-transparent text-label-2 hover:bg-surface-1 hover:text-label",
  danger: "bg-transparent text-danger hover:bg-danger/13 hover:text-danger-hi",
  // Filled, for a confirm-sheet's actual destructive action — the ghost
  // "danger" variant above reads as a low-emphasis link, wrong weight
  // for "yes, delete this". --on-accent (black) clears both modes:
  // 7.03:1 on dark-mode --danger, a bare 4.51:1 on light-mode's darker
  // --danger — same thin-but-compliant margin the app already accepts
  // for --accent (4.63:1).
  "danger-solid": "bg-danger text-on-accent hover:bg-danger-hi",
  icon: "h-11 w-11 justify-center p-0 bg-transparent text-label-2 hover:bg-surface-2 hover:text-label",
  "icon-danger": "h-11 w-11 justify-center p-0 bg-transparent text-danger hover:bg-danger/13 hover:text-danger-hi",
};

const iconOnly = new Set<Variant>(["icon", "icon-danger"]);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className, disabled, ...props }, ref) {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          "text-headline inline-flex min-h-11 items-center justify-center gap-2 rounded-md outline-offset-2",
          "transition-[background-color,color,box-shadow] duration-(--t-hover) ease-(--default-transition-timing-function)",
          "active:scale-[.97] active:duration-(--t-press)",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
          iconOnly.has(variant) ? variantClasses[variant] : clsx("px-5", variantClasses[variant]),
          className,
        )}
        {...props}
      />
    );
  },
);
