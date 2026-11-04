/* A rotating spotlight on the creator's own words. The full posts remain available without JavaScript. */
(function () {
  "use strict";
  const section = document.querySelector("[data-creator-spotlight]");
  if (!section) return;

  const stage = section.querySelector("[data-creator-stage]");
  const posts = Array.from(stage.querySelectorAll(".creator-post"));
  const sources = posts.map(post => Array.from(post.querySelectorAll("[data-creator-quote]")));
  const callouts = Array.from(section.querySelectorAll("[data-creator-callout]"));
  const connector = section.querySelector("[data-creator-connector]");
  const branches = Array.from(connector.querySelectorAll("[data-creator-branch]")).map(branch => ({
    group: branch,
    path: branch.querySelector("[data-creator-path]"),
    origin: branch.querySelector("[data-creator-origin]"),
    end: branch.querySelector("[data-creator-end]")
  }));
  const home = section.closest("[data-view]");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = () => stage.clientWidth <= 760;
  const interval = 4000;
  let active = 0;
  let hovering = false;
  let inView = false;
  let timer = null;
  let frame = null;
  let animations = [];

  function schedule() {
    clearTimeout(timer);
    const focused = section.contains(document.activeElement);
    const playing = !motion.matches && !hovering && !focused && inView && !document.hidden && !home?.hidden && !document.querySelector("dialog[open]");
    section.dataset.creatorPlaying = String(playing);
    if (playing) timer = setTimeout(() => spotlight((active + 1) % posts.length), interval);
  }

  function positionConnector() {
    if (home?.hidden || !stage.clientWidth) return;
    const bounds = stage.getBoundingClientRect();
    const scale = bounds.width / stage.clientWidth;
    const content = posts[active].querySelector(".li-content").getBoundingClientRect();
    const postSources = sources[active] || [];

    const lineInfo = [];
    for (let k = 0; k < 2; k++) {
      const src = postSources[k];
      if (!src) {
        branches[k]?.group.toggleAttribute("hidden", true);
        lineInfo[k] = null;
        continue;
      }
      const lines = Array.from(src.getClientRects());
      const visibleLines = lines.filter(line => line.bottom > content.top && line.top < content.bottom);
      const line = visibleLines[Math.floor(visibleLines.length / 2)];
      if (!line) {
        branches[k]?.group.toggleAttribute("hidden", true);
        lineInfo[k] = null;
        continue;
      }
      branches[k]?.group.toggleAttribute("hidden", false);
      const right = !compact() && (active === 0 || (active === 1 && k === 1));
      const sx = ((right ? Math.min(line.right + 6 * scale, content.right) : Math.max(line.left - 6 * scale, content.left)) - bounds.left) / scale;
      const sy = (Math.max(content.top + 4 * scale, Math.min((line.top + line.bottom) / 2, content.bottom - 4 * scale)) - bounds.top) / scale;
      lineInfo[k] = {right, sx, sy};
    }

    connector.toggleAttribute("hidden", !lineInfo.some(Boolean));

    if (!compact()) {
      if (active === 1) {
        for (let k = 0; k < 2; k++) {
          if (!callouts[k]) continue;
          const info = lineInfo[k];
          const h = callouts[k].offsetHeight;
          const top = info
            ? Math.max(32, Math.min(info.sy - h / 2, stage.clientHeight - h - 24))
            : (k === 0 ? 80 : 260);
          callouts[k].style.setProperty(`--creator-quote-top-${k}`, `${Math.round(top)}px`);
        }
      } else {
        const h0 = callouts[0]?.offsetHeight || 100;
        const h1 = callouts[1]?.offsetHeight || 100;
        const gap = 16;
        const sy0 = lineInfo[0] ? lineInfo[0].sy : 120;
        const sy1 = lineInfo[1] ? lineInfo[1].sy : 340;

        let t0 = sy0 - h0 / 2;
        let t1 = sy1 - h1 / 2;
        if (t1 < t0 + h0 + gap) {
          const mid = (sy0 + sy1) / 2;
          t0 = mid - (h0 + gap / 2);
          t1 = t0 + h0 + gap;
        }
        if (t0 < 32) {
          t0 = 32;
          t1 = Math.max(t1, t0 + h0 + gap);
        }
        if (t1 + h1 > stage.clientHeight - 24) {
          t1 = stage.clientHeight - 24 - h1;
          t0 = Math.min(t0, t1 - gap - h0);
        }
        t0 = Math.max(20, t0);
        callouts[0]?.style.setProperty("--creator-quote-top-0", `${Math.round(t0)}px`);
        callouts[1]?.style.setProperty("--creator-quote-top-1", `${Math.round(t1)}px`);
      }
    }

    connector.setAttribute("viewBox", `0 0 ${stage.clientWidth} ${stage.clientHeight}`);
    for (let k = 0; k < 2; k++) {
      const info = lineInfo[k];
      const callout = callouts[k];
      const branch = branches[k];
      if (!info || !callout || !branch) continue;
      const {right, sx, sy} = info;
      const quote = callout.getBoundingClientRect();
      const tx = compact() ? (quote.left - bounds.left) / scale + 28 : ((right ? quote.left : quote.right) - bounds.left) / scale;
      const ty = ((compact() ? quote.top : quote.top + quote.height / 2) - bounds.top) / scale;
      const bend = (tx - sx) * 0.5;
      branch.path.setAttribute("d", compact()
        ? `M ${sx} ${sy} C ${sx - 24} ${sy}, 8 ${sy}, 8 ${sy + 24} L 8 ${ty - 20} Q 8 ${ty}, ${tx} ${ty}`
        : `M ${sx} ${sy} C ${sx + bend} ${sy}, ${tx - bend} ${ty}, ${tx} ${ty}`);
      branch.origin.setAttribute("cx", sx);
      branch.origin.setAttribute("cy", sy);
      branch.end.setAttribute("cx", tx);
      branch.end.setAttribute("cy", ty);
    }
  }

  function sizePosts() {
    if (!stage.clientWidth) return;
    const contents = posts.map(post => post.querySelector(".li-content"));
    posts.forEach((post, i) => {
      post.style.height = "auto";
      if (contents[i]) {
        contents[i].style.flex = "0 0 auto";
        contents[i].style.overflow = "visible";
      }
    });
    const tallest = Math.ceil(Math.max(1, ...posts.map(post => post.getBoundingClientRect().height)));
    posts.forEach((post, i) => {
      post.style.height = "";
      if (contents[i]) {
        contents[i].style.flex = "";
        contents[i].style.overflow = "";
      }
    });
    const postH = `${tallest}px`;
    const stageH = `${Math.ceil(compact() ? tallest + 48 : tallest * 1.1 + 80)}px`;
    if (section.style.getPropertyValue("--creator-post-h") === postH && section.style.getPropertyValue("--creator-stage-h") === stageH) return;
    section.style.setProperty("--creator-post-h", postH);
    section.style.setProperty("--creator-stage-h", stageH);
  }

  // Follow the real highlighted text while its card moves; stop measuring once the transition settles.
  function followConnector() {
    cancelAnimationFrame(frame);
    const until = performance.now() + (motion.matches ? 0 : 750);
    function follow(now) {
      positionConnector();
      if (now < until) frame = requestAnimationFrame(follow);
    }
    frame = requestAnimationFrame(follow);
  }

  function revealSource() {
    const content = posts[active].querySelector(".li-content");
    if (content.contains(document.activeElement)) return;
    const postSources = sources[active] || [];
    if (!postSources.length) return;
    const first = postSources[0];
    const bottom = first.offsetTop + first.offsetHeight;
    if (first.offsetTop < content.scrollTop || bottom > content.scrollTop + content.clientHeight) {
      content.scrollTop = Math.max(0, first.offsetTop - content.clientHeight * 0.25);
    }
  }

  function spotlight(index, animate = true) {
    const changed = index !== active;
    active = index;
    section.dataset.creatorActive = String(index);
    posts.forEach((post, i) => post.classList.toggle("is-focused", i === index));
    const postSources = sources[index] || [];
    callouts.forEach((callout, k) => {
      const excerpt = callout.querySelector("[data-creator-excerpt]");
      if (excerpt && postSources[k]) {
        excerpt.textContent = postSources[k].textContent.trim();
      }
    });
    revealSource();
    animations.forEach(anim => anim?.cancel());
    animations = [];
    if (changed && animate && !motion.matches) {
      callouts.forEach((callout, k) => {
        const anim = callout.animate([
          {opacity: 0, transform: `translate(${index === 0 ? "-" : ""}16px, 8px) scale(.96)`},
          {opacity: 1, transform: "translate(0, 0) scale(1)"}
        ], {duration: 280, delay: k * 50, easing: "cubic-bezier(.2,.7,.2,1)"});
        animations.push(anim);
      });
    }
    followConnector();
    schedule();
  }

  section.dataset.creatorReady = "true";
  callouts.forEach(c => { c.hidden = false; });
  posts.forEach((post, index) => {
    post.tabIndex = 0;
    post.addEventListener("focusin", () => spotlight(index));
    post.addEventListener("pointerdown", event => {
      if (event.pointerType !== "mouse" && index !== active) spotlight(index);
    });
    post.querySelector(".li-content").addEventListener("scroll", positionConnector, {passive: true});
  });
  function setHovering(next) {
    if (hovering === next) return;
    hovering = next;
    schedule();
  }
  stage.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse") return;
    const hit = event.target.closest(".creator-post");
    setHovering(Boolean(hit));
    if (!hit || compact()) return;
    const index = posts.indexOf(hit);
    if (index >= 0 && index !== active) spotlight(index);
  });
  stage.addEventListener("pointerleave", event => {
    if (event.pointerType === "mouse") setHovering(false);
  });
  section.addEventListener("focusin", schedule);
  section.addEventListener("focusout", () => queueMicrotask(schedule));
  document.addEventListener("visibilitychange", schedule);
  document.addEventListener("simcoe:dialog-open", schedule);
  document.addEventListener("close", schedule, true);
  window.addEventListener("pagehide", () => { clearTimeout(timer); cancelAnimationFrame(frame); });
  window.addEventListener("pageshow", schedule);
  motion.addEventListener("change", () => {
    if (motion.matches) animations.forEach(a => a?.cancel());
    schedule();
    followConnector();
  });
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.1;
    if (inView) { revealSource(); followConnector(); }
    schedule();
  }, {threshold: 0.1}).observe(stage);
  new ResizeObserver(() => { sizePosts(); revealSource(); followConnector(); }).observe(stage);
  if (home) new MutationObserver(() => {
    schedule();
    if (!home.hidden) { sizePosts(); followConnector(); }
  }).observe(home, {attributes: true, attributeFilter: ["hidden"]});
  document.fonts.ready.then(() => { sizePosts(); revealSource(); followConnector(); });
  sizePosts();
  spotlight(0, false);
})();
