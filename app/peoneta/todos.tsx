"use client";

// toggles every checkbox of the courier block the button lives in
export function Todos() {
  return (
    <button
      type="button"
      onClick={(e) => {
        const boxes = [
          ...e.currentTarget
            .closest("fieldset")!
            .querySelectorAll<HTMLInputElement>("input[type=checkbox]"),
        ];
        const all = boxes.every((b) => b.checked);
        boxes.forEach((b) => (b.checked = !all));
      }}
      className="shrink-0 whitespace-nowrap rounded-full border border-border bg-surface-2 px-4 py-1.5 text-sm hover:bg-border"
    >
      Marcar todos
    </button>
  );
}
