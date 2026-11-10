/* Static app screenshots with terminal-style navigation and an illustrative ticker. */
import {updatePreview} from "./preview.js";
import "./creator.js";

(function () {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escape = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const format = (value, digits = 2) => Number(value).toLocaleString("en-US", {minimumFractionDigits:digits, maximumFractionDigits:digits});
  const pageNames = {
    home:"Home",dashboard:"Dashboard",monitor:"Monitor",map:"World markets",brief:"Market brief",movers:"Market movers",
    people:"People & ownership",func:"Security research",curve:"Yield curves",compare:"Compare",calendar:"Calendar",
    macro:"Macro",rates:"Rates",portfolio:"Portfolio",alerts:"Alerts"
  };
  const workspace = $("[data-workspace]");
  const currency = $("#display-currency");
  const state = {view:"home", symbol:new URLSearchParams(location.search).get("symbol")?.toUpperCase() || "AAPL", displayCurrency:currency?.value || "USD"};
  const fx = {USD:1,CAD:1.3976,EUR:.923,GBP:.774,JPY:151.3,CHF:.864,AUD:1.514};
  const securities = [
    {s:"AAPL",n:"Apple Inc.",p:203.42,c:1.12}, {s:"MSFT",n:"Microsoft Corporation",p:427.18,c:.86},
    {s:"NVDA",n:"NVIDIA Corporation",p:139.24,c:2.34}, {s:"GOOGL",n:"Alphabet Inc.",p:178.63,c:-.42},
    {s:"AMZN",n:"Amazon.com Inc.",p:210.56,c:1.38}, {s:"META",n:"Meta Platforms Inc.",p:591.82,c:1.67},
    {s:"JPM",n:"JPMorgan Chase & Co.",p:241.63,c:.54}, {s:"XOM",n:"Exxon Mobil Corporation",p:112.38,c:-1.28},
    {s:"RY.TO",n:"Royal Bank of Canada",p:174.32,c:.64}, {s:"TD.TO",n:"Toronto-Dominion Bank",p:79.84,c:-.28}
  ];
  const indices = [
    {s:"S&P 500",p:5832.47,c:.58}, {s:"NASDAQ",p:18642.23,c:.91}, {s:"DOW JONES",p:42854.61,c:.34},
    {s:"S&P / TSX",p:24872.18,c:.46}, {s:"VIX",p:16.28,c:-2.16}
  ];
  const findSecurity = symbol => securities.find(item => item.s === symbol) || securities[0];
  const convertedPrice = item => item.s.endsWith(".TO")
    ? item.p / fx.CAD * fx[state.displayCurrency]
    : item.p * fx[state.displayCurrency];

  function syncScreenshots() {
    const {palette = "evergreen", theme = "dark"} = document.documentElement.dataset;
    $$('[data-app-theme]').forEach(source => { source.media = source.dataset.appTheme === palette + "-" + theme ? "all" : "not all"; });
  }

  function updateHeader() {
    const item = findSecurity(state.symbol);
    const symbol = $("[data-context-symbol]");
    const quote = $("[data-context-quote]");
    if (symbol) {
      symbol.textContent = item.s;
      symbol.title = item.n;
    }
    if (quote) {
      quote.innerHTML = `<strong>${format(convertedPrice(item))}</strong><small>${escape(state.displayCurrency)}</small><span class="${item.c >= 0 ? "up" : "down"}">${item.c >= 0 ? "▲" : "▼"} ${item.c >= 0 ? "+" : ""}${format(item.c)}%</span>`;
    }
    document.dispatchEvent(new CustomEvent("simcoe:security", {detail:{symbol:item.s,price:convertedPrice(item),currency:state.displayCurrency}}));
  }

  function updateHistoryControls() {
    const back = $("[data-history='back']");
    const forward = $("[data-history='forward']");
    if (back) back.disabled = historyIndex <= 0;
    if (forward) forward.disabled = historyIndex >= historyMax;
  }

  /* Each workspace visit owns a history group. Keep its forward limit across reloads. */
  const initialEntry = history.state?.simcoeNavigation;
  const historyId = initialEntry?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const historyKey = "simcoe:history:" + historyId;
  let historyIndex = Number.isInteger(initialEntry?.index) ? initialEntry.index : 0;
  let historyMax = historyIndex;
  try { historyMax = Math.max(historyIndex, Number(sessionStorage.getItem(historyKey)) || 0); } catch { /* optional storage */ }
  let renderedURL = location.href;

  function recordHistory(replace, url = location.href) {
    const entry = {...history.state, simcoeNavigation:{id:historyId,index:historyIndex}};
    if (replace) history.replaceState(entry, "", url);
    else history.pushState(entry, "", url);
    try { sessionStorage.setItem(historyKey, String(historyMax)); } catch { /* optional storage */ }
  }

  function navigate(url) {
    if (url.href !== location.href) {
      historyIndex++;
      historyMax = historyIndex; // A new route discards the old forward branch.
      recordHistory(false, url);
    }
    renderedURL = location.href;
    route();
  }

  function restoreRoute() {
    if (renderedURL === location.href) return; // Traversals can emit both popstate and hashchange.
    const entry = history.state?.simcoeNavigation;
    if (entry?.id === historyId && Number.isInteger(entry.index)) {
      historyIndex = entry.index;
    } else {
      historyIndex++;
      historyMax = historyIndex;
      recordHistory(true);
    }
    renderedURL = location.href;
    route();
  }

  function route() {
    if (!workspace) return;
    const symbol = findSecurity(new URLSearchParams(location.search).get("symbol")?.toUpperCase()).s;
    if (symbol !== state.symbol) {
      state.symbol = symbol;
      updateHeader();
    }
    const target = location.hash.slice(1).split("?")[0].toLowerCase();
    const view = Object.hasOwn(pageNames, target) ? target : "home";
    const changed = view !== state.view;
    state.view = view;
    $$('[data-view]', workspace).forEach(section => { section.hidden = section.dataset.view !== view; });
    $$('[data-view-link]').forEach(link => {
      if (link.dataset.viewLink === view) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.body.dataset.activeView = view;
    const status = $("[data-status-text]");
    if (status) status.textContent = view === "home" ? "Welcome to Simcoe Trading" : pageNames[view] + " / Desktop app";
    document.title = view === "home" ? "Simcoe Trading" : pageNames[view] + " · Simcoe Trading";
    if (view === "home") {
      if (["download", "features"].includes(target)) requestAnimationFrame(() => {
        if (state.view === "home" && location.hash.slice(1) === target) $("#" + target)?.scrollIntoView({behavior:"smooth",block:"center"});
      });
      else if (changed || !target || target === "home") window.scrollTo({top:0,behavior:"instant"});
    } else if (changed) {
      window.scrollTo({top:0,behavior:"instant"});
      const tab = $(`[data-view-link="${view}"]`);
      if (tab) {
        const nav = tab.parentElement;
        if (tab.offsetLeft < nav.scrollLeft || tab.offsetLeft + tab.offsetWidth > nav.scrollLeft + nav.clientWidth) {
          nav.scrollTo({left:Math.max(0,tab.offsetLeft - 15),behavior:"smooth"});
        }
      }
    }
    updateHistoryControls();
    updatePreview(view);
  }

  if (workspace) {
    recordHistory(true);
    new MutationObserver(syncScreenshots).observe(document.documentElement, {attributes:true,attributeFilter:["data-theme","data-palette"]});
    syncScreenshots();
    window.addEventListener("popstate", restoreRoute);
    window.addEventListener("hashchange", restoreRoute);
    route();
    // Alt+arrows step the tab strip in visual order (not browser history order).
    document.addEventListener("keydown", event => {
      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || event.defaultPrevented) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      if (document.querySelector("dialog[open], .app-menu[open], .select-menu:popover-open")) return;
      if (event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      const tabs = $$("[data-view-link]");
      if (!tabs.length) return;
      const views = tabs.map(link => link.dataset.viewLink);
      let index = views.indexOf(state.view);
      if (index < 0) index = 0;
      const step = (event.key === "ArrowRight" || event.key === "ArrowDown") ? 1 : -1;
      const next = tabs[(index + step + tabs.length) % tabs.length];
      event.preventDefault();
      const url = new URL(location.href);
      url.hash = next.dataset.viewLink;
      navigate(url);
    });
  }

  document.addEventListener("click", event => {
    if (!workspace || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[href]");
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = new URL(link.href);
    const homePath = new URL($("[data-view-link='home']").href).pathname;
    if (url.origin !== location.origin || ![homePath, homePath + "index.html"].includes(url.pathname)) return;
    const target = url.hash.slice(1).split("?")[0].toLowerCase();
    if (target && !Object.hasOwn(pageNames, target) && !["download", "features"].includes(target)) return;
    if (!url.search) url.search = location.search;
    event.preventDefault();
    navigate(url);
  });
  document.addEventListener("click", event => {
    const historyButton = event.target.closest("[data-history]");
    if (!historyButton) return;
    if (historyButton.dataset.history === "back") history.back();
    else history.forward();
  });

  /* Search results navigate to a tab screenshot; the page no longer builds simulated dashboards. */
  const functionCommands = [
    ["EQS","Equity screening"],["SECT","Sector research"],["PORT","Portfolio analytics"],
    ["DES","Company description"],["FA","Key statistics"],["FS","Financial statements"],
    ["HP","Historical prices"],["TECH","Technical analysis"]
  ];
  const commands = [
    ...Object.entries(pageNames).map(([view,name]) => ({key:view === "portfolio" ? "PORTFOLIO" : view.toUpperCase(),description:name,view})),
    ...functionCommands.map(([key,description]) => ({key,description,view:"func"})),
    ...securities.map(item => ({key:item.s,description:item.n,view:"func",symbol:item.s,type:"EQUITY"})),
    {key:"YAS",description:"Yield & spread analysis",chrome:"yas"},
    {key:"TRADE",description:"Sample trade ticket",chrome:"trade"}
  ];
  const search = $("#command-input");
  const results = $("#command-results");
  let matches = [];
  let selection = -1;
  function closeSearch() {
    if (results) results.hidden = true;
    if (search) {
      search.setAttribute("aria-expanded", "false");
      search.removeAttribute("aria-activedescendant");
    }
    selection = -1;
  }
  function chooseCommand(command) {
    if (!command) return;
    if (command.symbol) {
      state.symbol = command.symbol;
      updateHeader();
    }
    closeSearch();
    search.value = "";
    search.blur();
    if (command.chrome) {
      $('[data-chrome-action="' + command.chrome + '"]')?.click();
      return;
    }
    const url = new URL(workspace ? location.href : $("[data-view-link='home']").href);
    url.hash = command.view;
    if (command.symbol) url.searchParams.set("symbol", command.symbol);
    if (workspace) navigate(url);
    else location.href = url.href;
  }
  function showSearch() {
    const query = search.value.trim().toLowerCase();
    const type = $("#search-type")?.value || "ALL";
    const allowed = commands.filter(command => !command.symbol || type === "ALL" || type === command.type);
    matches = query
      ? allowed.filter(command => (command.key + " " + command.description).toLowerCase().includes(query))
        .sort((a,b) => Number(b.key.toLowerCase() === query) - Number(a.key.toLowerCase() === query)).slice(0,8)
      : allowed.filter(command => ["EQS","PORTFOLIO","AAPL","DASHBOARD","COMPARE"].includes(command.key));
    selection = -1;
    search.removeAttribute("aria-activedescendant");
    results.innerHTML = matches.length
      ? matches.map((command,index) => `<button type="button" class="command-option" id="command-option-${index}" role="option" tabindex="-1" aria-selected="false" data-command-index="${index}"><strong>${escape(command.key)}</strong><span>${escape(command.description)}</span></button>`).join("")
      : '<p class="command-empty">No matching tab, function, or security.</p>';
    results.hidden = false;
    search.setAttribute("aria-expanded", "true");
  }
  if (search && results) {
    document.addEventListener("simcoe:dialog-open", closeSearch);
    document.addEventListener("simcoe:select-open", closeSearch);
    $("#search-type")?.addEventListener("change", () => { search.focus(); showSearch(); });
    search.addEventListener("input", showSearch);
    search.addEventListener("focus", showSearch);
    $(".command-search").addEventListener("focusout", event => {
      if (!event.currentTarget.contains(event.relatedTarget)) closeSearch();
    });
    results.addEventListener("click", event => {
      const node = event.target.closest("[data-command-index]");
      if (node) chooseCommand(matches[Number(node.dataset.commandIndex)]);
    });
    search.addEventListener("keydown", event => {
      if (event.key === "Escape") { closeSearch(); search.blur(); return; }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (results.hidden) showSearch();
        if (!matches.length) return;
        selection = selection < 0
          ? (event.key === "ArrowDown" ? 0 : matches.length - 1)
          : (selection + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length;
        $$('[role="option"]', results).forEach((node,index) => node.setAttribute("aria-selected", String(index === selection)));
        search.setAttribute("aria-activedescendant", "command-option-" + selection);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (results.hidden) showSearch();
        chooseCommand(matches[selection >= 0 ? selection : 0]);
      }
    });
    document.addEventListener("click", event => { if (!event.target.closest(".command-search")) closeSearch(); });
    document.addEventListener("keydown", event => {
      if (event.key === "/" && !event.defaultPrevented && !document.querySelector("dialog[open]") && !event.target.isContentEditable && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        search.focus();
      }
    });
  }

  function startTicker() {
    const ticker = $("[data-market-ticker]");
    const track = $("[data-ticker-track]");
    if (!ticker || !track) return;
    const quotes = [...indices,...securities];
    const group = document.createElement("div");
    group.className = "ticker-group";
    group.setAttribute("role", "list");
    group.innerHTML = quotes.map(item => {
      const price = securities.includes(item) ? convertedPrice(item) : item.p;
      return `<span class="ticker-quote" role="listitem"><strong class="ticker-symbol">${escape(item.s)}</strong><span class="ticker-price">${format(price)}</span><span class="ticker-change ${item.c >= 0 ? "up" : "down"}"><span aria-hidden="true">${item.c >= 0 ? "▲" : "▼"}</span>${item.c >= 0 ? "+" : ""}${format(item.c)}%</span></span>`;
    }).join("");
    const repeat = group.cloneNode(true);
    repeat.setAttribute("aria-hidden", "true");
    track.replaceChildren(group,repeat);
    ticker.hidden = false;
  }

  document.addEventListener("simcoe:chrome", event => {
    const {action,currency:nextCurrency} = event.detail;
    if (action === "currency" && fx[nextCurrency]) {
      state.displayCurrency = nextCurrency;
      updateHeader();
      startTicker();
    }
    if (action === "refresh") syncScreenshots();
  });
  updateHeader();
  startTicker();
  function updateClock() {
    const node = $("[data-clock]");
    if (!node) return;
    const now = new Date();
    const weekday = now.toLocaleDateString("en-GB", {weekday:"short"});
    const date = now.toLocaleDateString("en-GB", {day:"2-digit",month:"short"});
    node.textContent = weekday + " " + date + "  " + now.toLocaleTimeString("en-GB", {hour12:false});
    node.dateTime = now.toISOString();
  }
  updateClock();
  setInterval(updateClock, 1000);

})();
