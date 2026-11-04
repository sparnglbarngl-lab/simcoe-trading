/* Apply the saved theme before the stylesheet loads: a colour theme (Evergreen, the default, or Amber) and an
   appearance (Dark, the default, Light, or System, which follows changes immediately). */
(function () {
  "use strict";
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var NAMES = {evergreen: "Evergreen", amber: "Amber"};
  var LIGHT_BG = {evergreen: "#f1efe7", amber: "#efefea"};
  var choice = "dark";
  var palette = "evergreen";
  try {
    choice = localStorage.getItem("simcoe:theme") || choice;
    palette = localStorage.getItem("simcoe:palette") || palette;
  } catch (e) { /* storage is optional */ }
  if (["system", "dark", "light"].indexOf(choice) === -1) choice = "dark";
  if (!Object.prototype.hasOwnProperty.call(NAMES, palette)) palette = "evergreen";
  function sync(id, value) {
    var select = document.getElementById(id);
    if (select) {
      select.value = value;
      select.dispatchEvent(new Event("simcoe:select-sync"));
    }
  }
  function apply() {
    var dark = choice === "dark" || (choice === "system" && media.matches);
    var root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.themeChoice = choice;
    root.dataset.palette = palette;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#000000" : LIGHT_BG[palette];
    var label = document.querySelector("[data-theme-label]");
    if (label) {
      label.textContent = (NAMES[palette] + (dark ? " dark" : " light")).toUpperCase() + (choice === "system" ? " · AUTO" : "");
    }
    var other = "Switch to " + NAMES[palette] + (dark ? " light" : " dark");
    Array.prototype.forEach.call(document.querySelectorAll("[data-theme-toggle]"), function (toggle) {
      toggle.setAttribute("aria-label", other);
      toggle.title = other;
    });
    sync("theme-select", choice);
    sync("palette-select", palette);
  }
  apply();
  if (media.addEventListener) media.addEventListener("change", apply);
  else media.addListener(apply);
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage is optional */ }
  }
  function setChoice(value) {
    choice = value;
    save("simcoe:theme", choice);
    apply();
  }
  function setPalette(value) {
    if (!Object.prototype.hasOwnProperty.call(NAMES, value)) return;
    palette = value;
    save("simcoe:palette", palette);
    apply();
  }
  document.addEventListener("DOMContentLoaded", function () {
    apply();
    var select = document.getElementById("theme-select");
    if (select) select.addEventListener("change", function () {
      setChoice(select.value);
    });
    var paletteSelect = document.getElementById("palette-select");
    if (paletteSelect) paletteSelect.addEventListener("change", function () {
      setPalette(paletteSelect.value);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-theme-toggle]"), function (toggle) {
      toggle.addEventListener("click", function () {
        setChoice(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      });
    });
  });
})();
