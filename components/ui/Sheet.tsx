"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { copy } from "@/lib/copy";

const SPRING = { type: "spring", stiffness: 320, damping: 32, mass: 0.9 } as const;

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

/**
 * Bottom sheet primitive (§7.3/§7.4) — slides up with a rubber-band
 * spring, dims the backdrop, drag-to-dismiss, Escape closes (§7.7).
 * prefers-reduced-motion collapses the slide to a 120ms opacity fade.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);

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
    if (open) sheetRef.current?.focus();
  }, [open]);

  if (!mounted) return null;

  const slideVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.12 } },
      }
    : {
        hidden: { y: "100%" },
        visible: { y: 0, transition: SPRING },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
            className="absolute inset-0 bg-scrim/40"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            drag={reduceMotion ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            // Capped and centred above sm: a form stretched across a
            // 1440px window puts its label and its field metres apart,
            // and the sheet's own edges stop reading as edges. Below sm
            // it stays full-bleed, which is what a bottom sheet is for.
            className="bg-surface-1 border-separator squircle absolute inset-x-0 bottom-0 mx-auto max-h-[90dvh] overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)] outline-none sm:max-w-180 sm:border-x"
          >
            <div className="bg-separator-strong mx-auto mt-2 h-1 w-9 rounded-full" />
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-eyebrow text-label-3">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={copy.logViewing.close}
                className="text-label-2 flex h-11 w-11 items-center justify-center"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="px-5 pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
