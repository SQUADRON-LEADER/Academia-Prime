/**
 * Student Portal - Exam Inspect & Hidden Dateheet Module
 * Strictly for SRM Student Portal (sp.srmist.edu.in) - Never touches Academia
 * Target: <select id="txtExamMonthYear" name="txtExamMonthYear">
 * - Shows "View  Hidden Datesheet" dotted button ONLY when a month option is selected in website
 * - 4-column Month Matrix Grid with clean dotted UI
 * - Professional Blue Guidance Box inside modal
 * - Live DOM updates on session, resets on refresh
 */
(() => {
  "use strict";

  // Strictly execute on Student Portal (sp.srmist.edu.in) only - never touch Academia
  if (window.location.hostname.includes("academia.")) {
    return;
  }

  const MONTHS_CONFIG = [
    { num: 1, name: "JAN", shortName: "Jan" },
    { num: 2, name: "FEB", shortName: "Feb" },
    { num: 3, name: "MAR", shortName: "Mar" },
    { num: 4, name: "APR", shortName: "Apr" },
    { num: 5, name: "MAY", shortName: "May" },
    { num: 6, name: "JUN", shortName: "Jun" },
    { num: 7, name: "JUL", shortName: "Jul" },
    { num: 8, name: "AUG", shortName: "Aug" },
    { num: 9, name: "SEP", shortName: "Sep" },
    { num: 10, name: "OCT", shortName: "Oct" },
    { num: 11, name: "NOV", shortName: "Nov" },
    { num: 12, name: "DEC", shortName: "Dec" },
  ];

  let originalOptionsBackup = null;
  let currentTargetIndex = 1;
  let selectedMonthNum = 5;
  let selectedYear = new Date().getFullYear();

  /**
   * Strictly verify if the current active view or page is the Scribe Request page.
   */
  function isScribeRequest() {
    const url = (window.location.href || "").toLowerCase();
    const hash = (window.location.hash || "").toLowerCase();
    if (url.includes("scribe") || hash.includes("scribe")) {
      return true;
    }

    // Check headings, page headers, card headers, breadcrumbs, titles
    const headerSelectors = [
      "h1", "h2", "h3", "h4", "h5", "h6",
      ".page-title", ".page-header", ".card-title", ".panel-title",
      ".breadcrumb", "legend", "title", ".content-header",
      ".card-header", ".panel-heading", ".box-title"
    ];
    for (const sel of headerSelectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.textContent && el.textContent.toLowerCase().includes("scribe")) {
          return true;
        }
      }
    }

    // Check main details content
    const mainDetails =
      document.getElementById("divMainDetails") ||
      document.getElementById("mainDetails") ||
      document.querySelector(".main-content, .content-wrapper, #content");
    if (mainDetails && (mainDetails.innerText || "").toLowerCase().includes("scribe")) {
      return true;
    }

    // Check active sidebar or menu navigation item
    const activeNav = document.querySelector(
      ".sidebar .active, .nav-item.active, li.active, .sidebar-menu .active, a.active, a.sp-dotted-scribe.active, .sp-dotted-scribe"
    );
    if (activeNav && (activeNav.innerText || "").toLowerCase().includes("scribe") && (activeNav.classList.contains("active") || activeNav.closest(".active"))) {
      return true;
    }

    // Check forms or form actions
    const forms = document.querySelectorAll("form");
    for (const f of forms) {
      const fText = (
        (f.getAttribute("action") || "") + " " +
        (f.getAttribute("name") || "") + " " +
        (f.id || "") + " " +
        (f.innerText || "")
      ).toLowerCase();
      if (fText.includes("scribe")) {
        return true;
      }
    }

    // Check full page text if it contains "Scribe Request"
    if (document.body && (document.body.innerText || "").toLowerCase().includes("scribe request")) {
      return true;
    }

    return false;
  }

  /**
   * Finds the <select id="txtExamMonthYear"> element.
   */
  function findExamSelect() {
    return (
      document.getElementById("txtExamMonthYear") ||
      document.querySelector("select[name='txtExamMonthYear']") ||
      document.querySelector("select[onchange*='funLoadSubject']")
    );
  }

  /**
   * Parses Month Number and Year from an option.
   */
  function parseOptionData(opt) {
    if (!opt) return { monthNum: 5, monthName: "May", year: 2026 };

    const val = (opt.value || "").trim();
    const txt = (opt.text || opt.innerText || "").trim();

    if (val.includes("_")) {
      const parts = val.split("_");
      const mNum = parseInt(parts[0], 10);
      const yNum = parseInt(parts[1], 10);
      if (!isNaN(mNum) && !isNaN(yNum)) {
        const found =
          MONTHS_CONFIG.find((m) => m.num === mNum) || MONTHS_CONFIG[4];
        return { monthNum: mNum, monthName: found.shortName, year: yNum };
      }
    }

    const textMatch = txt.match(
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b[\s\-_]*(\d{4})/i,
    );
    if (textMatch) {
      const mStr = textMatch[1].toLowerCase();
      const yNum = parseInt(textMatch[2], 10);
      const found =
        MONTHS_CONFIG.find((m) => m.shortName.toLowerCase() === mStr) ||
        MONTHS_CONFIG[4];
      return { monthNum: found.num, monthName: found.shortName, year: yNum };
    }

    return { monthNum: 5, monthName: "May", year: new Date().getFullYear() };
  }

  /**
   * Backs up original options state for resetting on demand.
   */
  function backupOptionsOnce(selectEl) {
    if (originalOptionsBackup || !selectEl) return;
    originalOptionsBackup = Array.from(selectEl.options).map((opt) => ({
      value: opt.value,
      text: opt.text,
    }));
  }

  /**
   * Injects the dotted "View  Hidden Datesheet" button beside #txtExamMonthYear.
   * Strictly limited to Scribe Request and always shown.
   */
  function injectActionUI(selectEl) {
    if (!selectEl || !isScribeRequest()) {
      const existing = document.getElementById("sp-exam-inline-action");
      if (existing) existing.remove();
      return;
    }

    backupOptionsOnce(selectEl);

    let actionWrap = document.getElementById("sp-exam-inline-action");
    if (!actionWrap || !document.body.contains(actionWrap)) {
      if (actionWrap) actionWrap.remove();

      actionWrap = document.createElement("span");
      actionWrap.id = "sp-exam-inline-action";
      actionWrap.className = "sp-exam-action-wrapper sp-visible";

      actionWrap.innerHTML = `
        <button type="button" id="sp-hidden-datesheet-btn" class="sp-hidden-datesheet-btn" title="Edit Month & Year for the selected option">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>View  Hidden Datesheet</span>
        </button>
        <div class="sp-exam-info-container">
          <span class="sp-exam-info-btn" role="img" aria-label="Info" title="">i</span>
          <div class="sp-exam-tooltip">
            <div class="sp-exam-tooltip-line sp-exam-tooltip-warn">
              <strong>Note:</strong> This Datesheet dates might be tentative.
            </div>
            <div class="sp-exam-tooltip-line">
              • Pick Month of End Semster Exams Like May or Nov/Dec.
            </div>
            <div class="sp-exam-tooltip-line sp-exam-tooltip-sub">
              • If blank, backend hasn't updated yet.
            </div>
          </div>
        </div>
      `;

      // Hook click to open matrix modal
      const btn = actionWrap.querySelector("#sp-hidden-datesheet-btn");
      if (btn) {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openMatrixModal();
        });
      }

      if (selectEl.nextSibling) {
        selectEl.parentNode.insertBefore(actionWrap, selectEl.nextSibling);
      } else {
        selectEl.parentNode.appendChild(actionWrap);
      }
    } else {
      actionWrap.classList.add("sp-visible");
    }

    if (selectEl.selectedIndex > 0) {
      currentTargetIndex = selectEl.selectedIndex;
    }
  }

  /**
   * Creates or returns the modal overlay.
   */
  function ensureModal() {
    let overlay = document.getElementById("sp-exam-inspect-modal-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "sp-exam-inspect-modal-overlay";

    overlay.innerHTML = `
      <div class="sp-exam-modal-card" id="spExamInspectModalCard" role="dialog" aria-modal="true">
        <!-- HEADER -->
        <div class="sp-exam-modal-header">
          <div class="sp-exam-header-title-group">
            <div class="sp-exam-header-icon-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <div class="sp-exam-header-title">View Hidden Datesheet</div>
            </div>
          </div>
          <button type="button" id="sp-exam-close-btn" class="sp-exam-modal-close-btn" title="Close">×</button>
        </div>

        <!-- BODY -->
        <div class="sp-exam-modal-body">
          <!-- Tentative Notice -->
          <div class="sp-exam-banner-tentative">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <strong>Note:</strong> This Datesheet dates might be tentative
            </div>
          </div>

          <!-- Professional Blue Advisory Box -->
          <div class="sp-exam-banner-blue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div style="font-weight: 700; letter-spacing: 0.01em;">Month/Year Select Advice:</div>
              <div>• Pick Month of End Semster Exams like May or Nov/Dec.</div>
              <div>• If nothing is visible after selecting, they haven't updated the datesheet in the backend yet.......please wait a few days.</div>
            </div>
          </div>

          <!-- Month Section -->
          <div class="sp-exam-matrix-box">
            <div class="sp-exam-matrix-header">
              <div class="sp-exam-matrix-label">Select Month</div>
              <div class="sp-exam-matrix-pill" id="sp-exam-preview-pill">--</div>
            </div>
            <div class="sp-exam-month-grid" id="sp-exam-month-grid">
              ${MONTHS_CONFIG.map(
                (m) =>
                  `<button type="button" class="sp-exam-month-btn ${[5, 11, 12].includes(m.num) ? "sp-exam-highlight-month" : ""}" data-num="${m.num}">${m.name}</button>`,
              ).join("")}
            </div>
          </div>

          <!-- Year Selection Row -->
          <div class="sp-exam-matrix-box">
            <div class="sp-exam-matrix-header">
              <div class="sp-exam-matrix-label">Select Year</div>
            </div>
            <div class="sp-exam-year-row" id="sp-exam-year-row">
              <!-- Generated dynamically -->
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="sp-exam-modal-footer">
          <div class="sp-exam-footer-note">Resets on page refresh.</div>
          <div class="sp-exam-footer-actions">
            <button type="button" id="sp-exam-reset-btn" class="sp-exam-btn-secondary">Reset</button>
            <button type="button" id="sp-exam-apply-btn" class="sp-exam-btn-primary">Apply</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    const closeBtn = overlay.querySelector("#sp-exam-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("sp-modal-open")) {
        closeModal();
      }
    });

    // Month Matrix Grid Clicks
    const monthBtns = overlay.querySelectorAll(".sp-exam-month-btn");
    monthBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedMonthNum = parseInt(btn.dataset.num, 10);
        updateMatrixUI();
        applyLiveChange();
      });
    });

    // Reset button
    const resetBtn = overlay.querySelector("#sp-exam-reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        resetSelectOptions();
        syncModalWithTargetOption();
      });
    }

    // Apply button
    const applyBtn = overlay.querySelector("#sp-exam-apply-btn");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        applyLiveChange();
        closeModal();
      });
    }

    return overlay;
  }

  /**
   * Resets all options to initial backup.
   */
  function resetSelectOptions() {
    const selectEl = findExamSelect();
    if (!selectEl || !originalOptionsBackup) return;

    originalOptionsBackup.forEach((item, idx) => {
      if (selectEl.options[idx]) {
        selectEl.options[idx].value = item.value;
        selectEl.options[idx].text = item.text;
      }
    });

    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof window.funLoadSubject === "function") {
      try {
        window.funLoadSubject();
      } catch (e) {}
    }
  }

  /**
   * Applies the month and year values live to the target option in #txtExamMonthYear.
   */
  function applyLiveChange() {
    const selectEl = findExamSelect();
    if (!selectEl) return;

    if (selectEl.options.length > 1 && currentTargetIndex === 0) {
      currentTargetIndex = 1;
    }
    const targetOpt = selectEl.options[currentTargetIndex] || selectEl.options[1] || selectEl.options[0];
    if (!targetOpt) return;

    const monthObj =
      MONTHS_CONFIG.find((m) => m.num === selectedMonthNum) || MONTHS_CONFIG[4];
    const newValue = `${selectedMonthNum}_${selectedYear}`;
    const newText = `${monthObj.shortName}-${selectedYear}`;

    targetOpt.value = newValue;
    targetOpt.text = newText;

    // Ensure the modified option is selected in the select dropdown
    selectEl.selectedIndex = currentTargetIndex;

    const previewPill = document.getElementById("sp-exam-preview-pill");
    if (previewPill) {
      previewPill.textContent = newText;
    }

    // Trigger change event so portal loads subject
    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof window.funLoadSubject === "function") {
      try {
        window.funLoadSubject();
      } catch (e) {}
    }
  }

  /**
   * Updates the visual active state on month & year buttons in modal.
   */
  function updateMatrixUI() {
    const monthBtns = document.querySelectorAll(".sp-exam-month-btn");
    monthBtns.forEach((btn) => {
      btn.classList.toggle(
        "active",
        parseInt(btn.dataset.num, 10) === selectedMonthNum,
      );
    });

    const baseYears = [2026, 2027, 2028, 2029, 2030];
    const isPresetYear = baseYears.includes(selectedYear);

    const yearBtns = document.querySelectorAll(".sp-exam-year-btn");
    yearBtns.forEach((btn) => {
      btn.classList.toggle(
        "active",
        parseInt(btn.dataset.year, 10) === selectedYear,
      );
    });

    const customInput = document.getElementById("sp-exam-custom-year-input");
    if (customInput) {
      customInput.classList.toggle("active", !isPresetYear);
      if (!isPresetYear) {
        customInput.value = selectedYear;
      } else {
        customInput.value = "";
      }
    }

    const monthObj =
      MONTHS_CONFIG.find((m) => m.num === selectedMonthNum) || MONTHS_CONFIG[4];
    const previewPill = document.getElementById("sp-exam-preview-pill");
    if (previewPill) {
      previewPill.textContent = `${monthObj.shortName}-${selectedYear}`;
    }
  }

  /**
   * Synchronizes the modal with the target option.
   */
  function syncModalWithTargetOption() {
    const selectEl = findExamSelect();
    if (!selectEl) return;

    let targetOpt =
      selectEl.options[currentTargetIndex] || selectEl.options[1] || selectEl.options[0];
    if (targetOpt && (targetOpt.value === "0" || targetOpt.value === "") && selectEl.options.length > 1) {
      currentTargetIndex = 1;
      targetOpt = selectEl.options[1];
    }
    const parsed = parseOptionData(targetOpt);

    selectedMonthNum = parsed.monthNum;
    selectedYear = parsed.year;

    // Render Year Buttons (2026, 2027, 2028, 2029, 2030 + Expanded Custom)
    const yearRow = document.getElementById("sp-exam-year-row");
    if (yearRow) {
      const baseYears = [2026, 2027, 2028, 2029, 2030];
      const isPresetYear = baseYears.includes(selectedYear);

      yearRow.innerHTML = `
        ${baseYears
          .map(
            (y) =>
              `<button type="button" class="sp-exam-year-btn ${y === selectedYear ? "active" : ""}" data-year="${y}">${y}</button>`,
          )
          .join("")}
        <input type="number" id="sp-exam-custom-year-input" class="sp-exam-custom-year-input ${!isPresetYear ? "active" : ""}" placeholder="CUSTOM eg. 2031" min="2000" max="2099" maxlength="4" value="${!isPresetYear ? selectedYear : ""}" />
      `;

      yearRow.querySelectorAll(".sp-exam-year-btn").forEach((yBtn) => {
        yBtn.addEventListener("click", () => {
          selectedYear = parseInt(yBtn.dataset.year, 10);
          updateMatrixUI();
          applyLiveChange();
        });
      });

      const customInp = yearRow.querySelector("#sp-exam-custom-year-input");
      if (customInp) {
        customInp.addEventListener("input", () => {
          if (customInp.value.length > 4) {
            customInp.value = customInp.value.slice(0, 4);
          }
          const val = parseInt(customInp.value, 10);
          if (!isNaN(val) && customInp.value.length === 4 && val >= 1900 && val <= 2100) {
            selectedYear = val;
            updateMatrixUI();
            applyLiveChange();
          }
        });
      }
    }

    updateMatrixUI();
  }

  /**
   * Opens the Matrix Modal.
   */
  function openMatrixModal() {
    const selectEl = findExamSelect();
    if (selectEl) {
      if (selectEl.selectedIndex > 0) {
        currentTargetIndex = selectEl.selectedIndex;
      } else if (selectEl.options.length > 1) {
        currentTargetIndex = 1;
        selectEl.selectedIndex = 1;
      } else {
        currentTargetIndex = 0;
      }
    }

    const modal = ensureModal();
    syncModalWithTargetOption();

    if (modal) {
      modal.classList.add("sp-modal-open");
    }
  }

  /**
   * Closes the modal.
   */
  function closeModal() {
    const modal = document.getElementById("sp-exam-inspect-modal-overlay");
    if (modal) {
      modal.classList.remove("sp-modal-open");
    }
  }

  /**
   * Main scan routine.
   */
  function runExamInspectEnhancer() {
    try {
      if (!isScribeRequest()) {
        const existing = document.getElementById("sp-exam-inline-action");
        if (existing) existing.remove();
        return;
      }
      const selectEl = findExamSelect();
      if (selectEl) {
        injectActionUI(selectEl);
      } else {
        const existing = document.getElementById("sp-exam-inline-action");
        if (existing) existing.remove();
      }
    } catch (err) {
      console.warn("[Student Portal] Exam Inspect Error:", err);
    }
  }

  /**
   * Lifecycle Handler with MutationObserver & Polling.
   */
  function init() {
    runExamInspectEnhancer();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runExamInspectEnhancer);
    }
    window.addEventListener("load", runExamInspectEnhancer);

    // Fast polling on start (stops after 3s)
    const fastInterval = setInterval(runExamInspectEnhancer, 300);
    setTimeout(() => clearInterval(fastInterval), 3000);

    // Debounced MutationObserver
    let timer = null;
    const observer = new MutationObserver((mutations) => {
      let isRelevant = false;
      for (const m of mutations) {
        if (
          m.target &&
          (m.target.id === "sp-exam-inspect-modal-overlay" ||
            (m.target.classList &&
              (m.target.classList.contains("sp-exam-action-wrapper") ||
                m.target.classList.contains("sp-exam-tooltip"))))
        ) {
          continue;
        }
        isRelevant = true;
        break;
      }
      if (!isRelevant) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(runExamInspectEnhancer, 50);
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    }
  }

  init();
})();
