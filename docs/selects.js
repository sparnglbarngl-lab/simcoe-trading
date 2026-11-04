/* Shared, themed select popups. Native selects retain their values, form names and no-JavaScript fallback. */
const controls = new WeakMap();
let opened = null;

export function closeSelects(restoreFocus = false) {
  if (!opened) return;
  const control = opened;
  opened = null;
  if (control.menu.matches(":popover-open")) control.menu.hidePopover();
  control.button.setAttribute("aria-expanded", "false");
  control.button.removeAttribute("aria-activedescendant");
  if (restoreFocus) control.button.focus({preventScroll: true});
}

export function focusSelect(select) {
  (controls.get(select)?.button || select).focus();
}

function positionMenu() {
  if (!opened) return;
  const {button, menu} = opened;
  const box = button.getBoundingClientRect();
  const viewport = window.visualViewport;
  const leftEdge = (viewport?.offsetLeft || 0) + 8;
  const topEdge = (viewport?.offsetTop || 0) + 8;
  const rightEdge = leftEdge + (viewport?.width || innerWidth) - 16;
  const bottomEdge = topEdge + (viewport?.height || innerHeight) - 16;
  if (box.bottom < topEdge || box.top > bottomEdge || box.right < leftEdge || box.left > rightEdge) {
    closeSelects();
    return;
  }
  const width = Math.min(Math.max(box.width, 128), rightEdge - leftEdge);
  menu.style.setProperty("--select-width", `${width}px`);
  const below = bottomEdge - box.bottom - 6;
  const above = box.top - topEdge - 6;
  const naturalHeight = Math.min(menu.scrollHeight + 2, 320);
  const upwards = below < naturalHeight && above > below;
  const height = Math.min(naturalHeight, Math.max(40, upwards ? above : below), bottomEdge - topEdge);
  const top = upwards ? box.top - height - 6 : box.bottom + 6;
  menu.style.setProperty("--select-left", `${Math.max(leftEdge, Math.min(box.left, rightEdge - width))}px`);
  menu.style.setProperty("--select-top", `${Math.max(topEdge, Math.min(top, bottomEdge - height))}px`);
  menu.style.setProperty("--select-height", `${height}px`);
}

function enhance(select, index) {
  if (controls.has(select)) return;
  const label = select.closest("label");
  const name = select.getAttribute("aria-label") || Array.from(label?.childNodes || [])
    .filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent.trim()).join(" ").trim();
  if (!select.id) select.id = `site-select-${index}`;
  const wrapper = document.createElement("span");
  wrapper.className = "site-select";
  const button = document.createElement("button");
  button.type = "button";
  button.id = `${select.id}-trigger`;
  button.className = "select-trigger";
  button.setAttribute("role", "combobox");
  button.setAttribute("aria-label", name);
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  const menu = document.createElement("span");
  menu.className = "select-menu";
  menu.id = `${select.id}-options`;
  menu.popover = "manual";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", name);
  button.setAttribute("aria-controls", menu.id);
  select.before(wrapper);
  wrapper.append(select, button, menu);
  select.hidden = true;
  if (label) label.htmlFor = button.id;
  const control = {select, button, menu, wrapper, active: select.selectedIndex};
  controls.set(select, control);
  let prefix = "";
  let typedAt = 0;

  function activate(index) {
    control.active = index;
    Array.from(menu.children).forEach((option, i) => option.classList.toggle("is-active", i === index));
    const option = menu.children[index];
    if (!option || opened !== control) return;
    button.setAttribute("aria-activedescendant", option.id);
    if (option.offsetTop < menu.scrollTop) menu.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > menu.scrollTop + menu.clientHeight) {
      menu.scrollTop = option.offsetTop + option.offsetHeight - menu.clientHeight;
    }
  }

  function sync() {
    button.textContent = select.selectedOptions[0]?.label || "";
    button.disabled = select.disabled;
    menu.replaceChildren(...Array.from(select.options).map((option, i) => {
      const row = document.createElement("span");
      row.className = "select-option";
      row.id = `${select.id}-option-${i}`;
      row.dataset.optionIndex = String(i);
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(option.selected));
      row.setAttribute("aria-disabled", String(option.disabled));
      row.textContent = option.label;
      return row;
    }));
    if (opened === control) {
      if (select.disabled) closeSelects();
      else { positionMenu(); activate(select.selectedIndex); }
    }
  }

  function open() {
    if (button.disabled) return;
    closeSelects();
    document.querySelectorAll(".app-menu[open]").forEach(other => { other.open = false; });
    document.dispatchEvent(new Event("simcoe:select-open"));
    sync();
    opened = control;
    menu.showPopover();
    button.setAttribute("aria-expanded", "true");
    positionMenu();
    activate(select.selectedIndex);
  }

  function commit(index) {
    if (!select.options[index] || select.options[index].disabled) return;
    const changed = select.selectedIndex !== index;
    select.selectedIndex = index;
    closeSelects(true);
    sync();
    if (changed) {
      select.dispatchEvent(new Event("input", {bubbles: true}));
      select.dispatchEvent(new Event("change", {bubbles: true}));
    }
  }

  button.addEventListener("click", event => {
    event.preventDefault();
    if (opened === control) closeSelects();
    else open();
  });
  button.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey) return;
    const isOpen = opened === control;
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeSelects(true);
    } else if (event.key === "Tab") {
      closeSelects();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen) commit(control.active);
      else open();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!isOpen) open();
      const enabled = Array.from(select.options).map((option, i) => option.disabled ? -1 : i).filter(i => i >= 0);
      const current = enabled.indexOf(control.active);
      const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1
        : Math.max(0, Math.min(enabled.length - 1, current + (isOpen ? event.key === "ArrowDown" ? 1 : -1 : 0)));
      activate(enabled[next]);
    } else if (event.key.length === 1 && !event.altKey) {
      event.preventDefault();
      const now = performance.now();
      prefix = now - typedAt > 700 ? event.key : prefix + event.key;
      typedAt = now;
      if (!isOpen) open();
      const index = Array.from(select.options).findIndex(option => !option.disabled &&
        [option.label, option.value].some(value => value.toLowerCase().startsWith(prefix.toLowerCase())));
      if (index >= 0) activate(index);
    }
  });
  menu.addEventListener("pointerdown", event => { event.preventDefault(); });
  menu.addEventListener("pointermove", event => {
    const row = event.target.closest("[data-option-index]");
    if (row && row.getAttribute("aria-disabled") !== "true") activate(Number(row.dataset.optionIndex));
  });
  menu.addEventListener("click", event => {
    event.preventDefault();
    const row = event.target.closest("[data-option-index]");
    if (row) commit(Number(row.dataset.optionIndex));
  });
  wrapper.addEventListener("focusout", () => queueMicrotask(() => {
    if (opened === control && !wrapper.contains(document.activeElement)) closeSelects();
  }));
  select.addEventListener("change", sync);
  select.addEventListener("simcoe:select-sync", sync);
  select.form?.addEventListener("reset", () => queueMicrotask(sync));
  new MutationObserver(sync).observe(select, {subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ["disabled", "selected", "label", "value"]});
  sync();
}

function start() {
  if (typeof HTMLElement.prototype.showPopover !== "function") return;
  document.querySelectorAll("select").forEach(enhance);
}

document.addEventListener("pointerdown", event => {
  if (opened && !opened.wrapper.contains(event.target)) closeSelects();
}, true);
document.addEventListener("scroll", event => {
  if (opened && !opened.menu.contains(event.target)) positionMenu();
}, true);
document.addEventListener("close", () => closeSelects(), true);
window.addEventListener("resize", positionMenu);
window.addEventListener("blur", () => closeSelects());
window.visualViewport?.addEventListener("resize", positionMenu);
window.visualViewport?.addEventListener("scroll", positionMenu);
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
