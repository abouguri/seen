"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { copy } from "@/lib/copy";

const SPRING = { type: "spring", stiffness: 340, damping: 36, mass: 0.9 } as const;

type SidePanelProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
};

/**
 * A dialog that arrives from the right edge and takes the full height —
 * Sheet.tsx's portal/backdrop/Escape/focus conventions with a horizontal
 * entrance, per the SEEN Redesign.
 *
 * Why a side panel and not a centred box: the thing it holds is a
 * *record* — a poster, then a column of viewings that grows for the rest
 * of the film's life in your library. That wants height, and a centred
 * dialog can only get height by eating the width the library grid is
 * still showing behind it. Sliding in from the edge also leaves the
 * grid visible and in place, so closing returns you to exactly the
 * scroll position and tile you left, without the app appearing to
 * navigate anywhere.
 *
 * Below sm it goes full-bleed — at 390px a 560px panel with a sliver of
 * backdrop is just a worse full screen.
 */
export function SidePanel({ open, onClose, ariaLabel, children }: SidePanelProps) {
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
            className="bg-scrim/70 absolute inset-0 backdrop-blur-[10px]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            tabIndex={-1}
            // Reduced motion gets a plain fade, not a shortened slide —
            // a 560px horizontal translate is exactly the kind of motion
            // the preference exists to remove (§7.4).
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: "100%" }}
            transition={reduceMotion ? { duration: 0.12 } : SPRING}
            className="bg-surface-1 border-separator-strong relative h-full w-full max-w-140 overflow-y-auto border-l shadow-[-40px_0_90px_-20px_rgba(0,0,0,.5)] outline-none"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.logViewing.close}
              className="bg-scrim/60 text-label border-separator-strong hover:bg-scrim/80 absolute top-4 right-4 z-10 flex h-9.5 w-9.5 items-center justify-center rounded-full border backdrop-blur-md transition-colors duration-(--t-hover)"
            >
              <X size={16} strokeWidth={2} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
