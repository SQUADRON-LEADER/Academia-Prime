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
  let _extraSlot = false;
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
        overflow: visible !important;
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
        overflow: visible !important;
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
        position: relative !important;
        z-index: 99999 !important;
        overflow: visible !important;
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

      /* 5. Notice (Amber) - Hidden per request */
      .tt-about-tab-btn.tt-btn-notice {
        display: none !important;
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

      /* 6.5 BIG GLOWING DOTTED BUTTON CONTAINER HOUSING THE HELPER & CGPA CALCULATOR */
      @keyframes toolsGlowPulse {
        0%, 100% {
          box-shadow: 0 0 6px rgba(139, 92, 246, 0.4), 0 0 1px rgba(139, 92, 246, 0.6) !important;
          border-color: #8b5cf6 !important;
        }
        50% {
          box-shadow: 0 0 14px rgba(139, 92, 246, 0.7), 0 0 4px rgba(139, 92, 246, 0.85) !important;
          border-color: #a855f7 !important;
        }
      }

      .tt-tools-grouped-wrap {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 3px 4px !important;
        border-radius: 9px !important;
        background: linear-gradient(135deg, #e8ecf5 0%, #fdf6ed 100%) !important;
        border: 1.5px dotted #8b5cf6 !important;
        box-shadow: 0 0 8px rgba(139, 92, 246, 0.45), 0 0 2px rgba(139, 92, 246, 0.65) !important;
        animation: toolsGlowPulse 2.4s infinite ease-in-out !important;
        margin-left: auto !important;
        flex: 0 0 auto !important;
        box-sizing: border-box !important;
        transition: all 0.2s ease !important;
        position: relative !important;
        z-index: 99999 !important;
        overflow: visible !important;
      }
      .tt-tools-grouped-wrap:hover {
        box-shadow: 0 0 16px rgba(139, 92, 246, 0.75), 0 0 4px rgba(139, 92, 246, 0.9) !important;
        z-index: 999999 !important;
      }

      /* Individual buttons inside the big glowing container */
      .tt-tools-grouped-wrap .tt-about-tab-btn {
        margin: 0 !important;
        border-radius: 6px !important;
        padding: 5px 9px !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        box-shadow: none !important;
        animation: none !important;
        position: relative !important;
        z-index: 1 !important;
      }

      /* THE HELPER button (lightest #7b46da purple) */
      .tt-about-tab-btn.tt-btn-thehelper {
        color: #7b46da !important;
        background: #f7f4fd !important;
        border: 1px solid #ddd0f8 !important;
        text-decoration: none !important;
        position: relative !important;
        z-index: 1 !important;
      }
      .tt-about-tab-btn.tt-btn-thehelper:hover {
        background: #eee5fa !important;
        border-color: #b691ee !important;
        color: #672fcc !important;
        box-shadow: 0 2px 6px rgba(123, 70, 218, 0.25) !important;
        transform: translateY(-1px) !important;
        z-index: 1000000 !important;
      }
      .tt-about-tab-btn.tt-btn-thehelper:active {
        transform: translateY(0) !important;
        box-shadow: none !important;
      }
      .tt-thehelper-logo-img {
        width: 14px !important;
        height: 14px !important;
        border-radius: 3px !important;
        object-fit: contain !important;
        vertical-align: middle !important;
        display: inline-block !important;
      }

      /* CGPA Calculator button (lightest brown) */
      .tt-about-tab-btn.tt-btn-exclusive {
        color: #5c4500 !important;
        background: #fdf6ed !important;
        border: 1px solid #e8d8c8 !important;
        position: relative !important;
        z-index: 1 !important;
      }
      .tt-about-tab-btn.tt-btn-exclusive:hover {
        background: #fae8d4 !important;
        border-color: #9a7200 !important;
        color: #451a03 !important;
        box-shadow: 0 2px 6px rgba(244, 197, 66, 0.2) !important;
        transform: translateY(-1px) !important;
        z-index: 1000000 !important;
      }
      .tt-about-tab-btn.tt-btn-exclusive:active {
        transform: translateY(0) !important;
        box-shadow: none !important;
      }

      /* Themed Tooltips for Tool Buttons */
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

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function getNetId() {
    const el = document.querySelector(
      "#zc-account-settings > a > span.navbar_user_name",
    );
    return el ? el.textContent.trim() : null;
  }

  function getStorageKey() {
    return "ttData_" + (getNetId() || "anon");
  }

  // ─── Zoho HTML decoder ──────────────────────────────────────────────────────
  function decodeZohoHtml(raw) {
    return raw
      .replace(/\\x22/g, '"')
      .replace(/\\x27/g, "'")
      .replace(/\\\//g, "/")
      .replace(/\\n/g, "")
      .replace(/\\r/g, "")
      .replace(/\\t/g, "")
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\-/g, "-")
      .replace(/\\\\/g, "");
  }

  function parseZohoPayload(rawText, tableSignature) {
    const matches = [
      ...rawText.matchAll(/pageSanitizer\.sanitize\(['"](.+?)['"]\);/gs),
    ];
    let best = null;
    for (const m of matches) {
      if (m[1] && tableSignature && m[1].includes(tableSignature)) {
        best = m[1];
        break;
      }
    }
    if (!best && matches.length > 0) best = matches[0][1];
    if (!best) return null;
    return new DOMParser().parseFromString(decodeZohoHtml(best), "text/html");
  }

  // ────────────────────────────────────────────────────────────────────────────
  // COURSE REGISTRATION — fetches slot→course mapping
  // ────────────────────────────────────────────────────────────────────────────
  async function fetchCourseRaw() {
    const res = await fetch(
      "https://academia.srmist.edu.in/srm_university/academia-academic-services/page/My_Time_Table_2023_24",
      { headers: { "X-Requested-With": "XMLHttpRequest" } },
    );
    if (!res.ok)
      throw new Error("Course registration fetch failed: " + res.status);
    return res.text();
  }

  function extractProfileData(doc) {
    const p = {};
    if (!doc) return p;
    const q = (sel) => doc.querySelector(sel);
    const t = (sel) => q(sel)?.textContent.trim() || "";

    p.name =
      t(
        "div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(4) > strong",
      ) ||
      t(
        "table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(4) > strong",
      );
    p.registrationNo =
      t(
        "div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(2)",
      ) || t("table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(2)");
    p.programmeBranch =
      t(
        "div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2) > strong",
      ) ||
      t(
        "table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(2) > strong",
      );
    p.semester =
      t(
        "div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(4) > td:nth-child(2) > strong",
      ) ||
      t(
        "table:nth-child(1) > tbody > tr:nth-child(4) > td:nth-child(2) > strong",
      );

    const deptSel =
      "div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(4) > strong";
    const str =
      t(deptSel) ||
      t(
        "table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(4) > strong",
      );
    if (str) {
      const idx = str.lastIndexOf("(");
      if (idx === -1) {
        p.schoolDepartment = str;
      } else {
        p.schoolDepartment = str.substring(0, idx).replace(/-$/, "").trim();
        p.section = str
          .substring(idx)
          .replace(/[()]/g, "")
          .replace(/section$/i, "")
          .trim();
      }
    }
    return p;
  }

  function extractCourseData(doc) {
    const courses = {};
    if (!doc) return { courses, batch: null };

    let batch = null;
    const batchEl =
      doc.querySelector(
        "div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(2) > strong > font",
      ) ||
      doc.querySelector(
        "table:nth-child(1) > tbody > tr:nth-child(2) td:nth-child(2) strong font",
      );
    if (batchEl) batch = batchEl.textContent.trim() || null;

    const tbl = doc.querySelector("table.course_tbl");
    if (!tbl) return { courses, batch };

    const rows = tbl.querySelectorAll("tbody tr");
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll("td");
      if (cells.length <= 8) continue;
      const slot = cells[8].textContent.trim();
      if (!slot) continue;
      if (slot.includes("L")) _extraSlot = true;

      const rawTitle = cells[2].textContent.trim();
      const courseTitle =
        rawTitle.length > 40 ? rawTitle.slice(0, 40) + "..." : rawTitle;

      const slotKeys = slot
        .split(/[-+,/]/)
        .map((s) =>
          s
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ""),
        )
        .filter(Boolean);
      slotKeys.forEach((key) => {
        courses[key] = {
          "Course Code": cells[1]?.textContent.trim() || "",
          "Course Title": courseTitle,
          Credit: cells[3]?.textContent.trim() || "",
          "Faculty Name": cells[7]?.textContent.trim() || "",
          "Room No.": cells[9]?.textContent.trim() || "",
        };
        initCourseColor(courseTitle || key);
      });
    }
    return { courses, batch };
  }

  async function fetchCourseData() {
    const raw = await fetchCourseRaw();
    const doc = parseZohoPayload(raw, "course_tbl");
    if (!doc) throw new Error("Could not parse course registration page.");
    return {
      doc,
      profileData: extractProfileData(doc),
      ...extractCourseData(doc),
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // UNIFIED TIMETABLE — fetches the shared timetable grid by batch
  // ────────────────────────────────────────────────────────────────────────────
  const TT_URLS = {
    1: "https://academia.srmist.edu.in/srm_university/academia-academic-services/page/Unified_Time_Table_2025_Batch_1",
    2: "https://academia.srmist.edu.in/srm_university/academia-academic-services/page/Unified_Time_Table_2025_batch_2",
  };

  async function fetchUnifiedTimetable(batch) {
    const url = TT_URLS[batch];
    if (!url) throw new Error("Unsupported batch: " + batch);
    const res = await fetch(url, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    if (!res.ok)
      throw new Error("Unified timetable fetch failed: " + res.status);
    const rawText = await res.text();
    const doc = parseZohoPayload(rawText, "width=\\x22400\\x22");
    if (!doc) throw new Error("Could not parse unified timetable payload.");

    let tbl =
      doc.querySelector(
        'table[align="center"][border="5"][cellpadding="18"][cellspacing="2"][width="400"]',
      ) || doc.querySelector("div > table:nth-child(5)");
    if (!tbl) return null;
    return tbl.outerHTML;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TABLE PARSER & RENDERER
  // ────────────────────────────────────────────────────────────────────────────
  function parseTTToJSON(table) {
    const data = { headers: [], days: [], extraSlotFlag: _extraSlot };
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
    return data;
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

    if (!jsonData.extraSlotFlag) {
      const ths = hRow.querySelectorAll("th");
      if (ths.length >= 2) {
        ths[ths.length - 2].style.display = "none";
        ths[ths.length - 1].style.display = "none";
      }
    }
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
        const key = rawText
          .split("/")[0]
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");

        if (key && courseData[key]) {
          const info = courseData[key];
          const courseTitle = info["Course Title"] || key;
          const roomNo = info["Room No."] || "";
          const theme = getCourseTheme(courseTitle || key);

          td.dataset.isCourse = "true";
          td.dataset.origTitle = courseTitle;
          td.dataset.origRoom = roomNo;
          td.dataset.slotKey = key;
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
          td.dataset.slotKey = rawText;
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

      if (!jsonData.extraSlotFlag) {
        const cells = tr.querySelectorAll("td");
        if (cells.length >= 2) {
          cells[cells.length - 2].style.display = "none";
          cells[cells.length - 1].style.display = "none";
        }
      }

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
  function injectAboutSection(container) {
    if (document.getElementById("tt-about-card")) return;

    const aboutCard = document.createElement("div");
    aboutCard.id = "tt-about-card";
    aboutCard.className = "tt-about-card";

    const theHelperLogoUrl = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL("icons/academia-prime-logo.png")
      : "";

    aboutCard.innerHTML = `
      <div class="tt-about-header" id="ttAboutHeader">
        <div class="tt-about-title-group">
          <div class="tt-about-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            About Prime
          </div>
          <span class="tt-free-forever-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            FREE FOREVER
          </span>
        </div>
        <div class="tt-about-toggle-btn">
          <span id="ttAboutStatusLbl">Expand Details</span>
          <svg class="tt-about-chevron" id="ttAboutChevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div class="tt-about-body" id="ttAboutBody">
        <div class="tt-about-nav-tabs">
          <button type="button" class="tt-about-tab-btn tt-btn-guide active" data-target="tt-tab-guide">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
            Guide
          </button>
          <button type="button" class="tt-about-tab-btn tt-btn-changelog" data-target="tt-tab-changelog">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Changelog
          </button>
          <button type="button" class="tt-about-tab-btn tt-btn-android" data-target="tt-tab-android">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            Phone/Tablet Guide
          </button>
          <button type="button" class="tt-about-tab-btn tt-btn-faq" data-target="tt-tab-faq">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            FAQ
          </button>
          <button type="button" class="tt-about-tab-btn tt-btn-notice" data-target="tt-tab-notice" style="display: none !important;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c69a22" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
            Portal Notice
          </button>
          <button type="button" class="tt-about-tab-btn tt-btn-links" data-target="tt-tab-links">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Important Links
          </button>
          <button type="button" class="tt-about-tab-btn tt-btn-bug" data-target="tt-tab-bug">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 0 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v2"/><path d="M6 13H2"/><path d="M22 13h-4"/><path d="M20 7.13l-3.38 1.35"/><path d="m4 7.13 3.38 1.35"/><path d="m20 18.87-3.38-1.35"/><path d="m4 18.87 3.38-1.35"/></svg>
            Report Bug
          </button>
          <button type="button" class="tt-about-tab-btn tt-btn-review" data-target="tt-tab-review">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#c69a22" stroke="#c69a22" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Review
          </button>
          <button type="button" class="tt-about-tab-btn tt-btn-contacts" data-target="tt-tab-contacts">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Contact Information
          </button>
          <!-- BIG GLOWING DOTTED BUTTON CONTAINER HOUSING THE HELPER & CGPA CALCULATOR -->
          <div class="tt-tools-grouped-wrap" id="tt-tools-grouped-wrap" style="display: inline-flex !important; align-items: center !important; gap: 4px !important; padding: 3px 4px !important; border-radius: 9px !important; background: linear-gradient(135deg, #e8ecf5 0%, #fdf6ed 100%) !important; border: 1.5px dotted #8b5cf6 !important; box-shadow: 0 0 8px rgba(139, 92, 246, 0.45), 0 0 2px rgba(139, 92, 246, 0.65) !important; margin-left: auto !important; flex: 0 0 auto !important;">
            <button type="button" class="tt-about-tab-btn tt-btn-thehelper" id="tt-tab-thehelper-btn" style="margin: 0 !important; border-radius: 6px !important; padding: 5px 9px !important; font-size: 11px !important; font-weight: 700 !important; background: #f7f4fd !important; color: #7b46da !important; border: 1px solid #ddd0f8 !important; position: relative !important;">
              <img src="${theHelperLogoUrl}" alt="THE HELPER" class="tt-thehelper-logo-img" />
              <span>THE HELPER</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 1px;">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              <div class="ar-themed-tooltip ar-thehelper-tooltip">
                <div class="ar-tt-header">
                  <div class="ar-tt-title-wrap">
                    <img src="${theHelperLogoUrl}" alt="THE HELPER" class="ar-tt-logo" />
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
            </button>
            <button type="button" class="tt-about-tab-btn tt-btn-exclusive" id="tt-tab-exclusive-btn" style="margin: 0 !important; border-radius: 6px !important; padding: 5px 9px !important; font-size: 11px !important; font-weight: 700 !important; background: #fdf6ed !important; color: #5c4500 !important; border: 1px solid #e8d8c8 !important; position: relative !important;">
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
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/></svg>
                  <span>Calculate GPA, Target CGPA & Grades</span>
                </div>
                <div class="ar-tt-arrow"></div>
              </div>
            </button>
          </div>
        </div>

        <!-- TAB 0: GUIDE (DEFAULT) -->
        <div class="tt-about-tab-pane active" id="tt-tab-guide" style="position: relative;">
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 22px 14px 18px;">
            <!-- DOTTED BOX UI IN MIDDLE -->
            <div class="rev-guide-dotted-box" style="width: 100%; max-width: 480px; padding: 22px 18px; background: #ffffff; border: 2px dashed #a855f7; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: 0 4px 16px rgba(168, 85, 247, 0.06); box-sizing: border-box;">
              <div style="font-family: 'Space Grotesk', -apple-system, sans-serif; font-size: 16.5px; font-weight: 800; letter-spacing: 0.02em; color: #132450; margin-bottom: 8px;">
                Prime Guide
              </div>
              <!-- GRUNGE BRUSH SCRATCH SPOILER -->
              <div class="rev-scratch-spoiler" style="position: relative; display: inline-flex; align-items: center; justify-content: center; padding: 4px 10px; cursor: pointer; user-select: none;">
                <svg class="rev-grunge-brush" viewBox="0 0 320 48" preserveAspectRatio="none" style="position: absolute; inset: -4px -8px; width: calc(100% + 16px); height: calc(100% + 8px); pointer-events: none; z-index: 2; opacity: 0.4; transition: opacity 0.2s ease;">
                  <defs>
                    <filter id="tt-brush-distress" x="-10%" y="-30%" width="120%" height="160%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.04 0.95" numOctaves="4" result="noise" />
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                    </filter>
                  </defs>
                  <!-- Main rough brush stroke body -->
                  <path d="M 8 11 Q 160 6 312 9 Q 318 24 310 38 Q 160 42 10 37 Q 3 24 8 11 Z" fill="#1e293b" filter="url(#tt-brush-distress)" />
                  <!-- Distressed top & bottom ink spatter lines -->
                  <line x1="12" y1="8" x2="308" y2="8" stroke="#1e293b" stroke-width="2.5" stroke-dasharray="10 6 25 8 4 12 35 6" filter="url(#tt-brush-distress)" />
                  <line x1="16" y1="39" x2="304" y2="39" stroke="#1e293b" stroke-width="2.5" stroke-dasharray="14 8 18 5 30 10 8 14" filter="url(#tt-brush-distress)" />
                </svg>
                <span class="rev-spoiler-text" style="color: #334155; opacity: 0.35; filter: blur(5.5px); font-size: 12px; font-weight: 800; font-family: 'Space Grotesk', -apple-system, sans-serif; transition: all 0.2s ease; z-index: 1;">
                  seriously a guide for this ?? nah u are smart
                </span>
              </div>
            </div>

            <!-- EXPANDABLE FEATURE SECTION (SEPARATED LEFT & RIGHT) -->
            <div style="width: 100%; max-width: 480px; box-sizing: border-box;">
              <button type="button" class="rev-features-toggle-btn" style="width: 100%; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-family: 'Space Grotesk', -apple-system, sans-serif; font-size: 11.5px; font-weight: 800; color: #4c1d95; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.15s ease; box-sizing: border-box;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  Explore Prime Features
                </span>
                <svg class="rev-features-toggle-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              <div class="rev-features-dropdown" style="display: none; margin-top: 8px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; box-sizing: border-box;">
                <!-- LEFT: STUDENT PORTAL -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 7px;">
                  <div style="font-size: 11.5px; font-weight: 800; color: #132450; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; display: flex; align-items: center; gap: 5px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                    Student Portal
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">1. Offline CAPTCHA Solver:</b> 100% offline local model to auto-solve captchas with 95% accuracy.
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">2. Live Attendance & Margins:</b> Real-time 75% target & 65% OD/ML bunk margin.
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">3. Manual Attendance Calc:</b> Calculate your attendance for future present/absent classes.
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">4. Side Panel & Login UI:</b> New Student Portal Login Page UI, instant search filter and pinned quick shortcuts.
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">5. Inside Scribe Request:</b> View Hidden End Semester Exam Timetable.
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">6. Marks, Grades & CGPA:</b> Live GPA prediction, target grade calculation, marks lost tracker & score graphs.
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">7. Interactive Timetable:</b> Custom slot colors/names and optional strikeout with up to 10x Export.
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">8. OD/ML Tracker Added:</b> Mark and Track your OD/ML Leave in attendence page.
                  </div>
                </div>

                <!-- RIGHT: ACADEMIA PORTAL -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 7px;">
                  <div style="font-size: 11.5px; font-weight: 800; color: #132450; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; display: flex; align-items: center; gap: 5px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                    Academia Portal
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">1. Smart Auto Feedback:</b> 1-click course rating & custom comments filler <span style="color: #64748b; font-size: 10px;">(Does not work in Student Portal... will add later)</span>.
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">2. Interactive Timetable:</b> Custom slot colors/names and optional strikeout.
                  </div>
                  <div style="font-size: 10.5px; line-height: 1.35; color: #334155;">
                    <b style="color: #0f172a;">3. Up to 10x Ultra-HD Timetable Export:</b> Export your timetable (PNG/JPEG) with landscape & WhatsApp DP 1:1 format.
                  </div>
                  <div style="background: #fffaf0; border: 1.5px dashed #F4C542; border-radius: 8px; padding: 7px 9px; margin-top: 2px;">
                    <div style="font-size: 9.5px; font-weight: 800; color: #745900; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      Inactive Feature (Due to removal of attendance page from Academia)
                    </div>
                    <div style="font-size: 10px; line-height: 1.35; color: #713f12;">
                      <b style="color: #451a03;">4. CGPA & Marks Lost:</b> Live GPA prediction, Marks Lost count and Auto Grade Prediction.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- BOTTOM REVIEW BUTTON IN MATCHING DOTTED STYLE -->
            <a href="https://chromewebstore.google.com/detail/academia-revanced/kkhjcadiccbncoajcohhndhdiijpgmdj" target="_blank" rel="noopener noreferrer" style="width: 100%; max-width: 480px; padding: 11px 14px; background: #fffaf0; color: #5c4500; border: 2px dashed #F4C542; border-radius: 14px; font-size: 11.5px; font-weight: 800; font-family: 'Space Grotesk', -apple-system, sans-serif; text-decoration: none; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.18s ease; box-sizing: border-box; box-shadow: 0 2px 10px rgba(234, 179, 8, 0.12);">
              <span style="display: flex; align-items: center; gap: 6px; text-align: left; color: #5c4500;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#ca8a04" stroke="#ca8a04" stroke-width="1" style="flex-shrink: 0;">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                since u don't need a guide, review it for freshers
              </span>
              <span style="background: #F4C542; color: #422006; padding: 4px 10px; border-radius: 7px; font-size: 10.5px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; box-shadow: 0 1px 3px rgba(234, 179, 8, 0.25); margin-left: auto;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="21.17" y1="8" x2="12" y2="8"></line><line x1="3.95" y1="6.06" x2="8.54" y2="14"></line><line x1="10.88" y1="21.94" x2="15.46" y2="14"></line></svg>
                Chrome Web Store
              </span>
            </a>
          </div>
        </div>

        <!-- TAB 1: CHANGELOG -->
        <div class="tt-about-tab-pane" id="tt-tab-changelog">

          <!-- v1.4.5 (Current) -->
          <div class="tt-changelog-ver-item current">
            <div class="tt-changelog-ver-head">
              <span class="tt-changelog-ver-tag current">v1.4.5</span>
              <span class="tt-live-badge"><span class="tt-live-dot"></span>LIVE</span>
              <span class="tt-changelog-ver-date">27 October 2026</span>
            </div>
            <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin: 4px 0 6px 0; letter-spacing: 0.02em;">PLACEMENT PREPARATION & INSIGHT</div>
            <ul class="tt-changelog-list">
              <li>Added <b>1.8k+ Aptitude Questions along with Solutions</b> across Quantitative, Logical, Verbal, and Core CSE domains.</li>
              <li>Added <b>Year 2024, 2025, 2026, 2027 Placement Insights</b> with detailed recruitment matrices, CTC tiers, and company analytics.</li>
            </ul>
          </div>

          <!-- Older Versions (Collapsible: v1.4.0 down to v1.0.0) -->
          <div id="ttOlderChangelogContainer" style="display: none;">
            <!-- v1.4.0 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.4.0</span>
                <span class="tt-changelog-ver-date">18 October 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">OD/ML LEAVE TRACKER & CUSTOM PINNED SHORTCUTS</div>
              <ul class="tt-changelog-list">
                <li>Added <b>OD/ML Marking</b> : Track your On-Duty (OD) and Medical Leave (ML) hours with recalculated attendance margins and export/import PNG and JSON formats.</li>
                <li>Added <b>Custom Pinned Shortcuts in Side Panel</b>: Pin up to 4 custom portal sections directly to the side panel alongside default shortcuts.</li>
              </ul>
            </div>

            <!-- v1.3.6 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.3.6</span>
                <span class="tt-changelog-ver-date">7 October 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">TIMETABLE SYNC FIX & COLLEGE CONTACTS</div>
              <ul class="tt-changelog-list">
                <li>Fixed <b>Time table sync</b> across Academia Portal and Student Portal</li>
                <li>Added <b>Important College Contact information</b></li>
              </ul>
            </div>
            <!-- v1.3.5 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.3.5</span>
                <span class="tt-changelog-ver-date">1 October 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">PRIME TIMETABLE & NEW LOGIN PAGE</div>
              <ul class="tt-changelog-list">
                <li>Redesigned <b>Student Portal Login Page</b></li>
                <li>Added <b>Prime Timetable in Student Portal</b> with interactive slot customizer, 10x ultra-HD export, and cross-portal sync with Academia.</li>
                <li>Added <b>Toggle on/off Button</b> just in case CAPTCHA is not working or showing error.</li>
                <li>Added dynamic <b>Reset All</b> and <b>Hide Custom</b> controls with instant in-place schedule restoration.</li>
              </ul>
            </div>
            <!-- v1.3.0 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.3.0</span>
                <span class="tt-changelog-ver-date">25 September 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">MARKS LOST, TARGET MARKS, GRAPHS & CGPA CALCULATOR</div>
              <ul class="tt-changelog-list">
                <li>Added <b>Marks Lost Count, Target Marks Calculator and Grade Estimation List</b></li>
                <li>Added <b>Overall & Semester CGPA Calculator</b></li>
                <li>Added <b>Performance Graphs</b> inside Marks Page to visualize individual subject score changes.</li>
                <li>Added <b>External CGPA Calculator, just incase if Student Portal is Down. [Check Extension Popup UI]</b></li>
              </ul>
            </div>
            <!-- v1.2.7 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.2.7</span>
                <span class="tt-changelog-ver-date">23 September 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">65% OD-ML MARGIN & ATTENDANCE CALCULATOR</div>
              <ul class="tt-changelog-list">
                <li>Added <b>65% OD/ML Margin Target</b> inside Margin Section.</li>
                <li>Added <b>Interactive Manual Attendance Calculator</b> inside Student Portal for manual attendence calculation.</li>
                <li><b>Inside Scribe Request:</b> View Hidden End Semester Exam Timetable.</li>
              </ul>
            </div>

            <!-- v1.2.6 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.2.6</span>
                <span class="tt-changelog-ver-date">26 August 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">OFFLINE CAPTCHA SOLVER & ATTENDANCE THEME</div>
              <ul class="tt-changelog-list">
                <li>Added <b>100% Offline CAPTCHA Solver</b> for Student Portal powered by local WASM/ONNX runtime.</li>
                <li>Automatic recognition for mixed uppercase/lowercase letters & digits with single inline Auto Solve button.</li>
                <li>Updated <b>Student Portal Attendance Max. Hours</b> box to a sleek <b>Light Blue</b> theme for better visual contrast.</li>
              </ul>
            </div>

            <!-- v1.2.5 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.2.5</span>
                <span class="tt-changelog-ver-date">24 August 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">STUDENT PORTAL ADDED</div>
              <ul class="tt-changelog-list">
                <li>Modified <b>Student Portal Side Panel</b> for better use.</li>
                <li>Added <b>Search Filter</b> to quickly search side panel menu items with auto dropdown expansion.</li>
                <li>Added <b>Top Pinned Shortcuts</b> for <b>Attendance</b> and <b>Internal Mark Details</b>.</li>
                <li>Added <b>About Prime Tab</b> for quick access to changelogs, guides, bug reporting, and store reviews.</li>
              </ul>
            </div>

            <!-- v1.2.0 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.2.0</span>
                <span class="tt-changelog-ver-date">14 August 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">INTERACTIVE TIMETABLE & 10X EXPORT</div>
              <ul class="tt-changelog-list">
                <li>Integrated modern, color-coded <b>Prime Timetable</b> directly into the SRM Academic portal.</li>
                <li>Added <b>Interactive Slot Customizer</b> to edit course titles, rooms, and colors with a live hex picker & presets.</li>
                <li>Added <b>Optional & Struck-Through Classes</b> with quick strikeout visual toggles.</li>
                <li>Added <b>Hide / Restore Customizations</b> button to toggle between edits and original schedule.</li>
              </ul>
            </div>

            <!-- v1.1.5 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.1.5</span>
                <span class="tt-changelog-ver-date">25 July 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">ABOUT PRIME & GPA SYNC</div>
              <ul class="tt-changelog-list">
                <li>Fixed <b>GPA Timetable Sync</b> to extract exact active enrolled subjects from <i>My Time Table</i> page.</li>
                <li>Added dynamic <b>Subject Numbering (#)</b> to GPA Calculator with live row numbering.</li>
                <li>Added <b>Session & Logout Data Purging</b> for clean logins.</li>
                <li>Added <b>Prime Information Tab</b> with Changelogs, Phone Guide, Bug Report and FAQ.</li>
              </ul>
            </div>

            <!-- v1.1.0 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.1.0</span>
                <span class="tt-changelog-ver-date">3 March 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">SEMESTER GPA PREDICTOR</div>
              <ul class="tt-changelog-list">
                <li>Added <b>Semester-wise CGPA Calculator</b> dashboard for live GPA prediction.</li>
                <li>Added <b>Dynamic Timetable Sync</b> to automatically fetch course credits regardless of academic year.</li>
                <li>Added <b>Marks Lost</b> and <b>Target Marks</b> calculation for exam score planning.</li>
              </ul>
            </div>

            <!-- v1.0.3 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.0.3</span>
                <span class="tt-changelog-ver-date">24 February 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">MARKS & GRADE PREDICTIONS</div>
              <ul class="tt-changelog-list">
                <li>Added <b>Marks Lost</b> tracking with dynamic grading prediction.</li>
                <li>Added color-coded grade tags in the marks section.</li>
                <li>Added styled <b>Grade Details</b> reference table showing threshold ranges.</li>
              </ul>
            </div>

            <!-- v1.0.2 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.0.2</span>
                <span class="tt-changelog-ver-date">15 January 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">COURSE UI MATCHING</div>
              <ul class="tt-changelog-list">
                <li>Fixed Course Type UI styling to match portal table aesthetics.</li>
              </ul>
            </div>

            <!-- v1.0.1 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.0.1</span>
                <span class="tt-changelog-ver-date">10 January 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">ICON RESOLUTION SCALING</div>
              <ul class="tt-changelog-list">
                <li>Fixed extension icon dimensions and resolution scaling.</li>
              </ul>
            </div>

            <!-- v1.0.0 -->
            <div class="tt-changelog-ver-item old">
              <div class="tt-changelog-ver-head">
                <span class="tt-changelog-ver-tag old">v1.0.0</span>
                <span class="tt-changelog-ver-date">1 January 2026</span>
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">INITIAL RELEASE</div>
              <ul class="tt-changelog-list">
                <li>Initial release with automated course feedback filler and attendance margin visualizer.</li>
              </ul>
            </div>
          </div>

          <!-- Extend / Expand Button -->
          <div style="text-align: center; margin-top: 10px;">
            <button type="button" id="ttChangelogToggleBtn" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 14px; font-size: 11.5px; font-weight: 700; color: #0d1938; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
              <span id="ttChangelogToggleTxt">Show Older Versions (v1.4.0 – v1.0.0)</span>
              <svg id="ttChangelogToggleIcon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- TAB 2: PHONE / TABLET GUIDE -->
        <div class="tt-about-tab-pane" id="tt-tab-android">
          <div style="font-size: 13px; font-weight: 800; color: #4c1d95; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            Phone/Tablet Installation Guide
          </div>
          <div class="tt-step-item">
            <div class="tt-step-num">1</div>
            <div class="tt-step-text">Install any Chromium-based browser supporting extensions (Recommended: <b>Quetta Browser</b>).</div>
          </div>
          <div class="tt-step-item">
            <div class="tt-step-num">2</div>
            <div class="tt-step-text">Open <b>Quetta Browser</b> on your phone or tablet.</div>
          </div>
          <div class="tt-step-item">
            <div class="tt-step-num">3</div>
            <div class="tt-step-text">Install the <b>Academia Prime</b> extension from Chrome Web Store.</div>
          </div>
          <div class="tt-step-item">
            <div class="tt-step-num">4</div>
            <div class="tt-step-text">Log in to the SRM Academia portal to view attendance and timetable enhancements.</div>
          </div>
        </div>

        <!-- TAB 3: FAQ -->
        <div class="tt-about-tab-pane" id="tt-tab-faq">
          <div class="tt-faq-item">
            <div class="tt-faq-q">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              <span>Is it free?</span>
            </div>
            <div class="tt-faq-a"><b>YEPP Obviously!</b> Academia Prime is 100% Free Forever with zero paywalls, ads, or subscriptions.</div>
          </div>
          <div class="tt-faq-item">
            <div class="tt-faq-q">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Does it save passwords or credentials?</span>
            </div>
            <div class="tt-faq-a">
              <div><b>NOPE.</b> Academia Prime does not require login or save any credentials.</div>
              <div style="margin-top: 8px; padding: 6px 10px; background: #e8ecf5; border: 1.5px dashed #6b83b4; border-radius: 8px; font-size: 11px; display: flex; width: fit-content; align-items: center; gap: 6px; color: #0d1938;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>Read our official <a href="privacy-policy.html" target="_blank" style="color: #132450; font-weight: 800; text-decoration: underline;">Privacy Policy</a>.</span>
              </div>
            </div>
          </div>
          <div class="tt-faq-item">
            <div class="tt-faq-q">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Total Users</span>
            </div>
            <div class="tt-faq-a">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 800; color: #132450; background: #e8ecf5; border: 1px solid #ddd6fe; padding: 2px 8px; border-radius: 6px; font-size: 11.5px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  2.5k+ Total Installs
                </span>
                <span style="display: inline-flex; align-items: center; background: #fff4c2; color: #5c4500; border: 1px solid #F4C542; padding: 1px 7px; border-radius: 6px; font-size: 10.5px; font-weight: 800;">
                  Last Count: 1st October 2026
                </span>
              </div>
            </div>
          </div>
          <div class="tt-faq-item">
            <div class="tt-faq-q">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
              <span>Managed By</span>
            </div>
            <div class="tt-faq-a" style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="display: inline-flex; align-items: center; gap: 4px; color: #0f172a; font-weight: 700;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#000000"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  GitHub:
                </span>
                <strong style="color: #132450;">Aayush</strong>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="display: inline-flex; align-items: center; gap: 4px; color: #0a66c2; font-weight: 700;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#0a66c2"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  LinkedIn:
                </span>
                <strong style="color: #0a66c2;">Aayush</strong>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="display: inline-flex; align-items: center; gap: 4px; color: #5865F2; font-weight: 700;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                  Discord:
                </span>
                <strong style="color: #0d1938; font-weight: 800;">@im_batman_at_2am</strong>
                <span style="display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 800;">
                  <span style="width: 5px; height: 5px; border-radius: 50%; background: #10b981;"></span>
                  Just a text away
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 4: PORTAL NOTICE -->
        <div class="tt-about-tab-pane" id="tt-tab-notice">
          <div style="font-size: 13px; font-weight: 800; color: #5c4500; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c69a22" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
            Attendance Availability & Prime Feature Status
          </div>

          <!-- Section 1: Unavailable Cause -->
          <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed #e2e8f0;">
            <div style="font-size: 12px; font-weight: 800; color: #991b1b; margin-bottom: 5px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Why is the Attendance Page Unavailable?</span>
            </div>
            <ul style="margin: 0; padding-left: 18px; font-size: 11.5px; color: #475569; line-height: 1.5; font-weight: 600;">
              <li><b>Course Enrollment / Semester Transition:</b> During registration periods or university system updates, the official Attendance page is temporarily deactivated or removed from the Academia portal.</li>
              <li><b>Temporary or Permanently Student Portal Shift:</b> Official attendance page may temporarily or permanently be shifted to the <b>SRM Student Portal</b> until Academia attendance is restored.</li>
            </ul>
          </div>

          <!-- Section 2: Features What Will Work & What Won't -->
          <div style="margin-bottom: 12px;">
            <!-- On Academia Portal -->
            <div style="font-size: 12px; font-weight: 800; color: #1e1b4b; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><line x1="2" y1="22" x2="22" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
              <span>On Academia Portal:</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-bottom: 10px;">
              <!-- What Works -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px;">
                <div style="font-size: 11.5px; font-weight: 800; color: #166534; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                  <span>What Will Work:</span>
                </div>
                <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #15803d; line-height: 1.45; font-weight: 600;">
                  <li><b>Prime Timetable:</b> Fully functional weekly schedule view.</li>
                  <li><b>Interactive Slot Customizer:</b> Custom edits, colors & optional strikes.</li>
                  <li><b>Feedback Automation:</b> Instant faculty feedback autofill.</li>
                </ul>
              </div>

              <!-- What Won't Work -->
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px;">
                <div style="font-size: 11.5px; font-weight: 800; color: #991b1b; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <span>What Won't Work (Temporarily Paused):</span>
                </div>
                <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #b91c1c; line-height: 1.45; font-weight: 600;">
                  <li><b>Live Attendance Stats:</b> Percentage calculation requires active portal table.</li>
                  <li><b>Bunk / Margin Predictor:</b> Paused until attendance data is live.</li>
                  <li><b>Attendance-Based GPA Stats:</b> Resumes once attendance records return.</li>
                </ul>
              </div>
            </div>

            <!-- On Student Portal -->
            <div style="font-size: 12px; font-weight: 800; color: #1e1b4b; margin-bottom: 6px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              <span>On Student Portal:</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-bottom: 10px;">
              <!-- What Works -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px;">
                <div style="font-size: 11.5px; font-weight: 800; color: #166534; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                  <span>What Will Work:</span>
                </div>
                <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #15803d; line-height: 1.45; font-weight: 600;">
                  <li>1) <b>Every added feature</b> (Live Attendance Stats, Bunk / Margin Predictor, Modified Side Panel, etc.).</li>
                </ul>
              </div>

              <!-- What Won't Work -->
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px;">
                <div style="font-size: 11.5px; font-weight: 800; color: #991b1b; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <span>What Won't Work:</span>
                </div>
                <ul style="margin: 0; padding-left: 16px; font-size: 11px; color: #b91c1c; line-height: 1.45; font-weight: 600;">
                  <li><b>None:</b> All features are active and 100% operational.</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Section 3: Restoration & Bug Fixing -->
          <div style="background: #e8ecf5; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 11.5px; font-weight: 800; color: #1e40af; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>When Attendance is Active Again:</span>
            </div>
            <div style="font-size: 11px; color: #1e3a8a; line-height: 1.45; font-weight: 600;">
              All attendance tracking and margin features will automatically reactivate without needing any update. 
              <br><b>Found any bug after the page is active?</b> Submit a report via the <b>Report Bug</b> tab and it will be fixed <b>ASAP!</b>
            </div>
          </div>
        </div>

        <!-- TAB 5: IMPORTANT LINKS -->
        <div class="tt-about-tab-pane" id="tt-tab-links">
          <div style="font-size: 13px; font-weight: 800; color: #1e1b4b; margin-bottom: 14px; display: flex; align-items: center; gap: 7px;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span>SRM Important & Essential Links</span>
          </div>

          <!-- Section 1: Main Portals -->
          <div style="margin-bottom: 14px;">
            <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 7px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="22" x2="22" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
              <span>Main Portals</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">
              <!-- Academia -->
              <a href="https://academia.srmist.edu.in/#CIRCULAR" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #e8ecf5; border: 1px solid #bae6fd; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(2, 132, 199, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #e0f2fe; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #0d1938; line-height: 1.35; word-break: break-word;">Academia Portal</div>
                    <div style="font-size: 9.5px; color: #132450; font-weight: 600; line-height: 1.3; margin-top: 1px;">academia.srmist.edu.in</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #132450; background: #e0f2fe; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
              <!-- Student Portal -->
              <a href="https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/youLogin.jsp" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #e8ecf5; border: 1px solid #b8c2d9; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(79, 70, 229, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #e8ecf5; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #0d1938; line-height: 1.35; word-break: break-word;">SRM Student Portal</div>
                    <div style="font-size: 9.5px; color: #132450; font-weight: 600; line-height: 1.3; margin-top: 1px;">sp.srmist.edu.in</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #132450; background: #e8ecf5; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
              <!-- Parents Portal -->
              <a href="https://sp.srmist.edu.in/srmiststudentportal/students/loginManager/parentLogin.jsp" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(22, 163, 74, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #dcfce7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #166534; line-height: 1.35; word-break: break-word;">SRM Parents Portal</div>
                    <div style="font-size: 9.5px; color: #16a34a; font-weight: 600; line-height: 1.3; margin-top: 1px;">sp.srmist.edu.in</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #16a34a; background: #dcfce7; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
            </div>
          </div>

          <!-- Section 2: WiFi & NetID -->
          <div style="margin-bottom: 14px;">
            <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 7px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
              <span>Campus WiFi & NetID</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">
              <!-- Hostel WiFi -->
              <a href="https://iach.srmist.edu.in/Connect/PortalMain" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #e8ecf5; border: 1px solid #bae6fd; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(2, 132, 199, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #e0f2fe; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #0d1938; line-height: 1.35; word-break: break-word;">Hostel WiFi Login Portal</div>
                    <div style="font-size: 9.5px; color: #132450; font-weight: 600; line-height: 1.3; margin-top: 1px;">iach.srmist.edu.in</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #132450; background: #e0f2fe; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
              <!-- Classroom WiFi -->
              <a href="https://iac.srmist.edu.in/Connect/PortalMain" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(8, 145, 178, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #cffafe; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #0e7490; line-height: 1.35; word-break: break-word;">Classroom WiFi Login Portal</div>
                    <div style="font-size: 9.5px; color: #132450; font-weight: 600; line-height: 1.3; margin-top: 1px;">iac.srmist.edu.in</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #132450; background: #cffafe; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
              <!-- Password Reset (NetID) -->
              <a href="https://ssp.srmist.edu.in/resetpassword/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(225, 29, 72, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #ffe4e6; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #be123c; line-height: 1.35; word-break: break-word;">Password Reset Portal (NetID)</div>
                    <div style="font-size: 9.5px; color: #e11d48; font-weight: 600; line-height: 1.3; margin-top: 1px;">ssp.srmist.edu.in</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #e11d48; background: #ffe4e6; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
            </div>
          </div>

          <!-- Section 3: Academic & Activity -->
          <div style="margin-bottom: 14px;">
            <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 7px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              <span>Academic & Activity</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">
              <a href="https://dld.srmist.edu.in/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #e8ecf5; border: 1px solid #ddd6fe; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(124, 58, 237, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #e8ecf5; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #5b21b6; line-height: 1.35; word-break: break-word;">eLab / eCurricula / eCircuit / eSkill</div>
                    <div style="font-size: 9.5px; color: #132450; font-weight: 600; line-height: 1.3; margin-top: 1px;">dld.srmist.edu.in</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #132450; background: #e8ecf5; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
            </div>
          </div>

          <!-- Section 4: Placements -->
          <div style="margin-bottom: 14px;">
            <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 7px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              <span>Placements</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">
              <a href="https://placements.haveloc.com/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(5, 150, 105, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #ccfbf1; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #047857; line-height: 1.35; word-break: break-word;">Haveloc Placement Portal</div>
                    <div style="font-size: 9.5px; color: #059669; font-weight: 600; line-height: 1.3; margin-top: 1px;">placements.haveloc.com</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #059669; background: #ccfbf1; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
            </div>
          </div>

          <!-- Section 5: Library & Databases -->
          <div style="margin-bottom: 14px;">
            <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 7px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c69a22" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              <span>Library & Databases</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">
              <!-- e-Library -->
              <a href="https://library.srmist.edu.in/univlib/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #fffaf0; border: 1px solid #f4d875; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(217, 119, 6, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #fff4c2; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c69a22" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #9a7200; line-height: 1.35; word-break: break-word;">SRM e-Library Portal</div>
                    <div style="font-size: 9.5px; color: #c69a22; font-weight: 600; line-height: 1.3; margin-top: 1px;">library.srmist.edu.in</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #c69a22; background: #fff4c2; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
              <!-- Library Books (New) -->
              <a href="https://srmistdl.knimbus.com/portal/v2/default/home" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(234, 88, 12, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #ffedd5; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #9a7200; line-height: 1.35; word-break: break-word;">Library Books Database (New)</div>
                    <div style="font-size: 9.5px; color: #ea580c; font-weight: 600; line-height: 1.3; margin-top: 1px;">srmistdl.knimbus.com/v2</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #ea580c; background: #ffedd5; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
              <!-- Library Books (Old) -->
              <a href="https://srmistdl.knimbus.com/user#/home" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(100, 116, 139, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #475569; line-height: 1.35; word-break: break-word;">Library Books Database (Old)</div>
                    <div style="font-size: 9.5px; color: #64748b; font-weight: 600; line-height: 1.3; margin-top: 1px;">srmistdl.knimbus.com</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #64748b; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
            </div>
          </div>

          <!-- Section 6: Hostel & IT Service Desk -->
          <div style="margin-bottom: 14px;">
            <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 7px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>Hostel & IT Service Desk (Requires SRM WiFi)</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">
              <a href="https://itkmservicedesk.srmist.edu.in/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(225, 29, 72, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #ffe4e6; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #be123c; line-height: 1.35; word-break: break-word;">Hostel Complaint & IT Service Desk</div>
                    <div style="font-size: 9.5px; color: #e11d48; font-weight: 600; line-height: 1.3; margin-top: 1px;">itkmservicedesk.srmist.edu.in (SRM WiFi)</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #be123c; background: #ffe4e6; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
            </div>
          </div>

          <!-- Section 7: OD-ML / Leave Portal -->
          <div style="margin-bottom: 14px;">
            <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 7px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>OD-ML / Leave Portal (Only works with SRM Classroom WiFi)</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">
              <a href="http://10.1.105.62/srmleaveapp/" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(8, 145, 178, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #cffafe; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #0e7490; line-height: 1.35; word-break: break-word;">OD-ML / Leave Application Portal</div>
                    <div style="font-size: 9.5px; color: #132450; font-weight: 600; line-height: 1.3; margin-top: 1px;">Classroom WiFi (10.1.105.62)</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #132450; background: #cffafe; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
            </div>
          </div>

          <!-- Section 7: Admissions -->
          <div>
            <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin-bottom: 7px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              <span>Admissions</span>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start;">
              <a href="https://admissions.srmist.edu.in/srmistonline/enrollment/template/HRDSystem.jsp" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: #e8ecf5; border: 1px solid #b8c2d9; border-radius: 9px; text-decoration: none; transition: all 0.2s ease; flex: 1 1 260px; min-width: 250px; max-width: 100%; box-sizing: border-box; box-shadow: 0 1px 3px rgba(79, 70, 229, 0.06);">
                <div style="display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0;">
                  <div style="width: 28px; height: 28px; border-radius: 7px; background: #e8ecf5; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 11.5px; font-weight: 800; color: #0d1938; line-height: 1.35; word-break: break-word;">SRM Admission Portal</div>
                    <div style="font-size: 9.5px; color: #132450; font-weight: 600; line-height: 1.3; margin-top: 1px;">admissions.srmist.edu.in</div>
                  </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: #132450; background: #e8ecf5; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; white-space: nowrap;">Open ↗</span>
              </a>
            </div>
          </div>
        </div>

        <!-- TAB 6: REPORT BUG -->
        <div class="tt-about-tab-pane" id="tt-tab-bug">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-family: 'Plus Jakarta Sans', sans-serif;">
            <div style="font-size: 13px; font-weight: 800; color: #1e1b4b; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 0 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v2"/><path d="M6 13H2"/><path d="M22 13h-4"/><path d="M20 7.13l-3.38 1.35"/><path d="m4 7.13 3.38 1.35"/><path d="m20 18.87-3.38-1.35"/><path d="m4 18.87 3.38-1.35"/></svg>
              Report Bug & Feedback Form
            </div>
            <a href="https://docs.google.com/forms/d/1tJC_i71rU6TjHtndcNkotq39YTcs9VxU79uCXzi2a3w/viewform" target="_blank" style="font-size: 11px; font-weight: 800; color: #132450; text-decoration: underline; display: flex; align-items: center; gap: 4px;">
              Open in New Tab
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
          <div style="width: 100%; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
            <iframe src="https://docs.google.com/forms/d/1tJC_i71rU6TjHtndcNkotq39YTcs9VxU79uCXzi2a3w/viewform?embedded=true" width="100%" height="540" frameborder="0" marginheight="0" marginwidth="0" style="border:none; width:100%; display:block;">Loading Bug Report Form…</iframe>
          </div>
        </div>

        <!-- TAB 5: REVIEW -->
        <div class="tt-about-tab-pane" id="tt-tab-review">
          <div style="background: #fffaf0; border: 1.5px solid #f4d875; border-radius: 12px; padding: 20px; font-family: 'Plus Jakarta Sans', sans-serif;">
            <div style="font-size: 14px; font-weight: 800; color: #5c4500; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#c69a22" stroke="#c69a22" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Feeling Bored ??? ...... Drop a Review on Chrome Web Store for Freshers.
            </div>
            <div style="font-size: 12.5px; color: #451a03; margin-bottom: 16px; font-weight: 600; line-height: 1.5;">
              Enjoying automated feedback, CGPA prediction, timetable & attendance margin tracking? 
              <br><b>Help new SRM students discover Academia Prime by sharing your review on the Chrome Web Store!</b>
            </div>
            <a href="https://chromewebstore.google.com/detail/academia-revanced/kkhjcadiccbncoajcohhndhdiijpgmdj" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; background: #ffffff; color: #9a7200; border: 1.5px solid #F4C542; padding: 10px 20px; border-radius: 8px; font-size: 12.5px; font-weight: 800; text-decoration: none; box-shadow: 0 2px 8px rgba(180,83,9,0.08); transition: transform 0.15s ease;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#c69a22" stroke="#c69a22" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Drop a Review on Chrome Web Store
            </a>
          </div>
        </div>

        <!-- TAB 6: SRM CONTACT DIRECTORY -->
        <div class="tt-about-tab-pane" id="tt-tab-contacts">
          <div id="tt-contacts-directory-container">
            ${typeof window.SRM_CONTACT_DIRECTORY_MODULE !== 'undefined' ? window.SRM_CONTACT_DIRECTORY_MODULE.getContactDirectoryHTML() : ''}
          </div>
        </div>
      </div>
    `;

    container.appendChild(aboutCard);

    // Toggle collapse
    const headerEl = aboutCard.querySelector("#ttAboutHeader");
    const bodyEl = aboutCard.querySelector("#ttAboutBody");
    const chevronEl = aboutCard.querySelector("#ttAboutChevron");
    const statusLbl = aboutCard.querySelector("#ttAboutStatusLbl");

    headerEl.addEventListener("click", () => {
      const isOpen = bodyEl.classList.contains("open");
      if (isOpen) {
        bodyEl.classList.remove("open");
        chevronEl.classList.remove("open");
        statusLbl.textContent = "Expand Details";
      } else {
        bodyEl.classList.add("open");
        chevronEl.classList.add("open");
        statusLbl.textContent = "Collapse Details";
      }
    });

    // Tab switching
    const tabBtns = aboutCard.querySelectorAll(".tt-about-tab-btn");
    const tabPanes = aboutCard.querySelectorAll(".tt-about-tab-pane");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (btn.id === "tt-tab-thehelper-btn" || btn.classList.contains("tt-btn-thehelper")) {
          e.preventDefault();
          window.open("https://www.thehelpers.tech/", "_blank");
          return;
        }

        if (btn.id === "tt-tab-exclusive-btn" || btn.classList.contains("tt-btn-exclusive")) {
          e.preventDefault();
          const extUrl = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
            ? chrome.runtime.getURL("src/cgpa_calculator/calculator.html")
            : "";
          if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: "openCalculator", url: extUrl }, (res) => {
              if (chrome.runtime.lastError || !res?.success) {
                if (extUrl) window.open(extUrl, "_blank");
              }
            });
          } else if (extUrl) {
            window.open(extUrl, "_blank");
          }
          return;
        }

        const targetId = btn.getAttribute("data-target");
        if (!targetId) return;

        tabBtns.forEach((b) => {
          if (!b.closest(".tt-tools-grouped-wrap, .sp-tools-grouped-wrap, .rev-tools-grouped-wrap")) {
            b.classList.remove("active");
          }
        });
        tabPanes.forEach((p) => p.classList.remove("active"));

        btn.classList.add("active");
        const targetPane = aboutCard.querySelector(`#${targetId}`);
        if (targetPane) {
          targetPane.classList.add("active");
          if (targetId === "tt-tab-contacts" && window.SRM_CONTACT_DIRECTORY_MODULE) {
            window.SRM_CONTACT_DIRECTORY_MODULE.initContactDirectory(targetPane);
          }
        }
      });
    });

    aboutCard.addEventListener("click", (e) => {
      const spoiler = e.target.closest(".rev-scratch-spoiler, .rev-discord-spoiler");
      if (spoiler) {
        const isRevealed = spoiler.classList.contains("revealed");
        const brush = spoiler.querySelector(".rev-grunge-brush");
        const text = spoiler.querySelector(".rev-spoiler-text") || spoiler;
        if (isRevealed) {
          spoiler.classList.remove("revealed");
          if (brush) brush.style.display = "block";
          text.style.color = "#334155";
          text.style.opacity = "0.35";
          text.style.filter = "blur(5.5px)";
          text.style.background = "transparent";
          text.style.border = "none";
          text.style.padding = "0";
          text.style.borderRadius = "0";
          text.style.boxShadow = "none";
          spoiler.removeAttribute("title");
        } else {
          spoiler.classList.add("revealed");
          if (brush) brush.style.display = "none";
          text.style.color = "#5b21b6";
          text.style.opacity = "1";
          text.style.filter = "none";
          text.style.background = "#e8ecf5";
          text.style.border = "1.5px dashed #a855f7";
          text.style.borderRadius = "8px";
          text.style.padding = "4px 12px";
          text.style.boxShadow = "0 2px 10px rgba(168, 85, 247, 0.2)";
          spoiler.removeAttribute("title");
        }
        return;
      }
      const featToggle = e.target.closest(".rev-features-toggle-btn");
      if (featToggle) {
        const dropdown = aboutCard.querySelector(".rev-features-dropdown");
        const icon = featToggle.querySelector(".rev-features-toggle-icon");
        if (dropdown) {
          const isHidden = dropdown.style.display === "none" || dropdown.style.display === "";
          dropdown.style.display = isHidden ? "grid" : "none";
          if (icon) icon.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
        }
        return;
      }
    });

    // Expand / Collapse older changelog versions
    const changelogToggleBtn = aboutCard.querySelector("#ttChangelogToggleBtn");
    const olderChangelogs = aboutCard.querySelector(
      "#ttOlderChangelogContainer",
    );
    const changelogToggleTxt = aboutCard.querySelector("#ttChangelogToggleTxt");
    const changelogToggleIcon = aboutCard.querySelector(
      "#ttChangelogToggleIcon",
    );

    if (changelogToggleBtn && olderChangelogs) {
      changelogToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = olderChangelogs.style.display === "none";
        if (isHidden) {
          olderChangelogs.style.display = "block";
          changelogToggleTxt.textContent = "Hide Older Versions";
          changelogToggleIcon.style.transform = "rotate(180deg)";
        } else {
          olderChangelogs.style.display = "none";
          changelogToggleTxt.textContent =
            "Show Older Versions (v1.4.0 – v1.0.0)";
          changelogToggleIcon.style.transform = "rotate(0deg)";
        }
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PAGE HANDLER — Injects Prime Time Table at BOTTOM of the attendance page
  // ────────────────────────────────────────────────────────────────────────────
  const MAX_RETRIES = 20;
  const RETRY_MS = 1000;
  let retryCount = 0;

  const TT_CONTAINER_IDS = [
    "zc-viewcontainer_My_Time_Table_Attendance",
    "zc-viewcontainer_My_Time_Table_2023_24",
    "zc-viewcontainer_My_Time_Table_2024_25",
  ];

  function getTTContainer() {
    for (const id of TT_CONTAINER_IDS) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  async function handleTTPage() {
    retryCount = 0;
    document.getElementById("tt-panel")?.remove();
    document.getElementById("tt-about-card")?.remove();
    tryEnhanceTTPage();
  }

  async function tryEnhanceTTPage() {
    const container = getTTContainer();
    if (!container) {
      if (++retryCount < MAX_RETRIES) {
        setTimeout(tryEnhanceTTPage, RETRY_MS);
        return;
      }
      return;
    }

    if (container.querySelector("#tt-panel")) return;

    try {
      showToast("Loading Prime Time Table…", 3500, "info");

      // 1. Fetch course-slot mapping & profile data
      const {
        courses,
        batch,
        profileData,
        doc: crDoc,
      } = await fetchCourseData();
      _cachedCourseData = courses;

      const netId = getNetId();
      if (netId)
        chrome.storage.local.set({ ["ttProfile_" + netId]: profileData });

      // 2. Fetch unified timetable or extract from course reg page
      let timetableHTML = null;
      if (batch === "1" || batch === "2") {
        try {
          timetableHTML = await fetchUnifiedTimetable(batch);
        } catch (e) {
          console.warn(
            "[TT] Unified TT fetch failed, falling back:",
            e.message,
          );
        }
      }

      if (!timetableHTML && crDoc) {
        const fallbackTbl = crDoc.querySelector(
          'table[align="center"][border="5"], table[border="5"], table.timetable',
        );
        if (fallbackTbl) timetableHTML = fallbackTbl.outerHTML;
      }

      if (!timetableHTML) {
        showToast(
          "Could not load timetable data from Academia portal.",
          5000,
          "error",
        );
        return;
      }

      // 3. Parse and Render HTML
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = timetableHTML;
      const tempTable = tempDiv.querySelector("table");
      if (!tempTable) {
        showToast("Timetable table could not be parsed.", 5000, "error");
        return;
      }

      const ttJSON = parseTTToJSON(tempTable);
      const renderedHTML = renderTTFromJSON(ttJSON, courses);

      // Save complete timetable payload to chrome.storage.local for cross-origin sync with Student Portal
      try {
        const payload = {
          ttJSON,
          courses,
          batch,
          profileData,
          timetableHTML,
          netId: netId || "anon",
          timestamp: Date.now()
        };
        chrome.storage.local.set({
          ["ttProfile_" + (netId || "anon")]: profileData,
          ["ttPayload_" + (netId || "anon")]: payload,
          ar_latest_timetable_payload: payload
        });
      } catch (e) {
        console.warn("[TT] Failed to save timetable payload to storage:", e);
      }

      // 4. Construct the complete Prime Panel
      const panel = document.createElement("div");
      panel.id = "tt-panel";

      // Export Area (wraps header + table for screenshot capture)
      const exportArea = document.createElement("div");
      exportArea.id = "tt-export-area";

      // Header Bar
      const head = document.createElement("div");
      head.id = "tt-panel-head";

      // Clean Subtitle
      let branchSectionText = "SRMIST";
      if (profileData?.programmeBranch) {
        branchSectionText = profileData.programmeBranch;
        if (profileData.section) {
          branchSectionText += ` (${profileData.section})`;
        }
      } else if (profileData?.section) {
        branchSectionText = `B.Tech (${profileData.section})`;
      }

      // Title & Subtitle Group
      const brandGroup = document.createElement("div");
      brandGroup.className = "tt-brand-group";
      brandGroup.innerHTML = `
        <div class="tt-brand-title-row">
          <div class="tt-brand-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Time Table
          </div>
          <span class="tt-revanced-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            PRIME
          </span>
        </div>
        <p class="tt-sub-text">Weekly Schedule &bull; ${branchSectionText}</p>
      `;
      head.appendChild(brandGroup);

      // Toolbar Controls
      const toolbar = document.createElement("div");
      toolbar.className = "tt-toolbar";

      // Edit Button
      const editBtn = document.createElement("button");
      editBtn.id = "tt-edit-btn";
      editBtn.className = "tt-btn";
      editBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Edit Slots
      `;
      editBtn.onclick = toggleEditMode;

      // Toggle Custom View Button (Dynamic: shown when edits exist)
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
        Hide Custom
      `;
      toggleBtn.onclick = toggleCustomView;

      // Reset Button (Dynamic: shown when edits exist)
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
        Reset All
      `;
      resetBtn.title = "Reset customized slots back to original";
      resetBtn.onclick = resetAllModifications;

      // Download Dropdown Button & Menu (Hover & Click)
      const downloadWrap = document.createElement("div");
      downloadWrap.className = "tt-download-dropdown-wrap";
      downloadWrap.id = "ttDownloadDropdownWrap";

      const downloadBtn = document.createElement("button");
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
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
        e.stopPropagation();
        downloadMenu.classList.toggle("show");
      };

      document.addEventListener("click", () => {
        downloadMenu.classList.remove("show");
      });

      downloadMenu.querySelector("#ttDownloadOptOriginal").onclick = (e) => {
        e.stopPropagation();
        downloadMenu.classList.remove("show");
        downloadOriginal10x();
      };

      downloadMenu.querySelector("#ttDownloadOptWhatsApp").onclick = (e) => {
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

      // Append panel to container
      container.appendChild(panel);

      // 5. Apply Today Row Highlight & Load Saved Custom Edits
      highlightTodayRow(panel);
      await loadCustomEdits();
      updateResetAllButtonDynamic();

      // 6. Inject About Prime Section directly below timetable
      injectAboutSection(container);

      showToast("Prime Time Table Loaded!", 2500, "success");
    } catch (err) {
      console.error("[TT] Enhancement error:", err);
      showToast("Error loading timetable. Check console.", 5000, "error");
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ROUTER — SPA Navigation Listener
  // ────────────────────────────────────────────────────────────────────────────
  const TT_HASH_PATTERNS = [
    "My_Time_Table_Attendance",
    "My_Time_Table_2024_25",
    "My_Time_Table_2023_24",
    "My_Time_Table",
  ];

  function isTTHash(hash) {
    return TT_HASH_PATTERNS.some((p) => hash.includes(p));
  }

  function route() {
    const hash = window.location.hash || "";
    if (isTTHash(hash)) handleTTPage();
  }

  window.addEventListener("hashchange", route);

  function observeTTContainer() {
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "childList") {
          const added = Array.from(m.addedNodes).some(
            (n) => n.id && TT_CONTAINER_IDS.some((id) => n.id === id),
          );
          if (added) {
            obs.disconnect();
            setTimeout(() => {
              route();
              observeTTContainer();
            }, 300);
            break;
          }
        }
      }
    });
    if (document.body) {
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.body) {
    observeTTContainer();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observeTTContainer();
      route();
    });
  }

  async function preSyncTimetableToStorage() {
    try {
      const { courses, batch, profileData, doc: crDoc } = await fetchCourseData();
      const netId = getNetId();
      if (netId && profileData) {
        chrome.storage.local.set({ ["ttProfile_" + netId]: profileData });
      }

      let timetableHTML = null;
      if (batch === "1" || batch === "2") {
        try {
          timetableHTML = await fetchUnifiedTimetable(batch);
        } catch (_) {}
      }
      if (!timetableHTML && crDoc) {
        const fallbackTbl = crDoc.querySelector(
          'table[align="center"][border="5"], table[border="5"], table.timetable'
        );
        if (fallbackTbl) timetableHTML = fallbackTbl.outerHTML;
      }

      if (timetableHTML) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = timetableHTML;
        const tempTable = tempDiv.querySelector("table");
        if (tempTable) {
          const ttJSON = parseTTToJSON(tempTable);
          const payload = {
            ttJSON,
            courses,
            batch,
            profileData,
            timetableHTML,
            netId: netId || "anon",
            timestamp: Date.now()
          };
          chrome.storage.local.set({
            ["ttProfile_" + (netId || "anon")]: profileData,
            ["ttPayload_" + (netId || "anon")]: payload,
            ar_latest_timetable_payload: payload
          });
        }
      }
    } catch (_) {}
  }

  // Run background pre-sync immediately when Academia page loads
  setTimeout(preSyncTimetableToStorage, 800);

  route();
})();
