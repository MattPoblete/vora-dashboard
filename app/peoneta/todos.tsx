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
      className="btn btn-secundario btn-chico shrink-0"
    >
      Marcar todos
    </button>
  );
}
