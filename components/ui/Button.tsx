import { type ButtonHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

type Variant =
  | "primary"
  | "warm"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-solid"
  | "icon"
  | "icon-danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

// One geometry, several variants (SEEN Interaction Plan §3.1): 44px
// tall, --r-md radius, --t-hover fills/colour, --t-press scale on
// :active. Hover direction is per-mode and set in the token file, not
// here: --accent-hi moves lighter in dark mode and darker in light,
// whichever gains contrast against that mode's ground.
const variantClasses: Record<Variant, string> = {
  // The lifted shadow is part of the redesign's primary button — the
  // accent is dark enough on the near-black ground that a flat fill
  // reads as a disabled tile without it.
  primary: "bg-accent text-on-accent hover:bg-accent-hi shadow-[0_12px_30px_-6px_var(--accent-dim)]",
  // Warm secondary — for the one action that ends a flow ("Done" on the
  // poster wall). Never a second primary: if two of these are on screen
  // at once, one of them is wrong.
  warm: "bg-warm text-on-warm hover:brightness-110",
  secondary: "bg-surface-2 text-label border border-separator hover:bg-surface-3",
  ghost: "bg-transparent text-label-2 hover:bg-surface-1 hover:text-label",
  danger: "bg-transparent text-danger hover:bg-danger/13 hover:text-danger-hi",
  // Filled, for a confirm-sheet's actual destructive action — the ghost
  // "danger" variant above reads as a low-emphasis link, wrong weight
  // for "yes, delete this". Takes --on-danger rather than --on-accent:
  // the latter went white for the violet, and white on dark mode's red
  // is 2.99:1. --on-danger is black in dark mode (7.03:1) and white in
  // light (5.47:1) — the label flips, the fill doesn't.
  "danger-solid": "bg-danger text-on-danger hover:bg-danger-hi",
  icon: "h-11 w-11 justify-center p-0 bg-transparent text-label-2 hover:bg-surface-2 hover:text-label",
  "icon-danger":
    "h-11 w-11 justify-center p-0 bg-transparent text-danger hover:bg-danger/13 hover:text-danger-hi",
};

const iconOnly = new Set<Variant>(["icon", "icon-danger"]);

/**
 * The button's classes without the button — for the handful of places
 * where the control is semantically a link (a navigation that happens to
 * look like an action). Rendering a <button> that calls router.push
 * would cost middle-click, open-in-new-tab, and the status-bar URL.
 */
export function buttonClasses({
  variant = "primary",
  className,
}: { variant?: Variant; className?: string } = {}) {
  return clsx(
    "text-subhead inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-bold outline-offset-2",
    "transition-[background-color,color,box-shadow,filter] duration-(--t-hover) ease-(--default-transition-timing-function)",
    "active:scale-[.97] active:duration-(--t-press)",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
    iconOnly.has(variant) ? variantClasses[variant] : clsx("px-5", variantClasses[variant]),
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={buttonClasses({ variant, className })}
      {...props}
    />
  );
});
