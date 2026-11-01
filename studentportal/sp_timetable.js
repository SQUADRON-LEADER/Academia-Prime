/**
 * timetable.js — Prime Time Table for Academia Prime
 * Runs as a content script on academia.srmist.edu.in
 *
 * Features:
 *   - Prime Light Theme styling matching Attendance & Popup UI
 *   - Fetches course-slot mapping from My_Time_Table_2023_24
 *   - Fetches unified timetable (batch 1 or 2) from Academia
 *   - High-contrast distinctive color coding (each subject gets its own distinct soft vibrant color)
 *   - Full-box color fill with accent left borders (no top blue line)
 *   - In-page Custom Modal Dialog for editing slots, room numbers, and custom color selection
 *   - Option to mark individual slots as Optional / Cancelled (Crossed out)
 *   - Option to apply color/title changes to all matching course slots across the week
 *   - Clean professional action toolbar without emojis: Edit Slots, Hide/Show Custom, Reset All, Download PNG
 *   - Ultra-crisp HD PNG export via html2canvas (scale 3x)
 *   - Highlights today's day-order row
 *   - Prime About section (Changelog, Mobile Guide, FAQ, Bug Report, Review)
 *
 * Storage key: ttData_<netId>
 */

(function () {
  "use strict";
  if (window._ttLoaded) return;
  window._ttLoaded = true;

  // ─── State ──────────────────────────────────────────────────────────────────
  let _extraSlot = true;
  let _courseColorMap = {}; // Maps course key to color palette theme
  let _customCourseColors = {}; // User-selected color overrides for courses
  let _isEditMode = false;
  let _isCustomHidden = false;
  let _cachedCourseData = {};

  // ─── Distinct High-Contrast Color Palette for Courses ──────────────────────
  const COURSE_PALETTE = [
    {
      id: "indigo",
      name: "Deep Indigo",
      bg: "#e8ecf5",
      border: "#b8c2d9",
      accent: "#0d1938",
      text: "#1e1b4b",
      room: "#0d1938",
      tagBg: "#b8c2d9",
      dot: "#132450",
    },
    {
      id: "emerald",
      name: "Emerald Green",
      bg: "#dcfce7",
      border: "#86efac",
      accent: "#15803d",
      text: "#052e16",
      room: "#15803d",
      tagBg: "#bbf7d0",
      dot: "#16a34a",
    },
    {
      id: "amber",
      name: "Warm Amber",
      bg: "#fff4c2",
      border: "#F4C542",
      accent: "#9a7200",
      text: "#451a03",
      room: "#9a7200",
      tagBg: "#f4d875",
      dot: "#F4C542",
    },
    {
      id: "sky",
      name: "Sky Blue",
      bg: "#e0f2fe",
      border: "#b8c2d9",
      accent: "#0d1938",
      text: "#082f49",
      room: "#132450",
      tagBg: "#bae6fd",
      dot: "#0ea5e9",
    },
    {
      id: "purple",
      name: "Royal Purple",
      bg: "#e8ecf5",
      border: "#d8b4fe",
      accent: "#132450",
      text: "#3b0764",
      room: "#132450",
      tagBg: "#e9d5ff",
      dot: "#9333ea",
    },
    {
      id: "rose",
      name: "Rose Coral",
      bg: "#ffe4e6",
      border: "#fda4af",
      accent: "#be123c",
      text: "#4c0519",
      room: "#e11d48",
      tagBg: "#fecdd3",
      dot: "#f43f5e",
    },
    {
      id: "teal",
      name: "Ocean Teal",
      bg: "#ccfbf1",
      border: "#5eead4",
      accent: "#0f766e",
      text: "#042f2e",
      room: "#0d9488",
      tagBg: "#99f6e4",
      dot: "#14b8a6",
    },
    {
      id: "orange",
      name: "Sunset Orange",
      bg: "#ffedd5",
      border: "#fdba74",
      accent: "#9a7200",
      text: "#431407",
      room: "#ea580c",
      tagBg: "#fed7aa",
      dot: "#f97316",
    },
    {
      id: "fuchsia",
      name: "Fuchsia Pink",
      bg: "#fae8ff",
      border: "#f0abfc",
      accent: "#a21caf",
      text: "#4a044e",
      room: "#c026d3",
      tagBg: "#f5d0fe",
      dot: "#d946ef",
    },
    {
      id: "cyan",
      name: "Electric Cyan",
      bg: "#ecfeff",
      border: "#a5f3fc",
      accent: "#132450",
      text: "#164e63",
      room: "#132450",
      tagBg: "#cffafe",
      dot: "#06b6d4",
    },
    {
      id: "lime",
      name: "Lime Mint",
      bg: "#f7fee7",
      border: "#d9f99d",
      accent: "#4d7c0f",
      text: "#1a2e05",
      room: "#4d7c0f",
      tagBg: "#ecfccb",
      dot: "#65a30d",
    },
    {
      id: "ruby",
      name: "Ruby Crimson",
      bg: "#ffe4e6",
      border: "#f43f5e",
      accent: "#be123c",
      text: "#881337",
      room: "#e11d48",
      tagBg: "#fecdd3",
      dot: "#e11d48",
    },
  ];

  function hexToHsl(hex) {
    let c = hex.replace("#", "");
    if (c.length === 3)
      c = c
        .split("")
        .map((x) => x + x)
        .join("");
    const num = parseInt(c, 16);
    let r = (num >> 16) / 255;
    let g = ((num >> 8) & 255) / 255;
    let b = (num & 255) / 255;

    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0,
      l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  function generateThemeFromHex(hex) {
    if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
      return COURSE_PALETTE[0];
    }
    const { h, s } = hexToHsl(hex);
    const sat = Math.max(s, 45);
    return {
      id: "custom_" + hex.replace("#", ""),
      name: "Custom (" + hex.toUpperCase() + ")",
      bg: `hsl(${h}, ${sat}%, 94%)`,
      border: `hsl(${h}, ${sat}%, 74%)`,
      accent: `hsl(${h}, ${sat}%, 40%)`,
      text: `hsl(${h}, ${sat}%, 13%)`,
      room: `hsl(${h}, ${sat}%, 36%)`,
      tagBg: `hsl(${h}, ${sat}%, 86%)`,
      dot: hex,
      customHex: hex,
    };
  }

  let _assignedColorIndex = 0;
  function initCourseColor(courseKey) {
    if (!courseKey) return COURSE_PALETTE[0];
    const cleanKey = courseKey.trim().toUpperCase();
    if (!_courseColorMap[cleanKey]) {
      const idx = _assignedColorIndex % COURSE_PALETTE.length;
      _assignedColorIndex++;
      _courseColorMap[cleanKey] = COURSE_PALETTE[idx];
    }
    return _courseColorMap[cleanKey];
  }

  function getCourseTheme(key, customColorVal = null) {
    if (customColorVal !== null && customColorVal !== undefined) {
      if (
        typeof customColorVal === "string" &&
        customColorVal.startsWith("#")
      ) {
        return generateThemeFromHex(customColorVal);
      }
      if (
        typeof customColorVal === "number" &&
        customColorVal >= 0 &&
        customColorVal < COURSE_PALETTE.length
      ) {
        return COURSE_PALETTE[customColorVal];
      }
    }

    if (!key) return COURSE_PALETTE[0];
    const cleanKey = key.trim().toUpperCase();

    if (_customCourseColors[cleanKey] !== undefined) {
      const val = _customCourseColors[cleanKey];
      if (typeof val === "string" && val.startsWith("#")) {
        return generateThemeFromHex(val);
      }
      if (typeof val === "number" && val >= 0 && val < COURSE_PALETTE.length) {
        return COURSE_PALETTE[val];
      }
    }

    if (_courseColorMap[cleanKey]) return _courseColorMap[cleanKey];
    return initCourseColor(cleanKey);
  }

  // ─── Inject Prime Light Theme CSS ─────────────────────────────────────────
  function injectTTStyles() {
    if (document.getElementById("tt-styles-v7")) return;
    const s = document.createElement("style");
    s.id = "tt-styles-v7";
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Space+Grotesk:wght@700;800&display=swap');

      /* ── Root Panel Container (Matching Prime Design) ── */
      #tt-panel {
        zoom: 1.05 !important;
        margin: 36px 0 24px 0 !important;
        padding: 0 !important;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
        border: 1.5px solid #e2e8f0 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        background: #ffffff !important;
        position: relative !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
        box-sizing: border-box !important;
        transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
      }
      #tt-panel:hover {
        border-color: #cbd5e1 !important;
      }

      #tt-export-area {
        background: #ffffff !important;
        width: 100% !important;
      }

      /* ── Top Header Toolbar ── */
      #tt-panel-head {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 12px 18px !important;
        border-bottom: 1px solid #e2e8f0 !important;
        background: #f8fafc !important;
        flex-wrap: wrap !important;
        gap: 12px !important;
      }

      .tt-brand-group {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
      }

      .tt-brand-title-row {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      .tt-brand-title {
        font-size: 14px !important;
        font-weight: 800 !important;
        color: #1e1b4b !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin: 0 !important;
        line-height: 1.2 !important;
      }

      .tt-revanced-badge {
        background: #e8ecf5 !important;
        color: #132450 !important;
        border: 1px solid #bfdbfe !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        padding: 3px 8px !important;
        border-radius: 6px !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        line-height: 1 !important;
      }

      .tt-sub-text {
        font-size: 11.5px !important;
        color: #64748b !important;
        font-weight: 700 !important;
        margin: 0 !important;
        letter-spacing: 0.01em !important;
      }

      .tt-portal-note {
        font-size: 11px !important;
        color: #9a7200 !important;
        font-weight: 600 !important;
        margin: 2px 0 0 0 !important;
        line-height: 1.35 !important;
      }
      .tt-portal-note b {
        color: #9a7200 !important;
        font-weight: 800 !important;
      }

      /* ── Actions Toolbar ── */
      .tt-toolbar {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
      }

      .tt-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        padding: 7px 14px !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        border-radius: 8px !important;
        border: 1px solid #e2e8f0 !important;
        cursor: pointer !important;
        background: #f8fafc !important;
        color: #475569 !important;
        transition: all 0.2s ease !important;
        line-height: 1 !important;
        text-decoration: none !important;
      }

      .tt-btn svg {
        flex-shrink: 0 !important;
      }

      .tt-btn:hover {
        background: #f1f5f9 !important;
        color: #1e1b4b !important;
        border-color: #cbd5e1 !important;
      }

      .tt-btn-primary {
        background: #e8ecf5 !important;
        color: #132450 !important;
        border-color: #b8c2d9 !important;
      }

      .tt-btn-primary:hover {
        background: #e8ecf5 !important;
        color: #0d1938 !important;
        border-color: #b8c2d9 !important;
      }

      /* Edit Mode Button Active State (Yellow Dotted UI) */
      .tt-btn-editing,
      #tt-panel.tt-edit-active #tt-edit-btn,
      .tt-edit-active #tt-edit-btn {
        background: #fffaf0 !important;
        color: #5c4500 !important;
        border: 2px dotted #F4C542 !important;
        box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.18) !important;
      }

      .tt-btn-editing:hover,
      #tt-panel.tt-edit-active #tt-edit-btn:hover,
      .tt-edit-active #tt-edit-btn:hover {
        background: #fff4c2 !important;
        color: #713f12 !important;
        border: 2px dotted #ca8a04 !important;
      }

      .tt-btn-active {
        background: #132450 !important;
        color: #ffffff !important;
        border-color: #0d1938 !important;
      }

      .tt-btn-danger {
        color: #dc2626 !important;
        border-color: #fecaca !important;
        background: #fff5f5 !important;
      }

      .tt-btn-danger:hover {
        background: #fee2e2 !important;
        border-color: #fca5a5 !important;
      }

      .tt-btn-download {
        background: #f0fdf4 !important;
        color: #15803d !important;
        border-color: #bbf7d0 !important;
      }

      .tt-btn-download:hover {
        background: #dcfce7 !important;
        border-color: #86efac !important;
      }

      /* ── Table Wrapper & Table ── */
      .tt-table-container {
        padding: 16px 18px 20px 18px !important;
        overflow-x: auto !important;
        background: #ffffff !important;
      }
      .tt-table-container.tt-downloading-original {
        padding: 30px 32px !important;
        background: #ffffff !important;
        box-shadow: none !important;
        border-radius: 12px !important;
        box-sizing: border-box !important;
      }

      #tt-panel table {
        table-layout: fixed !important;
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse !important;
        border: 1.5px solid #1e1b4b !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        background: #ffffff !important;
        margin: 0 !important;
      }

      /* Table Header */
      #tt-panel table thead th {
        background: #1e1b4b !important;
        color: #ffffff !important;
        font-weight: 800 !important;
        font-size: 10.5px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
        padding: 10px 8px !important;
        border: 1px solid #0d1938 !important;
        text-align: center !important;
        vertical-align: middle !important;
        white-space: nowrap !important;
      }

      /* Day column */
      #tt-panel table tbody td.tt-day-cell {
        background: #f8fafc !important;
        color: #1e1b4b !important;
        font-weight: 800 !important;
        font-size: 11px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        border-left: 4.5px solid #132450 !important;
        border-right: 1.5px solid #1e1b4b !important;
        border-top: 1px solid #cbd5e1 !important;
        border-bottom: 1px solid #cbd5e1 !important;
        padding: 10px 10px !important;
        white-space: nowrap !important;
        vertical-align: middle !important;
        text-align: center !important;
      }

      /* Standard body cell — FULL BOX COLOR FILL */
      #tt-panel table tbody td.tt-slot-cell {
        border: 1px solid #cbd5e1 !important;
        padding: 9px 9px !important;
        vertical-align: top !important;
        text-align: left !important;
        min-width: 100px !important;
        font-size: 11px !important;
        transition: all 0.15s ease !important;
        position: relative !important;
        box-sizing: border-box !important;
      }

      /* Editable slot styling */
      .tt-edit-active td.tt-slot-cell {
        cursor: pointer !important;
        outline: 1.5px dashed #132450 !important;
        outline-offset: -2px !important;
      }
      .tt-edit-active td.tt-slot-cell:hover {
        filter: brightness(0.93) !important;
      }

      /* Filled course block */
      .tt-slot-block {
        display: flex !important;
        flex-direction: column !important;
        gap: 3.5px !important;
        height: 100% !important;
        position: relative !important;
      }

      .tt-slot-code-badge {
        font-size: 8.5px !important;
        font-weight: 800 !important;
        padding: 1.5px 5px !important;
        border-radius: 0 !important;
        display: inline-block !important;
        width: fit-content !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        line-height: 1.2 !important;
        box-shadow: 0 1px 1px rgba(0,0,0,0.05) !important;
      }

      .tt-slot-title {
        font-weight: 700 !important;
        font-size: 11px !important;
        line-height: 1.25 !important;
        display: block !important;
        word-break: break-word !important;
      }

      .tt-slot-room {
        font-size: 9.5px !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
        display: block !important;
        margin-top: 1px !important;
      }

      /* Empty slot */
      .tt-empty-cell {
        background: #ffffff !important;
        border-left: 1px solid #cbd5e1 !important;
      }

      /* Unassigned code slot — light, subtle, never bold */
      .tt-unassigned-slot {
        background: #f8fafc !important;
        color: #94a3b8 !important;
        font-weight: 500 !important;
        font-size: 10.5px !important;
        text-align: center !important;
        vertical-align: middle !important;
      }

      .tt-unassigned-slot span {
        font-weight: 500 !important;
        color: #94a3b8 !important;
      }

      /* Custom Modified Slot */
      .tt-slot-modified {
        border-left: 4px solid #F4C542 !important;
      }

      .tt-modified-tag {
        font-size: 8px !important;
        font-weight: 800 !important;
        color: #9a7200 !important;
        background: #fff4c2 !important;
        border: 1px solid #f4d875 !important;
        padding: 1px 4.5px !important;
        display: inline-block !important;
        width: fit-content !important;
        letter-spacing: 0.04em !important;
      }

      /* Optional / Crossed Out Slot */
      .tt-slot-optional {
        opacity: 0.65 !important;
        background: repeating-linear-gradient(
          -45deg,
          #ffffff,
          #ffffff 8px,
          #f8fafc 8px,
          #f8fafc 16px
        ) !important;
        position: relative !important;
      }

      .tt-slot-optional .tt-slot-title {
        text-decoration: line-through 2px #dc2626 !important;
        color: #64748b !important;
      }

      .tt-slot-optional .tt-slot-room {
        text-decoration: line-through 1.5px #dc2626 !important;
        color: #94a3b8 !important;
      }

      .tt-optional-badge {
        font-size: 8px !important;
        font-weight: 800 !important;
        color: #991b1b !important;
        background: #fee2e2 !important;
        border: 1px solid #fca5a5 !important;
        padding: 1px 5px !important;
        display: inline-block !important;
        width: fit-content !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
      }

      /* Today Row Highlight */
      #tt-panel tr.tt-today-row td.tt-day-cell {
        background: #e8ecf5 !important;
        color: #1e40af !important;
        border-left: 5px solid #132450 !important;
      }
      #tt-panel tr.tt-today-row td.tt-slot-cell {
        box-shadow: inset 0 0 0 1.5px #60a5fa !important;
      }

      /* Dulled out rows */
      #tt-panel tr.tt-dull-row {
        opacity: 0.45 !important;
        transition: opacity 0.2s ease !important;
      }
      #tt-panel tr.tt-dull-row:hover {
        opacity: 0.95 !important;
      }

      /* ── In-Page Custom Modal Dialog ── */
      #tt-modal-backdrop,
      #tt-export-modal-backdrop {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(15, 23, 42, 0.6) !important;
        backdrop-filter: blur(5px) !important;
        -webkit-backdrop-filter: blur(5px) !important;
        z-index: 2147483640 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 0 !important;
        transition: opacity 0.2s ease !important;
        pointer-events: none !important;
      }
      #tt-modal-backdrop.tt-modal-open,
      #tt-export-modal-backdrop.tt-modal-open {
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      .tt-modal-window {
        width: 90% !important;
        max-width: 480px !important;
        background: #ffffff !important;
        border: 1.5px solid #1e1b4b !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35) !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        padding: 0 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        transform: translateY(12px) scale(0.98) !important;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      #tt-modal-backdrop.tt-modal-open .tt-modal-window,
      #tt-export-modal-backdrop.tt-modal-open .tt-modal-window {
        transform: translateY(0) scale(1) !important;
      }

      .tt-modal-head {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 12px 16px !important;
        background: #f8fafc !important;
        border-bottom: 1.5px solid #e2e8f0 !important;
      }
      .tt-modal-head h3 {
        margin: 0 !important;
        font-family: 'Space Grotesk', sans-serif !important;
        font-size: 15px !important;
        font-weight: 800 !important;
        color: #1e1b4b !important;
      }
      .tt-modal-close-btn {
        background: none !important;
        border: 1px solid #cbd5e1 !important;
        cursor: pointer !important;
        width: 24px !important;
        height: 24px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 16px !important;
        line-height: 1 !important;
        color: #64748b !important;
      }
      .tt-modal-close-btn:hover {
        background: #fee2e2 !important;
        color: #dc2626 !important;
        border-color: #fca5a5 !important;
      }

      .tt-modal-body {
        padding: 16px 18px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 13px !important;
      }

      .tt-form-field {
        display: flex !important;
        flex-direction: column !important;
        gap: 5px !important;
      }
      .tt-form-label {
        font-size: 11px !important;
        font-weight: 800 !important;
        color: #334155 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
      }
      .tt-form-input {
        width: 100% !important;
        border: 1px solid #cbd5e1 !important;
        background: #f8fafc !important;
        border-radius: 0 !important;
        padding: 8px 10px !important;
        font-size: 12.5px !important;
        font-family: inherit !important;
        color: #0f172a !important;
        box-sizing: border-box !important;
        outline: none !important;
        transition: all 0.15s ease !important;
      }
      .tt-form-input:focus {
        background: #ffffff !important;
        border-color: #132450 !important;
        box-shadow: 0 0 0 3px rgba(19, 36, 80, 0.15) !important;
      }

      .tt-swatch-grid {
        display: grid !important;
        grid-template-columns: repeat(6, 1fr) !important;
        gap: 8px !important;
        margin-top: 4px !important;
      }
      .tt-color-swatch {
        height: 30px !important;
        border: 1.5px solid #cbd5e1 !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.15s ease !important;
        border-radius: 0 !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.06) !important;
      }
      .tt-color-swatch:hover {
        transform: scale(1.08) !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12) !important;
      }
      .tt-color-swatch.tt-swatch-selected {
        border: 2px solid #1e1b4b !important;
        box-shadow: 0 0 0 2.5px #132450, 0 3px 8px rgba(19, 36, 80, 0.3) !important;
        transform: scale(1.1) !important;
      }

      .tt-custom-color-bar {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
        margin-top: 6px !important;
        padding: 5px 8px !important;
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 6px !important;
        transition: all 0.15s ease !important;
      }
      .tt-custom-color-bar.tt-custom-active {
        background: #e8ecf5 !important;
        border-color: #93c5fd !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18) !important;
      }

      .tt-custom-picker-pill {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 3px 8px !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 4px !important;
        background: #ffffff !important;
        cursor: pointer !important;
        position: relative !important;
        transition: all 0.15s ease !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
      }
      .tt-custom-picker-pill:hover {
        background: #f1f5f9 !important;
        border-color: #94a3b8 !important;
      }

      .tt-color-picker-input {
        position: absolute !important;
        opacity: 0 !important;
        width: 100% !important;
        height: 100% !important;
        left: 0 !important;
        top: 0 !important;
        cursor: pointer !important;
      }
      .tt-custom-color-preview {
        width: 13px !important;
        height: 13px !important;
        border-radius: 50% !important;
        border: 1.5px solid #ffffff !important;
        box-shadow: 0 0 0 1px #cbd5e1 !important;
        display: inline-block !important;
        flex-shrink: 0 !important;
      }

      .tt-hex-input-wrap {
        display: flex !important;
        align-items: center !important;
        background: #ffffff !important;
        border: 1.5px solid #cbd5e1 !important;
        border-radius: 4px !important;
        padding: 0 3px 0 6px !important;
        height: 26px !important;
        box-sizing: border-box !important;
        transition: all 0.15s ease !important;
      }
      .tt-hex-input-wrap:focus-within {
        border-color: #132450 !important;
        box-shadow: 0 0 0 2px rgba(19, 36, 80, 0.15) !important;
      }

      .tt-hex-hash {
        font-size: 11.5px !important;
        font-weight: 800 !important;
        color: #94a3b8 !important;
        user-select: none !important;
      }

      .tt-hex-input {
        border: none !important;
        background: transparent !important;
        outline: none !important;
        width: 62px !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        font-family: 'Space Grotesk', monospace, sans-serif !important;
        color: #0f172a !important;
        text-transform: uppercase !important;
        padding: 0 4px !important;
      }

      .tt-hex-apply-btn {
        background: #132450 !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 3px !important;
        width: 20px !important;
        height: 20px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
        padding: 0 !important;
      }
      .tt-hex-apply-btn:hover {
        background: #0d1938 !important;
        transform: scale(1.08) !important;
      }
      .tt-hex-apply-btn.applied {
        background: #16a34a !important;
      }

      .tt-checkbox-row {
        display: flex !important;
        align-items: flex-start !important;
        gap: 8px !important;
        margin-top: 2px !important;
        cursor: pointer !important;
      }
      .tt-checkbox-row input {
        cursor: pointer !important;
        accent-color: #132450 !important;
        margin-top: 2px !important;
      }
      .tt-checkbox-label {
        font-size: 11.5px !important;
        font-weight: 700 !important;
        color: #334155 !important;
        cursor: pointer !important;
        line-height: 1.35 !important;
      }

      .tt-modal-footer {
        padding: 12px 18px !important;
        background: #f8fafc !important;
        border-top: 1px solid #e2e8f0 !important;
        display: flex !important;
        justify-content: flex-end !important;
        gap: 8px !important;
      }

      /* ── Export Modal Dialog ── */
      .tt-export-option-grid {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 8px !important;
      }
      .tt-export-card-opt {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        text-align: center !important;
        gap: 6px !important;
        padding: 12px 8px !important;
        border: 1.5px solid #cbd5e1 !important;
        background: #f8fafc !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
      }
      .tt-export-card-opt:hover {
        background: #f1f5f9 !important;
        border-color: #94a3b8 !important;
      }
      .tt-export-card-opt.selected {
        border-color: #132450 !important;
        background: #e8ecf5 !important;
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.25) !important;
      }
      .tt-export-card-opt svg {
        stroke: #132450 !important;
      }
      .tt-export-opt-title {
        font-size: 11.5px !important;
        font-weight: 800 !important;
        color: #1e1b4b !important;
      }
      .tt-export-opt-sub {
        font-size: 10px !important;
        color: #64748b !important;
        font-weight: 600 !important;
      }

      /* Background Swatches for Export (8-column grid for 16 themes) */
      .tt-bg-swatch-grid {
        display: grid !important;
        grid-template-columns: repeat(8, 1fr) !important;
        gap: 7px !important;
      }
      .tt-bg-swatch {
        height: 32px !important;
        border-radius: 6px !important;
        border: 1.5px solid rgba(0,0,0,0.12) !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
        position: relative !important;
      }
      .tt-bg-swatch:hover {
        transform: scale(1.12) !important;
        z-index: 2 !important;
      }
      .tt-bg-swatch.selected {
        border-color: #ffffff !important;
        box-shadow: 0 0 0 2.5px #132450, 0 4px 10px rgba(79, 70, 229, 0.4) !important;
        transform: scale(1.14) !important;
        z-index: 3 !important;
      }
      .tt-export-custom-bg-row {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin-top: 8px !important;
        padding: 8px 10px !important;
        background: #f8fafc !important;
        border: 1.5px solid #e2e8f0 !important;
        border-radius: 8px !important;
      }
      .tt-export-custom-bg-row.active {
        border-color: #132450 !important;
        background: #e8ecf5 !important;
      }

      /* ── Export Quality Selection Pills ── */
      .tt-quality-pill-grid {
        display: flex !important;
        gap: 6px !important;
      }
      .tt-quality-pill {
        flex: 1 !important;
        padding: 6px 0 !important;
        text-align: center !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        font-family: 'Space Grotesk', sans-serif !important;
        color: #334155 !important;
        background: #f8fafc !important;
        border: 1.5px solid #cbd5e1 !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
      }
      .tt-quality-pill:hover {
        background: #f1f5f9 !important;
        border-color: #94a3b8 !important;
      }
      .tt-quality-pill.selected {
        background: #132450 !important;
        color: #ffffff !important;
        border-color: #0d1938 !important;
        box-shadow: 0 2px 6px rgba(19, 36, 80, 0.3) !important;
      }

      /* ── Download Dropdown Menu on Hover/Click ── */
      .tt-download-dropdown-wrap {
        position: relative !important;
        display: inline-flex !important;
      }
      .tt-download-menu {
        position: absolute !important;
        top: calc(100% + 4px) !important;
        right: 0 !important;
        background: #ffffff !important;
        border: 1.5px solid #cbd5e1 !important;
        border-radius: 10px !important;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15) !important;
        padding: 6px !important;
        display: none !important;
        flex-direction: column !important;
        gap: 4px !important;
        z-index: 10000 !important;
        min-width: 250px !important;
      }
      .tt-download-dropdown-wrap:hover .tt-download-menu,
      .tt-download-menu.show {
        display: flex !important;
      }
      .tt-download-menu-item {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 8px 10px !important;
        border-radius: 6px !important;
        border: 1px solid transparent !important;
        background: transparent !important;
        cursor: pointer !important;
        text-align: left !important;
        transition: all 0.15s ease !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .tt-download-menu-item:hover {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
      }
      .tt-menu-icon {
        width: 30px !important;
        height: 30px !important;
        border-radius: 6px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }
      .tt-menu-text {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
      }
      .tt-menu-title {
        font-size: 11.5px !important;
        font-weight: 800 !important;
        color: #1e1b4b !important;
        line-height: 1.2 !important;
      }
      .tt-menu-sub {
        font-size: 10px !important;
        color: #64748b !important;
        font-weight: 600 !important;
        line-height: 1.2 !important;
      }

      /* ── Prime About Card Styles (Identical to Original Attendance Design) ── */
      .tt-about-card {
        margin: 24px 0 32px 0 !important;
        background: #ffffff !important;
        border: 1.5px solid #e2e8f0 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
        transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
      }

      .tt-about-card:hover {
        border-color: #cbd5e1 !important;
      }

      .tt-about-header {
        background: #f8fafc !important;
        padding: 10px 14px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        cursor: pointer !important;
        user-select: none !important;
        transition: background-color 0.15s ease !important;
      }

      .tt-about-header:hover {
        background: #f1f5f9 !important;
      }

      .tt-about-title-group {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      .tt-about-title {
        font-size: 14px !important;
        font-weight: 800 !important;
        color: #1e1b4b !important;
        text-transform: uppercase !important;
        letter-spacing: 0.03em !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }

      .tt-free-forever-badge {
        background: #dcfce7 !important;
        color: #15803d !important;
        border: 1px solid #bbf7d0 !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        padding: 3px 8px !important;
        border-radius: 6px !important;
        letter-spacing: 0.04em !important;
        text-transform: uppercase !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
      }

      .tt-about-toggle-btn {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        color: #64748b !important;
      }

      .tt-about-chevron {
        transition: transform 0.3s ease !important;
      }

      .tt-about-chevron.open {
        transform: rotate(180deg) !important;
      }

      .tt-about-body {
        display: none;
        padding: 16px !important;
        border-top: 1px solid #e2e8f0 !important;
        background: #ffffff !important;
      }

      .tt-about-body.open {
        display: block !important;
      }

      .tt-about-nav-tabs {
        display: flex !important;
        gap: 8px !important;
        border-bottom: 1.5px solid #f1f5f9 !important;
        padding-bottom: 10px !important;
        margin-bottom: 14px !important;
        flex-wrap: wrap !important;
      }

      .tt-about-tab-btn {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        color: #64748b;
        border-radius: 8px !important;
        padding: 7px 14px !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        font-family: inherit !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }

      /* 0. Guide (Teal) */
      .tt-about-tab-btn.tt-btn-guide {
        color: #0f766e !important;
        background: #f0fdfa !important;
        border: 1px solid #99f6e4 !important;
      }
      .tt-about-tab-btn.tt-btn-guide.active,
      .tt-about-tab-btn.tt-btn-guide:hover {
        background: #ccfbf1 !important;
        border-color: #5eead4 !important;
        color: #115e59 !important;
        box-shadow: 0 2px 6px rgba(15, 118, 110, 0.12) !important;
      }

      /* 1. Changelog (Green) */
      .tt-about-tab-btn.tt-btn-changelog {
        color: #15803d !important;
        background: #fffaf0 !important;
        border: 1px solid #fff4c2 !important;
      }
      .tt-about-tab-btn.tt-btn-changelog.active,
      .tt-about-tab-btn.tt-btn-changelog:hover {
        background: #fff4c2 !important;
        border-color: #F4C542 !important;
        color: #14532d !important;
        box-shadow: 0 2px 6px rgba(22, 101, 52, 0.12) !important;
      }

      /* 2. Phone Guide (Purple) */
      .tt-about-tab-btn.tt-btn-android {
        color: #132450 !important;
        background: #e8ecf5 !important;
        border: 1px solid #ddd6fe !important;
      }
      .tt-about-tab-btn.tt-btn-android.active,
      .tt-about-tab-btn.tt-btn-android:hover {
        background: #e8ecf5 !important;
        border-color: #c4b5fd !important;
        color: #5b21b6 !important;
        box-shadow: 0 2px 6px rgba(109, 40, 217, 0.12) !important;
      }

      /* 3. FAQ (Sky Blue) */
      .tt-about-tab-btn.tt-btn-faq {
        color: #132450 !important;
        background: #e8ecf5 !important;
        border: 1px solid #bae6fd !important;
      }
      .tt-about-tab-btn.tt-btn-faq.active,
      .tt-about-tab-btn.tt-btn-faq:hover {
        background: #e0f2fe !important;
        border-color: #b8c2d9 !important;
        color: #0d1938 !important;
        box-shadow: 0 2px 6px rgba(2, 132, 199, 0.12) !important;
      }

      /* 5. Notice (Amber) */
      .tt-about-tab-btn.tt-btn-notice {
        color: #9a7200 !important;
        background: #fffaf0 !important;
        border: 1px solid #f4d875 !important;
      }
      .tt-about-tab-btn.tt-btn-notice.active,
      .tt-about-tab-btn.tt-btn-notice:hover {
        background: #fff4c2 !important;
        border-color: #F4C542 !important;
        color: #9a7200 !important;
        box-shadow: 0 2px 6px rgba(180, 83, 9, 0.12) !important;
      }

      /* 6. Important Links (Indigo) */
      .tt-about-tab-btn.tt-btn-links {
        color: #0d1938 !important;
        background: #e8ecf5 !important;
        border: 1px solid #b8c2d9 !important;
      }
      .tt-about-tab-btn.tt-btn-links.active,
      .tt-about-tab-btn.tt-btn-links:hover {
        background: #e8ecf5 !important;
        border-color: #b8c2d9 !important;
        color: #0d1938 !important;
        box-shadow: 0 2px 6px rgba(67, 56, 202, 0.12) !important;
      }

      /* 5. Bugs (Crimson Red) */
      .tt-about-tab-btn.tt-btn-bug {
        color: #dc2626 !important;
        background: #fff5f5 !important;
        border: 1px solid #fecaca !important;
      }
      .tt-about-tab-btn.tt-btn-bug.active,
      .tt-about-tab-btn.tt-btn-bug:hover {
        background: #fee2e2 !important;
        border-color: #fca5a5 !important;
        color: #b91c1c !important;
        box-shadow: 0 2px 6px rgba(220, 38, 38, 0.12) !important;
      }

      /* 6. Review (Warm Gold) */
      .tt-about-tab-btn.tt-btn-review {
        color: #9a7200 !important;
        background: #fffaf0 !important;
        border: 1px solid #f4d875 !important;
      }
      .tt-about-tab-btn.tt-btn-review.active,
      .tt-about-tab-btn.tt-btn-review:hover {
        background: #fff4c2 !important;
        border-color: #F4C542 !important;
        color: #9a7200 !important;
        box-shadow: 0 2px 6px rgba(180, 83, 9, 0.12) !important;
      }

      /* 6.1 SRM Contact Directory (Theme Green with Yellow Dotted Border) */
      .tt-about-tab-btn.tt-btn-contacts {
        color: #15803d !important;
        background: #f0fdf4 !important;
        border: 1.5px dotted #F4C542 !important;
        font-weight: 800 !important;
      }
      .tt-about-tab-btn.tt-btn-contacts.active,
      .tt-about-tab-btn.tt-btn-contacts:hover {
        background: #dcfce7 !important;
        border-color: #F4C542 !important;
        color: #14532d !important;
        box-shadow: 0 2px 6px rgba(21, 128, 61, 0.15) !important;
      }

      /* 7. Revanced Exclusive (Brown Button in rightmost corner) */
      .tt-about-tab-btn.tt-btn-exclusive {
        color: #5c4500 !important;
        background: #fdf6ed !important;
        border: 1px solid #d4a373 !important;
        margin-left: auto !important;
      }
      .tt-about-tab-btn.tt-btn-exclusive:hover {
        background: #fae8d4 !important;
        border-color: #9a7200 !important;
        color: #451a03 !important;
        box-shadow: 0 2px 6px rgba(120, 53, 15, 0.15) !important;
        transform: translateY(-1px) !important;
      }
      .tt-about-tab-btn.tt-btn-exclusive:active {
        transform: translateY(0) !important;
        box-shadow: none !important;
      }

      .tt-about-tab-pane {
        display: none;
      }

      .tt-about-tab-pane.active {
        display: block !important;
        animation: cgpaFadeIn 0.25s ease both !important;
      }

      .tt-changelog-ver-item {
        border-left: 3px solid #cbd5e1 !important;
        padding-left: 12px !important;
        margin-bottom: 14px !important;
      }
      .tt-changelog-ver-item.current {
        border-left-color: #10b981 !important;
      }
      .tt-changelog-ver-item:last-child {
        margin-bottom: 0 !important;
      }

      .tt-changelog-ver-head {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        margin-bottom: 5px !important;
      }

      .tt-changelog-ver-tag {
        font-size: 11px !important;
        font-weight: 800 !important;
        color: #132450 !important;
        background: #e8ecf5 !important;
        padding: 1.5px 6px !important;
        border-radius: 4px !important;
      }

      .tt-changelog-ver-tag.current {
        background: #dcfce7 !important;
        color: #15803d !important;
        border: 1px solid #86efac !important;
      }

      .tt-changelog-ver-tag.old {
        background: #f1f5f9 !important;
        color: #475569 !important;
        border: 1px solid #cbd5e1 !important;
      }

      .tt-live-badge {
        display: inline-flex !important;
        align-items: center !important;
        gap: 3px !important;
        background: #dcfce7 !important;
        color: #15803d !important;
        border: 1px solid #86efac !important;
        font-size: 8.5px !important;
        font-weight: 900 !important;
        padding: 1.5px 5px !important;
        border-radius: 4px !important;
        letter-spacing: 0.04em !important;
      }

      .tt-live-dot {
        width: 5px !important;
        height: 5px !important;
        background: #22c55e !important;
        border-radius: 50% !important;
        display: inline-block !important;
        animation: liveDotPulse 2s infinite !important;
      }

      .tt-changelog-ver-date {
        font-size: 10.5px !important;
        color: #94a3b8 !important;
        font-weight: 600 !important;
      }

      .tt-changelog-list {
        margin: 0 !important;
        padding-left: 18px !important;
        font-size: 11.5px !important;
        color: #334155 !important;
        line-height: 1.5 !important;
      }
      .tt-changelog-list li {
        margin-bottom: 3px !important;
      }

      .tt-step-item {
        display: flex !important;
        gap: 12px !important;
        margin-bottom: 12px !important;
        align-items: flex-start !important;
      }

      .tt-step-num {
        background: #132450 !important;
        color: #ffffff !important;
        font-size: 11px !important;
        font-weight: 900 !important;
        width: 22px !important;
        height: 22px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        margin-top: 1px !important;
      }

      .tt-step-text {
        font-size: 12px !important;
        color: #334155 !important;
        line-height: 1.5 !important;
        font-weight: 600 !important;
      }

      .tt-faq-item {
        margin-bottom: 14px !important;
        padding-bottom: 12px !important;
        border-bottom: 1px dashed #e2e8f0 !important;
      }
      .tt-faq-item:last-child {
        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
        border-bottom: none !important;
      }
      .tt-faq-q {
        font-size: 12.5px !important;
        font-weight: 800 !important;
        color: #1e1b4b !important;
        margin-bottom: 4px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }
      .tt-faq-a {
        font-size: 12px !important;
        color: #475569 !important;
        line-height: 1.5 !important;
        padding-left: 20px !important;
      }

      /* ── Attendance Portal Notice (Dismissible top alert) ── */
      .tt-attendance-notice {
        margin: 16px 0 16px 0 !important;
        background: #fffaf0 !important;
        border: 1.5px solid #f4d875 !important;
        border-radius: 12px !important;
        padding: 12px 16px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 12px !important;
        box-shadow: 0 4px 12px rgba(217, 119, 6, 0.06) !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        box-sizing: border-box !important;
        animation: cgpaFadeIn 0.25s ease both !important;
      }

      .tt-notice-left {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        flex-wrap: wrap !important;
        flex: 1 !important;
      }

      .tt-notice-icon {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }

      .tt-notice-content {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
        font-size: 12.5px !important;
        line-height: 1.4 !important;
      }

      .tt-notice-title {
        font-weight: 800 !important;
        color: #9a7200 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
        background: #fff4c2 !important;
        padding: 2px 7px !important;
        border-radius: 4px !important;
        border: 1px solid #f4d875 !important;
        font-size: 10px !important;
        display: inline-block !important;
      }

      .tt-notice-desc {
        font-weight: 700 !important;
        color: #5c4500 !important;
      }

      .tt-notice-close {
        background: none !important;
        border: 1px solid #f4d875 !important;
        color: #9a7200 !important;
        cursor: pointer !important;
        border-radius: 6px !important;
        width: 24px !important;
        height: 24px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        transition: all 0.15s ease !important;
        flex-shrink: 0 !important;
      }

      .tt-notice-close:hover {
        background: #fff4c2 !important;
        color: #5c4500 !important;
        border-color: #F4C542 !important;
      }

      /* ── Toast Notifications ── */
      #tt-toast-wrap {
        position: fixed !important;
        bottom: 30px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 6px !important;
        pointer-events: none !important;
      }

      .tt-toast-box {
        padding: 10px 20px !important;
        font-family: 'Plus Jakarta Sans', sans-serif !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        border-radius: 0 !important;
        pointer-events: auto !important;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.15) !important;
        transition: opacity 0.25s ease, transform 0.25s ease !important;
        opacity: 0 !important;
        transform: translateY(6px) !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        border: 1px solid transparent !important;
      }

      .tt-toast-info    { background: #e8ecf5 !important; color: #1e40af !important; border-color: #bfdbfe !important; }
      .tt-toast-success { background: #f0fdf4 !important; color: #166534 !important; border-color: #bbf7d0 !important; }
      .tt-toast-warn    { background: #fffaf0 !important; color: #9a7200 !important; border-color: #f4d875 !important; }

      /* GUIDE ACCORDION TOGGLE */
      details.guide-details summary .guide-collapse-txt { display: inline !important; }
      details.guide-details summary .guide-expand-txt { display: none !important; }
      details.guide-details:not([open]) summary .guide-collapse-txt { display: none !important; }
      details.guide-details:not([open]) summary .guide-expand-txt { display: inline !important; }

      /* ── Student Portal Custom Additions ── */
      #sp-tt-footer-note {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        flex-wrap: wrap !important;
        gap: 12px !important;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
        border: 1.5px solid #e2e8f0 !important;
        border-radius: 12px !important;
        padding: 10px 16px !important;
        margin-top: 14px !important;
        font-size: 11.5px !important;
        color: #475569 !important;
        box-sizing: border-box !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02) !important;
      }
      .sp-tt-sync-flow-wrap {
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
        flex-wrap: wrap !important;
      }
      .sp-tt-sync-badge {
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        background: #e8ecf5 !important;
        color: #0d1938 !important;
        border: 1px solid #b8c2d9 !important;
        padding: 3.5px 8.5px !important;
        border-radius: 6px !important;
        font-weight: 800 !important;
        font-size: 11px !important;
        letter-spacing: 0.02em !important;
      }
      .sp-tt-step-word {
        color: #475569 !important;
        font-weight: 600 !important;
        font-size: 11.5px !important;
      }
      .sp-tt-highlight-amber {
        color: #9a7200 !important;
        background: #fff4c2 !important;
        border: 1px solid #f4d875 !important;
        padding: 1px 5.5px !important;
        border-radius: 4px !important;
        font-weight: 800 !important;
        font-size: 11px !important;
      }
      .sp-tt-flow-btn {
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        border-radius: 7px !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        font-family: inherit !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
        vertical-align: middle !important;
        line-height: 1 !important;
        text-decoration: none !important;
        box-sizing: border-box !important;
      }
      .sp-tt-flow-acad {
        padding: 4.5px 10px !important;
        background: #f0fdf4 !important;
        border: 1px solid #86efac !important;
        color: #15803d !important;
      }
      .sp-tt-flow-acad:hover {
        background: #dcfce7 !important;
        border-color: #4ade80 !important;
        color: #166534 !important;
        box-shadow: 0 2px 5px rgba(22, 163, 74, 0.15) !important;
        transform: translateY(-0.5px) !important;
      }
      .sp-tt-flow-sync {
        padding: 4px 11px !important;
        background: #e8ecf5 !important;
        border: 1px solid #b8c2d9 !important;
        color: #0d1938 !important;
        border-radius: 6px !important;
        box-shadow: 0 1px 2px rgba(99, 102, 241, 0.08) !important;
      }
      .sp-tt-flow-sync:hover {
        background: #e8ecf5 !important;
        border-color: #818cf8 !important;
        color: #0d1938 !important;
        box-shadow: 0 2px 5px rgba(99, 102, 241, 0.18) !important;
        transform: translateY(-0.5px) !important;
      }
      .sp-tt-reset-wrap {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex-shrink: 0 !important;
      }
      .sp-tt-wrong-label {
        font-size: 11px !important;
        font-weight: 700 !important;
        color: #dc2626 !important;
        background: #fee2e2 !important;
        border: 1px solid #fecaca !important;
        padding: 2.5px 6.5px !important;
        border-radius: 5px !important;
      }
      .sp-tt-flow-reset {
        padding: 4px 9px !important;
        background: #fff1f2 !important;
        border: 1px solid #fecdd3 !important;
        color: #e11d48 !important;
      }
      .sp-tt-flow-reset:hover {
        background: #ffe4e6 !important;
        border-color: #fda4af !important;
        color: #be123c !important;
        box-shadow: 0 2px 5px rgba(225, 29, 72, 0.15) !important;
        transform: translateY(-0.5px) !important;
      }
      .sp-tt-today-chip {
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        background: #e8ecf5 !important;
        border: 1px solid #b8c2d9 !important;
        border-radius: 7px !important;
        padding: 3px 9px !important;
        font-size: 10.5px !important;
        font-weight: 800 !important;
        color: #0d1938 !important;
        margin-top: 4px !important;
        width: fit-content !important;
      }
      .sp-tt-today-chip .sp-today-dot {
        width: 6px !important;
        height: 6px !important;
        border-radius: 50% !important;
        background: #132450 !important;
        flex-shrink: 0 !important;
      }
    `;
    document.head.appendChild(s);
  }
  injectTTStyles();

  // ─── Toast Notification ─────────────────────────────────────────────────────
  function showToast(message, duration = 3000, type = "info") {
    let wrap = document.getElementById("tt-toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "tt-toast-wrap";
      document.body.appendChild(wrap);
    }

    const box = document.createElement("div");
    box.className = "tt-toast-box tt-toast-" + type;
    box.textContent = message;
    wrap.appendChild(box);

    setTimeout(() => {
      box.style.opacity = "1";
      box.style.transform = "translateY(0)";
    }, 10);
    setTimeout(() => {
      box.style.opacity = "0";
      box.style.transform = "translateY(6px)";
      setTimeout(() => box.remove(), 300);
    }, duration);
  }

  
  // ─── Helpers & Hours Filter (Till 4:50 PM) ────────────────────────────────────
  function getNetId() {
    if (window._spCachedNetId) {
      return window._spCachedNetId;
    }
    const acadEl = document.querySelector("#zc-account-settings > a > span.navbar_user_name");
    if (acadEl && acadEl.textContent.trim()) {
      return acadEl.textContent.trim();
    }
    const userElem =
      document.querySelector(".user-name, .profile-name, .username, #lblStudentName, #lblRegisterNo") ||
      document.querySelector("span[id*='StudentName'], span[id*='RegisterNo']");
    if (userElem && userElem.textContent.trim()) {
      return userElem.textContent.trim();
    }
    return "student";
  }

  function getStorageKey() {
    return "sp_ttData_" + (getNetId() || "student");
  }

  function isAfter450Header(str, colIdx = -1, totalCols = -1) {
    const clean = String(str || "").replace(/\s+/g, " ").trim().toLowerCase();

    // 1. Time range checks for slots starting at 4:50 PM or 5:30 PM (or 16:50 / 17:30)
    // Note: Must NOT match 04:00 - 04:50 (which ends at 04:50)
    const isStart450 =
      /(?:0?4[:.]5\d|16[:.]5\d)\s*[-–—~to]\s*(?:0?5[:.]\d\d|17[:.]\d\d)/i.test(clean) ||
      clean.includes("04:50 - 05:30") ||
      clean.includes("04:50-05:30") ||
      clean.includes("04.50 - 05.30") ||
      clean.includes("04.50-05.30") ||
      clean.includes("4:50 - 5:30") ||
      clean.includes("4:50-5:30") ||
      clean.includes("4.50 - 5.30") ||
      clean.includes("16:50 - 17:30") ||
      clean.includes("16:50-17:30") ||
      clean.includes("04:50 to 05:30");

    const isStart530 =
      /(?:0?5[:.]3\d|17[:.]3\d)\s*[-–—~to]\s*(?:0?6[:.]\d\d|18[:.]\d\d)/i.test(clean) ||
      clean.includes("05:30 - 06:10") ||
      clean.includes("05:30-06:10") ||
      clean.includes("05.30 - 06.10") ||
      clean.includes("05.30-06.10") ||
      clean.includes("5:30 - 6:10") ||
      clean.includes("5:30-6:10") ||
      clean.includes("5.30 - 6.10") ||
      clean.includes("17:30 - 18:10") ||
      clean.includes("17:30-18:10") ||
      clean.includes("05:30 to 06:10");

    if (isStart450 || isStart530) return true;

    // 2. Position checks when table has 12 or 13 header columns
    if (totalCols >= 13 && colIdx >= 11) return true;
    if (totalCols === 12 && colIdx >= 11) return true;

    // 3. Explicit Hour / Slot 11 or 12 indicator
    if (/\b(?:hour\s*11|hour\s*12|slot\s*11|slot\s*12)\b/i.test(clean)) return true;
    if (colIdx >= 10 && /\b(?:11|12)\b/.test(clean)) return true;

    return false;
  }

  function slotHasSubject(slot, courseData) {
    if (!slot) return false;
    const cData = courseData || _cachedCourseData || {};

    if (typeof slot === "object") {
      if (slot.isCourse === true) return true;
      if (slot.customTitle && slot.customTitle.trim().length > 0 && !slot.isOptional) return true;
      if (slot.origTitle && slot.origTitle.trim().length > 0) return true;
      if (slot.title && slot.title.trim().length > 0) return true;
      if (slot.code && slot.code.trim().length > 0) return true;
    }

    const rawText = (
      typeof slot === "object"
        ? slot.rawSlot || slot.title || slot.code || slot.slotKey || ""
        : String(slot || "")
    ).trim();

    if (!rawText) return false;

    // Check if stripped text is empty or just punctuation / placeholder
    const clean = rawText.replace(/[\s\-_.\/\\|:]+/g, "").trim().toLowerCase();
    if (
      !clean ||
      clean === "nil" ||
      clean === "null" ||
      clean === "none" ||
      clean === "na" ||
      clean === "n/a" ||
      clean === "nbsp" ||
      clean === "&nbsp;" ||
      clean === "undefined"
    ) {
      return false;
    }

    // Check against courseData if available
    if (cData && Object.keys(cData).length > 0) {
      // 1. Check primary key (e.g. "P11", "L11", "P51")
      const primaryKey = rawText.split("/")[0].trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (primaryKey && cData[primaryKey]) return true;

      // 2. Check all subparts (e.g. "P11/P12" -> "P11", "P12")
      const parts = rawText.split(/[\/+,&\s-]+/);
      for (const p of parts) {
        const pKey = p.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (pKey && cData[pKey]) return true;
      }

      // 3. Check all registered courses in cData for Slot / Code / Title match
      for (const k of Object.keys(cData)) {
        const c = cData[k];
        if (!c) continue;
        const cSlot = (c.Slot || c["Slot No."] || k || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        const cCode = (c["Course Code"] || c.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (primaryKey && (cSlot === primaryKey || cCode === primaryKey)) return true;
        for (const p of parts) {
          const pKey = p.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (pKey && (cSlot === pKey || cCode === pKey)) return true;
        }
        if (cCode && clean.includes(cCode.toLowerCase())) return true;
      }

      // If courses were provided and NONE matched, check if rawText is an actual course code / title
      // Generic unassigned slot tokens look like "P11", "L11", "P12", "L12", "P51", "P52", "A", "B", "11", "12", "P11/P12"
      const isGenericSlotToken = /^(?:[A-G]|P\d{1,3}|L\d{1,3}|\d{1,2})(?:\s*[\/+,]\s*(?:[A-G]|P\d{1,3}|L\d{1,3}|\d{1,2}))*$/i.test(rawText.trim());
      if (isGenericSlotToken) {
        return false;
      }

      // If it contains non-generic text (like subject name or code), treat as having subject
      return true;
    }

    // Fallback when courseData is not loaded: if clean text exists and is not a placeholder, keep it
    return true;
  }

  function filterTill450(data, courseData) {
    if (!data || !data.headers) return data;
    const cData = courseData || _cachedCourseData || {};
    const daysList = data.days || data.rows || [];
    const totalCols = data.headers.length;
    const excludeIndices = new Set();

    data.headers.forEach((h, idx) => {
      if (idx > 0 && isAfter450Header(h, idx, totalCols)) {
        const slotIdx = idx - 1;
        // Check if ANY day has a subject scheduled in this slot
        const hasAnySubject = daysList.some((day) => {
          const s = (day.slots || [])[slotIdx];
          return slotHasSubject(s, cData);
        });

        // If no day has a subject in this after-4:50 slot, exclude it (keep compact)
        // If it has subjects, do NOT exclude it (show in student portal)
        if (!hasAnySubject) {
          excludeIndices.add(idx);
        }
      }
    });

    if (excludeIndices.size === 0) {
      return {
        ...data,
        extraSlotFlag: true,
      };
    }

    const newHeaders = data.headers.filter((_, idx) => !excludeIndices.has(idx));
    const newDays = daysList.map((day) => {
      const newSlots = (day.slots || []).filter((_, sIdx) => !excludeIndices.has(sIdx + 1));
      return {
        ...day,
        slots: newSlots,
      };
    });

    return {
      ...data,
      headers: newHeaders,
      days: newDays,
      rows: newDays,
      extraSlotFlag: true,
    };
  }

  function parseTTToJSON(table, courseData) {
    const data = { headers: [], days: [], extraSlotFlag: true };
    if (!table) return data;
    const rows = table.querySelectorAll("tr");
    if (!rows.length) return data;

    const headerCells = rows[0].querySelectorAll("th,td");
    if (headerCells[0]) headerCells[0].textContent = "Day / Time";
    headerCells.forEach((c) => data.headers.push(c.textContent.trim()));

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll("td,th");
      if (!cells.length) continue;
      const dayName = cells[0].textContent.trim();
      if (
        dayName === "Time" ||
        dayName.includes("Hour/Day Order") ||
        dayName === "TO"
      )
        continue;

      const day = { dayName, slots: [] };
      for (let j = 1; j < cells.length; j++) {
        const c = cells[j];
        day.slots.push({
          rawSlot: c.textContent.trim(),
          bgColor: c.getAttribute("bgcolor") || c.style.backgroundColor || "",
        });
      }
      data.days.push(day);
    }
    return filterTill450(data, courseData || _cachedCourseData);
  }

  function renderTTFromJSON(jsonData, courseData) {
    if (!jsonData?.headers?.length) return "";

    const table = document.createElement("table");

    // Header row
    const thead = document.createElement("thead");
    const hRow = document.createElement("tr");
    jsonData.headers.forEach((txt, i) => {
      const th = document.createElement("th");
      th.textContent = txt;
      th.style.width = i === 0 ? "80px" : "auto";
      hRow.appendChild(th);
    });

    thead.appendChild(hRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement("tbody");
    let slotCounter = 1;

    jsonData.days.forEach((day, dayIdx) => {
      const tr = document.createElement("tr");
      tr.dataset.dayIndex = String(dayIdx + 1);

      // Day column
      const dayTd = document.createElement("td");
      dayTd.className = "tt-day-cell";
      dayTd.textContent = day.dayName;
      tr.appendChild(dayTd);

      // Slot cells
      day.slots.forEach((slot) => {
        const td = document.createElement("td");
        td.className = "tt-slot-cell";
        const cellId = "tt-slot-" + slotCounter++;
        td.id = cellId;

        const rawText = slot.rawSlot || "";
        const primaryKey = rawText
          .split("/")[0]
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");
        const parts = rawText
          .split(/[\/+,&\s-]+/)
          .map((s) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
          .filter(Boolean);

        let info = null;
        let matchedKey = "";
        if (courseData) {
          if (primaryKey && courseData[primaryKey]) {
            info = courseData[primaryKey];
            matchedKey = primaryKey;
          } else {
            for (const p of parts) {
              if (courseData[p]) {
                info = courseData[p];
                matchedKey = p;
                break;
              }
            }
          }
        }

        if (info) {
          const courseTitle = info["Course Title"] || matchedKey || primaryKey;
          const roomNo = info["Room No."] || "";
          const theme = getCourseTheme(courseTitle || matchedKey || primaryKey);

          td.dataset.isCourse = "true";
          td.dataset.origTitle = courseTitle;
          td.dataset.origRoom = roomNo;
          td.dataset.slotKey = matchedKey || primaryKey || rawText;
          td.dataset.rawSlot = rawText;

          td.style.backgroundColor = theme.bg;
          td.style.borderLeft = `3.5px solid ${theme.accent}`;

          td.innerHTML = `
            <div class="tt-slot-block">
              <div class="tt-slot-code-badge" style="background:${theme.tagBg}; color:${theme.text}; border:1px solid ${theme.border};">
                ${rawText}
              </div>
              <div class="tt-slot-title" style="color:${theme.text};">
                ${courseTitle}
              </div>
              ${roomNo ? `<div class="tt-slot-room" style="color:${theme.room};">Room: ${roomNo}</div>` : ""}
            </div>
          `;
        } else if (rawText !== "") {
          td.className += " tt-unassigned-slot";
          td.dataset.isCourse = "false";
          td.dataset.origTitle = "";
          td.dataset.origRoom = "";
          td.dataset.slotKey = primaryKey || rawText;
          td.dataset.rawSlot = rawText;
          td.innerHTML = `<span>${rawText}</span>`;
        } else {
          td.className += " tt-empty-cell";
          td.dataset.isCourse = "false";
          td.dataset.origTitle = "";
          td.dataset.origRoom = "";
          td.dataset.slotKey = "";
          td.dataset.rawSlot = "";
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table.outerHTML;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TODAY ROW HIGHLIGHTING
  // ────────────────────────────────────────────────────────────────────────────
  function highlightTodayRow(container) {
    let dayOrder = -1;
    const daySpan = document.querySelectorAll(
      'span.highlight strong font[color="yellow"]',
    )[1];
    if (daySpan) {
      const m = daySpan.textContent
        .replace("Day Order:", "")
        .trim()
        .match(/(\d+)/);
      if (m) dayOrder = parseInt(m[1], 10);
    }

    if (dayOrder === -1) return;

    const table = container.querySelector("table");
    if (!table) return;
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      const rowDay = parseInt(row.dataset.dayIndex, 10);
      if (rowDay === dayOrder) {
        row.classList.add("tt-today-row");
        row.classList.remove("tt-dull-row");
      } else {
        row.classList.remove("tt-today-row");
        row.classList.add("tt-dull-row");
      }
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // IN-PAGE CUSTOM MODAL DIALOG (Popup Window within Timetable)
  // ────────────────────────────────────────────────────────────────────────────
  let _activeEditCell = null;
  let _selectedColorValue = 0;

  function normalizeHex(input) {
    if (!input) return null;
    let hex = input.trim().replace(/^#/, "");
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
      return "#" + hex.toUpperCase();
    }
    return null;
  }

  function createEditModal() {
    if (document.getElementById("tt-modal-backdrop")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "tt-modal-backdrop";

    // Swatches HTML without tick marks
    const swatchesHtml = COURSE_PALETTE.map(
      (c, i) => `
      <div class="tt-color-swatch" data-color-idx="${i}" style="background:${c.bg};" title="${c.name}">
        <span style="width:11px; height:11px; border-radius:50%; background:${c.dot};"></span>
      </div>
    `,
    ).join("");

    backdrop.innerHTML = `
      <div class="tt-modal-window" id="ttModalWindow">
        <div class="tt-modal-head">
          <h3>Edit Slot Details</h3>
          <button type="button" class="tt-modal-close-btn" id="ttModalClose" title="Close">×</button>
        </div>
        <div class="tt-modal-body">
          <div class="tt-form-field">
            <label class="tt-form-label" for="ttModalTitle">Course Title / Subject Name</label>
            <input type="text" id="ttModalTitle" class="tt-form-input" placeholder="e.g. Data Structures & Algorithms">
          </div>

          <div class="tt-form-field">
            <label class="tt-form-label" for="ttModalRoom">Classroom / Room No.</label>
            <input type="text" id="ttModalRoom" class="tt-form-input" placeholder="e.g. TP401 or Tech Park 5th Floor">
          </div>

          <div class="tt-form-field">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <label class="tt-form-label" style="margin: 0;">Slot Block Color</label>
              <span style="font-size: 10px; color: #64748b; font-weight: 700;">Preset Palette & Custom Hex</span>
            </div>
            <div class="tt-swatch-grid" id="ttSwatchGrid">
              ${swatchesHtml}
            </div>

            <!-- Custom Hex / Color Picker Bar -->
            <div class="tt-custom-color-bar" id="ttCustomColorBar">
              <label class="tt-custom-picker-pill" title="Click to open color wheel picker">
                <input type="color" id="ttCustomColorPicker" class="tt-color-picker-input" value="#253b70">
                <span class="tt-custom-color-preview" id="ttCustomColorPreview" style="background: #253b70;"></span>
                <span style="font-size: 11px; font-weight: 800; color: #1e1b4b;">Color Picker</span>
              </label>

              <div class="tt-hex-input-wrap">
                <span class="tt-hex-hash">#</span>
                <input type="text" id="ttHexInput" class="tt-hex-input" placeholder="6366F1" maxlength="7" spellcheck="false">
                <button type="button" id="ttApplyHexBtn" class="tt-hex-apply-btn" title="Apply Hex Color (Tick to Confirm)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <label class="tt-checkbox-row">
            <input type="checkbox" id="ttIsOptional">
            <span class="tt-checkbox-label" style="color:#b91c1c;">Mark slot as Optional / Free / Cancelled (Cross out)</span>
          </label>

          <label class="tt-checkbox-row">
            <input type="checkbox" id="ttApplyToAllCourse" checked>
            <span class="tt-checkbox-label">Apply color & title to all matching slots of this subject</span>
          </label>
        </div>
        <div class="tt-modal-footer">
          <button type="button" class="tt-btn tt-btn-danger" id="ttModalRemove" style="margin-right:auto;">Reset Slot</button>
          <button type="button" class="tt-btn" id="ttModalCancel">Cancel</button>
          <button type="button" class="tt-btn tt-btn-primary" id="ttModalSave">Save Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const customColorBar = backdrop.querySelector("#ttCustomColorBar");
    const customColorPicker = backdrop.querySelector("#ttCustomColorPicker");
    const customColorPreview = backdrop.querySelector("#ttCustomColorPreview");
    const hexInput = backdrop.querySelector("#ttHexInput");
    const applyHexBtn = backdrop.querySelector("#ttApplyHexBtn");

    // Helper to apply hex
    function applyCustomHex(hexStr, showSuccess = true) {
      const valid = normalizeHex(hexStr);
      if (valid) {
        _selectedColorValue = valid;
        if (customColorPicker) customColorPicker.value = valid;
        if (customColorPreview) customColorPreview.style.background = valid;
        if (hexInput) hexInput.value = valid.replace("#", "").toUpperCase();
        if (customColorBar) customColorBar.classList.add("tt-custom-active");
        backdrop
          .querySelectorAll(".tt-color-swatch")
          .forEach((s) => s.classList.remove("tt-swatch-selected"));
        if (applyHexBtn) {
          applyHexBtn.classList.add("applied");
          setTimeout(() => applyHexBtn.classList.remove("applied"), 1200);
        }
        if (showSuccess) showToast("Custom color selected!", 1200, "success");
        return true;
      } else {
        showToast(
          "Please enter a valid 3 or 6-digit hex code (e.g. #FF5500).",
          3000,
          "error",
        );
        return false;
      }
    }

    // Bind Swatch Clicks
    backdrop.querySelectorAll(".tt-color-swatch").forEach((el) => {
      el.onclick = () => {
        backdrop
          .querySelectorAll(".tt-color-swatch")
          .forEach((s) => s.classList.remove("tt-swatch-selected"));
        if (customColorBar) customColorBar.classList.remove("tt-custom-active");
        el.classList.add("tt-swatch-selected");
        _selectedColorValue = parseInt(el.dataset.colorIdx, 10);
        if (COURSE_PALETTE[_selectedColorValue]) {
          const dot = COURSE_PALETTE[_selectedColorValue].dot;
          if (customColorPreview) customColorPreview.style.background = dot;
          if (customColorPicker) customColorPicker.value = dot;
          if (hexInput) hexInput.value = dot.replace("#", "").toUpperCase();
        }
      };
    });

    // Bind Custom Color Picker
    if (customColorPicker) {
      const handleCustomColor = (e) => {
        const hex = e.target.value.toUpperCase();
        applyCustomHex(hex, false);
      };
      customColorPicker.addEventListener("input", handleCustomColor);
      customColorPicker.addEventListener("change", handleCustomColor);
    }

    // Bind Hex Apply Button (Tick)
    if (applyHexBtn && hexInput) {
      applyHexBtn.onclick = () => {
        applyCustomHex(hexInput.value, true);
      };
      hexInput.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          applyCustomHex(hexInput.value, true);
        }
      };
    }

    // Close on backdrop / buttons
    document.getElementById("ttModalClose").onclick = closeEditModal;
    document.getElementById("ttModalCancel").onclick = closeEditModal;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeEditModal();
    };

    // Save button
    document.getElementById("ttModalSave").onclick = saveModalChanges;

    // Reset single slot button
    document.getElementById("ttModalRemove").onclick = removeSingleSlotEdit;
  }

  function openEditModal(cell) {
    createEditModal();
    _activeEditCell = cell;

    const currentTitle =
      cell.querySelector(".tt-slot-title")?.textContent?.trim() ||
      cell.dataset.origTitle ||
      "";
    const currentRoom = (cell.querySelector(".tt-slot-room")?.textContent || "")
      .replace("Room: ", "")
      .trim();
    const slotKey = cell.dataset.slotKey || cell.dataset.rawSlot || "";
    const isOptional = cell.dataset.isOptional === "true";

    document.getElementById("ttModalTitle").value = currentTitle;
    document.getElementById("ttModalRoom").value = currentRoom;
    document.getElementById("ttIsOptional").checked = isOptional;

    // Find current color theme
    const theme = getCourseTheme(currentTitle || slotKey);
    const swatches = document.querySelectorAll(".tt-color-swatch");
    const customColorBar = document.getElementById("ttCustomColorBar");
    const customColorPreview = document.getElementById("ttCustomColorPreview");
    const colorPicker = document.getElementById("ttCustomColorPicker");
    const hexInput = document.getElementById("ttHexInput");

    swatches.forEach((s) => s.classList.remove("tt-swatch-selected"));
    if (customColorBar) customColorBar.classList.remove("tt-custom-active");

    if (theme && theme.customHex) {
      _selectedColorValue = theme.customHex;
      if (colorPicker) colorPicker.value = theme.customHex;
      if (hexInput)
        hexInput.value = theme.customHex.replace("#", "").toUpperCase();
      if (customColorPreview)
        customColorPreview.style.background = theme.customHex;
      if (customColorBar) customColorBar.classList.add("tt-custom-active");
    } else {
      let idx = COURSE_PALETTE.indexOf(theme);
      if (idx === -1) idx = 0;
      _selectedColorValue = idx;
      if (swatches[idx]) swatches[idx].classList.add("tt-swatch-selected");
      const dot = COURSE_PALETTE[idx].dot;
      if (colorPicker) colorPicker.value = dot;
      if (hexInput) hexInput.value = dot.replace("#", "").toUpperCase();
      if (customColorPreview) customColorPreview.style.background = dot;
    }

    const backdrop = document.getElementById("tt-modal-backdrop");
    backdrop.classList.add("tt-modal-open");
    setTimeout(() => document.getElementById("ttModalTitle").focus(), 50);
  }

  function closeEditModal() {
    const backdrop = document.getElementById("tt-modal-backdrop");
    if (backdrop) backdrop.classList.remove("tt-modal-open");
    _activeEditCell = null;
  }

  async function saveModalChanges() {
    if (!_activeEditCell) return;

    const titleInput = document.getElementById("ttModalTitle").value.trim();
    const roomInput = document.getElementById("ttModalRoom").value.trim();
    const isOptional = document.getElementById("ttIsOptional").checked;
    const applyToAll = document.getElementById("ttApplyToAllCourse").checked;
    const slotKey =
      _activeEditCell.dataset.slotKey || _activeEditCell.dataset.rawSlot || "";

    const theme = getCourseTheme(titleInput || slotKey, _selectedColorValue);

    const key = getStorageKey();
    const stored = await chrome.storage.local.get(key).catch(() => ({}));
    const data = stored[key] || {};
    data.editedSlots = data.editedSlots || {};
    data.courseColors = data.courseColors || {};

    if (applyToAll && slotKey) {
      data.courseColors[slotKey.toUpperCase()] = _selectedColorValue;
      if (titleInput) {
        data.courseColors[titleInput.toUpperCase()] = _selectedColorValue;
      }
      _customCourseColors[slotKey.toUpperCase()] = _selectedColorValue;

      const table = document.querySelector("#tt-panel table");
      if (table) {
        table.querySelectorAll("td.tt-slot-cell").forEach((c) => {
          if (c.dataset.slotKey === slotKey || c.dataset.rawSlot === slotKey) {
            const cellOptional =
              c.id === _activeEditCell.id
                ? isOptional
                : c.dataset.isOptional === "true";
            applySlotEditToDOM(
              c,
              titleInput,
              roomInput,
              theme,
              false,
              cellOptional,
            );
            data.editedSlots[c.id] = {
              title: titleInput,
              room: roomInput,
              colorIndex: _selectedColorValue,
              slotKey: slotKey,
              isOptional: cellOptional,
            };
          }
        });
      }
    } else {
      applySlotEditToDOM(
        _activeEditCell,
        titleInput,
        roomInput,
        theme,
        false,
        isOptional,
      );
      data.editedSlots[_activeEditCell.id] = {
        title: titleInput,
        room: roomInput,
        colorIndex: _selectedColorValue,
        slotKey: slotKey,
        isOptional: isOptional,
      };
    }

    await chrome.storage.local.set({ [key]: data });
    closeEditModal();
    showToast(
      isOptional
        ? "Slot marked as Optional (Crossed out) & saved!"
        : "Modifications saved successfully!",
      2200,
      "success",
    );
    updateResetAllButtonDynamic();
  }

  async function removeSingleSlotEdit() {
    if (!_activeEditCell) return;

    const cellId = _activeEditCell.id;
    const origTitle = _activeEditCell.dataset.origTitle || "";
    const origRoom = _activeEditCell.dataset.origRoom || "";
    const slotKey =
      _activeEditCell.dataset.slotKey || _activeEditCell.dataset.rawSlot || "";
    const origTheme = getCourseTheme(origTitle || slotKey);

    _activeEditCell.classList.remove("tt-slot-modified", "tt-slot-optional");
    _activeEditCell.dataset.isOptional = "false";
    applySlotEditToDOM(
      _activeEditCell,
      origTitle,
      origRoom,
      origTheme,
      true,
      false,
    );

    const key = getStorageKey();
    const stored = await chrome.storage.local.get(key).catch(() => ({}));
    const data = stored[key] || {};
    if (data.editedSlots && data.editedSlots[cellId]) {
      delete data.editedSlots[cellId];
      await chrome.storage.local.set({ [key]: data });
    }

    closeEditModal();
    showToast("Slot reset to original schedule.", 2000, "info");
    updateResetAllButtonDynamic();
  }

  function applySlotEditToDOM(
    cell,
    title,
    room,
    theme,
    isReset = false,
    isOptional = false,
  ) {
    if (!cell) return;

    cell.dataset.isOptional = isOptional ? "true" : "false";

    if (isOptional) {
      cell.classList.add("tt-slot-optional");
    } else {
      cell.classList.remove("tt-slot-optional");
    }

    if (!isReset) {
      cell.classList.add("tt-slot-modified");
    } else {
      cell.classList.remove("tt-slot-modified");
    }

    const rawSlot = cell.dataset.rawSlot || "";
    const isCourse = cell.dataset.isCourse === "true";

    // If reset or showing original view
    if (isReset) {
      if (!isCourse) {
        if (rawSlot) {
          // Restore unassigned slot cleanly without bold text or color fill
          cell.className = "tt-slot-cell tt-unassigned-slot";
          cell.style.backgroundColor = "";
          cell.style.borderLeft = "";
          cell.innerHTML = `<span>${rawSlot}</span>`;
          return;
        } else {
          // Restore empty cell cleanly
          cell.className = "tt-slot-cell tt-empty-cell";
          cell.style.backgroundColor = "#ffffff";
          cell.style.borderLeft = "1px solid #cbd5e1";
          cell.innerHTML = "";
          return;
        }
      }
    }

    // Handle empty cells cleanly
    if (!title && !rawSlot && !room) {
      cell.className = "tt-slot-cell tt-empty-cell";
      cell.style.backgroundColor = "#ffffff";
      cell.style.borderLeft = "1px solid #cbd5e1";
      cell.innerHTML = "";
      return;
    }

    cell.classList.remove("tt-empty-cell", "tt-unassigned-slot");
    cell.style.backgroundColor = theme.bg;
    cell.style.borderLeft = `3.5px solid ${theme.accent}`;

    let badgeHtml = "";
    if (isOptional) {
      badgeHtml = `<div class="tt-optional-badge">OPTIONAL / OFF</div>`;
    } else if (!isReset) {
      badgeHtml = `<div class="tt-modified-tag">CUSTOM</div>`;
    }

    cell.innerHTML = `
      <div class="tt-slot-block">
        ${badgeHtml}
        ${
          rawSlot
            ? `
          <div class="tt-slot-code-badge" style="background:${theme.tagBg}; color:${theme.text}; border:1px solid ${theme.border};">
            ${rawSlot}
          </div>`
            : ""
        }
        ${
          title
            ? `
          <div class="tt-slot-title" style="color:${theme.text};">
            ${title}
          </div>`
            : ""
        }
        ${room ? `<div class="tt-slot-room" style="color:${theme.room};">Room: ${room}</div>` : ""}
      </div>
    `;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // STORAGE PERSISTENCE LOAD
  // ────────────────────────────────────────────────────────────────────────────
  async function loadCustomEdits() {
    const table = document.querySelector("#tt-panel table");
    if (!table) return;

    const key = getStorageKey();
    const stored = await chrome.storage.local.get(key).catch(() => ({}));
    const data = stored[key] || {};
    const edits = data.editedSlots || {};
    _customCourseColors = data.courseColors || {};

    Object.keys(edits).forEach((id) => {
      const cell = table.querySelector("#" + id);
      if (!cell) return;

      const edit = edits[id];
      const theme = getCourseTheme(edit.title || edit.slotKey, edit.colorIndex);
      applySlotEditToDOM(
        cell,
        edit.title,
        edit.room,
        theme,
        false,
        !!edit.isOptional,
      );
    });
    updateResetAllButtonDynamic();
  }

  async function updateResetAllButtonDynamic() {
    const resetBtn = document.getElementById("tt-reset-btn");
    const toggleBtn = document.getElementById("tt-toggle-btn");
    const key = getStorageKey();
    let hasEdits = false;
    try {
      const stored = await chrome.storage.local.get(key).catch(() => ({}));
      const data = stored[key] || {};
      const editedCount = Object.keys(data.editedSlots || {}).length;
      const colorCount = Object.keys(data.courseColors || {}).length;
      hasEdits = editedCount > 0 || colorCount > 0;
    } catch (e) {
      hasEdits = false;
    }

    if (resetBtn) {
      resetBtn.style.display = hasEdits ? "inline-flex" : "none";
    }
    if (toggleBtn) {
      toggleBtn.style.display = hasEdits ? "inline-flex" : "none";
    }
  }

  async function resetAllModifications() {
    const key = getStorageKey();
    const stored = await chrome.storage.local.get(key).catch(() => ({}));
    const data = stored[key] || {};
    const hasEdits =
      (data.editedSlots && Object.keys(data.editedSlots).length > 0) ||
      (data.courseColors && Object.keys(data.courseColors).length > 0);

    if (!hasEdits) {
      showToast("No customizations to reset.", 2000, "info");
      updateResetAllButtonDynamic();
      return;
    }

    if (
      !confirm(
        "Are you sure you want to reset all customized & optional slots back to the original schedule?",
      )
    )
      return;

    delete data.editedSlots;
    delete data.courseColors;
    _customCourseColors = {};
    _courseColorMap = {};

    await chrome.storage.local.set({ [key]: data });

    // Dynamically restore all table cells in-place without refreshing
    const table = document.querySelector("#tt-panel table");
    if (table) {
      table.querySelectorAll("td.tt-slot-cell").forEach((cell) => {
        const origTitle = cell.dataset.origTitle || "";
        const origRoom = cell.dataset.origRoom || "";
        const rawSlot = cell.dataset.rawSlot || "";
        const slotKey = cell.dataset.slotKey || rawSlot;
        const origTheme = getCourseTheme(origTitle || slotKey);
        cell.classList.remove("tt-slot-modified", "tt-slot-optional");
        cell.dataset.isOptional = "false";
        applySlotEditToDOM(cell, origTitle, origRoom, origTheme, true, false);
      });
    }

    _isCustomHidden = false;
    const toggleBtn = document.getElementById("tt-toggle-btn");
    if (toggleBtn) {
      toggleBtn.classList.remove("tt-btn-active");
      toggleBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
        <span>Hide Custom</span>
      `;
    }

    updateResetAllButtonDynamic();
    showToast("All customizations reset to default timetable.", 2500, "info");
  }

  function toggleCustomView() {
    const table = document.querySelector("#tt-panel table");
    if (!table) return;

    _isCustomHidden = !_isCustomHidden;
    const toggleBtn = document.getElementById("tt-toggle-btn");
    if (toggleBtn) {
      toggleBtn.innerHTML = _isCustomHidden
        ? `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        Show Custom
      `
        : `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
        Hide Custom
      `;
      if (_isCustomHidden) toggleBtn.classList.add("tt-btn-active");
      else toggleBtn.classList.remove("tt-btn-active");
    }

    if (_isCustomHidden) {
      table.querySelectorAll("td.tt-slot-cell").forEach((cell) => {
        const origTitle = cell.dataset.origTitle || "";
        const origRoom = cell.dataset.origRoom || "";
        const slotKey = cell.dataset.slotKey || cell.dataset.rawSlot || "";
        const origTheme = getCourseTheme(origTitle || slotKey);
        applySlotEditToDOM(cell, origTitle, origRoom, origTheme, true, false);
      });
      showToast("Showing original timetable schedule", 2000, "info");
    } else {
      loadCustomEdits();
      showToast("Showing customized timetable schedule", 2000, "success");
    }
  }

  function toggleEditMode() {
    const panel = document.getElementById("tt-panel");
    const editBtn = document.getElementById("tt-edit-btn");
    if (!panel || !editBtn) return;

    _isEditMode = !_isEditMode;

    if (_isEditMode) {
      panel.classList.add("tt-edit-active");
      editBtn.classList.add("tt-btn-editing");
      editBtn.classList.remove("tt-btn-primary");
      editBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Done Editing</span>
      `;
      showToast(
        "Click any slot cell to edit details or mark it as optional.",
        4500,
        "info",
      );

      panel.querySelectorAll("td.tt-slot-cell").forEach((cell) => {
        cell.onclick = (e) => {
          if (!_isEditMode) return;
          openEditModal(cell);
        };
      });
    } else {
      panel.classList.remove("tt-edit-active");
      editBtn.classList.remove("tt-btn-editing", "tt-btn-primary");
      editBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span>Edit Slots</span>
      `;

      panel.querySelectorAll("td.tt-slot-cell").forEach((cell) => {
        cell.onclick = null;
      });
      showToast("Editing closed & modifications saved.", 2500, "success");
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ULTRA CRISP HD EXPORT SYSTEM (10x Resolution • Square WhatsApp DP & Custom Studio Backdrops)
  // ────────────────────────────────────────────────────────────────────────────
  const EXPORT_BG_THEMES = [
    {
      id: "midnight",
      name: "Midnight Indigo",
      css: "linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #0f172a 100%)",
      stops: [
        [0, "#0b0f19"],
        [0.5, "#1e1b4b"],
        [1, "#0f172a"],
      ],
    },
    {
      id: "violet",
      name: "Deep Violet",
      css: "linear-gradient(135deg, #180d2b 0%, #4c1d95 50%, #1e1b4b 100%)",
      stops: [
        [0, "#180d2b"],
        [0.5, "#4c1d95"],
        [1, "#1e1b4b"],
      ],
    },
    {
      id: "tokyo",
      name: "Tokyo Cyberpunk",
      css: "linear-gradient(135deg, #0f172a 0%, #701a75 50%, #132450 100%)",
      stops: [
        [0, "#0f172a"],
        [0.5, "#701a75"],
        [1, "#132450"],
      ],
    },
    {
      id: "sunset",
      name: "Sunset Velvet",
      css: "linear-gradient(135deg, #1e1b4b 0%, #9f1239 50%, #ea580c 100%)",
      stops: [
        [0, "#1e1b4b"],
        [0.5, "#9f1239"],
        [1, "#ea580c"],
      ],
    },
    {
      id: "aurora",
      name: "Aurora Borealis",
      css: "linear-gradient(135deg, #022c22 0%, #0d9488 50%, #1e1b4b 100%)",
      stops: [
        [0, "#022c22"],
        [0.5, "#0d9488"],
        [1, "#1e1b4b"],
      ],
    },
    {
      id: "ocean",
      name: "Oceanic Abyss",
      css: "linear-gradient(135deg, #042f2e 0%, #132450 50%, #1e3a8a 100%)",
      stops: [
        [0, "#042f2e"],
        [0.5, "#132450"],
        [1, "#1e3a8a"],
      ],
    },
    {
      id: "emerald",
      name: "Emerald Forest",
      css: "linear-gradient(135deg, #022c22 0%, #059669 50%, #064e3b 100%)",
      stops: [
        [0, "#022c22"],
        [0.5, "#059669"],
        [1, "#064e3b"],
      ],
    },
    {
      id: "rosegold",
      name: "Rose Gold Luxe",
      css: "linear-gradient(135deg, #2e1065 0%, #831843 50%, #f43f5e 100%)",
      stops: [
        [0, "#2e1065"],
        [0.5, "#831843"],
        [1, "#f43f5e"],
      ],
    },
    {
      id: "cosmic",
      name: "Cosmic Nebula",
      css: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      stops: [
        [0, "#0f0c29"],
        [0.5, "#302b63"],
        [1, "#24243e"],
      ],
    },
    {
      id: "electric",
      name: "Electric Indigo",
      css: "linear-gradient(135deg, #030712 0%, #132450 50%, #6b83b4 100%)",
      stops: [
        [0, "#030712"],
        [0.5, "#132450"],
        [1, "#6b83b4"],
      ],
    },
    {
      id: "amber",
      name: "Royal Amber",
      css: "linear-gradient(135deg, #1c1917 0%, #5c4500 50%, #9a7200 100%)",
      stops: [
        [0, "#1c1917"],
        [0.5, "#5c4500"],
        [1, "#9a7200"],
      ],
    },
    {
      id: "crimson",
      name: "Crimson Dusk",
      css: "linear-gradient(135deg, #1f0204 0%, #7f1d1d 50%, #b91c1c 100%)",
      stops: [
        [0, "#1f0204"],
        [0.5, "#7f1d1d"],
        [1, "#b91c1c"],
      ],
    },
    {
      id: "obsidian",
      name: "Dark Obsidian",
      css: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)",
      stops: [
        [0, "#020617"],
        [0.5, "#0f172a"],
        [1, "#1e293b"],
      ],
    },
    {
      id: "black",
      name: "Pitch OLED Black",
      css: "linear-gradient(135deg, #000000 0%, #0a0a0a 100%)",
      stops: [
        [0, "#000000"],
        [1, "#0a0a0a"],
      ],
    },
    {
      id: "frost",
      name: "Frost Mist",
      css: "linear-gradient(135deg, #f8fafc 0%, #e8ecf5 50%, #e8ecf5 100%)",
      stops: [
        [0, "#f8fafc"],
        [0.5, "#e8ecf5"],
        [1, "#e8ecf5"],
      ],
    },
    {
      id: "white",
      name: "Pure White",
      css: "#ffffff",
      stops: [
        [0, "#ffffff"],
        [1, "#ffffff"],
      ],
    },
  ];

  let _selectedExportBg = "midnight";
  let _customExportBgHex = "#132450";

  function drawCanvasBackground(ctx, width, height, bgId) {
    if (bgId && bgId.startsWith("#")) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, bgId);
      grad.addColorStop(1, "#0a0e1a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const theme =
      EXPORT_BG_THEMES.find((b) => b.id === bgId) || EXPORT_BG_THEMES[0];
    if (theme.stops && theme.stops.length) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      theme.stops.forEach(([pos, color]) => grad.addColorStop(pos, color));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = theme.css || "#1e1b4b";
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  function getH2C() {
    if (typeof html2canvas === "function") return html2canvas;
    if (
      typeof window !== "undefined" &&
      typeof window.html2canvas === "function"
    )
      return window.html2canvas;
    if (
      typeof globalThis !== "undefined" &&
      typeof globalThis.html2canvas === "function"
    )
      return globalThis.html2canvas;
    if (typeof self !== "undefined" && typeof self.html2canvas === "function")
      return self.html2canvas;
    return null;
  }

  async function loadHtml2Canvas() {
    let existing = getH2C();
    if (existing) return existing;

    try {
      const res = await fetch(
        chrome.runtime.getURL("src/timetable/html2canvas.min.js"),
      );
      const code = await res.text();
      const fn = new Function(
        code +
          "; return (typeof html2canvas !== 'undefined' ? html2canvas : (window.html2canvas || globalThis.html2canvas || self.html2canvas));",
      );
      existing = fn();
      if (existing) {
        window.html2canvas = existing;
        return existing;
      }
    } catch (e) {
      console.warn("[TT] fetch/eval html2canvas fallback error:", e);
    }

    existing = getH2C();
    if (existing) return existing;
    throw new Error("html2canvas library is not ready.");
  }

  let _isDownloading = false;
  let _countdownInterval = null;
  let _downloadSafetyTimeout = null;

  function startDownloadProgress(btnEl, estimatedSeconds = 3) {
    if (_isDownloading) {
      showToast(
        "⏳ Download already in progress, please wait...",
        2000,
        "info",
      );
      return null;
    }
    _isDownloading = true;

    clearTimeout(_downloadSafetyTimeout);
    _downloadSafetyTimeout = setTimeout(() => {
      _isDownloading = false;
    }, 12000);

    let timeLeft = estimatedSeconds;
    const origHtml = btnEl ? btnEl.innerHTML : "";

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.style.pointerEvents = "none";
      btnEl.style.opacity = "0.85";
      btnEl.innerHTML = `<span>⏳ Downloading in ${timeLeft}s...</span>`;
    }
    showToast(
      `⏳ Rendering 10x Ultra-HD Image (Downloading in ${timeLeft}s)…`,
      (estimatedSeconds + 2) * 1000,
      "info",
    );

    _countdownInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft > 0) {
        if (btnEl)
          btnEl.innerHTML = `<span>⏳ Downloading in ${timeLeft}s...</span>`;
      } else {
        if (btnEl) btnEl.innerHTML = `<span>⏳ Saving PNG...</span>`;
      }
    }, 1000);

    return function endDownloadProgress() {
      clearInterval(_countdownInterval);
      clearTimeout(_downloadSafetyTimeout);
      _isDownloading = false;
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.style.pointerEvents = "auto";
        btnEl.style.opacity = "1";
        btnEl.innerHTML = origHtml;
      }
    };
  }

  function triggerDownloadFromCanvas(canvas, fileName, mimeType = "image/png") {
    const isJpeg = mimeType === "image/jpeg";
    try {
      const dataUrl = canvas.toDataURL(mimeType, isJpeg ? 0.94 : 1.0);
      if (dataUrl && dataUrl.length > 100) {
        const a = document.createElement("a");
        a.style.position = "fixed";
        a.style.left = "-9999px";
        a.style.top = "-9999px";
        a.href = dataUrl;
        a.download = fileName;
        (document.body || document.documentElement).appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) a.parentNode.removeChild(a);
        }, 1000);
        return true;
      }
    } catch (e) {
      console.warn("[TT] dataURL download fallback to blob:", e);
    }

    if (canvas.toBlob) {
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.position = "fixed";
          a.style.left = "-9999px";
          a.style.top = "-9999px";
          a.href = url;
          a.download = fileName;
          (document.body || document.documentElement).appendChild(a);
          a.click();
          setTimeout(() => {
            if (a.parentNode) a.parentNode.removeChild(a);
            URL.revokeObjectURL(url);
          }, 15000);
        },
        mimeType,
        isJpeg ? 0.94 : 1.0,
      );
      return true;
    }
    return false;
  }

  async function downloadOriginal10x() {
    const tableEl =
      document.querySelector("#tt-panel table") ||
      document.querySelector("#tt-panel .tt-table-container");
    if (!tableEl) {
      showToast("Timetable table not found.", 3000, "error");
      return;
    }

    const downloadMainBtn = document.getElementById("ttDownloadMainBtn");
    const stopProgress = startDownloadProgress(downloadMainBtn, 3);
    if (!stopProgress) return;

    const wasInEditMode = _isEditMode;
    const panel = document.getElementById("tt-panel");
    if (wasInEditMode && panel) panel.classList.remove("tt-edit-active");

    try {
      const h2c = await loadHtml2Canvas();

      const rawCanvas = await h2c(tableEl, {
        scale: 3.5,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      if (wasInEditMode && panel) panel.classList.add("tt-edit-active");

      const netId = getNetId() || "student";
      const stored = await chrome.storage.local
        .get("ttProfile_" + netId)
        .catch(() => ({}));
      const prof = stored["ttProfile_" + netId] || {};

      const tw = rawCanvas.width;
      const th = rawCanvas.height;

      // Generous, balanced padding & heights for header/footer
      const padX = Math.round(tw * 0.04);
      const headerH = Math.round(tw * 0.065);
      const footerH = Math.round(tw * 0.048);
      const totalW = tw + padX * 2;
      const totalH = th + headerH + footerH + Math.round(tw * 0.025);

      const paddedCanvas = document.createElement("canvas");
      paddedCanvas.width = totalW;
      paddedCanvas.height = totalH;
      const pCtx = paddedCanvas.getContext("2d");

      // 1. Clean White Studio Background
      pCtx.fillStyle = "#ffffff";
      pCtx.fillRect(0, 0, totalW, totalH);

      const drawX = padX;
      const drawY = headerH + Math.round(tw * 0.012);
      const headerCenterY = Math.round(headerH * 0.52);

      // ── TOP HEADER BANNER ──
      pCtx.save();
      // Left: Title
      pCtx.font = `800 ${Math.round(totalW * 0.024)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      pCtx.fillStyle = "#0f172a";
      pCtx.textAlign = "left";
      pCtx.textBaseline = "middle";
      pCtx.fillText(
        "TIME TABLE",
        drawX,
        headerCenterY - Math.round(totalW * 0.011),
      );

      // Small Prime Tag
      const ttTextWidth = pCtx.measureText("TIME TABLE").width;
      const tagX = drawX + ttTextWidth + Math.round(totalW * 0.01);
      const tagY = headerCenterY - Math.round(totalW * 0.022);
      const tagW = Math.round(totalW * 0.075);
      const tagH = Math.round(totalW * 0.02);
      pCtx.fillStyle = "#e8ecf5";
      drawRoundedRect(pCtx, tagX, tagY, tagW, tagH, 4);
      pCtx.fill();
      pCtx.strokeStyle = "#bfdbfe";
      pCtx.lineWidth = 1.2;
      pCtx.stroke();

      pCtx.font = `800 ${Math.round(totalW * 0.0105)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      pCtx.fillStyle = "#132450";
      pCtx.textAlign = "center";
      pCtx.fillText("PRIME", tagX + tagW / 2, tagY + tagH / 2 + 1);

      // Subtitle below: Branch / Section
      pCtx.font = `600 ${Math.round(totalW * 0.0135)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      pCtx.fillStyle = "#475569";
      pCtx.textAlign = "left";
      let branchLabel = prof.programmeBranch
        ? prof.programmeBranch
        : "SRMIST Academia";
      if (prof.section && !branchLabel.includes(prof.section)) {
        branchLabel += ` • Section ${prof.section}`;
      }
      pCtx.fillText(
        branchLabel,
        drawX,
        headerCenterY + Math.round(totalW * 0.014),
      );
      pCtx.restore();

      // Right: Section Pill Badge
      pCtx.save();
      const badgeH = Math.round(totalW * 0.032);
      const badgeText = prof.section
        ? `SECTION ${prof.section}`
        : "ACADEMIC SCHEDULE";
      pCtx.font = `800 ${Math.round(totalW * 0.0125)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      const badgeTextW = pCtx.measureText(badgeText).width;
      const badgeW = badgeTextW + Math.round(totalW * 0.024);
      const badgeX = drawX + tw - badgeW;
      const badgeY = headerCenterY - Math.round(badgeH * 0.5);

      pCtx.fillStyle = "rgba(15, 23, 42, 0.06)";
      drawRoundedRect(
        pCtx,
        badgeX,
        badgeY,
        badgeW,
        badgeH,
        Math.round(badgeH / 2),
      );
      pCtx.fill();
      pCtx.strokeStyle = "rgba(15, 23, 42, 0.12)";
      pCtx.lineWidth = 1.2;
      pCtx.stroke();

      pCtx.fillStyle = "#0d1938";
      pCtx.textAlign = "center";
      pCtx.textBaseline = "middle";
      pCtx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
      pCtx.restore();

      // 4. Draw Table Card Base & Shadow
      pCtx.save();
      pCtx.shadowColor = "rgba(0, 0, 0, 0.08)";
      pCtx.shadowBlur = Math.round(totalW * 0.015);
      pCtx.shadowOffsetX = 0;
      pCtx.shadowOffsetY = Math.round(totalW * 0.005);
      const radius = Math.round(totalW * 0.008);

      drawRoundedRect(pCtx, drawX, drawY, tw, th, radius);
      pCtx.fillStyle = "#ffffff";
      pCtx.fill();
      pCtx.restore();

      // 5. Draw the Table
      pCtx.save();
      drawRoundedRect(pCtx, drawX, drawY, tw, th, radius);
      pCtx.clip();
      pCtx.drawImage(rawCanvas, drawX, drawY);
      pCtx.restore();

      // 6. Draw Subtle Table Border
      pCtx.save();
      pCtx.lineWidth = 1.5;
      pCtx.strokeStyle = "#e2e8f0";
      drawRoundedRect(pCtx, drawX, drawY, tw, th, radius);
      pCtx.stroke();
      pCtx.restore();

      // ── BOTTOM FOOTER BANNER ──
      const footerCenterY = drawY + th + Math.round(footerH * 0.6);

      pCtx.save();
      // Left: University Name
      pCtx.font = `700 ${Math.round(totalW * 0.013)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      pCtx.fillStyle = "#475569";
      pCtx.textAlign = "left";
      pCtx.textBaseline = "middle";
      pCtx.fillText(
        "SRM Institute of Science and Technology",
        drawX,
        footerCenterY,
      );

      // Right: Minimal Branding
      pCtx.font = `600 ${Math.round(totalW * 0.012)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      pCtx.fillStyle = "#64748b";
      pCtx.textAlign = "right";
      pCtx.fillText("Academia Prime", drawX + tw, footerCenterY);
      pCtx.restore();

      const fileName =
        `Prime_Timetable_${prof.section || netId}_Original_10x.png`.replace(
          /\s+/g,
          "_",
        );

      triggerDownloadFromCanvas(paddedCanvas, fileName);
      stopProgress();
      showToast("10x Ultra-HD Original Timetable downloaded!", 3000, "success");
    } catch (err) {
      if (wasInEditMode && panel) panel.classList.add("tt-edit-active");
      stopProgress();
      console.error("[TT] Original download error:", err);
      showToast("Download error: " + (err.message || err), 4000, "error");
    }
  }

  function createExportModal() {
    if (document.getElementById("tt-export-modal-backdrop")) {
      return;
    }

    _selectedExportBg = "midnight";
    const backdrop = document.createElement("div");
    backdrop.id = "tt-export-modal-backdrop";

    const bgSwatchesHtml = EXPORT_BG_THEMES.map(
      (b) => `
      <div class="tt-bg-swatch ${b.id === _selectedExportBg ? "selected" : ""}" data-bg-id="${b.id}" style="background:${b.css};" title="${b.name}"></div>
    `,
    ).join("");

    backdrop.innerHTML = `
      <div class="tt-modal-window" id="ttExportModalWindow" style="max-width: 480px;">
        <div class="tt-modal-head">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="12" cy="12" r="5"/>
            </svg>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #1e1b4b;">WhatsApp DP (1:1 Square)</h3>
          </div>
          <button type="button" class="tt-modal-close-btn" id="ttExportModalClose" title="Close">×</button>
        </div>
        <div class="tt-modal-body">
          <div class="tt-form-field" id="ttExportBgField">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label class="tt-form-label" style="margin: 0; font-size: 11px; font-weight: 800; color: #334155;">Background Theme</label>
              <span style="font-size: 11px; color: #0d1938; font-weight: 800;" id="ttExportBgName">Midnight Indigo</span>
            </div>
            <div class="tt-bg-swatch-grid" id="ttBgSwatchGrid">
              ${bgSwatchesHtml}
            </div>

            <!-- Custom Background Section -->
            <div class="tt-export-custom-bg-row" id="ttExportCustomRow" style="margin-top: 10px;">
              <div class="tt-custom-picker-pill" style="position: relative;">
                <span class="tt-custom-color-preview" id="ttExportCustomPreview" style="background:${_customExportBgHex};"></span>
                <span style="font-size: 11px; font-weight: 700; color: #334155;">Custom Color</span>
                <input type="color" class="tt-color-picker-input" id="ttExportCustomPicker" value="${_customExportBgHex}">
              </div>
              <div class="tt-hex-input-wrap">
                <span class="tt-hex-hash">#</span>
                <input type="text" class="tt-hex-input" id="ttExportCustomHex" maxlength="6" value="${_customExportBgHex.replace("#", "")}" placeholder="4F46E5">
                <button type="button" class="tt-hex-apply-btn" id="ttExportCustomApplyBtn" title="Apply Custom Color">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Format & Quality Controls -->
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <div class="tt-form-field" style="flex: 1.1;">
              <label class="tt-form-label" style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; color: #334155;">Image Format</label>
              <div class="tt-quality-pill-grid" id="ttFormatPillGrid">
                <button type="button" class="tt-quality-pill tt-format-pill selected" data-format="png">PNG</button>
                <button type="button" class="tt-quality-pill tt-format-pill" data-format="jpeg">JPEG</button>
              </div>
            </div>

            <div class="tt-form-field" style="flex: 2.2;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="tt-form-label" style="margin: 0; font-size: 11px; font-weight: 800; color: #334155;">Resolution Quality</label>
                <span style="font-size: 11px; color: #0d1938; font-weight: 800;" id="ttExportQualityLabel">10x (Ultra-HD Max Quality)</span>
              </div>
              <div class="tt-quality-pill-grid" id="ttQualityPillGrid">
                <button type="button" class="tt-quality-pill tt-qual-pill" data-quality="1x">1x</button>
                <button type="button" class="tt-quality-pill tt-qual-pill" data-quality="2x">2x</button>
                <button type="button" class="tt-quality-pill tt-qual-pill" data-quality="4x">4x</button>
                <button type="button" class="tt-quality-pill tt-qual-pill" data-quality="6x">6x</button>
                <button type="button" class="tt-quality-pill tt-qual-pill selected" data-quality="10x">10x</button>
              </div>
            </div>
          </div>

          <!-- WhatsApp Compression Real-Tone Notice -->
          <div style="margin-top: 10px; display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; background: #fffaf0; border: 1px solid #f4d875; border-radius: 8px; font-size: 10.5px; color: #9a7200; line-height: 1.45;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c69a22" stroke-width="2.5" style="flex-shrink: 0; margin-top: 1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="font-weight: 800; color: #5c4500;">NOTE:</span>
              <ul style="margin: 0; padding-left: 14px; list-style-type: disc;">
                <li>WhatsApp automatically blurs & compresses profile photos (DP) upon upload.</li>
                <li>Higher quality results in larger file size.</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="tt-modal-footer">
          <button type="button" class="tt-btn" id="ttExportModalCancel">Cancel</button>
          <button type="button" class="tt-btn tt-btn-primary" id="ttExportModalDownload">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const bgSwatches = backdrop.querySelectorAll(".tt-bg-swatch");
    const bgNameEl = backdrop.querySelector("#ttExportBgName");
    const customRow = backdrop.querySelector("#ttExportCustomRow");
    const customPicker = backdrop.querySelector("#ttExportCustomPicker");
    const customHexInput = backdrop.querySelector("#ttExportCustomHex");
    const customPreview = backdrop.querySelector("#ttExportCustomPreview");
    const customApplyBtn = backdrop.querySelector("#ttExportCustomApplyBtn");

    let _selectedExportFormat = "png";
    const formatPills = backdrop.querySelectorAll(".tt-format-pill");
    formatPills.forEach((fp) => {
      fp.onclick = () => {
        formatPills.forEach((x) => x.classList.remove("selected"));
        fp.classList.add("selected");
        _selectedExportFormat = fp.dataset.format || "png";
      };
    });

    let _selectedExportQuality = "10x";
    const qualityPills = backdrop.querySelectorAll(".tt-qual-pill");
    const qualityLabel = backdrop.querySelector("#ttExportQualityLabel");
    const qualityDescMap = {
      "1x": "1x (Normal Quality)",
      "2x": "2x (High Quality)",
      "4x": "4x (Super Quality)",
      "6x": "6x (Ultra-HD Quality)",
      "10x": "10x (Ultra-HD Max Quality)",
    };

    qualityPills.forEach((qp) => {
      qp.onclick = () => {
        qualityPills.forEach((x) => x.classList.remove("selected"));
        qp.classList.add("selected");
        _selectedExportQuality = qp.dataset.quality || "10x";
        if (qualityLabel) {
          qualityLabel.textContent =
            qualityDescMap[_selectedExportQuality] || _selectedExportQuality;
        }
      };
    });

    function applyCustomExportColor(hexVal) {
      if (!hexVal) return;
      let clean = hexVal.trim().replace(/^#+/, "");
      if (clean.length === 3) {
        clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
      }
      if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
        _customExportBgHex = "#" + clean.toUpperCase();
        _selectedExportBg = _customExportBgHex;

        if (customPicker) customPicker.value = _customExportBgHex;
        if (customHexInput) customHexInput.value = clean.toUpperCase();
        if (customPreview) customPreview.style.background = _customExportBgHex;
        if (bgNameEl) bgNameEl.textContent = `Custom (${_customExportBgHex})`;

        bgSwatches.forEach((x) => x.classList.remove("selected"));
        if (customRow) customRow.classList.add("active");

        if (customApplyBtn) {
          customApplyBtn.classList.add("applied");
          setTimeout(() => customApplyBtn.classList.remove("applied"), 1200);
        }
      }
    }

    if (customPicker) {
      customPicker.oninput = (e) => applyCustomExportColor(e.target.value);
    }
    if (customHexInput) {
      customHexInput.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          applyCustomExportColor(customHexInput.value);
        }
      };
    }
    if (customApplyBtn) {
      customApplyBtn.onclick = () =>
        applyCustomExportColor(customHexInput.value);
    }

    // Bind Background Selection
    bgSwatches.forEach((s) => {
      s.onclick = () => {
        bgSwatches.forEach((x) => x.classList.remove("selected"));
        s.classList.add("selected");
        if (customRow) customRow.classList.remove("active");
        _selectedExportBg = s.dataset.bgId;
        const theme = EXPORT_BG_THEMES.find((b) => b.id === _selectedExportBg);
        if (theme && bgNameEl) bgNameEl.textContent = theme.name;
      };
    });

    // Bind Close & Download
    document.getElementById("ttExportModalClose").onclick = closeExportModal;
    document.getElementById("ttExportModalCancel").onclick = closeExportModal;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeExportModal();
    };

    document.getElementById("ttExportModalDownload").onclick = async () => {
      const modalDlBtn = document.getElementById("ttExportModalDownload");
      const selectedBg = _selectedExportBg;
      const quality = _selectedExportQuality || "10x";
      const imgFormat = _selectedExportFormat || "png";
      const success = await generateAndDownloadExport(
        "whatsapp",
        selectedBg,
        modalDlBtn,
        quality,
        imgFormat,
      );
      if (success !== false) {
        closeExportModal();
      }
    };
  }

  function openExportModal() {
    createExportModal();
    const backdrop = document.getElementById("tt-export-modal-backdrop");
    if (backdrop) {
      setTimeout(() => {
        backdrop.classList.add("tt-modal-open");
      }, 20);
    }
  }

  function closeExportModal() {
    const backdrop = document.getElementById("tt-export-modal-backdrop");
    if (backdrop) backdrop.classList.remove("tt-modal-open");
  }

  async function generateAndDownloadExport(
    format = "whatsapp",
    bgId = "midnight",
    triggerBtnEl = null,
    quality = "10x",
    imgFormat = "png",
  ) {
    if (format === "clean") {
      return downloadOriginal10x();
    }

    const tableEl =
      document.querySelector("#tt-panel table") ||
      document.querySelector("#tt-panel .tt-table-container");
    if (!tableEl) {
      showToast("Timetable table not found.", 3000, "error");
      return false;
    }

    const activeBtn =
      triggerBtnEl || document.getElementById("ttDownloadMainBtn");
    const stopProgress = startDownloadProgress(activeBtn, 3);
    if (!stopProgress) return false;

    const wasInEditMode = _isEditMode;
    const panel = document.getElementById("tt-panel");
    if (wasInEditMode && panel) panel.classList.remove("tt-edit-active");

    try {
      const h2c = await loadHtml2Canvas();

      const qualityScaleMap = {
        "1x": 1.2,
        "2x": 1.8,
        "4x": 2.6,
        "6x": 3.4,
        "10x": 4.2,
      };
      const scaleFactor = qualityScaleMap[quality] || 4.2;

      // Render the live table container directly at selected resolution
      const rawTableCanvas = await h2c(tableEl, {
        scale: scaleFactor,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      if (wasInEditMode && panel) panel.classList.add("tt-edit-active");

      const netId = getNetId() || "student";
      const stored = await chrome.storage.local
        .get("ttProfile_" + netId)
        .catch(() => ({}));
      const prof = stored["ttProfile_" + netId] || {};

      const fileSuffix = `WhatsApp_1x1_${bgId && bgId.startsWith("#") ? "custom" : bgId}_${quality}`;

      // 1:1 PERFECT SQUARE COMPOSITE
      const tw = rawTableCanvas.width;
      const th = rawTableCanvas.height;

      // Snug square sizing with minimal padding (table fills ~90% of the square)
      const sqSize = Math.round(Math.max(tw * 1.1, th * 1.38));

      const sqCanvas = document.createElement("canvas");
      sqCanvas.width = sqSize;
      sqCanvas.height = sqSize;
      const ctx = sqCanvas.getContext("2d");

      // 1. Draw Background (Preset Gradient or Custom Color)
      drawCanvasBackground(ctx, sqSize, sqSize, bgId);

      // 2. Compute Centered Coordinates
      const drawX = Math.round((sqSize - tw) / 2);
      const drawY = Math.round((sqSize - th) / 2) + Math.round(sqSize * 0.012);
      const radius = Math.round(sqSize * 0.012);

      // Theme-adaptive text styling
      const isLightBg = bgId === "white" || bgId === "frost";
      const textColor = isLightBg ? "#0f172a" : "#ffffff";
      const textSubColor = isLightBg ? "#475569" : "rgba(255, 255, 255, 0.75)";
      const pillBg = isLightBg
        ? "rgba(15, 23, 42, 0.06)"
        : "rgba(255, 255, 255, 0.12)";
      const pillBorder = isLightBg
        ? "rgba(15, 23, 42, 0.12)"
        : "rgba(255, 255, 255, 0.22)";
      const pillTextColor = isLightBg ? "#0d1938" : "#b8c2d9";

      // ── TOP HEADER BANNER ──
      const topSpace = drawY;
      const headerCenterY = Math.round(topSpace * 0.52);

      ctx.save();
      // Left: Title
      ctx.font = `800 ${Math.round(sqSize * 0.024)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "TIME TABLE",
        drawX,
        headerCenterY - Math.round(sqSize * 0.012),
      );

      // Small Prime Pill next to TIME TABLE
      const ttTextWidth = ctx.measureText("TIME TABLE").width;
      const tagX = drawX + ttTextWidth + Math.round(sqSize * 0.01);
      const tagY = headerCenterY - Math.round(sqSize * 0.023);
      const tagW = Math.round(sqSize * 0.075);
      const tagH = Math.round(sqSize * 0.02);
      ctx.fillStyle = isLightBg ? "#e8ecf5" : "rgba(99, 102, 241, 0.28)";
      drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 4);
      ctx.fill();
      ctx.strokeStyle = isLightBg ? "#bfdbfe" : "rgba(165, 180, 252, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.font = `800 ${Math.round(sqSize * 0.0105)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      ctx.fillStyle = isLightBg ? "#132450" : "#b8c2d9";
      ctx.textAlign = "center";
      ctx.fillText("PRIME", tagX + tagW / 2, tagY + tagH / 2 + 1);

      // Subtitle below: Branch / Section
      ctx.font = `600 ${Math.round(sqSize * 0.0135)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      ctx.fillStyle = textSubColor;
      ctx.textAlign = "left";
      let branchLabel = prof.programmeBranch
        ? prof.programmeBranch
        : "SRMIST Academia";
      if (prof.section && !branchLabel.includes(prof.section)) {
        branchLabel += ` • Section ${prof.section}`;
      }
      ctx.fillText(
        branchLabel,
        drawX,
        headerCenterY + Math.round(sqSize * 0.014),
      );
      ctx.restore();

      // Right: Section Pill Badge
      ctx.save();
      const badgeH = Math.round(sqSize * 0.032);
      const badgeText = prof.section
        ? `SECTION ${prof.section}`
        : "ACADEMIC SCHEDULE";
      ctx.font = `800 ${Math.round(sqSize * 0.0125)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      const badgeTextW = ctx.measureText(badgeText).width;
      const badgeW = badgeTextW + Math.round(sqSize * 0.024);
      const badgeX = drawX + tw - badgeW;
      const badgeY = headerCenterY - Math.round(badgeH * 0.5);

      ctx.fillStyle = pillBg;
      drawRoundedRect(
        ctx,
        badgeX,
        badgeY,
        badgeW,
        badgeH,
        Math.round(badgeH / 2),
      );
      ctx.fill();
      ctx.strokeStyle = pillBorder;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = pillTextColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
      ctx.restore();

      // 3. Draw Soft Card Shadow & Card Base
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = Math.round(sqSize * 0.035);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.round(sqSize * 0.015);

      drawRoundedRect(ctx, drawX, drawY, tw, th, radius);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      // 4. Clip and Draw the Original Table inside the rounded frame
      ctx.save();
      drawRoundedRect(ctx, drawX, drawY, tw, th, radius);
      ctx.clip();
      ctx.drawImage(rawTableCanvas, drawX, drawY);
      ctx.restore();

      // 5. Draw Subtle Border around the table card
      ctx.save();
      ctx.lineWidth = Math.max(2, Math.round(sqSize * 0.0015));
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      drawRoundedRect(ctx, drawX, drawY, tw, th, radius);
      ctx.stroke();
      ctx.restore();

      // ── BOTTOM FOOTER BANNER ──
      const bottomSpace = sqSize - (drawY + th);
      const footerCenterY = drawY + th + Math.round(bottomSpace * 0.48);

      ctx.save();
      // Left: University Name
      ctx.font = `700 ${Math.round(sqSize * 0.013)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      ctx.fillStyle = textSubColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "SRM Institute of Science and Technology",
        drawX,
        footerCenterY,
      );

      // Right: Minimal Branding & HD Indicator
      ctx.font = `600 ${Math.round(sqSize * 0.012)}px 'Plus Jakarta Sans', -apple-system, sans-serif`;
      ctx.fillStyle = textSubColor;
      ctx.textAlign = "right";
      ctx.fillText("Academia Prime", drawX + tw, footerCenterY);
      ctx.restore();

      const isJpeg = imgFormat === "jpeg";
      const ext = isJpeg ? "jpg" : "png";
      const mimeType = isJpeg ? "image/jpeg" : "image/png";

      const fileName =
        `Prime_Timetable_${prof.section || netId}_${fileSuffix}.${ext}`.replace(
          /\s+/g,
          "_",
        );

      triggerDownloadFromCanvas(sqCanvas, fileName, mimeType);
      stopProgress();
      showToast(
        `${quality} ${ext.toUpperCase()} WhatsApp DP Timetable downloaded!`,
        3000,
        "success",
      );
      return true;
    } catch (err) {
      if (wasInEditMode && panel) panel.classList.add("tt-edit-active");
      stopProgress();
      console.error("[TT] Export error:", err);
      showToast("Export failed: " + (err.message || err), 4000, "error");
      return false;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ABOUT PRIME SECTION (Collapsible footer with Changelog, FAQ, Bug Report)
  // ────────────────────────────────────────────────────────────────────────────
  
  // ────────────────────────────────────────────────────────────────────────────
  // STUDENT PORTAL STORAGE & MOUNTING LAYER
  // ────────────────────────────────────────────────────────────────────────────
  async function getStoredTimetableData() {
    try {
      const all = await chrome.storage.local.get(null);
      let candidate = null;

      // 1. Direct latest payload
      if (all.ar_latest_timetable_payload) {
        let p = all.ar_latest_timetable_payload;
        if (typeof p === "string") {
          try { p = JSON.parse(p); } catch (_) {}
        }
        if (p && typeof p === "object") {
          candidate = p;
        }
      }

      // 2. Check all ttPayload_* keys if they are newer or if candidate is missing
      let bestKeyPayload = null;
      let bestTime = candidate?.timestamp || 0;

      for (const k of Object.keys(all)) {
        if (k.startsWith("ttPayload_") && all[k]) {
          let p = all[k];
          if (typeof p === "string") {
            try { p = JSON.parse(p); } catch (_) {}
          }
          if (p && typeof p === "object") {
            const t = p.timestamp || 0;
            if (!candidate || t > bestTime || !bestKeyPayload) {
              bestKeyPayload = p;
              bestTime = t;
            }
          }
        }
      }

      const payload = bestKeyPayload || candidate;
      if (!payload) return null;

      // Ensure courses mapping is available
      if (!payload.courses || Object.keys(payload.courses).length === 0) {
        if (all.ar_timetable_courses_v31 && typeof all.ar_timetable_courses_v31 === "object") {
          payload.courses = all.ar_timetable_courses_v31;
        }
      }

      // Ensure profile data is available
      if (!payload.profileData) {
        if (payload.netId && all["ttProfile_" + payload.netId]) {
          payload.profileData = all["ttProfile_" + payload.netId];
        } else {
          for (const k of Object.keys(all)) {
            if (k.startsWith("ttProfile_") && all[k]) {
              payload.profileData = all[k];
              break;
            }
          }
        }
      }

      // If ttJSON is a string, parse it
      if (typeof payload.ttJSON === "string") {
        try {
          payload.ttJSON = JSON.parse(payload.ttJSON);
        } catch (_) {}
      }

      // If ttJSON is missing or incomplete, parse from timetableHTML
      if ((!payload.ttJSON || !payload.ttJSON.headers || !payload.ttJSON.headers.length) && payload.timetableHTML) {
        const div = document.createElement("div");
        div.innerHTML = payload.timetableHTML;
        const tbl = div.querySelector("table");
        if (tbl) {
          payload.ttJSON = parseTTToJSON(tbl, payload.courses || {});
        }
      }

      if (payload.ttJSON && payload.ttJSON.headers && (payload.ttJSON.days || payload.ttJSON.rows)) {
        return payload;
      }
    } catch (e) {
      console.warn("[SP TT] Storage lookup error:", e);
    }
    return null;
  }

  async function syncFromStorage(showToastMsg = true) {
    if (showToastMsg) {
      showToast("⏳ Syncing Timetable with Academia…", 2000, "info");
    }

    const payload = await getStoredTimetableData();
    if (!payload || !payload.ttJSON) {
      renderEmptyState();
      if (showToastMsg) {
        showToast("No synced timetable found. Please open Academia Time Table once!", 4000, "warn");
      }
      return;
    }

    if (payload.netId) {
      window._spCachedNetId = payload.netId;
    }
    if (payload.profileData) {
      window._spCachedProfile = payload.profileData;
    }

    _cachedCourseData = payload.courses || {};
    const filteredTTJSON = filterTill450(payload.ttJSON, payload.courses || {});
    renderTimetableUI(filteredTTJSON, payload.courses || {}, payload.profileData || {});

    if (showToastMsg) {
      showToast("Timetable synced successfully!", 2500, "success");
    }
  }

  async function resetSyncStorage() {
    if (!confirm("Are you sure you want to reset the synced timetable cache?")) {
      return;
    }
    try {
      const all = await chrome.storage.local.get(null);
      const keysToRemove = ["ar_latest_timetable_payload"];
      for (const k of Object.keys(all)) {
        if (k.startsWith("ttPayload_") || k.startsWith("ttProfile_")) {
          keysToRemove.push(k);
        }
      }
      await chrome.storage.local.remove(keysToRemove);
      showToast("Timetable sync cache cleared.", 2500, "info");
      renderEmptyState();
    } catch (e) {
      console.error("[SP TT] Reset sync error:", e);
    }
  }

  function getMountTarget() {
    const mainDetails =
      document.getElementById("divMainDetails") ||
      document.querySelector(".main-content, #page-wrapper, .content-wrapper, #content, .container-fluid, body");
    if (!mainDetails) return null;

    let wrapper = document.getElementById("sp-timetable-portal-wrapper");
    if (wrapper) return wrapper;

    wrapper = document.createElement("div");
    wrapper.id = "sp-timetable-portal-wrapper";

    const nativeCard =
      mainDetails.querySelector(".card, .panel, .box, .container > .card") ||
      mainDetails.querySelector("table")?.closest(".card, .panel, .table-responsive") ||
      null;

    if (nativeCard && nativeCard.parentElement) {
      nativeCard.insertAdjacentElement("afterend", wrapper);
    } else {
      mainDetails.appendChild(wrapper);
    }
    return wrapper;
  }

  function renderEmptyState() {
    const wrapper = getMountTarget();
    if (!wrapper) return;
    injectTTStyles();

    wrapper.innerHTML = `
      <div id="tt-panel" style="padding: 32px 24px !important; text-align: center;">
        <div style="max-width: 540px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 14px;">
          <div style="width: 52px; height: 52px; border-radius: 14px; background: #e8ecf5; color: #0d1938; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(19, 36, 80, 0.15);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #1e1b4b; letter-spacing: -0.01em;">Sync Timetable with Academia</h3>
          <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
            To view your complete interactive timetable on Student Portal, click <span style="color:#15803d; font-weight:800; background:#dcfce7; padding:2px 7px; border-radius:5px; border:1px solid #bbf7d0;">Open Academia</span> and wait <span style="color:#9a7200; font-weight:800; background:#fff4c2; padding:2px 7px; border-radius:5px; border:1px solid #f4d875;">2 seconds or refresh</span> the page, then click <span style="color:#0d1938; font-weight:800; background:#e8ecf5; padding:2px 7px; border-radius:5px; border:1px solid #b8c2d9;">Sync Timetable</span>.
          </p>
          <div style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap; justify-content: center;">
            <button type="button" id="sp-tt-empty-open-acad-btn" class="sp-tt-flow-btn sp-tt-flow-acad" style="padding: 9px 20px; font-size: 12.5px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              <span>Open Academia</span>
            </button>
            <button type="button" id="sp-tt-empty-sync-btn" class="sp-tt-flow-btn sp-tt-flow-sync" style="padding: 9px 22px; font-size: 12.5px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              <span>Sync Timetable</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const openAcadBtn = wrapper.querySelector("#sp-tt-empty-open-acad-btn");
    if (openAcadBtn) {
      openAcadBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open("https://academia.srmist.edu.in/#My_Time_Table_Attendance", "_blank");
      };
    }

    const emptySyncBtn = wrapper.querySelector("#sp-tt-empty-sync-btn");
    if (emptySyncBtn) {
      emptySyncBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        syncFromStorage(true);
      };
    }
  }

  function renderTimetableUI(ttJSON, courses, profileData) {
    const wrapper = getMountTarget();
    if (!wrapper) return;
    injectTTStyles();

    wrapper.innerHTML = "";

    const renderedHTML = renderTTFromJSON(ttJSON, courses);

    // Construct Root Panel
    const panel = document.createElement("div");
    panel.id = "tt-panel";

    const exportArea = document.createElement("div");
    exportArea.id = "tt-export-area";

    // Header Bar
    const head = document.createElement("div");
    head.id = "tt-panel-head";

    let sectionInfo = "B.Tech";
    if (profileData?.course && profileData?.section) {
      sectionInfo = `${profileData.course} (${profileData.section})`;
    } else if (profileData?.programmeBranch && profileData?.section) {
      sectionInfo = `${profileData.programmeBranch} (${profileData.section})`;
    } else if (profileData?.section) {
      sectionInfo = `B.Tech (${profileData.section})`;
    } else if (profileData?.programmeBranch) {
      sectionInfo = profileData.programmeBranch;
    } else if (profileData?.course) {
      sectionInfo = profileData.course;
    }

    const brandGroup = document.createElement("div");
    brandGroup.className = "tt-brand-group";
    brandGroup.innerHTML = `
      <div class="tt-brand-title-row">
        <div class="tt-brand-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Time Table
        </div>
        <span class="tt-revanced-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          PRIME
        </span>
      </div>
      <p class="tt-sub-text">Weekly Schedule &bull; ${sectionInfo}</p>
    `;
    head.appendChild(brandGroup);

    // Toolbar Controls
    const toolbar = document.createElement("div");
    toolbar.className = "tt-toolbar";

    // 1. Edit Slots Button
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.id = "tt-edit-btn";
    editBtn.className = "tt-btn";
    editBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      <span>Edit Slots</span>
    `;
    editBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleEditMode();
    };

    // 4. Toggle Custom View Button (Dynamic: revealed when edits exist)
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.id = "tt-toggle-btn";
    toggleBtn.className = "tt-btn";
    toggleBtn.style.display = "none";
    toggleBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
      <span>Hide Custom</span>
    `;
    toggleBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCustomView();
    };

    // 5. Reset All Button (Dynamic: revealed when edits exist)
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.id = "tt-reset-btn";
    resetBtn.className = "tt-btn tt-btn-danger";
    resetBtn.style.display = "none";
    resetBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M8 16H3v5"/>
      </svg>
      <span>Reset All</span>
    `;
    resetBtn.title = "Reset customized slots back to original";
    resetBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      resetAllModifications();
    };

    // 6. Download Dropdown Button & Menu
    const downloadWrap = document.createElement("div");
    downloadWrap.className = "tt-download-dropdown-wrap";
    downloadWrap.id = "ttDownloadDropdownWrap";

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "tt-btn tt-btn-download";
    downloadBtn.id = "ttDownloadMainBtn";
    downloadBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>Download Image</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left: 2px;"><polyline points="6 9 12 15 18 9"/></svg>
    `;

    const downloadMenu = document.createElement("div");
    downloadMenu.className = "tt-download-menu";
    downloadMenu.id = "ttDownloadMenu";

    downloadMenu.innerHTML = `
      <button type="button" class="tt-download-menu-item" id="ttDownloadOptOriginal">
        <div class="tt-menu-icon" style="background:#e8ecf5; color:#0d1938;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
        </div>
        <div class="tt-menu-text">
          <span class="tt-menu-title">1. Original Size (Landscape)</span>
          <span class="tt-menu-sub">Direct clean table • 10x resolution</span>
        </div>
      </button>

      <button type="button" class="tt-download-menu-item" id="ttDownloadOptWhatsApp">
        <div class="tt-menu-icon" style="background:#dcfce7; color:#15803d;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </div>
        <div class="tt-menu-text">
          <span class="tt-menu-title">2. WhatsApp DP (1:1 Square)</span>
          <span class="tt-menu-sub">For Classroom Whatsapp Group</span>
        </div>
      </button>
    `;

    downloadBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      downloadMenu.classList.toggle("show");
    };

    document.addEventListener("click", () => {
      downloadMenu.classList.remove("show");
    });

    downloadMenu.querySelector("#ttDownloadOptOriginal").onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      downloadMenu.classList.remove("show");
      downloadOriginal10x();
    };

    downloadMenu.querySelector("#ttDownloadOptWhatsApp").onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      downloadMenu.classList.remove("show");
      openExportModal("whatsapp");
    };

    downloadWrap.appendChild(downloadBtn);
    downloadWrap.appendChild(downloadMenu);

    toolbar.appendChild(editBtn);
    toolbar.appendChild(toggleBtn);
    toolbar.appendChild(resetBtn);
    toolbar.appendChild(downloadWrap);
    head.appendChild(toolbar);

    exportArea.appendChild(head);

    // Table Container
    const tableWrap = document.createElement("div");
    tableWrap.className = "tt-table-container";
    tableWrap.innerHTML = renderedHTML;
    exportArea.appendChild(tableWrap);

    panel.appendChild(exportArea);
    wrapper.appendChild(panel);

    // Today Highlight — fetch day order from Academic Calendar/Planner on SP
    fetchTodayDayOrder().then((info) => {
      if (!info) return;
      const todayChip = wrapper.querySelector && wrapper.querySelector("#sp-tt-today-chip");
      const brandGrp = panel.querySelector(".tt-brand-group");
      if (!brandGrp) return;
      const chip = document.createElement("div");
      chip.id = "sp-tt-today-chip";
      chip.className = "sp-tt-today-chip";
      chip.innerHTML = `<span class="sp-today-dot"></span><span>Today &bull; ${info.date} &bull; Day Order ${info.dayOrder}</span>`;
      brandGrp.appendChild(chip);
    });

    // Highlight today & load edits & dynamic button states
    highlightTodayRow(panel);
    loadCustomEdits();
    updateResetAllButtonDynamic();

    // Single-line footer note with Open Academia button, Sync Timetable button & Reset Sync button
    const footerNote = document.createElement("div");
    footerNote.id = "sp-tt-footer-note";
    footerNote.innerHTML = `
      <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
        <span style="font-weight: 800; color: #0d1938; display: inline-flex; align-items: center; gap: 5px; font-size: 12px; letter-spacing: 0.01em;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Sync Timetable:
        </span>
        <span style="color: #475569; font-weight: 600; font-size: 11.5px;">Click</span>
        <button type="button" id="sp-tt-footer-open-acad-btn" class="sp-tt-flow-btn sp-tt-flow-acad" title="Open Academia Timetable page in a new tab">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          <span>Open Academia</span>
        </button>
        <span style="color: #475569; font-weight: 600; font-size: 11.5px;">and wait <strong style="color: #9a7200; font-weight: 800;">2 seconds or refresh</strong> the page, then click</span>
        <button type="button" id="sp-tt-footer-sync-btn" class="sp-tt-flow-btn sp-tt-flow-sync" title="Click to sync timetable with Academia now">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          <span>Sync Timetable</span>
        </button>
      </div>
      <div style="display: flex; align-items: center; gap: 7px; flex-shrink: 0;">
        <span style="font-size: 11px; font-weight: 700; color: #e11d48;">Wrong schedule?</span>
        <button type="button" id="sp-tt-reset-sync-btn" class="sp-tt-flow-btn sp-tt-flow-reset" title="Clear timetable cache and re-sync">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
          <span>Reset Sync</span>
        </button>
      </div>
    `;

    const footerOpenAcadBtn = footerNote.querySelector("#sp-tt-footer-open-acad-btn");
    if (footerOpenAcadBtn) {
      footerOpenAcadBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.open("https://academia.srmist.edu.in/#My_Time_Table_Attendance", "_blank");
      };
    }

    const footerSyncBtn = footerNote.querySelector("#sp-tt-footer-sync-btn");
    if (footerSyncBtn) {
      footerSyncBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        syncFromStorage(true);
      };
    }

    const resetSyncBtn = footerNote.querySelector("#sp-tt-reset-sync-btn");
    if (resetSyncBtn) {
      resetSyncBtn.addEventListener("mouseenter", () => {
        resetSyncBtn.style.background = "#ffe4e6";
        resetSyncBtn.style.borderColor = "#fda4af";
      });
      resetSyncBtn.addEventListener("mouseleave", () => {
        resetSyncBtn.style.background = "#fff1f2";
        resetSyncBtn.style.borderColor = "#fecdd3";
      });
      resetSyncBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetSyncStorage();
      };
    }

    wrapper.appendChild(footerNote);
  }

  // ─── Today Highlight — fetch Day Order from SP Academic Calendar/Planner ────
  async function fetchTodayDayOrder() {
    try {
      // Format today's date as "28 September"
      const now = new Date();
      const months = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];
      const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;

      // 1. Try scanning the currently visible page DOM for Day Order info
      //    SP Academic Calendar / Planner usually shows "Day Order : X" or "Day Order X"
      const fullPageText = document.body ? (document.body.innerText || document.body.textContent || "") : "";
      const doMatch = fullPageText.match(/[Dd]ay\s*[Oo]rder\s*[:\-]?\s*(\d)/);
      if (doMatch && doMatch[1]) {
        return { dayOrder: doMatch[1], date: dateStr };
      }

      // 2. Try fetching the Academic Calendar/Planner page on Student Portal
      //    Common SP paths that contain day order info
      const spPaths = [
        "/srmiststudentportal/students/calendar/AcademicCalender.jsp",
        "/srmiststudentportal/students/calendar/academiccalender.jsp",
        "/srmiststudentportal/students/Timetable/AcademicCalendar.jsp",
        "/srmiststudentportal/students/timetable/academiccalendar.jsp",
      ];

      for (const path of spPaths) {
        try {
          const res = await fetch("https://sp.srmist.edu.in" + path, {
            credentials: "include",
            cache: "no-cache",
          });
          if (!res.ok) continue;
          const html = await res.text();
          const m = html.match(/[Dd]ay\s*[Oo]rder\s*[:\-]?\s*(\d)/);
          if (m && m[1]) {
            return { dayOrder: m[1], date: dateStr };
          }
        } catch (_) {
          // continue to next path
        }
      }

      // 3. Nothing found — return null (chip will not be shown)
      return null;
    } catch (e) {
      return null;
    }
  }

  // ─── Route & Lifecycle Monitoring ──────────────────────────────────────────
  function isTimetableActive() {
    const url = (window.location.href || "").toLowerCase();
    const hash = (window.location.hash || "").toLowerCase();

    // 1. Strict negative check: If URL or hash contains "exam", reject immediately
    if (url.includes("exam") || hash.includes("exam")) {
      return false;
    }

    // 2. Strict negative check: If any exam control / selector exists on the page
    if (
      document.getElementById("txtExamMonthYear") ||
      document.querySelector("select[name='txtExamMonthYear']") ||
      document.querySelector("select[onchange*='funLoadSubject']") ||
      document.getElementById("divExamTimetable") ||
      document.getElementById("divExamSchedule") ||
      document.querySelector("[id*='ExamTimeTable' i]") ||
      document.querySelector("[id*='ExamSchedule' i]")
    ) {
      return false;
    }

    // 3. Strict negative check: Check divMainDetails content & headings
    const mainDetails = document.getElementById("divMainDetails");
    if (mainDetails) {
      const mainText = (mainDetails.innerText || "").toLowerCase();
      if (
        mainText.includes("exam time table") ||
        mainText.includes("exam timetable") ||
        mainText.includes("examination time table") ||
        mainText.includes("examination timetable") ||
        mainText.includes("exam schedule")
      ) {
        return false;
      }
    }

    // 4. Strict negative check: Active sidebar menu or navigation item
    const activeMenus = document.querySelectorAll(
      ".sidebar-menu .active, .nav-item.active, a.active, li.active, .sp-menu-item.active, [class*='timetable' i].active"
    );
    for (const m of activeMenus) {
      const text = (m.innerText || m.textContent || "").toLowerCase();
      if (text.includes("exam")) {
        return false;
      }
    }

    const headings = document.querySelectorAll(
      "#divMainDetails h1, #divMainDetails h2, #divMainDetails h3, #divMainDetails h4, #divMainDetails h5, #divMainDetails .page-header, #divMainDetails .page-title, #divMainDetails .card-title, #divMainDetails .card-header, #divMainDetails .panel-title, #divMainDetails .panel-heading, .breadcrumb, h1, h2, h3, h4, h5, .page-header, .page-title"
    );
    for (const h of headings) {
      const text = (h.innerText || h.textContent || "").toLowerCase();
      if (text.includes("exam")) {
        return false;
      }
    }

    // 5. Positive check: URL or hash explicitly indicates regular class timetable (without exam)
    if (
      url.includes("timetable") ||
      url.includes("time_table") ||
      hash.includes("timetable") ||
      hash.includes("time_table")
    ) {
      return true;
    }

    // 6. Positive check: Active menus strictly for regular timetable
    for (const m of activeMenus) {
      const text = (m.innerText || m.textContent || "").toLowerCase();
      const href = (m.getAttribute("href") || "").toLowerCase();
      const onclick = (m.getAttribute("onclick") || "").toLowerCase();
      if (text.includes("exam") || href.includes("exam") || onclick.includes("exam")) continue;
      if (
        (text.includes("time") && text.includes("table")) ||
        text.includes("timetable") ||
        text.includes("class schedule") ||
        text.includes("course schedule") ||
        href.includes("timetable") ||
        onclick.includes("timetable")
      ) {
        return true;
      }
    }

    // 7. Positive check: Headings in divMainDetails strictly for regular timetable
    for (const h of headings) {
      const text = (h.innerText || h.textContent || "").toLowerCase();
      if (text.includes("exam")) continue;
      if (
        (text.includes("time") && text.includes("table")) ||
        text.includes("timetable") ||
        text.includes("class schedule") ||
        text.includes("course schedule")
      ) {
        return true;
      }
    }

    // 8. Positive check: Native regular class timetable table
    const tables = document.querySelectorAll("#divMainDetails table, table");
    for (const tbl of tables) {
      if (tbl.closest("#tt-panel, #sp-timetable-portal-wrapper")) continue;
      const fullText = (tbl.innerText || tbl.textContent || "").toLowerCase();
      if (fullText.includes("exam")) continue;
      if (
        (fullText.includes("day") || fullText.includes("order")) &&
        (fullText.includes("08:") || fullText.includes("09:") || fullText.includes("10:") || fullText.includes("slot") || fullText.includes("hour"))
      ) {
        return true;
      }
    }

    return false;
  }

  function handleCheckAndMount() {
    if (!isTimetableActive()) {
      const existing = document.getElementById("sp-timetable-portal-wrapper");
      if (existing) existing.remove();
      return;
    }

    if (document.getElementById("sp-timetable-portal-wrapper")) return;

    syncFromStorage(false);
  }

  // 1. Initial poll sequence immediately after load
  [50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000].forEach((delay) => {
    setTimeout(handleCheckAndMount, delay);
  });

  // 2. Hash & History changes
  window.addEventListener("hashchange", () => setTimeout(handleCheckAndMount, 150));
  window.addEventListener("popstate", () => setTimeout(handleCheckAndMount, 150));

  // 3. User interaction listener (menu / button clicks)
  document.addEventListener("click", () => {
    setTimeout(handleCheckAndMount, 100);
    setTimeout(handleCheckAndMount, 400);
    setTimeout(handleCheckAndMount, 800);
  });

  // 4. ASP.NET PageRequestManager AJAX lifecycle
  try {
    if (
      window.Sys &&
      window.Sys.WebForms &&
      window.Sys.WebForms.PageRequestManager
    ) {
      window.Sys.WebForms.PageRequestManager.getInstance().add_endRequest(() => {
        setTimeout(handleCheckAndMount, 100);
        setTimeout(handleCheckAndMount, 400);
      });
    }
  } catch (e) {}

  // 5. DOM MutationObserver
  const observer = new MutationObserver(() => {
    handleCheckAndMount();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 6. Real-time storage listener for cross-tab sync from Academia
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (
        area === "local" &&
        (changes.ar_latest_timetable_payload ||
          Object.keys(changes).some((k) => k.startsWith("ttPayload_")))
      ) {
        if (isTimetableActive()) {
          syncFromStorage(false);
        }
      }
    });
  }
})();
