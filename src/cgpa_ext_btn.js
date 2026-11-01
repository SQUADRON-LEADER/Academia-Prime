/**
 * Academia Prime - CGPA External Button Integration (cgpa_ext_btn.js)
 * Adds "Revanced exclusive" along with the other tabs ("Guide", "Changelog",
 * "Phone/Tablet Guide", "FAQ", "Portal Notice", "Important Links", "Report Bug", "Review")
 * at last in the right most corner with a Brown Button.
 */

(function () {
  "use strict";

  const EXT_CALC_URL = chrome.runtime.getURL("src/cgpa_calculator/calculator.html");
  const THE_HELPER_URL = "https://www.thehelpers.tech/";
  const THE_HELPER_LOGO_URL = chrome.runtime.getURL("icons/academia-prime-logo.png");

  function openCalculatorTab(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: "openCalculator", url: EXT_CALC_URL }, (res) => {
          if (chrome.runtime.lastError || !res?.success) {
            window.open(EXT_CALC_URL, "_blank");
          }
        });
      } else {
        window.open(EXT_CALC_URL, "_blank");
      }
    } catch (err) {
      try {
        window.open(EXT_CALC_URL, "_blank");
      } catch (err2) {
        console.warn("[Academia Prime] Failed to open calculator:", err2);
      }
    }
  }

  function openTheHelperTab(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      window.open(THE_HELPER_URL, "_blank");
    } catch (err) {
      console.warn("[Academia Prime] Failed to open THE HELPER via window.open:", err);
    }
  }

  function createToolsGroupedWrapper(id, customClass = "") {
    const wrap = document.createElement("div");
    wrap.id = id;
    wrap.className = `sp-tools-grouped-wrap tt-tools-grouped-wrap ${customClass}`;
    wrap.style.cssText = `
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      padding: 3px 4px !important;
      border-radius: 9px !important;
      background: linear-gradient(135deg, #e8ecf5 0%, #fdf6ed 100%) !important;
      border: 1.5px dotted #8b5cf6 !important;
      box-shadow: 0 0 8px rgba(139, 92, 246, 0.45), 0 0 2px rgba(139, 92, 246, 0.65) !important;
      margin-left: auto !important;
      flex: 0 0 auto !important;
      box-sizing: border-box !important;
      position: relative !important;
      z-index: 99999 !important;
      overflow: visible !important;
    `;
    return wrap;
  }

  function ensureTooltipStyles() {
    if (document.getElementById("ar-tab-tooltips-style")) return;
    const style = document.createElement("style");
    style.id = "ar-tab-tooltips-style";
    style.textContent = `
      .sp-tools-grouped-wrap, .tt-tools-grouped-wrap, .rev-tools-grouped-wrap {
        position: relative !important;
        z-index: 99999 !important;
        overflow: visible !important;
      }
      .sp-tools-grouped-wrap:hover, .tt-tools-grouped-wrap:hover, .rev-tools-grouped-wrap:hover {
        z-index: 999999 !important;
      }
      .sp-btn-thehelper, .tt-btn-thehelper, .sp-btn-exclusive, .tt-btn-exclusive {
        position: relative !important;
        z-index: 1 !important;
      }
      .sp-btn-thehelper:hover, .tt-btn-thehelper:hover, .sp-btn-exclusive:hover, .tt-btn-exclusive:hover {
        z-index: 1000000 !important;
      }
      .ar-themed-tooltip {
        position: absolute !important;
        top: calc(100% + 8px) !important;
        right: 0 !important;
        background: #ffffff !important;
        border-radius: 9px !important;
        padding: 10px 12px !important;
        box-shadow: 0 16px 36px -4px rgba(15, 23, 42, 0.28), 0 6px 14px -2px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        transform: translateY(4px) !important;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s !important;
        z-index: 2147483647 !important;
        text-align: left !important;
        box-sizing: border-box !important;
        white-space: normal !important;
        cursor: default !important;
        font-family: 'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      .sp-btn-thehelper:hover .ar-thehelper-tooltip,
      .tt-btn-thehelper:hover .ar-thehelper-tooltip,
      .sp-btn-exclusive:hover .ar-cgpa-tooltip,
      .tt-btn-exclusive:hover .ar-cgpa-tooltip {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateY(0) !important;
      }
      .ar-thehelper-tooltip {
        width: 300px !important;
        border: 1.5px solid #ddd0f8 !important;
      }
      .ar-cgpa-tooltip {
        width: 230px !important;
        border: 1.5px solid #e8d8c8 !important;
      }
      .ar-tt-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 6px !important;
        margin-bottom: 6px !important;
        padding-bottom: 5px !important;
        border-bottom: 1px solid #f1f5f9 !important;
      }
      .ar-tt-title-wrap {
        display: flex !important;
        align-items: center !important;
        gap: 5px !important;
      }
      .ar-tt-logo {
        width: 15px !important;
        height: 15px !important;
        border-radius: 3px !important;
        object-fit: contain !important;
        vertical-align: middle !important;
      }
      .ar-tt-title {
        font-size: 12px !important;
        font-weight: 800 !important;
        letter-spacing: 0.01em !important;
      }
      .ar-thehelper-tooltip .ar-tt-title {
        color: #672fcc !important;
      }
      .ar-cgpa-tooltip .ar-tt-title {
        color: #5c4500 !important;
      }
      .ar-tt-badge {
        font-size: 9.5px !important;
        font-weight: 700 !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        letter-spacing: 0.02em !important;
        white-space: nowrap !important;
        text-transform: uppercase !important;
      }
      .ar-tt-badge-purple {
        background: #e8ecf5 !important;
        color: #132450 !important;
      }
      .ar-tt-badge-amber {
        background: #fff4c2 !important;
        color: #9a7200 !important;
      }
      .ar-tt-body {
        font-size: 11px !important;
        line-height: 1.45 !important;
        color: #334155 !important;
        margin: 0 0 6px 0 !important;
        font-weight: 500 !important;
      }
      .ar-tt-body b {
        color: #0f172a !important;
        font-weight: 700 !important;
      }
      .ar-thehelper-tooltip .ar-tt-body b {
        color: #581c87 !important;
      }
      .ar-cgpa-tooltip .ar-tt-body b {
        color: #5c4500 !important;
      }
      .ar-tt-footer {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        font-size: 10px !important;
        font-weight: 600 !important;
        padding-top: 4px !important;
        border-top: 1px dashed #f1f5f9 !important;
      }
      .ar-thehelper-tooltip .ar-tt-footer {
        color: #7b46da !important;
      }
      .ar-cgpa-tooltip .ar-tt-footer {
        color: #9a7200 !important;
      }
      .ar-tt-arrow {
        position: absolute !important;
        bottom: 100% !important;
        right: 22px !important;
        width: 0 !important;
        height: 0 !important;
        border-left: 5px solid transparent !important;
        border-right: 5px solid transparent !important;
        border-bottom: 5px solid #ffffff !important;
        filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.08)) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function createTheHelperTabButton(id, customClass = "") {
    ensureTooltipStyles();
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = id;
    btn.className = `sp-about-tab-btn tt-about-tab-btn sp-btn-thehelper tt-btn-thehelper ${customClass}`;
    btn.style.cssText = `
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
      padding: 5px 9px !important;
      border-radius: 6px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      font-family: inherit !important;
      cursor: pointer !important;
      white-space: nowrap !important;
      flex: 0 0 auto !important;
      color: #7b46da !important;
      background: #f7f4fd !important;
      border: 1px solid #ddd0f8 !important;
      margin: 0 !important;
      text-decoration: none !important;
      transition: all 0.15s ease-in-out !important;
      box-sizing: border-box !important;
      position: relative !important;
    `;

    btn.innerHTML = `
      <img src="${THE_HELPER_LOGO_URL}" alt="THE HELPER" style="width: 14px !important; height: 14px !important; border-radius: 3px !important; object-fit: contain !important; vertical-align: middle !important; display: inline-block !important;" />
      <span>THE HELPER</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 1px;">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
      <div class="ar-themed-tooltip ar-thehelper-tooltip">
        <div class="ar-tt-header">
          <div class="ar-tt-title-wrap">
            <img src="${THE_HELPER_LOGO_URL}" alt="THE HELPER" class="ar-tt-logo" />
            <span class="ar-tt-title">THE HELPER</span>
          </div>
          <span class="ar-tt-badge ar-tt-badge-purple">SRMIST PYQs & Notes</span>
        </div>
        <p class="ar-tt-body">
          Access a comprehensive collection of <b>Previous Year Questions (PYQs)</b> and <b>study notes</b> for all semesters and subjects of SRMIST. Let's ace the CTs and SEM exams with <b>THE HELPER!</b>
        </p>
        <div class="ar-tt-footer">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span>Opens thehelpers.tech in new tab</span>
        </div>
        <div class="ar-tt-arrow"></div>
      </div>
    `;

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#eee5fa";
      btn.style.borderColor = "#b691ee";
      btn.style.color = "#672fcc";
      btn.style.boxShadow = "0 2px 6px rgba(123, 70, 218, 0.25)";
      btn.style.transform = "translateY(-1px)";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#f7f4fd";
      btn.style.borderColor = "#ddd0f8";
      btn.style.color = "#7b46da";
      btn.style.boxShadow = "none";
      btn.style.transform = "translateY(0)";
    });

    btn.addEventListener("click", openTheHelperTab);

    return btn;
  }

  function createBrownTabButton(id, customClass = "") {
    ensureTooltipStyles();
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = id;
    btn.className = `sp-about-tab-btn tt-about-tab-btn sp-btn-exclusive tt-btn-exclusive ${customClass}`;
    btn.style.cssText = `
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
      padding: 5px 9px !important;
      border-radius: 6px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      font-family: inherit !important;
      cursor: pointer !important;
      white-space: nowrap !important;
      flex: 0 0 auto !important;
      color: #5c4500 !important;
      background: #fdf6ed !important;
      border: 1px solid #e8d8c8 !important;
      margin: 0 !important;
      transition: all 0.15s ease-in-out !important;
      box-sizing: border-box !important;
      position: relative !important;
    `;

    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <line x1="8" y1="6" x2="16" y2="6"/>
        <line x1="16" y1="14" x2="16" y2="18"/>
        <line x1="8" y1="10" x2="8" y2="10.01"/>
        <line x1="12" y1="10" x2="12" y2="10.01"/>
        <line x1="16" y1="10" x2="16" y2="10.01"/>
      </svg>
      <span>CGPA Calculator</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 1px;">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
      <div class="ar-themed-tooltip ar-cgpa-tooltip">
        <div class="ar-tt-header">
          <div class="ar-tt-title-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: #9a7200;">
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <line x1="8" y1="6" x2="16" y2="6"/>
              <line x1="16" y1="14" x2="16" y2="18"/>
              <line x1="8" y1="10" x2="8" y2="10.01"/>
              <line x1="12" y1="10" x2="12" y2="10.01"/>
              <line x1="16" y1="10" x2="16" y2="10.01"/>
            </svg>
            <span class="ar-tt-title">CGPA Calculator</span>
          </div>
          <span class="ar-tt-badge ar-tt-badge-amber">New Tab</span>
        </div>
        <p class="ar-tt-body">
          <b>Calculate Your CGPA in New Tab</b>
        </p>
        <div class="ar-tt-footer">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span>Calculate GPA, Target CGPA & Grades</span>
        </div>
        <div class="ar-tt-arrow"></div>
      </div>
    `;

    btn.addEventListener("mouseenter", () => {
      btn.style.background = "#fae8d4";
      btn.style.borderColor = "#9a7200";
      btn.style.color = "#451a03";
      btn.style.boxShadow = "0 2px 6px rgba(244, 197, 66, 0.2)";
      btn.style.transform = "translateY(-1px)";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.background = "#fdf6ed";
      btn.style.borderColor = "#e8d8c8";
      btn.style.color = "#5c4500";
      btn.style.boxShadow = "none";
      btn.style.transform = "translateY(0)";
    });

    btn.addEventListener("click", openCalculatorTab);

    return btn;
  }

  // Remove any legacy banner section if present
  function cleanupLegacyBanners() {
    const banners = document.querySelectorAll("#sp-rev-exclusive-section, #tt-rev-exclusive-section, .rev-exclusive-section");
    banners.forEach((b) => b.remove());
  }

  // Hide portal notice button across all containers (without deleting code)
  function hidePortalNoticeButtons() {
    const noticeBtns = document.querySelectorAll(".sp-btn-notice, .tt-btn-notice, button[data-target='sp-tab-notice'], button[data-target='tt-tab-notice']");
    noticeBtns.forEach((btn) => {
      if (btn.style.display !== "none") {
        btn.style.setProperty("display", "none", "important");
      }
    });
  }

  // 1. INJECT INTO STUDENT PORTAL ABOUT NAV TABS
  function injectStudentPortalExclusiveBtn() {
    cleanupLegacyBanners();
    hidePortalNoticeButtons();

    const tabsContainer =
      document.querySelector("#spAboutModalCard .sp-about-nav-tabs") ||
      document.querySelector("#sp-revanced-modal-overlay .sp-about-nav-tabs") ||
      document.querySelector(".sp-about-nav-tabs");

    if (!tabsContainer) return;

    let wrap = tabsContainer.querySelector("#sp-tools-grouped-wrap");
    if (!wrap) {
      wrap = createToolsGroupedWrapper("sp-tools-grouped-wrap");
      tabsContainer.appendChild(wrap);
    }

    let theHelperBtn = wrap.querySelector("#sp-tab-thehelper-btn");
    let exclusiveBtn = wrap.querySelector("#sp-tab-exclusive-btn");

    if (!theHelperBtn) {
      theHelperBtn = createTheHelperTabButton("sp-tab-thehelper-btn");
      if (exclusiveBtn) {
        wrap.insertBefore(theHelperBtn, exclusiveBtn);
      } else {
        wrap.appendChild(theHelperBtn);
      }
    }

    if (!wrap.querySelector("#sp-tab-exclusive-btn")) {
      const btn = createBrownTabButton("sp-tab-exclusive-btn");
      wrap.appendChild(btn);
    }
  }

  // 2. INJECT INTO ACADEMIA TIMETABLE & MAIN ABOUT NAV TABS
  function injectAcademiaTimetableExclusiveBtn() {
    cleanupLegacyBanners();
    hidePortalNoticeButtons();

    const ttTabsList = document.querySelectorAll(".tt-about-nav-tabs, .revanced-nav-tabs");
    if (!ttTabsList || ttTabsList.length === 0) return;

    ttTabsList.forEach((ttTabs) => {
      let wrap = ttTabs.querySelector("#tt-tools-grouped-wrap, #rev-tools-grouped-wrap, .tt-tools-grouped-wrap, .rev-tools-grouped-wrap");
      if (!wrap) {
        wrap = createToolsGroupedWrapper("tt-tools-grouped-wrap");
        ttTabs.appendChild(wrap);
      }

      let theHelperBtn = wrap.querySelector("#tt-tab-thehelper-btn, #rev-tab-thehelper-btn, .tt-btn-thehelper");
      let exclusiveBtn = wrap.querySelector("#tt-tab-exclusive-btn, #rev-tab-exclusive-btn, .tt-btn-exclusive");

      if (!theHelperBtn) {
        theHelperBtn = createTheHelperTabButton("tt-tab-thehelper-btn");
        if (exclusiveBtn) {
          wrap.insertBefore(theHelperBtn, exclusiveBtn);
        } else {
          wrap.appendChild(theHelperBtn);
        }
      }

      if (!wrap.querySelector("#tt-tab-exclusive-btn, #rev-tab-exclusive-btn, .tt-btn-exclusive")) {
        const btn = createBrownTabButton("tt-tab-exclusive-btn");
        wrap.appendChild(btn);
      }
    });
  }

  // CONTINUOUS / MUTATION ATTACHMENT
  function checkAndInject() {
    injectStudentPortalExclusiveBtn();
    injectAcademiaTimetableExclusiveBtn();
  }

  // Listen for clicks on About triggers to inject promptly
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t && (t.closest("#sp-about-pinned-btn") || t.closest(".sp-pinned-about-btn") || t.closest(".tt-about-toggle-btn"))) {
      setTimeout(checkAndInject, 50);
      setTimeout(checkAndInject, 200);
    }
  }, true);

  // Run on load and observe DOM changes
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAndInject);
  } else {
    checkAndInject();
  }

  const observer = new MutationObserver(() => {
    checkAndInject();
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  setInterval(checkAndInject, 1000);
})();
