/**
 * ============================================================
 * FILE: sp_internals.js (Student Portal Internal Marks Engine)
 * ============================================================
 * Strictly for SRM Student Portal (sp.srmist.edu.in) - Never touches Academia.
 *
 * DESIGN:
 *   Matches the exact UI theme, color palette, card layout, and metric
 *   boxes used in Student Portal Attendance Details (sp_attendence.css).
 *
 * COLUMN LAYOUT:
 *   1. Code (with themed color badge and accent border)
 *   2. Description (with title text styling)
 *   3. Mark / Max. Mark (with Light Blue metric badge)
 *   4. Marks Lost (with Est. Grade widget)
 *   5. Target Marks (Target / 75 chips + global formula tooltip)
 *   6. View Details (positioned at the last column in every row)
 * ============================================================
 */
(() => {
  "use strict";

  // Strictly execute on Student Portal (sp.srmist.edu.in) only
  if (window.location.hostname.includes("academia.")) {
    return;
  }

  console.log(
    "[Academia Prime] sp_internals.js active on Student Portal (Attendance Theme)",
  );

  const SP_INTERNALS_THEME_ID = "sp-internals-theme-attendance-v1";

  // Distinctive Course Theme Palette matching Attendance Details & Prime Timetable
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
   * Target Grade thresholds for End-Semester exam target marks calculation.
   * Standard SRM 60-internals / 40-endsem (75 mark paper).
   */
  const TARGET_GRADES = [
    {
      name: "O",
      target: 91,
      color: "#15803d",
      bg: "#dcfce7",
      border: "#bbf7d0",
    },
    {
      name: "A+",
      target: 81,
      color: "#132450",
      bg: "#e8ecf5",
      border: "#bfdbfe",
    },
    {
      name: "A",
      target: 71,
      color: "#0e7490",
      bg: "#cffafe",
      border: "#a5f3fc",
    },
    {
      name: "B+",
      target: 61,
      color: "#9a7200",
      bg: "#ffedd5",
      border: "#fed7aa",
    },
    {
      name: "B",
      target: 56,
      color: "#745900",
      bg: "#fff4c2",
      border: "#fff4c2",
    },
    {
      name: "C",
      target: 50,
      color: "#475569",
      bg: "#f1f5f9",
      border: "#e2e8f0",
    },
  ];

  /**
   * Injects Attendance-matched typography, badges, and floating tooltip styles.
   */
  function injectAttendanceTheme() {
    if (document.getElementById(SP_INTERNALS_THEME_ID)) return;

    const style = document.createElement("style");
    style.id = SP_INTERNALS_THEME_ID;
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');

      /* Scoped Card Container */
      .sp-internals-card {
        font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 12px !important;
        overflow: visible !important; /* Never clip modal dialogs, popovers, or dropdowns */
        background: #ffffff !important;
        margin-top: 18px !important;
        margin-bottom: 28px !important;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04) !important;
      }

      /* Spacious Attendance Table Layout */
      table.sp-internals-table {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        border: 1px solid #cbd5e1 !important;
        font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        background: #ffffff !important;
        margin: 0 !important;
      }

      /* Light Slate Table Header matching Attendance */
      table.sp-internals-table thead th,
      table.sp-internals-table tr.sp-header-row th,
      table.sp-internals-table tr.sp-header-row td {
        background: #f1f5f9 !important;
        color: #1e293b !important;
        font-weight: 700 !important;
        font-size: 11.5px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
        padding: 13px 14px !important;
        border: 1px solid #cbd5e1 !important;
        text-align: center !important;
        vertical-align: middle !important;
        white-space: nowrap !important;
      }

      /* Table Body Cells */
      table.sp-internals-table tbody td {
        border: 1px solid #e2e8f0 !important;
        padding: 11px 13px !important;
        vertical-align: middle !important;
        text-align: center !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        color: #334155 !important;
        background-color: #ffffff !important;
        line-height: 1.3 !important;
        transition: background-color 0.15s ease !important;
      }

      table.sp-internals-table tbody tr:hover td {
        background-color: #f8fafc !important;
      }

      /* Course Identity Cell */
      table.sp-internals-table tbody td.sp-course-identity-cell {
        background-color: #f8fafc !important;
        text-align: center !important;
        padding: 10px 14px !important;
        vertical-align: middle !important;
      }

      /* Code Badge */
      .sp-int-code-badge {
        font-size: 11px !important;
        font-weight: 700 !important;
        padding: 3px 9px !important;
        border-radius: 5px !important;
        letter-spacing: 0.03em !important;
        display: inline-block !important;
        line-height: 1.2 !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
        margin: 0 auto !important;
        text-align: center !important;
      }

      /* Description Cell */
      table.sp-internals-table tbody td.sp-title-styled {
        text-align: center !important;
        vertical-align: middle !important;
      }

      /* Description Title */
      .sp-int-title-text {
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #0f172a !important;
        display: block !important;
        line-height: 1.35 !important;
        text-align: center !important;
        margin: 0 auto !important;
      }

      /* Mark / Max. Mark Metric Badge (White box, bold text, split colors) */
      .sp-int-metric-mark {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 52px !important;
        padding: 3.5px 10px !important;
        border-radius: 6px !important;
        font-family: inherit !important;
        line-height: 1.2 !important;
        background-color: #ffffff !important;
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
        white-space: nowrap !important;
      }

      .sp-int-metric-mark .sp-mark-left {
        font-weight: 800 !important;
        font-size: 13.5px !important;
        line-height: 1 !important;
        letter-spacing: -0.01em !important;
      }

      .sp-int-metric-mark .sp-mark-slash {
        color: #64748b !important;
        font-weight: 700 !important;
        font-size: 12px !important;
        margin: 0 2px !important;
        line-height: 1 !important;
      }

      .sp-int-metric-mark .sp-mark-right {
        color: #0f172a !important;
        font-weight: 700 !important;
        font-size: 11.5px !important;
        line-height: 1 !important;
      }

      /* Marks Lost Cell */
      .sp-int-lost-cell {
        min-width: 145px !important;
        text-align: center !important;
        white-space: nowrap !important;
        padding: 6px 8px !important;
      }

      /* Target Marks Cell */
      .sp-int-forecast-cell {
        min-width: 240px !important;
        text-align: center !important;
        white-space: nowrap !important;
        padding: 6px 8px !important;
      }

      /* View Details Cell (Last column) */
      .sp-int-view-cell {
        min-width: 125px !important;
        text-align: center !important;
        vertical-align: middle !important;
        white-space: nowrap !important;
        padding: 8px 12px !important;
        pointer-events: auto !important;
      }

      /* View Details Button matching Attendance Button style */
      .sp-btn-view-details {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 5px !important;
        padding: 6px 14px !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        border-radius: 6px !important;
        color: #0d1938 !important;
        background-color: #e8ecf5 !important;
        border: 1px solid #b8c2d9 !important;
        cursor: pointer !important;
        letter-spacing: 0.02em !important;
        text-decoration: none !important;
        transition: all 0.15s ease !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
        vertical-align: middle !important;
        margin: 0 auto !important;
        pointer-events: auto !important;
        position: relative !important;
        z-index: 1 !important;
      }

      .sp-btn-view-details:hover {
        background-color: #b8c2d9 !important;
        color: #0d1938 !important;
        border-color: #b8c2d9 !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 2px 5px rgba(19, 36, 80, 0.15) !important;
      }

      /* Minimal Info Icon in Header (Pure icon trigger, no button box/circle) */
      .sp-int-info-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 0 1px !important;
        margin: 0 !important;
        cursor: pointer !important;
        color: #132450 !important;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
        line-height: 1 !important;
        box-shadow: none !important;
        outline: none !important;
        vertical-align: middle !important;
      }

      .sp-int-info-btn:hover,
      .sp-int-info-btn:focus {
        color: #0d1938 !important;
        background: transparent !important;
        border: none !important;
        transform: scale(1.15) !important;
        box-shadow: none !important;
      }

      /* Minimal Yellow Triangle Warning Icon in Header */
      .sp-int-warn-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 0 1px !important;
        margin: 0 !important;
        cursor: pointer !important;
        color: #ca8a04 !important;
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
        line-height: 1 !important;
        box-shadow: none !important;
        outline: none !important;
        vertical-align: middle !important;
      }

      .sp-int-warn-btn:hover,
      .sp-int-warn-btn:focus {
        color: #745900 !important;
        background: transparent !important;
        border: none !important;
        transform: scale(1.15) !important;
        box-shadow: none !important;
      }

      /* Target Marks Header & Toggle Button Group */
      .sp-int-forecast-head {
        vertical-align: middle !important;
        text-align: center !important;
      }

      .sp-int-forecast-head-inner {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 3px !important;
        margin: 0 auto !important;
      }

      .sp-int-target-toggle-group {
        display: inline-flex !important;
        align-items: center !important;
        background: #e2e8f0 !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 6px !important;
        padding: 2px !important;
        gap: 2px !important;
        margin-top: 3px !important;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04) !important;
      }

      .sp-target-btn {
        font-family: inherit !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        padding: 2.5px 8px !important;
        border: none !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        text-transform: none !important;
        line-height: 1.15 !important;
        letter-spacing: 0.01em !important;
        transition: all 0.15s ease !important;
        background: transparent !important;
        color: #475569 !important;
        outline: none !important;
        white-space: nowrap !important;
      }

      .sp-target-btn:hover {
        background: #f8fafc !important;
        color: #0f172a !important;
      }

      .sp-target-btn.active {
        background: #0d1938 !important;
        color: #ffffff !important;
        font-weight: 800 !important;
        box-shadow: 0 1px 3px rgba(67, 56, 202, 0.3) !important;
      }

      /* Global Floating Tooltip (Attached to body - never clipped by table overflow) */
      .sp-int-global-tooltip {
        position: fixed !important;
        width: 345px !important;
        max-width: calc(100vw - 20px) !important;
        padding: 13px 15px !important;
        background: #ffffff !important;
        border: 1.5px dotted #94a3b8 !important;
        border-radius: 12px !important;
        box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04) !important;
        color: #1e293b !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: auto !important;
        transition: opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1), transform 0.18s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.18s !important;
        transform: translateY(6px) !important;
        z-index: 2147483647 !important;
        text-align: left !important;
        white-space: normal !important;
        font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        box-sizing: border-box !important;
      }

      .sp-int-global-tooltip.sp-tooltip-visible {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateY(0) !important;
      }

      /* Breakdown Table inside View Details */
      table.sp-details-breakdown-table {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        border: 1px solid #cbd5e1 !important;
        font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        background: #ffffff !important;
        border-radius: 8px !important;
        margin: 10px 0 !important;
      }

      table.sp-details-breakdown-table thead th {
        background: #f1f5f9 !important;
        color: #1e293b !important;
        font-weight: 700 !important;
        font-size: 11.5px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
        padding: 11px 14px !important;
        border: 1px solid #cbd5e1 !important;
        text-align: center !important;
        vertical-align: middle !important;
        white-space: nowrap !important;
      }

      table.sp-details-breakdown-table tbody td {
        border: 1px solid #e2e8f0 !important;
        padding: 10px 12px !important;
        vertical-align: middle !important;
        font-size: 12.5px !important;
        color: #334155 !important;
        background-color: #ffffff !important;
        transition: background-color 0.15s ease !important;
      }

      table.sp-details-breakdown-table tbody tr:hover td {
        background-color: #f8fafc !important;
      }

      /* Light Yellow colored box for Date in View Details */
      .sp-details-date-badge {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        padding: 4px 12px !important;
        border-radius: 6px !important;
        background-color: #fff4c2 !important; /* Soft light yellow box */
        border: 1px solid #F4C542 !important; /* Soft yellow border */
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #5c4500 !important; /* Warm amber text */
        white-space: nowrap !important;
        box-shadow: 0 1px 2px rgba(133, 77, 14, 0.08) !important;
        margin: 0 auto !important;
        letter-spacing: 0.01em !important;
      }

      .sp-details-date-badge span {
        color: #5c4500 !important;
        font-weight: 700 !important;
      }

      .sp-details-date-badge svg {
        stroke: #745900 !important;
      }

      /* Blue colored box for Component in View Details (Center Aligned) */
      .sp-details-component-badge {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        padding: 5px 14px !important;
        border-radius: 6px !important;
        background-color: #e0f2fe !important;
        border: 1px solid #b8c2d9 !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #0d1938 !important;
        line-height: 1.3 !important;
        box-shadow: 0 1px 2px rgba(3, 105, 161, 0.08) !important;
        margin: 0 auto !important;
      }

      /* Modal card styling */
      .sp-details-modal-styled {
        border-radius: 12px !important;
        border: 1px solid #cbd5e1 !important;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12) !important;
      }
    `;
    document.head.appendChild(style);
  }

  let tooltipHideTimeout = null;

  /**
   * Creates or gets the global floating tooltip for target marks formulas:
   * Both 100 Marks (New Batch - Batch '30 onwards) and 75 Marks (Till Batch '29).
   */
  function createOrGetGlobalTooltip() {
    let tt = document.getElementById("sp-internals-global-tooltip");
    if (!tt) {
      tt = document.createElement("div");
      tt.id = "sp-internals-global-tooltip";
      tt.className = "sp-int-global-tooltip";
      document.body.appendChild(tt);

      tt.addEventListener("mouseenter", () => {
        if (tooltipHideTimeout) {
          clearTimeout(tooltipHideTimeout);
          tooltipHideTimeout = null;
        }
        tt.classList.add("sp-tooltip-visible");
      });
      tt.addEventListener("mouseleave", () => {
        tooltipHideTimeout = setTimeout(() => {
          hideFormulaTooltip();
        }, 150);
      });
    }

    const logoIconUrl =
      typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("icons/academia-prime-logo.png")
        : "icons/academia-prime-logo.png";

    tt.innerHTML = `
      <!-- Tooltip Header with Extension Favicon Logo -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 9px; padding-bottom: 7px; border-bottom: 1.5px dotted #cbd5e1;">
        <img src="${logoIconUrl}" width="18" height="18" style="border-radius: 4px; display: block; flex-shrink: 0;" alt="Academia Prime" />
        <span style="font-size: 12.5px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">Target Marks Guide</span>
      </div>

      <!-- 100 Marks Card (New Batch - Batch 30 onwards) -->
      <div style="background: #f0fdf4; border: 1.5px dotted #86efac; border-radius: 9px; padding: 10px 11px; margin-bottom: 9px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
          <span style="background: #e8ecf5; color: #0d1938; border: 1px dotted #818cf8; font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px;">
            Total 100 Marks in End Semester Paper
          </span>
          <span style="background: #dcfce7; color: #166534; border: 1px dotted #86efac; font-size: 9.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">
            Batch '30 onwards
          </span>
        </div>
        <div style="font-size: 10px; color: #065f46; font-weight: 700; margin-bottom: 5px;">
          50 Internals + 50 End-Sem (100 Mark Exam Paper)
        </div>
        <div style="background: #ffffff; border: 1.5px dotted #86efac; border-radius: 6px; padding: 6px 8px; font-family: 'Plus Jakarta Sans', monospace; font-size: 11px; font-weight: 800; color: #064e3b; text-align: center;">
          (Target Grade &minus; Internals) &times; 2
          <span style="font-size: 9.5px; font-weight: 600; color: #059669; margin-left: 5px;">[scale: &times; 100/50]</span>
        </div>
        <!-- Yellow Box for 100 Marks -->
        <div style="background: #fff4c2; border: 1.5px dotted #F4C542; border-radius: 6px; padding: 5px 9px; margin-top: 6px; font-size: 9.5px; font-weight: 700; color: #5c4500; text-align: center;">
          100 Marks is for Batch '30 onwards
        </div>
        <div style="font-size: 9px; color: #047857; margin-top: 5px; font-weight: 600;">
          • Target chips appear when internal marks reach 50 or 100 total.
        </div>
      </div>

      <!-- 75 Marks Card (Till Batch 29) -->
      <div style="background: #fffaf0; border: 1.5px dotted #F4C542; border-radius: 9px; padding: 10px 11px; margin-bottom: 9px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
          <span style="background: #fff4c2; color: #9a7200; border: 1px dotted #F4C542; font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px;">
            Total 75 Marks in End Semester Paper
          </span>
          <span style="background: #f1f5f9; color: #334155; border: 1px dotted #cbd5e1; font-size: 9.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">
            Till Batch '29
          </span>
        </div>
        <div style="font-size: 10px; color: #9a7200; font-weight: 700; margin-bottom: 5px;">
          60 Internals + 40 End-Sem (75 Mark Exam Paper)
        </div>
        <div style="background: #ffffff; border: 1.5px dotted #F4C542; border-radius: 6px; padding: 6px 8px; font-family: 'Plus Jakarta Sans', monospace; font-size: 11px; font-weight: 800; color: #5c4500; text-align: center;">
          (Target Grade &minus; Internals) &times; 75 &divide; 40
        </div>
        <!-- Yellow Box for 75 Marks -->
        <div style="background: #fff4c2; border: 1.5px dotted #F4C542; border-radius: 6px; padding: 5px 9px; margin-top: 6px; font-size: 9.5px; font-weight: 700; color: #5c4500; text-align: center;">
          75 Marks is for till Batch '29
        </div>
        <div style="font-size: 9px; color: #9a7200; margin-top: 5px; font-weight: 600;">
          • Target chips appear when internal marks reach 60 or 100 total.
        </div>
      </div>

      <!-- Target Grade Thresholds Footer -->
      <div style="background: #f8fafc; border: 1.5px dotted #cbd5e1; border-radius: 8px; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px;">
        <div style="font-size: 9px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; text-align: center;">Target Grade Thresholds</div>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 3px;">
          <span style="background: #dcfce7; color: #15803d; border: 1px dotted #86efac; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">O: 91</span>
          <span style="background: #e8ecf5; color: #132450; border: 1px dotted #93c5fd; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">A+: 81</span>
          <span style="background: #cffafe; color: #0e7490; border: 1px dotted #67e8f9; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">A: 71</span>
          <span style="background: #ffedd5; color: #9a7200; border: 1px dotted #fdba74; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">B+: 61</span>
          <span style="background: #fff4c2; color: #745900; border: 1px dotted #F4C542; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">B: 56</span>
          <span style="background: #f1f5f9; color: #475569; border: 1px dotted #cbd5e1; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px;">C: 50</span>
        </div>
      </div>
    `;

    return tt;
  }

  function showFormulaTooltip(triggerEl) {
    if (tooltipHideTimeout) {
      clearTimeout(tooltipHideTimeout);
      tooltipHideTimeout = null;
    }
    const tt = createOrGetGlobalTooltip();
    const rect = triggerEl.getBoundingClientRect();
    const tooltipWidth = 345;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    let top = rect.bottom + 8;
    if (top + 345 > window.innerHeight && rect.top > 345) {
      top = rect.top - 340;
    }

    tt.style.left = `${Math.round(left)}px`;
    tt.style.top = `${Math.round(top)}px`;
    tt.classList.add("sp-tooltip-visible");
  }

  function hideFormulaTooltip() {
    const tt = document.getElementById("sp-internals-global-tooltip");
    if (tt) {
      tt.classList.remove("sp-tooltip-visible");
    }
  }

  let warnTooltipHideTimeout = null;

  /**
   * Creates or gets the warning notice floating tooltip:
   * Explains that partial mark uploads may cause minor calculation variance (<0.01%),
   * with guaranteed fast fixes after the semester's last working day.
   */
  function createOrGetWarningTooltip() {
    let tt = document.getElementById("sp-internals-warning-tooltip");
    if (!tt) {
      tt = document.createElement("div");
      tt.id = "sp-internals-warning-tooltip";
      tt.className = "sp-int-global-tooltip";
      document.body.appendChild(tt);

      tt.addEventListener("mouseenter", () => {
        if (warnTooltipHideTimeout) {
          clearTimeout(warnTooltipHideTimeout);
          warnTooltipHideTimeout = null;
        }
        tt.classList.add("sp-tooltip-visible");
      });
      tt.addEventListener("mouseleave", () => {
        warnTooltipHideTimeout = setTimeout(() => {
          hideWarningTooltip();
        }, 150);
      });
    }

    const logoIconUrl =
      typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("icons/academia-prime-logo.png")
        : "icons/academia-prime-logo.png";

    tt.innerHTML = `
      <!-- Tooltip Header with Same Yellow Triangle Icon -->
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 9px; padding-bottom: 7px; border-bottom: 1.5px dotted #cbd5e1;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F4C542" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; display: block;">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span style="font-size: 12.5px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em;">A Small Note</span>
      </div>

      <!-- Note Body with Dotted Border -->
      <div style="background: #fffaf0; border: 1.5px dotted #F4C542; border-radius: 8px; padding: 10px 12px;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 500; color: #5c4500; line-height: 1.5;">
          Due to recent updates in the <strong>End Semester Exam Marks Pattern</strong>, calculations might have minor discrepancies (though most probably none). If any error occurs, I will <strong>fix it ASAP</strong> after the last working day once full internals are updated.
        </p>
        <p style="margin: 0; font-size: 10.5px; font-weight: 600; color: #9a7200; line-height: 1.45; border-top: 1px dotted #F4C542; padding-top: 6px;">
          You can always report any bugs or issues - I will gladly take a look!
        </p>
      </div>
    `;

    return tt;
  }

  function showWarningTooltip(triggerEl) {
    if (warnTooltipHideTimeout) {
      clearTimeout(warnTooltipHideTimeout);
      warnTooltipHideTimeout = null;
    }
    const tt = createOrGetWarningTooltip();
    const rect = triggerEl.getBoundingClientRect();
    const tooltipWidth = 345;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    let top = rect.bottom + 8;
    if (top + 280 > window.innerHeight && rect.top > 280) {
      top = rect.top - 275;
    }

    tt.style.left = `${Math.round(left)}px`;
    tt.style.top = `${Math.round(top)}px`;
    tt.classList.add("sp-tooltip-visible");
  }

  function hideWarningTooltip() {
    const tt = document.getElementById("sp-internals-warning-tooltip");
    if (tt) {
      tt.classList.remove("sp-tooltip-visible");
    }
  }

  /**
   * Strictly determines if the current page or table belongs to Attendance ("COURSE WISE ATTENDANCE").
   * We MUST NEVER modify or touch anything on the Attendance page.
   */
  function isAttendancePage(tbl) {
    // 1. Check URL hash or path
    const currentHash = (window.location.hash || "").toLowerCase();
    const currentPath = window.location.pathname.toLowerCase();
    if (
      currentHash.includes("attendance") ||
      currentPath.includes("attendance")
    ) {
      return true;
    }

    // 2. Check active navigation or sidebar
    const activeMenus = document.querySelectorAll(
      "li.active, a.active, .nav-item.active, .menu-item.active, .active > a",
    );
    for (const menu of activeMenus) {
      const menuText = (menu.innerText || menu.textContent || "")
        .toLowerCase()
        .trim();
      if (menuText.includes("attendance")) {
        return true;
      }
    }

    // 3. Check page headings specifically for Course Wise Attendance
    const headings = document.querySelectorAll(
      "#divMainDetails h1, #divMainDetails h2, #divMainDetails h3, #divMainDetails .page-header, #divMainDetails .page-title, .breadcrumb",
    );
    for (const h of headings) {
      const hText = (h.innerText || h.textContent || "").toLowerCase().trim();
      if (
        hText.includes("course wise attendance") ||
        hText.includes("attendance details") ||
        hText === "attendance"
      ) {
        return true;
      }
    }

    if (!tbl) {
      // Check if attendance table exists in main container
      const attTable = document.querySelector("#divMainDetails table");
      if (attTable) {
        const head =
          attTable.querySelector("thead tr") ||
          attTable.querySelector("tr:first-child");
        if (head) {
          const ht = (head.innerText || "").toLowerCase();
          if (
            (ht.includes("max. hours") || ht.includes("hours conducted")) &&
            (ht.includes("att. hours") ||
              ht.includes("present") ||
              ht.includes("%"))
          ) {
            return true;
          }
        }
      }
      return false;
    }

    // 4. Check table header specifically for attendance
    const headerRow =
      tbl.querySelector("thead tr") || tbl.querySelector("tr:first-child");
    if (headerRow) {
      const headText = (
        headerRow.innerText ||
        headerRow.textContent ||
        ""
      ).toLowerCase();
      if (
        (headText.includes("max. hours") ||
          headText.includes("hours conducted") ||
          headText.includes("conducted")) &&
        (headText.includes("att. hours") ||
          headText.includes("hours attended") ||
          headText.includes("absent") ||
          headText.includes("percentage") ||
          headText.includes("%"))
      ) {
        return true;
      }
    }

    const tblText = (tbl.innerText || tbl.textContent || "").toLowerCase();
    if (tblText.includes("max. hours") && tblText.includes("att. hours")) {
      return true;
    }

    return false;
  }

  /**
   * Strictly determines if the current page or table belongs to "SRM Policy".
   * Never matches the "Internal Mark Details" page.
   */
  function isSrmPolicyContext(tbl) {
    // If the page or table explicitly says "Internal Mark Details" or "Internal Marks", it is NEVER policy!
    const pageTextSnippet = (
      (document.querySelector(
        "#divMainDetails .page-title, #divMainDetails .page-header, #divMainDetails h1, #divMainDetails h2, #divMainDetails h3, .breadcrumb",
      )?.innerText || "") +
      " " +
      (window.location.hash || "")
    ).toLowerCase();

    if (
      pageTextSnippet.includes("internal mark details") ||
      pageTextSnippet.includes("internal mark") ||
      pageTextSnippet.includes("internal marks")
    ) {
      return false;
    }

    // 1. Check URL hash specifically for policy
    const currentHash = (window.location.hash || "").toLowerCase();
    if (
      currentHash.includes("srmpolicy") ||
      currentHash.includes("srm_policy") ||
      currentHash === "#policy"
    ) {
      return true;
    }

    // 2. Check active navigation menu - specifically for "SRM Policy"
    const activeMenus = document.querySelectorAll(
      "li.active, a.active, .nav-item.active, .menu-item.active, .active > a",
    );
    for (const menu of activeMenus) {
      const menuText = (menu.innerText || menu.textContent || "")
        .toLowerCase()
        .trim();
      if (
        menuText === "srm policy" ||
        menuText.includes("srm policy") ||
        menuText === "academic policy"
      ) {
        return true;
      }
    }

    // 3. Check page headings specifically for "SRM Policy"
    const headings = document.querySelectorAll(
      "#divMainDetails h1, #divMainDetails h2, #divMainDetails h3, #divMainDetails .page-header, #divMainDetails .page-title, .breadcrumb",
    );
    for (const h of headings) {
      const hText = (h.innerText || h.textContent || "").toLowerCase().trim();
      if (
        hText === "srm policy" ||
        hText.includes("srm policy") ||
        hText.includes("academic policy")
      ) {
        return true;
      }
    }

    if (!tbl) return false;

    // 4. Check if table specifically has caption or header for policy
    const caption = tbl.querySelector("caption");
    if (caption) {
      const capText = (caption.innerText || "").toLowerCase();
      if (
        capText.includes("srm policy") ||
        capText.includes("academic policy")
      ) {
        return true;
      }
    }

    const tblText = (tbl.innerText || tbl.textContent || "").toLowerCase();
    if (tblText.includes("srm policy") || tblText.includes("academic policy")) {
      return true;
    }

    return false;
  }

  /**
   * Strictly determines if a table or current page context belongs to
   * "Grade / Mark Obtained" (End Semester Exam Grades / Credits / GPA).
   * We MUST NEVER modify or touch anything in Grade / Mark Obtained.
   */
  function isGradeMarkObtainedContext(tbl) {
    // 1. Check current URL hash
    const currentHash = (window.location.hash || "").toLowerCase();
    if (
      currentHash.includes("grademark") ||
      currentHash.includes("grade_mark")
    ) {
      return true;
    }

    // 2. Check active navigation or sidebar shortcut
    const activeMenus = document.querySelectorAll(
      "li.active, a.active, .nav-item.active, .menu-item.active, .active > a",
    );
    for (const menu of activeMenus) {
      const menuText = (menu.innerText || menu.textContent || "")
        .toLowerCase()
        .trim();
      if (
        menuText.includes("grade / mark obtained") ||
        menuText.includes("grade/mark obtained") ||
        menuText.includes("grade / marks obtained") ||
        menuText.includes("grade obtained") ||
        menuText.includes("mark obtained")
      ) {
        return true;
      }
    }

    // 3. Check page headings
    const headings = document.querySelectorAll(
      "#divMainDetails h1, #divMainDetails h2, #divMainDetails h3, #divMainDetails .page-header, #divMainDetails .page-title, .breadcrumb",
    );
    for (const h of headings) {
      const hText = (h.innerText || h.textContent || "").toLowerCase().trim();
      if (
        hText.includes("grade / mark obtained") ||
        hText.includes("grade/mark obtained") ||
        hText.includes("grade / marks obtained") ||
        hText.includes("grade obtained") ||
        hText.includes("mark obtained")
      ) {
        return true;
      }
    }

    if (!tbl) return false;

    // 4. Check table header row specifically
    const headerRow =
      tbl.querySelector("thead tr") || tbl.querySelector("tr:first-child");
    if (headerRow) {
      const headText = (
        headerRow.innerText ||
        headerRow.textContent ||
        ""
      ).toLowerCase();
      if (
        (headText.includes("grade") || headText.includes("letter")) &&
        (headText.includes("credit") ||
          headText.includes("obtained") ||
          headText.includes("point"))
      ) {
        return true;
      }
    }

    // 5. Check table's own text
    const tblText = (tbl.innerText || tbl.textContent || "").toLowerCase();
    if (
      tblText.includes("grade / mark obtained") ||
      tblText.includes("grade/mark obtained") ||
      tblText.includes("letter grade") ||
      tblText.includes("grade point")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Strictly determines whether the current page context is the "Internal Mark Details" page.
   * The extension UI MUST ONLY be added here.
   * On any other page (e.g. SRM Policy, Grade / Mark Obtained, Attendance, Timetable, etc.),
   * all modifications are strictly removed.
   */
  function isInternalMarksPage() {
    // 1. Strictly reject Attendance, SRM Policy and Grade / Mark Obtained immediately
    if (isAttendancePage()) return false;
    if (isSrmPolicyContext()) return false;
    if (isGradeMarkObtainedContext()) return false;

    const currentHash = (window.location.hash || "").toLowerCase();
    const currentPath = window.location.pathname.toLowerCase();

    // Check active navigation menu items
    const activeMenus = document.querySelectorAll(
      "li.active, a.active, .nav-item.active, .menu-item.active, .active > a",
    );
    let activeNavText = "";
    for (const menu of activeMenus) {
      activeNavText +=
        " " + (menu.innerText || menu.textContent || "").toLowerCase().trim();
    }

    // Check page headings and breadcrumbs
    const headings = document.querySelectorAll(
      "#divMainDetails h1, #divMainDetails h2, #divMainDetails h3, #divMainDetails h4, #divMainDetails h5, #divMainDetails .page-header, #divMainDetails .page-title, #divMainDetails .card-title, #divMainDetails .panel-title, .breadcrumb, h1, h2, h3",
    );
    let headingText = "";
    for (const h of headings) {
      headingText +=
        " " + (h.innerText || h.textContent || "").toLowerCase().trim();
    }

    // Positive indicators for "Internal Mark Details"
    const hasInternalHeading =
      headingText.includes("internal mark details") ||
      headingText.includes("internal mark") ||
      headingText.includes("internal marks") ||
      headingText.includes("internals");

    const hasInternalNav =
      activeNavText.includes("internal mark details") ||
      activeNavText.includes("internal mark") ||
      activeNavText.includes("internal marks") ||
      activeNavText.includes("internals");

    const hasInternalUrl =
      currentHash.includes("internal") || currentPath.includes("internal");

    const hasStackedActive =
      document.querySelector(".sp-stacked-marks.sp-stacked-active") !== null;

    // Reject other known sections if they are active
    const isOtherKnownSection =
      activeNavText.includes("attendance") ||
      activeNavText.includes("timetable") ||
      activeNavText.includes("time table") ||
      activeNavText.includes("fee") ||
      activeNavText.includes("feedback") ||
      activeNavText.includes("registration") ||
      activeNavText.includes("srm policy") ||
      activeNavText.includes("grade / mark obtained") ||
      headingText.includes("course wise attendance") ||
      headingText.includes("attendance details") ||
      headingText.includes("attendance") ||
      headingText.includes("time table details") ||
      headingText.includes("srm policy") ||
      headingText.includes("grade / mark obtained");

    if (isOtherKnownSection && !hasInternalHeading && !hasInternalNav) {
      return false;
    }

    // Verify presence of true Internal Marks table inside #divMainDetails or page
    const mainTables = document.querySelectorAll(
      "#divMainDetails table, table",
    );
    let foundValidInternalTable = false;

    for (const tbl of mainTables) {
      if (tbl.closest(".modal, .modal-dialog, .modal-content, [id*='modal' i]"))
        continue;
      if (isSrmPolicyContext(tbl)) continue;
      if (isGradeMarkObtainedContext(tbl)) continue;

      const tblText = (tbl.innerText || tbl.textContent || "").toLowerCase();
      // Must not contain Attendance or Grade headers
      if (
        tblText.includes("max. hours") ||
        tblText.includes("hours conducted") ||
        tblText.includes("att. hours") ||
        tblText.includes("grade / mark obtained") ||
        tblText.includes("letter grade")
      ) {
        continue;
      }

      const rows = tbl.querySelectorAll("tr");
      if (rows.length < 2) continue;
      const head = tbl.querySelector("thead tr") || rows[0];
      const headText = (head.innerText || head.textContent || "").toLowerCase();

      // Course columns and Mark / Max. Mark columns
      const hasCourse =
        headText.includes("code") ||
        headText.includes("description") ||
        headText.includes("course") ||
        headText.includes("subject");
      const hasMarks = headText.includes("mark") || headText.includes("max");

      // Verify row contains View Details buttons
      let viewDetailsFound = false;
      for (let i = 1; i < Math.min(rows.length, 6); i++) {
        if (getViewDetailsCell(rows[i])) {
          viewDetailsFound = true;
          break;
        }
      }

      if (hasCourse && hasMarks && viewDetailsFound) {
        foundValidInternalTable = true;
        break;
      }
    }

    if (foundValidInternalTable) {
      return true;
    }

    if (
      (hasInternalHeading ||
        hasInternalNav ||
        hasInternalUrl ||
        hasStackedActive) &&
      foundValidInternalTable
    ) {
      return true;
    }

    if (hasInternalHeading || hasInternalNav) {
      return true;
    }

    return false;
  }

  /**
   * Strictly removes ALL extension UI changes from non-internal marks pages
   * (e.g. SRM Policy, Grade / Mark Obtained, Attendance, Timetable, etc.).
   * Restores original DOM structure, tables, cells, and buttons.
   */
  function cleanupAllNonInternalPages() {
    // Safety check: Never run cleanup if user is on the Attendance page
    if (isAttendancePage()) {
      return;
    }

    // 1. Remove all injected column headers
    document
      .querySelectorAll(
        ".sp-int-lost-col, .sp-int-forecast-col, .sp-int-lost-head, .sp-int-forecast-head",
      )
      .forEach((el) => el.remove());

    // 2. Remove all injected cells
    document
      .querySelectorAll(".sp-int-lost-cell, .sp-int-forecast-cell")
      .forEach((el) => el.remove());

    // 3. Remove all internal course code badge wrappers and restore plain text (NEVER touch attendance!)
    document.querySelectorAll(".sp-int-code-badge").forEach((badge) => {
      const parent = badge.parentNode;
      if (parent) {
        const text = badge.innerText || badge.textContent || "";
        parent.textContent = text;
      }
    });

    // 4. Remove all description title wrappers and restore plain text
    document.querySelectorAll(".sp-int-title-text").forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        const text = span.innerText || span.textContent || "";
        parent.textContent = text;
      }
    });

    // 5. Remove all metric mark wrappers and restore plain text
    document.querySelectorAll(".sp-int-metric-mark").forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        const text = span.innerText || span.textContent || "";
        parent.textContent = text;
      }
    });

    // 6. Remove all View Details date badges and component badges
    document
      .querySelectorAll(".sp-details-date-badge, .sp-details-component-badge")
      .forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          const text = el.innerText || el.textContent || "";
          parent.textContent = text;
        }
      });

    // 7. Remove extension classes ONLY belonging to sp_internals.js (NEVER touch attendance classes!)
    document
      .querySelectorAll(".sp-internals-table, .sp-details-breakdown-table")
      .forEach((tbl) => {
        tbl.classList.remove(
          "sp-internals-table",
          "sp-details-breakdown-table",
        );
      });
    document
      .querySelectorAll(".sp-internals-card, .sp-details-modal-styled")
      .forEach((card) => {
        card.classList.remove("sp-internals-card", "sp-details-modal-styled");
      });
    document
      .querySelectorAll(
        ".sp-course-identity-cell, .sp-title-styled, .sp-mark-styled, .sp-int-view-cell, .sp-int-view-col",
      )
      .forEach((cell) => {
        cell.classList.remove(
          "sp-course-identity-cell",
          "sp-title-styled",
          "sp-mark-styled",
          "sp-int-view-cell",
          "sp-int-view-col",
        );
        cell.removeAttribute("style");
      });
    document.querySelectorAll(".sp-btn-view-details").forEach((btn) => {
      btn.classList.remove("sp-btn-view-details");
      btn.removeAttribute("style");
    });

    // 8. Hide/remove floating tooltips
    const tooltip = document.getElementById("sp-internals-global-tooltip");
    if (tooltip) {
      tooltip.remove();
    }
    const warnTooltip = document.getElementById("sp-internals-warning-tooltip");
    if (warnTooltip) {
      warnTooltip.remove();
    }

    // 9. Remove injected internal marks stylesheet so NO styles leak onto other pages
    const themeStyle =
      document.getElementById(SP_INTERNALS_THEME_ID) ||
      document.getElementById("sp-internals-theme");
    if (themeStyle) {
      themeStyle.remove();
    }
  }

  /**
   * Cleans up and strips any injected elements/classes if a table
   * in the "Grade / Mark Obtained" section was previously touched.
   */
  function cleanupGradeMarkObtainedTables() {
    cleanupAllNonInternalPages();
  }

  /**
   * Determines if a table is the main Internal Marks table.
   * Strictly ignores:
   * - SRM Policy section & tables (NEVER touch SRM Policy)
   * - Grade / Mark Obtained section & tables (NEVER touch Grade / Mark Obtained)
   * - Attendance tables
   * - Exam Inspect datesheets
   * - Any modal/dialog/popup opened by "View Details"
   * - Any nested breakdown tables
   */
  function isInternalMarksTable(tbl) {
    if (!tbl) return false;

    // Strictly NEVER modify anything in Attendance
    if (isAttendancePage(tbl)) {
      return false;
    }

    // Strictly ONLY enhance when user is on Internal Marks page
    if (!isInternalMarksPage()) {
      return false;
    }

    // Strictly NEVER modify anything in SRM Policy
    if (isSrmPolicyContext(tbl)) {
      return false;
    }

    // Strictly NEVER modify anything in Grade / Mark Obtained
    if (isGradeMarkObtainedContext(tbl)) {
      return false;
    }

    // Strictly NEVER enhance tables inside modals, dialogs, popups, or detail views
    if (
      tbl.closest(
        ".modal, .modal-dialog, .modal-content, .modal-body, [role='dialog'], #modal, [id*='modal' i], [class*='modal' i], .ui-dialog, .popover, [id*='detail' i]:not(#divMainDetails), [class*='detail' i]:not(#divMainDetails), .collapse, tr.details",
      )
    ) {
      return false;
    }

    // Reject nested tables
    if (tbl.parentElement && tbl.parentElement.closest("table")) {
      return false;
    }

    // Reject tables with Attendance headers or Exam Inspect
    const text = (tbl.innerText || tbl.textContent || "").toLowerCase();
    if (
      text.includes("max. hours") ||
      text.includes("hours conducted") ||
      text.includes("att. hours") ||
      text.includes("absent hours") ||
      text.includes("total percentage") ||
      text.includes("srm policy") ||
      text.includes("academic policy")
    ) {
      return false;
    }
    if (
      tbl.closest("#spExamInspectModalCard, .sp-exam-modal-card") ||
      text.includes("hidden datesheet")
    ) {
      return false;
    }

    // Must have at least 2 rows
    const rows = tbl.querySelectorAll("tr");
    if (rows.length < 2) return false;

    // Reject breakdown assessment tables
    const firstRow = tbl.querySelector("thead tr") || rows[0];
    if (firstRow) {
      const headText = (
        firstRow.innerText ||
        firstRow.textContent ||
        ""
      ).toLowerCase();
      if (
        headText.includes("component") ||
        headText.includes("assessment name") ||
        headText.includes("test date") ||
        headText.includes("split up") ||
        headText.includes("breakdown") ||
        headText.includes("assignment") ||
        headText.includes("periodical") ||
        headText.includes("cycle test")
      ) {
        return false;
      }

      // Reject Grade / Mark Obtained headers
      if (
        headText.includes("grade") ||
        headText.includes("credit") ||
        headText.includes("obtained") ||
        headText.includes("result") ||
        headText.includes("letter")
      ) {
        return false;
      }
    }

    // Must have a View Details button cell in its rows to confirm it is the Internal Marks table
    let hasViewDetails = false;
    for (let i = 1; i < Math.min(rows.length, 6); i++) {
      if (getViewDetailsCell(rows[i])) {
        hasViewDetails = true;
        break;
      }
    }

    // Header check
    if (firstRow) {
      const headText = (
        firstRow.innerText ||
        firstRow.textContent ||
        ""
      ).toLowerCase();
      const hasCourse =
        headText.includes("code") ||
        headText.includes("course") ||
        headText.includes("subject") ||
        headText.includes("description") ||
        headText.includes("title");
      const hasInternalMarks =
        (headText.includes("mark") || headText.includes("max")) &&
        (headText.includes("internal") ||
          headText.includes("detail") ||
          hasViewDetails);

      if (hasCourse && hasInternalMarks) return true;
    }

    // Check if current page context is strictly Internal Marks
    const currentHash = (window.location.hash || "").toLowerCase();
    const currentPath = window.location.pathname.toLowerCase();
    const bodySnippet = (document.body.innerText || "")
      .slice(0, 1500)
      .toLowerCase();

    const isInternalContext =
      (currentHash.includes("internal") ||
        currentPath.includes("internal") ||
        bodySnippet.includes("internal mark") ||
        bodySnippet.includes("internal marks") ||
        document.querySelector(".sp-stacked-marks.sp-stacked-active") !==
          null) &&
      !isGradeMarkObtainedContext(tbl);

    if (isInternalContext && hasViewDetails) {
      return true;
    }

    return false;
  }

  /**
   * Finds the primary Internal Mark Details table on the page.
   */
  function findInternalMarksTables() {
    const candidates = [];

    // Search inside #divMainDetails
    const mainTables = document.querySelectorAll("#divMainDetails table");
    for (const tbl of mainTables) {
      if (isInternalMarksTable(tbl) && !candidates.includes(tbl)) {
        candidates.push(tbl);
      }
    }

    // Search all page tables if none found in #divMainDetails
    if (candidates.length === 0) {
      const allTables = document.querySelectorAll("table");
      for (const tbl of allTables) {
        if (isInternalMarksTable(tbl) && !candidates.includes(tbl)) {
          candidates.push(tbl);
        }
      }
    }

    return candidates;
  }

  /**
   * Accurately finds the "View Details" cell in a table row.
   */
  function getViewDetailsCell(row) {
    if (!row) return null;

    // Check if already tagged
    const tagged = row.querySelector(".sp-int-view-col");
    if (tagged) return tagged;

    // 1. Look for cell containing a button or link with "view" or "detail" or modal triggers
    for (let c = 0; c < row.cells.length; c++) {
      const cell = row.cells[c];
      if (
        cell.classList.contains("sp-int-lost-cell") ||
        cell.classList.contains("sp-int-forecast-cell")
      )
        continue;

      const btn = cell.querySelector(
        "button, a, .btn, input[type='button'], input[type='submit'], [onclick], [data-target], [data-toggle]",
      );
      if (btn) {
        const btnText = (btn.innerText || btn.value || "").toLowerCase().trim();
        const onClick = (btn.getAttribute("onclick") || "").toLowerCase();
        const dataTarget = (
          btn.getAttribute("data-target") || ""
        ).toLowerCase();
        const dataToggle = (
          btn.getAttribute("data-toggle") || ""
        ).toLowerCase();
        const btnId = (btn.id || "").toLowerCase();
        const btnClass = (btn.className || "").toLowerCase();

        if (
          btnText.includes("detail") ||
          btnText.includes("view") ||
          btnText.includes("biew") ||
          btnText.includes("mark") ||
          onClick.includes("detail") ||
          onClick.includes("view") ||
          onClick.includes("mark") ||
          dataTarget.includes("detail") ||
          dataTarget.includes("mark") ||
          dataTarget.includes("modal") ||
          dataToggle === "modal" ||
          btnId.includes("detail") ||
          btnId.includes("view") ||
          btnClass.includes("detail") ||
          btnClass.includes("view")
        ) {
          cell.classList.add("sp-int-view-col");
          return cell;
        }
      }
    }

    // 2. Look for cell with text containing "detail" or "view"
    for (let c = 0; c < row.cells.length; c++) {
      const cell = row.cells[c];
      if (
        cell.classList.contains("sp-int-lost-cell") ||
        cell.classList.contains("sp-int-forecast-cell")
      )
        continue;

      const text = (cell.innerText || "").toLowerCase().trim();
      if (
        (text.includes("view") && text.includes("detail")) ||
        (text.includes("biew") && text.includes("detail")) ||
        text === "view details" ||
        text === "view detail" ||
        text === "details"
      ) {
        cell.classList.add("sp-int-view-col");
        return cell;
      }
    }

    // 3. Fallback: Check last cell that has any clickable element
    if (row.cells.length >= 3) {
      const lastCell = row.cells[row.cells.length - 1];
      if (
        !lastCell.classList.contains("sp-int-lost-cell") &&
        !lastCell.classList.contains("sp-int-forecast-cell") &&
        lastCell.querySelector("button, a, .btn, input, [onclick]")
      ) {
        lastCell.classList.add("sp-int-view-col");
        return lastCell;
      }
    }

    return null;
  }

  /**
   * Maps lost marks to Grade, Color, and Styling (Matching Attendance & Prime theme).
   */
  function getGradeInfo(lostMarksVal) {
    if (lostMarksVal < 10) {
      return { grade: "O", color: "#15803d", bg: "#dcfce7", border: "#86efac" };
    } else if (lostMarksVal < 20) {
      return {
        grade: "A+",
        color: "#132450",
        bg: "#e8ecf5",
        border: "#bfdbfe",
      };
    } else if (lostMarksVal < 30) {
      return { grade: "A", color: "#0d1938", bg: "#e0f2fe", border: "#b8c2d9" };
    } else if (lostMarksVal < 40) {
      return {
        grade: "B+",
        color: "#9a7200",
        bg: "#ffedd5",
        border: "#fed7aa",
      };
    } else if (lostMarksVal < 45) {
      return { grade: "B", color: "#9a7200", bg: "#fff4c2", border: "#F4C542" };
    } else if (lostMarksVal <= 50) {
      return { grade: "C", color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" };
    } else {
      return { grade: "F", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" };
    }
  }

  /**
   * Creates the formatted "Mark / Max. Mark" badge element:
   * - Box: white color and bold text
   * - Left side (scored mark):
   *     - Green for 50%+ marks (> 50%)
   *     - Yellow if 50% (== 50%)
   *     - Red if below 50% (< 50%)
   *     - Font size slightly bigger than right
   * - Right side (max mark):
   *     - Dark black text
   */
  function createMetricMarkBadge(rawMarkText, knownTotal) {
    const badge = document.createElement("span");
    badge.className = "sp-int-metric-mark";

    const text = (rawMarkText || "").trim();
    const slashParts = text.split("/");

    if (slashParts.length >= 2) {
      const leftStr = slashParts[0].trim();
      const rightStr = slashParts[1].trim();
      const scored = parseFloat(leftStr.replace(/[^0-9.]/g, ""));
      const total = parseFloat(rightStr.replace(/[^0-9.]/g, ""));

      let leftColor = "#16a34a"; // Green for 50%+
      if (!isNaN(scored) && !isNaN(total) && total > 0) {
        const pct = (scored / total) * 100;
        if (Math.abs(pct - 50) < 0.01) {
          leftColor = "#ca8a04"; // Yellow if 50%
        } else if (pct > 50) {
          leftColor = "#16a34a"; // Green for 50%+
        } else {
          leftColor = "#dc2626"; // Red if below 50%
        }
      }

      badge.innerHTML = `
        <span class="sp-mark-left" style="color: ${leftColor}; font-size: 13.5px; font-weight: 800; line-height: 1;">${leftStr}</span>
        <span class="sp-mark-slash" style="color: #64748b; font-size: 12px; font-weight: 700; margin: 0 2px; line-height: 1;">/</span>
        <span class="sp-mark-right" style="color: #0f172a; font-size: 11.5px; font-weight: 700; line-height: 1;">${rightStr}</span>
      `;
    } else {
      const val = parseFloat(text.replace(/[^0-9.]/g, ""));
      const total = knownTotal || 60;
      let leftColor = "#16a34a";
      if (!isNaN(val) && total > 0) {
        const pct = (val / total) * 100;
        if (Math.abs(pct - 50) < 0.01) {
          leftColor = "#ca8a04";
        } else if (pct > 50) {
          leftColor = "#16a34a";
        } else {
          leftColor = "#dc2626";
        }
      }

      badge.innerHTML = `
        <span class="sp-mark-left" style="color: ${leftColor}; font-size: 13.5px; font-weight: 800; line-height: 1;">${text}</span>
      `;
    }

    return badge;
  }

  /**
   * Parses scored marks and total maximum marks from row cells.
   */
  function parseRowMarks(row, mHeader) {
    let sum = 0;
    let total = 0;

    for (let c = 0; c < row.cells.length; c++) {
      const cell = row.cells[c];
      if (
        cell.classList.contains("sp-int-lost-cell") ||
        cell.classList.contains("sp-int-forecast-cell") ||
        cell.classList.contains("sp-int-view-col") ||
        cell.classList.contains("sp-int-view-cell")
      ) {
        continue;
      }
      const text = (cell.innerText || cell.textContent || "").trim();
      const slashMatch = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
      if (slashMatch) {
        const s = parseFloat(slashMatch[1]);
        const m = parseFloat(slashMatch[2]);
        if (!isNaN(s) && !isNaN(m) && m > 0) {
          sum = s;
          total = m;
          return { sum, total, targetCell: cell };
        }
      }
    }

    if (mHeader && total === 0) {
      const headerCells = Array.from(mHeader.children);
      const markColIdx = headerCells.findIndex((c) => {
        const t = (c.innerText || "").toLowerCase();
        return (
          t.includes("mark /") ||
          t.includes("max. mark") ||
          t.includes("max mark") ||
          t.includes("total")
        );
      });

      if (markColIdx !== -1 && row.cells[markColIdx]) {
        const targetCell = row.cells[markColIdx];
        const cellText = (targetCell.innerText || "").trim();
        const slashMatch = cellText.match(
          /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/,
        );
        if (slashMatch) {
          sum = parseFloat(slashMatch[1]);
          total = parseFloat(slashMatch[2]);
        } else {
          const val = parseFloat(cellText.replace(/[^0-9.]/g, ""));
          if (!isNaN(val)) {
            sum = val;
            total = 60; // Standard SRM internal scale
          }
        }
        return { sum, total, targetCell };
      }
    }

    return { sum, total, targetCell: null };
  }

  /**
   * Gets saved scale for Target Marks ("75" or "100"), default is "75".
   */
  function getTargetMarksScale() {
    return localStorage.getItem("sp_target_marks_scale") || "75";
  }

  /**
   * Generates Target Marks (Forecast) HTML based on current scale mode ("75" or "100"):
   * - 75 Marks Mode (Till Batch '29):
   *     - If total === 100: Est. Grade
   *     - Only visible when internal reached 60 marks of total:
   *         (Target Grade - Internal Marks) * 75 / 40
   *     - If internal has not reached 60: "Let marks be uploaded"
   * - 100 Marks Mode (New Batch - Batch '30 onwards):
   *     - If total === 100: Est. Grade
   *     - Only visible when internal reached 50 marks of total:
   *         (Target Grade - Internal Marks) * 100 / 50 = (Target - Internal) * 2
   *     - If internal has not reached 50: "Let marks be uploaded"
   */
  function buildForecastHTML(sum, total, scale) {
    const gradeInfo = getGradeInfo(Math.max(0, total - sum));

    // Completed 100-mark course (e.g. practicals or full internals)
    if (Math.round(total) === 100) {
      return `
        <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap;">
           <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Grade:</span>
           <div style="display: inline-flex; align-items: center; justify-content: center; background: ${gradeInfo.bg}; border: 1px solid ${gradeInfo.border}; padding: 3px 10px; border-radius: 6px;">
              <span style="font-size: 14px; font-weight: 900; color: ${gradeInfo.color}; line-height: 1;">${gradeInfo.grade}</span>
           </div>
        </div>
      `;
    }

    if (scale === "100") {
      // 100 Marks Mode: only visible when internal reached 50 (or 100)
      if (Math.round(total) !== 50) {
        return `
          <div style="font-size: 11px; font-weight: 600; color: #64748b; font-style: italic; display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Let marks be uploaded</span>
          </div>
        `;
      }

      const itemsHTML = TARGET_GRADES.map((g) => {
        const reqScale = g.target - sum;
        const exactReq = parseFloat((reqScale * (100 / 50)).toFixed(2));
        let display = "";
        let opacityStyle = "";

        if (exactReq > 100) {
          display =
            '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:#ef4444; flex-shrink:0;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
          opacityStyle = "opacity: 0.65;";
        } else if (exactReq <= 0) {
          display =
            '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:#10b981; flex-shrink:0;"><path d="M20 6L9 17l-5-5"></path></svg>';
        } else {
          display = `<span style="font-size: 10px; font-weight: 800; color: ${g.color}; line-height: 1;">${exactReq}</span>`;
        }

        return `
          <div title="Target ${g.name}: ${exactReq > 100 ? "Unreachable (>100)" : exactReq <= 0 ? "Achieved" : exactReq + " / 100"}" style="display: inline-flex; align-items: center; border: 1px solid ${g.border}; background: ${g.bg}; border-radius: 5px; padding: 2px 4px; gap: 3px; box-shadow: 0 1px 1px rgba(0,0,0,0.03); flex-shrink: 0; cursor: default; ${opacityStyle}">
            <span style="font-size: 9.5px; font-weight: 800; color: ${g.color}; line-height: 1;">${g.name}</span>
            <div style="width: 1px; height: 9px; background: ${g.border};"></div>
            ${display}
          </div>
        `;
      }).join("");

      return `
        <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;">
           <div style="font-size: 8.5px; font-weight: 800; color: #0d1938; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1;">
             Target / 100
           </div>
           <div style="display: inline-flex; gap: 3px; align-items: center; justify-content: center; flex-wrap: nowrap; white-space: nowrap;">
              ${itemsHTML}
           </div>
        </div>
      `;
    } else {
      // 75 Marks Mode: only visible when internal reached 60 (or 100)
      if (Math.round(total) !== 60) {
        return `
          <div style="font-size: 11px; font-weight: 600; color: #64748b; font-style: italic; display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Let marks be uploaded</span>
          </div>
        `;
      }

      const itemsHTML = TARGET_GRADES.map((g) => {
        const reqScale = g.target - sum;
        const exactReq = parseFloat((reqScale * (75 / 40)).toFixed(2));
        let display = "";
        let opacityStyle = "";

        if (exactReq > 75) {
          display =
            '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:#ef4444; flex-shrink:0;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
          opacityStyle = "opacity: 0.65;";
        } else if (exactReq <= 0) {
          display =
            '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:#10b981; flex-shrink:0;"><path d="M20 6L9 17l-5-5"></path></svg>';
        } else {
          display = `<span style="font-size: 10px; font-weight: 800; color: ${g.color}; line-height: 1;">${exactReq}</span>`;
        }

        return `
          <div title="Target ${g.name}: ${exactReq > 75 ? "Unreachable (>75)" : exactReq <= 0 ? "Achieved" : exactReq + " / 75"}" style="display: inline-flex; align-items: center; border: 1px solid ${g.border}; background: ${g.bg}; border-radius: 5px; padding: 2px 4px; gap: 3px; box-shadow: 0 1px 1px rgba(0,0,0,0.03); flex-shrink: 0; cursor: default; ${opacityStyle}">
            <span style="font-size: 9.5px; font-weight: 800; color: ${g.color}; line-height: 1;">${g.name}</span>
            <div style="width: 1px; height: 9px; background: ${g.border};"></div>
            ${display}
          </div>
        `;
      }).join("");

      return `
        <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;">
           <div style="font-size: 8.5px; font-weight: 800; color: #9a7200; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1;">
             Target / 75
           </div>
           <div style="display: inline-flex; gap: 3px; align-items: center; justify-content: center; flex-wrap: nowrap; white-space: nowrap;">
              ${itemsHTML}
           </div>
        </div>
      `;
    }
  }

  /**
   * Updates all Target Marks forecast cells across internal tables when toggle switches.
   */
  function updateAllForecastCells(table, scale) {
    const tables = table
      ? [table]
      : document.querySelectorAll(".sp-internals-table");
    tables.forEach((tbl) => {
      const header =
        tbl.querySelector("thead tr") || tbl.querySelector("tr:first-child");
      const rows = tbl.querySelectorAll("tbody tr, tr");
      rows.forEach((row) => {
        if (
          row === header ||
          row.parentElement?.tagName.toLowerCase() === "thead"
        )
          return;
        const forecastCell = row.querySelector(".sp-int-forecast-cell");
        if (!forecastCell) return;

        let sum = parseFloat(forecastCell.dataset.spSum);
        let total = parseFloat(forecastCell.dataset.spTotal);

        if (isNaN(sum) || isNaN(total)) {
          const parsed = parseRowMarks(row, header);
          sum = parsed.sum;
          total = parsed.total;
          forecastCell.dataset.spSum = String(sum);
          forecastCell.dataset.spTotal = String(total);
        }

        forecastCell.innerHTML = buildForecastHTML(sum, total, scale);
      });
    });
  }

  /**
   * Attaches click handlers for toggle buttons and hover listeners for formula tooltip.
   */
  function setupForecastHeaderEvents(forecastHead, table) {
    const infoBtn = forecastHead.querySelector("#spIntInfoBtn");
    if (infoBtn && !infoBtn.hasAttribute("data-sp-events-attached")) {
      infoBtn.setAttribute("data-sp-events-attached", "true");
      infoBtn.addEventListener("mouseenter", () => showFormulaTooltip(infoBtn));
      infoBtn.addEventListener("mouseleave", () => {
        tooltipHideTimeout = setTimeout(() => {
          hideFormulaTooltip();
        }, 150);
      });
      infoBtn.addEventListener("focus", () => showFormulaTooltip(infoBtn));
      infoBtn.addEventListener("blur", () => {
        tooltipHideTimeout = setTimeout(() => {
          hideFormulaTooltip();
        }, 150);
      });
    }

    const warnBtn = forecastHead.querySelector("#spIntWarnBtn");
    if (warnBtn && !warnBtn.hasAttribute("data-sp-events-attached")) {
      warnBtn.setAttribute("data-sp-events-attached", "true");
      warnBtn.addEventListener("mouseenter", () => showWarningTooltip(warnBtn));
      warnBtn.addEventListener("mouseleave", () => {
        warnTooltipHideTimeout = setTimeout(() => {
          hideWarningTooltip();
        }, 150);
      });
      warnBtn.addEventListener("focus", () => showWarningTooltip(warnBtn));
      warnBtn.addEventListener("blur", () => {
        warnTooltipHideTimeout = setTimeout(() => {
          hideWarningTooltip();
        }, 150);
      });
    }

    const btn100 = forecastHead.querySelector(".sp-target-btn-100");
    const btn75 = forecastHead.querySelector(".sp-target-btn-75");

    if (btn100 && !btn100.hasAttribute("data-sp-click-attached")) {
      btn100.setAttribute("data-sp-click-attached", "true");
      btn100.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        localStorage.setItem("sp_target_marks_scale", "100");
        btn100.classList.add("active");
        if (btn75) btn75.classList.remove("active");
        updateAllForecastCells(table, "100");
      });
    }

    if (btn75 && !btn75.hasAttribute("data-sp-click-attached")) {
      btn75.setAttribute("data-sp-click-attached", "true");
      btn75.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        localStorage.setItem("sp_target_marks_scale", "75");
        btn75.classList.add("active");
        if (btn100) btn100.classList.remove("active");
        updateAllForecastCells(table, "75");
      });
    }
  }

  /**
   * Enhances the table strictly using the Attendance UI theme:
   *   1. Code (Theme Palette Badge + Border)
   *   2. Description (Title Text)
   *   3. Mark / Max. Mark (Light Blue Metric Badge)
   *   4. Marks Lost (with Est. Grade widget)
   *   5. Target Marks (100 Marks / 75 Marks Toggle + Chips + Formula Tooltip)
   *   6. View Details (styled action button in last column)
   */
  function enhanceSingleTable(table) {
    if (!table) return;
    if (isAttendancePage(table)) return;
    if (!isInternalMarksPage()) return;
    if (isSrmPolicyContext(table)) return;
    if (isGradeMarkObtainedContext(table)) return;

    injectAttendanceTheme();

    // Apply internal table class & outer card class (strictly isolated from attendance)
    table.classList.add("sp-internals-table");
    const parentCard = table.closest(".card");
    if (parentCard) {
      parentCard.classList.add("sp-internals-card");
    }

    const header =
      table.querySelector("thead tr") || table.querySelector("tr:first-child");
    if (!header) return;

    header.classList.add("sp-header-row");

    // 1. Locate Mark / Max. Mark header cell
    const markHead = Array.from(header.children).find((c) => {
      if (
        c.classList.contains("sp-int-lost-head") ||
        c.classList.contains("sp-int-forecast-head")
      )
        return false;
      const t = (c.innerText || c.textContent || "").toLowerCase().trim();
      return (
        t.includes("mark /") ||
        t.includes("max. mark") ||
        t.includes("max mark") ||
        t.includes("total mark") ||
        t.includes("mark")
      );
    });

    // 2. Locate View Details header column
    let viewDetailsHead = Array.from(header.children).find((c) => {
      if (
        c === markHead ||
        c.classList.contains("sp-int-lost-head") ||
        c.classList.contains("sp-int-forecast-head")
      )
        return false;
      const t = (c.innerText || c.textContent || "").toLowerCase().trim();
      return (
        t.includes("view detail") ||
        t.includes("view details") ||
        t.includes("biew details") ||
        t.includes("view mark") ||
        t.includes("view") ||
        t.includes("detail") ||
        t.includes("action") ||
        t.includes("breakup")
      );
    });

    if (!viewDetailsHead && markHead) {
      let next = markHead.nextElementSibling;
      while (
        next &&
        (next.classList.contains("sp-int-lost-head") ||
          next.classList.contains("sp-int-forecast-head"))
      ) {
        next = next.nextElementSibling;
      }
      if (next) {
        viewDetailsHead = next;
      } else {
        const last = header.lastElementChild;
        if (
          last &&
          last !== markHead &&
          !last.classList.contains("sp-int-lost-head") &&
          !last.classList.contains("sp-int-forecast-head")
        ) {
          viewDetailsHead = last;
        }
      }
    }

    const cellTag =
      header.children[0]?.tagName.toLowerCase() === "th" ? "th" : "td";

    // 3. Inject or retrieve "Marks Lost" and "Target Marks" Headers
    let lostHead = table.querySelector(".sp-int-lost-head");
    let forecastHead = table.querySelector(".sp-int-forecast-head");

    if (!lostHead) {
      lostHead = document.createElement(cellTag);
      lostHead.className = "sp-int-lost-head";
      lostHead.innerHTML = "Marks Lost";
    }

    const currentScale = getTargetMarksScale();

    if (!forecastHead) {
      forecastHead = document.createElement(cellTag);
      forecastHead.className = "sp-int-forecast-head";
      forecastHead.innerHTML = `
        <div class="sp-int-forecast-head-inner">
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 5px;">
            <span>Target Marks</span>
            <button type="button" class="sp-int-info-btn" id="spIntInfoBtn" aria-label="Target Marks Formula" title="Target Marks Formula & Regulations Guide">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
            <button type="button" class="sp-int-warn-btn" id="spIntWarnBtn" aria-label="A Small Note on Marks Calculations" title="A Small Note on Marks Calculations">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F4C542" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </button>
          </div>
          <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1; margin-top: 1px;">
            Choose your End Semester Total marks
          </div>
          <div class="sp-int-target-toggle-group">
            <button type="button" class="sp-target-btn sp-target-btn-100 ${currentScale === "100" ? "active" : ""}" data-scale="100" title="100 Marks is for Batch '30 onwards">
              100 Marks <span style="font-size: 8.5px; opacity: 0.85; font-weight: 600;">(Batch 30+)</span>
            </button>
            <button type="button" class="sp-target-btn sp-target-btn-75 ${currentScale === "75" ? "active" : ""}" data-scale="75" title="75 Marks is for till Batch '29">
              75 Marks <span style="font-size: 8.5px; opacity: 0.85; font-weight: 600;">(Till Batch 29)</span>
            </button>
          </div>
        </div>
      `;
      setupForecastHeaderEvents(forecastHead, table);
    } else {
      if (!forecastHead.querySelector(".sp-int-target-toggle-group")) {
        forecastHead.innerHTML = `
          <div class="sp-int-forecast-head-inner">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 5px;">
              <span>Target Marks</span>
              <button type="button" class="sp-int-info-btn" id="spIntInfoBtn" aria-label="Target Marks Formula" title="Target Marks Formula & Regulations Guide">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>
              <button type="button" class="sp-int-warn-btn" id="spIntWarnBtn" aria-label="A Small Note on Marks Calculations" title="A Small Note on Marks Calculations">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F4C542" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </button>
            </div>
            <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1; margin-top: 1px;">
              Choose your End Semester Total marks
            </div>
            <div class="sp-int-target-toggle-group">
              <button type="button" class="sp-target-btn sp-target-btn-100 ${currentScale === "100" ? "active" : ""}" data-scale="100" title="100 Marks is for Batch '30 onwards">
                100 Marks <span style="font-size: 8.5px; opacity: 0.85; font-weight: 600;">(Batch 30+)</span>
              </button>
              <button type="button" class="sp-target-btn sp-target-btn-75 ${currentScale === "75" ? "active" : ""}" data-scale="75" title="75 Marks is for till Batch '29">
                75 Marks <span style="font-size: 8.5px; opacity: 0.85; font-weight: 600;">(Till Batch 29)</span>
              </button>
            </div>
          </div>
        `;
        setupForecastHeaderEvents(forecastHead, table);
      } else {
        const btn100 = forecastHead.querySelector(".sp-target-btn-100");
        const btn75 = forecastHead.querySelector(".sp-target-btn-75");
        if (btn100 && btn75) {
          if (currentScale === "100") {
            btn100.classList.add("active");
            btn75.classList.remove("active");
          } else {
            btn75.classList.add("active");
            btn100.classList.remove("active");
          }
        }
        setupForecastHeaderEvents(forecastHead, table);
      }
    }

    // 4. Position headers in EXACT order:
    // Code (0) | Description (1) | Mark / Max. Mark (2) | Marks Lost (3) | Target Marks (4) | View Details (5)
    if (markHead) {
      if (markHead.nextElementSibling !== lostHead) {
        markHead.insertAdjacentElement("afterend", lostHead);
      }
      if (lostHead.nextElementSibling !== forecastHead) {
        lostHead.insertAdjacentElement("afterend", forecastHead);
      }
      if (
        viewDetailsHead &&
        forecastHead.nextElementSibling !== viewDetailsHead
      ) {
        forecastHead.insertAdjacentElement("afterend", viewDetailsHead);
      }
    } else if (viewDetailsHead) {
      if (forecastHead.nextElementSibling !== viewDetailsHead) {
        header.insertBefore(lostHead, viewDetailsHead);
        header.insertBefore(forecastHead, viewDetailsHead);
      }
    } else {
      if (header.lastElementChild !== forecastHead) {
        header.appendChild(lostHead);
        header.appendChild(forecastHead);
      }
    }

    if (viewDetailsHead) {
      viewDetailsHead.classList.add("sp-int-view-cell");
      const vText = (
        viewDetailsHead.innerText ||
        viewDetailsHead.textContent ||
        ""
      ).trim();
      if (!vText || vText === "&nbsp;") {
        viewDetailsHead.textContent = "View Details";
      }
    }

    // Ensure all header cells are centered
    Array.from(header.children).forEach((c) => {
      c.style.textAlign = "center";
      c.style.verticalAlign = "middle";
    });

    const rows = table.querySelectorAll("tbody tr, tr");
    let enhancedRowsCount = 0;
    let subjectIndex = 0;

    rows.forEach((row) => {
      if (row.closest("table") !== table) return; // Ignore nested tables
      if (
        row === header ||
        row.parentElement?.tagName.toLowerCase() === "thead"
      )
        return;
      if (row.querySelector("th")) return; // Skip sub-headers
      if (row.querySelector("td[colspan]")) return; // Skip colspan summary/detail rows
      if (row.cells.length < 2) return;

      const theme = THEME_PALETTE[subjectIndex % THEME_PALETTE.length];
      subjectIndex++;

      // 1. Format Course Code Cell (Theme Badge + Accent Border) Non-Destructively
      const codeCell = row.cells[0];
      if (codeCell && !codeCell.classList.contains("sp-course-identity-cell")) {
        codeCell.classList.add("sp-course-identity-cell");
        codeCell.style.borderLeft = `4.5px solid ${theme.accent}`;
        codeCell.style.textAlign = "center";
        codeCell.style.verticalAlign = "middle";

        const hiddenInputs = Array.from(
          codeCell.querySelectorAll("input, [type='hidden']"),
        );
        const rawCode = (
          codeCell.innerText ||
          codeCell.textContent ||
          ""
        ).trim();

        if (!codeCell.querySelector(".sp-int-code-badge") && rawCode) {
          const badge = document.createElement("span");
          badge.className = "sp-int-code-badge";
          badge.style.backgroundColor = theme.bg;
          badge.style.color = theme.accent;
          badge.style.border = `1px solid ${theme.border}`;
          badge.textContent = rawCode;

          codeCell.textContent = "";
          codeCell.appendChild(badge);
          hiddenInputs.forEach((inp) => codeCell.appendChild(inp));
        }
      } else if (codeCell) {
        codeCell.style.textAlign = "center";
        codeCell.style.verticalAlign = "middle";
      }

      // 2. Format Description Cell Non-Destructively
      const descCell = row.cells[1];
      if (descCell && !descCell.classList.contains("sp-title-styled")) {
        descCell.classList.add("sp-title-styled");
        descCell.style.textAlign = "center";
        descCell.style.verticalAlign = "middle";
        const hiddenInputs = Array.from(
          descCell.querySelectorAll("input, [type='hidden']"),
        );
        const rawTitle = (
          descCell.innerText ||
          descCell.textContent ||
          ""
        ).trim();

        if (!descCell.querySelector(".sp-int-title-text") && rawTitle) {
          const titleSpan = document.createElement("span");
          titleSpan.className = "sp-int-title-text";
          titleSpan.textContent = rawTitle;

          descCell.textContent = "";
          descCell.appendChild(titleSpan);
          hiddenInputs.forEach((inp) => descCell.appendChild(inp));
        }
      } else if (descCell) {
        descCell.style.textAlign = "center";
        descCell.style.verticalAlign = "middle";
      }

      // Locate "View Details" cell for this row specifically
      const viewDetailsCell = getViewDetailsCell(row);

      // Check if already injected
      let lostCell = row.querySelector(".sp-int-lost-cell");
      let forecastCell = row.querySelector(".sp-int-forecast-cell");

      if (!lostCell) {
        // Parse marks from "Mark / Max. Mark"
        const { sum, total, targetCell } = parseRowMarks(row, header);

        // Format Mark / Max. Mark cell with White badge Non-Destructively
        if (targetCell && !targetCell.classList.contains("sp-mark-styled")) {
          targetCell.classList.add("sp-mark-styled");
          const hiddenInputs = Array.from(
            targetCell.querySelectorAll("input, [type='hidden']"),
          );
          const rawMarkText = (
            targetCell.innerText ||
            targetCell.textContent ||
            ""
          ).trim();

          if (!targetCell.querySelector(".sp-int-metric-mark") && rawMarkText) {
            const markBadge = createMetricMarkBadge(rawMarkText, total);

            targetCell.textContent = "";
            targetCell.appendChild(markBadge);
            hiddenInputs.forEach((inp) => targetCell.appendChild(inp));
          }
        } else if (targetCell) {
          const existingMark = targetCell.querySelector(".sp-int-metric-mark");
          if (existingMark && !existingMark.querySelector(".sp-mark-left")) {
            const rawMarkText = (
              existingMark.innerText ||
              existingMark.textContent ||
              ""
            ).trim();
            if (rawMarkText) {
              const markBadge = createMetricMarkBadge(rawMarkText, total);
              existingMark.replaceWith(markBadge);
            }
          }
        }

        const lostMarksVal = Math.max(0, total - sum);
        const lostMarks = lostMarksVal.toFixed(2);
        const gradeInfo = getGradeInfo(lostMarksVal);

        // 3. Create "Marks Lost" cell (Attendance UI themed widget)
        lostCell = document.createElement("td");
        lostCell.className = "sp-int-lost-cell";

        const isPerfect = lostMarksVal <= 0;
        const marksColor = isPerfect ? "#15803d" : "#dc2626";
        const marksBg = isPerfect ? "#dcfce7" : "#fee2e2";
        const marksBorder = isPerfect ? "#86efac" : "#fca5a5";
        const displayVal = isPerfect ? "0.00" : `-${lostMarks}`;

        const iconSvg = isPerfect
          ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${marksColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M20 6 9 17l-5-5"/></svg>`
          : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${marksColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`;

        lostCell.innerHTML = `
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; padding: 2px 4px; box-sizing: border-box;">
            <!-- Marks Lost Widget -->
            <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 2px; padding: 0 6px; height: 26px; min-width: 44px; border-radius: 6px; background: ${marksBg}; border: 1px solid ${marksBorder}; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                ${iconSvg}
                <span style="font-size: 12px; font-weight: 800; color: ${marksColor}; line-height: 1; letter-spacing: -0.02em;">${displayVal}</span>
              </div>
              <span style="font-size: 7.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; margin-top: 3px; line-height: 1;">Marks Lost</span>
            </div>

            <!-- Vertical Divider -->
            <div style="width: 1px; height: 24px; background: #e2e8f0; border-radius: 1px; flex-shrink: 0;"></div>

            <!-- Est. Grade Widget -->
            <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">
              <div style="display: inline-flex; align-items: center; justify-content: center; padding: 0 8px; height: 26px; min-width: 28px; border-radius: 6px; background: ${gradeInfo.bg}; border: 1px solid ${gradeInfo.border}; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                <span style="font-size: 13px; font-weight: 900; color: ${gradeInfo.color}; line-height: 1;">${gradeInfo.grade}</span>
              </div>
              <span style="font-size: 7.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; margin-top: 3px; line-height: 1;">Est. Grade</span>
            </div>
          </div>
        `;

        // 4. Create "Target Marks" (Forecast) cell
        forecastCell = document.createElement("td");
        forecastCell.className = "sp-int-forecast-cell";
        forecastCell.dataset.spSum = String(sum);
        forecastCell.dataset.spTotal = String(total);
        forecastCell.innerHTML = buildForecastHTML(sum, total, currentScale);

        // Position: Place lostCell and forecastCell BEFORE viewDetailsCell
        if (viewDetailsCell) {
          row.insertBefore(lostCell, viewDetailsCell);
          row.insertBefore(forecastCell, viewDetailsCell);
        } else {
          row.appendChild(lostCell);
          row.appendChild(forecastCell);
        }

        enhancedRowsCount++;
      } else if (forecastCell) {
        // Update forecastCell data and render with latest scale mode
        const { sum, total } = parseRowMarks(row, header);
        forecastCell.dataset.spSum = String(sum);
        forecastCell.dataset.spTotal = String(total);
        forecastCell.innerHTML = buildForecastHTML(sum, total, currentScale);
      }

      // Ensure View Details stays at the last position ONLY if it's not already the last child
      if (viewDetailsCell && row.lastElementChild !== viewDetailsCell) {
        row.appendChild(viewDetailsCell);
      }

      // Format View Details Button with Attendance Action Style safely
      if (viewDetailsCell) {
        viewDetailsCell.classList.add("sp-int-view-cell");
        const btn = viewDetailsCell.querySelector(
          "button, a, .btn, input[type='button'], input[type='submit'], [onclick]",
        );
        if (btn) {
          if (!btn.classList.contains("sp-btn-view-details")) {
            btn.classList.add("sp-btn-view-details");
          }
          btn.style.pointerEvents = "auto";
          btn.style.cursor = "pointer";

          // Dynamically re-scan and format breakdown table when View Details is clicked
          if (!btn.hasAttribute("data-sp-details-click-attached")) {
            btn.setAttribute("data-sp-details-click-attached", "true");
            btn.addEventListener("click", () => {
              [50, 150, 300, 600, 1000, 1500, 2500].forEach((delay) => {
                setTimeout(() => {
                  const detailTables = findDetailsTables();
                  for (const dt of detailTables) {
                    enhanceDetailsTable(dt);
                  }
                }, delay);
              });
            });
          }
        }
      }
    });

    if (enhancedRowsCount > 0) {
      console.log(
        `[Academia Prime] Enhanced ${enhancedRowsCount} rows with Attendance UI theme.`,
      );
    }
  }

  /**
   * Checks if a table is the "View Details" assessment breakdown table.
   * Target columns: Entered on | Component | Mark / Max. Mark
   */
  function isDetailsTable(tbl) {
    if (!tbl) return false;

    // Strictly ONLY enhance when user is on Internal Marks page
    if (isAttendancePage(tbl)) return false;
    if (!isInternalMarksPage()) return false;

    // Strictly NEVER touch anything in SRM Policy
    if (isSrmPolicyContext(tbl)) return false;

    // Strictly NEVER touch anything in Grade / Mark Obtained
    if (isGradeMarkObtainedContext(tbl)) return false;

    // Reject main internal marks tables
    if (
      tbl.classList.contains("sp-internals-table") &&
      !tbl.classList.contains("sp-details-breakdown-table")
    ) {
      return false;
    }

    const allRows = tbl.querySelectorAll("tr");
    if (allRows.length === 0) return false;

    // Scan first several rows for header keywords
    for (let i = 0; i < Math.min(allRows.length, 6); i++) {
      const headText = (
        allRows[i].innerText ||
        allRows[i].textContent ||
        ""
      ).toLowerCase();

      // Reject policy headers
      if (
        headText.includes("srm policy") ||
        headText.includes("academic policy")
      ) {
        return false;
      }

      const hasEnteredOn =
        headText.includes("entered on") ||
        headText.includes("entered") ||
        headText.includes("date");
      const hasComponent =
        headText.includes("component") ||
        headText.includes("assessment") ||
        headText.includes("test");
      const hasMark =
        headText.includes("mark") ||
        headText.includes("max") ||
        headText.includes("score");

      if (
        (hasComponent && (hasEnteredOn || hasMark)) ||
        (hasEnteredOn && hasMark)
      ) {
        return true;
      }
    }

    // Modal fallback: if table is inside a modal or popup and contains assessment breakdown data
    const inModal = !!tbl.closest(
      ".modal, .modal-dialog, .modal-content, .modal-body, #divModal, [id*='modal' i], [id*='popup' i], [id*='detail' i]",
    );
    if (inModal && allRows.length >= 2) {
      const fullText = (tbl.innerText || tbl.textContent || "").toLowerCase();
      if (
        fullText.includes("srm policy") ||
        fullText.includes("academic policy")
      ) {
        return false;
      }
      if (
        (fullText.includes("entered") || fullText.includes("date")) &&
        (fullText.includes("component") || fullText.includes("mark"))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Finds all View Details breakdown tables in the DOM (including inside modals/popups).
   */
  function findDetailsTables() {
    const candidates = [];
    const allTables = document.querySelectorAll("table");
    for (const tbl of allTables) {
      if (isDetailsTable(tbl) && !candidates.includes(tbl)) {
        candidates.push(tbl);
      }
    }
    return candidates;
  }

  /**
   * Formats various portal date representations into clean full format: "DD MMMM YYYY"
   * Example: "12 December 2026" or "12 August 2024"
   */
  function formatToFullDate(rawDate) {
    if (!rawDate) return "";
    const cleaned = rawDate.replace(/\s+/g, " ").trim();

    const monthMap = {
      jan: "January",
      feb: "February",
      mar: "March",
      apr: "April",
      may: "May",
      jun: "June",
      jul: "July",
      aug: "August",
      sep: "September",
      oct: "October",
      nov: "November",
      dec: "December",
      january: "January",
      february: "February",
      march: "March",
      april: "April",
      june: "June",
      july: "July",
      august: "August",
      september: "September",
      october: "October",
      november: "November",
      december: "December",
      "01": "January",
      "02": "February",
      "03": "March",
      "04": "April",
      "05": "May",
      "06": "June",
      "07": "July",
      "08": "August",
      "09": "September",
      10: "October",
      11: "November",
      12: "December",
      1: "January",
      2: "February",
      3: "March",
      4: "April",
      5: "May",
      6: "June",
      7: "July",
      8: "August",
      9: "September",
    };

    // 1. Format: Day-MonthName-Year (e.g. 12-Aug-2024, 12 Aug 2024, 12/Aug/2024, 12-December-2026)
    const wordMonthMatch = cleaned.match(
      /^(\d{1,2})[\s\-\/\.]([a-zA-Z]{3,9})[\s\-\/\.](\d{2,4})/,
    );
    if (wordMonthMatch) {
      const day = String(parseInt(wordMonthMatch[1], 10)).padStart(2, "0");
      const monthKey = wordMonthMatch[2].toLowerCase();
      const month =
        monthMap[monthKey] ||
        monthMap[monthKey.slice(0, 3)] ||
        wordMonthMatch[2];
      let year = wordMonthMatch[3];
      if (year.length === 2) year = "20" + year;
      return `${day} ${month} ${year}`;
    }

    // 2. Format: MonthName Day, Year (e.g. Aug 12, 2024 or December 12, 2026)
    const mdyWordMatch = cleaned.match(
      /^([a-zA-Z]{3,9})[\s\-\/\.,]+(\d{1,2})[\s\-\/\.,]+(\d{2,4})/,
    );
    if (mdyWordMatch) {
      const monthKey = mdyWordMatch[1].toLowerCase();
      const month =
        monthMap[monthKey] || monthMap[monthKey.slice(0, 3)] || mdyWordMatch[1];
      const day = String(parseInt(mdyWordMatch[2], 10)).padStart(2, "0");
      let year = mdyWordMatch[3];
      if (year.length === 2) year = "20" + year;
      return `${day} ${month} ${year}`;
    }

    // 3. Format: Year-Month-Day (ISO, e.g. 2026-12-12)
    const isoMatch = cleaned.match(
      /^(\d{4})[\s\-\/\.](\d{1,2})[\s\-\/\.](\d{1,2})/,
    );
    if (isoMatch) {
      const year = isoMatch[1];
      const month = monthMap[isoMatch[2].padStart(2, "0")] || "January";
      const day = String(parseInt(isoMatch[3], 10)).padStart(2, "0");
      return `${day} ${month} ${year}`;
    }

    // 4. Format: Day-Month-Year (e.g. 12/12/2026 or 12-08-2024)
    const dmyMatch = cleaned.match(
      /^(\d{1,2})[\s\-\/\.](\d{1,2})[\s\-\/\.](\d{2,4})/,
    );
    if (dmyMatch) {
      const day = String(parseInt(dmyMatch[1], 10)).padStart(2, "0");
      const month = monthMap[dmyMatch[2].padStart(2, "0")] || "January";
      let year = dmyMatch[3];
      if (year.length === 2) year = "20" + year;
      return `${day} ${month} ${year}`;
    }

    // 5. Fallback: Native Date parse
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, "0");
      const fullMonths = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const month = fullMonths[parsed.getMonth()];
      const year = parsed.getFullYear();
      return `${day} ${month} ${year}`;
    }

    return cleaned;
  }

  // Alias for backward compatibility
  const formatToDDMMYYYY = formatToFullDate;

  /**
   * Enhances the "View Details" breakdown table:
   *   1. Entered on (Light yellow colored box with full date format: e.g. 12 December 2026)
   *   2. Component (Blue colored box badge)
   *   3. Mark / Max. Mark (Attendance Light Blue metric badge)
   * Strictly keeps all original layout - NEVER injects Marks Lost or Target Marks here.
   */
  function enhanceDetailsTable(table) {
    if (!table) return;
    if (isAttendancePage(table)) return;
    if (!isInternalMarksPage()) return;
    if (isSrmPolicyContext(table)) return;
    if (isGradeMarkObtainedContext(table)) return;

    injectAttendanceTheme();

    table.classList.add("sp-details-breakdown-table");

    // Style outer modal container if present
    const modalContent = table.closest(
      ".modal-content, .modal-dialog, .modal-body",
    );
    if (
      modalContent &&
      !modalContent.classList.contains("sp-details-modal-styled")
    ) {
      modalContent.classList.add("sp-details-modal-styled");
    }

    // Locate header row safely among first several rows
    let header = null;
    const allRows = Array.from(table.querySelectorAll("tr"));
    for (let i = 0; i < Math.min(allRows.length, 6); i++) {
      const r = allRows[i];
      const t = (r.innerText || r.textContent || "").toLowerCase();
      if (
        (t.includes("entered") ||
          t.includes("date") ||
          t.includes("component")) &&
        (t.includes("mark") ||
          t.includes("max") ||
          t.includes("score") ||
          t.includes("component"))
      ) {
        header = r;
        break;
      }
    }

    if (!header) {
      header =
        table.querySelector("thead tr") ||
        table.querySelector("tr:first-child");
    }
    if (!header) return;

    header.classList.add("sp-header-row");
    Array.from(header.children).forEach((cell) => {
      cell.style.textAlign = "center";
      cell.style.verticalAlign = "middle";
    });

    // Resolve column indices dynamically
    let colEnteredOn = -1;
    let colComponent = -1;
    let colMark = -1;

    Array.from(header.children).forEach((cell, idx) => {
      const t = (cell.innerText || cell.textContent || "").toLowerCase().trim();
      if (t.includes("entered") || t.includes("date")) {
        colEnteredOn = idx;
      } else if (
        t.includes("component") ||
        t.includes("assessment") ||
        t.includes("name") ||
        t.includes("test")
      ) {
        colComponent = idx;
      } else if (
        t.includes("mark") ||
        t.includes("max") ||
        t.includes("score")
      ) {
        colMark = idx;
      }
    });

    // Fallbacks if not detected by keywords
    if (
      colEnteredOn === -1 &&
      colComponent === -1 &&
      colMark === -1 &&
      header.children.length >= 3
    ) {
      colEnteredOn = 0;
      colComponent = 1;
      colMark = 2;
    }

    // Inspect row 1 cells to detect date column if header keyword wasn't explicit
    if (colEnteredOn === -1 && allRows.length > 1) {
      for (let rIdx = 1; rIdx < Math.min(allRows.length, 4); rIdx++) {
        const testRow = allRows[rIdx];
        if (testRow === header) continue;
        for (let cIdx = 0; cIdx < testRow.cells.length; cIdx++) {
          const cText = (
            testRow.cells[cIdx].innerText ||
            testRow.cells[cIdx].textContent ||
            ""
          ).trim();
          const fmt = formatToFullDate(cText);
          if (fmt && /\d{2}\s+[a-zA-Z]+\s+\d{4}/.test(fmt)) {
            colEnteredOn = cIdx;
            break;
          }
        }
        if (colEnteredOn !== -1) break;
      }
    }

    const rows = table.querySelectorAll("tbody tr, tr");
    rows.forEach((row) => {
      if (row.closest("table") !== table) return;
      if (
        row === header ||
        row.parentElement?.tagName.toLowerCase() === "thead"
      )
        return;
      if (row.querySelector("th")) return;
      if (row.cells.length < 2) return;

      const rowText = (row.innerText || row.textContent || "").toLowerCase();
      const isTotalRow =
        rowText.includes("total") ||
        rowText.includes("overall") ||
        row.classList.contains("sp-total-row");

      if (isTotalRow) {
        row.classList.add("sp-total-row");
        Array.from(row.cells).forEach((c) => {
          c.style.background = "#f1f5f9";
          c.style.fontWeight = "700";
          c.style.color = "#1e293b";
        });
        if (colMark >= 0 && row.cells[colMark]) {
          const targetCell = row.cells[colMark];
          const existingMark = targetCell.querySelector(".sp-int-metric-mark");
          if (existingMark && !existingMark.querySelector(".sp-mark-left")) {
            const rawMark = (
              existingMark.innerText ||
              existingMark.textContent ||
              ""
            ).trim();
            if (rawMark) {
              const markBadge = createMetricMarkBadge(rawMark);
              existingMark.replaceWith(markBadge);
            }
          } else if (!existingMark) {
            const rawMark = (
              targetCell.innerText ||
              targetCell.textContent ||
              ""
            ).trim();
            if (rawMark) {
              const markBadge = createMetricMarkBadge(rawMark);
              targetCell.textContent = "";
              targetCell.appendChild(markBadge);
            }
          }
        }
        return;
      }

      // 1. Entered on cell (Light Yellow colored box with full date: e.g. 12 December 2026)
      if (colEnteredOn >= 0 && row.cells[colEnteredOn]) {
        const dateCell = row.cells[colEnteredOn];
        dateCell.style.textAlign = "center";
        dateCell.style.verticalAlign = "middle";
        dateCell.style.whiteSpace = "nowrap";

        if (!dateCell.querySelector(".sp-details-date-badge")) {
          const rawDate = (
            dateCell.innerText ||
            dateCell.textContent ||
            ""
          ).trim();
          if (rawDate) {
            const hiddenInputs = Array.from(
              dateCell.querySelectorAll("input, [type='hidden']"),
            );
            const formattedDate = formatToFullDate(rawDate);
            const badge = document.createElement("div");
            badge.className = "sp-details-date-badge";
            badge.style.backgroundColor = "#fff4c2";
            badge.style.border = "1px solid #F4C542";
            badge.style.color = "#5c4500";
            badge.style.fontWeight = "700";
            badge.style.display = "inline-flex";
            badge.style.alignItems = "center";
            badge.style.justifyContent = "center";
            badge.style.gap = "6px";
            badge.style.padding = "4px 12px";
            badge.style.borderRadius = "6px";
            badge.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#745900" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span style="color: #5c4500; font-weight: 700;">${formattedDate}</span>
            `;
            dateCell.textContent = "";
            dateCell.appendChild(badge);
            hiddenInputs.forEach((inp) => dateCell.appendChild(inp));
          }
        }
      }

      // 2. Component cell (Center-aligned with Blue colored box)
      if (colComponent >= 0 && row.cells[colComponent]) {
        const compCell = row.cells[colComponent];
        compCell.style.textAlign = "center";
        compCell.style.verticalAlign = "middle";

        if (!compCell.querySelector(".sp-details-component-badge")) {
          const rawComp = (
            compCell.innerText ||
            compCell.textContent ||
            ""
          ).trim();
          if (rawComp) {
            const hiddenInputs = Array.from(
              compCell.querySelectorAll("input, [type='hidden']"),
            );
            const compBadge = document.createElement("div");
            compBadge.className = "sp-details-component-badge";
            compBadge.style.display = "inline-flex";
            compBadge.style.alignItems = "center";
            compBadge.style.justifyContent = "center";
            compBadge.style.textAlign = "center";
            compBadge.style.margin = "0 auto";
            compBadge.style.backgroundColor = "#e0f2fe";
            compBadge.style.border = "1px solid #b8c2d9";
            compBadge.style.color = "#0d1938";
            compBadge.style.fontWeight = "700";
            compBadge.style.borderRadius = "6px";
            compBadge.style.padding = "5px 14px";
            compBadge.textContent = rawComp;
            compCell.textContent = "";
            compCell.appendChild(compBadge);
            hiddenInputs.forEach((inp) => compCell.appendChild(inp));
          }
        }
      }

      // 3. Mark / Max. Mark cell (White metric badge with split colors)
      if (colMark >= 0 && row.cells[colMark]) {
        const markCell = row.cells[colMark];
        markCell.style.textAlign = "center";
        markCell.style.whiteSpace = "nowrap";

        const existingMark = markCell.querySelector(".sp-int-metric-mark");
        if (existingMark && !existingMark.querySelector(".sp-mark-left")) {
          const rawMark = (
            existingMark.innerText ||
            existingMark.textContent ||
            ""
          ).trim();
          if (rawMark) {
            const markBadge = createMetricMarkBadge(rawMark);
            existingMark.replaceWith(markBadge);
          }
        } else if (!existingMark) {
          const rawMark = (
            markCell.innerText ||
            markCell.textContent ||
            ""
          ).trim();
          if (rawMark) {
            const hiddenInputs = Array.from(
              markCell.querySelectorAll("input, [type='hidden']"),
            );
            const markBadge = createMetricMarkBadge(rawMark);
            markCell.textContent = "";
            markCell.appendChild(markBadge);
            hiddenInputs.forEach((inp) => markCell.appendChild(inp));
          }
        }
      }
    });
  }

  let isEnhancing = false;

  /**
   * Main orchestrator to find and enhance all Internal Marks tables.
   * Strictly isolates execution to the "Internal Mark Details" page.
   * On ANY other page, strictly cleans up and removes all UI changes.
   */
  function enhanceAllInternalMarksTables() {
    if (isEnhancing) return;
    isEnhancing = true;
    try {
      // If user is on Attendance page, strictly DO NOTHING and never touch or clean up attendance!
      if (isAttendancePage()) {
        return;
      }

      // If user is NOT on the Internal Marks page, strictly clean up and exit!
      if (!isInternalMarksPage()) {
        cleanupAllNonInternalPages();
        return;
      }

      // Inject theme styles only when on Internal Marks page
      injectAttendanceTheme();

      // 1. Primary Internal Marks Table (Courses + Marks Lost + Target Marks + View Details)
      const tables = findInternalMarksTables();
      for (const tbl of tables) {
        enhanceSingleTable(tbl);
      }

      // 2. Breakdown Assessment Table inside View Details modal/popup (Entered on, Component, Mark / Max. Mark)
      const detailTables = findDetailsTables();
      for (const tbl of detailTables) {
        enhanceDetailsTable(tbl);
      }
    } finally {
      isEnhancing = false;
    }
  }

  /**
   * Lifecycle Handler with Debounced Mutation Observer & Page Navigation Listeners.
   */
  function initSpInternals() {
    let debounceTimer = null;
    const run = () => {
      try {
        enhanceAllInternalMarksTables();
      } catch (err) {
        console.warn("[Student Portal] sp_internals error:", err);
      }
    };

    run();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    }
    window.addEventListener("load", run);
    window.addEventListener("hashchange", () => setTimeout(run, 200));
    window.addEventListener("popstate", () => setTimeout(run, 200));

    // Listen to menu and navigation link clicks to instantly clean up when navigating away
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (
        target &&
        target.closest(
          "a, button, li, .menu-item, [onclick], .nav-link, .sp-stacked-card",
        )
      ) {
        setTimeout(run, 100);
        setTimeout(run, 350);
        setTimeout(run, 800);
      }
    });

    // Watch for dynamic DOM insertions (AJAX loads in #divMainDetails)
    const observer = new MutationObserver(() => {
      if (isEnhancing) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(run, 150);
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    }
  }

  initSpInternals();
})();
