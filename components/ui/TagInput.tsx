"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { copy } from "@/lib/copy";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Existing tag names, offered as native datalist suggestions. */
  suggestions?: string[];
};

/**
 * Chip-style tag entry: type a name and press Enter or comma to add it,
 * Backspace on an empty field removes the last chip. A native <datalist>
 * gives free, accessible autocomplete without a custom dropdown.
 */
export function TagInput({ value, onChange, suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  function commit(raw: string) {
    const name = raw.trim();
    if (!name) return;
    if (!value.some((t) => t.toLowerCase() === name.toLowerCase())) {
      onChange([...value, name]);
    }
    setDraft("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="text-footnote bg-surface-2 text-label flex items-center gap-1 rounded-full py-1 pr-1.5 pl-3"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`${copy.logViewing.removeTag}: ${tag}`}
              className="text-label-2 hover:text-label flex h-6 w-6 items-center justify-center"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          type="text"
          list={listId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          placeholder={value.length === 0 ? copy.logViewing.tagsPlaceholder : ""}
          aria-label={copy.logViewing.tagsLabel}
          className="text-body bg-surface-2 text-label placeholder:text-label-3 min-h-11 min-w-[8rem] flex-1 rounded-md px-3 outline-offset-2"
        />
        <datalist id={listId}>
          {suggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
