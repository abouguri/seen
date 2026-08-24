"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

export type ContextMenuItem = {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
};

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
};

const MENU_WIDTH = 220;

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - MENU_WIDTH - 8);
  const top = Math.min(y, window.innerHeight - items.length * 44 - 16);

  return createPortal(
    <motion.div
      ref={ref}
      role="menu"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.15 }}
      className="material-chrome border-separator squircle fixed z-50 overflow-hidden rounded-md border py-1"
      style={{ left, top, width: MENU_WIDTH }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          className={`text-body flex min-h-11 w-full items-center px-4 text-left ${
            item.destructive ? "text-danger" : "text-label"
          } hover:bg-surface-2`}
        >
          {item.label}
        </button>
      ))}
    </motion.div>,
    document.body,
  );
}
