/**
 * Student Portal Attendance Engine
 * Strictly scoped to the Attendance Details page with minimal colored metric boxes.
 */
(() => {
  "use strict";

  // Strictly execute on Student Portal (sp.srmist.edu.in) only - never touch Academia
  if (window.location.hostname.includes("academia.")) {
    return;
  }

  // Default attendance threshold (75% default on refresh)
  let currentThreshold = 75;

  // Distinctive Course Theme Palette matching Prime Timetable
  const THEME_PALETTE = [
    { id: "indigo", bg: "#e8ecf5", border: "#b8c2d9", accent: "#0d1938" },
    { id: "emerald", bg: "#dcfce7", border: "#86efac", accent: "#15803d" },
    { id: "sky", bg: "#e0f2fe", border: "#b8c2d9", accent: "#0d1938" },
    { id: "amber", bg: "#fff4c2", border: "#F4C542", accent: "#9a7200" },
    { id: "purple", bg: "#e8ecf5", border: "#d8b4fe", accent: "#132450" },
    { id: "rose", bg: "#ffe4e6", border: "#fda4af", accent: "#be123c" },
    { id: "teal", bg: "#ccfbf1", border: "#5eead4", accent: "#0f766e" },
    { id: "orange", bg: "#ffedd5", border: "#fdba74", accent: "#9a7200" },
    { id: "cyan", bg: "#ecfeff", border: "#a5f3fc", accent: "#132450" },
  ];

  /**
   * Computes attendance margin for the selected threshold (default 75%).
   */
  function computeAttendanceMargin(
    conducted,
    attended,
    absent,
    threshold = currentThreshold,
  ) {
    if (isNaN(conducted) || conducted < 0) return null;
    if (conducted === 0) return 0;

    let A = !isNaN(attended)
      ? attended
      : !isNaN(absent)
        ? conducted - absent
        : NaN;
    if (isNaN(A) || A < 0) return null;

    const C = conducted;
    const currentPct = (A / C) * 100;

    if (currentPct >= threshold) {
      let margin = 0;
      let curr = currentPct;
      let cond = C;
      while (curr >= threshold) {
        cond++;
        margin++;
        curr = (A / cond) * 100;
      }
      return margin - 1;
    } else {
      let margin = 0;
      let curr = currentPct;
      let cond = C;
      let att = A;
      while (curr < threshold) {
        cond++;
        att++;
        margin--;
        curr = (att / cond) * 100;
      }
      return margin;
    }
  }

  /**
   * Strictly finds ONLY the Attendance table.
   */
  function findAttendanceTable() {
    const direct = document.querySelector(
      "#divMainDetails > div.container.mt-4 > div.card.mb-4 > div.card-body.p-0 > div > table",
    );
    if (direct && isAttendanceHeader(direct)) return direct;

    const inDiv = document.querySelector("#divMainDetails table");
    if (inDiv && isAttendanceHeader(inDiv)) return inDiv;

    const allTables = document.querySelectorAll("table");
    for (const tbl of allTables) {
      if (isAttendanceHeader(tbl)) {
        return tbl;
      }
    }
    return null;
  }

  /**
   * Verifies if a table is specifically the attendance table.
   */
  function isAttendanceHeader(tbl) {
    if (!tbl) return false;
    const head =
      tbl.querySelector("thead tr") || tbl.querySelector("tr:first-child");
    if (!head) return false;
    const text = (head.innerText || "").toLowerCase();
    const hasConducted =
      text.includes("max. hours") ||
      text.includes("hours conducted") ||
      text.includes("conducted");
    const hasAttended =
      text.includes("att. hours") ||
      text.includes("hours attended") ||
      text.includes("present") ||
      text.includes("absent");
    const hasPercent =
      text.includes("total percentage") ||
      text.includes("percent") ||
      text.includes("%");

    return hasConducted && (hasAttended || hasPercent);
  }

  /**
   * Dynamically resolves column indices from header text.
   */
  function getColumnIndices(theadRow) {
    const indices = {
      maxHours: -1,
      attHours: -1,
      absentHours: -1,
      totalPct: -1,
    };
    if (!theadRow) return indices;

    const cells = theadRow.children;
    for (let idx = 0; idx < cells.length; idx++) {
      if (
        cells[idx].classList.contains("sp-attendance-header") ||
        cells[idx].classList.contains("sp-odml-col-header")
      ) {
        continue;
      }
      const text = (cells[idx].innerText || cells[idx].textContent || "")
        .trim()
        .toLowerCase();
      if (text.includes("margin")) {
        continue;
      }
      if (text.includes("max") || text.includes("conducted")) {
        indices.maxHours = idx;
      } else if (text.includes("att") || text.includes("present")) {
        indices.attHours = idx;
      } else if (text.includes("absent")) {
        indices.absentHours = idx;
      } else if (text.includes("percent") || text.includes("%")) {
        indices.totalPct = idx;
      }
    }

    if (indices.maxHours === -1) indices.maxHours = 2;
    if (indices.attHours === -1) indices.attHours = 3;
    if (indices.absentHours === -1) indices.absentHours = 4;
    if (indices.totalPct === -1) indices.totalPct = 5;

    return indices;
  }

  /**
   * Safely extracts numeric attendance values from a row.
   */
  function extractRowNumbers(row, cols) {
    const cleanNum = (str) => {
      if (!str) return NaN;
      const trimmed = str.trim();
      if (/^[-–—]$/.test(trimmed)) return 0;
      const m =
        trimmed.match(/^-?\d+(\.\d+)?%?$/) || trimmed.match(/-?\d+(\.\d+)?/);
      return m ? parseFloat(m[0]) : NaN;
    };

    let conducted = NaN;
    let attended = NaN;
    let absent = NaN;
    let pct = NaN;

    if (cols.maxHours >= 0 && row.cells[cols.maxHours]) {
      conducted = cleanNum(row.cells[cols.maxHours].textContent);
    }
    if (cols.attHours >= 0 && row.cells[cols.attHours]) {
      attended = cleanNum(row.cells[cols.attHours].textContent);
    }
    if (cols.absentHours >= 0 && row.cells[cols.absentHours]) {
      absent = cleanNum(row.cells[cols.absentHours].textContent);
    }
    if (cols.totalPct >= 0 && row.cells[cols.totalPct]) {
      pct = cleanNum(row.cells[cols.totalPct].textContent);
    }

    // Rowspan fallback
    if (isNaN(conducted)) {
      const numCells = [];
      for (let c = 0; c < row.cells.length; c++) {
        if (
          row.cells[c].classList.contains("sp-margin-cell") ||
          row.cells[c].classList.contains("sp-odml-col-cell")
        ) {
          continue;
        }
        const val = cleanNum(row.cells[c].textContent);
        if (!isNaN(val)) numCells.push(val);
      }

      if (numCells.length >= 2) {
        conducted = numCells[0];
        attended = numCells[1];
        if (numCells.length >= 3) absent = numCells[2];
        if (numCells.length >= 4) pct = numCells[3];
      }
    }

    if (!isNaN(conducted) && conducted >= 0) {
      if (isNaN(attended) && !isNaN(absent))
        attended = Math.max(0, conducted - absent);
      if (isNaN(absent) && !isNaN(attended))
        absent = Math.max(0, conducted - attended);
      if (isNaN(attended) && isNaN(absent) && !isNaN(pct)) {
        attended = Math.round((pct / 100) * conducted);
        absent = Math.max(0, conducted - attended);
      }
      if (isNaN(attended) && isNaN(absent)) {
        attended = conducted;
        absent = 0;
      }
    }

    return { conducted, attended, absent, pct };
  }

  /**
   * Initializes or returns the global singleton floating tooltip.
   */
  function createOrGetGlobalTooltip() {
    let tt = document.getElementById("sp-margin-global-tooltip");
    if (tt) return tt;

    tt = document.createElement("div");
    tt.id = "sp-margin-global-tooltip";
    tt.className = "sp-margin-global-tooltip";
    tt.innerHTML = `
      <div class="sp-tooltip-header">Attendance Threshold Rules</div>
      <div class="sp-tooltip-item">
        <span class="sp-tooltip-tag sp-tag-75">75%</span>
        <div class="sp-tooltip-desc"><strong>Normal Academic Requirement:</strong> Mandatory minimum attendance to be eligible for End-Semester Examinations.</div>
      </div>
      <div class="sp-tooltip-item">
        <span class="sp-tooltip-tag sp-tag-65">65%</span>
        <div class="sp-tooltip-desc"><strong>Medical & On-Duty (OD) Leave:</strong> Minimum condonation eligibility limit with approved Medical or On-Duty Leave.</div>
      </div>
    `;
    document.body.appendChild(tt);
    return tt;
  }

  function showInfoTooltip(triggerEl) {
    const tt = createOrGetGlobalTooltip();
    const rect = triggerEl.getBoundingClientRect();

    const tooltipWidth = 270;
    const shiftLeft = 55;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2 - shiftLeft;
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    let top = rect.bottom + 8;
    if (top + 160 > window.innerHeight && rect.top > 160) {
      top = rect.top - 160;
    }

    tt.style.left = `${Math.round(left)}px`;
    tt.style.top = `${Math.round(top)}px`;
    tt.classList.add("sp-tooltip-visible");
  }

  function hideInfoTooltip() {
    const tt = document.getElementById("sp-margin-global-tooltip");
    if (tt) {
      tt.classList.remove("sp-tooltip-visible");
    }
  }

  function showCalcTooltip(triggerEl) {
    let tt = document.getElementById("sp-calc-global-tooltip");
    if (!tt) {
      tt = document.createElement("div");
      tt.id = "sp-calc-global-tooltip";
      tt.className = "sp-mini-tooltip";
      tt.textContent = "Manual Calculation";
      document.body.appendChild(tt);
    }
    const rect = triggerEl.getBoundingClientRect();
    const tooltipWidth = 125;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    let top = rect.bottom + 6;
    if (top + 30 > window.innerHeight && rect.top > 30) {
      top = rect.top - 28;
    }
    tt.style.left = `${Math.round(left)}px`;
    tt.style.top = `${Math.round(top)}px`;
    tt.classList.add("sp-tooltip-visible");
  }

  function hideCalcTooltip() {
    const tt = document.getElementById("sp-calc-global-tooltip");
    if (tt) {
      tt.classList.remove("sp-tooltip-visible");
    }
  }

  /**
   * Injects the Margin column and wraps Code, Description, Max, Attended, Absent in minimal colored boxes.
   */
  function enhanceAttendanceTable() {
    const table = findAttendanceTable();
    if (!table) return;

    // Strictly scope styling classes
    table.classList.add("sp-attendance-table");
    const parentCard = table.closest(".card");
    if (parentCard) parentCard.classList.add("sp-attendance-card");

    const theadRow =
      table.querySelector("thead > tr") ||
      table.querySelector("tr:first-child");
    const tbodyRows = table.querySelectorAll("tbody tr");
    if (!theadRow || tbodyRows.length === 0) return;

    const cols = getColumnIndices(theadRow);

    // Inject Margin header with 65% (left) and 75% (right) threshold buttons, (i) info icon, and calculator button
    let headCell = theadRow.querySelector(".sp-attendance-header");
    if (!headCell) {
      headCell = document.createElement("th");
      headCell.className = "sp-attendance-header";
      theadRow.appendChild(headCell);
    }

    if (!headCell.querySelector(".sp-threshold-toggle")) {
      headCell.innerHTML = `
        <div class="sp-margin-header-wrap">
          <div class="sp-margin-header-top">
            <span class="sp-margin-header-title">Margin</span>
            <div class="sp-margin-info-trigger" id="spMarginInfoTrigger" tabindex="0" role="button" aria-label="Attendance threshold rules" title="Attendance threshold rules">
              <svg class="sp-info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <button type="button" class="sp-calc-icon-btn" id="spOpenCalcBtn" aria-label="Manual Calculation">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="16" y1="14" x2="16" y2="18"></line>
                <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"></path>
              </svg>
            </button>
          </div>
          <div class="sp-threshold-toggle">
            <button type="button" class="sp-threshold-btn sp-btn-65 ${currentThreshold === 65 ? "sp-active" : ""}" data-threshold="65">65%</button>
            <button type="button" class="sp-threshold-btn sp-btn-75 ${currentThreshold === 75 ? "sp-active" : ""}" data-threshold="75">75%</button>
          </div>
        </div>
      `;

      const infoTrigger = headCell.querySelector("#spMarginInfoTrigger");
      if (infoTrigger) {
        infoTrigger.addEventListener("mouseenter", () =>
          showInfoTooltip(infoTrigger),
        );
        infoTrigger.addEventListener("mouseleave", hideInfoTooltip);
        infoTrigger.addEventListener("focus", () =>
          showInfoTooltip(infoTrigger),
        );
        infoTrigger.addEventListener("blur", hideInfoTooltip);
      }

      const calcBtn = headCell.querySelector("#spOpenCalcBtn");
      if (calcBtn) {
        calcBtn.addEventListener("mouseenter", () => showCalcTooltip(calcBtn));
        calcBtn.addEventListener("mouseleave", hideCalcTooltip);
        calcBtn.addEventListener("focus", () => showCalcTooltip(calcBtn));
        calcBtn.addEventListener("blur", hideCalcTooltip);
        calcBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          hideCalcTooltip();
          openAttendanceCalculator(40, 32, 8, 75);
        });
      }

      const toggleWrap = headCell.querySelector(".sp-threshold-toggle");
      if (toggleWrap) {
        toggleWrap.addEventListener("click", (e) => {
          const btn = e.target.closest(".sp-threshold-btn");
          if (!btn) return;
          e.preventDefault();
          e.stopPropagation();

          const newThresh = parseInt(btn.dataset.threshold, 10);
          if (newThresh && (newThresh === 65 || newThresh === 75)) {
            currentThreshold = newThresh;
            table._lastRenderedThreshold = null;
            enhanceAttendanceTable();
          }
        });
      }
    } else {
      const btn65 = headCell.querySelector(".sp-btn-65");
      const btn75 = headCell.querySelector(".sp-btn-75");
      if (btn65) btn65.classList.toggle("sp-active", currentThreshold === 65);
      if (btn75) btn75.classList.toggle("sp-active", currentThreshold === 75);
    }

    table.classList.toggle("sp-table-thresh-65", currentThreshold === 65);

    const currentRenderKey = `${currentThreshold}_${tbodyRows.length}`;
    if (table._spRenderKey === currentRenderKey && !table._spForceUpdate) {
      return;
    }
    table._spRenderKey = currentRenderKey;
    table._spForceUpdate = false;

    let subjectIndex = 0;
    let sumConducted = 0;
    let sumAttended = 0;
    let sumAbsent = 0;

    // Process each body row
    for (let i = 0; i < tbodyRows.length; i++) {
      const row = tbodyRows[i];
      let marginCell = row.querySelector(".sp-margin-cell");

      if (!marginCell) {
        marginCell = document.createElement("td");
        marginCell.className = "sp-margin-box sp-margin-cell";
        row.appendChild(marginCell);
      }

      marginCell.classList.toggle("sp-margin-cell-65", currentThreshold === 65);

      const cell0 = row.cells[0];
      const cell1 = row.cells[1];
      const cell0Text = (cell0?.innerText || cell0?.textContent || "").trim().toLowerCase();
      const cell1Text = (cell1?.innerText || cell1?.textContent || "").trim().toLowerCase();
      const hasCodeBadge = !!cell0?.querySelector?.(".sp-code-badge");
      const isCourseCode = /^[A-Z0-9\-_]{5,15}$/i.test(cell0Text.split(/[\s\-–—:]/)[0]);

      const isTotalRow =
        !hasCodeBadge &&
        !isCourseCode &&
        (cell0Text === "total" ||
          cell0Text.startsWith("total") ||
          cell1Text === "total" ||
          cell1Text.startsWith("total") ||
          (i === tbodyRows.length - 1 &&
            tbodyRows.length > 3 &&
            isNaN(parseInt(cell0Text, 10))));

      row.classList.toggle("sp-total-row", isTotalRow);

      const { conducted, attended, absent } = extractRowNumbers(row, cols);

      if (!isTotalRow && !isNaN(conducted) && conducted > 0) {
        sumConducted += conducted;
        sumAttended += !isNaN(attended) ? attended : 0;
        sumAbsent += !isNaN(absent) ? absent : 0;
      }

      let effConducted = conducted;
      let effAttended = attended;
      let effAbsent = absent;
      if (isTotalRow && (isNaN(effConducted) || effConducted <= 0) && sumConducted > 0) {
        effConducted = sumConducted;
        effAttended = sumAttended;
        effAbsent = sumAbsent;
      }

      // Preserve Course Identity (Code + Description) strictly in its original natural portal style
      if (row.cells[0]) {
        if (row.cells[0].style.borderLeft) {
          row.cells[0].style.borderLeft = "";
        }
        if (row.cells[0].classList.contains("sp-course-cell")) {
          row.cells[0].classList.remove("sp-course-cell");
        }
      }

      if (isNaN(effConducted) || effConducted < 0) {
        marginCell.textContent = "-";
        continue;
      }

      // Format Max Hours in Minimal Slate Box
      if (cols.maxHours >= 0 && row.cells[cols.maxHours] && !isNaN(effConducted)) {
        row.cells[cols.maxHours].innerHTML =
          `<span class="sp-metric-badge sp-metric-conducted">${effConducted}</span>`;
      }

      // Format Attended Hours in Minimal Soft Green Box
      if (cols.attHours >= 0 && row.cells[cols.attHours] && !isNaN(effAttended)) {
        row.cells[cols.attHours].innerHTML =
          `<span class="sp-metric-badge sp-metric-attended">${effAttended}</span>`;
      }

      // Format Absent Hours in Minimal Soft Red/Slate Box
      if (
        cols.absentHours >= 0 &&
        row.cells[cols.absentHours] &&
        !isNaN(effAbsent)
      ) {
        const absClass =
          effAbsent > 0 ? "sp-metric-absent" : "sp-metric-absent-zero";
        row.cells[cols.absentHours].innerHTML =
          `<span class="sp-metric-badge ${absClass}">${effAbsent}</span>`;
      }

      const margin = computeAttendanceMargin(
        effConducted,
        effAttended,
        effAbsent,
        currentThreshold,
      );

      // Color-code Total Percentage column same as Margin based on currentThreshold
      if (cols.totalPct >= 0 && row.cells[cols.totalPct]) {
        const pctCell = row.cells[cols.totalPct];
        const pctVal =
          effConducted > 0 ? ((effAttended / effConducted) * 100).toFixed(1) : "0.0";
        const pctNum = parseFloat(pctVal);

        let pctClass = "sp-margin-pos";
        if (pctNum < currentThreshold) {
          pctClass = "sp-margin-neg";
        } else if (pctNum === currentThreshold) {
          pctClass = "sp-margin-zero";
        }

        pctCell.innerHTML = `<span class="sp-margin-badge ${pctClass}">${pctVal}%</span>`;
      }

      if (margin === null) {
        marginCell.textContent = "-";
        continue;
      }

      if (margin < 0) {
        // Red color for required (less than threshold)
        marginCell.innerHTML = `<span class="sp-margin-badge sp-margin-neg">-${Math.abs(margin)}</span>`;
      } else if (margin === 0) {
        // Yellow color for 0 margin (exactly threshold)
        marginCell.innerHTML = `<span class="sp-margin-badge sp-margin-zero">0</span>`;
      } else {
        // Green color for more than 0 margin (above threshold)
        marginCell.innerHTML = `<span class="sp-margin-badge sp-margin-pos">+${margin}</span>`;
      }

      marginCell.onclick = (e) => {
        e.stopPropagation();
        openAttendanceCalculator(effConducted, effAttended, effAbsent, currentThreshold);
      };
      marginCell.style.cursor = "pointer";
    }
  }

  /**
   * Initializes or returns the Custom Attendance Calculator modal.
   */
  function createOrGetCalculatorModal() {
    let overlay = document.getElementById("sp-attendance-calc-modal");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "sp-attendance-calc-modal";
    overlay.className = "sp-calc-overlay";

    overlay.innerHTML = `
      <div class="sp-calc-card" role="dialog" aria-modal="true" aria-labelledby="spCalcHeading">
        <div class="sp-calc-header">
          <h3 class="sp-calc-title" id="spCalcHeading">
            <span class="sp-calc-title-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="3"></rect>
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="16" y1="14" x2="16" y2="18"></line>
                <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"></path>
              </svg>
            </span>
            <span>Manual Attendance Calculator</span>
          </h3>
          <button type="button" class="sp-calc-close-btn" id="spCalcCloseBtn" aria-label="Close modal">&times;</button>
        </div>

        <div class="sp-calc-form-grid">
          <!-- Conducted Box (Blue) -->
          <div class="sp-calc-metric-card sp-card-conducted" style="grid-column: span 2;">
            <div class="sp-card-head">
              <span class="sp-card-label">Total Conducted</span>
              <span class="sp-card-badge sp-badge-blue" id="spCalcTotalBadge">40 Hrs Total</span>
            </div>
            <div class="sp-card-input-wrap">
              <input type="number" id="spCalcConducted" class="sp-calc-input sp-input-blue" placeholder="e.g. 40" min="0" value="40">
              <span class="sp-card-unit">Hours</span>
            </div>
          </div>

          <!-- Attended / Present Box (Green) -->
          <div class="sp-calc-metric-card sp-card-attended">
            <div class="sp-card-head">
              <span class="sp-card-label">Attended</span>
              <span class="sp-card-badge sp-badge-green" id="spCalcAttendedBadge">80.0%</span>
            </div>
            <div class="sp-card-input-wrap">
              <input type="number" id="spCalcAttended" class="sp-calc-input sp-input-green" placeholder="e.g. 32" min="0" value="32">
              <span class="sp-card-unit">Hours</span>
            </div>
          </div>

          <!-- Absent Box (Red) -->
          <div class="sp-calc-metric-card sp-card-absent">
            <div class="sp-card-head">
              <span class="sp-card-label">Absent</span>
              <span class="sp-card-badge sp-badge-red" id="spCalcAbsentBadge">20.0%</span>
            </div>
            <div class="sp-card-input-wrap">
              <input type="number" id="spCalcAbsent" class="sp-calc-input sp-input-red" placeholder="e.g. 8" min="0" value="8">
              <span class="sp-card-unit">Hours</span>
            </div>
          </div>
        </div>

        <div class="sp-calc-thresh-row">
          <label class="sp-calc-section-label">Target Threshold:</label>
          <div class="sp-calc-thresh-btns">
            <button type="button" class="sp-calc-thresh-opt sp-thresh-opt-65" data-val="65">
              <span class="sp-thresh-val">65%</span>
              <span class="sp-thresh-sub">Medical/OD</span>
            </button>
            <button type="button" class="sp-calc-thresh-opt sp-thresh-opt-75 sp-calc-thresh-active" data-val="75">
              <span class="sp-thresh-val">75%</span>
              <span class="sp-thresh-sub">Standard</span>
            </button>
          </div>
        </div>

        <div class="sp-calc-result-box">
          <div class="sp-calc-metric-row">
            <div>
              <span class="sp-calc-metric-title">Simulated Attendance:</span>
              <div class="sp-calc-metric-sub" id="spCalcSubText">32 / 40 Hours Attended</div>
            </div>
            <span class="sp-calc-pct-badge sp-margin-pos" id="spCalcPctBadge">80.0%</span>
          </div>
          <div class="sp-calc-margin-verdict sp-calc-verdict-safe" id="spCalcVerdict">
            You can safely bunk <strong>2 more classes</strong> and maintain &ge; 75%.
          </div>
        </div>

        <!-- Custom Simulation Section -->
        <div class="sp-calc-custom-section">
          <div class="sp-custom-header-row">
            <span class="sp-custom-heading">Simulate Next Classes:</span>
            <div class="sp-stepper-control">
              <button type="button" class="sp-step-btn" id="spStepDec" aria-label="Decrease hours">&minus;</button>
              <input type="number" id="spCustomStepInput" class="sp-step-input" value="1" min="1" max="100">
              <span class="sp-step-unit">hr(s)</span>
              <button type="button" class="sp-step-btn" id="spStepInc" aria-label="Increase hours">&plus;</button>
            </div>
          </div>

          <div class="sp-calc-scenarios">
            <!-- Attend Next Box (Green Box) -->
            <div class="sp-calc-scen-card sp-scen-attend">
              <div class="sp-scen-card-head">
                <span class="sp-scen-badge sp-badge-green" id="spAttendBadge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  <span id="spAttendCardLabel">If Attend (+1 hr)</span>
                </span>
              </div>
              <div class="sp-scen-card-body">
                <span class="sp-scen-primary-pct" id="spCalcScenAttendPct">&uarr; 80.5%</span>
                <span class="sp-scen-sub" id="spCalcScenAttendSub">33 / 41 hrs</span>
              </div>
            </div>

            <!-- Miss Next Box (Red Box) -->
            <div class="sp-calc-scen-card sp-scen-miss">
              <div class="sp-scen-card-head">
                <span class="sp-scen-badge sp-badge-red" id="spMissBadge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  <span id="spMissCardLabel">If Miss (+1 hr)</span>
                </span>
              </div>
              <div class="sp-scen-card-body">
                <span class="sp-scen-primary-pct" id="spCalcScenMissPct">&darr; 78.0%</span>
                <span class="sp-scen-sub" id="spCalcScenMissSub">32 / 41 hrs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let modalThresh = 75;

    const inpConducted = overlay.querySelector("#spCalcConducted");
    const inpAttended = overlay.querySelector("#spCalcAttended");
    const inpAbsent = overlay.querySelector("#spCalcAbsent");
    const totalBadge = overlay.querySelector("#spCalcTotalBadge");
    const attendedBadge = overlay.querySelector("#spCalcAttendedBadge");
    const absentBadge = overlay.querySelector("#spCalcAbsentBadge");
    const pctBadge = overlay.querySelector("#spCalcPctBadge");
    const subText = overlay.querySelector("#spCalcSubText");
    const verdictBox = overlay.querySelector("#spCalcVerdict");
    const attendCardLabel = overlay.querySelector("#spAttendCardLabel");
    const missCardLabel = overlay.querySelector("#spMissCardLabel");
    const scenAttendPct = overlay.querySelector("#spCalcScenAttendPct");
    const scenAttendSub = overlay.querySelector("#spCalcScenAttendSub");
    const scenMissPct = overlay.querySelector("#spCalcScenMissPct");
    const scenMissSub = overlay.querySelector("#spCalcScenMissSub");
    const customStepInput = overlay.querySelector("#spCustomStepInput");
    const stepDec = overlay.querySelector("#spStepDec");
    const stepInc = overlay.querySelector("#spStepInc");
    const closeBtn = overlay.querySelector("#spCalcCloseBtn");
    const threshBtns = overlay.querySelectorAll(".sp-calc-thresh-opt");

    function updateCalculations() {
      const cond = Math.max(0, parseInt(inpConducted.value, 10) || 0);
      let att = Math.max(0, parseInt(inpAttended.value, 10) || 0);
      let abs = Math.max(0, parseInt(inpAbsent.value, 10) || 0);

      if (cond > 0 && att > cond) {
        att = cond;
        inpAttended.value = att;
      }
      if (cond > 0 && abs > cond) {
        abs = cond;
        inpAbsent.value = abs;
      }

      const currPct = cond > 0 ? (att / cond) * 100 : 0;
      const absPct = cond > 0 ? (abs / cond) * 100 : 0;

      if (totalBadge) totalBadge.textContent = `${cond} Hrs Total`;
      if (attendedBadge) attendedBadge.textContent = `${currPct.toFixed(1)}%`;
      if (absentBadge) absentBadge.textContent = `${absPct.toFixed(1)}%`;

      if (subText) {
        subText.textContent = `${att} / ${cond} Hours Attended`;
      }

      pctBadge.textContent = `${currPct.toFixed(1)}%`;

      pctBadge.className = "sp-calc-pct-badge";
      if (currPct < modalThresh) {
        pctBadge.classList.add("sp-margin-neg");
      } else if (Math.round(currPct * 10) === Math.round(modalThresh * 10)) {
        pctBadge.classList.add("sp-margin-zero");
      } else {
        pctBadge.classList.add("sp-margin-pos");
      }

      const margin = computeAttendanceMargin(cond, att, abs, modalThresh);

      verdictBox.className = "sp-calc-margin-verdict";
      if (margin === null || cond === 0) {
        verdictBox.innerHTML = `Enter valid conducted hours to simulate attendance margin.`;
        verdictBox.classList.add("sp-calc-verdict-zero");
      } else if (margin > 0) {
        verdictBox.innerHTML = `You can safely bunk <strong>${margin} class${margin > 1 ? "es" : ""}</strong> and stay &ge; ${modalThresh}%.`;
        verdictBox.classList.add("sp-calc-verdict-safe");
      } else if (margin === 0) {
        verdictBox.innerHTML = `You are on the exact <strong>${modalThresh}% border</strong>. Any bunk will drop you below limit.`;
        verdictBox.classList.add("sp-calc-verdict-zero");
      } else {
        const needed = Math.abs(margin);
        verdictBox.innerHTML = `You are short by <strong>${(modalThresh - currPct).toFixed(1)}%</strong>. You must attend the next <strong>${needed} class${needed > 1 ? "es" : ""}</strong>.`;
        verdictBox.classList.add("sp-calc-verdict-short");
      }

      const customN = Math.max(1, parseInt(customStepInput?.value, 10) || 1);
      const unitStr = customN === 1 ? "hr" : "hrs";

      if (attendCardLabel) attendCardLabel.textContent = `If Attend (+${customN} ${unitStr})`;
      if (missCardLabel) missCardLabel.textContent = `If Miss (+${customN} ${unitStr})`;

      if (cond > 0) {
        const nextAttPct = ((att + customN) / (cond + customN)) * 100;
        const nextMissPct = (att / (cond + customN)) * 100;

        if (scenAttendPct) scenAttendPct.innerHTML = `&uarr; ${nextAttPct.toFixed(1)}%`;
        if (scenAttendSub) scenAttendSub.textContent = `${att + customN} / ${cond + customN} hrs`;

        if (scenMissPct) scenMissPct.innerHTML = `&darr; ${nextMissPct.toFixed(1)}%`;
        if (scenMissSub) scenMissSub.textContent = `${att} / ${cond + customN} hrs`;
      } else {
        if (scenAttendPct) scenAttendPct.textContent = "-";
        if (scenAttendSub) scenAttendSub.textContent = "-";
        if (scenMissPct) scenMissPct.textContent = "-";
        if (scenMissSub) scenMissSub.textContent = "-";
      }
    }

    if (stepDec) {
      stepDec.addEventListener("click", () => {
        let val = Math.max(1, parseInt(customStepInput.value, 10) || 1);
        if (val > 1) {
          customStepInput.value = val - 1;
          updateCalculations();
        }
      });
    }

    if (stepInc) {
      stepInc.addEventListener("click", () => {
        let val = Math.max(1, parseInt(customStepInput.value, 10) || 1);
        customStepInput.value = val + 1;
        updateCalculations();
      });
    }

    if (customStepInput) {
      customStepInput.addEventListener("input", () => {
        updateCalculations();
      });
    }

    inpConducted.addEventListener("input", () => {
      const cond = Math.max(0, parseInt(inpConducted.value, 10) || 0);
      const abs = Math.max(0, parseInt(inpAbsent.value, 10) || 0);
      inpAttended.value = Math.max(0, cond - abs);
      updateCalculations();
    });

    inpAttended.addEventListener("input", () => {
      const cond = Math.max(0, parseInt(inpConducted.value, 10) || 0);
      const att = Math.max(0, parseInt(inpAttended.value, 10) || 0);
      inpAbsent.value = Math.max(0, cond - att);
      updateCalculations();
    });

    inpAbsent.addEventListener("input", () => {
      const cond = Math.max(0, parseInt(inpConducted.value, 10) || 0);
      const abs = Math.max(0, parseInt(inpAbsent.value, 10) || 0);
      inpAttended.value = Math.max(0, cond - abs);
      updateCalculations();
    });

    threshBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        threshBtns.forEach((b) => b.classList.remove("sp-calc-thresh-active"));
        btn.classList.add("sp-calc-thresh-active");
        modalThresh = parseInt(btn.dataset.val, 10) || 75;
        updateCalculations();
      });
    });

    const closeModal = () => {
      overlay.classList.remove("sp-modal-open");
    };

    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("sp-modal-open")) {
        closeModal();
      }
    });

    overlay._updateCalculations = updateCalculations;
    overlay._setValues = (cond, att, abs, thresh) => {
      inpConducted.value = cond || 40;
      inpAttended.value = att !== undefined ? att : 32;
      inpAbsent.value = abs !== undefined ? abs : 8;
      modalThresh = thresh || 75;
      threshBtns.forEach((b) => {
        b.classList.toggle(
          "sp-calc-thresh-active",
          parseInt(b.dataset.val, 10) === modalThresh,
        );
      });
      updateCalculations();
    };

    return overlay;
  }

  function openAttendanceCalculator(cond, att, abs, thresh = 75) {
    const modal = createOrGetCalculatorModal();
    if (modal && modal._setValues) {
      modal._setValues(cond, att, abs, thresh || 75);
    }
    if (modal) {
      modal.classList.add("sp-modal-open");
    }
  }

  /**
   * Main lifecycle handler with debounced execution and mutation observer.
   */
  function initStudentPortal() {
    const run = () => {
      try {
        enhanceAttendanceTable();
      } catch (err) {
        console.warn("[Student Portal] Attendance Error:", err);
      }
    };

    run();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    }
    window.addEventListener("load", run);

    let timer = null;
    const observer = new MutationObserver((mutations) => {
      let isRelevant = false;
      for (const m of mutations) {
        if (
          m.target &&
          (m.target.id === "sp-margin-global-tooltip" ||
            m.target.id === "sp-attendance-calc-modal" ||
            (m.target.classList &&
              (m.target.classList.contains("sp-margin-global-tooltip") ||
                m.target.classList.contains("sp-calc-overlay"))))
        ) {
          continue;
        }
        isRelevant = true;
        break;
      }
      if (!isRelevant) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 120);
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Public interface to enforce or set attendance threshold programmatically.
   * Forces full re-calculation of the table with the specified threshold (e.g. 75%).
   */
  window.spSetAttendanceThreshold = function (threshold) {
    if (threshold === 65 || threshold === 75) {
      currentThreshold = threshold;
      const table = findAttendanceTable();
      if (table) {
        table._spRenderKey = null;
        table._lastRenderedThreshold = null;
        table._spForceUpdate = true;
      }
      enhanceAttendanceTable();
    }
  };

  window.addEventListener("sp-enforce-75-threshold", () => {
    if (typeof window.spSetAttendanceThreshold === "function") {
      window.spSetAttendanceThreshold(75);
    }
  });

  initStudentPortal();
})();
