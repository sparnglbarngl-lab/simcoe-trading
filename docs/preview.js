/* Preview bar: persistent attention-grabbing notice on preview tabs, plus a delayed Home hint. */
const badge = document.getElementById("preview-badge");
const callout = document.querySelector("[data-workspace]") ? document.getElementById("dashboard-callout") : null;
const dashboardTab = document.querySelector('[data-view-link="dashboard"]');
const header = document.querySelector(".terminal-chrome");
const nav = dashboardTab?.closest("nav");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let view = "home";
let calloutTimer = null;

function remembered(key) {
  try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
}

function remember(key) {
  try { sessionStorage.setItem(key, "1"); } catch { /* In-memory state still works. */ }
}

let prompted = remembered("simcoe:dashboard-prompted");

export function triggerBadgeAnimation() {
  if (!badge || motion.matches) return;
  badge.classList.remove("is-animating");
  void badge.offsetWidth;
  badge.classList.add("is-animating");
}

badge?.addEventListener("animationend", () => {
  badge.classList.remove("is-animating");
});

function hideCallout() {
  clearTimeout(calloutTimer);
  calloutTimer = null;
  if (callout) callout.hidden = true;
}

function dismissCallout() {
  hideCallout();
  if (!prompted) {
    prompted = true;
    remember("simcoe:dashboard-prompted");
  }
}

function positionCallout() {
  if (!callout || callout.hidden || !dashboardTab || !nav || !header) return;
  const tabBox = dashboardTab.getBoundingClientRect();
  const navBox = nav.getBoundingClientRect();
  const center = (tabBox.left + tabBox.right) / 2;
  if (center < navBox.left || center > navBox.right) {
    callout.hidden = true;
    return;
  }
  const headerBox = header.getBoundingClientRect();
  const left = Math.max(8, Math.min(center - headerBox.left - 22, headerBox.width - callout.offsetWidth - 8));
  callout.style.setProperty("--callout-left", `${Math.round(left)}px`);
  callout.style.setProperty("--callout-arrow-left", `${Math.max(0, Math.round(center - headerBox.left - left - 8))}px`);
}

function scheduleCallout() {
  if (!callout || prompted || calloutTimer !== null || view !== "home" || document.querySelector("dialog[open]")) return;
  calloutTimer = setTimeout(() => {
    calloutTimer = null;
    callout.hidden = false;
    positionCallout();
    prompted = true;
    remember("simcoe:dashboard-prompted");
  }, 4000);
}

callout?.querySelector("[data-callout-close]")?.addEventListener("click", dismissCallout);
callout?.querySelector(".callout-link")?.addEventListener("click", dismissCallout);
document.addEventListener("click", event => {
  if (callout && !callout.hidden && !callout.contains(event.target)) dismissCallout();
  const tabLink = event.target.closest("[data-view-link]");
  if (tabLink && tabLink.dataset.viewLink !== "home") {
    triggerBadgeAnimation();
  }
});
nav?.addEventListener("scroll", positionCallout, {passive:true});
window.addEventListener("resize", positionCallout);
document.addEventListener("simcoe:dialog-open", hideCallout);
document.addEventListener("close", () => {
  scheduleCallout();
}, true);

export function updatePreview(viewName) {
  view = viewName;
  const inPreview = view !== "home";
  if (badge) {
    badge.hidden = !inPreview;
    if (inPreview) {
      triggerBadgeAnimation();
    }
  }
  if (view === "home") scheduleCallout();
  else dismissCallout();
}
