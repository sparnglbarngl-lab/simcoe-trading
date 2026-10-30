/* Simcoe Trading's website: points the download buttons at the latest release's files and lists what's new, from
   GitHub's public API (release files can't be read by a page on another site, so latest.json is out of reach
   here; the API answers any site). Without it the buttons keep their fallback, the latest release's page. */
(function () {
  "use strict";
  var REPO = "sparnglbarngl-lab/simcoe-trading";
  var API = "https://api.github.com/repos/" + REPO;
  var KEEP_MS = 10 * 60 * 1000;          // answers kept this long per visit (GitHub allows 60 calls an hour)
  var FILES = { mac: /^SimcoeTrading-mac-.+\.zip$/, windows: /^SimcoeTrading-windows-.+-setup\.exe$/ };
  var SUBS = { mac: "Apple Silicon · macOS 14 or later", windows: "Windows 10 or 11, 64-bit" };
  // lines of a release's "What's new" the site leaves out: notes on the plan document rather than the app
  var HIDE = [/^RELEASE_PLAN\b/i];

  function stored(key) {
    try {
      var v = JSON.parse(sessionStorage.getItem(key) || "null");
      return v && Date.now() - v.t < KEEP_MS ? v.d : null;
    } catch (e) { return null; }
  }

  function store(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })); } catch (e) { /* private mode */ }
  }

  function getJSON(path) {
    var key = "simcoe:" + path, hit = stored(key);
    if (hit) return Promise.resolve(hit);
    return fetch(API + path, { headers: { Accept: "application/vnd.github+json" } }).then(function (r) {
      if (!r.ok) throw new Error("GitHub answered " + r.status);
      return r.json();
    }).then(function (d) { store(key, d); return d; });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function link(href, text) {
    var a = el("a", "", text); a.href = href; return a;
  }

  function mb(bytes) { return Math.round(bytes / 1e6) + " MB"; }

  function day(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  function version(rel) { return String(rel.tag_name || rel.name || "").replace(/^v/, ""); }

  /* The changes listed under a release's "## What's new" (each body starts "Built from commit …"). */
  function changes(body) {
    var out = [], on = false;
    String(body || "").split(/\r?\n/).forEach(function (line) {
      if (/^##\s/.test(line)) { on = /^##\s+what'?s new/i.test(line); return; }
      var m = on && line.match(/^\s*[-*]\s+(.*\S)/);
      if (m && !HIDE.some(function (re) { return re.test(m[1]); })) out.push(m[1].replace(/\*\*|`/g, ""));
    });
    return out;
  }

  function changeList(items, limit) {
    var ul = el("ul", "changes");
    items.slice(0, limit || items.length).forEach(function (t) { ul.appendChild(el("li", "", t)); });
    if (!items.length) ul.appendChild(el("li", "", "Small fixes and tidying up."));
    return ul;
  }

  function platform() {
    var ua = navigator.userAgent || "";
    var p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    if (/android|iphone|ipad|ipod/i.test(ua) || (/mac/i.test(p) && navigator.maxTouchPoints > 1)) return "mobile";
    if (/mac/i.test(p) || /Macintosh/.test(ua)) return "mac";
    if (/win/i.test(p) || /Windows/.test(ua)) return "windows";
    return "";
  }

  /* The visitor's computer's button first and filled, the other outlined. */
  function arrange() {
    var row = document.querySelector(".dl-row");
    if (!row) return;
    var mine = platform();
    if (mine === "mobile") {
      var note = el("p", "hint", "Simcoe Trading runs on a Mac or a Windows PC. Open this page on your computer to download it.");
      row.parentNode.insertBefore(note, row.nextSibling);
      return;
    }
    if (!mine) return;
    var first = row.querySelector('[data-dl="' + mine + '"]');
    if (first) row.insertBefore(first, row.firstChild);
    Array.prototype.forEach.call(row.querySelectorAll("[data-dl]"), function (a) {
      a.classList.toggle("alt", a.getAttribute("data-dl") !== mine);
    });
  }

  function showLatest(rel) {
    var v = version(rel), files = {};
    (rel.assets || []).forEach(function (a) {
      Object.keys(FILES).forEach(function (k) { if (FILES[k].test(a.name)) files[k] = a; });
    });
    Object.keys(files).forEach(function (k) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-dl="' + k + '"]'), function (a) {
        a.href = files[k].browser_download_url;
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-dl-sub="' + k + '"]'), function (s) {
        s.textContent = SUBS[k] + " · " + mb(files[k].size);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-latest]"), function (p) {
      p.textContent = "Version ";
      p.appendChild(el("span", "mono", v));
      p.appendChild(document.createTextNode(", released " + day(rel.published_at) + ". "));
      p.appendChild(link("whats-new.html", "What's new"));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-notes="latest"]'), function (box) {
      var items = changes(rel.body), limit = +box.getAttribute("data-limit") || 0;
      box.textContent = "";
      var p = el("p", "muted", "Version ");
      p.appendChild(el("span", "mono", v));
      p.appendChild(document.createTextNode(", " + day(rel.published_at)));
      box.appendChild(p);
      box.appendChild(changeList(items, limit));
      if (limit && items.length > limit) {
        box.appendChild(el("p", "muted", "…and " + (items.length - limit) + " more."));
      }
    });
  }

  function showReleases(list) {
    var box = document.querySelector("[data-releases]");
    var rels = (list || []).filter(function (r) { return !r.draft && !r.prerelease; });
    if (!rels.length) return;
    box.textContent = "";
    rels.forEach(function (r, i) {
      var art = el("article", "release");
      var h = el("h2", "", version(r));
      if (i === 0) h.appendChild(el("span", "tag", "Latest"));
      art.appendChild(h);
      art.appendChild(el("p", "when", day(r.published_at)));
      art.appendChild(changeList(changes(r.body)));
      box.appendChild(art);
    });
    var more = el("p", "muted", "Older versions aren't kept. ");
    more.appendChild(link("https://github.com/" + REPO + "/releases", "Every release on GitHub"));
    box.appendChild(more);
  }

  function failed(sel, text) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (box) {
      box.textContent = "";
      var p = el("p", "muted", text + " ");
      p.appendChild(link("https://github.com/" + REPO + "/releases/latest", "the latest release on GitHub"));
      p.appendChild(document.createTextNode("."));
      box.appendChild(p);
    });
  }

  function start() {
    arrange();
    var wantsLatest = document.querySelector("[data-dl], [data-latest], [data-notes]");
    if (wantsLatest) {
      getJSON("/releases/latest").then(showLatest).catch(function () {
        failed('[data-notes="latest"]', "The changes couldn't be loaded just now. See");
      });
    }
    if (document.querySelector("[data-releases]")) {
      getJSON("/releases?per_page=10").then(showReleases).catch(function () {
        failed("[data-releases]", "The list of versions couldn't be loaded just now. See");
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
