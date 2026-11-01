/**
 * ============================================================
 * FILE: cgpa_sgpa.js (Student Portal CGPA & SGPA Engine)
 * ============================================================
 * Implements the exact Academia Prime GPA & CGPA Calculator
 * with live updating scores, estimated grade integration,
 * internal marks details data sync, and modern interactive UI as a
 * dedicated section on the Internal Mark Details page.
 * ============================================================
 */
(() => {
  "use strict";

  // Prevent multiple initializations in the same frame
  if (window.__SP_CGPA_ENGINE_INITIALIZED__) return;
  window.__SP_CGPA_ENGINE_INITIALIZED__ = true;

  // ── Grade Points Configuration (SRM Scale) ──
  const GRADE_PTS = {
    O: 10,
    "A+": 9,
    A: 8,
    "B+": 7,
    B: 6,
    C: 5.5,
    W: 0,
    F: 0,
    Ab: 0,
    I: 0,
    "*": 0,
  };

  const GRADE_OPTIONS = [
    "O",
    "A+",
    "A",
    "B+",
    "B",
    "C",
    "W",
    "F",
    "Ab",
    "I",
    "*",
  ];

  // ── Matrix Grade Dropdown Configuration (4x3 Grid) ──
  const MATRIX_GRADES = [
    { grade: "O", pts: 10, bg: "#dcfce7", color: "#15803d", border: "#86efac" },
    { grade: "A+", pts: 9, bg: "#e8ecf5", color: "#132450", border: "#bfdbfe" },
    { grade: "A", pts: 8, bg: "#e0f2fe", color: "#0d1938", border: "#b8c2d9" },
    { grade: "B+", pts: 7, bg: "#ffedd5", color: "#9a7200", border: "#fed7aa" },
    { grade: "B", pts: 6, bg: "#fff4c2", color: "#9a7200", border: "#F4C542" },
    { grade: "C", pts: 5.5, bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
    { grade: "F", pts: 0, bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
    { grade: "Ab", pts: 0, bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
    { grade: "W", pts: 0, bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
    { grade: "I", pts: 0, bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
    { grade: "*", pts: 0, bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
    { grade: "", pts: null, label: "Clear", bg: "#fff1f2", color: "#e11d48", border: "#fecdd3" },
  ];

  function getTriggerClass(grade) {
    if (!grade) return "cgpa-trig-empty";
    if (grade === "O") return "cgpa-trig-O";
    if (grade === "A+") return "cgpa-trig-Ap";
    if (grade === "A") return "cgpa-trig-A";
    if (grade === "B+") return "cgpa-trig-Bp";
    if (grade === "B") return "cgpa-trig-B";
    if (grade === "C") return "cgpa-trig-C";
    if (grade === "F") return "cgpa-trig-F";
    return "cgpa-trig-other";
  }

  function formatGradeLabel(grade) {
    if (!grade) return "— Grade —";
    if (GRADE_PTS[grade] !== undefined) {
      return `${grade} (${GRADE_PTS[grade]})`;
    }
    return grade;
  }

  /**
   * Checks if current context is Attendance page (Strict Exclusion)
   */
  function isAttendancePage(tbl) {
    if (tbl) {
      const text = (tbl.innerText || tbl.textContent || "").toLowerCase();
      if (
        text.includes("max. hours") ||
        text.includes("hours conducted") ||
        text.includes("att. hours") ||
        text.includes("absent hours") ||
        text.includes("total percentage")
      ) {
        return true;
      }
    }

    const hash = (window.location.hash || "").toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash.includes("attendance") || path.includes("attendance")) return true;

    const activeMenus = document.querySelectorAll(
      ".sp-menu-item.active, .sp-menu-item-active, .active, li.active, a.active",
    );
    for (const m of activeMenus) {
      const text = (m.innerText || m.textContent || "").toLowerCase();
      if (text.includes("attendance")) return true;
    }

    const heading = document.querySelector("h1, h2, h3, h4, h5, .page-header, .title");
    if (heading) {
      const hText = (heading.innerText || heading.textContent || "").toLowerCase();
      if (hText.includes("course wise attendance") || hText.includes("attendance details")) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if current context is SRM Policy (Strict Exclusion)
   */
  function isSrmPolicyPage(tbl) {
    if (tbl) {
      const text = (tbl.innerText || tbl.textContent || "").toLowerCase();
      if (text.includes("srm policy") || text.includes("academic policy")) return true;
    }

    const hash = (window.location.hash || "").toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash.includes("policy") || path.includes("policy")) return true;

    const activeMenus = document.querySelectorAll(
      ".sp-menu-item.active, .sp-menu-item-active, .active, li.active, a.active",
    );
    for (const m of activeMenus) {
      const text = (m.innerText || m.textContent || "").toLowerCase();
      if (text.includes("policy") || text.includes("regulation")) return true;
    }
    return false;
  }

  /**
   * Checks if current context is Grade / Mark Obtained (Strict Exclusion)
   */
  function isGradeMarkObtainedPage(tbl) {
    if (tbl) {
      const text = (tbl.innerText || tbl.textContent || "").toLowerCase();
      if (
        text.includes("grade / mark obtained") ||
        text.includes("letter grade") ||
        text.includes("grade point")
      ) {
        return true;
      }
    }

    const hash = (window.location.hash || "").toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (
      hash.includes("grade") ||
      hash.includes("obtained") ||
      path.includes("grade") ||
      path.includes("obtained")
    ) {
      return true;
    }

    const activeMenus = document.querySelectorAll(
      ".sp-menu-item.active, .sp-menu-item-active, .active, li.active, a.active",
    );
    for (const m of activeMenus) {
      const text = (m.innerText || m.textContent || "").toLowerCase();
      if (
        (text.includes("grade") && text.includes("obtained")) ||
        text.includes("mark obtained")
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Finds the primary Internal Marks table on the page
   */
  function findInternalMarksTable() {
    // 1. Direct class set by sp_internals.js
    const styledTable = document.querySelector(".sp-internals-table");
    if (
      styledTable &&
      !isAttendancePage(styledTable) &&
      !isSrmPolicyPage(styledTable) &&
      !isGradeMarkObtainedPage(styledTable)
    ) {
      return styledTable;
    }

    // 2. Search tables in #divMainDetails or page
    const candidates = document.querySelectorAll("#divMainDetails table, table");
    for (const tbl of candidates) {
      if (
        tbl.closest(
          ".modal, .modal-dialog, .modal-content, [id*='modal' i], #cgpa-calc-section-v31, #overall-cgpa-section-v31",
        )
      ) {
        continue;
      }
      if (
        isAttendancePage(tbl) ||
        isSrmPolicyPage(tbl) ||
        isGradeMarkObtainedPage(tbl)
      ) {
        continue;
      }

      const rows = tbl.querySelectorAll("tr");
      if (rows.length < 2) continue;

      const firstRow = tbl.querySelector("thead tr") || rows[0];
      const headText = (
        firstRow ? firstRow.innerText || firstRow.textContent || "" : ""
      ).toLowerCase();
      const fullText = (tbl.innerText || tbl.textContent || "").toLowerCase();

      const hasCourse =
        headText.includes("code") ||
        headText.includes("course") ||
        headText.includes("subject") ||
        headText.includes("description") ||
        headText.includes("title");
      const hasMarks =
        headText.includes("mark") ||
        headText.includes("max") ||
        headText.includes("internal") ||
        fullText.includes("view details") ||
        fullText.includes("view detail");

      if (hasCourse && hasMarks) {
        return tbl;
      }
    }
    return null;
  }

  /**
   * Verifies if current context is strictly Internal Mark Details
   */
  function isInternalMarksPage() {
    if (isAttendancePage() || isSrmPolicyPage() || isGradeMarkObtainedPage()) {
      return false;
    }

    // Direct match: an internal marks table is already found
    if (findInternalMarksTable()) {
      return true;
    }

    const hash = (window.location.hash || "").toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (
      hash.includes("internal") ||
      hash.includes("mark") ||
      path.includes("internal") ||
      path.includes("mark")
    ) {
      return true;
    }

    const activeMenus = document.querySelectorAll(
      "li.active, a.active, .nav-item.active, .menu-item.active, .active > a, .sp-menu-item.active",
    );
    for (const m of activeMenus) {
      const text = (m.innerText || m.textContent || "").toLowerCase();
      if (
        text.includes("internal mark") ||
        text.includes("internal marks") ||
        text.includes("internals")
      ) {
        return true;
      }
    }

    const headings = document.querySelectorAll(
      "#divMainDetails h1, #divMainDetails h2, #divMainDetails h3, #divMainDetails h4, #divMainDetails h5, #divMainDetails .page-header, #divMainDetails .title, #divMainDetails .card-title, #divMainDetails .panel-title, .breadcrumb, h1, h2, h3, h4, h5, .page-header, .title",
    );
    for (const h of headings) {
      const text = (h.innerText || h.textContent || "").toLowerCase();
      if (text.includes("internal mark") || text.includes("internal marks")) {
        return true;
      }
    }

    const bodySnippet = (document.body ? document.body.innerText : "")
      .slice(0, 1500)
      .toLowerCase();
    if (
      bodySnippet.includes("internal mark details") ||
      bodySnippet.includes("internal mark")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Injects the Academia Prime CSS for the GPA and CGPA calculators
   */
  function injectCgpaStyles() {
    if (document.getElementById("cgpa-calc-styles-v31")) return;

    const s = document.createElement("style");
    s.id = "cgpa-calc-styles-v31";
    s.innerHTML = `
      #cgpa-calc-section-v31 {
        animation: cgpaFadeIn 0.35s ease both;
        margin-top: 24px;
        margin-bottom: 20px;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      @keyframes cgpaFadeIn {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Row delete button */
      .cgpa-row .cgpa-del {
        opacity: 0;
        transition: opacity .15s, transform .15s;
      }
      .cgpa-row:hover .cgpa-del {
        opacity: 1 !important;
      }

      /* Hide number spinners */
      .cgpa-cred::-webkit-inner-spin-button,
      .cgpa-cred::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      /* Input focus states */
      .cgpa-subj:focus, .cgpa-cred:focus {
        outline: none;
        border-color: #253b70 !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
      }

      /* Modernized Grade Dropdown Styles */
      .cgpa-opt {
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
        padding-right: 24px !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .cgpa-opt:hover {
        border-color: #818cf8 !important;
        background-color: #f5f7ff !important;
      }
      .cgpa-opt:focus {
        outline: none;
        border-color: #132450 !important;
        background-color: #ffffff !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
      }

      /* Matrix Grade Selector & Dropdown UI */
      .cgpa-row {
        position: relative;
      }
      .cgpa-row.popover-active {
        position: relative !important;
        z-index: 999999 !important;
      }
      .cgpa-row.popover-active td {
        position: relative !important;
        z-index: 999999 !important;
      }
      .cgpa-matrix-wrap {
        position: relative;
        display: inline-block;
        width: 100%;
      }
      .cgpa-matrix-wrap.open {
        position: relative !important;
        z-index: 999999 !important;
      }
      .cgpa-matrix-trigger {
        width: 100%;
        border-radius: 10px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.15s ease;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        box-sizing: border-box;
      }
      .cgpa-matrix-trigger:hover {
        filter: brightness(0.97);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.06);
      }
      .cgpa-matrix-arrow {
        transition: transform 0.2s ease;
        flex-shrink: 0;
      }
      .cgpa-matrix-wrap.open .cgpa-matrix-arrow {
        transform: rotate(180deg);
      }
      .cgpa-matrix-popover {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        left: auto;
        transform: translateY(4px);
        width: 236px;
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 12px;
        box-shadow: 0 20px 42px -4px rgba(15, 23, 42, 0.35), 0 8px 20px rgba(0, 0, 0, 0.12);
        z-index: 999999 !important;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
        pointer-events: none;
      }
      .cgpa-matrix-wrap.open .cgpa-matrix-popover {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
        pointer-events: auto;
      }
      .cgpa-matrix-wrap.popover-above .cgpa-matrix-popover {
        top: auto;
        bottom: calc(100% + 6px);
        transform: translateY(-4px);
      }
      .cgpa-matrix-wrap.open.popover-above .cgpa-matrix-popover {
        transform: translateY(0);
      }
      .cgpa-matrix-popover-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 10px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        border-radius: 10px 10px 0 0;
        font-size: 9.5px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #475569;
      }
      .cgpa-matrix-close {
        background: transparent;
        border: none;
        font-size: 15px;
        color: #94a3b8;
        cursor: pointer;
        padding: 0 2px;
        line-height: 1;
        font-weight: 700;
      }
      .cgpa-matrix-close:hover {
        color: #0f172a;
      }
      .cgpa-matrix-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 5px;
        padding: 8px;
        background: #ffffff;
        border-radius: 0 0 10px 10px;
      }
      .cgpa-matrix-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.5px;
        padding: 5px 2px;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
        outline: none;
        min-height: 38px;
        border: 1px solid transparent;
      }
      .cgpa-matrix-cell:hover {
        transform: translateY(-1px);
        filter: brightness(0.96);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      }
      .cgpa-matrix-cell.active {
        box-shadow: 0 0 0 2px #132450 !important;
        font-weight: 900 !important;
      }
      .cgpa-m-grade {
        font-size: 11px;
        font-weight: 900;
        line-height: 1;
      }
      .cgpa-m-pts {
        font-size: 8.5px;
        font-weight: 700;
        opacity: 0.8;
        line-height: 1;
      }

      /* Trigger Colors matching Grade */
      .cgpa-trig-empty {
        background: #f8faff !important;
        border: 1.5px solid #e2e8f0 !important;
        color: #94a3b8 !important;
      }
      .cgpa-trig-O {
        background: #dcfce7 !important;
        border: 1.5px solid #86efac !important;
        color: #15803d !important;
      }
      .cgpa-trig-Ap {
        background: #e8ecf5 !important;
        border: 1.5px solid #bfdbfe !important;
        color: #132450 !important;
      }
      .cgpa-trig-A {
        background: #e0f2fe !important;
        border: 1.5px solid #b8c2d9 !important;
        color: #0d1938 !important;
      }
      .cgpa-trig-Bp {
        background: #ffedd5 !important;
        border: 1.5px solid #fed7aa !important;
        color: #9a7200 !important;
      }
      .cgpa-trig-B {
        background: #fff4c2 !important;
        border: 1.5px solid #F4C542 !important;
        color: #9a7200 !important;
      }
      .cgpa-trig-C {
        background: #f1f5f9 !important;
        border: 1.5px solid #cbd5e1 !important;
        color: #475569 !important;
      }
      .cgpa-trig-F {
        background: #fee2e2 !important;
        border: 1.5px solid #fca5a5 !important;
        color: #dc2626 !important;
      }
      .cgpa-trig-other {
        background: #f8fafc !important;
        border: 1.5px solid #e2e8f0 !important;
        color: #64748b !important;
      }

      /* Empty credit highlight pulsing glow */
      .cgpa-cred-glow {
        border-color: #F4C542 !important;
        background: #fffaf0 !important;
        animation: credGlow 1.8s ease-in-out infinite;
      }
      @keyframes credGlow {
        0%, 100% { box-shadow: 0 0 0 1px rgba(245,158,11,.4); }
        50% { box-shadow: 0 0 0 4px rgba(245,158,11,.15); }
      }

      /* Zero-credit / Fully Internal Paper - Green Credit Box */
      .cgpa-cred.cgpa-cred-zero,
      .cgpa-row.is-zero-credit .cgpa-cred {
        background: #dcfce7 !important;
        border: 1.5px solid #86efac !important;
        color: #15803d !important;
        font-weight: 800 !important;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.18) !important;
        transition: all 0.2s ease !important;
      }
      .cgpa-cred.cgpa-cred-zero:focus,
      .cgpa-row.is-zero-credit .cgpa-cred:focus {
        border-color: #10b981 !important;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3) !important;
      }

      /* Live indicator dot animation */
      .live-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        margin-right: 6px;
        animation: livePulse 1.8s ease-in-out infinite;
      }
      @keyframes livePulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.4); opacity: 0.5; }
      }

      /* Score update pulse */
      .cgpa-pulse {
        animation: numPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes numPop {
        0% { transform: scale(0.9); }
        50% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }

      /* Formula Tooltip Styles (Light Frosted Theme) */
      .tooltip-v31 {
        position: relative;
        display: inline-block;
        cursor: pointer;
      }
      .tooltip-v31 .tooltip-bubble {
        visibility: hidden;
        width: 210px;
        background: #f4f3ff !important;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        color: #1e1b4b !important;
        text-align: center;
        border-radius: 14px;
        padding: 10px 14px;
        position: absolute;
        z-index: 999999 !important;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        pointer-events: none;
        border: 1.5px solid #e9e9ff !important;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .tooltip-v31:hover .tooltip-bubble {
        visibility: visible;
        opacity: 1;
        transform: translateX(-50%) translateY(-4px);
      }
      .tooltip-v31 .tooltip-bubble::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -6px;
        border-width: 6px;
        border-style: solid;
        border-color: #f4f3ff transparent transparent transparent;
      }

      .formula-box {
        background: rgba(255, 255, 255, 0.85) !important;
        border: 1px dashed rgba(79, 70, 229, 0.25) !important;
        border-radius: 8px;
        padding: 6px 8px;
        margin-top: 4px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 9.5px;
        color: #132450 !important;
        font-weight: 800;
      }
      .formula-line {
        height: 1.5px;
        background: #132450 !important;
        margin: 4px 0;
      }

      /* ============================================================
         OVERALL CGPA CALCULATOR (Exact 4x2 Matrix & Light Hover Theme)
         ============================================================ */
      #overall-cgpa-section-v31 {
        margin-top: 24px;
        margin-bottom: 24px;
        max-width: 600px;
        animation: cgpaFadeIn 0.35s ease both;
        font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      .compact-container {
        background: #ffffff !important;
        border-radius: 14px;
        border: 1.5px solid #b8c2d9 !important;
        overflow: hidden;
        box-shadow: 0 4px 20px -3px rgba(49, 46, 129, 0.12);
        box-sizing: border-box;
      }
      .compact-header {
        background: #0d1938 !important;
        border-bottom: 1.5px solid #1e1b4b !important;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: #ffffff !important;
        font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      .compact-lbl {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        color: #b8c2d9 !important;
        letter-spacing: 0.06em;
        line-height: 1;
        font-family: inherit;
      }
      #compact-meta {
        color: #b8c2d9 !important;
      }
      .compact-score-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .compact-val-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 78px;
        height: 38px;
        padding: 0 12px;
        border-radius: 12px;
        background: #ffffff;
        border: 1.5px solid #b8c2d9;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .compact-val {
        font-size: 22px;
        font-weight: 900;
        color: #253b70;
        letter-spacing: -0.02em;
        line-height: 1;
        transition: color 0.25s ease;
        font-family: inherit;
      }
      /* Dynamic CGPA Color Tiers (Green >= 8.0, Yellow >= 7.0, Red < 7.0, Neutral = —) */
      .compact-val-pill.tier-green {
        background: #dcfce7 !important;
        border-color: #86efac !important;
        box-shadow: 0 2px 8px rgba(21, 128, 61, 0.15) !important;
      }
      .compact-val-pill.tier-green .compact-val {
        color: #15803d !important;
      }
      .compact-val-pill.tier-yellow {
        background: #fff4c2 !important;
        border-color: #F4C542 !important;
        box-shadow: 0 2px 8px rgba(244, 197, 66, 0.15) !important;
      }
      .compact-val-pill.tier-yellow .compact-val {
        color: #9a7200 !important;
      }
      .compact-val-pill.tier-red {
        background: #fee2e2 !important;
        border-color: #fca5a5 !important;
        box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15) !important;
      }
      .compact-val-pill.tier-red .compact-val {
        color: #dc2626 !important;
      }
      .compact-val-pill.tier-neutral {
        background: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(255, 255, 255, 0.2) !important;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2) !important;
      }
      .compact-val-pill.tier-neutral .compact-val {
        color: #e8ecf5 !important;
      }

      /* Exact 4x2 Matrix Layout (4 equal columns for 8 semesters) */
      .compact-grid {
        padding: 12px;
        display: grid;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 8px;
        background: #ffffff !important;
      }
      @media (max-width: 580px) {
        .compact-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
      }
      /* Semester Badge with Always-Light Hover Theme */
      .badge-sem {
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 10px;
        padding: 5px 6px;
        display: flex;
        align-items: center;
        gap: 6px;
        position: relative;
        transition: all 0.2s ease;
      }
      .badge-sem.badge-green {
        border-color: #86efac !important;
        background: #f0fdf4 !important;
      }
      .badge-sem.badge-yellow {
        border-color: #F4C542 !important;
        background: #fffaf0 !important;
      }
      .badge-sem.badge-red {
        border-color: #fca5a5 !important;
        background: #fef2f2 !important;
      }
      .badge-sem:hover {
        border-color: #cbd5e1 !important;
        background: #ffffff !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
      }
      .badge-sem.badge-green:hover {
        background: #ffffff !important;
        border-color: #4ade80 !important;
        box-shadow: 0 2px 8px rgba(21, 128, 61, 0.08) !important;
      }
      .badge-sem.badge-yellow:hover {
        background: #ffffff !important;
        border-color: #F4C542 !important;
        box-shadow: 0 2px 8px rgba(180, 83, 9, 0.08) !important;
      }
      .badge-sem.badge-red:hover {
        background: #ffffff !important;
        border-color: #f87171 !important;
        box-shadow: 0 2px 8px rgba(220, 38, 38, 0.08) !important;
      }
      .badge-sem:focus-within {
        border-color: #253b70 !important;
        background: #ffffff !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
      }
      .badge-sem .num {
        height: 20px;
        padding: 0 8px;
        background: #e8ecf5 !important;
        color: #132450 !important;
        border-radius: 6px;
        font-size: 9px;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        white-space: nowrap;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .badge-sem:hover .num,
      .badge-sem:focus-within .num {
        background: #e8ecf5 !important;
        color: #0d1938 !important;
      }
      .badge-sem input {
        width: 100%;
        border: none !important;
        background: transparent !important;
        font-size: 13px;
        font-weight: 800;
        color: #1e293b !important;
        text-align: center;
        padding: 2px;
        outline: none;
        font-family: inherit;
      }
      .badge-sem input::-webkit-inner-spin-button,
      .badge-sem input::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .badge-del {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 16px;
        height: 16px;
        background: #ef4444 !important;
        border: none !important;
        border-radius: 50%;
        color: #ffffff !important;
        font-size: 10px;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s, transform 0.15s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        z-index: 5;
      }
      .badge-del:hover {
        background: #dc2626 !important;
        transform: scale(1.1);
      }
      .badge-sem:hover .badge-del {
        opacity: 1 !important;
      }
      .compact-footer {
        padding: 8px 12px;
        background: #f8fafc !important;
        border-top: 1px solid #e2e8f0 !important;
        display: flex;
        gap: 8px;
      }
      .compact-btn {
        flex: 1;
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 10px;
        font-weight: 800;
        color: #64748b !important;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        text-align: center;
      }
      .compact-btn:hover {
        background: #f1f5f9 !important;
        color: #475569 !important;
        border-color: #cbd5e1 !important;
      }
      .btn-add-compact {
        background: #e8ecf5 !important;
        color: #132450 !important;
        border-color: #b8c2d9 !important;
      }
      .btn-add-compact:hover {
        background: #e8ecf5 !important;
        color: #0d1938 !important;
      }
      /* ============================================================
         GRADE DETAILS REFERENCE TABLE (Academia SRMIST Reference)
         ============================================================ */
      #sp-grade-details-section-v31 {
        margin-top: 22px;
        margin-bottom: 26px;
        max-width: 420px;
        width: fit-content;
        animation: cgpaFadeIn 0.35s ease both;
        font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      .sp-grade-table-card {
        border: 1.5px solid #b8c2d9 !important;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 4px 18px -3px rgba(49, 46, 129, 0.1);
        background: #ffffff !important;
        box-sizing: border-box;
        width: 420px;
        max-width: 100%;
      }
      .sp-grade-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }
      .sp-grade-table th {
        border-bottom: 1.5px solid #1e1b4b !important;
        border-right: 1px solid rgba(255, 255, 255, 0.14) !important;
      }
      .sp-grade-table th:last-child {
        border-right: none !important;
      }
      .sp-grade-table td {
        border-bottom: 1px solid #f1f5f9 !important;
        border-right: 1px solid #f1f5f9 !important;
      }
      .sp-grade-table td:last-child {
        border-right: none !important;
      }
      .sp-grade-table tbody tr:last-child td {
        border-bottom: none !important;
      }
      .sp-grade-table tbody tr {
        transition: background-color 0.15s ease;
      }
      .sp-grade-table tbody tr:hover {
        background-color: #f8faff !important;
      }
    `;
    document.head.appendChild(s);
  }

  /**
   * Completely removes GPA and CGPA calculator sections from the page
   */
  function cleanupCgpaSections() {
    const s1 = document.getElementById("cgpa-calc-section-v31");
    if (s1) s1.remove();
    const s2 = document.getElementById("overall-cgpa-section-v31");
    if (s2) s2.remove();
    const s3 = document.getElementById("sp-grade-details-section-v31");
    if (s3) s3.remove();
    const st = document.getElementById("cgpa-calc-styles-v31");
    if (st) st.remove();
  }

  /**
   * Scrapes course and estimated grade data directly from the current Internal Marks table
   */
  function extractInternalMarksCourses(table) {
    const courses = [];
    if (!table) return courses;

    const rows = table.querySelectorAll("tbody tr, tr");
    rows.forEach((row) => {
      if (row.closest("table") !== table) return;
      if (row.querySelector("th")) return;
      if (row.querySelector("td[colspan]")) return;
      if (row.cells.length < 2) return;

      const codeCell = row.cells[0];
      const descCell = row.cells[1];
      if (!codeCell || !descCell) return;

      let code = "";
      let name = "";

      const codeBadge = row.querySelector(".sp-int-code-badge");
      if (codeBadge) {
        code = (codeBadge.innerText || codeBadge.textContent || "").trim();
      } else if (codeCell) {
        code = (codeCell.innerText || codeCell.textContent || "").trim();
      }

      const titleSpan = row.querySelector(".sp-int-title-text");
      if (titleSpan) {
        name = (titleSpan.innerText || titleSpan.textContent || "").trim();
      } else if (descCell) {
        name = (descCell.innerText || descCell.textContent || "").trim();
      }

      if (!code && !name) return;

      // Extract estimated grade directly from the Est. Grade widget or raw marks
      let grade = null;

      // 1. Direct search for "Est. Grade" label and its container
      const allRowNodes = Array.from(row.querySelectorAll("span, div, td"));
      const estLabel = allRowNodes.find((el) => {
        const txt = (el.textContent || "").trim();
        return txt === "Est. Grade" || txt === "Grade:";
      });
      if (estLabel && estLabel.parentElement) {
        const candidates = estLabel.parentElement.querySelectorAll("span, div");
        for (const sp of candidates) {
          const t = (sp.textContent || "").trim();
          if (t !== "Est. Grade" && t !== "Grade:" && GRADE_PTS.hasOwnProperty(t)) {
            grade = t;
            break;
          }
        }
      }

      // 2. Search inside .sp-int-lost-cell
      if (!grade) {
        const lostCell = row.querySelector(".sp-int-lost-cell");
        if (lostCell) {
          const spans = lostCell.querySelectorAll("span");
          for (const sp of spans) {
            const t = (sp.textContent || sp.innerText || "").trim();
            if (t !== "Marks Lost" && t !== "Est. Grade" && GRADE_PTS.hasOwnProperty(t)) {
              grade = t;
              break;
            }
          }
        }
      }

      // 3. Search inside .sp-int-forecast-cell (for completed 100-mark courses)
      if (!grade) {
        const forecastCell = row.querySelector(".sp-int-forecast-cell");
        if (forecastCell) {
          const spans = forecastCell.querySelectorAll("span");
          for (const sp of spans) {
            const t = (sp.textContent || sp.innerText || "").trim();
            if (t !== "Grade:" && GRADE_PTS.hasOwnProperty(t)) {
              grade = t;
              break;
            }
          }
        }
      }

      // 4. Fallback: compute estimated grade directly from raw internal marks on the page
      if (!grade) {
        for (let c = 0; c < row.cells.length; c++) {
          const text = (row.cells[c].innerText || row.cells[c].textContent || "").trim();
          const match = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
          if (match) {
            const sum = parseFloat(match[1]);
            const total = parseFloat(match[2]);
            if (!isNaN(sum) && !isNaN(total) && total > 0) {
              const lost = Math.max(0, total - sum);
              if (lost < 10) grade = "O";
              else if (lost < 20) grade = "A+";
              else if (lost < 30) grade = "A";
              else if (lost < 40) grade = "B+";
              else if (lost < 45) grade = "B";
              else if (lost <= 50) grade = "C";
              else grade = "F";
              break;
            }
          }
        }
      }

      courses.push({ code, name, grade });
    });

    return courses;
  }

  /**
   * Helper: Retrieve timetable credits and courses from chrome.storage.local
   * (shared cross-origin between academia.srmist.edu.in and sp.srmist.edu.in)
   * with fallback to localStorage.
   */
  async function getStoredTimetableData() {
    let credits = {};
    let courses = [];

    // 1. Try chrome.storage.local (extension-wide shared storage)
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      try {
        const data = await new Promise((resolve) => {
          chrome.storage.local.get(
            ["ar_credits_v31", "ar_timetable_courses_v31"],
            (items) => {
              if (chrome.runtime && chrome.runtime.lastError) {
                resolve({});
              } else {
                resolve(items || {});
              }
            },
          );
        });
        if (data.ar_credits_v31 && typeof data.ar_credits_v31 === "object") {
          credits = data.ar_credits_v31;
        }
        if (Array.isArray(data.ar_timetable_courses_v31)) {
          courses = data.ar_timetable_courses_v31;
        }
      } catch (e) {}
    }

    // 2. Fallback to localStorage if chrome.storage.local had no records
    if (Object.keys(credits).length === 0) {
      try {
        const localCr = localStorage.getItem("ar_credits_v31");
        if (localCr) credits = JSON.parse(localCr || "{}");
      } catch (e) {}
    }
    if (courses.length === 0) {
      try {
        const localCo = localStorage.getItem("ar_timetable_courses_v31");
        if (localCo) courses = JSON.parse(localCo || "[]");
      } catch (e) {}
    }

    return { credits, courses };
  }

  /**
   * Main function: Mounts both GPA and CGPA calculator sections on the Internal Marks page
   */
  function mountCgpaEngine() {
    if (!isInternalMarksPage()) {
      cleanupCgpaSections();
      return;
    }

    // Locate primary table
    const table = findInternalMarksTable();
    if (!table) return;

    // Verify table has at least 1 course row or is ready
    const scrapedCourses = extractInternalMarksCourses(table);
    const rows = table.querySelectorAll("tbody tr, tr");
    if (rows.length < 2 && scrapedCourses.length === 0) {
      return;
    }

    // Do not mount duplicate sections
    if (document.getElementById("cgpa-calc-section-v31")) return;

    injectCgpaStyles();

    // Load stored credits (from official timetable, or manual user input only if not reset)
    let savedCredits = {};
    try {
      const resetFlag =
        sessionStorage.getItem("sp_cgpa_credits_reset_v31") === "true";
      const userManual = resetFlag
        ? {}
        : JSON.parse(localStorage.getItem("sp_cgpa_credits_v1") || "{}");
      savedCredits = Object.assign(
        {},
        JSON.parse(localStorage.getItem("ar_credits_v31") || "{}"),
        userManual,
      );
    } catch (e) {}

    // Build seed rows directly from Internal Mark Details page data
    let seedData = [];
    if (scrapedCourses.length > 0) {
      seedData = scrapedCourses.map((s) => {
        let cr = null;
        let displayName = s.name
          ? s.code && !s.name.includes(s.code)
            ? `${s.code} - ${s.name}`
            : s.name
          : s.code;

        if (s.code && savedCredits.hasOwnProperty(s.code)) {
          cr = savedCredits[s.code];
        } else if (s.name) {
          const matchCode = Object.keys(savedCredits).find((k) =>
            s.name.toLowerCase().includes(k.toLowerCase()),
          );
          if (matchCode) cr = savedCredits[matchCode];
        }

        return {
          name: displayName,
          grade: s.grade,
          credit: cr,
          code: s.code,
        };
      });
    } else {
      seedData = Array.from({ length: 5 }, () => ({
        name: "",
        grade: null,
        credit: null,
      }));
    }

    // ── Helper: build one calculator table row ──
    function buildCalcRow(name, estGrade, credit, isNew, code) {
      const tr = document.createElement("tr");
      tr.className = "cgpa-row";
      if (code) tr.dataset.code = code;
      tr.style.cssText =
        "border-bottom: 1px solid #e8eaf0; transition: background .15s;";

      const optHtml =
        `<option value="" disabled ${!estGrade ? "selected" : ""} style="color:#94a3b8; background:#ffffff;">— Grade —</option>` +
        GRADE_OPTIONS.map((g) => {
          let bg = "#ffffff";
          let co = "#1e293b";
          if (g === "O") {
            bg = "#dcfce7";
            co = "#15803d";
          } else if (g === "A+") {
            bg = "#e8ecf5";
            co = "#132450";
          } else if (g === "A") {
            bg = "#cffafe";
            co = "#0e7490";
          } else if (g === "B+") {
            bg = "#ffedd5";
            co = "#9a7200";
          } else if (g === "B") {
            bg = "#fff4c2";
            co = "#745900";
          } else if (g === "C") {
            bg = "#f1f5f9";
            co = "#475569";
          } else if (g === "F" || g === "Ab") {
            bg = "#fee2e2";
            co = "#b91c1c";
          }
          return `<option value="${g}" ${estGrade === g ? "selected" : ""} style="background:${bg}; color:${co}; font-weight:700;">${g}</option>`;
        }).join("");

      const inputValue = isNew || !name ? "" : name.replace(/"/g, "&quot;");
      const inputBorder = isNew
        ? "border: 1.5px solid #253b70; box-shadow: 0 0 0 3px rgba(99,102,241,.2);"
        : "border: 1.5px solid #e8eaf0;";
      const inputPlaceholder = isNew ? "Type subject name…" : "Subject name";

      const matrixGridHtml = MATRIX_GRADES.map((item) => {
        const isActive =
          (item.grade === "" && !estGrade) ||
          (item.grade && item.grade === estGrade);
        const activeClass = isActive ? "active" : "";
        const label = item.label || item.grade;
        const sub = item.pts !== null ? item.pts : "✕";
        return `
          <button type="button" class="cgpa-matrix-cell ${activeClass}" data-grade="${item.grade}"
            style="background:${item.bg}; color:${item.color}; border:1px solid ${item.border};"
            title="${item.label ? 'Clear Grade' : item.grade + ' (' + item.pts + ' pts)'}">
            <span class="cgpa-m-grade">${label}</span>
            <span class="cgpa-m-pts">${sub}</span>
          </button>
        `;
      }).join("");

      tr.innerHTML = `
        <td class="cgpa-num" style="padding:8px 4px; width:36px; text-align:center; font-size:12px; font-weight:800; color:#64748b; font-family:'Plus Jakarta Sans',sans-serif;"></td>
        <td style="padding:8px 12px;">
          <input class="cgpa-subj" type="text" value="${inputValue}"
            placeholder="${inputPlaceholder}"
            style="width:100%; ${inputBorder} border-radius:8px;
              padding:6px 12px; font-size:12px; font-weight:700; color:#1e1b4b;
              background:#ffffff; text-align:left;
              font-family:'Plus Jakarta Sans',sans-serif;
              transition:border-color .2s, box-shadow .2s;" />
        </td>
        <td style="padding:8px 12px; width:80px; text-align:center;">
          <input class="cgpa-cred" type="number" min="0" max="10" step="0.5"
            placeholder="Cr"
            value="${credit !== null && credit !== undefined ? credit : ""}"
            style="width:100%; border:1.5px solid #e8eaf0; border-radius:8px;
              padding:6px 8px; font-size:12px; font-weight:700; color:#1e293b;
              background:#f8fafc; text-align:center;
              font-family:'Plus Jakarta Sans',sans-serif;
              transition:border-color .2s, box-shadow .2s;" />
        </td>
        <td style="padding:8px 10px; width:125px; text-align:center; position:relative;">
          <div class="cgpa-matrix-wrap">
            <button type="button" class="cgpa-matrix-trigger ${getTriggerClass(estGrade)}" title="Choose Grade Matrix">
              <span class="cgpa-matrix-txt">${formatGradeLabel(estGrade)}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="cgpa-matrix-arrow"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="cgpa-matrix-popover">
              <div class="cgpa-matrix-popover-head">
                <span>Select Grade</span>
                <button type="button" class="cgpa-matrix-close" title="Close">&times;</button>
              </div>
              <div class="cgpa-matrix-grid">
                ${matrixGridHtml}
              </div>
            </div>
            <select class="cgpa-opt" style="display:none !important;">
              ${optHtml}
            </select>
          </div>
        </td>
        <td style="padding:8px 6px 8px 10px; width:32px; text-align:center;">
          <button type="button" class="cgpa-del" title="Remove"
            style="background:#fef2f2; border:1.5px solid #fecaca; color:#ef4444; border-radius:6px;
              width:24px; height:24px; font-size:15px; cursor:pointer;
              display:inline-flex; align-items:center; justify-content:center; font-weight:900;">
            &times;
          </button>
        </td>
      `;

      const matrixWrap = tr.querySelector(".cgpa-matrix-wrap");
      const matrixTrigger = tr.querySelector(".cgpa-matrix-trigger");
      const matrixClose = tr.querySelector(".cgpa-matrix-close");
      const sel = tr.querySelector(".cgpa-opt");
      if (estGrade && GRADE_PTS[estGrade] !== undefined) sel.value = estGrade;

      function closeMatrix() {
        matrixWrap.classList.remove("open");
        matrixWrap.classList.remove("popover-above");
        tr.classList.remove("popover-active");
      }

      function setGrade(val) {
        sel.value = val;
        matrixTrigger.className = `cgpa-matrix-trigger ${getTriggerClass(val)}`;
        const txt = matrixTrigger.querySelector(".cgpa-matrix-txt");
        if (txt) txt.textContent = formatGradeLabel(val);

        matrixWrap.querySelectorAll(".cgpa-matrix-cell").forEach((cell) => {
          const g = cell.dataset.grade;
          const isAct = (g === "" && !val) || (g === val);
          cell.classList.toggle("active", isAct);
        });

        closeMatrix();
        recalcCGPA();
      }

      if (matrixTrigger) {
        matrixTrigger.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const wasOpen = matrixWrap.classList.contains("open");
          document.querySelectorAll(".cgpa-matrix-wrap.open").forEach((w) => {
            w.classList.remove("open");
            w.classList.remove("popover-above");
            w.closest(".cgpa-row")?.classList.remove("popover-active");
          });

          if (!wasOpen) {
            // Check if there is enough space below; if not, flip popover upwards
            const rect = matrixTrigger.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 210 && rect.top > 210) {
              matrixWrap.classList.add("popover-above");
            } else {
              matrixWrap.classList.remove("popover-above");
            }
            matrixWrap.classList.add("open");
            tr.classList.add("popover-active");
          } else {
            closeMatrix();
          }
        });
      }

      if (matrixClose) {
        matrixClose.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeMatrix();
        });
      }

      matrixWrap.querySelectorAll(".cgpa-matrix-cell").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetG = btn.dataset.grade || "";
          setGrade(targetG);
        });
      });

      sel.addEventListener("change", () => {
        setGrade(sel.value);
      });

      const credInp = tr.querySelector(".cgpa-cred");

      function updateZeroCreditState() {
        const val = credInp ? credInp.value.trim() : "";
        const num = parseFloat(val);
        const isZero = val !== "" && !isNaN(num) && num === 0;
        tr.classList.toggle("is-zero-credit", isZero);
        if (credInp) {
          credInp.classList.toggle("cgpa-cred-zero", isZero);
          credInp.title = isZero ? "Fully Internal Paper (0 Credit)" : "";
        }
      }
      updateZeroCreditState();

      const isMissing =
        (credit === null || credit === undefined || credit === "") &&
        name &&
        !isNew;
      if (isMissing) credInp.classList.add("cgpa-cred-glow");

      credInp.addEventListener("input", () => {
        updateZeroCreditState();
        if (credInp.value !== "") {
          credInp.classList.remove("cgpa-cred-glow");
          try {
            sessionStorage.removeItem("sp_cgpa_credits_reset_v31");
          } catch (e) {}
          // Persist user credit input
          if (code) {
            try {
              const cMap = JSON.parse(
                localStorage.getItem("sp_cgpa_credits_v1") || "{}",
              );
              cMap[code] = parseFloat(credInp.value);
              localStorage.setItem("sp_cgpa_credits_v1", JSON.stringify(cMap));
            } catch (e) {}
          }
        } else if (!isNew && name) {
          credInp.classList.add("cgpa-cred-glow");
        }
      });

      tr.querySelector(".cgpa-cred").addEventListener("input", recalcCGPA);
      
      const delBtn = tr.querySelector(".cgpa-del");
      if (delBtn) {
        delBtn.addEventListener("click", (e) => {
          e.preventDefault();
          tr.remove();
          recalcCGPA();
        });
      }

      if (isNew) {
        setTimeout(() => {
          const inp = tr.querySelector(".cgpa-subj");
          if (inp) {
            inp.focus();
            inp.select();
          }
        }, 30);
      }

      return tr;
    }

    // ── Helper: Update row numbers ──
    function updateRowNumbers() {
      const rows = calcTbody.querySelectorAll(".cgpa-row");
      rows.forEach((r, idx) => {
        const numEl = r.querySelector(".cgpa-num");
        if (numEl) numEl.textContent = idx + 1;
      });
    }

    // ── Helper: Live recalculate GPA ──
    function recalcCGPA() {
      updateRowNumbers();
      const rows = calcTbody.querySelectorAll(".cgpa-row");
      let totalCr = 0;
      let totalPts = 0;
      let hasAny = false;

      rows.forEach((r) => {
        const cInp = r.querySelector(".cgpa-cred");
        const cValStr = cInp ? cInp.value.trim() : "";
        const cr = parseFloat(cValStr);
        const isZero = cValStr !== "" && !isNaN(cr) && cr === 0;
        r.classList.toggle("is-zero-credit", isZero);
        if (cInp) {
          cInp.classList.toggle("cgpa-cred-zero", isZero);
          cInp.title = isZero ? "Fully Internal Paper (0 Credit)" : "";
        }

        const gv = r.querySelector(".cgpa-opt")?.value;
        if (!isNaN(cr) && gv !== "") {
          const pt = GRADE_PTS[gv] ?? 0;
          totalCr += cr;
          totalPts += cr * pt;
          hasAny = true;
        }
      });

      const gpa = hasAny && totalCr > 0 ? totalPts / totalCr : null;

      const valEl = cgpaSection.querySelector("#cgpa-live-val");
      const barEl = cgpaSection.querySelector("#cgpa-live-bar");
      const pctLbl = cgpaSection.querySelector("#cgpa-pct-lbl");
      const boxEl = cgpaSection.querySelector("#cgpa-live-box");
      const panelEl = cgpaSection.querySelector("#cgpa-right-panel-v31");

      if (gpa !== null) {
        const pct = (gpa / 10) * 100;
        valEl.textContent = gpa.toFixed(2);
        barEl.style.width = pct.toFixed(1) + "%";
        pctLbl.textContent = pct.toFixed(0) + "%";

        let bg = "#f8fafc";
        let br = "#f1f5f9";
        let accent = "#132450";

        if (gpa >= 9) {
          bg = "#dcfce7";
          br = "#bbf7d0";
          accent = "#15803d";
        } else if (gpa >= 8) {
          bg = "#e8ecf5";
          br = "#bfdbfe";
          accent = "#132450";
        } else if (gpa >= 7) {
          bg = "#fffaf0";
          br = "#fff4c2";
          accent = "#ca8a04";
        } else {
          bg = "#fee2e2";
          br = "#fca5a5";
          accent = "#b91c1c";
        }

        boxEl.style.background = bg;
        boxEl.style.borderColor = br;
        barEl.style.background = accent;
        panelEl.style.borderColor = accent + "66";
        panelEl.style.boxShadow = `0 10px 25px -5px rgba(0,0,0,0.05), 0 0 12px ${accent}22`;

        valEl.classList.remove("cgpa-pulse");
        void valEl.offsetWidth;
        valEl.classList.add("cgpa-pulse");
      } else {
        valEl.textContent = "—";
        barEl.style.width = "0%";
        pctLbl.textContent = "0%";
        boxEl.style.background = "#f8fafc";
        boxEl.style.borderColor = "#f1f5f9";
        barEl.style.background = "#132450";
        panelEl.style.borderColor = "#e2e8f0";
        panelEl.style.boxShadow = "0 10px 25px -5px rgba(0,0,0,0.05)";
      }
    }

    // ============================================================
    // 1. BUILD GPA CALCULATOR SECTION (Two-Panel Layout)
    // ============================================================
    const cgpaSection = document.createElement("div");
    cgpaSection.id = "cgpa-calc-section-v31";

    // Informational Dotted Note Banner above GPA Calculator
    const syncNoteBanner = document.createElement("div");
    syncNoteBanner.className = "sp-marks-sync-note";
    syncNoteBanner.style.cssText = `
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 9px 14px;
      margin-bottom: 14px;
      background: #fffaf0;
      border: 1.6px dotted #F4C542;
      border-radius: 10px;
      font-size: 11.5px;
      color: #9a7200;
      line-height: 1.45;
      box-sizing: border-box;
      font-family: inherit;
    `;
    syncNoteBanner.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c69a22" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>
        <strong style="font-weight: 800; color: #5c4500;">Note:</strong> When your faculty updates any marks, they do not reflect immediately on Student Portal (unlike Academia portal). <strong style="font-weight: 800; color: #9a7200;">Please wait a few hours for the portal to sync.</strong>
      </span>
    `;
    cgpaSection.appendChild(syncNoteBanner);

    const panels = document.createElement("div");
    panels.style.cssText = "display: flex; gap: 16px; align-items: flex-start; overflow: visible;";

    // Left Panel
    const leftPanel = document.createElement("div");
    leftPanel.style.cssText = "flex: 1; min-width: 0; overflow: visible;";

    const hdr = document.createElement("div");
    hdr.style.cssText =
      "display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;";
    hdr.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <span style="font-size: 15px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; letter-spacing: .04em;">
          GPA Calculator
        </span>
        <div class="tooltip-v31" style="color: #94a3b8; display: flex; align-items: center; cursor: pointer;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div class="tooltip-bubble" style="width: 220px;">
            <div style="font-size: 8px; color: #132450; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 900; text-align: center;">GPA Formula</div>
            <div class="formula-box">
              <div style="margin-bottom: 1px;">Σ (Credits × Grade Points)</div>
              <div class="formula-line"></div>
              <div style="margin-top: 1px;">Σ Total Credits</div>
            </div>
            <div style="font-size: 9px; font-weight: 600; color: #64748b; margin-top: 6px; line-height: 1.35; text-align: center;">
              Calculated by multiplying course credits by estimated grade points and dividing by total credits.
            </div>
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 6px; align-items: center;">
        <button type="button" id="cgpa-reset-credits-v31" title="Clear and purge all credit values"
          style="display: flex; align-items: center; gap: 5px; background: #fffaf0;
            border: 1.5px solid #f4d875; color: #745900; border-radius: 8px;
            padding: 6px 11px; font-size: 11px; font-weight: 800;
            font-family: inherit; cursor: pointer; transition: background .2s;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>Reset Credits
        </button>
        <button type="button" id="cgpa-fresh-v31" title="Clear all grades"
          style="display: flex; align-items: center; gap: 5px; background: #e8ecf5;
            border: 1.5px solid #ddd6fe; color: #132450; border-radius: 8px;
            padding: 6px 11px; font-size: 11px; font-weight: 800;
            font-family: inherit; cursor: pointer; transition: background .2s;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
          </svg>Reset Grades
        </button>
      </div>
    `;

    const card = document.createElement("div");
    card.style.cssText = `
      border: 1.5px solid #b8c2d9; border-radius: 16px; overflow: visible;
      box-shadow: 0 4px 20px -3px rgba(49, 46, 129, 0.12);
      background: #ffffff; position: relative; z-index: 25;
    `;

    const tbl = document.createElement("table");
    tbl.style.cssText = "width: 100%; border-collapse: separate; border-spacing: 0;";
    tbl.innerHTML = `
      <thead>
        <tr style="background: #0d1938; border-bottom: 1.5px solid #1e1b4b;">
          <th style="width: 36px; padding: 11px 4px; text-align: center; font-size: 11px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: .08em; border-top-left-radius: 15px; background: #0d1938; border-bottom: 1.5px solid #1e1b4b;">#</th>
          <th style="padding: 11px 12px; text-align: left; font-size: 11px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: .08em; background: #0d1938; border-bottom: 1.5px solid #1e1b4b;">Subject</th>
          <th style="padding: 11px 12px; text-align: center; font-size: 11px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: .08em; width: 80px; background: #0d1938; border-bottom: 1.5px solid #1e1b4b;">Credits</th>
          <th style="padding: 11px 12px; text-align: center; font-size: 11px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: .08em; width: 110px; background: #0d1938; border-bottom: 1.5px solid #1e1b4b;">Grade</th>
          <th style="width: 32px; padding: 11px 6px; border-top-right-radius: 15px; background: #0d1938; border-bottom: 1.5px solid #1e1b4b;"></th>
        </tr>
      </thead>
    `;

    const calcTbody = document.createElement("tbody");
    seedData.forEach((s) => {
      calcTbody.appendChild(buildCalcRow(s.name, s.grade, s.credit, false, s.code));
    });
    tbl.appendChild(calcTbody);

    const tfoot = document.createElement("tfoot");
    tfoot.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 10px 12px; border-top: 1.5px solid #e8eaf0; background: #fafbff; border-bottom-left-radius: 15px; border-bottom-right-radius: 15px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <button type="button" id="cgpa-add-v31"
              style="display: inline-flex; align-items: center; gap: 5px;
                background: transparent; border: 1.5px dashed #b8c2d9; color: #132450;
                border-radius: 8px; padding: 6px 14px; font-size: 11px; font-weight: 800;
                font-family: inherit; cursor: pointer; transition: background .2s;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>Add Subject
            </button>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button type="button" id="cgpa-clear-all-v31"
                style="display: inline-flex; align-items: center; gap: 5px;
                  background: transparent; border: 1.5px solid #fca5a5; color: #dc2626;
                  border-radius: 8px; padding: 6px 14px; font-size: 11px; font-weight: 800;
                  font-family: inherit; cursor: pointer; transition: background .2s;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>Clear All
              </button>
              <button type="button" id="cgpa-restore-subjects-v31" title="Sync subjects and credits from Academia My Time Table page"
                style="display: inline-flex; align-items: center; gap: 5px;
                  background: #e8ecf5; border: 1.5px solid #b8c2d9; color: #132450;
                  border-radius: 8px; padding: 6px 14px; font-size: 11px; font-weight: 800;
                  font-family: inherit; cursor: pointer; transition: all .2s;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                  <path d="M16 16h5v5"/>
                </svg>Sync Credits
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;
    tbl.appendChild(tfoot);
    card.appendChild(tbl);
    leftPanel.appendChild(hdr);
    leftPanel.appendChild(card);

    // Right Panel (Sticky Live GPA Score Widget)
    const rightPanel = document.createElement("div");
    rightPanel.id = "cgpa-right-panel-v31";
    rightPanel.style.cssText = `
      width: 220px; flex-shrink: 0;
      background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 24px;
      padding: 28px 20px; display: flex; flex-direction: column; align-items: center;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
      position: sticky; top: 16px; transition: all 0.3s;
    `;
    rightPanel.innerHTML = `
      <div style="width: 100%; text-align: center;">
        <div style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 12px; display: flex; align-items: center; justify-content: center;">
          <span class="live-dot"></span> Live GPA
        </div>
        <div id="cgpa-live-box" style="background: #f8fafc; border-radius: 20px; padding: 24px 10px; border: 1.5px solid #f1f5f9; margin-bottom: 20px; transition: all 0.4s;">
          <div id="cgpa-live-val" style="font-size: 58px; font-weight: 900; color: #1e1b4b; line-height: 1; letter-spacing: -0.04em; transition: all 0.3s;">—</div>
          <div style="font-size: 11px; font-weight: 800; color: #132450; margin-top: 8px; opacity: 0.8;">Semester GPA</div>
        </div>
        <div style="width: 100%; padding: 0 10px;">
           <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 8px;">
             <span id="cgpa-live-lbl">Progress</span>
             <span id="cgpa-pct-lbl" style="color: #132450;">0%</span>
           </div>
           <div style="width: 100%; background: #f1f5f9; border-radius: 99px; height: 6px; overflow: hidden;">
             <div id="cgpa-live-bar" style="height: 100%; width: 0%; background: #132450; border-radius: 99px; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
           </div>
        </div>
        <div style="margin-top: 24px; display: flex; justify-content: center; width: 100%;">
          <div class="tooltip-v31" style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 4px 6px; border-radius: 8px; max-width: 100%;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span style="font-size: 10px; font-weight: 700; color: #94a3b8; line-height: 1.2; text-align: left;">GPA Calculated from Estimated Grades</span>
            <div class="tooltip-bubble" style="width: 200px; bottom: 130%; left: 50%; transform: translateX(-50%);">
              <div style="font-size: 8px; color: #132450; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 900; text-align: center;">GPA Formula</div>
              <div class="formula-box">
                <div style="margin-bottom: 1px;">Σ (Credits × Points)</div>
                <div class="formula-line"></div>
                <div style="margin-top: 1px;">Σ Credits</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    panels.appendChild(leftPanel);
    panels.appendChild(rightPanel);
    cgpaSection.appendChild(panels);

    // Footer note: Clear and helpful instructions to sync credits from Academia My Time Table
    const footerNote = document.createElement("div");
    footerNote.id = "cgpa-footer-note-v31";
    footerNote.style.cssText = `
      margin-top: 14px; padding: 12px 16px; border-radius: 12px;
      background: linear-gradient(135deg, #f8faff 0%, #f1f5f9 100%);
      border: 1.5px solid #e8ecf5; font-size: 11.5px; color: #334155;
      display: flex; align-items: center; justify-content: space-between; gap: 14px;
      box-shadow: 0 2px 8px -2px rgba(99, 102, 241, 0.08);
      flex-wrap: wrap;
    `;
    footerNote.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 280px;">
        <div style="width: 28px; height: 28px; border-radius: 8px; background: #e8ecf5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <div style="line-height: 1.45; display: flex; flex-direction: column; gap: 4px;">
          <div>
            <span style="font-weight: 800; color: #1e1b4b;">Sync Course Credits Automatically:</span>
            <span style="color: #64748b; margin-left: 4px;">
              Open the <a href="https://academia.srmist.edu.in/#My_Time_Table_Attendance" target="_blank" rel="noopener noreferrer" style="color: #132450; font-weight: 800; text-decoration: underline; text-underline-offset: 2px;">Academia My Time Table</a> page, wait ~2 seconds for courses to sync, then return here and click <strong>Sync Credits</strong>.
            </span>
          </div>
          <div style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 1px;">
            <span style="font-weight: 800; color: #c69a22;">Seeing wrong subjects?</span>
            <span>Make sure Academia is logged into your own account (not a friend's), or click</span>
            <button type="button" id="cgpa-reset-sync-btn"
              style="display: inline-flex; align-items: center; gap: 4px; background: #fff1f2; border: 1px solid #fecdd3; color: #e11d48; border-radius: 6px; padding: 2px 7px; font-size: 10px; font-weight: 800; font-family: inherit; cursor: pointer; transition: all .15s; vertical-align: middle;"
              title="Clear cached timetable data so you can re-sync from your own account">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>Reset Sync
            </button>
            <span>to clear cache and re-sync.</span>
          </div>
        </div>
      </div>
      <a href="https://academia.srmist.edu.in/#My_Time_Table_Attendance" target="_blank" rel="noopener noreferrer" id="cgpa-open-tt-link"
        style="display: inline-flex; align-items: center; gap: 6px; background: #ffffff; border: 1.5px solid #b8c2d9; color: #132450; border-radius: 8px; padding: 7px 13px; font-size: 11px; font-weight: 800; text-decoration: none; transition: all .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05); white-space: nowrap; align-self: center;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        Open My Time Table ↗
      </a>
    `;
    const openTtLink = footerNote.querySelector("#cgpa-open-tt-link");
    if (openTtLink) {
      openTtLink.addEventListener("mouseenter", () => {
        openTtLink.style.background = "#e8ecf5";
        openTtLink.style.borderColor = "#818cf8";
        openTtLink.style.transform = "translateY(-1px)";
      });
      openTtLink.addEventListener("mouseleave", () => {
        openTtLink.style.background = "#ffffff";
        openTtLink.style.borderColor = "#b8c2d9";
        openTtLink.style.transform = "translateY(0)";
      });
    }

    const btnResetSync = footerNote.querySelector("#cgpa-reset-sync-btn");
    if (btnResetSync) {
      btnResetSync.addEventListener("mouseenter", () => {
        btnResetSync.style.background = "#ffe4e6";
        btnResetSync.style.borderColor = "#fda4af";
      });
      btnResetSync.addEventListener("mouseleave", () => {
        if (!btnResetSync.dataset.isResetting) {
          btnResetSync.style.background = "#fff1f2";
          btnResetSync.style.borderColor = "#fecdd3";
        }
      });
      btnResetSync.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          localStorage.removeItem("ar_timetable_courses_v31");
          localStorage.removeItem("ar_credits_v31");
          localStorage.removeItem("sp_cgpa_credits_v1");
          sessionStorage.removeItem("sp_cgpa_credits_reset_v31");
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            await new Promise((resolve) => {
              chrome.storage.local.remove(["ar_timetable_courses_v31", "ar_credits_v31"], resolve);
            });
          }
        } catch (err) {}

        await syncFromInternalMarks();

        btnResetSync.dataset.isResetting = "true";
        const origContent = btnResetSync.innerHTML;
        btnResetSync.innerHTML = `
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span style="color:#15803d; font-weight:800;">Sync Reset!</span>
        `;
        btnResetSync.style.background = "#dcfce7";
        btnResetSync.style.borderColor = "#86efac";

        setTimeout(() => {
          delete btnResetSync.dataset.isResetting;
          btnResetSync.innerHTML = origContent;
          btnResetSync.style.background = "#fff1f2";
          btnResetSync.style.borderColor = "#fecdd3";
        }, 1800);
      });
    }
    cgpaSection.appendChild(footerNote);

    // ── Functional event bindings for GPA section ──
    const btnResetCredits = cgpaSection.querySelector("#cgpa-reset-credits-v31");
    if (btnResetCredits) {
      btnResetCredits.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          // Completely purge all custom manual credits and set reset flag
          localStorage.removeItem("sp_cgpa_credits_v1");
          sessionStorage.setItem("sp_cgpa_credits_reset_v31", "true");
        } catch (e) {}
        calcTbody.querySelectorAll(".cgpa-cred").forEach((inp) => {
          inp.value = "";
          const row = inp.closest(".cgpa-row");
          const sVal = row ? row.querySelector(".cgpa-subj").value : "";
          if (sVal) inp.classList.add("cgpa-cred-glow");
        });
        recalcCGPA();

        const origHtml = btnResetCredits.innerHTML;
        btnResetCredits.innerHTML = `
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="#745900" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>Purged!
        `;
        setTimeout(() => {
          btnResetCredits.innerHTML = origHtml;
        }, 1000);
      });
    }

    const btnResetGrades = cgpaSection.querySelector("#cgpa-fresh-v31");
    if (btnResetGrades) {
      btnResetGrades.addEventListener("click", (e) => {
        e.preventDefault();
        calcTbody.querySelectorAll(".cgpa-row").forEach((r) => {
          r.classList.remove("popover-active");
          const s = r.querySelector(".cgpa-opt");
          if (s) s.value = "";
          const trig = r.querySelector(".cgpa-matrix-trigger");
          if (trig) {
            trig.className = "cgpa-matrix-trigger cgpa-trig-empty";
            const txt = trig.querySelector(".cgpa-matrix-txt");
            if (txt) txt.textContent = "— Grade —";
          }
          const wrap = r.querySelector(".cgpa-matrix-wrap");
          if (wrap) {
            wrap.classList.remove("open");
            wrap.classList.remove("popover-above");
          }
          r.querySelectorAll(".cgpa-matrix-cell").forEach((c) => {
            const g = c.dataset.grade;
            c.classList.toggle("active", g === "");
          });
        });
        recalcCGPA();
      });
    }

    const btnAddSubj = cgpaSection.querySelector("#cgpa-add-v31");
    if (btnAddSubj) {
      btnAddSubj.addEventListener("click", (e) => {
        e.preventDefault();
        const newRow = buildCalcRow("", null, null, true);
        calcTbody.appendChild(newRow);
        newRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
        recalcCGPA();
      });
    }

    const btnClearAll = cgpaSection.querySelector("#cgpa-clear-all-v31");
    if (btnClearAll) {
      btnClearAll.addEventListener("click", (e) => {
        e.preventDefault();
        calcTbody.innerHTML = "";
        for (let i = 0; i < 5; i++) {
          calcTbody.appendChild(buildCalcRow("", null, null, false));
        }
        recalcCGPA();
      });
    }

    // Direct sync from Internal Marks page & Academia Timetable (strictly deduplicated)
    async function syncFromInternalMarks() {
      const liveTable = findInternalMarksTable();
      const freshCourses = liveTable ? extractInternalMarksCourses(liveTable) : [];
      const { credits: ttCredits, courses: ttCourses } = await getStoredTimetableData();

      if (freshCourses.length === 0 && (!Array.isArray(ttCourses) || ttCourses.length === 0)) {
        return;
      }

      // Purge any custom manual credits on sync so official timetable credit is strictly used
      try {
        localStorage.removeItem("sp_cgpa_credits_v1");
        sessionStorage.removeItem("sp_cgpa_credits_reset_v31");
      } catch (e) {}

      // Preserve any currently selected grades from the active table rows
      const existingGrades = {};
      calcTbody.querySelectorAll(".cgpa-row").forEach((r) => {
        const cCode = r.dataset.code;
        const subjVal = (r.querySelector(".cgpa-subj")?.value || "").trim().toLowerCase();
        const gVal = r.querySelector(".cgpa-opt")?.value;
        if (gVal) {
          if (cCode) existingGrades[cCode] = gVal;
          if (subjVal) existingGrades[subjVal] = gVal;
        }
      });

      calcTbody.innerHTML = "";

      const seenCodes = new Set();
      const seenTitles = new Set();

      function normCode(c) {
        return (c || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      }

      function normTitle(t) {
        return (t || "")
          .toLowerCase()
          .replace(/\b(theory|practical|integrated|lab|audit)\b/gi, "")
          .replace(/[^a-z0-9]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      function findTtCredit(code, title) {
        const nc = normCode(code);
        const nt = normTitle(title);

        // 1. Exact normalized code match
        if (nc) {
          for (const [k, v] of Object.entries(ttCredits)) {
            if (normCode(k) === nc && v !== null && v !== undefined && !isNaN(v)) {
              return parseFloat(v);
            }
          }
          if (Array.isArray(ttCourses)) {
            for (const tc of ttCourses) {
              if (normCode(tc.code) === nc && tc.credit !== null && tc.credit !== undefined && !isNaN(tc.credit)) {
                return parseFloat(tc.credit);
              }
            }
          }
        }

        // 2. Substring code match (min length 6)
        if (nc && nc.length >= 6) {
          for (const [k, v] of Object.entries(ttCredits)) {
            const nk = normCode(k);
            if ((nk.includes(nc) || nc.includes(nk)) && v !== null && !isNaN(v)) {
              return parseFloat(v);
            }
          }
          if (Array.isArray(ttCourses)) {
            for (const tc of ttCourses) {
              const ntc = normCode(tc.code);
              if ((ntc.includes(nc) || nc.includes(ntc)) && tc.credit !== null && !isNaN(tc.credit)) {
                return parseFloat(tc.credit);
              }
            }
          }
        }

        // 3. Normalized title match
        if (nt && nt.length >= 4) {
          for (const [k, v] of Object.entries(ttCredits)) {
            const nk = normTitle(k);
            if ((nk === nt || nk.includes(nt) || nt.includes(nk)) && v !== null && !isNaN(v)) {
              return parseFloat(v);
            }
          }
          if (Array.isArray(ttCourses)) {
            for (const tc of ttCourses) {
              const ntt = normTitle(tc.title);
              if ((ntt === nt || ntt.includes(nt) || nt.includes(ntt)) && tc.credit !== null && !isNaN(tc.credit)) {
                return parseFloat(tc.credit);
              }
            }
          }
        }

        return null;
      }

      // 1. First add all courses from Internal Marks page (syncs Est. Grade directly)
      freshCourses.forEach((c) => {
        const nc = normCode(c.code);
        const nt = normTitle(c.name);

        if (nc && seenCodes.has(nc)) return;
        if (nt && seenTitles.has(nt)) return;

        if (nc) seenCodes.add(nc);
        if (nt) seenTitles.add(nt);

        const displayName = c.name
          ? c.code && !c.name.includes(c.code)
            ? `${c.code} - ${c.name}`
            : c.name
          : c.code;

        // Prioritize syncing fresh grade from Est. Grade on the Internal Mark Details table
        const syncedGrade =
          c.grade ||
          existingGrades[c.code] ||
          existingGrades[displayName.toLowerCase()] ||
          null;

        // Strictly use official credit from Timetable (e.g. 3 from timetable even if user mistyped 4!)
        const syncedCr = findTtCredit(c.code, c.name);

        calcTbody.appendChild(
          buildCalcRow(displayName, syncedGrade, syncedCr, false, c.code)
        );
      });

      // 2. Add enrolled courses from Timetable (strictly omitting duplicate subjects)
      if (Array.isArray(ttCourses)) {
        ttCourses.forEach((tc) => {
          const nc = normCode(tc.code);
          const nt = normTitle(tc.title);

          // Prevent duplicate subject
          if (nc && seenCodes.has(nc)) return;
          if (nt && seenTitles.has(nt)) return;

          if (nc) seenCodes.add(nc);
          if (nt) seenTitles.add(nt);

          const displayName = tc.title
            ? tc.code && !tc.title.includes(tc.code)
              ? `${tc.code} - ${tc.title}`
              : tc.title
            : tc.code;

          const syncedGrade =
            existingGrades[tc.code] ||
            existingGrades[displayName.toLowerCase()] ||
            null;

          const syncedCr =
            tc.credit !== null && tc.credit !== undefined
              ? tc.credit
              : findTtCredit(tc.code, tc.title);

          calcTbody.appendChild(
            buildCalcRow(displayName, syncedGrade, syncedCr, false, tc.code)
          );
        });
      }

      recalcCGPA();

      // Persist the synced courses & credits to chrome.storage.local & localStorage for standalone calculator!
      try {
        const coursesToStore = [];
        const creditsToStore = {};
        calcTbody.querySelectorAll(".cgpa-row").forEach((r) => {
          const code = (r.dataset.code || "").toUpperCase().trim();
          const sVal = (r.querySelector(".cgpa-subj")?.value || "").trim();
          const crVal = parseFloat(r.querySelector(".cgpa-cred")?.value);
          if (code || sVal) {
            coursesToStore.push({
              code: code || sVal,
              title: sVal,
              credit: !isNaN(crVal) ? crVal : null,
            });
            if (code && !isNaN(crVal)) creditsToStore[code] = crVal;
          }
        });
        if (coursesToStore.length > 0) {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({
              ar_timetable_courses_v31: coursesToStore,
              sp_cached_courses_v31: coursesToStore,
              ar_credits_v31: { ...ttCredits, ...creditsToStore },
            });
          }
          localStorage.setItem("ar_timetable_courses_v31", JSON.stringify(coursesToStore));
          localStorage.setItem("sp_cached_courses_v31", JSON.stringify(coursesToStore));
          localStorage.setItem("ar_credits_v31", JSON.stringify({ ...ttCredits, ...creditsToStore }));
        }
      } catch (e) {}

      // Visual feedback on the button
      if (restoreBtn) {
        const origContent = restoreBtn.innerHTML;
        restoreBtn.innerHTML = `
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="#15803d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>Synced!
        `;
        restoreBtn.style.color = "#15803d";
        restoreBtn.style.borderColor = "#86efac";
        restoreBtn.style.background = "#f0fdf4";
        setTimeout(() => {
          restoreBtn.innerHTML = origContent;
          restoreBtn.style.color = "#132450";
          restoreBtn.style.borderColor = "#b8c2d9";
          restoreBtn.style.background = "#e8ecf5";
        }, 1200);
      }
    }

    const restoreBtn = cgpaSection.querySelector("#cgpa-restore-subjects-v31");
    if (restoreBtn) {
      restoreBtn.addEventListener("click", (e) => {
        e.preventDefault();
        syncFromInternalMarks();
      });
    }

    // Async background sync with official Academia timetable storage (chrome.storage.local)
    getStoredTimetableData().then(({ credits: ttCr, courses: ttCo }) => {
      if (ttCr && Object.keys(ttCr).length > 0) {
        try {
          localStorage.setItem("ar_credits_v31", JSON.stringify(ttCr));
        } catch (e) {}
      }
      if (Array.isArray(ttCo) && ttCo.length > 0) {
        try {
          localStorage.setItem("ar_timetable_courses_v31", JSON.stringify(ttCo));
        } catch (e) {}
      }

      const creditsWereReset =
        sessionStorage.getItem("sp_cgpa_credits_reset_v31") === "true";
      if (creditsWereReset) return;

      let filledAny = false;
      calcTbody.querySelectorAll(".cgpa-row").forEach((r) => {
        const cInp = r.querySelector(".cgpa-cred");
        if (cInp && (!cInp.value || cInp.value === "")) {
          const code = r.dataset.code;
          const sVal = (r.querySelector(".cgpa-subj")?.value || "").trim();
          let cr = null;
          if (code && ttCr[code] !== undefined) {
            cr = ttCr[code];
          } else {
            const nc = (code || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
            for (const [k, v] of Object.entries(ttCr)) {
              if (nc && (k || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === nc) {
                cr = v;
                break;
              }
              if (sVal && sVal.toLowerCase().includes(k.toLowerCase())) {
                cr = v;
                break;
              }
            }
          }
          if (cr !== null && cr !== undefined && !isNaN(cr)) {
            cInp.value = cr;
            cInp.classList.remove("cgpa-cred-glow");
            filledAny = true;
          }
        }
      });
      if (filledAny) recalcCGPA();
    });

    // Global listener to close matrix dropdown on outside click or escape
    if (!window.__SP_MATRIX_LISTENER_ATTACHED__) {
      window.__SP_MATRIX_LISTENER_ATTACHED__ = true;
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".cgpa-matrix-wrap")) {
          document.querySelectorAll(".cgpa-matrix-wrap.open").forEach((w) => {
            w.classList.remove("open");
            w.classList.remove("popover-above");
            w.closest(".cgpa-row")?.classList.remove("popover-active");
          });
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          document.querySelectorAll(".cgpa-matrix-wrap.open").forEach((w) => {
            w.classList.remove("open");
            w.classList.remove("popover-above");
            w.closest(".cgpa-row")?.classList.remove("popover-active");
          });
        }
      });
    }

    // Initial calculation
    recalcCGPA();

    // ============================================================
    // 2. BUILD OVERALL CGPA CALCULATOR SECTION (Compact Dashboard)
    // ============================================================
    const overallSection = document.createElement("div");
    overallSection.id = "overall-cgpa-section-v31";

    const overallHdr = document.createElement("div");
    overallHdr.style.cssText =
      "display: flex; align-items: center; margin-bottom: 12px; max-width: 600px;";
    overallHdr.innerHTML = `
      <div style="display: flex; align-items: center; font-size: 16px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.03em;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; color: #132450;">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
          <line x1="8" y1="6" x2="16" y2="6"/>
          <line x1="8" y1="10" x2="16" y2="10"/>
          <line x1="8" y1="14" x2="16" y2="14"/>
          <line x1="8" y1="18" x2="16" y2="18"/>
        </svg> 
        Overall CGPA
      </div>
      <div class="tooltip-v31" style="margin-left: 8px; color: #94a3b8; display: flex; align-items: center;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <div class="tooltip-bubble" style="width: 180px;">
          <div style="font-size: 8px; color: #132450; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 900; text-align: center;">CGPA Formula</div>
          <div class="formula-box">
            <div style="margin-bottom: 1px;">Σ Semester GPA</div>
            <div class="formula-line"></div>
            <div style="margin-top: 1px;">Total Semesters</div>
          </div>
        </div>
      </div>
    `;
    overallSection.appendChild(overallHdr);

    const container = document.createElement("div");
    container.className = "compact-container";
    container.innerHTML = `
      <div class="compact-header">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div class="compact-lbl">Semester-wise Average</div>
          <div id="compact-meta" style="font-size: 11px; font-weight: 700; color: #b8c2d9;">0 Terms</div>
        </div>
        <div class="compact-score-group">
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <div class="compact-lbl">Overall CGPA</div>
            <div id="compact-val-pill" class="compact-val-pill tier-neutral">
              <span id="compact-val" class="compact-val">—</span>
            </div>
          </div>
        </div>
      </div>
      <div id="compact-grid" class="compact-grid"></div>
      <div class="compact-footer">
        <button type="button" id="add-compact" class="compact-btn btn-add-compact">+ Add More</button>
        <button type="button" id="reset-compact" class="compact-btn">Reset All</button>
      </div>
    `;
    overallSection.appendChild(container);

    const grid = container.querySelector("#compact-grid");

    // Load saved semester GPAs
    let savedSemesters = [];
    try {
      savedSemesters = JSON.parse(
        localStorage.getItem("sp_overall_cgpa_semesters_v1") || "[]",
      );
    } catch (e) {}

    function saveSemesters() {
      const vals = [];
      overallSection.querySelectorAll(".compact-input").forEach((inp) => {
        vals.push(inp.value);
      });
      try {
        localStorage.setItem("sp_overall_cgpa_semesters_v1", JSON.stringify(vals));
      } catch (e) {}
    }

    function createCompactBadge(index, prefillVal) {
      const div = document.createElement("div");
      div.className = "badge-sem";
      const delBtn =
        index > 8 ? `<button type="button" class="badge-del" title="Remove">&times;</button>` : "";
      div.innerHTML = `
        <div class="num">Semester ${index}</div>
        <input type="number" class="compact-input" placeholder="0.00" min="0" max="10" step="0.01" value="${prefillVal || ""}">
        ${delBtn}
      `;

      function updateBadgeTier(vStr) {
        const v = parseFloat(vStr);
        div.classList.remove("badge-green", "badge-yellow", "badge-red");
        const numEl = div.querySelector(".num");
        const inpEl = div.querySelector(".compact-input");
        if (!isNaN(v) && v > 0) {
          if (v >= 8.0) {
            div.classList.add("badge-green");
            if (numEl) {
              numEl.style.background = "#dcfce7";
              numEl.style.color = "#15803d";
            }
            if (inpEl) inpEl.style.color = "#15803d";
          } else if (v >= 7.0) {
            div.classList.add("badge-yellow");
            if (numEl) {
              numEl.style.background = "#fff4c2";
              numEl.style.color = "#9a7200";
            }
            if (inpEl) inpEl.style.color = "#9a7200";
          } else {
            div.classList.add("badge-red");
            if (numEl) {
              numEl.style.background = "#fee2e2";
              numEl.style.color = "#dc2626";
            }
            if (inpEl) inpEl.style.color = "#dc2626";
          }
        } else {
          if (numEl) {
            numEl.style.background = "";
            numEl.style.color = "";
          }
          if (inpEl) inpEl.style.color = "";
        }
      }

      if (prefillVal) {
        updateBadgeTier(prefillVal);
      }

      if (index > 8) {
        const dBtn = div.querySelector(".badge-del");
        if (dBtn) {
          dBtn.addEventListener("click", (e) => {
            e.preventDefault();
            div.remove();
            recalcOverall();
            overallSection.querySelectorAll(".badge-sem").forEach((b, i) => {
              b.querySelector(".num").textContent = `Semester ${i + 1}`;
            });
            saveSemesters();
          });
        }
      }

      div.querySelector(".compact-input").addEventListener("input", (e) => {
        updateBadgeTier(e.target.value);
        recalcOverall();
        saveSemesters();
      });

      return div;
    }

    function recalcOverall() {
      const inputs = overallSection.querySelectorAll(".compact-input");
      let total = 0;
      let count = 0;

      inputs.forEach((inp) => {
        const v = parseFloat(inp.value);
        if (!isNaN(v) && v > 0) {
          total += v;
          count++;
        }
      });

      const avg = count > 0 ? total / count : null;
      const valEl = overallSection.querySelector("#compact-val");
      const pillEl = overallSection.querySelector("#compact-val-pill");
      const metaEl = overallSection.querySelector("#compact-meta");

      metaEl.textContent = `${count} Semester${count !== 1 ? "s" : ""} Recorded`;

      if (pillEl) {
        pillEl.classList.remove("tier-green", "tier-yellow", "tier-red", "tier-neutral");
      }

      if (avg !== null) {
        valEl.textContent = avg.toFixed(2);
        if (avg >= 8.0) {
          if (pillEl) pillEl.classList.add("tier-green");
          valEl.style.color = "#15803d";
        } else if (avg >= 7.0) {
          if (pillEl) pillEl.classList.add("tier-yellow");
          valEl.style.color = "#9a7200";
        } else {
          if (pillEl) pillEl.classList.add("tier-red");
          valEl.style.color = "#dc2626";
        }
      } else {
        valEl.textContent = "—";
        if (pillEl) pillEl.classList.add("tier-neutral");
        valEl.style.color = "#e8ecf5";
      }
    }

    // Populate initial semesters (at least 8)
    const initialCount = Math.max(8, savedSemesters.length);
    for (let i = 1; i <= initialCount; i++) {
      grid.appendChild(createCompactBadge(i, savedSemesters[i - 1]));
    }
    recalcOverall();

    const btnAddCompact = overallSection.querySelector("#add-compact");
    if (btnAddCompact) {
      btnAddCompact.addEventListener("click", (e) => {
        e.preventDefault();
        const newIdx = grid.querySelectorAll(".badge-sem").length + 1;
        grid.appendChild(createCompactBadge(newIdx, ""));
        saveSemesters();
      });
    }

    const btnResetCompact = overallSection.querySelector("#reset-compact");
    if (btnResetCompact) {
      btnResetCompact.addEventListener("click", (e) => {
        e.preventDefault();
        grid.innerHTML = "";
        for (let i = 1; i <= 8; i++) {
          grid.appendChild(createCompactBadge(i, ""));
        }
        recalcOverall();
        saveSemesters();
      });
    }

    // Safe keydown & submit shields (No capture stopPropagation to ensure buttons work 100%)
    [cgpaSection, overallSection].forEach((sec) => {
      sec.addEventListener("submit", (e) => {
        e.preventDefault();
      });
      sec.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
        }
      });
    });

    // ============================================================
    // 3. BUILD GRADE DETAILS REFERENCE SECTION (From Academia)
    // ============================================================
    const gradeDetailsSection = document.createElement("div");
    gradeDetailsSection.id = "sp-grade-details-section-v31";

    const gradeHdr = document.createElement("div");
    gradeHdr.style.cssText =
      "display: flex; align-items: center; margin-bottom: 13px; width: 480px; max-width: 100%; box-sizing: border-box;";
    gradeHdr.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.04em;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
        Grade Details
      </div>
    `;
    gradeDetailsSection.appendChild(gradeHdr);

    const gradeCard = document.createElement("div");
    gradeCard.className = "sp-grade-table-card";
    gradeCard.style.cssText = `
      width: 480px; max-width: 100%;
      border: 1.5px solid #b8c2d9; border-radius: 16px; overflow: hidden;
      box-shadow: 0 4px 20px -3px rgba(49, 46, 129, 0.12);
      background: #ffffff; box-sizing: border-box;
    `;

    const gradeTbl = document.createElement("table");
    gradeTbl.className = "sp-grade-table";
    gradeTbl.style.cssText = "width: 100%; border-collapse: separate; border-spacing: 0;";
    gradeTbl.innerHTML = `
      <thead>
        <tr style="background: #0d1938; border-bottom: 1.5px solid #1e1b4b;">
          <th style="padding: 8.5px 16px; text-align: center; font-size: 11.5px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: .08em; background: #0d1938; width: 90px; border-top-left-radius: 15px; border-right: 1px solid rgba(255, 255, 255, 0.15); border-bottom: 1.5px solid #1e1b4b;">Grade</th>
          <th style="padding: 8.5px 16px; text-align: center; font-size: 11.5px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: .08em; background: #0d1938; width: 105px; border-right: 1px solid rgba(255, 255, 255, 0.15); border-bottom: 1.5px solid #1e1b4b;">Min.%</th>
          <th style="padding: 8.5px 16px; text-align: center; font-size: 11.5px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: .08em; background: #0d1938; width: 105px; border-right: 1px solid rgba(255, 255, 255, 0.15); border-bottom: 1.5px solid #1e1b4b;">Max%.</th>
          <th style="padding: 8.5px 16px; text-align: center; font-size: 11.5px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: .08em; background: #0d1938; border-top-right-radius: 15px; border-bottom: 1.5px solid #1e1b4b;">Result</th>
        </tr>
      </thead>
    `;

    const gradeTbody = document.createElement("tbody");
    const gradeRows = [
      { grade: "O", min: "91.00", max: "100.00", result: "PASS", gBg: "#dcfce7", gCol: "#15803d", gBr: "#86efac", rBg: "#dcfce7", rCol: "#15803d", rBr: "#86efac" },
      { grade: "A+", min: "81.00", max: "90.00", result: "PASS", gBg: "#e8ecf5", gCol: "#132450", gBr: "#bfdbfe", rBg: "#dcfce7", rCol: "#15803d", rBr: "#86efac" },
      { grade: "A", min: "71.00", max: "80.00", result: "PASS", gBg: "#e0f2fe", gCol: "#0d1938", gBr: "#b8c2d9", rBg: "#dcfce7", rCol: "#15803d", rBr: "#86efac" },
      { grade: "B+", min: "61.00", max: "70.00", result: "PASS", gBg: "#ffedd5", gCol: "#9a7200", gBr: "#fed7aa", rBg: "#dcfce7", rCol: "#15803d", rBr: "#86efac" },
      { grade: "B", min: "56.00", max: "60.00", result: "PASS", gBg: "#fff4c2", gCol: "#9a7200", gBr: "#F4C542", rBg: "#dcfce7", rCol: "#15803d", rBr: "#86efac" },
      { grade: "C", min: "50.00", max: "55.00", result: "PASS", gBg: "#f1f5f9", gCol: "#475569", gBr: "#cbd5e1", rBg: "#dcfce7", rCol: "#15803d", rBr: "#86efac" },
      { grade: "Ab", min: "0.00", max: "100.00", result: "INCOMPLETE", gBg: "#f8fafc", gCol: "#64748b", gBr: "#e2e8f0", rBg: "#fff4c2", rCol: "#9a7200", rBr: "#F4C542" },
      { grade: "*", min: "0.00", max: "100.00", result: "WITHHELD", gBg: "#f8fafc", gCol: "#64748b", gBr: "#e2e8f0", rBg: "#fff4c2", rCol: "#9a7200", rBr: "#F4C542" },
      { grade: "I", min: "0.00", max: "100.00", result: "FAIL", gBg: "#f8fafc", gCol: "#64748b", gBr: "#e2e8f0", rBg: "#fee2e2", rCol: "#dc2626", rBr: "#fca5a5" },
      { grade: "W", min: "0.00", max: "100.00", result: "FAIL", gBg: "#f8fafc", gCol: "#64748b", gBr: "#e2e8f0", rBg: "#fee2e2", rCol: "#dc2626", rBr: "#fca5a5" },
      { grade: "F", min: "0.00", max: "49.00", result: "FAIL", gBg: "#fee2e2", gCol: "#dc2626", gBr: "#fca5a5", rBg: "#fee2e2", rCol: "#dc2626", rBr: "#fca5a5" },
    ];

    gradeRows.forEach((r, idx) => {
      const isLast = idx === gradeRows.length - 1;
      const btmBorder = isLast ? "" : "border-bottom: 1px solid #f1f5f9;";
      const tr = document.createElement("tr");
      tr.style.cssText = "transition: background .15s ease;";
      tr.innerHTML = `
        <td style="padding: 6.5px 16px; text-align: center; vertical-align: middle; border-right: 1px solid #f1f5f9; ${btmBorder}">
          <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 34px; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; background: ${r.gBg}; color: ${r.gCol}; border: 1px solid ${r.gBr};">
            ${r.grade}
          </span>
        </td>
        <td style="padding: 6.5px 16px; text-align: center; vertical-align: middle; border-right: 1px solid #f1f5f9; ${btmBorder}">
          <span style="font-size: 13px; font-weight: 700; color: #1e293b;">${r.min}</span>
        </td>
        <td style="padding: 6.5px 16px; text-align: center; vertical-align: middle; border-right: 1px solid #f1f5f9; ${btmBorder}">
          <span style="font-size: 13px; font-weight: 700; color: #1e293b;">${r.max}</span>
        </td>
        <td style="padding: 6.5px 16px; text-align: center; vertical-align: middle; ${btmBorder}">
          <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 80px; padding: 2px 10px; border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; background: ${r.rBg}; color: ${r.rCol}; border: 1px solid ${r.rBr};">
            ${r.result}
          </span>
        </td>
      `;
      tr.addEventListener("mouseenter", () => {
        tr.style.background = "#f8faff";
      });
      tr.addEventListener("mouseleave", () => {
        tr.style.background = "transparent";
      });
      gradeTbody.appendChild(tr);
    });

    gradeTbl.appendChild(gradeTbody);
    gradeCard.appendChild(gradeTbl);
    gradeDetailsSection.appendChild(gradeCard);

    const gradeSourceNote = document.createElement("div");
    gradeSourceNote.style.cssText =
      "display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #94a3b8; margin-top: 10px; margin-left: 4px;";
    gradeSourceNote.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>
      Table Source: SRM Student Portal Grade Details
    `;
    gradeDetailsSection.appendChild(gradeSourceNote);

    // ============================================================
    // 4. INSERT INTO INTERNAL MARKS PAGE AS A NEW SECTION
    // ============================================================
    const targetParent =
      table.closest(".card, .panel, .sp-internals-card, .box, #divMainDetails > div") ||
      table.closest(".table-responsive") ||
      table;

    if (targetParent && targetParent.parentElement) {
      targetParent.insertAdjacentElement("afterend", gradeDetailsSection);
      targetParent.insertAdjacentElement("afterend", overallSection);
      targetParent.insertAdjacentElement("afterend", cgpaSection);
    }
  }

  /**
   * Resilient lifecycle watcher & observer
   */
  let debounceTimer = null;
  function triggerMount() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      mountCgpaEngine();
    }, 80);
  }

  // 1. Initial immediate attempts
  triggerMount();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", triggerMount);
  }
  window.addEventListener("load", triggerMount);

  // 2. Poll sequence immediately after page load to catch dynamic AJAX loads without needing clicks
  [50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000].forEach((delay) => {
    setTimeout(() => {
      if (!document.getElementById("cgpa-calc-section-v31") && isInternalMarksPage()) {
        mountCgpaEngine();
      }
    }, delay);
  });

  // Long poll safety check (runs every 600ms for 30s or until mounted)
  let pollCount = 0;
  const pollTimer = setInterval(() => {
    pollCount++;
    if (document.getElementById("cgpa-calc-section-v31")) {
      clearInterval(pollTimer);
      return;
    }
    if (isInternalMarksPage() && findInternalMarksTable()) {
      mountCgpaEngine();
      if (document.getElementById("cgpa-calc-section-v31")) {
        clearInterval(pollTimer);
      }
    }
    if (pollCount > 50) {
      clearInterval(pollTimer);
    }
  }, 600);

  // 3. Hash / Navigation listeners
  window.addEventListener("hashchange", triggerMount);
  window.addEventListener("popstate", triggerMount);

  // 4. User interaction listener (ANY click anywhere on document)
  document.addEventListener("click", () => {
    setTimeout(triggerMount, 100);
    setTimeout(triggerMount, 400);
  });

  // 5. Hook ASP.NET PageRequestManager AJAX lifecycle if present
  try {
    if (
      window.Sys &&
      window.Sys.WebForms &&
      window.Sys.WebForms.PageRequestManager
    ) {
      window.Sys.WebForms.PageRequestManager.getInstance().add_endRequest(() => {
        setTimeout(triggerMount, 100);
        setTimeout(triggerMount, 400);
      });
    }
  } catch (e) {}

  // 6. Observe DOM mutations (watching childList, subtree, AND class attributes)
  const observer = new MutationObserver(() => {
    triggerMount();
  });

  const targetNode = document.body || document.documentElement;
  if (targetNode) {
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }
})();
