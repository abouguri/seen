"use client";

import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";

type ConfirmSheetProps = {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
};

/** §9: every destructive action is confirmed and names what will be lost. */
export function ConfirmSheet({ open, title, body, confirmLabel, onConfirm, onClose }: ConfirmSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-6">
        {body && <p className="text-body text-label-2">{body}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {copy.library.cancelAction}
          </Button>
          <Button
            variant="danger-solid"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
