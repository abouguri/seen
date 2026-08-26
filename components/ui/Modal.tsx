"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { copy } from "@/lib/copy";

const SPRING = { type: "spring", stiffness: 320, damping: 32, mass: 0.9 } as const;

type ModalProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
};

/**
 * Centered dialog primitive — Sheet.tsx's portal/backdrop/Escape/focus
 * conventions, scale+fade instead of a bottom-sheet slide-up-with-drag
 * (a centered overlay isn't dismissed by dragging it off-screen the way
 * a sheet is). Used by DetailModal for the library's "click a poster"
 * flow — see components/library/DetailModal.tsx.
 */
export function Modal({ open, onClose, ariaLabel, children }: ModalProps) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
            className="bg-scrim/70 absolute inset-0"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={reduceMotion ? { duration: 0.12 } : SPRING}
            className="bg-surface-1 rounded-lg squircle relative max-h-[85dvh] w-full max-w-[600px] overflow-y-auto outline-none"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={copy.logViewing.close}
              className="bg-scrim/60 text-label absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full"
            >
              <X size={18} strokeWidth={2} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
