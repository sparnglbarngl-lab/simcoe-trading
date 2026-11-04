/* Shared native-dialog behavior. User dismissal is distinct from navigation. */
import {closeSelects} from "./selects.js";

const dialogs = Array.from(document.querySelectorAll(".terminal-dialog"));

export function closeMenus() {
  closeSelects();
  document.querySelectorAll(".app-menu[open]").forEach(menu => { menu.open = false; });
}

export function openDialog(dialog) {
  if (typeof dialog === "string") dialog = document.getElementById(dialog);
  if (!dialog || dialog.open || document.querySelector("dialog[open]")) return;
  closeMenus();
  document.dispatchEvent(new Event("simcoe:dialog-open"));
  dialog.showModal();
}

function dismissDialog(dialog) {
  if (!dialog?.open) return;
  // Dispatch synchronously: native close events arrive after subsequent navigation.
  dialog.dispatchEvent(new Event("simcoe:dialog-dismiss"));
  dialog.close();
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-close-dialog]");
  if (button) dismissDialog(button.closest("dialog"));
});

dialogs.forEach(dialog => {
  const outside = event => {
    if (event.target !== dialog) return false;
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom;
  };
  let pressedOutside = false;
  dialog.addEventListener("pointerdown", event => {
    pressedOutside = event.button === 0 && outside(event);
  });
  dialog.addEventListener("pointercancel", () => { pressedOutside = false; });
  dialog.addEventListener("click", event => {
    const dismiss = pressedOutside && outside(event);
    pressedOutside = false;
    if (dismiss) dismissDialog(dialog);
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    dismissDialog(dialog);
  });
});
