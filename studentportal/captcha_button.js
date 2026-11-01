/**
 * ============================================================
 * Academia Prime - Student Portal Auto CAPTCHA Toggle Button
 * ============================================================
 * Adds an ON/OFF toggle button near the Auto Solve button on
 * Student Portal (sp.srmist.edu.in) to enable or disable
 * automatic CAPTCHA solving.
 * ============================================================
 */

(() => {
  "use strict";

  // Strictly execute on Student Portal (sp.srmist.edu.in) only
  if (!window.location.hostname.includes("sp.srmist.edu.in")) {
    return;
  }

  /**
   * Strictly verify if the current page is the Student Portal login page.
   */
  function isLoginPage() {
    return (
      window.location.pathname.includes("/loginManager/") ||
      window.location.pathname.includes("Login.jsp") ||
      document.getElementById("login_form") !== null ||
      document.getElementById("divLogin") !== null
    );
  }

  // Fast exit if we are definitively on internal portal pages
  if (
    !window.location.pathname.includes("/loginManager/") &&
    !window.location.pathname.includes("Login.jsp") &&
    (window.location.pathname.includes("/report/") ||
      window.location.pathname.includes("/template/") ||
      window.location.pathname.includes("/examination/") ||
      window.location.pathname.includes("/fees/"))
  ) {
    return;
  }

  // Prevent double injection
  if (window.__ACADEMIA_CAPTCHA_BUTTON_LOADED__) return;
  window.__ACADEMIA_CAPTCHA_BUTTON_LOADED__ = true;

  const STORAGE_KEY = "ar_auto_captcha_enabled";

  /**
   * Check whether auto-solve is enabled (defaults to true).
   */
  function isAutoSolveEnabled() {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      return val === null ? true : val === "true";
    } catch {
      return true;
    }
  }

  /**
   * Save auto-solve state and notify listeners across scripts.
   */
  function setAutoSolveState(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    } catch {}

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: enabled });
      } catch {}
    }

    window.dispatchEvent(
      new CustomEvent("ar-captcha-toggle-changed", {
        detail: { enabled }
      })
    );
  }

  /**
   * Render the Toggle Button DOM within an isolated Shadow Root.
   */
  /**
   * Render the Dual-Button Segmented Control DOM within an isolated Shadow Root.
   * Auto: [ ON | OFF ] (Left: ON, Right: OFF)
   */
  function createToggleHostElement() {
    const host = document.createElement("span");
    host.className = "revanced-captcha-toggle-host";
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: inline-flex !important;
        align-items: center !important;
        margin: 0 0 0 6px !important;
        vertical-align: middle !important;
        position: relative !important;
        z-index: 100 !important;
        flex-shrink: 0 !important;
        max-width: fit-content !important;
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      .revanced-toggle-wrapper {
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
      }
      /* Dual Button Segmented Control */
      .revanced-segmented-control {
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        height: 28px !important;
        padding: 2px 3px 2px 8px !important;
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 6px !important;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
        box-sizing: border-box !important;
        user-select: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
      }
      .revanced-segmented-control:hover {
        border-color: #94a3b8 !important;
      }
      .revanced-seg-label {
        font-size: 11.5px !important;
        font-weight: 700 !important;
        color: #334155 !important;
        letter-spacing: 0.01em !important;
        white-space: nowrap !important;
        display: inline-flex !important;
        align-items: center !important;
      }
      .revanced-seg-buttons {
        display: inline-flex !important;
        align-items: center !important;
        background: #f1f5f9 !important;
        border-radius: 4px !important;
        padding: 2px !important;
        gap: 2px !important;
      }
      .revanced-seg-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 20px !important;
        min-width: 32px !important;
        padding: 0 6px !important;
        border: none !important;
        outline: none !important;
        border-radius: 3px !important;
        font-family: inherit !important;
        font-size: 10.5px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        letter-spacing: 0.02em !important;
        cursor: pointer !important;
        background: transparent !important;
        color: #64748b !important;
        transition: all 0.15s ease !important;
        box-sizing: border-box !important;
      }
      .revanced-seg-btn:hover:not(.is-active) {
        background: #e2e8f0 !important;
        color: #1e293b !important;
      }
      /* Left ON Button Active */
      .revanced-seg-btn.seg-on.is-active {
        background: #059669 !important;
        color: #ffffff !important;
        box-shadow: 0 1px 2px rgba(5, 150, 105, 0.3) !important;
        font-weight: 800 !important;
      }
      /* Right OFF Button Active */
      .revanced-seg-btn.seg-off.is-active {
        background: #dc2626 !important;
        color: #ffffff !important;
        box-shadow: 0 1px 2px rgba(220, 38, 38, 0.3) !important;
        font-weight: 800 !important;
      }
      .revanced-seg-btn:active {
        transform: translateY(0.5px) !important;
      }

      /* Tooltip card */
      .revanced-tooltip-card {
        position: absolute !important;
        bottom: calc(100% + 8px) !important;
        left: 50% !important;
        transform: translateX(-50%) translateY(4px) !important;
        width: 220px !important;
        padding: 9px 12px !important;
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.04) !important;
        color: #1e293b !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s !important;
        z-index: 999999 !important;
        text-align: left !important;
      }
      .revanced-toggle-wrapper:hover .revanced-tooltip-card {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateX(-50%) translateY(0) !important;
      }
      .revanced-tt-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        margin-bottom: 5px !important;
        padding-bottom: 4px !important;
        border-bottom: 1px solid #f1f5f9 !important;
      }
      .revanced-tt-title-wrap {
        display: flex !important;
        align-items: center !important;
        gap: 5px !important;
      }
      .revanced-tt-title {
        font-size: 11.5px !important;
        font-weight: 800 !important;
        color: #1e1b4b !important;
        letter-spacing: 0.01em !important;
      }
      .revanced-tt-status-badge {
        font-size: 9.5px !important;
        font-weight: 700 !important;
        padding: 2px 5px !important;
        border-radius: 4px !important;
        letter-spacing: 0.02em !important;
        text-transform: uppercase !important;
      }
      .revanced-tt-status-badge.badge-on {
        background: #dcfce7 !important;
        color: #15803d !important;
      }
      .revanced-tt-status-badge.badge-off {
        background: #fee2e2 !important;
        color: #b91c1c !important;
      }
      .revanced-tt-body {
        font-size: 11px !important;
        line-height: 1.35 !important;
        color: #475569 !important;
        margin: 0 !important;
      }
      .revanced-tt-arrow {
        position: absolute !important;
        top: 100% !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 0 !important;
        height: 0 !important;
        border-left: 5px solid transparent !important;
        border-right: 5px solid transparent !important;
        border-top: 5px solid #ffffff !important;
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.08)) !important;
      }
    `;
    shadow.appendChild(style);

    const faviconUrl =
      typeof chrome !== "undefined" && chrome.runtime?.getURL
        ? chrome.runtime.getURL("icons/academia-prime-logo.png")
        : "icons/academia-prime-logo.png";

    const wrapper = document.createElement("div");
    wrapper.className = "revanced-toggle-wrapper";

    const control = document.createElement("div");
    control.className = "revanced-segmented-control";
    control.setAttribute("role", "group");
    control.setAttribute("aria-label", "Auto CAPTCHA Solve Switch");

    const label = document.createElement("span");
    label.className = "revanced-seg-label";
    label.innerHTML = `
      <img src="${faviconUrl}" style="width: 13px; height: 13px; border-radius: 2px; vertical-align: middle; margin-right: 3px;" alt="" />
      Auto:
    `;

    const btnGroup = document.createElement("div");
    btnGroup.className = "revanced-seg-buttons";

    const btnOn = document.createElement("button");
    btnOn.type = "button";
    btnOn.className = "revanced-seg-btn seg-on";
    btnOn.textContent = "ON";
    btnOn.title = "Turn Auto Solve ON";

    const btnOff = document.createElement("button");
    btnOff.type = "button";
    btnOff.className = "revanced-seg-btn seg-off";
    btnOff.textContent = "OFF";
    btnOff.title = "Turn Auto Solve OFF";

    btnGroup.appendChild(btnOn);
    btnGroup.appendChild(btnOff);
    control.appendChild(label);
    control.appendChild(btnGroup);

    const tooltip = document.createElement("div");
    tooltip.className = "revanced-tooltip-card";

    let isEnabled = isAutoSolveEnabled();

    function updateUI() {
      if (isEnabled) {
        btnOn.classList.add("is-active");
        btnOff.classList.remove("is-active");
      } else {
        btnOff.classList.add("is-active");
        btnOn.classList.remove("is-active");
      }

      tooltip.innerHTML = `
        <div class="revanced-tt-header">
          <div class="revanced-tt-title-wrap">
            <img src="${faviconUrl}" style="width: 13px; height: 13px; border-radius: 2px; vertical-align: middle;" alt="" />
            <span class="revanced-tt-title">Auto Solve</span>
          </div>
          <span class="revanced-tt-status-badge ${isEnabled ? "badge-on" : "badge-off"}">
            ${isEnabled ? "ON" : "OFF"}
          </span>
        </div>
        <p class="revanced-tt-body">
          ${
            isEnabled
              ? "Auto-solve is <b>active</b>. CAPTCHA is solved automatically upon loading."
              : "Auto-solve is <b>turned off</b>. Click ON to re-enable automatic solving."
          }
        </p>
        <div class="revanced-tt-arrow"></div>
      `;
    }

    updateUI();

    btnOn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isEnabled) {
        isEnabled = true;
        setAutoSolveState(true);
        updateUI();
      }
    });

    btnOff.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isEnabled) {
        isEnabled = false;
        setAutoSolveState(false);
        updateUI();
      }
    });

    // Listen for changes from other tabs or solver script
    window.addEventListener("ar-captcha-toggle-changed", (e) => {
      if (typeof e.detail?.enabled === "boolean" && e.detail.enabled !== isEnabled) {
        isEnabled = e.detail.enabled;
        updateUI();
      }
    });

    wrapper.appendChild(control);
    wrapper.appendChild(tooltip);
    shadow.appendChild(wrapper);

    return host;
  }

  /**
   * Render the Troubleshooting Notice DOM within an isolated Shadow Root.
   * Visible in the Welcome guidance section in a yellow box with a dotted outline.
   */
  function createNoticeBoxElement() {
    const host = document.createElement("div");
    host.className = "revanced-captcha-notice-host";
    host.style.cssText =
      "display: block !important; clear: both !important; width: 100% !important; margin: 12px 0 0 0 !important; box-sizing: border-box !important;";
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block !important;
        clear: both !important;
        width: 100% !important;
        margin: 12px 0 0 0 !important;
        box-sizing: border-box !important;
        white-space: normal !important;
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      .revanced-notice-box {
        display: flex !important;
        align-items: flex-start !important;
        gap: 10px !important;
        padding: 10px 12px !important;
        background: #fffaf0 !important;
        border: 1.5px dotted #c69a22 !important;
        border-radius: 8px !important;
        box-sizing: border-box !important;
        box-shadow: 0 1px 3px rgba(217, 119, 6, 0.08) !important;
      }
      .revanced-notice-icon {
        width: 16px !important;
        height: 16px !important;
        min-width: 16px !important;
        color: #c69a22 !important;
        margin-top: 2px !important;
        flex-shrink: 0 !important;
      }
      .revanced-notice-content {
        flex: 1 !important;
        min-width: 0 !important;
      }
      .revanced-notice-title {
        font-size: 12px !important;
        font-weight: 800 !important;
        color: #5c4500 !important;
        letter-spacing: 0.01em !important;
        margin: 0 0 4px 0 !important;
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
      }
      .revanced-notice-points {
        margin: 0 !important;
        padding-left: 16px !important;
        list-style-type: disc !important;
      }
      .revanced-notice-points li {
        font-size: 11px !important;
        line-height: 1.45 !important;
        color: #9a7200 !important;
        margin-bottom: 3px !important;
      }
      .revanced-notice-points li:last-child {
        margin-bottom: 0 !important;
      }
      .revanced-notice-points li b {
        color: #5c4500 !important;
        font-weight: 700 !important;
      }
      .revanced-report-link {
        color: #132450 !important;
        font-weight: 800 !important;
        text-decoration: underline !important;
      }
      .revanced-report-link:hover {
        color: #0d1938 !important;
      }
      .revanced-notice-pill {
        display: inline-block !important;
        padding: 1px 6px !important;
        border: 1.5px dotted #9a7200 !important;
        border-radius: 5px !important;
        font-weight: normal !important;
        background: #fff4c2 !important;
        color: #5c4500 !important;
        margin: 1px 2px !important;
        line-height: 1.25 !important;
      }
      .revanced-notice-red {
        color: #dc2626 !important;
        font-weight: normal !important;
      }
    `;
    shadow.appendChild(style);

    const box = document.createElement("div");
    box.className = "revanced-notice-box";
    box.innerHTML = `
      <svg class="revanced-notice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <div class="revanced-notice-content">
        <div class="revanced-notice-title">Note:</div>
        <ul class="revanced-notice-points">
          <li>While Login, if the portal keeps refreshing without showing any error, <span class="revanced-notice-pill" style="display: inline-block; padding: 1px 6px; border: 1.5px dotted #9a7200; border-radius: 5px; font-weight: normal; background: #fff4c2; color: #5c4500; line-height: 1.25; margin: 1px 2px;">turn Auto Captcha OFF and enter the CAPTCHA manually</span> or <span class="revanced-notice-pill" style="display: inline-block; padding: 1px 6px; border: 1.5px dotted #9a7200; border-radius: 5px; font-weight: normal; background: #fff4c2; color: #5c4500; line-height: 1.25; margin: 1px 2px;">refresh the page</span> or <span class="revanced-notice-pill" style="display: inline-block; padding: 1px 6px; border: 1.5px dotted #9a7200; border-radius: 5px; font-weight: normal; background: #fff4c2; color: #5c4500; line-height: 1.25; margin: 1px 2px;">just click on captcha text box then press ENTER</span>or press login.<br><span class="revanced-notice-red" style="color: #dc2626; font-weight: normal;">(it's website or portal issue not extension bug)</span>.</li>
          <li>If you see <b>"Invalid captcha"</b>, repeatedly, please <a href="https://docs.google.com/forms/d/1tJC_i71rU6TjHtndcNkotq39YTcs9VxU79uCXzi2a3w/viewform" target="_blank" rel="noopener noreferrer" class="revanced-report-link">report it here ↗</a> so I can fix it ASAP.</li>
        </ul>
      </div>
    `;
    shadow.appendChild(box);

    return host;
  }

  /**
   * Mount the Toggle Button directly beside the Auto Solve button host or controls bar,
   * and mount the troubleshooting notice box strictly in the login page welcome guidance section.
   */
  function scanAndMountToggle() {
    if (!isLoginPage()) return false;

    // Look for Auto Solve button host or controls bar or refresh button inside the login form
    const loginForm = document.getElementById("login_form") || document.getElementById("divLogin");
    const solverHost = document.querySelector(".revanced-captcha-host");
    const controlsBar = document.querySelector(".revanced-captcha-controls-bar");
    const refreshBtn = document.querySelector("#btnRefresh");

    const parentContainer = controlsBar || solverHost?.parentElement || (loginForm && refreshBtn?.parentElement);
    if (!parentContainer) return false;

    let toggleHost = document.querySelector(".revanced-captcha-toggle-host");
    if (!toggleHost) {
      toggleHost = createToggleHostElement();
      if (controlsBar) {
        controlsBar.appendChild(toggleHost);
      } else if (solverHost && solverHost.nextSibling) {
        solverHost.parentElement.insertBefore(toggleHost, solverHost.nextSibling);
      } else if (solverHost) {
        solverHost.parentElement.appendChild(toggleHost);
      } else if (refreshBtn && refreshBtn.nextSibling) {
        refreshBtn.parentElement.insertBefore(toggleHost, refreshBtn.nextSibling);
      } else {
        parentContainer.appendChild(toggleHost);
      }
    }

    // Ensure Note Box is mounted strictly in the Left Welcome Section of the login page
    if (!document.querySelector(".revanced-notice-card, .revanced-captcha-notice-host")) {
      const welcomeSection = document.querySelector(".revanced-student-welcome-section");
      if (welcomeSection) {
        const noticeHost = createNoticeBoxElement();
        welcomeSection.appendChild(noticeHost);
      } else if (loginForm) {
        const insertTarget = toggleHost || solverHost;
        if (insertTarget && insertTarget.parentElement) {
          const noticeHost = createNoticeBoxElement();
          insertTarget.parentElement.insertBefore(noticeHost, insertTarget.nextSibling);
        }
      }
    }

    return true;
  }

  // Dynamic mounting observer that auto-disconnects once mounted or if on non-login page
  const observer = new MutationObserver(() => {
    if (!isLoginPage()) {
      if (
        !window.location.pathname.includes("/loginManager/") &&
        !window.location.pathname.includes("Login.jsp") &&
        (window.location.pathname.includes("/report/") ||
          window.location.pathname.includes("/template/") ||
          window.location.pathname.includes("/examination/") ||
          window.location.pathname.includes("/fees/"))
      ) {
        observer.disconnect();
        return;
      }
      return;
    }
    if (
      document.querySelector(".revanced-captcha-toggle-host") &&
      document.querySelector(".revanced-notice-card, .revanced-captcha-notice-host")
    ) {
      observer.disconnect();
      return;
    }
    scanAndMountToggle();
    if (
      document.querySelector(".revanced-captcha-toggle-host") &&
      document.querySelector(".revanced-notice-card, .revanced-captcha-notice-host")
    ) {
      observer.disconnect();
    }
  });

  // Initial mount attempt
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (!isLoginPage()) return;
      scanAndMountToggle();
      if (
        document.querySelector(".revanced-captcha-toggle-host") &&
        document.querySelector(".revanced-notice-card, .revanced-captcha-notice-host")
      ) {
        observer.disconnect();
      }
    });
  } else {
    if (isLoginPage()) {
      scanAndMountToggle();
    }
  }

  if (isLoginPage()) {
    if (
      !document.querySelector(".revanced-captcha-toggle-host") ||
      !document.querySelector(".revanced-notice-card, .revanced-captcha-notice-host")
    ) {
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
      });
    }
  }
})();

