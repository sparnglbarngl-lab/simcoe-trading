/* App-style header interactions for browsing local screenshots. */
import {closeMenus, openDialog} from "./dialogs.js";
import {closeSelects, focusSelect} from "./selects.js";

(function () {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const send = (action, detail = {}) => document.dispatchEvent(new CustomEvent("simcoe:chrome", {detail:{action,...detail}}));
  const money = n => Number(n).toLocaleString("en-US", {minimumFractionDigits:2,maximumFractionDigits:2});
  const home = $("[data-view-link='home']").href.split("#")[0];
  let security = {symbol:"AAPL",price:203.42,currency:"USD"};
  const header=$(".terminal-chrome");
  const status=$(".terminal-status");
  const main=document.getElementById("main");
  function noteChromeSpace() {
    const headerBox=header.getBoundingClientRect();
    const statusTop=status?status.getBoundingClientRect().top:window.innerHeight-48;
    // Prefer main's top so badge margin below the header box is included; once scrolled
    // under the sticky chrome, fall back to the header bottom so fit doesn't grow.
    const mainTop=main?main.getBoundingClientRect().top:headerBox.bottom;
    const contentTop=mainTop>0?Math.max(mainTop,headerBox.bottom):headerBox.bottom;
    const fit=Math.max(120,Math.floor(statusTop-contentTop));
    document.documentElement.dataset.headerLayout=headerBox.height<=116?"compact":headerBox.height<=180?"wrapped":"stacked";
    document.documentElement.style.setProperty("--snapshot-fit",`${fit}px`);
  }
  noteChromeSpace();
  window.addEventListener("resize",noteChromeSpace);
  if(typeof ResizeObserver!=="undefined"){
    const observer=new ResizeObserver(noteChromeSpace);
    observer.observe(header);
    if(status)observer.observe(status);
  }
  // Preview badge show/hide changes the sticky chrome height after route changes.
  if(typeof MutationObserver!=="undefined")new MutationObserver(noteChromeSpace).observe(header,{attributes:true,subtree:true,attributeFilter:["hidden"]});
  function info(title, content) { $("#info-dialog-title").textContent=title; $("[data-info-content]").innerHTML=content; openDialog("info-dialog"); }
  function stored(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }
  function save(key,value) { try { localStorage.setItem(key,value); } catch (e) { /* optional preference */ } }

  $$(".app-menu").forEach(menu => {
    menu.addEventListener("toggle", () => {
      if (menu.open) {
        closeSelects();
        $$(".app-menu[open]").forEach(other => { if (other!==menu) other.open=false; });
      }
    });
  });
  document.addEventListener("click",event => {
    if (!event.target.closest(".app-menu,.site-select")) closeMenus();
  });
  document.addEventListener("keydown",event => { if (event.key==="Escape") closeMenus(); });

  const currency = $("#display-currency");
  const savedCurrency = stored("simcoe:display-currency","USD");
  if (Array.from(currency.options).some(option => option.value===savedCurrency)) currency.value=savedCurrency;
  currency.dispatchEvent(new Event("simcoe:select-sync"));
  currency.addEventListener("change",()=>{save("simcoe:display-currency",currency.value);send("currency",{currency:currency.value});});
  const zoom = $("#ui-zoom");
  const savedZoom = stored("simcoe:ui-zoom","auto");
  if (Array.from(zoom.options).some(option=>option.value===savedZoom)) zoom.value=savedZoom;
  function applyZoom() { document.documentElement.dataset.uiZoom=zoom.value;save("simcoe:ui-zoom",zoom.value);zoom.dispatchEvent(new Event("simcoe:select-sync")); }
  zoom.addEventListener("change",applyZoom);applyZoom();
  function zoomStep(direction) {
    const steps=["95","100","110","125","150"], current=zoom.value==="auto"?"95":zoom.value;
    zoom.value=steps[Math.max(0,Math.min(steps.length-1,steps.indexOf(current)+direction))];applyZoom();
  }

  const windows=$("[data-windows-menu]");
  const sections=[['chart','CHART'],['markets','MARKETS'],['news','NEWS'],['trade','TRADE']];
  sections.forEach(([key,label])=>{
    const button=document.createElement("button");button.type="button";button.dataset.chromeAction="window-"+key;button.textContent=label;windows.appendChild(button);
  });
  windows.appendChild(document.createElement("hr"));
  $$("[data-view-link]").forEach(link=>{
    const button=document.createElement("button");button.type="button";button.dataset.chromeAction="window-"+link.dataset.viewLink;button.textContent=link.textContent;windows.appendChild(button);
  });
  function openPageWindow(view) {
    const route={chart:"dashboard",markets:"monitor",news:"brief"}[view]||view;
    if (route==="trade") {updateTrade();openDialog("trade-dialog");return;}
    const url=new URL(home);url.searchParams.set("symbol",security.symbol);url.hash=route;
    window.open(url.href,"simcoe-"+route,"width=1100,height=760,noopener");closeMenus();
  }

  document.addEventListener("simcoe:security",event=>{
    security=event.detail;
    const form=$("[data-trade-form]");form.elements.symbol.value=security.symbol;updateTrade();
  });
  function updateTrade() {
    const form=$("[data-trade-form]"), quantity=Number(form.elements.quantity.value);
    $("[data-trade-value]").textContent=money((Number.isFinite(quantity)?Math.max(0,quantity):0)*security.price)+" "+security.currency;
    $("[data-trade-result]").textContent="";
  }
  $("[data-trade-form]").addEventListener("input",updateTrade);
  $("[data-trade-form]").addEventListener("submit",event=>{
    event.preventDefault();const form=event.currentTarget;
    $("[data-trade-result]").textContent="Sample order: "+form.elements.side.value+" "+form.elements.quantity.value+" "+security.symbol+" · "+form.elements.type.value+" · indicative value "+$("[data-trade-value]").textContent;
  });
  $("[data-yas-form]").addEventListener("submit",event=>{
    event.preventDefault();const form=event.currentTarget,price=Number(form.elements.price.value),coupon=Number(form.elements.coupon.value),periods=Math.round(Number(form.elements.years.value)*2),benchmark=Number(form.elements.benchmark.value);
    if (![price,coupon,periods,benchmark].every(Number.isFinite) || price<=0 || periods<=0) return;
    function bondPrice(yieldRate) { let value=0;for(let period=1;period<=periods;period++)value+=(coupon/2+(period===periods?100:0))/Math.pow(1+yieldRate/2,period);return value; }
    let low=-.99,high=5;
    for(let step=0;step<100;step++){const mid=(low+high)/2;if(bondPrice(mid)>price)low=mid;else high=mid;}
    const ytm=(low+high)/2;
    $("[data-yas-yield]").textContent=(ytm*100).toFixed(3)+"%";
    const spread=(ytm*100-benchmark)*100;
    $("[data-yas-spread]").textContent=(Math.abs(spread)<.05?0:spread).toFixed(1)+" bp";
  });

  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-chrome-action]");if(!button)return;
    const action=button.dataset.chromeAction;closeMenus();
    if (action.startsWith("window-")){openPageWindow(action.slice(7));return;}
    if (action==="refresh"){send(action);return;}
    if (action==="theme"){openDialog("theme-dialog");return;}
    if (action==="trade"){updateTrade();openDialog("trade-dialog");return;}
    if (action==="yas"){openDialog("yas-dialog");$("[data-yas-form]").requestSubmit();return;}
    if (action==="command"){$("#command-input").focus();return;}
    if (action==="back"||action==="forward"){$('[data-history="'+action+'"]').click();return;}
    if (action==="zoom-in"||action==="zoom-out"){zoomStep(action==="zoom-in"?1:-1);return;}
    if (action==="zoom-auto"){zoom.value="auto";applyZoom();return;}
    if (action==="currency"){focusSelect(currency);return;}
    if (action==="account"){info("ACCOUNT",'<p>Your desktop account syncs watchlists, portfolios, alerts, and layouts between computers.</p><p><a href="'+new URL('install.html#account',home).href+'">Account help ↗</a></p>');return;}
    if (action==="about"){info("ABOUT SIMCOE TRADING",'<p>Simcoe Trading is a desktop market terminal by Andrey Goussev. This website lets you browse screenshots of the desktop app.</p><p><a href="'+home+'#download">Download Simcoe Trading ↗</a></p>');return;}
    if (action==="shortcuts"){info("KEYBOARD SHORTCUTS",'<div class="description-row"><span>Command line</span><strong>/</strong></div><div class="description-row"><span>Search suggestions</span><strong>↑ / ↓</strong></div><div class="description-row"><span>Open selected result</span><strong>Enter</strong></div><div class="description-row"><span>Previous / next tab</span><strong>Alt+← / Alt+→</strong></div><div class="description-row"><span>Close menu or dialog</span><strong>Escape</strong></div>');return;}
    if (action==="guide"){location.href=new URL('install.html',home).href;return;}
    if (action==="updates"){location.href=new URL('whats-new.html',home).href;return;}
    if (action==="workspaces"){$('[data-view-link="dashboard"]').click();return;}
    if (action==="dock"){window.focus();return;}
    if (action==="sounds"){info("SOUNDS",'<p>Notification sounds are available in the desktop app for price alerts, fills, and updates.</p><p><a href="'+home+'#download">Get the desktop terminal ↗</a></p>');return;}
    if (action==="quit"){window.close();return;}
    if (action==="find"){
      info("FIND IN PAGE",'<form data-find-form class="control-row"><label class="form-field">FIND<input type="search" name="query" required aria-label="Find text in this page"></label><button class="action-button primary" type="submit">FIND NEXT</button></form>');
      $("[data-find-form]").addEventListener("submit",e=>{e.preventDefault();const text=e.currentTarget.elements.query.value;$("#info-dialog").close();window.find(text,false,false,true);});$("[data-find-form] input").focus();
    }
  });
})();
