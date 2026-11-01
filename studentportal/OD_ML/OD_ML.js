/**
 * Academia Prime - Student Portal OD & ML Tracker Engine
 * File: studentportal/OD_ML/OD_ML.js
 *
 * Capabilities:
 * 1. Strictly isolated to Attendance Details page (zero clashing with Timetable / Exam / Internals).
 * 2. Uses div-based table containers for Simulation & History to prevent collisions with timetable scanners.
 * 3. Enrolled Subject dropdown strictly shows "CODE - FULL NAME" for all courses.
 * 4. Proper Day Order sync from DOM highlights & official Academic Calendar / Planner endpoints.
 * 5. In expanded OD_ML Margin column: only subjects with approved OD/ML show margin flow; others display "No OD/ML Added".
 * 6. Strict Prime color scheme: Green (> 0), Yellow (0), Red (< 0 / required margin).
 * 7. Preset quick tags in Comment / Reason Note: Hackathon, Workshop, Ideathon, Interview, Placement Test, Event, Fest, Club Event OD, custom.
 * 8. Better Calendar UI with Today/Yesterday shortcuts, human preview, and 5-Day Order strip.
 * 9. Shifted "+ Expand OD_ML" / "− Collapse OD_ML" toggle button located above the tracker section only.
 * 10. Strictly Light Theme, NO gradients, NO emojis (SVGs / Favicon only).
 */
(() => {
  "use strict";

  // Strictly execute on Student Portal top frame only - never on Academia or sub-iframes
  if (!window.location.hostname.includes("sp.srmist.edu.in") || window !== window.top) {
    return;
  }

  // Prevent multiple executions if injected multiple times
  if (window.__sp_od_ml_initialized) {
    return;
  }
  window.__sp_od_ml_initialized = true;

  // Storage Keys
  const STORAGE_KEY_RECORDS = "ar_odml_records_v1";
  const STORAGE_KEY_SETTINGS = "ar_odml_settings_v1";
  const STORAGE_KEY_75_BASELINE = "ar_odml_75_baseline_v1";

  // Favicon Icon URL
  const FAVICON_ICON_URL =
    typeof chrome !== "undefined" && chrome.runtime?.getURL
      ? chrome.runtime.getURL("icons/academia-prime-logo.png")
      : "";

  // Academic Calendar date map cache: e.g. { "2026-10-13": "2", "day_13": "2" }
  let calendarDateMap = {};

  // Preset Reason Tags
  const PRESET_REASON_TAGS = [
    "Hackathon",
    "Ideathon",
    "Workshop",
    "Conclave",
    "Seminar",
    "Conference",
    "Summit",
    "Pre Placement Talk",
    "Placement Test",
    "Group Discussion",
    "Interview",
    "Internship",
    "Club Work",
    "Club Event",
    "Fest",
    "Medical Issue",
    "custom",
  ];

  // In-memory State
  let state = {
    records: [],
    customSubjects: [],
    isHeaderExpanded: false, // Always collapsed on page/tab refresh
    isMarginColumnExpanded: false, // View OD/ML column always hidden on page/tab refresh
    currentThreshold: 75, // STRICT USER RULE: Exclusively and permanently 75% for OD/ML Tracker
    saved75Baseline: null, // Saved 75% attendance and margin data in local storage
    selectedDate: getTodayDateString(),
    dayOrder: null, // STRICT USER RULE: Never automatically pre-selected; user must manually pick!
    isHoliday: false,
    holidayDisplayText: "",
    isSyncingDayOrder: false,
    selectedSubjectCode: "",
    selectedType: "OD",
    selectedHours: 1,
    commentText: "",
    activeTag: "",
    personalNote: "",
    feedSubjectFilter: "ALL",
    feedTypeFilter: "ALL",
    feedSearchQuery: "",
    filterChipsExpanded: false,
    isBackupCollapsed: false,
  };

  /**
   * Helper: Formats a date into YYYY-MM-DD
   */
  function getTodayDateString(offsetDays = 0) {
    const d = new Date();
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Formats a date string into readable DD Mon YYYY
   */
  function formatHumanDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${day} ${months[monthIdx] || ""} ${year}`;
  }

  /**
   * Helper: Formats date into "DayOfWeek • DD Mon YYYY"
   */
  function getHumanDayAndDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return `${days[d.getDay()] || ""} • ${formatHumanDate(dateStr)}`;
  }

  /**
   * Helper: Strictly formats subject name as "CODE - FULL NAME"
   */
  function formatSubjectDisplayName(code, fullName) {
    let c = (code || "").trim();
    if (c.startsWith("CUSTOM")) {
      c = "CUSTOM";
    }
    let f = (fullName || "").trim();

    if (c && f.toUpperCase().startsWith(c.toUpperCase())) {
      f = f.substring(c.length).replace(/^[\s\-–—:]+/, "").trim();
    }

    if (c === "CUSTOM") {
      return f || "Custom Subject";
    }

    if (c && f) {
      return `${c} - ${f}`;
    }
    return c || f || "Unknown Subject";
  }

  /**
   * Helper: Returns Badge CSS class matching Prime color rules:
   * > 0: GREEN (sp-odml-pos)
   * === 0: YELLOW (sp-odml-zero)
   * < 0: RED (sp-odml-neg)
   */
  function getMarginBadgeClass(marginVal) {
    if (marginVal === null || marginVal === undefined || isNaN(marginVal)) return "sp-margin-zero sp-odml-zero";
    if (marginVal > 0) return "sp-margin-pos sp-odml-pos";
    if (marginVal === 0) return "sp-margin-zero sp-odml-zero";
    return "sp-margin-neg sp-odml-neg";
  }

  /**
   * Helper: Resolves attendance percentage badge color class relative to active threshold (65% or 75%)
   */
  function getPctBadgeClass(pctVal, threshold = 75) {
    if (pctVal === null || pctVal === undefined || isNaN(pctVal)) return "sp-margin-zero sp-odml-zero";
    const num = parseFloat(pctVal);
    if (num < threshold) return "sp-margin-neg sp-odml-neg";
    if (num === threshold) return "sp-margin-zero sp-odml-zero";
    return "sp-margin-pos sp-odml-pos";
  }

  /**
   * Helper: Resolves colorful badge class for reason tags
   */
  function getTagClass(noteText) {
    if (!noteText) return "sp-odml-tag-custom";
    const t = noteText.trim().toLowerCase();
    if (t.includes("hackathon")) return "sp-odml-tag-hackathon";
    if (t.includes("ideathon")) return "sp-odml-tag-ideathon";
    if (t.includes("workshop")) return "sp-odml-tag-workshop";
    if (t.includes("seminar")) return "sp-odml-tag-seminar";
    if (t.includes("conference")) return "sp-odml-tag-conference";
    if (t.includes("summit")) return "sp-odml-tag-summit";
    if (t.includes("pre placement") || t.includes("ppt")) return "sp-odml-tag-pre-placement";
    if (t.includes("placement")) return "sp-odml-tag-placement-test";
    if (t.includes("internship")) return "sp-odml-tag-internship";
    if (t.includes("interview")) return "sp-odml-tag-interview";
    if (t.includes("medical")) return "sp-odml-tag-medical";
    if (t.includes("club work")) return "sp-odml-tag-club-work";
    if (t.includes("club")) return "sp-odml-tag-club-event-od";
    if (t.includes("fest")) return "sp-odml-tag-fest";
    if (t.includes("event")) return "sp-odml-tag-event";
    return "sp-odml-tag-custom";
  }

  /**
   * Helper: Escapes HTML strings for safe innerHTML injection
   */
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Helper: Intelligently estimates Day Order from weekday cycle relative to known today
   */
  function estimateDayOrderForDate(targetDateStr) {
    if (!targetDateStr) return null;
    const todayStr = getTodayDateString(0);
    const todayDO = parseInt(calendarDateMap[todayStr] || state.dayOrder || "1", 10);
    if (targetDateStr === todayStr) return todayDO;

    const parts = targetDateStr.split("-").map(Number);
    if (parts.length !== 3) return null;
    const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate - todayDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return todayDO;

    let weekdayDiff = 0;
    const step = diffDays > 0 ? 1 : -1;
    let curr = new Date(todayDate);

    for (let i = 0; i !== diffDays; i += step) {
      if (step > 0) curr.setDate(curr.getDate() + 1);
      const dow = curr.getDay(); // 0 = Sun, 6 = Sat
      if (dow !== 0 && dow !== 6) {
        weekdayDiff += step;
      }
      if (step < 0) curr.setDate(curr.getDate() - 1);
    }

    let est = (todayDO - 1 + weekdayDiff) % 5;
    if (est < 0) est += 5;
    return est + 1;
  }

  /**
   * Helper: Parses a raw date string into standard "YYYY-MM-DD"
   * Handles "DD-MM-YYYY", "DD/MM/YYYY", "DD.MM.YYYY", "DD-Mon-YYYY", "DD Mon YYYY", "YYYY-MM-DD"
   */
  function parseDateToYmd(str) {
    if (!str) return null;
    const t = str.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

    // DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
    const mNum = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (mNum) {
      const d = parseInt(mNum[1], 10);
      const m = parseInt(mNum[2], 10);
      let y = parseInt(mNum[3], 10);
      if (y < 100) y += 2000;
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }

    // DD-Mon-YYYY or DD Mon YYYY (e.g. 14-Oct-2024, 14 Oct 2024, 14-October-2024)
    const mWord = t.match(/^(\d{1,2})[\/\-\.\s]+([A-Za-z]{3,9})[\/\-\.\s]+(\d{2,4})$/);
    if (mWord) {
      const d = parseInt(mWord[1], 10);
      const monStr = mWord[2].toLowerCase();
      let y = parseInt(mWord[3], 10);
      if (y < 100) y += 2000;
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const mIdx = months.findIndex((mo) => monStr.startsWith(mo));
      if (mIdx >= 0 && d >= 1 && d <= 31) {
        return `${y}-${String(mIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }

    // Substring match for date embedded in text
    const mSub = t.match(/\b(\d{1,2})[\/\-\.]([A-Za-z]{3,9}|\d{1,2})[\/\-\.](\d{2,4})\b/);
    if (mSub) {
      const d = parseInt(mSub[1], 10);
      let y = parseInt(mSub[3], 10);
      if (y < 100) y += 2000;
      let m = mSub[2];
      let mVal = parseInt(m, 10);
      if (isNaN(mVal)) {
        const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const mIdx = months.findIndex((mo) => monStr.startsWith(mo));
        if (mIdx >= 0) mVal = mIdx + 1;
      }
      if (mVal >= 1 && mVal <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(mVal).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }

    return null;
  }

  /**
   * Helper: Detects column positions for Academic Calendar tables
   * Target Schema: "DATE | DAY | STATUS | WEEK | DAY ORDER | REMARKS"
   */
  function findCalendarColumnIndices(headerCells) {
    let colDate = -1;
    let colDay = -1;
    let colStatus = -1;
    let colWeek = -1;
    let colDayOrder = -1;
    let colRemarks = -1;

    for (let i = 0; i < headerCells.length; i++) {
      const txt = (headerCells[i].textContent || "").trim().toLowerCase();
      if (txt.includes("date")) {
        colDate = i;
      } else if (txt === "day" || txt.includes("day name")) {
        colDay = i;
      } else if (txt.includes("status")) {
        colStatus = i;
      } else if (txt.includes("week")) {
        colWeek = i;
      } else if (txt.includes("day order") || txt === "do" || txt.includes("order")) {
        colDayOrder = i;
      } else if (txt.includes("remark") || txt.includes("event") || txt.includes("reason") || txt.includes("desc")) {
        colRemarks = i;
      }
    }

    if (colDate === -1 && headerCells.length >= 6) colDate = 0;
    if (colDay === -1 && headerCells.length >= 6) colDay = 1;
    if (colStatus === -1 && headerCells.length >= 6) colStatus = 2;
    if (colWeek === -1 && headerCells.length >= 6) colWeek = 3;
    if (colDayOrder === -1 && headerCells.length >= 6) colDayOrder = 4;
    if (colRemarks === -1 && headerCells.length >= 6) colRemarks = 5;

    return { colDate, colDay, colStatus, colWeek, colDayOrder, colRemarks };
  }

  /**
   * Helper: Parses a single row from Academic Calendar table
   * Extracts date, day, status, day order, and holiday reason
   */
  function parseCalendarRowData(cells, cols) {
    if (!cells || cells.length < 2) return null;

    const rawDate = cols.colDate >= 0 && cells[cols.colDate] ? (cells[cols.colDate].textContent || "").trim() : "";
    const rawDay = cols.colDay >= 0 && cells[cols.colDay] ? (cells[cols.colDay].textContent || "").trim() : "";
    const rawStatus = cols.colStatus >= 0 && cells[cols.colStatus] ? (cells[cols.colStatus].textContent || "").trim() : "";
    const rawWeek = cols.colWeek >= 0 && cells[cols.colWeek] ? (cells[cols.colWeek].textContent || "").trim() : "";
    const rawDO = cols.colDayOrder >= 0 && cells[cols.colDayOrder] ? (cells[cols.colDayOrder].textContent || "").trim() : "";
    const rawRemarks = cols.colRemarks >= 0 && cells[cols.colRemarks] ? (cells[cols.colRemarks].textContent || "").trim() : "";

    const normDate = parseDateToYmd(rawDate);
    if (!normDate) return null;

    const mDO = rawDO.match(/[1-5]/);
    const dayOrderNum = mDO ? mDO[0] : null;

    const statusLower = rawStatus.toLowerCase();
    const remarksLower = rawRemarks.toLowerCase();
    const dayLower = rawDay.toLowerCase();

    let isHoliday = false;
    let holidayReason = "";

    if (
      statusLower.includes("holiday") ||
      remarksLower.includes("holiday") ||
      remarksLower.includes("sunday") ||
      dayLower.includes("sun") ||
      rawDO === "-" ||
      rawDO === "0" ||
      (!dayOrderNum && (statusLower || remarksLower))
    ) {
      isHoliday = true;
    }

    if (!dayOrderNum && !statusLower.includes("working")) {
      isHoliday = true;
    }

    if (isHoliday) {
      if (rawRemarks && !/^[-\s]+$/.test(rawRemarks) && !remarksLower.startsWith("regular")) {
        holidayReason = rawRemarks.replace(/^holiday\s*[-–—:]\s*/i, "").trim();
      } else if (dayLower.includes("sun")) {
        holidayReason = "Sunday";
      } else if (rawStatus && !/^[-\s]+$/.test(rawStatus) && !statusLower.includes("working")) {
        holidayReason = rawStatus.replace(/^holiday\s*[-–—:]\s*/i, "").trim();
      } else {
        holidayReason = "Holiday";
      }

      if (!holidayReason || holidayReason.toLowerCase() === "holiday") {
        holidayReason = dayLower.includes("sun") ? "Sunday" : "Holiday";
      }

      holidayReason = holidayReason.charAt(0).toUpperCase() + holidayReason.slice(1);
    }

    return {
      date: normDate,
      dayOrder: isHoliday ? null : dayOrderNum,
      isHoliday,
      holidayReason,
      holidayDisplayText: isHoliday ? `Holiday - ${holidayReason}` : "",
      displayText: isHoliday ? `Holiday - ${holidayReason}` : `Day Order ${dayOrderNum}`,
      status: rawStatus,
      remarks: rawRemarks,
      day: rawDay,
      week: rawWeek,
    };
  }

  /**
   * Helper: Extracts Day Order mappings directly from "ACADEMIC CALENDAR DETAILS" section in current DOM
   * Supports target columns: "DATE | DAY | STATUS | WEEK | DAY ORDER | REMARKS"
   */
  function parseAcademicCalendarFromDom() {
    const candidates = document.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, .card-header, .panel-heading, .header-text, b, strong, font, th, td, div, span, p"
    );
    let calendarContainer = null;
    for (const el of candidates) {
      if (el.closest("#sp-odml-top-container, .sp-odml-global-tooltip")) continue;
      const txt = (el.textContent || "").trim().toUpperCase();
      if (txt.includes("ACADEMIC CALENDAR DETAILS") || txt.includes("ACADEMIC CALENDER DETAILS")) {
        calendarContainer =
          el.closest(".card, .panel, table, div.container, #divMainDetails, tbody") ||
          el.parentElement?.closest(".card, .panel, table, div.container") ||
          el.parentElement;

        if (calendarContainer && calendarContainer.querySelectorAll("tr").length === 0) {
          const siblingTable =
            calendarContainer.querySelector("table") ||
            calendarContainer.nextElementSibling?.querySelector?.("table") ||
            calendarContainer.parentElement?.querySelector("table") ||
            (calendarContainer.nextElementSibling?.tagName === "TABLE" ? calendarContainer.nextElementSibling : null);
          if (siblingTable) calendarContainer = siblingTable;
        }
        break;
      }
    }

    let targetTable = null;
    if (calendarContainer) {
      targetTable = calendarContainer.tagName === "TABLE" ? calendarContainer : calendarContainer.querySelector("table");
    }

    if (!targetTable) {
      const allTables = document.querySelectorAll("table");
      for (const t of allTables) {
        if (t.closest("#sp-odml-top-container, .sp-odml-global-tooltip, #tt-panel")) continue;
        const head = t.querySelector("thead tr, tr:first-child");
        if (head) {
          const headTxt = (head.textContent || "").toUpperCase();
          if (headTxt.includes("DATE") && (headTxt.includes("DAY ORDER") || headTxt.includes("STATUS") || headTxt.includes("REMARKS"))) {
            targetTable = t;
            break;
          }
        }
      }
    }

    if (!targetTable) return false;

    const rows = targetTable.querySelectorAll("tr");
    if (rows.length < 2) return false;

    const headRow = targetTable.querySelector("thead tr") || rows[0];
    const cols = findCalendarColumnIndices(headRow.querySelectorAll("th, td"));

    let foundAny = false;
    const startIdx = headRow === rows[0] ? 1 : 0;

    for (let r = startIdx; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll("td, th");
      const parsed = parseCalendarRowData(cells, cols);
      if (parsed && parsed.date) {
        calendarDateMap[parsed.date] = parsed;
        const [yr, mo, da] = parsed.date.split("-");
        calendarDateMap[`${da}-${mo}-${yr}`] = parsed;
        calendarDateMap[`${da}/${mo}/${yr}`] = parsed;
        foundAny = true;
      }
    }

    return foundAny;
  }

  /**
   * Helper: Robust parser for Academic Calendar / Planner JSP responses
   * Target Schema: "DATE | DAY | STATUS | WEEK | DAY ORDER | REMARKS"
   */
  function parseCalendarResponse(html) {
    if (!html) return;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");

    tables.forEach((table) => {
      const rows = table.querySelectorAll("tr");
      if (rows.length < 2) return;

      const headRow = table.querySelector("thead tr") || rows[0];
      const cols = findCalendarColumnIndices(headRow.querySelectorAll("th, td"));

      const startIdx = headRow === rows[0] ? 1 : 0;
      for (let r = startIdx; r < rows.length; r++) {
        const cells = rows[r].querySelectorAll("td, th");
        const parsed = parseCalendarRowData(cells, cols);
        if (parsed && parsed.date) {
          calendarDateMap[parsed.date] = parsed;
          const [yr, mo, da] = parsed.date.split("-");
          calendarDateMap[`${da}-${mo}-${yr}`] = parsed;
          calendarDateMap[`${da}/${mo}/${yr}`] = parsed;
        }
      }
    });

    const mDirect = html.match(/[Dd]ay\s*[Oo]rder\s*[:\-]?\s*([1-5])/i);
    if (mDirect && mDirect[1]) {
      const todayStr = getTodayDateString(0);
      if (!calendarDateMap[todayStr]) {
        calendarDateMap[todayStr] = {
          date: todayStr,
          dayOrder: mDirect[1],
          isHoliday: false,
          holidayReason: "",
          holidayDisplayText: "",
          displayText: `Day Order ${mDirect[1]}`,
        };
      }
    }
  }

  /**
   * Helper: Retrieves Day Order and Holiday information for any requested date
   * Returns: { date, dayOrder (1-5 or null), isHoliday, holidayReason, holidayDisplayText, displayText }
   */
  function getCalendarEntryForDate(targetDateStr) {
    if (!targetDateStr) targetDateStr = getTodayDateString(0);
    const normDate = parseDateToYmd(targetDateStr) || targetDateStr;

    let entry = calendarDateMap[normDate] || calendarDateMap[targetDateStr];
    if (entry) {
      if (typeof entry === "object") return entry;
      if (typeof entry === "string") {
        if (entry.toLowerCase().includes("holiday")) {
          const reason = entry.replace(/^holiday\s*[-–—:]\s*/i, "").trim() || "Holiday";
          return {
            date: normDate,
            dayOrder: null,
            isHoliday: true,
            holidayReason: reason,
            holidayDisplayText: `Holiday - ${reason}`,
            displayText: `Holiday - ${reason}`,
          };
        }
        return {
          date: normDate,
          dayOrder: entry,
          isHoliday: false,
          holidayReason: "",
          holidayDisplayText: "",
          displayText: `Day Order ${entry}`,
        };
      }
    }

    // Check if Sunday
    const parts = normDate.split("-").map(Number);
    if (parts.length === 3) {
      const dObj = new Date(parts[0], parts[1] - 1, parts[2]);
      if (dObj.getDay() === 0) {
        return {
          date: normDate,
          dayOrder: null,
          isHoliday: true,
          holidayReason: "Sunday",
          holidayDisplayText: "Holiday - Sunday",
          displayText: "Holiday - Sunday",
        };
      }
    }

    // Weekday estimate fallback
    const est = estimateDayOrderForDate(normDate);
    return {
      date: normDate,
      dayOrder: String(est || "1"),
      isHoliday: false,
      holidayReason: "",
      holidayDisplayText: "",
      displayText: `Day Order ${est || "1"}`,
    };
  }

  /**
   * Helper: Scans portal DOM for Day Order, strictly excluding our own components
   */
  function getPortalDomDayOrder() {
    if (parseAcademicCalendarFromDom()) {
      const todayStr = getTodayDateString(0);
      const entry = getCalendarEntryForDate(todayStr);
      if (entry && !entry.isHoliday && entry.dayOrder) return entry.dayOrder;
    }

    const highlightElements = document.querySelectorAll(
      'span.highlight strong font[color="yellow"], font[color="yellow"], .highlight strong, span.highlight'
    );
    for (const el of highlightElements) {
      if (el.closest("#sp-odml-top-container, .sp-odml-global-tooltip")) continue;
      const t = (el.textContent || "").trim();
      const m = t.match(/[Dd]ay\s*[Oo]rder\s*[:\-]?\s*([1-5])/i) || t.match(/\b([1-5])\b/);
      if (m && m[1]) return m[1];
    }

    const mainHeader = document.querySelector("#divMainDetails, .header-text, .page-header");
    if (mainHeader) {
      const walker = document.createTreeWalker(mainHeader, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          if (node.parentElement && node.parentElement.closest("#sp-odml-top-container, .sp-odml-global-tooltip")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let currentNode;
      while ((currentNode = walker.nextNode())) {
        const txt = currentNode.nodeValue || "";
        const m = txt.match(/[Dd]ay\s*[Oo]rder\s*[:\-]?\s*([1-5])/i);
        if (m && m[1]) return m[1];
      }
    }
    return null;
  }

  /**
   * Strict verification that the active page is Attendance Details only
   * Rejects immediately if Timetable, Exam, Internals or any non-attendance page is active.
   */
  function isAttendancePageActive() {
    const url = (window.location.href || "").toLowerCase();
    const hash = (window.location.hash || "").toLowerCase();

    // 1. Strict Negative Check: Timetable active
    if (
      url.includes("timetable") ||
      hash.includes("timetable") ||
      document.getElementById("divTimetable") ||
      document.querySelector(".tt-timetable-wrapper") ||
      document.querySelector(".sp-timetable-container") ||
      document.getElementById("sp-timetable-portal-wrapper")
    ) {
      return false;
    }

    // 2. Strict Negative Check: Exam or Internals active
    if (
      url.includes("exam") ||
      hash.includes("exam") ||
      document.getElementById("txtExamMonthYear") ||
      document.getElementById("divExamTimetable") ||
      document.getElementById("divExamSchedule") ||
      document.getElementById("divInternalsDetails")
    ) {
      return false;
    }

    // 3. Strict Check of #divMainDetails content
    const mainDetails = document.getElementById("divMainDetails");
    if (mainDetails) {
      const text = (mainDetails.innerText || "").toLowerCase();
      if (
        (text.includes("time") && text.includes("table")) ||
        text.includes("timetable") ||
        text.includes("exam schedule") ||
        text.includes("examination")
      ) {
        return false;
      }
    }

    // 4. Positive check: Must have true attendance table
    const table = findAttendanceTable();
    if (!table) return false;

    // Check table headers: Ensure it's not a timetable table
    const thead = table.querySelector("thead tr") || table.querySelector("tr:first-child");
    if (thead) {
      const headText = (thead.innerText || "").toLowerCase();
      if (
        headText.includes("hour 1") ||
        headText.includes("day order") ||
        headText.includes("hour/day order") ||
        headText.includes("slot")
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Strictly finds ONLY the Attendance Table on Student Portal
   */
  function findAttendanceTable() {
    const direct = document.querySelector(
      "#divMainDetails > div.container.mt-4 > div.card.mb-4 > div.card-body.p-0 > div > table"
    );
    if (direct && isAttendanceHeader(direct)) return direct;

    const inDiv = document.querySelector("#divMainDetails table");
    if (inDiv && isAttendanceHeader(inDiv)) return inDiv;

    const allTables = document.querySelectorAll("table");
    for (const tbl of allTables) {
      // Ignore any internal tables or timetable portal wrapper
      if (tbl.closest("#tt-panel, #sp-timetable-portal-wrapper, #sp-odml-top-container")) continue;
      if (isAttendanceHeader(tbl)) return tbl;
    }
    return null;
  }

  function isAttendanceHeader(tbl) {
    if (!tbl) return false;
    if (tbl.closest("#tt-panel, #sp-timetable-portal-wrapper, #sp-odml-top-container")) return false;

    const head = tbl.querySelector("thead tr") || tbl.querySelector("tr:first-child");
    if (!head) return false;
    const text = (head.innerText || "").toLowerCase();

    // Must not be a timetable table
    if (text.includes("hour 1") || text.includes("day order") || text.includes("slot")) {
      return false;
    }

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
   * Resolves active threshold for OD/ML Tracker.
   * STRICT USER RULE: OD/ML is strictly and exclusively 75% only.
   * Never changes for 65% (do not change OD/ML margin for 65%).
   */
  function detectActiveThreshold() {
    return 75;
  }

  /**
   * Safely parse enrolled subject rows from the active Attendance Table
   * Strictly extracts CODE and FULL NAME for format: "CODE - FULL NAME"
   */
  function extractSubjectsFromTable(table) {
    if (!table) return [];
    const tbodyRows = table.querySelectorAll("tbody tr");
    const subjects = [];

    const cleanNum = (str) => {
      if (!str) return NaN;
      const t = str.trim();
      if (/^[-–—]$/.test(t)) return 0;
      const m = t.match(/^-?\d+(\.\d+)?%?$/) || t.match(/-?\d+(\.\d+)?/);
      return m ? parseFloat(m[0]) : NaN;
    };

    const theadRow = table.querySelector("thead tr") || table.querySelector("tr:first-child");
    let maxIdx = -1;
    let attIdx = -1;
    let absIdx = -1;
    let pctIdx = -1;

    if (theadRow) {
      const cells = theadRow.children;
      for (let i = 0; i < cells.length; i++) {
        if (
          cells[i].classList?.contains("sp-attendance-header") ||
          cells[i].classList?.contains("sp-odml-col-header")
        ) {
          continue;
        }
        const txt = (cells[i].innerText || cells[i].textContent || "").trim().toLowerCase();
        if (txt.includes("margin")) continue;
        if (txt.includes("max") || txt.includes("conducted")) maxIdx = i;
        else if (txt.includes("att") || txt.includes("present")) attIdx = i;
        else if (txt.includes("absent")) absIdx = i;
        else if (txt.includes("percent") || txt.includes("%")) pctIdx = i;
      }
    }

    if (maxIdx === -1) maxIdx = 2;
    if (attIdx === -1) attIdx = 3;
    if (absIdx === -1) absIdx = 4;
    if (pctIdx === -1) pctIdx = 5;

    for (let i = 0; i < tbodyRows.length; i++) {
      const row = tbodyRows[i];
      const cell0 = row.cells[0];
      if (!cell0) continue;

      // Strictly inspect only the first 2 cells for "total", avoiding false-positives from injected OD/ML "Total %" cells
      const cell0Text = (cell0.innerText || cell0.textContent || "").trim().toLowerCase();
      const cell1Text = (row.cells[1]?.innerText || row.cells[1]?.textContent || "").trim().toLowerCase();
      const hasCodeBadge = !!cell0.querySelector(".sp-code-badge");
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

      if (isTotalRow) {
        continue;
      }

      let code = "";
      let fullName = "";

      // 1. Check if sp_attendence.js already wrapped with .sp-code-badge and .sp-title-text
      const codeBadge = cell0.querySelector(".sp-code-badge");
      const titleSpan = cell0.querySelector(".sp-title-text");

      if (codeBadge && titleSpan) {
        code = (codeBadge.textContent || "").trim();
        fullName = (titleSpan.textContent || "").trim();
      } else {
        // 2. Parse raw cell0 text or HTML with <br> or newline
        const rawText = (cell0.innerText || cell0.textContent || "").trim();
        const lines = rawText.split(/\n|<br\s*\/?>/i).map((s) => s.trim()).filter(Boolean);

        if (lines.length >= 2) {
          const isStrictCode0 = !/\s/.test(lines[0]) && /^[A-Z0-9\-_]{5,15}$/i.test(lines[0]);
          const isStrictCode1 = !/\s/.test(lines[1]) && /^[A-Z0-9\-_]{5,15}$/i.test(lines[1]);
          if (isStrictCode0 && !isStrictCode1) {
            code = lines[0];
            fullName = lines[1];
          } else if (isStrictCode1 && !isStrictCode0) {
            code = lines[1];
            fullName = lines[0];
          } else if (!/\s/.test(lines[0]) && /\s/.test(lines[1])) {
            code = lines[0];
            fullName = lines[1];
          } else if (/\s/.test(lines[0]) && !/\s/.test(lines[1])) {
            code = lines[1];
            fullName = lines[0];
          } else {
            code = lines[0];
            fullName = lines[1];
          }
        } else if (lines.length === 1) {
          const m = lines[0].match(/^([A-Z0-9\-_]{5,15})\s*[\-–—:]\s*(.+)$/i);
          if (m) {
            code = m[1].trim();
            fullName = m[2].trim();
          } else {
            const cell1 = row.cells[1];
            const text1 = cell1 ? (cell1.innerText || cell1.textContent || "").trim() : "";
            if (text1 && !/^\d+$/.test(text1) && !text1.includes("%")) {
              code = lines[0];
              fullName = text1;
            } else {
              code = lines[0];
              fullName = lines[0];
            }
          }
        }
      }

      // Inversion & Sanitation Guard
      if (code && fullName) {
        if (/\s/.test(code) && !/\s/.test(fullName) && /^[A-Z0-9\-_]{5,15}$/i.test(fullName)) {
          const tmp = code;
          code = fullName;
          fullName = tmp;
        }
        if (code && fullName.toUpperCase().startsWith(code.toUpperCase())) {
          fullName = fullName.substring(code.length).replace(/^[\s\-–—:]+/, "").trim();
        }
      }

      if (!code) continue;

      let conducted = NaN;
      let attended = NaN;
      let absent = NaN;
      let pct = NaN;

      if (maxIdx >= 0 && row.cells[maxIdx]) conducted = cleanNum(row.cells[maxIdx].textContent);
      if (attIdx >= 0 && row.cells[attIdx]) attended = cleanNum(row.cells[attIdx].textContent);
      if (absIdx >= 0 && row.cells[absIdx]) absent = cleanNum(row.cells[absIdx].textContent);
      if (pctIdx >= 0 && row.cells[pctIdx]) pct = cleanNum(row.cells[pctIdx].textContent);

      // Fallback for rowspans
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
        if (isNaN(attended) && !isNaN(absent)) attended = Math.max(0, conducted - absent);
        if (isNaN(absent) && !isNaN(attended)) absent = Math.max(0, conducted - attended);
        if (isNaN(attended) && isNaN(absent) && !isNaN(pct)) {
          attended = Math.round((pct / 100) * conducted);
          absent = Math.max(0, conducted - attended);
        }
      }

      const origMargin = calculateManual75Margin(conducted, attended);
      const displayName = formatSubjectDisplayName(code, fullName);

      subjects.push({
        code,
        fullName: fullName || code,
        displayName,
        conducted: isNaN(conducted) ? 0 : conducted,
        attended: isNaN(attended) ? 0 : attended,
        absent: isNaN(absent) ? 0 : absent,
        pct: conducted > 0 ? ((attended / conducted) * 100).toFixed(1) : "0.0",
        origMargin,
        rowEl: row,
      });
    }

    // Auto-save fresh 75% baseline whenever table is read and not in 65% mode
    if (subjects.length > 0 && !table.classList.contains("sp-table-thresh-65")) {
      save75BaselineData(subjects, table);
    }

    return subjects;
  }

  /**
   * Saves 75% attendance and margin data in local storage.
   * STRICT USER RULE: Whenever 75% is active or page refreshes, save that data in local.
   * When clicked on margin 65%, do not change OD/ML margin (OD/ML is strictly for 75%).
   */
  function save75BaselineData(subjects, table) {
    if (!subjects || subjects.length === 0) return;
    try {
      const totConducted = subjects.reduce((sum, s) => sum + s.conducted, 0);
      const totAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
      if (totConducted <= 0 || isNaN(totConducted)) return;

      const payload = {
        timestamp: Date.now(),
        threshold: 75,
        total: {
          conducted: totConducted,
          attended: totAttended,
          pct: totConducted > 0 ? ((totAttended / totConducted) * 100).toFixed(1) : "0.0",
          origMargin: calculateManual75Margin(totConducted, totAttended),
        },
        subjects: subjects.map((s) => ({
          code: s.code,
          fullName: s.fullName,
          displayName: s.displayName,
          conducted: s.conducted,
          attended: s.attended,
          absent: s.absent,
          pct: s.pct,
          origMargin: calculateManual75Margin(s.conducted, s.attended),
        })),
      };

      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [STORAGE_KEY_75_BASELINE]: payload });
      }
      localStorage.setItem(STORAGE_KEY_75_BASELINE, JSON.stringify(payload));
      state.saved75Baseline = payload;
    } catch (_) {}
  }

  function load75BaselineData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_75_BASELINE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (Array.isArray(parsed.subjects) || parsed.total)) {
          state.saved75Baseline = parsed;
        }
      }
    } catch (_) {}

    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([STORAGE_KEY_75_BASELINE], (res) => {
          if (res && res[STORAGE_KEY_75_BASELINE]) {
            state.saved75Baseline = res[STORAGE_KEY_75_BASELINE];
          }
        });
      }
    } catch (_) {}
  }

  /**
   * Load stored records and settings
   */
  async function loadStoredData() {
    load75BaselineData();
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([STORAGE_KEY_RECORDS, STORAGE_KEY_SETTINGS, STORAGE_KEY_75_BASELINE], (res) => {
          if (res && res[STORAGE_KEY_75_BASELINE] && Array.isArray(res[STORAGE_KEY_75_BASELINE].subjects)) {
            state.saved75Baseline = res[STORAGE_KEY_75_BASELINE];
          }
          if (res && res[STORAGE_KEY_RECORDS] && Array.isArray(res[STORAGE_KEY_RECORDS])) {
            state.records = res[STORAGE_KEY_RECORDS];
          } else {
            fallbackLocalReadRecords();
          }
          if (res && res[STORAGE_KEY_SETTINGS]) {
            const s = res[STORAGE_KEY_SETTINGS];
            // Section & View OD/ML column always start cleanly collapsed/hidden on load or tab refresh
            state.isHeaderExpanded = false;
            state.isMarginColumnExpanded = false;
            if (s.customSubjects && Array.isArray(s.customSubjects)) state.customSubjects = s.customSubjects;
            if (s.personalNote !== undefined) state.personalNote = s.personalNote;
            if (s.calendarDateMap) calendarDateMap = s.calendarDateMap;
          } else {
            fallbackLocalReadSettings();
          }
          updateTopHeaderContents();
          enhanceMarginCellsWithOdMl();
        });
      } else {
        fallbackLocalReadRecords();
        fallbackLocalReadSettings();
        updateTopHeaderContents();
        enhanceMarginCellsWithOdMl();
      }
    } catch (_) {
      fallbackLocalReadRecords();
      fallbackLocalReadSettings();
      updateTopHeaderContents();
      enhanceMarginCellsWithOdMl();
    }
  }

  function fallbackLocalReadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) state.records = parsed;
      }
    } catch (_) {}
  }

  function fallbackLocalReadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (raw) {
        const s = JSON.parse(raw);
        // Section & View OD/ML column always start cleanly collapsed/hidden on load or tab refresh
        state.isHeaderExpanded = false;
        state.isMarginColumnExpanded = false;
        if (s.customSubjects && Array.isArray(s.customSubjects)) state.customSubjects = s.customSubjects;
        if (s.personalNote !== undefined) state.personalNote = s.personalNote;
        if (s.calendarDateMap) calendarDateMap = s.calendarDateMap;
      }
    } catch (_) {}
  }

  /**
   * Persist state to storage
   */
  function saveStoredData() {
    const payloadRecords = state.records;
    const payloadSettings = {
      isHeaderExpanded: state.isHeaderExpanded,
      isMarginColumnExpanded: state.isMarginColumnExpanded,
      customSubjects: state.customSubjects || [],
      personalNote: state.personalNote || "",
      calendarDateMap,
    };

    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          [STORAGE_KEY_RECORDS]: payloadRecords,
          [STORAGE_KEY_SETTINGS]: payloadSettings,
        });
      }
    } catch (_) {}

    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(payloadRecords));
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(payloadSettings));
    } catch (_) {}
  }

  /**
   * Helper: Parses clean integer/float number from text content
   */
  function cleanNum(str) {
    if (!str && str !== 0) return NaN;
    const t = String(str).trim();
    if (/^[-–—]$/.test(t)) return 0;
    const m = t.match(/^-?\d+(\.\d+)?%?$/) || t.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  }

  /**
   * Recalculates exact 75% attendance margin manually and deterministically.
   * STRICT USER RULE: Exclusively for 75% threshold only. Never for 65%.
   */
  function calculateManual75Margin(conducted, attended) {
    const cond = cleanNum(conducted);
    const att = cleanNum(attended);
    if (isNaN(cond) || isNaN(att) || cond <= 0 || att < 0) return 0;
    return computeAttendanceMargin(cond, att, 75);
  }

  /**
   * SRM Margin Calculation logic
   */
  function computeAttendanceMargin(conducted, attended, threshold = 75) {
    if (isNaN(conducted) || isNaN(attended) || conducted < 0 || attended < 0) return null;
    if (conducted === 0) return 0;

    const currentPct = (attended / conducted) * 100;
    if (currentPct >= threshold) {
      let margin = 0;
      let curr = currentPct;
      let cond = conducted;
      while (curr >= threshold) {
        cond++;
        margin++;
        curr = (attended / cond) * 100;
      }
      return margin - 1;
    } else {
      let margin = 0;
      let curr = currentPct;
      let cond = conducted;
      let att = attended;
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
   * Computes Total OD / ML hours logged for a specific course code
   */
  function getTotalOdHoursForSubject(subjectCode) {
    if (!subjectCode) return 0;
    return state.records
      .filter((r) => r.subjectCode === subjectCode)
      .reduce((sum, r) => sum + (parseInt(r.hours, 10) || 0), 0);
  }

  /**
   * Export all OD/ML records as a structured JSON backup
   */
  function exportToJson() {
    const data = {
      app: "Academia Prime - OD & ML Attendance Tracker",
      version: "1.4.5",
      exportDate: new Date().toISOString(),
      threshold: state.currentThreshold,
      totalRecords: state.records.length,
      records: state.records,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OD_ML_Tracker_Backup_${getTodayDateString(0)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
  }

  /**
   * Import OD/ML records from a user-supplied JSON backup file
   */
  function handleJsonImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        let incoming = [];
        if (Array.isArray(parsed)) {
          incoming = parsed;
        } else if (parsed && Array.isArray(parsed.records)) {
          incoming = parsed.records;
        } else {
          alert("Invalid file format. Please upload a valid OD/ML JSON export.");
          return;
        }

        const valid = incoming.filter((r) => r && r.subjectCode && (r.hours || r.type));
        if (valid.length === 0) {
          alert("No valid OD/ML records found in the JSON file.");
          return;
        }

        const existingIds = new Set(state.records.map((r) => r.id));
        let addedCount = 0;
        valid.forEach((r) => {
          if (!r.id) {
            r.id = "odml_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
          }
          if (!existingIds.has(r.id)) {
            state.records.push(r);
            existingIds.add(r.id);
            addedCount++;
          }
        });

        saveStoredData();
        const container = document.getElementById("sp-odml-top-container");
        if (container) updateTopHeaderContents(container);
        enhanceMarginCellsWithOdMl();
        alert(`Successfully imported ${addedCount} OD/ML record(s)!`);
      } catch (err) {
        alert("Error parsing JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  /**
   * Helper: Draw rounded rectangle path on canvas
   */
  function drawCanvasRoundRect(ctx, x, y, w, h, r, fillColor, strokeColor, lineWidth = 1) {
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    }
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Helper: Draw themed badge box with text on canvas and return width (Light theme palette)
   */
  function drawCanvasBadge(ctx, text, x, y, type = "neutral", fontSize = 10) {
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const textWidth = ctx.measureText(text).width;
    const paddingX = 7;
    const h = fontSize + 9;
    const w = textWidth + paddingX * 2;

    let fill = "#f1f5f9";
    let stroke = "#cbd5e1";
    let textColor = "#334155";

    if (type === "pos") {
      fill = "#dcfce7";
      stroke = "#86efac";
      textColor = "#15803d";
    } else if (type === "zero") {
      fill = "#ffedd5";
      stroke = "#fdba74";
      textColor = "#9a3412";
    } else if (type === "neg") {
      fill = "#fee2e2";
      stroke = "#fca5a5";
      textColor = "#b91c1c";
    } else if (type === "indigo" || type === "od") {
      fill = "#e8ecf5";
      stroke = "#b8c2d9";
      textColor = "#0d1938";
    } else if (type === "ml") {
      fill = "#e0f2fe";
      stroke = "#bae6fd";
      textColor = "#0d1938";
    } else if (type === "terminal-date") {
      fill = "#f1f5f9";
      stroke = "#cbd5e1";
      textColor = "#475569";
    }

    drawCanvasRoundRect(ctx, x, y, w, h, 4, fill, stroke, 1);
    ctx.fillStyle = textColor;
    ctx.fillText(text, x + paddingX, y + h - Math.floor((h - fontSize) / 2) - 1);
    return w;
  }

  /**
   * Helper: Draw top-rounded rectangle for Mac / Linux title bar
   */
  function drawCanvasMacTitlebar(ctx, x, y, w, h, r, fillColor, strokeColor) {
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, [r, r, 0, 0]);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    }
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Helper: Draw shiny window control buttons (Red, Yellow, Green with specular gloss)
   */
  function drawShinyWindowControls(ctx, startX, centerY, dotRadius = 5, spacing = 17) {
    const controls = [
      { base: "#ff5f56", glow: "rgba(255, 95, 86, 0.3)" }, // Red (Close)
      { base: "#ffbd2e", glow: "rgba(255, 189, 46, 0.3)" }, // Yellow (Minimize)
      { base: "#27c93f", glow: "rgba(39, 201, 63, 0.3)" },  // Green (Maximize)
    ];

    controls.forEach((c, idx) => {
      const cx = startX + idx * spacing;
      // Soft glow
      ctx.save();
      ctx.shadowColor = c.glow;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(cx, centerY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = c.base;
      ctx.fill();
      ctx.restore();

      // Specular glossy reflection shine
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx - dotRadius * 0.28, centerY - dotRadius * 0.28, dotRadius * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
      ctx.fill();
      ctx.restore();

      // Crisp rim outline
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, centerY, dotRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    });
  }

  // Aliases for backward compatibility
  const drawShinyTerminalControls = drawShinyWindowControls;
  const drawOutlineWindowControls = drawShinyWindowControls;
  const drawMacTrafficLights = drawShinyWindowControls;

  /**
   * Comprehensive extraction of student profile details from any DOM document
   * Handles tables, definition lists, bootstrap grids, explicit IDs, and full-text regex.
   */
  function extractProfileFromDoc(doc) {
    if (!doc) return {};
    const profile = {};

    function cleanVal(str) {
      if (!str) return "";
      return str
        .replace(/^[:\s\-–—|]+/, "")
        .replace(/[:\s\-–—|]+$/, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function cleanPersonName(val) {
      let v = cleanVal(val);
      // Remove trailing labels like "Academic Advisor", "Email", "Phone" if text bled across cells
      v = v.split(/(?:\r?\n|\t|\s{3,}|(?:Academic|Faculty)\s*Advisor|Phone|Mobile|Email\s*:)/i)[0];
      return cleanVal(v);
    }

    function assignField(lblText, valText) {
      const l = (lblText || "").trim().toLowerCase().replace(/[:\s\-–—]+$/, "");
      const v = cleanVal(valText);
      if (!v || v.length < 2) return;
      if (/^(student|register|email|institution|faculty|academic|advisor|name|id|date|phone)/i.test(v) && v.endsWith(":")) return;

      // 1. Student Name
      if (!profile.studentName && (
        l === "student name" || l === "name" || l === "student's name" ||
        l === "candidate name" || l === "name of student" || l.includes("student name") ||
        l === "name of candidate"
      )) {
        if (!v.includes("@") && !/\d{5}/.test(v) && v.length < 60) {
          profile.studentName = cleanPersonName(v);
        }
      }
      // 2. Student ID / NetID
      else if (!profile.studentId && (
        l === "student id" || l === "net id" || l === "netid" ||
        l === "user id" || l.includes("student id") || l === "student id / net id" ||
        l === "student net id" || l === "candidate id"
      )) {
        profile.studentId = v.split(/\s+/)[0];
      }
      // 3. Register Number
      else if (!profile.registerNo && (
        l === "register no" || l === "register no." || l === "registration no" ||
        l === "registration no." || l === "reg. no" || l === "reg no" ||
        l === "reg. no." || l.includes("register no") || l.includes("registration no") ||
        l === "reg number" || l === "register number"
      )) {
        const m = v.match(/\b(RA\d{13,15}|AP\d{13,15}|SRM\d{10,15}|[A-Z0-9]{10,20})\b/i);
        profile.registerNo = m ? m[1].toUpperCase() : v.toUpperCase();
      }
      // 4. Email ID
      else if (!profile.emailId && (
        l === "email id" || l === "email" || l === "email id." ||
        l === "official email" || l === "official email id" || l.includes("email") ||
        l === "student email" || l === "official email address"
      )) {
        const m = v.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
        if (m) profile.emailId = m[1].toLowerCase();
      }
      // 5. Institution / Campus
      else if (!profile.institution && (
        l === "institution" || l === "institute" || l === "college" ||
        l === "campus" || l.includes("institution") || l === "faculty / school" ||
        l === "department / institution" || l === "faculty" || l === "school" ||
        l === "college / campus"
      )) {
        if (!v.toLowerCase().includes("advisor") && v.length < 120) {
          profile.institution = v;
        }
      }
      // 6. Faculty Advisor
      else if (!profile.facultyAdvisor && (
        l.includes("faculty advisor") || l === "fa name" || l === "fa" ||
        l.includes("advisor (faculty)") || l === "faculty mentor" ||
        l.startsWith("faculty advisor") || l === "name of faculty advisor" ||
        l === "faculty advisor(fa)"
      )) {
        profile.facultyAdvisor = cleanPersonName(v);
      }
      // 7. Academic Advisor
      else if (!profile.academicAdvisor && (
        l.includes("academic advisor") || l === "aa name" || l === "aa" ||
        l.includes("advisor (academic)") || l === "academic mentor" ||
        l.startsWith("academic advisor") || l === "name of academic advisor" ||
        l === "academic advisor(aa)" || l === "program coordinator"
      )) {
        profile.academicAdvisor = cleanPersonName(v);
      }
    }

    // 1. Table cell parsing (supports 2-col, 3-col with colon, 4-col, 6-col, etc.)
    const allTables = doc.querySelectorAll("table");
    allTables.forEach((table) => {
      const rows = table.querySelectorAll("tr");
      rows.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th, td"));
        for (let i = 0; i < cells.length; i++) {
          const txt = (cells[i].textContent || "").trim();
          if (!txt) continue;

          // Check if next cell is a separator colon ":" or "-"
          if (cells[i + 1]) {
            const nextTxt = (cells[i + 1].textContent || "").trim();
            if ((nextTxt === ":" || nextTxt === "-" || nextTxt === "–" || nextTxt === "—") && cells[i + 2]) {
              assignField(txt, cells[i + 2].textContent);
            } else {
              assignField(txt, nextTxt);
            }
          }

          // Check single cell formatted like "Label : Value"
          if (txt.includes(":")) {
            const idx = txt.indexOf(":");
            assignField(txt.substring(0, idx), txt.substring(idx + 1));
          }
        }
      });
    });

    // 2. Definition Lists (<dl><dt>Label</dt><dd>Value</dd></dl>)
    const dts = doc.querySelectorAll("dt");
    dts.forEach((dt) => {
      const lbl = (dt.textContent || "").trim();
      const dd = dt.nextElementSibling && dt.nextElementSibling.tagName === "DD" ? dt.nextElementSibling : null;
      if (lbl && dd) {
        assignField(lbl, dd.textContent);
      }
    });

    // 3. Grid Columns & Form Groups (Bootstrap 3/4/5, AdminLTE)
    const gridRows = doc.querySelectorAll(".row, .form-group, .profile-info-row, .d-flex");
    gridRows.forEach((row) => {
      const cols = Array.from(row.children).filter((c) => c.textContent && c.textContent.trim());
      if (cols.length >= 2) {
        assignField(cols[0].textContent, cols[1].textContent);
        if (cols.length >= 4) {
          assignField(cols[2].textContent, cols[3].textContent);
        }
      }
    });

    // 4. Bold / label elements followed by text, badges, or sibling elements
    const labels = doc.querySelectorAll("b, strong, label, .label, [class*='label'], dt, small, font, th, .text-muted");
    labels.forEach((el) => {
      const lbl = (el.textContent || "").trim();
      let val = "";
      if (el.nextElementSibling) {
        val = el.nextElementSibling.textContent;
      } else if (el.nextSibling && el.nextSibling.nodeType === Node.TEXT_NODE) {
        val = el.nextSibling.nodeValue;
      } else if (el.parentElement) {
        const pText = el.parentElement.textContent || "";
        if (pText.includes(lbl)) {
          val = pText.substring(pText.indexOf(lbl) + lbl.length);
        }
      }
      assignField(lbl, val);
    });

    // 5. Explicit IDs and Classes used in SRM Student Portal / Academia
    const idMap = {
      studentName: [
        "#lblStudentName", "#spnStudentName", "#studentName", ".student-name",
        "#userName", ".user-name", ".profile-name", "#lblCandidateName", ".navbar_user_name",
        "#name", "#spnName", ".student_name"
      ],
      studentId: [
        "#lblStudentID", "#lblStudentId", "#spnStudentId", "#studentId", "#netId",
        "#lblNetID", "#lblNetId", "#netid", "#userId", ".net-id"
      ],
      registerNo: [
        "#lblRegisterNo", "#lblRegNo", "#spnRegisterNo", "#regNo", "#lblRegistrationNo",
        "#registrationNo", "#txtRegNo", ".reg-no", "#spnRegNo"
      ],
      emailId: [
        "#lblEmail", "#lblEmailID", "#lblEmailId", "#spnEmail", "#studentEmail",
        "#email", "#officialEmail", ".student-email"
      ],
      institution: [
        "#lblInstitution", "#lblCollege", "#lblCampus", "#lblDepartment", "#institution",
        "#campus", "#lblFaculty", "#facultySchool", ".institution-name"
      ],
      facultyAdvisor: [
        "#lblFacultyAdvisor", "#lblFA", "#spnFacultyAdvisor", "#facultyAdvisor",
        "#advisorFaculty", "#lblFAName", "#spnFAName", "#faName", ".faculty-advisor"
      ],
      academicAdvisor: [
        "#lblAcademicAdvisor", "#lblAA", "#spnAcademicAdvisor", "#academicAdvisor",
        "#advisorAcademic", "#lblAAName", "#spnAAName", "#aaName", ".academic-advisor"
      ],
    };

    for (const [key, selectors] of Object.entries(idMap)) {
      if (!profile[key]) {
        for (const sel of selectors) {
          const el = doc.querySelector(sel);
          if (el && el.textContent.trim()) {
            const v = cleanVal(el.textContent);
            if (v && !v.includes(":") && v.length > 1) {
              profile[key] = key === "studentName" || key === "facultyAdvisor" || key === "academicAdvisor"
                ? cleanPersonName(v)
                : v;
              break;
            }
          }
        }
      }
    }

    // 6. Comprehensive Regex Scans across Body Text
    const bodyText = (doc.body ? doc.body.innerText : "") || doc.textContent || "";
    if (bodyText) {
      // Register No
      if (!profile.registerNo) {
        const mReg = bodyText.match(/\b(RA\d{13,15}|AP\d{13,15}|SRM\d{10,15})\b/i) ||
                     bodyText.match(/(?:Register(?:\s*No\.?|\s*Number)?|Reg\.?\s*No\.?)\s*[:\-–—]?\s*([A-Z0-9]{10,20})/i);
        if (mReg) profile.registerNo = (mReg[1] || mReg[0]).toUpperCase();
      }

      // Email ID
      if (!profile.emailId) {
        const mEmail = bodyText.match(/\b([A-Za-z0-9._%+-]+@srmist\.edu\.in)\b/i) ||
                       bodyText.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/i);
        if (mEmail) profile.emailId = mEmail[1].toLowerCase();
      }

      // Student ID
      if (!profile.studentId) {
        const mId = bodyText.match(/(?:Student\s*ID|Net\s*ID|NetID|User\s*ID)\s*[:\-–—]?\s*([A-Za-z0-9_-]+)/i);
        if (mId) {
          profile.studentId = mId[1].trim();
        } else if (profile.emailId && profile.emailId.includes("@")) {
          profile.studentId = profile.emailId.split("@")[0];
        }
      }

      // Faculty Advisor
      if (!profile.facultyAdvisor) {
        const mFA = bodyText.match(/(?:Faculty\s*Advisor|Advisor\s*\(Faculty\)|FA(?:\s*Name)?)\s*[:\-–—]?\s*([A-Za-z0-9.,\s()&'-]+?)(?=(?:\r?\n|\t|\s{3,}|(?:Academic|Faculty)\s*Advisor|AA|Emp|Phone|Mobile|Email|$))/i);
        if (mFA && mFA[1] && mFA[1].trim().length > 2) {
          profile.facultyAdvisor = cleanPersonName(mFA[1]);
        }
      }

      // Academic Advisor
      if (!profile.academicAdvisor) {
        const mAA = bodyText.match(/(?:Academic\s*Advisor|Advisor\s*\(Academic\)|AA(?:\s*Name)?)\s*[:\-–—]?\s*([A-Za-z0-9.,\s()&'-]+?)(?=(?:\r?\n|\t|\s{3,}|(?:Faculty|Academic)\s*Advisor|FA|Emp|Phone|Mobile|Email|$))/i);
        if (mAA && mAA[1] && mAA[1].trim().length > 2) {
          profile.academicAdvisor = cleanPersonName(mAA[1]);
        }
      }

      // Student Name
      if (!profile.studentName) {
        const mName = bodyText.match(/(?:Student\s*Name|Candidate\s*Name|Name\s*of\s*Student)\s*[:\-–—]?\s*([A-Za-z\s.]{3,50}?)(?=(?:\r?\n|\t|\s{3,}|Register|Reg|ID|Email|Gender|DOB|Date|$))/i);
        if (mName && mName[1]) {
          profile.studentName = cleanPersonName(mName[1]);
        }
      }

      // Institution
      if (!profile.institution) {
        const mInst = bodyText.match(/(?:Institution|College|Campus|Faculty\s*\/\s*School)\s*[:\-–—]?\s*([A-Za-z0-9.,\s()&'-]{3,80}?)(?=(?:\r?\n|\t|\s{3,}|Program|Degree|Department|Course|$))/i);
        if (mInst && mInst[1]) {
          profile.institution = cleanVal(mInst[1]);
        }
      }
    }

    return profile;
  }

  /**
   * Helper: Passively scans and caches student details from current DOM into localStorage
   */
  function passivelyScanAndCacheProfile() {
    try {
      const parsed = extractProfileFromDoc(document);
      if (parsed && (parsed.studentName || parsed.registerNo || parsed.facultyAdvisor || parsed.academicAdvisor)) {
        const existing = JSON.parse(localStorage.getItem("ar_odml_student_profile_v1") || "{}");
        const merged = { ...existing, ...Object.fromEntries(Object.entries(parsed).filter(([_, v]) => Boolean(v))) };
        localStorage.setItem("ar_odml_student_profile_v1", JSON.stringify(merged));
      }
    } catch (_) {}
  }

  /**
   * Dynamically discovers all Dashboard URLs and endpoints from the portal DOM (navigation & links)
   */
  function discoverDashboardUrlsFromDom() {
    const urls = new Set();
    const elements = Array.from(document.querySelectorAll("a, button, li, [onclick], [href], [data-url], [data-href]"));

    elements.forEach((el) => {
      const text = (el.textContent || "").trim().toLowerCase();
      const href = (el.getAttribute("href") || "").trim();
      const oc = (el.getAttribute("onclick") || "").trim();
      const dUrl = (el.getAttribute("data-url") || "").trim();
      const dHref = (el.getAttribute("data-href") || "").trim();

      const isDashboardCandidate =
        text.includes("dashboard") ||
        text.includes("student details") ||
        text.includes("student profile") ||
        text.includes("personal details") ||
        text.includes("student master") ||
        text.includes("my profile") ||
        text.includes("advisor") ||
        text === "home" ||
        href.toLowerCase().includes("dashboard") ||
        oc.toLowerCase().includes("dashboard") ||
        href.toLowerCase().includes("studentdetails") ||
        oc.toLowerCase().includes("studentdetails");

      if (isDashboardCandidate) {
        [href, oc, dUrl, dHref].forEach((raw) => {
          if (!raw) return;
          const quoted = raw.match(/['"](\/[^'"]+?\.(?:jsp|action|do)[^'"]*)['"]/gi) ||
                         raw.match(/['"](\/[a-zA-Z0-9_/.-]+)["']/gi) ||
                         raw.match(/(\/srmiststudentportal\/[a-zA-Z0-9_/.-]+)/gi);
          if (quoted) {
            quoted.forEach((q) => {
              const cleaned = q.replace(/['"]/g, "").trim();
              if (cleaned.startsWith("/") && !cleaned.includes("logout") && !cleaned.includes("captcha")) {
                urls.add(cleaned);
              }
            });
          } else if (raw.startsWith("/") || raw.startsWith("http")) {
            if (!raw.includes("javascript:") && !raw.includes("#") && !raw.includes("logout")) {
              urls.add(raw);
            }
          }
        });
      }
    });

    return Array.from(urls);
  }

  /**
   * Silently loads a dashboard URL in a hidden, same-origin iframe to allow dynamic portal scripts to execute
   */
  function fetchProfileViaHiddenIframe(url) {
    return new Promise((resolve) => {
      try {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.top = "-9999px";
        iframe.style.left = "-9999px";
        iframe.style.width = "10px";
        iframe.style.height = "10px";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        iframe.src = url;

        let finished = false;
        const cleanup = () => {
          if (!finished) {
            finished = true;
            try { iframe.remove(); } catch (_) {}
          }
        };

        const timeout = setTimeout(() => {
          cleanup();
          resolve({});
        }, 4000);

        iframe.onload = () => {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc) {
              const parsed = extractProfileFromDoc(doc);
              clearTimeout(timeout);
              cleanup();
              resolve(parsed);
              return;
            }
          } catch (_) {}
          clearTimeout(timeout);
          cleanup();
          resolve({});
        };

        iframe.onerror = () => {
          clearTimeout(timeout);
          cleanup();
          resolve({});
        };

        (document.body || document.documentElement).appendChild(iframe);
      } catch (_) {
        resolve({});
      }
    });
  }

  /**
   * Fetches and resolves all 7 student profile details from Dashboard endpoints & active DOM:
   * 1. Student Name
   * 2. Student ID
   * 3. Register No.
   * 4. Email ID
   * 5. Institution
   * 6. Faculty Advisor
   * 7. Academic Advisor
   */
  async function getOrFetchStudentDashboardDetails() {
    let profile = {};

    // 1. Read existing from cache
    try {
      const cached = localStorage.getItem("ar_odml_student_profile_v1");
      if (cached) profile = JSON.parse(cached) || {};
    } catch (_) {}

    // 2. Scan active document DOM
    try {
      const domProfile = extractProfileFromDoc(document);
      profile = { ...profile, ...Object.fromEntries(Object.entries(domProfile).filter(([_, v]) => Boolean(v))) };
    } catch (_) {}

    // 3. Scan sessionStorage for portal session variables
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i) || "";
        const val = sessionStorage.getItem(k) || "";
        if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
          try {
            const parsedObj = JSON.parse(val);
            if (parsedObj && typeof parsedObj === "object") {
              if (parsedObj.studentName && !profile.studentName) profile.studentName = parsedObj.studentName;
              if (parsedObj.regNo && !profile.registerNo) profile.registerNo = parsedObj.regNo;
              if (parsedObj.facultyAdvisor && !profile.facultyAdvisor) profile.facultyAdvisor = parsedObj.facultyAdvisor;
              if (parsedObj.academicAdvisor && !profile.academicAdvisor) profile.academicAdvisor = parsedObj.academicAdvisor;
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    // Navbar user fallback
    if (!profile.studentName) {
      const navUser = document.querySelector(".navbar_user_name, .user-name, .profile-name, #lblStudentName, .username, #user-name");
      if (navUser && navUser.textContent.trim()) {
        profile.studentName = navUser.textContent.trim().replace(/^welcome\s*[:,-]?\s*/i, "");
      }
    }

    // 4. If critical advisor / registration details are still missing, fetch Dashboard JSPs
    const needsFetch = !profile.facultyAdvisor || !profile.academicAdvisor || !profile.registerNo || !profile.institution;

    if (needsFetch) {
      const discoveredUrls = discoverDashboardUrlsFromDom();
      const defaultEndpoints = [
        "/srmiststudentportal/students/template/HRDSystem.jsp",
        "/srmiststudentportal/students/report/studentDashboard.jsp",
        "/srmiststudentportal/students/report/studentDetails.jsp",
        "/srmiststudentportal/students/report/StudentDashboard.jsp",
        "/srmiststudentportal/students/report/StudentDetails.jsp",
        "/srmiststudentportal/students/report/dashboard.jsp",
        "/srmiststudentportal/students/dashboard.jsp",
        "/srmiststudentportal/students/report/profile.jsp",
        "/srmiststudentportal/students/report/StudentProfile.jsp",
        "/srmiststudentportal/students/report/studentMaster.jsp",
        "/srmiststudentportal/students/report/StudentMaster.jsp",
        "/srmiststudentportal/students/report/personalDetails.jsp",
        "/srmiststudentportal/students/report/PersonalDetails.jsp",
        "/srmiststudentportal/students/report/studentInformation.jsp",
        "/srmiststudentportal/students/report/advisorDetails.jsp",
        "/srmiststudentportal/students/template/dashboard.jsp",
        "/srmiststudentportal/students/home.jsp",
      ];

      const allCandidates = Array.from(new Set([...discoveredUrls, ...defaultEndpoints])).filter(Boolean);

      for (const p of allCandidates) {
        try {
          const fetchUrl = p.startsWith("http") ? p : "https://sp.srmist.edu.in" + p;
          const res = await fetch(fetchUrl, {
            credentials: "include",
            cache: "no-cache",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
            },
          });
          if (!res.ok) continue;
          const html = await res.text();
          if (!html || html.length < 50) continue;

          const doc = new DOMParser().parseFromString(html, "text/html");
          const parsed = extractProfileFromDoc(doc);
          profile = { ...profile, ...Object.fromEntries(Object.entries(parsed).filter(([_, v]) => Boolean(v))) };

          if (profile.studentName && profile.registerNo && profile.facultyAdvisor && profile.academicAdvisor) {
            console.log("[OD_ML Dashboard Fetch] Resolved full profile from:", fetchUrl);
            break;
          }
        } catch (_) {}
      }

      // If advisors are still missing, try hidden iframe on top candidate dashboard URLs
      if (!profile.facultyAdvisor || !profile.academicAdvisor) {
        const topIframeTargets = (discoveredUrls.length > 0 ? discoveredUrls : [
          "/srmiststudentportal/students/template/HRDSystem.jsp",
          "/srmiststudentportal/students/report/studentDashboard.jsp",
          "/srmiststudentportal/students/report/studentDetails.jsp",
        ]).slice(0, 3);

        for (const target of topIframeTargets) {
          try {
            const iframeUrl = target.startsWith("http") ? target : "https://sp.srmist.edu.in" + target;
            const iframeProfile = await fetchProfileViaHiddenIframe(iframeUrl);
            profile = { ...profile, ...Object.fromEntries(Object.entries(iframeProfile).filter(([_, v]) => Boolean(v))) };
            if (profile.facultyAdvisor && profile.academicAdvisor) {
              console.log("[OD_ML Dashboard Fetch] Resolved profile via hidden iframe:", iframeUrl);
              break;
            }
          } catch (_) {}
        }
      }
    }

    // 5. Clean sensible fallbacks for any still-unresolved fields
    if (!profile.studentName) profile.studentName = "Student";
    if (!profile.registerNo) profile.registerNo = "—";
    if (!profile.studentId) {
      if (profile.emailId && profile.emailId.includes("@")) {
        profile.studentId = profile.emailId.split("@")[0];
      } else {
        profile.studentId = profile.registerNo !== "—" ? profile.registerNo : "—";
      }
    }
    if (!profile.emailId) profile.emailId = "—";
    if (!profile.institution) profile.institution = "SRM Institute of Science and Technology";
    if (!profile.facultyAdvisor) profile.facultyAdvisor = "—";
    if (!profile.academicAdvisor) profile.academicAdvisor = "—";

    // 6. Persist to cache
    try {
      localStorage.setItem("ar_odml_student_profile_v1", JSON.stringify(profile));
    } catch (_) {}

    console.log("[OD_ML Dashboard Fetch] Final Student Profile for Export:", profile);
    return profile;
  }

  /**
   * Export OD/ML tracker report to a modern, minimal Excel spreadsheet style window PNG:
   * 1. Modern Excel workbook layout with green emerald accent (#107c41), crisp sheet container,
   *    spreadsheet gridlines, and alternating row styling.
   * 2. Excel Parameter / Metadata block: Registration Number and Total Leave Summary.
   *    (Strictly Registration Number only - no other personal fields, no Verified Record, no ACTIVE badge, zero emdashes).
   * 3. Tabular Excel Grid showing:
   *    - Highlighted DATE & DAY ORDER (clean individual chips).
   *    - FULL SUBJECT NAME with Code (multi-line wrapping, zero truncation).
   *    - Highlighted LEAVE TYPE (OD/ML badges).
   *    - LEAVE HOURS (centered).
   *    - Highlighted LEAVE REASON (warm amber chip).
   * 4. Modern Excel bottom sheet tabs bar (Sheet1: OD_ML_Tracker) with clean generation timestamp.
   */
  async function exportToPng() {
    const exportPngBtn = document.getElementById("spOdmlExportPngBtn");
    const origHtml = exportPngBtn ? exportPngBtn.innerHTML : "";
    if (exportPngBtn) {
      exportPngBtn.disabled = true;
      exportPngBtn.style.opacity = "0.75";
      exportPngBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="sp-odml-spin">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        <span>Exporting PNG...</span>
      `;
    }

    try {
      // 1. Fetch / Resolve Dashboard Student Details (Registration Number)
      const studentProfile = await getOrFetchStudentDashboardDetails();

      const table = findAttendanceTable();
      const currentSubjects = extractSubjectsFromTable(table);

      // 2. Setup Canvas Dimensions & Retina Scaling
      const scale = 2;
      const width = 860; // Generous width ensuring full subject names fit cleanly
      const winMargin = 20;
      const winX = winMargin;
      const winY = winMargin;
      const winW = width - winMargin * 2; // 820px
      const winR = 8; // Excel sheet window border radius

      const titlebarH = 42;
      const winPaddingTop = 16;
      const metaBlockH = 46;
      const sectionGap = 16;
      const tableHeaderH = 32;
      const recordRowH = 42; // Generous row height for 2-line wrapped full subject names & chips

      const recordsCount = state.records.length;
      const tableRowsH = recordsCount > 0
        ? recordsCount * recordRowH
        : 42;

      const tableBottomGap = 16;
      const footerTabH = 32;

      const winH = titlebarH + winPaddingTop + metaBlockH + sectionGap + tableHeaderH + tableRowsH + tableBottomGap + footerTabH;
      const totalCanvasH = winH + winMargin * 2;

      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = totalCanvasH * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);

      // 3. Desktop Background (Soft neutral desktop)
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, width, totalCanvasH);

      // 4. Excel Workbook Container Frame with subtle drop shadow
      ctx.save();
      ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
      drawCanvasRoundRect(ctx, winX, winY, winW, winH, winR, "#ffffff", "#cbd5e1", 1.5);
      ctx.restore();

      // 5. Excel Ribbon / Workbook Titlebar
      drawCanvasMacTitlebar(ctx, winX, winY, winW, titlebarH, winR, "#f8fafc", "#cbd5e1");

      // Top Microsoft Excel Green Accent Stripe
      ctx.fillStyle = "#107c41";
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(winX, winY, winW, 3, [winR, winR, 0, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(winX + winR, winY, winW - winR * 2, 3);
      }

      // Excel Sheet Icon / Badge (XLSX)
      drawCanvasRoundRect(ctx, winX + 16, winY + 11, 40, 20, 3, "#107c41", null, 0);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("XLSX", winX + 36, winY + 24.5);
      ctx.textAlign = "left";

      // Workbook Title (Zero emdashes)
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("SRMIST Student Portal • OD_ML_Leave_Records.xlsx", winX + 64, winY + 25);

      // Top-Right Date Chip
      const dateGenStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      drawCanvasBadge(ctx, dateGenStr, winX + winW - 96, winY + 11, "neutral", 9.5);

      // Titlebar Bottom Divider Line
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(winX, winY + titlebarH);
      ctx.lineTo(winX + winW, winY + titlebarH);
      ctx.stroke();

      // Content positioning
      const contentX = winX + 16;
      const innerW = winW - 32; // 788px
      let curY = winY + titlebarH + winPaddingTop;

      // Helper for clean text truncation
      function fitText(text, maxW, font) {
        ctx.font = font;
        let str = String(text || "").replace(/—/g, "-").trim();
        if (ctx.measureText(str).width <= maxW) return str;
        while (str.length > 3 && ctx.measureText(str + "...").width > maxW) {
          str = str.slice(0, -1);
        }
        return str + "...";
      }

      // Helper for clean multi-line wrapping (shows full subject name without cutting off)
      function wrapTextToLines(text, maxW, initialSize) {
        let size = initialSize || 10;
        const str = String(text || "").replace(/—/g, "-").trim();
        while (size >= 8) {
          ctx.font = `bold ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          if (ctx.measureText(str).width <= maxW) {
            return { lines: [str], fontSize: size };
          }
          const words = str.split(/\s+/);
          const lines = [];
          let cur = "";
          for (let i = 0; i < words.length; i++) {
            const test = cur ? `${cur} ${words[i]}` : words[i];
            if (ctx.measureText(test).width <= maxW) {
              cur = test;
            } else {
              if (cur) lines.push(cur);
              cur = words[i];
            }
          }
          if (cur) lines.push(cur);
          if (lines.length <= 2) {
            return { lines, fontSize: size };
          }
          size -= 0.5;
        }
        // Fallback: 2 lines with size 8
        const words = str.split(/\s+/);
        let line1 = "";
        let line2 = "";
        ctx.font = `bold 8px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        for (let i = 0; i < words.length; i++) {
          const test = line1 ? `${line1} ${words[i]}` : words[i];
          if (ctx.measureText(test).width <= maxW) {
            line1 = test;
          } else {
            line2 = words.slice(i).join(" ");
            break;
          }
        }
        return { lines: line2 ? [line1, line2] : [line1 || str], fontSize: 8 };
      }

      // ── SECTION 1: EXCEL PARAMETER CELLS (REGISTRATION NUMBER ONLY, ZERO EMDASHES) ──
      drawCanvasRoundRect(ctx, contentX, curY, innerW, metaBlockH, 4, "#f8fafc", "#cbd5e1", 1);

      // Cell A (Left 50%): Registration Number
      const cell1W = Math.floor(innerW * 0.5);
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("REGISTRATION NUMBER", contentX + 14, curY + 17);

      const regVal = (studentProfile.registerNo && studentProfile.registerNo !== "—")
        ? studentProfile.registerNo.replace(/—/g, "-")
        : "N/A";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 13.5px -apple-system, BlinkMacSystemFont, 'SF Mono', 'Segoe UI Mono', monospace, sans-serif";
      ctx.fillText(regVal, contentX + 14, curY + 34);

      // Vertical Cell Divider
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(contentX + cell1W, curY);
      ctx.lineTo(contentX + cell1W, curY + metaBlockH);
      ctx.stroke();

      // Cell B (Right 50%): Total Leave Summary Metrics
      const cell2X = contentX + cell1W + 14;
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("TOTAL LEAVE RECORDED", cell2X, curY + 17);

      const totalHours = state.records.reduce((sum, r) => sum + (parseInt(r.hours, 10) || 0), 0);
      const summaryVal = `${state.records.length} Record(s) Logged  •  +${totalHours} Hour(s) Applied`;
      ctx.fillStyle = "#107c41"; // Excel forest emerald
      ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(summaryVal, cell2X, curY + 34);

      curY += metaBlockH + sectionGap;

      // ── SECTION 2: EXCEL SPREADSHEET TABLE ──
      const tableX = contentX;
      const tableW = innerW;
      // Column width distribution: 150 + 320 + 68 + 65 + 185 = 788px (exactly innerW)
      const colW = [150, 320, 68, 65, 185];
      const colX = [
        tableX,
        tableX + colW[0],
        tableX + colW[0] + colW[1],
        tableX + colW[0] + colW[1] + colW[2],
        tableX + colW[0] + colW[1] + colW[2] + colW[3],
      ];

      // Table Header Background
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(tableX, curY, tableW, tableHeaderH);

      // Table Header Titles (Zero emdashes)
      ctx.fillStyle = "#475569";
      ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      ctx.textAlign = "left";
      ctx.fillText("DATE & DAY ORDER", colX[0] + 10, curY + 20);
      ctx.fillText("FULL SUBJECT NAME (WITH CODE)", colX[1] + 10, curY + 20);

      ctx.textAlign = "center";
      ctx.fillText("LEAVE TYPE", colX[2] + colW[2] / 2, curY + 20);
      ctx.fillText("HOURS", colX[3] + colW[3] / 2, curY + 20);

      ctx.textAlign = "left";
      ctx.fillText("LEAVE REASON", colX[4] + 10, curY + 20);

      // Header Column Dividers
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      for (let i = 1; i < colX.length; i++) {
        ctx.beginPath();
        ctx.moveTo(colX[i], curY);
        ctx.lineTo(colX[i], curY + tableHeaderH);
        ctx.stroke();
      }

      // Header Bottom Line
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tableX, curY + tableHeaderH);
      ctx.lineTo(tableX + tableW, curY + tableHeaderH);
      ctx.stroke();

      let rowCurY = curY + tableHeaderH;

      if (state.records.length === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(tableX, rowCurY, tableW, 42);
        ctx.fillStyle = "#64748b";
        ctx.font = "italic 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No OD or ML leave records logged yet.", tableX + tableW / 2, rowCurY + 26);
        ctx.textAlign = "left";

        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.strokeRect(tableX, rowCurY, tableW, 42);
        rowCurY += 42;
      } else {
        state.records.forEach((r, idx) => {
          // Row background (alternating zebra)
          ctx.fillStyle = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
          ctx.fillRect(tableX, rowCurY, tableW, recordRowH);

          // ── Col 0: DATE & DAY ORDER (Both Highlighted with clean chips, zero emdashes) ──
          const rawDate = r.date || "";
          const dateStr = formatHumanDate(rawDate).replace(/—/g, "-");

          const rawDo = (r.dayOrder || "").replace(/—/g, "-");
          let doStr = "DO -";
          let isHoliday = false;
          if (rawDo.toLowerCase().includes("holiday")) {
            doStr = rawDo.length > 10 ? fitText(rawDo, 50, "bold 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif") : rawDo;
            isHoliday = true;
          } else if (rawDo) {
            doStr = rawDo.startsWith("DO") ? rawDo : `DO ${rawDo}`;
          }

          // 1. Highlighted Date Chip (Cool light sky highlight)
          const datePillX = colX[0] + 8;
          const datePillY = rowCurY + (recordRowH - 22) / 2;
          ctx.font = "bold 9.5px 'Segoe UI', -apple-system, sans-serif";
          const dateTextW = ctx.measureText(dateStr).width;
          const datePillW = dateTextW + 12;
          drawCanvasRoundRect(ctx, datePillX, datePillY, datePillW, 22, 3, "#e8ecf5", "#bae6fd", 1);
          ctx.fillStyle = "#0d1938";
          ctx.textAlign = "center";
          ctx.fillText(dateStr, datePillX + datePillW / 2, datePillY + 15);

          // 2. Highlighted Day Order Chip (Distinct vibrant chip)
          const doPillX = datePillX + datePillW + 6;
          const doPillY = datePillY;
          ctx.font = "bold 9px 'Segoe UI', -apple-system, sans-serif";
          const doTextW = ctx.measureText(doStr).width;
          const doPillW = Math.max(38, doTextW + 10);
          const doBg = isHoliday ? "#fff4c2" : "#e8ecf5";
          const doBorder = isHoliday ? "#f4d875" : "#bfdbfe";
          const doTextCol = isHoliday ? "#9a7200" : "#132450";
          drawCanvasRoundRect(ctx, doPillX, doPillY, doPillW, 22, 3, doBg, doBorder, 1);
          ctx.fillStyle = doTextCol;
          ctx.textAlign = "center";
          ctx.fillText(doStr, doPillX + doPillW / 2, doPillY + 15);

          // ── Col 1: FULL SUBJECT NAME WITH CODE (Multi-line wrapped so full name is shown) ──
          let subj = currentSubjects.find((s) => s.code === r.subjectCode);
          if (!subj && state.customSubjects) {
            subj = state.customSubjects.find((s) => s.code === r.subjectCode);
          }
          const rawFullName = subj ? (subj.fullName || subj.displayName) : (r.subjectFullName || "");
          const fullSubjTitle = formatSubjectDisplayName(r.subjectCode, rawFullName).replace(/—/g, "-");

          const maxSubjColW = colW[1] - 16; // 304px
          const wrapResult = wrapTextToLines(fullSubjTitle, maxSubjColW, 10);
          const subjLines = wrapResult.lines;

          ctx.fillStyle = "#0f172a";
          ctx.font = `bold ${wrapResult.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx.textAlign = "left";

          if (subjLines.length === 1) {
            ctx.fillText(subjLines[0], colX[1] + 8, rowCurY + 25);
          } else {
            ctx.fillText(subjLines[0], colX[1] + 8, rowCurY + 17);
            ctx.fillText(subjLines[1], colX[1] + 8, rowCurY + 31);
          }

          // ── Col 2: Highlighted Leave Type Pill (Centered) ──
          const isOD = r.type === "OD";
          const pillW = 46;
          const pillH = 22;
          const pillX = colX[2] + (colW[2] - pillW) / 2;
          const pillY = rowCurY + (recordRowH - pillH) / 2;
          drawCanvasRoundRect(ctx, pillX, pillY, pillW, pillH, 4, isOD ? "#e8ecf5" : "#dcfce7", isOD ? "#b8c2d9" : "#86efac", 1);
          ctx.textAlign = "center";
          ctx.fillStyle = isOD ? "#0d1938" : "#15803d";
          ctx.font = "bold 9.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText(r.type || "OD", colX[2] + colW[2] / 2, pillY + 15);

          // ── Col 3: Leave Hours (Centered) ──
          ctx.textAlign = "center";
          ctx.fillStyle = "#334155";
          ctx.font = "600 10.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          const hrsText = `${r.hours} ${parseInt(r.hours, 10) === 1 ? "Hour" : "Hours"}`;
          ctx.fillText(hrsText, colX[3] + colW[3] / 2, rowCurY + 25);

          // ── Col 4: Highlighted Leave Reason (Warm amber pill, zero emdashes) ──
          const reasonRaw = (r.notes || "Official OD/ML").replace(/—/g, "-").trim();
          const reasonPillX = colX[4] + 8;
          const reasonPillY = rowCurY + (recordRowH - 22) / 2;
          const maxReasonW = colW[4] - 16; // 169px

          let reasonFontSize = 9.5;
          ctx.font = `600 ${reasonFontSize}px 'Segoe UI', -apple-system, sans-serif`;
          while (reasonFontSize > 8 && ctx.measureText(reasonRaw).width > (maxReasonW - 14)) {
            reasonFontSize -= 0.5;
            ctx.font = `600 ${reasonFontSize}px 'Segoe UI', -apple-system, sans-serif`;
          }
          const dispReason = fitText(reasonRaw, maxReasonW - 14, `600 ${reasonFontSize}px 'Segoe UI', -apple-system, sans-serif`);
          const reasonTextW = ctx.measureText(dispReason).width;
          const reasonPillW = Math.min(maxReasonW, Math.max(40, reasonTextW + 14));

          drawCanvasRoundRect(ctx, reasonPillX, reasonPillY, reasonPillW, 22, 4, "#fffaf0", "#f4d875", 1);
          ctx.fillStyle = "#9a7200";
          ctx.font = `600 ${reasonFontSize}px 'Segoe UI', -apple-system, sans-serif`;
          ctx.textAlign = "left";
          ctx.fillText(dispReason, reasonPillX + 7, reasonPillY + 15);

          // Row bottom horizontal gridline
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tableX, rowCurY + recordRowH);
          ctx.lineTo(tableX + tableW, rowCurY + recordRowH);
          ctx.stroke();

          // Column vertical gridlines
          for (let i = 1; i < colX.length; i++) {
            ctx.beginPath();
            ctx.moveTo(colX[i], rowCurY);
            ctx.lineTo(colX[i], rowCurY + recordRowH);
            ctx.stroke();
          }

          rowCurY += recordRowH;
        });
      }

      // Outer Table Border Box
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(tableX, curY, tableW, tableHeaderH + tableRowsH);

      curY = rowCurY + tableBottomGap;

      // ── SECTION 3: EXCEL SHEET TABS & STATUS BAR (Zero emdashes) ──
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(winX, curY, winW, footerTabH);

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(winX, curY);
      ctx.lineTo(winX + winW, curY);
      ctx.stroke();

      // Active Sheet Tab (Sheet1: OD_ML_Tracker)
      const tabX = winX + 16;
      const tabW = 152;
      const tabH = 24;
      const tabY = curY + 4;
      drawCanvasRoundRect(ctx, tabX, tabY, tabW, tabH, 3, "#ffffff", "#cbd5e1", 1);
      ctx.fillStyle = "#107c41";
      ctx.fillRect(tabX + 1, tabY, tabW - 2, 2.5); // Excel Green top active indicator line
      ctx.fillStyle = "#107c41";
      ctx.font = "bold 9.5px 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Sheet1: OD_ML_Tracker", tabX + 12, tabY + 16);

      // Right Side: Generation Timestamp & Attribution (Zero emdashes)
      ctx.textAlign = "right";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "9.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const genFullStr = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      ctx.fillText(`Generated on ${genFullStr} • Academia Prime`, winX + winW - 16, tabY + 16);
      ctx.textAlign = "left"; // reset

      // 6. Download PNG
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const cleanReg = (studentProfile.registerNo && studentProfile.registerNo !== "—")
        ? `_${studentProfile.registerNo.replace(/[\s—\-]+/g, "_")}`
        : "";
      a.download = `OD_ML_Leave_Report${cleanReg}_${getTodayDateString(0)}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1000);
    } catch (e) {
      console.error("[OD_ML] PNG Export error:", e);
      alert("Failed to export PNG: " + e.message);
    } finally {
      if (exportPngBtn) {
        exportPngBtn.disabled = false;
        exportPngBtn.style.opacity = "";
        exportPngBtn.innerHTML = origHtml;
      }
    }
  }


  /**
   * Auto-Sync Day Order from Academic Calendar / Planner & Current Page DOM
   * Target Schema: "DATE | DAY | STATUS | WEEK | DAY ORDER | REMARKS"
   */
  async function syncAcademicCalendarDayOrder(onSuccess) {
    state.isSyncingDayOrder = true;

    try {
      // 1. Scan currently visible portal DOM for Day Order and Academic Calendar table
      parseAcademicCalendarFromDom();

      const domDO = getPortalDomDayOrder();
      if (domDO) {
        const todayStr = getTodayDateString(0);
        if (!calendarDateMap[todayStr]) {
          calendarDateMap[todayStr] = {
            date: todayStr,
            dayOrder: domDO,
            isHoliday: false,
            holidayReason: "",
            holidayDisplayText: "",
            displayText: `Day Order ${domDO}`,
          };
        }
      }

      // 2. Fetch official Academic Calendar & Planner paths
      const paths = [
        "/srmiststudentportal/students/calendar/AcademicCalender.jsp",
        "/srmiststudentportal/students/calendar/AcademicCalendar.jsp",
        "/srmiststudentportal/students/calendar/academiccalender.jsp",
        "/srmiststudentportal/students/calendar/academiccalendar.jsp",
        "/srmiststudentportal/students/report/AcademicPlanner.jsp",
        "/srmiststudentportal/students/report/academicplanner.jsp",
        "/srmiststudentportal/students/Timetable/AcademicCalendar.jsp",
        "/srmiststudentportal/students/timetable/academiccalendar.jsp",
      ];

      for (const p of paths) {
        try {
          const res = await fetch("https://sp.srmist.edu.in" + p, {
            credentials: "include",
            cache: "no-cache",
          });
          if (!res.ok) continue;
          const html = await res.text();
          parseCalendarResponse(html);
          if (Object.keys(calendarDateMap).length > 2) {
            break;
          }
        } catch (_) {}
      }

      // 3. Set Day Order and Holiday information for currently selected date
      const entry = getCalendarEntryForDate(state.selectedDate);
      if (entry && entry.isHoliday) {
        state.isHoliday = true;
        state.holidayDisplayText = entry.holidayDisplayText || `Holiday - ${entry.holidayReason || "Holiday"}`;
        state.dayOrder = null;
      } else {
        state.isHoliday = false;
        state.holidayDisplayText = "";
        // STRICT USER RULE: Never automatically pre-select Day Order; user must pick it manually!
        state.dayOrder = null;
      }

      finishSync(onSuccess);
    } catch (_) {
      finishSync(onSuccess);
    }
  }

  function finishSync(callback) {
    state.isSyncingDayOrder = false;
    saveStoredData();
    const container = document.getElementById("sp-odml-top-container");
    if (container) {
      updateTopHeaderContents(container);
    }
    if (callback) callback();
  }

  /**
   * Tooltip Singleton - Professional & Concise
   */
  function createOrGetGlobalTooltip() {
    let tt = document.getElementById("sp-odml-global-tooltip");
    if (tt) return tt;

    tt = document.createElement("div");
    tt.id = "sp-odml-global-tooltip";
    tt.className = "sp-odml-global-tooltip";
    tt.innerHTML = `
      <div class="sp-odml-tt-head">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d1938" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>OD/ML Margin Simulator</span>
      </div>
      <div class="sp-odml-tt-body">
        Project attendance margin impact by adding On-Duty and Medical Leave credits.
      </div>
      <div class="sp-odml-tt-bullet">
        <span class="sp-odml-tt-dot" style="background-color: #16a34a;"></span>
        <span><strong>Live Projection:</strong> Shows original vs. credited margin directly in the table.</span>
      </div>
      <div class="sp-odml-tt-bullet">
        <span class="sp-odml-tt-dot" style="background-color: #132450;"></span>
        <span><strong>Planner Sync:</strong> Auto-detects day order from Academic Calendar dates.</span>
      </div>
      <div class="sp-odml-tt-bullet">
        <span class="sp-odml-tt-dot" style="background-color: #132450;"></span>
        <span><strong>Preset Tags:</strong> Quickly tag credits for events, hackathons, and interviews.</span>
      </div>
    `;
    document.body.appendChild(tt);
    return tt;
  }

  function showTooltip(triggerEl) {
    const tt = createOrGetGlobalTooltip();
    const rect = triggerEl.getBoundingClientRect();
    const tooltipWidth = 290;
    const shiftLeft = 50;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2 - shiftLeft;
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    let top = rect.bottom + 8;
    if (top + 180 > window.innerHeight) {
      top = rect.top - 180;
    }

    tt.style.left = `${Math.round(left)}px`;
    tt.style.top = `${Math.round(top)}px`;
    tt.classList.add("visible");
  }

  function hideTooltip() {
    const tt = document.getElementById("sp-odml-global-tooltip");
    if (tt) tt.classList.remove("visible");
  }

  /**
   * Tooltip Singleton for OD/ML Margin column note
   */
  function createOrGetOdmlMarginTooltip() {
    let tt = document.getElementById("sp-odml-margin-col-tooltip");
    if (tt) return tt;

    tt = document.createElement("div");
    tt.id = "sp-odml-margin-col-tooltip";
    tt.className = "sp-odml-margin-col-tooltip";
    tt.innerHTML = `
      <div class="sp-odml-col-tt-head">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span class="sp-odml-col-tt-title">Notes:</span>
      </div>
      <div class="sp-odml-col-tt-box">
        <div class="sp-odml-col-tt-box-header">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>What It Does:</span>
        </div>
        <div class="sp-odml-col-tt-box-text">
          Simply just subtract your absent hours with your marked Leave
        </div>
      </div>
    `;
    document.body.appendChild(tt);
    return tt;
  }

  function showOdmlMarginTooltip(triggerEl) {
    const tt = createOrGetOdmlMarginTooltip();
    const rect = triggerEl.getBoundingClientRect();
    const tooltipWidth = 285;
    const shiftLeft = 120;

    let left = rect.left + rect.width / 2 - tooltipWidth / 2 - shiftLeft;
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    let top = rect.bottom + 8;
    if (top + 130 > window.innerHeight && rect.top > 130) {
      top = rect.top - 130;
    }

    tt.style.left = `${Math.round(left)}px`;
    tt.style.top = `${Math.round(top)}px`;
    tt.classList.add("sp-tooltip-visible");
  }

  function hideOdmlMarginTooltip() {
    const tt = document.getElementById("sp-odml-margin-col-tooltip");
    if (tt) {
      tt.classList.remove("sp-tooltip-visible");
    }
  }

  /**
   * Toggle Header Expand / Collapse
   */
  function toggleHeaderExpanded(forceState) {
    if (typeof forceState === "boolean") {
      state.isHeaderExpanded = forceState;
    } else {
      state.isHeaderExpanded = !state.isHeaderExpanded;
    }

    const container = document.getElementById("sp-odml-top-container");
    if (container) {
      container.classList.toggle("sp-odml-expanded", state.isHeaderExpanded);
      const panel = container.querySelector(".sp-odml-body-panel");
      if (panel) {
        panel.style.setProperty("display", state.isHeaderExpanded ? "block" : "none", "important");
      }

      const toggleBtn = container.querySelector("#sp-odml-toggle-btn");
      if (toggleBtn) {
        toggleBtn.classList.toggle("is-expanded", state.isHeaderExpanded);
        toggleBtn.classList.toggle("is-collapsed", !state.isHeaderExpanded);
        toggleBtn.title = state.isHeaderExpanded ? "Collapse On-Duty & Medical Leave Tracker" : "Expand to Mark OD & ML";
        const span = toggleBtn.querySelector("#sp-odml-toggle-text");
        const icon = toggleBtn.querySelector(".sp-odml-toggle-icon");
        if (span) span.textContent = state.isHeaderExpanded ? "Collapse View" : "Expand to Mark";
        if (icon) icon.style.transform = state.isHeaderExpanded ? "rotate(0deg)" : "rotate(180deg)";
      }
    }

    saveStoredData();
  }

  /**
   * Helper: Updates all Margin Column Toggle Buttons in Ribbon and Table Header
   */
  function updateMarginColumnToggleButtons() {
    const isExpanded = !!state.isMarginColumnExpanded;

    // 1. Studio Ribbon capsule button
    const bannerColBtn = document.getElementById("spOdmlBannerColToggleBtn");
    if (bannerColBtn) {
      bannerColBtn.classList.toggle("is-active", isExpanded);
      const span = bannerColBtn.querySelector("span");
      if (span) {
        span.textContent = isExpanded ? "− Column" : "+ Column";
      }
    }

    // 2. Card Header View OD/ML button on "COURSE WISE ATTENDANCE - During the Period:"
    const headerBtn = document.getElementById("spOdmlCardHeaderViewBtn");
    if (headerBtn) {
      headerBtn.classList.toggle("is-active", isExpanded);
      headerBtn.setAttribute("aria-pressed", isExpanded ? "true" : "false");
      headerBtn.title = isExpanded
        ? "Hide OD/ML margin column in attendance table"
        : "View OD/ML margin column in attendance table";
      const btnText = headerBtn.querySelector(".sp-odml-view-btn-text");
      if (btnText) {
        btnText.textContent = isExpanded ? "Hide OD/ML" : "View OD/ML";
      }
    }

    // 3. Remove card header info hover button so hover is ONLY near OD/ML Margin column
    const cardInfoBtn = document.getElementById("spOdmlCardHeaderInfoTrigger");
    if (cardInfoBtn) {
      cardInfoBtn.remove();
    }

    if (!isExpanded) {
      hideOdmlMarginTooltip();
    }
  }

  /**
   * Re-calculates total percentage and margin before OD apply with 75% only,
   * enforces 75% threshold on the attendance table, and shows updated OD/ML marking for 75% only.
   */
  function enforce75AndRecalculate() {
    state.currentThreshold = 75;

    // 1. Force the attendance engine threshold back to 75%
    if (typeof window.spSetAttendanceThreshold === "function") {
      window.spSetAttendanceThreshold(75);
    } else {
      window.dispatchEvent(new CustomEvent("sp-enforce-75-threshold"));
      const btn75 = document.querySelector(".sp-threshold-btn.sp-btn-75");
      if (btn75 && !btn75.classList.contains("sp-active")) {
        btn75.click();
      }
    }

    // 2. Remove 65% styling from table if still lingering and clear cell signatures
    const table = findAttendanceTable();
    if (table) {
      table.classList.remove("sp-table-thresh-65");
      const odmlCells = table.querySelectorAll(".sp-odml-col-cell");
      odmlCells.forEach((c) => {
        c.dataset.cellSignature = "";
      });
    }

    // 3. Update buttons and state
    updateMarginColumnToggleButtons();
    saveStoredData();

    // 4. Force OD/ML cells recalculation strictly with 75% only
    enhanceMarginCellsWithOdMl(true);

    // 5. Short follow-up pass to guarantee synchrony with any DOM reflow
    setTimeout(() => {
      enhanceMarginCellsWithOdMl(true);
    }, 40);
  }

  /**
   * Toggle OD_ML Margin column in Attendance Table
   */
  function toggleMarginColumn(forceState) {
    if (typeof forceState === "boolean") {
      state.isMarginColumnExpanded = forceState;
    } else {
      state.isMarginColumnExpanded = !state.isMarginColumnExpanded;
    }

    // STRICT USER RULE: When clicked on View OD/ML, always re-calculate total percentage
    // and margin before OD apply with 75% only, and show updated OD/ML marking for 75% only.
    if (state.isMarginColumnExpanded) {
      enforce75AndRecalculate();
    } else {
      updateMarginColumnToggleButtons();
      saveStoredData();
      enhanceMarginCellsWithOdMl();
    }
  }

  /**
   * Helper: Formats saved note content for rich contenteditable notepad.
   * If note contains HTML, preserves it; if plain text or markdown, converts to clean HTML.
   */
  function formatInitialNoteContent(raw) {
    if (!raw) return "";
    const str = String(raw).trim();
    if (!str) return "";
    if (/<[a-z][\s\S]*>/i.test(str)) {
      return str
        .replace(/\s*contenteditable=(["'])false\1/gi, "")
        .replace(/<span class="sp-odml-todo-box"[^>]*>.*?<\/span>\s*/gi, "• ");
    }
    let formatted = escapeHtml(str);
    formatted = formatted.replace(/&lt;u&gt;/gi, "<u>").replace(/&lt;\/u&gt;/gi, "</u>");
    formatted = formatted.replace(/&lt;s&gt;/gi, "<s>").replace(/&lt;\/s&gt;/gi, "</s>");
    formatted = formatted.replace(/&lt;strike&gt;/gi, "<strike>").replace(/&lt;\/strike&gt;/gi, "</strike>");
    formatted = formatted.replace(/&lt;del&gt;/gi, "<del>").replace(/&lt;\/del&gt;/gi, "</del>");
    formatted = formatted.replace(/~~(.+?)~~/g, "<strike>$1</strike>");
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/__(.+?)__/g, "<strong>$1</strong>");
    formatted = formatted.replace(/(^|[^\*])\*([^\*\n]+?)\*([^\*]|$)/g, "$1<em>$2</em>$3");
    const lines = formatted.split("\n");
    let inList = false;
    const out = [];
    for (const line of lines) {
      // Check for task markdown: render as bullet point
      const taskM = line.match(/^(\s*[-*•]?\s*)\[([ xX])\]\s*(.*)$/);
      if (taskM) {
        if (!inList) { inList = true; out.push("<ul>"); }
        out.push(`<li>${taskM[3] || "Note..."}</li>`);
        continue;
      }
      const m = line.match(/^(\s*[•\-\*]|\s*\d+[\.\)])\s+(.*)$/);
      if (m) {
        if (!inList) { inList = true; out.push("<ul>"); }
        out.push(`<li>${m[2]}</li>`);
      } else {
        if (inList) { inList = false; out.push("</ul>"); }
        if (!line.trim()) {
          out.push("<div><br></div>");
        } else {
          out.push(`<div>${line}</div>`);
        }
      }
    }
    if (inList) out.push("</ul>");
    return out.join("");
  }

  /**
   * Helper: Checks if contenteditable editor is empty of visible text
   */
  function isEditorEmpty(el) {
    if (!el) return true;
    const todos = el.querySelectorAll(".sp-odml-todo-item");
    if (todos.length > 0) {
      for (const t of todos) {
        const txt = t.querySelector(".sp-odml-todo-text")?.textContent || "";
        if (txt.replace(/[\u200B-\u200D\uFEFF\s]/g, "").length > 0) return false;
      }
      return false; // has at least one checklist item structure
    }
    const text = el.textContent || "";
    return text.replace(/[\u200B-\u200D\uFEFF\s]/g, "").length === 0;
  }

  /**
   * Renders lightweight markdown for Personal Note (bold, italic, underline, bullets).
   */
  function renderPersonalNoteMarkdown(text) {
    if (!text || !text.trim()) {
      return `<div class="sp-odml-preview-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <p>No notes written yet.</p>
        <span>Click <strong>Edit</strong> or use shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z) to write notes.</span>
      </div>`;
    }

    let escaped = escapeHtml(text);
    // Allow <u> and </u> tags
    escaped = escaped.replace(/&lt;u&gt;/gi, "<u>").replace(/&lt;\/u&gt;/gi, "</u>");

    // Bold: **text** or __text__
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/__(.+?)__/g, "<strong>$1</strong>");

    // Italic: *text* or _text_
    escaped = escaped.replace(/(^|[^\*])\*([^\*\n]+?)\*([^\*]|$)/g, "$1<em>$2</em>$3");
    escaped = escaped.replace(/(^|[^_])_([^_\n]+?)_([^_]|$)/g, "$1<em>$2</em>$3");

    // Split into lines for bullet parsing & paragraphs
    const lines = escaped.split("\n");
    let inList = false;
    const output = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Check if bullet point (•, -, *, or numbered like 1.)
      const bulletMatch = trimmed.match(/^([•\-\*]|\d+[\.\)])\s+(.*)$/);

      if (bulletMatch) {
        if (!inList) {
          inList = true;
          output.push('<ul class="sp-odml-preview-list">');
        }
        const itemContent = bulletMatch[2];
        output.push(`<li class="sp-odml-preview-list-item">${itemContent}</li>`);
      } else {
        if (inList) {
          inList = false;
          output.push('</ul>');
        }
        if (trimmed === "") {
          output.push('<div class="sp-odml-preview-spacer"></div>');
        } else {
          output.push(`<p class="sp-odml-preview-p">${rawLine}</p>`);
        }
      }
    }

    if (inList) {
      output.push('</ul>');
    }

    return output.join("\n");
  }

  /**
   * Helper: Updates Submit CTA Button label, Forge Title, and Live Preview badge in real time
   */
  function updateSubmitButtonAndPreview(container) {
    if (!container) container = document.getElementById("sp-odml-top-container");
    if (!container) return;

    const isOd = state.selectedType === "OD";

    const forgeTitle = container.querySelector("#spOdmlForgeTitle");
    if (forgeTitle) {
      forgeTitle.textContent = "Mark Your Leave";
    }

    const previewPill = container.querySelector("#sp-odml-credit-tag");
    if (previewPill) {
      previewPill.textContent = `+${state.selectedHours} Hr ${state.selectedType} Credit`;
      previewPill.className = `sp-odml-forge-live-pill ${isOd ? "is-od" : "is-ml"}`;
    }

    const submitBtn = container.querySelector("#sp-odml-add-btn");
    if (submitBtn) {
      submitBtn.classList.toggle("is-od-btn", isOd);
      submitBtn.classList.toggle("is-ml-btn", !isOd);
    }

    const submitBtnText = container.querySelector("#spOdmlSubmitBtnText");
    if (submitBtnText) {
      submitBtnText.textContent = state.selectedHours === 1 ? "Apply +1 Leave Hour" : "Apply +2 Leave Hours";
    }
  }

  /**
   * Build Top Header DOM Skeleton (Redesigned completely from scratch)
   * Concepts:
   * 1. Top Studio Ribbon with Prime emblem, live simulator beacon, column toggle & planner sync.
   * 2. Course Impact Deck: Interactive visual cards for ALL enrolled courses showing real-time margin & % projections.
   * 3. Credit Forge Terminal: Side-by-side console for Course, Leave Type (OD vs ML), Hours (+1 vs +2), Date, DO & Reason Tags.
   * 4. Audit Ledger & Analytics Station: Activity timeline with delete controls + Live Simulation KPI widgets.
   * 5. High-contrast Prime Light Theme: Solid colors only (NO gradients), SVG icons only (NO emojis).
   */
  function buildTopHeaderSkeleton(container) {
    container.innerHTML = `
      <!-- Top Studio Ribbon (Always Visible) -->
      <div class="sp-odml-studio-ribbon">
        <div class="sp-odml-ribbon-left">
          <div class="sp-odml-ribbon-title-col">
            <span class="sp-odml-ribbon-title">On-Duty &amp; Medical Leave Tracker</span>
          </div>
        </div>

        <div class="sp-odml-ribbon-right">
          <div class="sp-odml-collapsed-dotted-box">
            <span class="sp-odml-collapsed-label" id="spOdmlCollapsedLabel">Mark OD/ML</span>
            <button type="button" class="sp-odml-studio-toggle-cta ${state.isHeaderExpanded ? "is-expanded" : "is-collapsed"}" id="sp-odml-toggle-btn" title="${state.isHeaderExpanded ? "Collapse On-Duty & Medical Leave Tracker" : "Expand to Mark OD & ML"}">
              <span class="sp-odml-toggle-label" id="sp-odml-toggle-text">${state.isHeaderExpanded ? "Collapse View" : "Expand to Mark"}</span>
              <span class="sp-odml-studio-counter-pill" id="sp-odml-toggle-badge" style="display: ${state.records.length > 0 ? "inline-flex" : "none"};">${state.records.length}</span>
              <div class="sp-odml-toggle-icon-chip">
                <svg class="sp-odml-toggle-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: ${state.isHeaderExpanded ? "rotate(0deg)" : "rotate(180deg)"};">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Expandable Studio Body -->
      <div class="sp-odml-body-panel" style="display: ${state.isHeaderExpanded ? "block" : "none"} !important;">

        <!-- TOP NOTICES: ADVISORY GUIDELINES & HOW TO USE GUIDE -->
        <div class="sp-odml-top-notices-deck">
          <!-- Yellow Dotted Advisory Note Box -->
          <div class="sp-odml-advisory-note-box">
            <div class="sp-odml-advisory-note-head">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9a7200" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span class="sp-odml-advisory-note-title">A Small Note:</span>
            </div>
            <ol class="sp-odml-advisory-points">
              <li>OD/ML Tracker is a <span class="sp-odml-note-highlight-box">Prime only feature for personal tracking</span> and is not associated with official college OD/ML marking.</li>
              <li>Always officially <span class="sp-odml-note-highlight-box">apply for OD/ML leave through your Faculty Advisor (FA).</span></li>
            </ol>
          </div>

          <!-- Green Dotted How to Use Window -->
          <div class="sp-odml-how-to-use-box">
            <div class="sp-odml-how-to-use-head">
              <div class="sp-odml-how-to-use-title-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span class="sp-odml-how-to-use-title">How to Use :</span>
              </div>
            </div>
            <div class="sp-odml-how-to-use-flow">
              <span class="sp-odml-flow-step-box">Select Subject</span>
              <svg class="sp-odml-flow-real-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
              <span class="sp-odml-flow-step-box">Select Date and Dayorder</span>
              <svg class="sp-odml-flow-real-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
              <span class="sp-odml-flow-step-box">Select Leave Reason</span>
              <svg class="sp-odml-flow-real-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
              <span class="sp-odml-flow-step-box is-done">Done</span>
            </div>
            <div class="sp-odml-how-to-view-line">
              <span class="sp-odml-how-to-view-label">To View :</span>
              <span class="sp-odml-how-to-view-text">Click on <span class="sp-odml-view-keyword">View OD/ML</span></span>
            </div>
          </div>
        </div>

        <!-- CREDIT FORGE TERMINAL -->
        <div class="sp-odml-forge-terminal">
          <div class="sp-odml-forge-header">
            <div class="sp-odml-forge-title-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d1938" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span class="sp-odml-forge-title" id="spOdmlForgeTitle">Mark Your Leave</span>
              <div class="sp-odml-title-info-wrap" id="spOdmlTitleInfoWrap">
                <button type="button" class="sp-odml-title-info-btn" id="spOdmlTitleInfoBtn" aria-label="Note">
                  <span class="sp-odml-info-circle-letter">i</span>
                </button>
                <div class="sp-odml-title-info-popover" id="spOdmlTitleInfoPopover" role="tooltip">
                  <div class="sp-odml-tip-popover-header">
                    <span class="sp-odml-tip-popover-title">Note</span>
                  </div>
                  <div class="sp-odml-tip-popover-body">
                    <!-- 1st Line: What It Does in dotted colored bold box -->
                    <div class="sp-odml-note-summary-box">
                      <div class="sp-odml-note-summary-header">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>What It Does:</span>
                      </div>
                      <div class="sp-odml-note-summary-text">
                        Simply just subtract your absent hours with your marked Leave
                      </div>
                    </div>

                    <div class="sp-odml-tip-item">
                      <div class="sp-odml-tip-item-icon is-blue">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                      </div>
                      <div class="sp-odml-tip-item-content">
                        <div class="sp-odml-tip-item-title">Personal Remembrance</div>
                        <div class="sp-odml-tip-item-desc">For personal tracking only to remember class leave.</div>
                      </div>
                    </div>

                    <div class="sp-odml-tip-item">
                      <div class="sp-odml-tip-item-icon is-amber">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      </div>
                      <div class="sp-odml-tip-item-content">
                        <div class="sp-odml-tip-item-title">No Present OD</div>
                        <div class="sp-odml-tip-item-desc"><span class="sp-odml-tip-dotted-badge">Tip</span> Only mark non-present OD leaves. Present ODs are marked directly by subject faculty (ask your Faculty Advisor to inform them), there no need to keep track of those.</div>
                      </div>
                    </div>

                    <div class="sp-odml-tip-item">
                      <div class="sp-odml-tip-item-icon is-green">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                      </div>
                      <div class="sp-odml-tip-item-content">
                        <div class="sp-odml-tip-item-title">Attendance Reflection</div>
                        <div class="sp-odml-tip-flow">
                          <span class="sp-odml-tip-flow-node">Total Leave Taken</span>
                          <svg class="sp-odml-tip-flow-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                          <span class="sp-odml-tip-flow-node is-highlight">Simulated % &amp; Margin</span>
                        </div>
                        <div class="sp-odml-tip-item-desc">Tracks total leaves per subject and calculates how your margin will be reflected once OD/ML is approved.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="sp-odml-forge-live-pill is-od" id="sp-odml-credit-tag">
              +${state.selectedHours} Hr ${state.selectedType} Credit
            </div>
          </div>

          <div class="sp-odml-forge-grid">
            <!-- Forge Column 1: Full Dotted Box for Target Course, Date, Day Order, Leave Type & Leave Hours -->
            <div class="sp-odml-forge-col sp-odml-forge-col-dotted-box">
              <!-- 1. Target Course Selector Pill -->
              <div class="sp-odml-forge-field">
                <label class="sp-odml-forge-label">Target Course:</label>
                <div class="sp-odml-custom-dropdown" id="spOdmlCustomCourseDropdown">
                  <button type="button" class="sp-odml-dropdown-trigger ${!state.selectedSubjectCode ? "is-unpicked" : ""}" id="spOdmlCourseTrigger" aria-haspopup="listbox" aria-expanded="false" title="Click to choose a course">
                    <div class="sp-odml-trigger-left" id="spOdmlTriggerContent">
                      <span class="sp-odml-trigger-code-box" id="spOdmlTriggerCode">COURSE</span>
                      <span class="sp-odml-trigger-title" id="spOdmlTriggerTitle">${!state.selectedSubjectCode ? "Select Target Course..." : "Select course..."}</span>
                    </div>
                    <div class="sp-odml-trigger-right">
                      <span class="sp-odml-trigger-stat-badge" id="spOdmlTriggerStat" style="display: none !important;"></span>
                      <svg class="sp-odml-dropdown-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </button>
                  <button type="button" class="sp-odml-course-deselect-btn" id="spOdmlCourseDeselectBtn" title="Deselect Target Course" style="display: ${Boolean(state.selectedSubjectCode) ? "inline-flex" : "none"} !important;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                  <div class="sp-odml-dropdown-menu" id="spOdmlCourseMenu" role="listbox">
                    <div class="sp-odml-dropdown-menu-list" id="spOdmlCourseMenuList"></div>
                  </div>
                  <select class="sp-odml-select" id="sp-odml-subject-select" style="display:none !important;"></select>
                </div>
              </div>

              <!-- 2. Date & Day Order Row (Side-by-side) -->
              <div class="sp-odml-forge-date-row">
                <!-- Date Section (Left) -->
                <div class="sp-odml-forge-field" style="flex: 1 1 50%; min-width: 0;">
                  <div class="sp-odml-field-header-row">
                    <label class="sp-odml-forge-label" style="margin:0;">Date:</label>
                    <div class="sp-odml-quick-date-capsules">
                      <button type="button" class="sp-odml-mini-capsule-btn active" id="spOdmlQuickToday">Today</button>
                      <button type="button" class="sp-odml-mini-capsule-btn" id="spOdmlQuickYest">Yesterday</button>
                    </div>
                  </div>
                  <div class="sp-odml-input-capsule sp-odml-date-capsule-styled" id="spOdmlDateCapsule" title="Click to pick a date from calendar">
                    <div class="sp-odml-date-capsule-left">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0d1938" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span class="sp-odml-date-val-display" id="spOdmlDateValDisplay">${formatHumanDate(state.selectedDate)}</span>
                    </div>
                    <button type="button" class="sp-odml-date-cal-action-btn" id="spOdmlDateCalActionBtn" title="Pick date with calendar">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span>Pick Date</span>
                    </button>
                    <input type="date" class="sp-odml-date-picker-hidden" id="sp-odml-date-input" value="${state.selectedDate}">
                  </div>
                  <span class="sp-odml-human-date-preview ${state.isHoliday ? "is-holiday" : ""}" id="spOdmlHumanDatePreview" style="margin-top: 3px;">
                    ${state.isHoliday ? `${getHumanDayAndDate(state.selectedDate)} • ${state.holidayDisplayText}` : getHumanDayAndDate(state.selectedDate)}
                  </span>
                </div>

                <!-- Day Order Section (Right) -->
                <div class="sp-odml-forge-field" style="flex: 1 1 50%; min-width: 0;">
                  <div class="sp-odml-field-header-row">
                    <label class="sp-odml-forge-label" style="margin:0;">Day Order:</label>
                    <span class="sp-odml-do-status-badge ${state.isHoliday ? "is-holiday" : (state.dayOrder ? "is-picked" : "is-unpicked")}" id="spOdmlDoStatusBadge">
                      ${state.isHoliday ? escapeHtml(state.holidayDisplayText) : (state.dayOrder ? `DO ${state.dayOrder}` : "Unpicked")}
                    </span>
                  </div>
                  <div class="sp-odml-do-track ${!state.isHoliday && !state.dayOrder ? "is-unpicked" : ""}" id="spOdmlDoStrip">
                    <button type="button" class="sp-odml-do-track-btn ${!state.isHoliday && Boolean(state.dayOrder) && state.dayOrder === "1" ? "active" : ""}" data-do="1">1</button>
                    <button type="button" class="sp-odml-do-track-btn ${!state.isHoliday && Boolean(state.dayOrder) && state.dayOrder === "2" ? "active" : ""}" data-do="2">2</button>
                    <button type="button" class="sp-odml-do-track-btn ${!state.isHoliday && Boolean(state.dayOrder) && state.dayOrder === "3" ? "active" : ""}" data-do="3">3</button>
                    <button type="button" class="sp-odml-do-track-btn ${!state.isHoliday && Boolean(state.dayOrder) && state.dayOrder === "4" ? "active" : ""}" data-do="4">4</button>
                    <button type="button" class="sp-odml-do-track-btn ${!state.isHoliday && Boolean(state.dayOrder) && state.dayOrder === "5" ? "active" : ""}" data-do="5">5</button>
                  </div>
                </div>
              </div>

              <!-- 3. Leave Type & Leave Hours Row (Side-by-side with separate dotted sub-boxes) -->
              <div class="sp-odml-forge-matrix-grid">
                <!-- Leave Type Section (Left Dotted Sub-box) -->
                <div class="sp-odml-control-box sp-odml-box-leave-type">
                  <div class="sp-odml-box-head">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <span class="sp-odml-box-title">LEAVE TYPE:</span>
                  </div>
                  <div class="sp-odml-tile-group sp-odml-leave-type-group">
                    <button type="button" class="sp-odml-tile-btn sp-odml-tile-od ${state.selectedType === "OD" ? "active" : ""}" id="sp-odml-type-od" title="On-Duty Leave">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                      <span>OD (On-Duty)</span>
                    </button>
                    <button type="button" class="sp-odml-tile-btn sp-odml-tile-ml ${state.selectedType === "ML" ? "active" : ""}" id="sp-odml-type-ml" title="Medical Leave">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                      </svg>
                      <span>ML (Medical)</span>
                    </button>
                  </div>
                </div>

                <!-- Leave Hours Section (Right Dotted Sub-box) -->
                <div class="sp-odml-control-box sp-odml-box-credit-hours">
                  <div class="sp-odml-box-head">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span class="sp-odml-box-title">LEAVE HOURS:</span>
                  </div>
                  <div class="sp-odml-tile-group">
                    <button type="button" class="sp-odml-tile-btn sp-odml-tile-hr-1 ${state.selectedHours === 1 ? "active" : ""}" id="sp-odml-hrs-1" title="+1 Leave Hour">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>+1 Hour</span>
                    </button>
                    <button type="button" class="sp-odml-tile-btn sp-odml-tile-hr-2 ${state.selectedHours === 2 ? "active" : ""}" id="sp-odml-hrs-2" title="+2 Leave Hours">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                      <span>+2 Hours</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Forge Column 2: Full Dotted Box for Quick Presets & OD/ML Reason -->
            <div class="sp-odml-forge-col sp-odml-forge-col-dotted-box sp-odml-forge-col-presets-notes">
              <!-- Quick Presets Tags Strip (Positioned at top, ending with Custom) -->
              <div class="sp-odml-forge-field sp-odml-presets-field">
                <div class="sp-odml-field-header-row">
                  <span class="sp-odml-preset-badge">Quick Presets</span>
                  <span class="sp-odml-preset-status-badge ${(state.activeTag && state.activeTag !== "custom") || (state.commentText && state.commentText.trim()) ? "is-picked" : "is-unpicked"}" id="spOdmlPresetStatusBadge">
                    ${state.activeTag ? (state.activeTag === "custom" ? (state.commentText.trim() ? "Custom Reason" : "Type Reason") : escapeHtml(state.activeTag)) : (state.commentText.trim() ? "Reason Entered" : "Pick Preset")}
                  </span>
                </div>
                <div class="sp-odml-tags-strip ${!((state.activeTag && state.activeTag !== "custom") || (state.commentText && state.commentText.trim())) ? "is-unpicked" : ""}" id="spOdmlReasonTagsStrip">
                  ${PRESET_REASON_TAGS.map((tag) => `
                    <button type="button" class="sp-odml-tag-btn ${tag === "custom" ? "sp-odml-tag-custom-btn" : ""} ${state.activeTag === tag ? "active" : ""}" data-tag="${tag}">
                      ${tag === "custom" ? "Custom" : tag}
                    </button>
                  `).join("")}
                </div>
              </div>

              <!-- Reason Input Section (Single-line combined button-label & input to maximize space) -->
              <div class="sp-odml-forge-field sp-odml-reason-single-line-field">
                <div class="sp-odml-reason-box-ui sp-odml-reason-box-single-line">
                  <div class="sp-odml-reason-input-inner">
                    <label for="sp-odml-comment-input" class="sp-odml-reason-inline-label" style="margin: 0 !important;" title="Click to focus OD/ML Reason">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      <span>OD/ML Reason:</span>
                    </label>
                    <input type="text" class="sp-odml-input sp-odml-reason-styled-input" id="sp-odml-comment-input" placeholder="Type reason or select a preset tag..." value="${escapeHtml(state.commentText)}">
                    <button type="button" class="sp-odml-reason-clear-btn" id="spOdmlReasonClearBtn" title="Clear reason" style="display: ${state.commentText ? "inline-flex" : "none"} !important; align-self: center !important; margin: auto 6px auto 2px !important;">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Personal Note Section (Clean text note for typing points) -->
              <div class="sp-odml-forge-field sp-odml-personal-note-field">
                <div class="sp-odml-field-header-row sp-odml-note-header-row">
                  <div class="sp-odml-note-title-wrap">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <label class="sp-odml-forge-label" style="margin:0; font-size: 11px;">Personal Note:</label>
                    <div class="sp-odml-pnote-info-wrap" id="spOdmlPnoteInfoWrap">
                      <button type="button" class="sp-odml-title-info-btn sp-odml-pnote-info-btn" id="spOdmlPnoteInfoBtn" aria-label="Personal Note Information">
                        <span class="sp-odml-info-circle-letter">i</span>
                      </button>
                      <div class="sp-odml-pnote-info-popover" id="spOdmlPnoteInfoPopover" role="tooltip">
                        <div class="sp-odml-tip-popover-header">
                          <span class="sp-odml-tip-popover-title">Personal Note</span>
                          <span class="sp-odml-pnote-autosave-pill">Auto-saves ✓</span>
                        </div>
                        <div class="sp-odml-pnote-popover-body">
                          <div class="sp-odml-pnote-desc-text">
                            This is for your personal notes and auto-saves locally.
                          </div>

                          <div class="sp-odml-pnote-badges-row">
                            <span class="sp-odml-pnote-tag is-excluded">✕ No Export / Import</span>
                            <span class="sp-odml-pnote-tag is-safe">✓ Safe from Clear All</span>
                          </div>

                          <div class="sp-odml-pnote-tip-box">
                            <span class="sp-odml-tip-dotted-badge">Tip</span>
                            <span class="sp-odml-pnote-tip-text">
                              Want to save or backup?
                              <svg class="sp-odml-pnote-arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                              </svg>
                              <strong>Take Screenshot</strong>
                              <svg class="sp-odml-pnote-cam-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                              </svg>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="sp-odml-note-header-actions">
                    <div class="sp-odml-mini-tools-group">
                      <button type="button" class="sp-odml-mini-tool-btn" id="spOdmlMiniBold" data-tooltip="Bold (Ctrl+B)"><strong>B</strong></button>
                      <button type="button" class="sp-odml-mini-tool-btn" id="spOdmlMiniItalic" data-tooltip="Italic (Ctrl+I)"><em>I</em></button>
                      <button type="button" class="sp-odml-mini-tool-btn" id="spOdmlMiniUnderline" data-tooltip="Underline (Ctrl+U)"><u>U</u></button>
                      <button type="button" class="sp-odml-mini-tool-btn sp-odml-mini-tool-strike" id="spOdmlMiniStrike" data-tooltip="Done (Ctrl+D)"><s>S</s></button>
                      <button type="button" class="sp-odml-mini-tool-btn" id="spOdmlMiniPoints" data-tooltip="Bullets (Ctrl+.)"><span style="font-size:13px; line-height:1;">•</span></button>
                    </div>
                    <button type="button" class="sp-odml-note-popup-btn" id="spOdmlNotePopupTriggerBtn" title="Open Personal Note in larger popup">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <polyline points="9 21 3 21 3 15"></polyline>
                        <line x1="21" y1="3" x2="14" y2="10"></line>
                        <line x1="3" y1="21" x2="10" y2="14"></line>
                      </svg>
                      <span>Popup</span>
                    </button>
                  </div>
                </div>

                <div class="sp-odml-personal-note-card">
                  <div class="sp-odml-note-editor" id="spOdmlPersonalNoteInput" contenteditable="true" data-placeholder="Write personal note for yourself..." role="textbox" aria-multiline="true">${formatInitialNoteContent(state.personalNote || "")}</div>

                  <!-- Action Row: Save & Reset -->
                  <div class="sp-odml-note-action-row">
                    <span class="sp-odml-note-status-hint" id="spOdmlNoteStatusHint">${state.personalNote ? "Auto-saved ✓" : ""}</span>
                    <div class="sp-odml-note-action-btns">
                      <button type="button" class="sp-odml-note-btn-reset" id="spOdmlNoteResetBtn" title="Reset personal note">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="1 4 1 10 7 10"></polyline>
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                        <span>Reset</span>
                      </button>
                      <button type="button" class="sp-odml-note-btn-save" id="spOdmlNoteSaveBtn" title="Save personal note">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                          <polyline points="17 21 17 13 7 13 7 21"></polyline>
                          <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Bar: Primary Apply CTA -->
          <div class="sp-odml-forge-action-bar">
            <button type="button" class="sp-odml-submit-btn ${state.selectedType === "OD" ? "is-od-btn" : "is-ml-btn"}" id="sp-odml-add-btn">
              <div class="sp-odml-submit-btn-icon-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
              <span class="sp-odml-submit-btn-text" id="spOdmlSubmitBtnText">${state.selectedHours === 1 ? "Apply +1 Leave Hour" : "Apply +2 Leave Hours"}</span>
              <div class="sp-odml-submit-btn-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </button>
          </div>
        </div>

        <!-- SECTION 3: AUDIT LEDGER & ANALYTICS DUAL VIEW -->
        <div class="sp-odml-bottom-dual-deck">
          <!-- Left: Activity Timeline & Ledger -->
          <div class="sp-odml-ledger-deck">
            <div id="sp-odml-history-container"></div>
          </div>

          <!-- Right: Analytics & Tools Station -->
          <div class="sp-odml-analytics-station" id="spOdmlAnalyticsStation">
            <!-- Populated dynamically with live stats and quick actions -->
          </div>
        </div>

        <!-- SECTION 4: BACKUP & RESTORE TOOLS DECK -->
        <div class="sp-odml-footer-deck">
          <!-- Dotted Box for Import, Export (JSON) & Export (PNG) with Rightmost Whole Collapse Button -->
          <div class="sp-odml-tools-dotted-box" id="spOdmlBackupSectionBox">
            <div class="sp-odml-tools-dotted-title-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span class="sp-odml-tools-dotted-title">Backup &amp; Restore</span>
            </div>
            <div class="sp-odml-tools-right-group">
              <div class="sp-odml-tools-btn-group" id="spOdmlBackupBtnGroup">
                <input type="file" id="spOdmlImportFileInput" accept=".json,application/json" style="display:none !important;">
                <button type="button" class="sp-odml-footer-btn sp-odml-btn-import" id="spOdmlImportBtn" title="Import records from JSON file">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Import (JSON)</span>
                </button>
                <button type="button" class="sp-odml-footer-btn sp-odml-btn-export-json" id="spOdmlExportJsonBtn" title="Export logged records to a JSON file">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>Export (JSON)</span>
                </button>
                <button type="button" class="sp-odml-footer-btn sp-odml-btn-export-png" id="spOdmlExportPngBtn" title="Export OD/ML tracker summary report to a PNG image">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>Export (PNG)</span>
                </button>
              </div>
              <button type="button" class="sp-odml-bottom-collapse-btn" id="spOdmlBottomCollapseBtn" title="Collapse On-Duty &amp; Medical Leave Tracker">
                <span>Collapse View</span>
                <div class="sp-odml-bottom-collapse-icon-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
        <!-- Personal Note Modal Popup (Hidden by default, shown ONLY when asked) -->
        <div class="sp-odml-modal-backdrop" id="spOdmlPersonalNoteModal" style="display: none !important;">
          <div class="sp-odml-modal-dialog">
            <div class="sp-odml-modal-header" id="spOdmlModalHeader">
              <div class="sp-odml-modal-title-row">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <span class="sp-odml-modal-title">Personal Note</span>
              </div>
              <button type="button" class="sp-odml-modal-close-btn" id="spOdmlNoteModalCloseBtn" title="Close (Esc)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Modal Formatting Toolbar (Bold, Italic, Underline, Strike/Done, Points, Undo, Redo) -->
            <div class="sp-odml-modal-toolbar" id="spOdmlModalToolbar">
              <div class="sp-odml-toolbar-group">
                <button type="button" class="sp-odml-tool-btn" id="spOdmlToolBold" data-tooltip="Bold (Ctrl+B)">
                  <strong>B</strong>
                </button>
                <button type="button" class="sp-odml-tool-btn" id="spOdmlToolItalic" data-tooltip="Italic (Ctrl+I)">
                  <em>I</em>
                </button>
                <button type="button" class="sp-odml-tool-btn" id="spOdmlToolUnderline" data-tooltip="Underline (Ctrl+U)">
                  <u>U</u>
                </button>
                <button type="button" class="sp-odml-tool-btn sp-odml-tool-btn-strike" id="spOdmlToolStrike" data-tooltip="Done (Ctrl+D)">
                  <s>S</s>
                  <span>Done</span>
                </button>
              </div>

              <div class="sp-odml-toolbar-divider"></div>

              <div class="sp-odml-toolbar-group">
                <button type="button" class="sp-odml-tool-btn sp-odml-tool-btn-points" id="spOdmlToolPoints" data-tooltip="Bullets (Ctrl+.)">
                  <span class="sp-odml-tool-bullet-icon">•</span>
                  <span>Points</span>
                </button>
              </div>

              <div class="sp-odml-toolbar-divider"></div>

              <div class="sp-odml-toolbar-group">
                <button type="button" class="sp-odml-tool-btn" id="spOdmlToolUndo" data-tooltip="Undo (Ctrl+Z)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                  </svg>
                </button>
                <button type="button" class="sp-odml-tool-btn" id="spOdmlToolRedo" data-tooltip="Redo (Ctrl+Y)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Modal Body: Single Full-width Realtime Rich Text Notepad -->
            <div class="sp-odml-modal-body">
              <div class="sp-odml-modal-editor" id="spOdmlModalTextarea" contenteditable="true" data-placeholder="Write personal note for yourself..." role="textbox" aria-multiline="true">${formatInitialNoteContent(state.personalNote || "")}</div>
            </div>

            <!-- Modal Footer: Save, Reset, Done -->
            <div class="sp-odml-modal-footer">
              <div class="sp-odml-modal-footer-left">
                <button type="button" class="sp-odml-modal-reset-btn" id="spOdmlModalResetBtn" title="Reset personal note">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                  </svg>
                  <span>Reset</span>
                </button>
              </div>
              <div class="sp-odml-modal-footer-right">
                <span class="sp-odml-modal-feedback-msg" id="spOdmlModalFeedbackMsg"></span>
                <button type="button" class="sp-odml-modal-save-btn" id="spOdmlModalSaveBtn" title="Save personal note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  <span>Save</span>
                </button>
                <button type="button" class="sp-odml-modal-done-btn" id="spOdmlModalDoneBtn">Done</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.classList.toggle("sp-odml-expanded", !!state.isHeaderExpanded);
  }

  /**
   * Update Dynamic Contents of Top Header
   */
  function updateTopHeaderContents(container, subjects) {
    if (!container) container = document.getElementById("sp-odml-top-container");
    if (!container) return;

    if (!subjects || subjects.length === 0) {
      const table = findAttendanceTable();
      subjects = extractSubjectsFromTable(table);
    }

    // 1. Update Date & Day Order Chips in Banner
    const dateText = container.querySelector("#sp-odml-banner-date-text");
    if (dateText) dateText.textContent = formatHumanDate(state.selectedDate);

    const bannerDoCapsule = container.querySelector("#spOdmlBannerDoCapsule");
    const doText = container.querySelector("#sp-odml-banner-dayorder-text");
    if (doText) {
      if (state.isHoliday) {
        doText.textContent = state.holidayDisplayText;
        if (bannerDoCapsule) {
          bannerDoCapsule.className = "sp-odml-capsule sp-odml-capsule-holiday";
          bannerDoCapsule.title = state.holidayDisplayText;
        }
      } else if (state.dayOrder) {
        doText.textContent = `Day Order ${state.dayOrder}`;
        if (bannerDoCapsule) {
          bannerDoCapsule.className = "sp-odml-capsule sp-odml-capsule-do";
          bannerDoCapsule.title = `Day Order ${state.dayOrder}`;
        }
      } else {
        doText.textContent = "Select Day Order";
        if (bannerDoCapsule) {
          bannerDoCapsule.className = "sp-odml-capsule sp-odml-capsule-unpicked";
          bannerDoCapsule.title = "Please pick a Day Order (1 to 5)";
        }
      }
    }

    const datePreview = container.querySelector("#spOdmlHumanDatePreview");
    if (datePreview) {
      if (state.isHoliday) {
        datePreview.textContent = `${getHumanDayAndDate(state.selectedDate)} • ${state.holidayDisplayText}`;
        datePreview.classList.add("is-holiday");
      } else {
        datePreview.textContent = getHumanDayAndDate(state.selectedDate);
        datePreview.classList.remove("is-holiday");
      }
    }

    const doStatusBadge = container.querySelector("#spOdmlDoStatusBadge");
    if (doStatusBadge) {
      if (state.isHoliday) {
        doStatusBadge.className = "sp-odml-do-status-badge is-holiday";
        doStatusBadge.textContent = state.holidayDisplayText;
      } else if (state.dayOrder) {
        doStatusBadge.className = "sp-odml-do-status-badge is-picked";
        doStatusBadge.textContent = `DO ${state.dayOrder}`;
      } else {
        doStatusBadge.className = "sp-odml-do-status-badge is-unpicked";
        doStatusBadge.textContent = "Pick Day Order";
      }
    }

    const doStrip = container.querySelector("#spOdmlDoStrip");
    if (doStrip) {
      doStrip.classList.toggle("is-unpicked", !state.isHoliday && !state.dayOrder);
    }

    const presetStatusBadge = container.querySelector("#spOdmlPresetStatusBadge");
    const isPresetPicked = Boolean(state.activeTag && state.activeTag !== "custom") || Boolean(state.commentText && state.commentText.trim());
    if (presetStatusBadge) {
      if (isPresetPicked) {
        presetStatusBadge.className = "sp-odml-preset-status-badge is-picked";
        presetStatusBadge.textContent = state.activeTag === "custom" ? "Custom Reason" : (state.activeTag || "Reason Entered");
      } else {
        presetStatusBadge.className = "sp-odml-preset-status-badge is-unpicked";
        presetStatusBadge.textContent = state.activeTag === "custom" ? "Type Reason" : "Pick Preset";
      }
    }

    const tagsStrip = container.querySelector("#spOdmlReasonTagsStrip");
    if (tagsStrip) {
      tagsStrip.classList.toggle("is-unpicked", !isPresetPicked);
      if (isPresetPicked) {
        tagsStrip.classList.remove("is-glow-alert");
      }
    }

    const dateValDisplay = container.querySelector("#spOdmlDateValDisplay");
    if (dateValDisplay) dateValDisplay.textContent = formatHumanDate(state.selectedDate);

    // Update Day Order buttons in track: If holiday, none active; otherwise show active
    container.querySelectorAll(".sp-odml-do-track-btn").forEach((b) => {
      const isAct = !state.isHoliday && Boolean(state.dayOrder) && b.dataset.do === String(state.dayOrder);
      b.classList.toggle("active", isAct);
      b.textContent = b.dataset.do;
    });

    const deselectBtn = container.querySelector("#spOdmlDoDeselectBtn");
    if (deselectBtn) {
      deselectBtn.style.display = "none";
    }

    // Update column toggle buttons in ribbon and card header
    updateMarginColumnToggleButtons();

    // Update Banner Toggle Count Badge
    const toggleBadge = container.querySelector("#sp-odml-toggle-badge");
    if (toggleBadge) {
      toggleBadge.textContent = String(state.records.length);
      toggleBadge.style.display = state.records.length > 0 ? "inline-flex" : "none";
    }

    // Update Personal Note content in rich text editors
    const noteEditorEl = container.querySelector("#spOdmlPersonalNoteInput");
    const isNoteFocused = noteEditorEl && (noteEditorEl === document.activeElement || noteEditorEl.contains(document.activeElement));
    if (noteEditorEl && !isNoteFocused) {
      const nextHtml = formatInitialNoteContent(state.personalNote || "");
      if (noteEditorEl.innerHTML !== nextHtml) {
        noteEditorEl.innerHTML = nextHtml;
      }
      noteEditorEl.classList.toggle("is-empty", isEditorEmpty(noteEditorEl));
    }
    const modalEditorEl = document.getElementById("spOdmlModalTextarea");
    const isModalFocused = modalEditorEl && (modalEditorEl === document.activeElement || modalEditorEl.contains(document.activeElement));
    if (modalEditorEl && !isModalFocused) {
      const nextHtml = formatInitialNoteContent(state.personalNote || "");
      if (modalEditorEl.innerHTML !== nextHtml) {
        modalEditorEl.innerHTML = nextHtml;
      }
      modalEditorEl.classList.toggle("is-empty", isEditorEmpty(modalEditorEl));
    }

    // 2. Populate Target Course Custom Dropdown
    if (subjects && subjects.length > 0) {
      // Update native select and dropdown fallback trigger
      const courseDropdown = container.querySelector("#spOdmlCustomCourseDropdown");
      const courseTrigger = container.querySelector("#spOdmlCourseTrigger");
      const deselectCourseBtn = container.querySelector("#spOdmlCourseDeselectBtn");
      const subjSelect = container.querySelector("#sp-odml-subject-select");
      const menuList = container.querySelector("#spOdmlCourseMenuList");
      const triggerCode = container.querySelector("#spOdmlTriggerCode");
      const triggerTitle = container.querySelector("#spOdmlTriggerTitle");
      const triggerStat = container.querySelector("#spOdmlTriggerStat");

      const enrolled = subjects.filter((s) => !s.isCustom && !s.code?.startsWith("CUSTOM"));

      if (subjSelect) {
        const selectSignature = `${enrolled.length}_${state.selectedSubjectCode}`;
        if (subjSelect.dataset.selectSignature !== selectSignature) {
          subjSelect.dataset.selectSignature = selectSignature;
          const placeholderOpt = `<option value="" ${!state.selectedSubjectCode ? "selected" : ""}>-- Select Target Course (${enrolled.length} Total) --</option>`;
          subjSelect.innerHTML = placeholderOpt + enrolled
            .map(
              (s, index) => `<option value="${s.code}" ${s.code === state.selectedSubjectCode ? "selected" : ""}>${index + 1}. ${escapeHtml(s.displayName)}</option>`
            )
            .join("");
        } else if (subjSelect.value !== (state.selectedSubjectCode || "")) {
          subjSelect.value = state.selectedSubjectCode || "";
        }
      }

      const selectedSubj = state.selectedSubjectCode
        ? enrolled.find((s) => s.code === state.selectedSubjectCode)
        : null;

      if (selectedSubj) {
        if (courseTrigger) courseTrigger.classList.remove("is-unpicked");
        if (deselectCourseBtn) deselectCourseBtn.style.setProperty("display", "inline-flex", "important");
        if (triggerCode) {
          triggerCode.style.display = "inline-flex";
          triggerCode.textContent = selectedSubj.code;
        }
        if (triggerTitle) triggerTitle.textContent = selectedSubj.fullName || selectedSubj.displayName;
        if (triggerStat) {
          triggerStat.style.display = "none";
          triggerStat.textContent = "";
        }
      } else {
        if (courseTrigger) courseTrigger.classList.add("is-unpicked");
        if (deselectCourseBtn) deselectCourseBtn.style.setProperty("display", "none", "important");
        if (triggerCode) {
          triggerCode.style.display = "inline-flex";
          triggerCode.textContent = "COURSE";
        }
        if (triggerTitle) {
          triggerTitle.textContent = enrolled.length > 0
            ? `Select Target Course (${enrolled.length} Total)...`
            : "Select Target Course...";
        }
        if (triggerStat) {
          triggerStat.style.display = "none";
          triggerStat.textContent = "";
        }
      }

      if (menuList) {
        const menuSignature = `${enrolled.length}_${state.selectedSubjectCode}_75_${enrolled.map((s) => `${s.code}:${s.pct}:${s.origMargin}:${getTotalOdHoursForSubject(s.code)}`).join("|")}`;
        if (menuList.dataset.menuSignature !== menuSignature) {
          menuList.dataset.menuSignature = menuSignature;

          const itemsHtml = enrolled
            .map((s, index) => {
              const isSel = s.code === state.selectedSubjectCode;
              const mVal = s.origMargin;
              const mStr = mVal !== null ? (mVal > 0 ? `+${mVal}` : `${mVal}`) : "-";
              const mClass = getMarginBadgeClass(mVal);
              const pClass = getPctBadgeClass(s.pct, 75);
              const odHours = getTotalOdHoursForSubject(s.code);
              const serialNo = index + 1;

              return `
                <div class="sp-odml-dropdown-box-item ${isSel ? "is-selected" : ""}" data-code="${escapeHtml(s.code)}" role="option" aria-selected="${isSel}">
                  <div class="sp-odml-item-top-row">
                    <span class="sp-odml-item-serial-box">${serialNo}</span>
                    <span class="sp-odml-item-code-box">${escapeHtml(s.code)}</span>
                    <span class="sp-odml-item-title" title="${escapeHtml(s.fullName || s.displayName)}">${escapeHtml(s.fullName || s.displayName)}</span>
                    <span class="sp-odml-item-check">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                  </div>
                  <div class="sp-odml-item-bottom-row">
                    <span class="sp-odml-item-pill sp-margin-badge ${pClass}">${s.pct}% Attended</span>
                    <span class="sp-odml-item-pill sp-margin-badge ${mClass}">Margin: ${mStr}</span>
                    ${odHours > 0 ? `<span class="sp-odml-credit-pill">+${odHours}h Logged</span>` : ""}
                  </div>
                </div>
              `;
            })
            .join("");

          menuList.innerHTML = itemsHtml;

          menuList.querySelectorAll(".sp-odml-dropdown-box-item").forEach((box) => {
            box.onclick = (e) => {
              e.stopPropagation();
              const code = box.dataset.code;
              state.selectedSubjectCode = code;
              if (subjSelect) subjSelect.value = code;

              const dropdownWrap = container.querySelector("#spOdmlCustomCourseDropdown");
              if (dropdownWrap) dropdownWrap.classList.remove("is-open");

              updateTopHeaderContents(container, subjects);
            };
          });
        }
      }
    }

    // 3. Update Dynamic Submit CTA Button Label & Live Preview Badge
    updateSubmitButtonAndPreview(container);

    // 4. Update Audit Ledger Timeline Feed
    const historyContainer = container.querySelector("#sp-odml-history-container");
    if (historyContainer) {
      const totalRecords = state.records.length;
      const totalHours = state.records.reduce(
        (sum, r) => sum + (parseInt(r.hours, 10) || 0),
        0
      );

      // Unique signature to detect if records actually changed
      const currentRecordsSignature = JSON.stringify(
        state.records.map((r) => `${r.id}_${r.type}_${r.hours}_${r.subjectCode}`)
      );
      const isAlreadyRendered = historyContainer.dataset.renderedSignature === currentRecordsSignature;
      const hasEmptyState = Boolean(historyContainer.querySelector(".sp-odml-feed-empty-state"));

      // Helper: extracts clean course code and full subject name
      function getRecordSubjectInfo(r) {
        let displayCode = r.subjectCode || "";
        let displayFullName = r.subjectFullName || "";

        const matched = subjects ? subjects.find((s) => s.code === r.subjectCode) : null;
        if (matched) {
          displayCode = matched.code;
          if (matched.fullName && matched.fullName !== matched.code) {
            displayFullName = matched.fullName;
          } else if (matched.displayName && matched.displayName !== matched.code) {
            displayFullName = matched.displayName;
          }
        }

        if (displayCode && (displayCode.startsWith("CUSTOM") || (matched && matched.isCustom))) {
          displayCode = "CUSTOM";
        }

        if (!displayFullName && r.subjectFullName) {
          displayFullName = r.subjectFullName;
        }

        if (displayCode && displayFullName) {
          if (displayFullName.toUpperCase().startsWith(displayCode.toUpperCase())) {
            const afterCode = displayFullName.substring(displayCode.length).replace(/^[\s\-–—:]+/, "").trim();
            if (afterCode) displayFullName = afterCode;
          }
        }
        if (!displayFullName) displayFullName = displayCode || "Subject";
        return { displayCode, displayFullName };
      }

      // Collect unique subjects from added records using their resolved Subject Names
      const addedSubjectsMap = new Map();
      let totalOdRecords = 0;
      let totalMlRecords = 0;

      state.records.forEach((r) => {
        if (r.type === "OD") totalOdRecords++;
        if (r.type === "ML") totalMlRecords++;

        const code = r.subjectCode || "OTHER";
        if (!addedSubjectsMap.has(code)) {
          const { displayFullName } = getRecordSubjectInfo(r);
          addedSubjectsMap.set(code, {
            code,
            name: displayFullName,
            count: 1,
          });
        } else {
          addedSubjectsMap.get(code).count++;
        }
      });

      // Auto-reset subject filter if filtered subject is no longer in records
      if (state.feedSubjectFilter && state.feedSubjectFilter !== "ALL" && !addedSubjectsMap.has(state.feedSubjectFilter)) {
        state.feedSubjectFilter = "ALL";
      }

      // Auto-reset type filter if filtered type has no records
      if (state.feedTypeFilter === "OD" && totalOdRecords === 0) {
        state.feedTypeFilter = "ALL";
      } else if (state.feedTypeFilter === "ML" && totalMlRecords === 0) {
        state.feedTypeFilter = "ALL";
      }

      // Helper: gets filtered records based on active subject filter, type filter & search query
      function getFilteredRecords() {
        const currentFilter = state.feedSubjectFilter || "ALL";
        const currentTypeFilter = (state.feedTypeFilter || "ALL").toUpperCase();
        const currentSearch = (state.feedSearchQuery || "").trim().toLowerCase();

        return state.records
          .slice()
          .reverse()
          .filter((r) => {
            if (currentFilter !== "ALL" && r.subjectCode !== currentFilter) {
              return false;
            }
            if (currentTypeFilter !== "ALL" && (r.type || "").trim().toUpperCase() !== currentTypeFilter) {
              return false;
            }
            if (currentSearch) {
              const { displayCode, displayFullName } = getRecordSubjectInfo(r);
              const code = (displayCode || "").toLowerCase();
              const name = (displayFullName || "").toLowerCase();
              const notes = (r.notes || "").toLowerCase();
              const type = (r.type || "").toLowerCase();
              const date = (r.date || "").toLowerCase();
              const humanDate = formatHumanDate(r.date).toLowerCase();
              const dayOrder = (r.dayOrder || "").toLowerCase();
              const hours = `${r.hours}h`.toLowerCase();

              return (
                code.includes(currentSearch) ||
                name.includes(currentSearch) ||
                notes.includes(currentSearch) ||
                type.includes(currentSearch) ||
                date.includes(currentSearch) ||
                humanDate.includes(currentSearch) ||
                dayOrder.includes(currentSearch) ||
                hours.includes(currentSearch)
              );
            }
            return true;
          });
      }

      // Helper: renders feed cards list into #spOdmlFeedContentArea
      function renderCardsList() {
        const filtered = getFilteredRecords();
        const countBadge = historyContainer.querySelector("#spOdmlFeedCountBadge");
        if (countBadge) {
          const isFiltered = (state.feedSubjectFilter && state.feedSubjectFilter !== "ALL") ||
                             (state.feedTypeFilter && state.feedTypeFilter !== "ALL") ||
                             Boolean(state.feedSearchQuery && state.feedSearchQuery.trim());
          countBadge.textContent = isFiltered
            ? `${filtered.length} of ${totalRecords} ${totalRecords === 1 ? "entry" : "entries"}`
            : `${totalRecords} ${totalRecords === 1 ? "entry" : "entries"}`;
        }

        const contentArea = historyContainer.querySelector("#spOdmlFeedContentArea");
        if (!contentArea) return;

        // Cache cards signature to eliminate unnecessary DOM re-rendering and flickering
        const cardsSignature = `${state.feedSubjectFilter}_${state.feedTypeFilter}_${(state.feedSearchQuery || "").trim()}_${filtered.map((r) => `${r.id}_${r.type}_${r.hours}_${r.subjectCode}_${r.date}_${r.dayOrder}_${r.notes || ""}`).join("|")}`;

        if (contentArea.dataset.cardsSignature === cardsSignature) {
          return;
        }
        contentArea.dataset.cardsSignature = cardsSignature;

        if (filtered.length === 0) {
          contentArea.innerHTML = `
            <div class="sp-odml-feed-no-results">
              <div class="sp-odml-feed-no-results-text">No records match your filter or search.</div>
              <button type="button" class="sp-odml-feed-reset-btn" id="spOdmlFeedResetFilterBtn">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                <span>Reset Filter &amp; Search</span>
              </button>
            </div>
          `;

          const resetBtn = contentArea.querySelector("#spOdmlFeedResetFilterBtn");
          if (resetBtn) {
            resetBtn.onclick = () => {
              state.feedSubjectFilter = "ALL";
              state.feedTypeFilter = "ALL";
              state.feedSearchQuery = "";
              const statStation = container.querySelector("#spOdmlAnalyticsStation");
              if (statStation) {
                delete statStation.dataset.stationSignature;
              }
              updateTopHeaderContents(container, subjects);
            };
          }
          return;
        }

        contentArea.innerHTML = `
          <div class="sp-odml-feed-list">
            ${filtered
              .map((r) => {
                const isOd = r.type === "OD";
                const typeBadgeClass = isOd ? "sp-odml-feed-type-od" : "sp-odml-feed-type-ml";
                const tagClass = getTagClass(r.notes);
                const { displayCode, displayFullName } = getRecordSubjectInfo(r);

                const isHolidayRec = (r.dayOrder || "").toLowerCase().includes("holiday");
                const doChipHtml = isHolidayRec
                  ? `<div class="sp-odml-feed-holiday-chip" title="${escapeHtml(r.dayOrder)}">${escapeHtml(r.dayOrder)}</div>`
                  : `<div class="sp-odml-feed-do-chip">${escapeHtml(r.dayOrder && r.dayOrder.startsWith("DO") ? r.dayOrder : `DO ${r.dayOrder || "-"}`)}</div>`;

                return `
                  <div class="sp-odml-feed-card" data-id="${r.id}">
                    <div class="sp-odml-feed-card-left">
                      <div class="sp-odml-feed-date-chip">${formatHumanDate(r.date)}</div>
                      ${doChipHtml}
                    </div>

                    <div class="sp-odml-feed-card-main">
                      <div class="sp-odml-feed-subj-line">
                        <span class="sp-odml-feed-code-box">${escapeHtml(displayCode)}</span>
                        <span class="sp-odml-feed-subj-name" title="${escapeHtml(displayCode)} - ${escapeHtml(displayFullName)}">
                          ${escapeHtml(displayFullName)}
                        </span>
                      </div>
                      <div class="sp-odml-feed-meta-line">
                        ${
                          r.notes
                            ? `<span class="sp-odml-tag-badge ${tagClass}" title="${escapeHtml(r.notes)}">${escapeHtml(r.notes)}</span>`
                            : `<span class="sp-odml-feed-no-note">No reason note</span>`
                        }
                      </div>
                    </div>

                    <div class="sp-odml-feed-card-right">
                      <span class="sp-odml-feed-type-badge ${typeBadgeClass}">
                        ${r.type}
                      </span>
                      <span class="sp-odml-feed-hrs-badge">+${r.hours}h</span>
                      <button type="button" class="sp-odml-feed-del-btn" data-id="${r.id}" title="Delete record" aria-label="Delete">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        `;

        // Attach delete listeners
        contentArea.querySelectorAll(".sp-odml-feed-del-btn").forEach((btn) => {
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = btn.dataset.id;
            state.records = state.records.filter((r) => r.id !== id);
            saveStoredData();
            updateTopHeaderContents(container, subjects);
            enhanceMarginCellsWithOdMl();
          };
        });
      }

      if (totalRecords === 0) {
        if (historyContainer.dataset.renderedSignature !== "EMPTY") {
          historyContainer.dataset.renderedSignature = "EMPTY";
          state.feedSubjectFilter = "ALL";
          state.feedTypeFilter = "ALL";
          state.feedSearchQuery = "";
          historyContainer.innerHTML = `
            <div class="sp-odml-feed-card-panel">
              <div class="sp-odml-feed-header">
                <div class="sp-odml-feed-title-wrap">
                  <span class="sp-odml-feed-title">OD/ML Records</span>
                  <span class="sp-odml-feed-count-badge">0 entries</span>
                  <span class="sp-odml-feed-hrs-badge">+0 hrs</span>
                </div>
              </div>
              <div class="sp-odml-feed-empty-state">
                <div class="sp-odml-empty-icon-wrap">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div class="sp-odml-empty-title">No OD/ML Added</div>
                <div class="sp-odml-empty-desc">
                  Select an enrolled course above and apply OD or ML hours to simulate attendance margin impact.
                </div>
              </div>
            </div>
          `;
        }
      } else {
        // If transitioning from empty or not yet initialized as feed panel, render panel shell
        if (historyContainer.dataset.renderedSignature !== "FEED_PANEL") {
          historyContainer.dataset.renderedSignature = "FEED_PANEL";

          historyContainer.innerHTML = `
            <div class="sp-odml-feed-card-panel">
              <div class="sp-odml-feed-header">
                <div class="sp-odml-feed-title-wrap">
                  <span class="sp-odml-feed-title">OD/ML Records</span>
                  <span class="sp-odml-feed-count-badge" id="spOdmlFeedCountBadge">${totalRecords} ${totalRecords === 1 ? "entry" : "entries"}</span>
                  <span class="sp-odml-feed-hrs-badge" id="spOdmlFeedHrsBadge">+${totalHours} hrs</span>
                </div>
                <button type="button" class="sp-odml-feed-clear-btn" id="sp-odml-clear-all-btn" title="Clear all logged records">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Clear All</span>
                </button>
              </div>

              <!-- Feed Content Area -->
              <div class="sp-odml-feed-content-area" id="spOdmlFeedContentArea"></div>
            </div>
          `;

          const clearBtn = historyContainer.querySelector("#sp-odml-clear-all-btn");
          if (clearBtn) {
            clearBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm("Are you sure you want to clear all logged OD / ML records?")) {
                state.records = [];
                state.feedSubjectFilter = "ALL";
                state.feedTypeFilter = "ALL";
                state.feedSearchQuery = "";
                saveStoredData();
                const statStation = container.querySelector("#spOdmlAnalyticsStation");
                if (statStation) {
                  delete statStation.dataset.stationSignature;
                }
                updateTopHeaderContents(container, subjects);
                enhanceMarginCellsWithOdMl();
              }
            };
          }
        } else {
          // If already rendered, update hours badge smoothly
          const hrsBadge = historyContainer.querySelector("#spOdmlFeedHrsBadge");
          if (hrsBadge) hrsBadge.textContent = `+${totalHours} hrs`;
        }

        // Render card items (guarded by cardsSignature)
        renderCardsList();
      }
    }

    // 5. Populate Analytics & Tools Station (Right side widget)
    const analyticsStation = container.querySelector("#spOdmlAnalyticsStation");
    if (analyticsStation) {
      const table = findAttendanceTable();
      const currentSubjects = subjects && subjects.length > 0 ? subjects : extractSubjectsFromTable(table);

      const odHours = state.records.filter((r) => r.type === "OD").reduce((sum, r) => sum + (parseInt(r.hours, 10) || 0), 0);
      const mlHours = state.records.filter((r) => r.type === "ML").reduce((sum, r) => sum + (parseInt(r.hours, 10) || 0), 0);

      const creditedSubjCodes = new Set(state.records.map((r) => r.subjectCode));
      const totalCreditedSubjects = creditedSubjCodes.size;
      const totalSubjectsCount = currentSubjects ? currentSubjects.length : 0;
      const totalRecords = state.records.length;

      // Extract unique subjects added to records
      const addedSubjectsMap = new Map();
      let totalOdRecords = 0;
      let totalMlRecords = 0;

      state.records.forEach((r) => {
        if (r.type === "OD") totalOdRecords++;
        if (r.type === "ML") totalMlRecords++;

        const code = r.subjectCode || "OTHER";
        if (!addedSubjectsMap.has(code)) {
          let displayFullName = r.subjectFullName || "";
          const matched = currentSubjects ? currentSubjects.find((s) => s.code === r.subjectCode) : null;
          if (matched && matched.fullName && matched.fullName !== matched.code) {
            displayFullName = matched.fullName;
          } else if (matched && matched.displayName && matched.displayName !== matched.code) {
            displayFullName = matched.displayName;
          }
          if (!displayFullName) displayFullName = code;
          addedSubjectsMap.set(code, {
            code,
            name: displayFullName,
            count: 1,
          });
        } else {
          addedSubjectsMap.get(code).count++;
        }
      });

      const searchInputEl = analyticsStation.querySelector("#spOdmlStationSearchInput");
      const isSearchFocused = searchInputEl && (searchInputEl === document.activeElement || searchInputEl.contains(document.activeElement));

      const subjectsSignature = Array.from(addedSubjectsMap.entries())
        .map(([k, v]) => `${k}:${v.count}:${v.name}`)
        .join(";");

      const currentStationSignature = `${totalRecords}_${odHours}_${mlHours}_${totalCreditedSubjects}_${state.feedSubjectFilter}_${state.feedTypeFilter}_${(state.feedSearchQuery || "").trim()}_${subjectsSignature}_${state.filterChipsExpanded ? "EXP" : "COL"}`;

      // Only rebuild station if signature changed and search input is not currently focused (prevent flickering / focus loss)
      if (!isSearchFocused && analyticsStation.dataset.stationSignature !== currentStationSignature) {
        analyticsStation.dataset.stationSignature = currentStationSignature;

        let filterSearchSectionHtml = "";
        const addedSubjects = Array.from(addedSubjectsMap.values());

        function buildSubjectChipsHtml() {
          const allChip = `<button type="button" class="sp-odml-filter-chip sp-odml-chip-all ${state.feedSubjectFilter === "ALL" ? "is-active" : ""}" data-subject="ALL" title="Show all courses">
            <span>All Courses</span>
            <span class="sp-odml-chip-count">${totalRecords}</span>
          </button>`;

          const subjectChips = addedSubjects.map(
            (s, idx) => `<button type="button" class="sp-odml-filter-chip sp-odml-chip-color-${idx % 6} ${s.code === state.feedSubjectFilter ? "is-active" : ""}" data-subject="${escapeHtml(s.code)}" title="${escapeHtml(s.name)}">
              <span class="sp-odml-chip-name">${escapeHtml(s.name)}</span>
              <span class="sp-odml-chip-count">${s.count}</span>
            </button>`
          );

          const allChips = [allChip, ...subjectChips];
          if (allChips.length <= 2) {
            return allChips.join("");
          }

          if (state.filterChipsExpanded) {
            return allChips.join("") + `<button type="button" class="sp-odml-chips-expand-btn is-expanded" id="spOdmlChipsExpandBtn" title="Collapse course filters"><span>&lt;&lt;</span></button>`;
          }

          // 2-chip style collapsed display: show 2 chips + ">>" button
          let firstTwo = [allChips[0], allChips[1]];
          const activeSubjIdx = addedSubjects.findIndex((s) => s.code === state.feedSubjectFilter);
          if (activeSubjIdx > 0) {
            firstTwo = [allChips[0], subjectChips[activeSubjIdx]];
          }
          return firstTwo.join("") + `<button type="button" class="sp-odml-chips-expand-btn" id="spOdmlChipsExpandBtn" title="Show all course filters"><span>&gt;&gt;</span></button>`;
        }

        if (totalRecords > 0) {
          filterSearchSectionHtml = `
            <div class="sp-odml-station-search-filter-wrap" id="spOdmlStationSearchFilterWrap">
              <!-- Row 1: Filter Header with Title & OD/ML Type Chips -->
              <div class="sp-odml-station-filter-header">
                <div class="sp-odml-station-filter-title-wrap">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                  <span class="sp-odml-station-filter-title">Filter</span>
                </div>
                <div class="sp-odml-chips-right-group">
                  <button type="button" class="sp-odml-filter-chip sp-odml-type-filter-chip sp-odml-type-chip-od ${state.feedTypeFilter === "OD" ? "is-active" : ""}" data-type="OD" title="Filter by On-Duty (OD)">
                    <span class="sp-odml-type-dot od-dot"></span>
                    <span>OD</span>
                    <span class="sp-odml-chip-count">${totalOdRecords}</span>
                  </button>
                  <button type="button" class="sp-odml-filter-chip sp-odml-type-filter-chip sp-odml-type-chip-ml ${state.feedTypeFilter === "ML" ? "is-active" : ""}" data-type="ML" title="Filter by Medical Leave (ML)">
                    <span class="sp-odml-type-dot ml-dot"></span>
                    <span>ML</span>
                    <span class="sp-odml-chip-count">${totalMlRecords}</span>
                  </button>
                </div>
              </div>

              <!-- Row 2: Search input + Search button -->
              <div class="sp-odml-feed-search-row">
                <div class="sp-odml-feed-search-box">
                  <svg class="sp-odml-feed-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input 
                    type="text" 
                    class="sp-odml-feed-search-input" 
                    id="spOdmlStationSearchInput" 
                    placeholder="Search by course, reason, date..." 
                    value="${escapeHtml(state.feedSearchQuery || "")}" 
                    title="Search by subject name, code, reason, or date"
                    autocomplete="off"
                  />
                  <button type="button" class="sp-odml-feed-search-clear-btn ${state.feedSearchQuery ? "is-visible" : ""}" id="spOdmlStationSearchClearBtn" title="Clear search">✕</button>
                </div>
                <button type="button" class="sp-odml-feed-search-btn" id="spOdmlStationSearchBtn" title="Search multiple added records">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>Search</span>
                </button>
              </div>

              <!-- Row 3: Subject Filter Chips (2-chip style + expand) -->
              <div class="sp-odml-station-chips-box" id="spOdmlStationChipsBox">
                ${buildSubjectChipsHtml()}
              </div>

              <div class="sp-odml-station-divider"></div>
            </div>
          `;
        }

        analyticsStation.innerHTML = `
          <div class="sp-odml-analytics-card">
            ${filterSearchSectionHtml}

            <!-- 3 Dedicated Metrics: Total OD Hours, Total Med Hours, and Total Courses Added -->
            <div class="sp-odml-analytics-stat-stack">
              <!-- 1. Total OD Hours -->
              <div class="sp-odml-stat-row is-od">
                <div class="sp-odml-stat-row-left">
                  <div class="sp-odml-stat-icon-wrap is-od">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div class="sp-odml-stat-info">
                    <span class="sp-odml-stat-label">Total OD Hours</span>
                    <span class="sp-odml-stat-sub">On-Duty leave added</span>
                  </div>
                </div>
                <div class="sp-odml-stat-val is-od">${odHours > 0 ? `+${odHours}h` : "0h"}</div>
              </div>

              <!-- 2. Total Med Hours -->
              <div class="sp-odml-stat-row is-ml">
                <div class="sp-odml-stat-row-left">
                  <div class="sp-odml-stat-icon-wrap is-ml">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d1938" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                  <div class="sp-odml-stat-info">
                    <span class="sp-odml-stat-label">Total Med Hours</span>
                    <span class="sp-odml-stat-sub">Medical leave added</span>
                  </div>
                </div>
                <div class="sp-odml-stat-val is-ml">${mlHours > 0 ? `+${mlHours}h` : "0h"}</div>
              </div>

              <!-- 3. Total Courses Added -->
              <div class="sp-odml-stat-row is-courses">
                <div class="sp-odml-stat-row-left">
                  <div class="sp-odml-stat-icon-wrap is-courses">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                  </div>
                  <div class="sp-odml-stat-info">
                    <span class="sp-odml-stat-label">Total Courses Added</span>
                    <span class="sp-odml-stat-sub">${totalSubjectsCount > 0 ? `${totalCreditedSubjects} of ${totalSubjectsCount} courses added` : "Courses with OD/ML added"}</span>
                  </div>
                </div>
                <div class="sp-odml-stat-val is-courses">${totalCreditedSubjects}</div>
              </div>
            </div>
          </div>
        `;

        // Attach listeners for filter chips, search input & search buttons in station
        if (totalRecords > 0) {
          function updateFeedCountBadge() {
            const historyCont = container.querySelector("#sp-odml-history-container");
            if (!historyCont) return;
            const badge = historyCont.querySelector("#spOdmlFeedCountBadge");
            if (!badge) return;
            const filt = getFilteredRecords();
            const isFiltered = (state.feedSubjectFilter && state.feedSubjectFilter !== "ALL") ||
                               (state.feedTypeFilter && state.feedTypeFilter !== "ALL") ||
                               Boolean(state.feedSearchQuery && state.feedSearchQuery.trim());
            badge.textContent = isFiltered
              ? `${filt.length} of ${totalRecords} ${totalRecords === 1 ? "entry" : "entries"}`
              : `${totalRecords} ${totalRecords === 1 ? "entry" : "entries"}`;
          }

          function renderSubjectChipsBox() {
            const chipsBox = analyticsStation.querySelector("#spOdmlStationChipsBox");
            if (!chipsBox) return;
            chipsBox.innerHTML = buildSubjectChipsHtml();

            chipsBox.querySelectorAll(".sp-odml-filter-chip[data-subject]").forEach((chip) => {
              chip.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetSubject = chip.dataset.subject;
                state.feedSubjectFilter = targetSubject;

                if (state.feedTypeFilter !== "ALL" && targetSubject !== "ALL") {
                  const hasMatching = state.records.some(
                    (r) => r.subjectCode === targetSubject && (r.type || "").trim().toUpperCase() === state.feedTypeFilter.toUpperCase()
                  );
                  if (!hasMatching) {
                    state.feedTypeFilter = "ALL";
                    analyticsStation.querySelectorAll(".sp-odml-type-filter-chip").forEach((c) => {
                      c.classList.remove("is-active");
                    });
                  }
                }

                renderSubjectChipsBox();
                updateFeedCountBadge();
                renderCardsList();
              };
            });

            const expandBtn = chipsBox.querySelector("#spOdmlChipsExpandBtn");
            if (expandBtn) {
              expandBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                state.filterChipsExpanded = !state.filterChipsExpanded;
                renderSubjectChipsBox();
              };
            }
          }

          // 1. Initial render & bind of subject chips
          renderSubjectChipsBox();

          // 2. OD / ML type filter chips listeners
          analyticsStation.querySelectorAll(".sp-odml-type-filter-chip").forEach((chip) => {
            chip.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const targetType = chip.dataset.type;
              state.feedTypeFilter = state.feedTypeFilter === targetType ? "ALL" : targetType;

              if (state.feedTypeFilter !== "ALL" && state.feedSubjectFilter !== "ALL") {
                const hasMatching = state.records.some(
                  (r) => r.subjectCode === state.feedSubjectFilter && (r.type || "").trim().toUpperCase() === state.feedTypeFilter.toUpperCase()
                );
                if (!hasMatching) {
                  state.feedSubjectFilter = "ALL";
                }
              }

              analyticsStation.querySelectorAll(".sp-odml-type-filter-chip").forEach((c) => {
                c.classList.toggle("is-active", c.dataset.type === state.feedTypeFilter);
              });

              renderSubjectChipsBox();
              updateFeedCountBadge();
              renderCardsList();
            };
          });

          // 3. Search input & buttons listeners (Debounced for silky-smooth typing)
          const searchInput = analyticsStation.querySelector("#spOdmlStationSearchInput");
          const searchBtn = analyticsStation.querySelector("#spOdmlStationSearchBtn");
          const searchClearBtn = analyticsStation.querySelector("#spOdmlStationSearchClearBtn");
          let searchDebounceTimer = null;

          if (searchInput) {
            searchInput.oninput = () => {
              state.feedSearchQuery = searchInput.value;
              if (searchClearBtn) {
                searchClearBtn.classList.toggle("is-visible", Boolean(searchInput.value.trim()));
              }
              clearTimeout(searchDebounceTimer);
              searchDebounceTimer = setTimeout(() => {
                updateFeedCountBadge();
                renderCardsList();
              }, 75);
            };
            searchInput.onkeydown = (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                clearTimeout(searchDebounceTimer);
                state.feedSearchQuery = searchInput.value;
                updateFeedCountBadge();
                renderCardsList();
              }
            };
          }

          if (searchBtn && searchInput) {
            searchBtn.onclick = (e) => {
              e.preventDefault();
              clearTimeout(searchDebounceTimer);
              state.feedSearchQuery = searchInput.value;
              updateFeedCountBadge();
              renderCardsList();
            };
          }

          if (searchClearBtn && searchInput) {
            searchClearBtn.onclick = (e) => {
              e.preventDefault();
              clearTimeout(searchDebounceTimer);
              searchInput.value = "";
              state.feedSearchQuery = "";
              searchClearBtn.classList.remove("is-visible");
              updateFeedCountBadge();
              renderCardsList();
              searchInput.focus();
            };
          }
        }
      }
    }
  }

  /**
   * Helper: Updates Day Order and Holiday status when Date changes
   */
  function handleDateChange(newDateStr, container) {
    state.selectedDate = newDateStr;

    // Auto-sync day order & holiday status from calendar
    const entry = getCalendarEntryForDate(newDateStr);
    if (entry && entry.isHoliday) {
      state.isHoliday = true;
      state.holidayDisplayText = entry.holidayDisplayText || `Holiday - ${entry.holidayReason || "Holiday"}`;
      state.dayOrder = null;
    } else {
      state.isHoliday = false;
      state.holidayDisplayText = "";
      state.dayOrder = null; // STRICT USER RULE: Never automatically pre-selected; user must manually pick!
    }

    if (!container) container = document.getElementById("sp-odml-top-container");
    if (container) {
      const btnToday = container.querySelector("#spOdmlQuickToday");
      const btnYest = container.querySelector("#spOdmlQuickYest");
      if (btnToday) btnToday.classList.toggle("active", state.selectedDate === getTodayDateString(0));
      if (btnYest) btnYest.classList.toggle("active", state.selectedDate === getTodayDateString(-1));

      const bannerDateSpan = container.querySelector("#sp-odml-banner-date-text");
      if (bannerDateSpan) bannerDateSpan.textContent = formatHumanDate(state.selectedDate);

      const dateValDisplay = container.querySelector("#spOdmlDateValDisplay");
      if (dateValDisplay) dateValDisplay.textContent = formatHumanDate(state.selectedDate);

      const dateInpEl = container.querySelector("#sp-odml-date-input");
      if (dateInpEl && dateInpEl.value !== state.selectedDate) {
        dateInpEl.value = state.selectedDate;
      }

      const bannerDoCapsule = container.querySelector("#spOdmlBannerDoCapsule");
      const bannerDoSpan = container.querySelector("#sp-odml-banner-dayorder-text");
      if (bannerDoSpan) {
        if (state.isHoliday) {
          bannerDoSpan.textContent = state.holidayDisplayText;
          if (bannerDoCapsule) {
            bannerDoCapsule.className = "sp-odml-capsule sp-odml-capsule-holiday";
            bannerDoCapsule.title = state.holidayDisplayText;
          }
        } else if (state.dayOrder) {
          bannerDoSpan.textContent = `Day Order ${state.dayOrder}`;
          if (bannerDoCapsule) {
            bannerDoCapsule.className = "sp-odml-capsule sp-odml-capsule-do";
            bannerDoCapsule.title = `Day Order ${state.dayOrder}`;
          }
        } else {
          bannerDoSpan.textContent = "Select Day Order";
          if (bannerDoCapsule) {
            bannerDoCapsule.className = "sp-odml-capsule sp-odml-capsule-unpicked";
            bannerDoCapsule.title = "Please pick a Day Order (1 to 5)";
          }
        }
      }

      const doStatusBadge = container.querySelector("#spOdmlDoStatusBadge");
      if (doStatusBadge) {
        if (state.isHoliday) {
          doStatusBadge.className = "sp-odml-do-status-badge is-holiday";
          doStatusBadge.textContent = state.holidayDisplayText;
        } else if (state.dayOrder) {
          doStatusBadge.className = "sp-odml-do-status-badge is-picked";
          doStatusBadge.textContent = `DO ${state.dayOrder}`;
        } else {
          doStatusBadge.className = "sp-odml-do-status-badge is-unpicked";
          doStatusBadge.textContent = "Pick Day Order";
        }
      }

      const doStrip = container.querySelector("#spOdmlDoStrip");
      if (doStrip) {
        doStrip.classList.toggle("is-unpicked", !state.isHoliday && !state.dayOrder);
      }

      const previewSpan = container.querySelector("#spOdmlHumanDatePreview");
      if (previewSpan) {
        if (state.isHoliday) {
          previewSpan.textContent = `${getHumanDayAndDate(state.selectedDate)} • ${state.holidayDisplayText}`;
          previewSpan.classList.add("is-holiday");
        } else {
          previewSpan.textContent = getHumanDayAndDate(state.selectedDate);
          previewSpan.classList.remove("is-holiday");
        }
      }

      const holidayBadge = container.querySelector("#spOdmlHolidayBadge");
      if (holidayBadge) {
        if (state.isHoliday) {
          holidayBadge.textContent = state.holidayDisplayText;
          holidayBadge.style.display = "inline-flex";
        } else {
          holidayBadge.style.display = "none";
        }
      }

      container.querySelectorAll(".sp-odml-do-track-btn, .sp-odml-do-btn").forEach((b) => {
        b.classList.toggle("active", !state.isHoliday && Boolean(state.dayOrder) && b.dataset.do === String(state.dayOrder));
      });
    }

    saveStoredData();
  }

  /**
   * Attach Interactive Event Listeners
   */
  function attachTopHeaderEvents(container) {
    if (!container) return;

    // 1. Expand / Collapse Header Button
    const toggleBtn = container.querySelector("#sp-odml-toggle-btn");
    if (toggleBtn) {
      toggleBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleHeaderExpanded();
      };
    }

    // 2. Shifted Action Button in Banner: Toggle OD_ML Column in Table
    const bannerColBtn = container.querySelector("#spOdmlBannerColToggleBtn");
    if (bannerColBtn) {
      bannerColBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMarginColumn();
      };
    }

    // 3. Quick Date Buttons (Today / Yesterday) & Styled Date Picker
    const btnToday = container.querySelector("#spOdmlQuickToday");
    const btnYest = container.querySelector("#spOdmlQuickYest");
    const btnCalAction = container.querySelector("#spOdmlDateCalActionBtn");
    const dateInp = container.querySelector("#sp-odml-date-input");
    const dateCapsule = container.querySelector("#spOdmlDateCapsule");

    function openCalendarPicker() {
      if (!dateInp) return;
      try {
        if (typeof dateInp.showPicker === "function") {
          dateInp.showPicker();
          return;
        }
      } catch (err) {}
      try {
        dateInp.focus();
      } catch (_) {}
    }

    if (btnCalAction) {
      btnCalAction.onclick = () => {
        openCalendarPicker();
      };
    }

    if (dateCapsule && dateInp) {
      dateCapsule.onclick = (e) => {
        if (e.target !== dateInp) {
          openCalendarPicker();
        }
      };
    }

    if (dateInp) {
      dateInp.oninput = (e) => {
        if (e.target.value) handleDateChange(e.target.value, container);
      };
      dateInp.onchange = (e) => {
        if (e.target.value) handleDateChange(e.target.value, container);
      };
    }

    if (btnToday && dateInp) {
      btnToday.onclick = () => {
        dateInp.value = getTodayDateString(0);
        handleDateChange(dateInp.value, container);
      };
    }

    if (btnYest && dateInp) {
      btnYest.onclick = () => {
        dateInp.value = getTodayDateString(-1);
        handleDateChange(dateInp.value, container);
      };
    }

    // 4. Day Order 5-Button Strip & Deselect Handler
    function syncDayOrderTrackUI() {
      container.querySelectorAll(".sp-odml-do-track-btn, .sp-odml-do-btn").forEach((btn) => {
        const isAct = !state.isHoliday && Boolean(state.dayOrder) && state.dayOrder === btn.dataset.do;
        btn.classList.toggle("active", isAct);
        btn.textContent = btn.dataset.do;
      });

      const doStrip = container.querySelector("#spOdmlDoStrip");
      if (doStrip) {
        doStrip.classList.toggle("is-unpicked", !state.isHoliday && !state.dayOrder);
        if (state.dayOrder) doStrip.classList.remove("is-glow-alert");
      }

      const deselectBtn = container.querySelector("#spOdmlDoDeselectBtn");
      if (deselectBtn) {
        deselectBtn.style.display = "none";
      }

      const doBadge = container.querySelector("#spOdmlDoStatusBadge");
      if (doBadge) {
        if (state.isHoliday) {
          doBadge.className = "sp-odml-do-status-badge is-holiday";
          doBadge.textContent = state.holidayDisplayText;
        } else if (state.dayOrder) {
          doBadge.className = "sp-odml-do-status-badge is-picked";
          doBadge.textContent = `DO ${state.dayOrder}`;
        } else {
          doBadge.className = "sp-odml-do-status-badge is-unpicked";
          doBadge.textContent = "Unpicked";
        }
      }

      const holidayBadge = container.querySelector("#spOdmlHolidayBadge");
      if (holidayBadge) holidayBadge.style.display = state.isHoliday ? "inline-flex" : "none";

      const bannerDoCapsule = container.querySelector("#spOdmlBannerDoCapsule");
      const doSpan = container.querySelector("#sp-odml-banner-dayorder-text");
      if (doSpan) {
        if (state.isHoliday) {
          doSpan.textContent = state.holidayDisplayText;
          if (bannerDoCapsule) {
            bannerDoCapsule.className = "sp-odml-capsule sp-odml-capsule-holiday";
            bannerDoCapsule.title = state.holidayDisplayText;
          }
        } else if (state.dayOrder) {
          doSpan.textContent = `Day Order ${state.dayOrder}`;
          if (bannerDoCapsule) {
            bannerDoCapsule.className = "sp-odml-capsule sp-odml-capsule-do";
            bannerDoCapsule.title = `Day Order ${state.dayOrder}`;
          }
        } else {
          doSpan.textContent = "Select Day Order";
          if (bannerDoCapsule) {
            bannerDoCapsule.className = "sp-odml-capsule sp-odml-capsule-unpicked";
            bannerDoCapsule.title = "Please pick a Day Order (1 to 5)";
          }
        }
      }

      const previewSpan = container.querySelector("#spOdmlHumanDatePreview");
      if (previewSpan) {
        if (state.isHoliday) {
          previewSpan.textContent = `${getHumanDayAndDate(state.selectedDate)} • ${state.holidayDisplayText}`;
          previewSpan.classList.add("is-holiday");
        } else {
          previewSpan.textContent = getHumanDayAndDate(state.selectedDate);
          previewSpan.classList.remove("is-holiday");
        }
      }
    }

    container.querySelectorAll(".sp-odml-do-track-btn, .sp-odml-do-btn").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.dayOrder === btn.dataset.do) {
          // Deselect Day Order on clicking active button or cross
          state.dayOrder = null;
        } else {
          state.isHoliday = false;
          state.holidayDisplayText = "";
          state.dayOrder = btn.dataset.do;
        }
        syncDayOrderTrackUI();
        saveStoredData();
      };
    });

    const deselectDoBtn = container.querySelector("#spOdmlDoDeselectBtn");
    if (deselectDoBtn) {
      deselectDoBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.dayOrder = null;
        syncDayOrderTrackUI();
        saveStoredData();
      };
    }

    // Target Course Deselect Button Handler
    const deselectCourseBtn = container.querySelector("#spOdmlCourseDeselectBtn");
    if (deselectCourseBtn) {
      deselectCourseBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.selectedSubjectCode = "";
        const courseDropdown = container.querySelector("#spOdmlCustomCourseDropdown");
        if (courseDropdown) courseDropdown.classList.remove("is-open");
        const table = findAttendanceTable();
        const subjects = extractSubjectsFromTable(table);
        updateTopHeaderContents(container, subjects);
      };
    }

    // 6. Subject Selector & Boxed Custom Dropdown Trigger
    const courseDropdown = container.querySelector("#spOdmlCustomCourseDropdown");
    const courseTrigger = container.querySelector("#spOdmlCourseTrigger");
    if (courseTrigger && courseDropdown) {
      courseTrigger.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = courseDropdown.classList.toggle("is-open");
        courseTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
        if (isOpen) {
          const table = findAttendanceTable();
          const subjects = extractSubjectsFromTable(table);
          updateTopHeaderContents(container, subjects);
        }
      };

      document.addEventListener("click", (e) => {
        if (!courseDropdown.contains(e.target)) {
          courseDropdown.classList.remove("is-open");
          courseTrigger.setAttribute("aria-expanded", "false");
        }
      });
    }

    const subjSelect = container.querySelector("#sp-odml-subject-select");
    if (subjSelect) {
      subjSelect.onchange = (e) => {
        state.selectedSubjectCode = e.target.value;
        const table = findAttendanceTable();
        const subjects = extractSubjectsFromTable(table);
        updateTopHeaderContents(container, subjects);
      };
    }

    // 7. Leave Type (OD vs ML)
    const typeOdBtn = container.querySelector("#sp-odml-type-od");
    const typeMlBtn = container.querySelector("#sp-odml-type-ml");
    if (typeOdBtn && typeMlBtn) {
      typeOdBtn.onclick = () => {
        state.selectedType = "OD";
        typeOdBtn.classList.add("active");
        typeMlBtn.classList.remove("active");
        updateSubmitButtonAndPreview(container);
      };
      typeMlBtn.onclick = () => {
        state.selectedType = "ML";
        typeMlBtn.classList.add("active");
        typeOdBtn.classList.remove("active");
        updateSubmitButtonAndPreview(container);
      };
    }

    // 8. Hours (+1 vs +2)
    const hrs1Btn = container.querySelector("#sp-odml-hrs-1");
    const hrs2Btn = container.querySelector("#sp-odml-hrs-2");
    if (hrs1Btn && hrs2Btn) {
      hrs1Btn.onclick = () => {
        state.selectedHours = 1;
        hrs1Btn.classList.add("active");
        hrs2Btn.classList.remove("active");
        updateSubmitButtonAndPreview(container);
      };
      hrs2Btn.onclick = () => {
        state.selectedHours = 2;
        hrs2Btn.classList.add("active");
        hrs1Btn.classList.remove("active");
        updateSubmitButtonAndPreview(container);
      };
    }

    // 9. Comment Input & Preset Tags Strip
    const commentInp = container.querySelector("#sp-odml-comment-input");
    const tagBtns = container.querySelectorAll(".sp-odml-tag-btn");

    function syncPresetCompulsoryState() {
      const isPicked = Boolean(state.activeTag && state.activeTag !== "custom") || Boolean(state.commentText && state.commentText.trim());
      const tagsStrip = container.querySelector("#spOdmlReasonTagsStrip");
      const presetBadge = container.querySelector("#spOdmlPresetStatusBadge");
      if (tagsStrip) {
        tagsStrip.classList.toggle("is-unpicked", !isPicked);
        if (isPicked) tagsStrip.classList.remove("is-glow-alert");
      }
      if (presetBadge) {
        presetBadge.className = isPicked ? "sp-odml-preset-status-badge is-picked" : "sp-odml-preset-status-badge is-unpicked";
        presetBadge.textContent = state.activeTag === "custom"
          ? (isPicked ? "Custom Reason" : "Type Reason")
          : (state.activeTag || (state.commentText.trim() ? "Reason Entered" : "Pick Preset"));
      }
    }

    tagBtns.forEach((btn) => {
      btn.onclick = () => {
        const tag = btn.dataset.tag;
        tagBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.activeTag = tag;

        if (tag === "custom") {
          if (commentInp) {
            commentInp.focus();
          }
        } else {
          state.commentText = tag;
          if (commentInp) {
            commentInp.value = tag;
          }
        }

        syncPresetCompulsoryState();

        const clearReasonBtn = container.querySelector("#spOdmlReasonClearBtn");
        if (clearReasonBtn) {
          clearReasonBtn.style.setProperty("display", state.commentText ? "inline-flex" : "none", "important");
          clearReasonBtn.style.setProperty("align-self", "center", "important");
        }
      };
    });

    const clearReasonBtn = container.querySelector("#spOdmlReasonClearBtn");
    if (commentInp) {
      commentInp.oninput = (e) => {
        state.commentText = e.target.value;
        if (clearReasonBtn) {
          clearReasonBtn.style.setProperty("display", state.commentText ? "inline-flex" : "none", "important");
          clearReasonBtn.style.setProperty("align-self", "center", "important");
        }
        const matchingBtn = Array.from(tagBtns).find((b) => b.dataset.tag.toLowerCase() === state.commentText.trim().toLowerCase());
        tagBtns.forEach((b) => b.classList.remove("active"));
        if (matchingBtn) {
          matchingBtn.classList.add("active");
          state.activeTag = matchingBtn.dataset.tag;
        } else if (state.commentText.trim()) {
          const customBtn = container.querySelector('.sp-odml-tag-btn[data-tag="custom"]');
          if (customBtn) customBtn.classList.add("active");
          state.activeTag = "custom";
        } else {
          state.activeTag = "";
        }

        syncPresetCompulsoryState();
      };
    }

    if (clearReasonBtn && commentInp) {
      clearReasonBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        commentInp.value = "";
        state.commentText = "";
        state.activeTag = "";
        clearReasonBtn.style.display = "none";
        tagBtns.forEach((b) => b.classList.remove("active"));

        syncPresetCompulsoryState();
        commentInp.focus();
      };
    }

    // 9.5. Personal Note Controls (Real-time Rich Text Notepad & On-demand Popup)
    const noteEditor = container.querySelector("#spOdmlPersonalNoteInput");
    const noteStatusHint = container.querySelector("#spOdmlNoteStatusHint");
    const noteResetBtn = container.querySelector("#spOdmlNoteResetBtn");
    const noteSaveBtn = container.querySelector("#spOdmlNoteSaveBtn");
    const notePopupBtn = container.querySelector("#spOdmlNotePopupTriggerBtn");

    // Compact Mini Tools
    const miniBoldBtn = container.querySelector("#spOdmlMiniBold");
    const miniItalicBtn = container.querySelector("#spOdmlMiniItalic");
    const miniUnderlineBtn = container.querySelector("#spOdmlMiniUnderline");
    const miniStrikeBtn = container.querySelector("#spOdmlMiniStrike");
    const miniPointsBtn = container.querySelector("#spOdmlMiniPoints");

    // Modal elements
    const noteModal = container.querySelector("#spOdmlPersonalNoteModal");

    // Anchor Personal Note modal directly to document.body so position: fixed is 100% viewport-relative
    if (noteModal) {
      const oldModal = document.getElementById("spOdmlPersonalNoteModal");
      if (oldModal && oldModal !== noteModal) {
        oldModal.remove();
      }
      document.body.appendChild(noteModal);
    }

    const modalDialog = noteModal?.querySelector(".sp-odml-modal-dialog");
    const modalHeader = noteModal?.querySelector("#spOdmlModalHeader");
    const modalCloseBtn = noteModal?.querySelector("#spOdmlNoteModalCloseBtn");
    const modalDoneBtn = noteModal?.querySelector("#spOdmlModalDoneBtn");
    const modalSaveBtn = noteModal?.querySelector("#spOdmlModalSaveBtn");
    const modalResetBtn = noteModal?.querySelector("#spOdmlModalResetBtn");
    const modalEditor = noteModal?.querySelector("#spOdmlModalTextarea");
    const modalFeedback = noteModal?.querySelector("#spOdmlModalFeedbackMsg");

    // Modal Formatting Toolbar buttons
    const toolBoldBtn = noteModal?.querySelector("#spOdmlToolBold");
    const toolItalicBtn = noteModal?.querySelector("#spOdmlToolItalic");
    const toolUnderlineBtn = noteModal?.querySelector("#spOdmlToolUnderline");
    const toolStrikeBtn = noteModal?.querySelector("#spOdmlToolStrike");
    const toolPointsBtn = noteModal?.querySelector("#spOdmlToolPoints");
    const toolUndoBtn = noteModal?.querySelector("#spOdmlToolUndo");
    const toolRedoBtn = noteModal?.querySelector("#spOdmlToolRedo");



    let noteAutoSaveTimer = null;
    function triggerPersonalNoteAutoSave(htmlVal) {
      state.personalNote = htmlVal;
      clearTimeout(noteAutoSaveTimer);
      if (noteStatusHint) {
        noteStatusHint.textContent = "Saving...";
        noteStatusHint.className = "sp-odml-note-status-hint is-unsaved";
      }
      noteAutoSaveTimer = setTimeout(() => {
        saveStoredData();
        if (noteStatusHint) {
          noteStatusHint.textContent = "Auto-saved ✓";
          noteStatusHint.className = "sp-odml-note-status-hint is-saved";
        }
        if (modalFeedback) {
          modalFeedback.textContent = "Auto-saved ✓";
          modalFeedback.style.display = "inline-block";
        }
      }, 250);
    }

    function getEditorContent(el) {
      if (!el || isEditorEmpty(el)) return "";
      return el.innerHTML;
    }

    function syncFromModal() {
      const html = getEditorContent(modalEditor);
      state.personalNote = html;
      if (noteEditor && !noteEditor.contains(document.activeElement) && document.activeElement !== noteEditor) {
        noteEditor.innerHTML = html;
        noteEditor.classList.toggle("is-empty", isEditorEmpty(noteEditor));
      }
      triggerPersonalNoteAutoSave(html);
    }

    function syncFromCompact() {
      const html = getEditorContent(noteEditor);
      state.personalNote = html;
      if (modalEditor && !modalEditor.contains(document.activeElement) && document.activeElement !== modalEditor) {
        modalEditor.innerHTML = html;
        modalEditor.classList.toggle("is-empty", isEditorEmpty(modalEditor));
      }
      triggerPersonalNoteAutoSave(html);
    }

    function executeRichCommand(cmd, value = null, target = null) {
      const activeEl = target || (noteModal?.classList.contains("is-open") ? modalEditor : noteEditor);
      if (!activeEl) return;
      activeEl.focus();
      document.execCommand(cmd, false, value);
      activeEl.classList.toggle("is-empty", isEditorEmpty(activeEl));
      if (activeEl === modalEditor) syncFromModal();
      else syncFromCompact();
    }

    function bindFormatBtn(btn, cmd, value = null, targetEl = null) {
      if (!btn) return;
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault(); // Prevents button from stealing focus so selection is preserved!
      });
      btn.onclick = (e) => {
        e.preventDefault();
        executeRichCommand(cmd, value, targetEl);
      };
    }

    // Modal Toolbar Buttons
    bindFormatBtn(toolBoldBtn, "bold", null, modalEditor);
    bindFormatBtn(toolItalicBtn, "italic", null, modalEditor);
    bindFormatBtn(toolUnderlineBtn, "underline", null, modalEditor);
    bindFormatBtn(toolStrikeBtn, "strikeThrough", null, modalEditor);
    bindFormatBtn(toolPointsBtn, "insertUnorderedList", null, modalEditor);
    bindFormatBtn(toolUndoBtn, "undo", null, modalEditor);
    bindFormatBtn(toolRedoBtn, "redo", null, modalEditor);

    // Compact Notepad Mini Formatting Buttons
    bindFormatBtn(miniBoldBtn, "bold", null, noteEditor);
    bindFormatBtn(miniItalicBtn, "italic", null, noteEditor);
    bindFormatBtn(miniUnderlineBtn, "underline", null, noteEditor);
    bindFormatBtn(miniStrikeBtn, "strikeThrough", null, noteEditor);
    bindFormatBtn(miniPointsBtn, "insertUnorderedList", null, noteEditor);

    function attachRichEditorEvents(editor, isModal) {
      if (!editor) return;

      // Click handler on checkboxes inside editor to toggle done / sliced
      editor.addEventListener("click", (e) => {
        const box = e.target.closest(".sp-odml-todo-box");
        if (box) {
          e.preventDefault();
          e.stopPropagation();
          const item = box.closest(".sp-odml-todo-item");
          if (item) {
            const isDone = item.getAttribute("data-done") === "true";
            const nextDone = !isDone;
            item.setAttribute("data-done", String(nextDone));
            item.classList.toggle("is-done", nextDone);
            box.textContent = nextDone ? "☑" : "☐";
            if (isModal) syncFromModal();
            else syncFromCompact();
          }
        }
      });

      // Smooth Typing & Erasing:
      // Never overwrite active editor.innerHTML on input!
      editor.addEventListener("input", () => {
        editor.classList.toggle("is-empty", isEditorEmpty(editor));
        if (isModal) syncFromModal();
        else syncFromCompact();
      });

      // Cleanup dangling tags ONLY when user leaves the editor
      editor.addEventListener("blur", () => {
        const empty = isEditorEmpty(editor);
        editor.classList.toggle("is-empty", empty);
        if (empty) {
          editor.innerHTML = "";
        }
        state.personalNote = getEditorContent(editor);
        const other = isModal ? noteEditor : modalEditor;
        if (other && !other.contains(document.activeElement) && document.activeElement !== other) {
          other.innerHTML = state.personalNote;
          other.classList.toggle("is-empty", isEditorEmpty(other));
        }
        saveStoredData();
        if (noteStatusHint) {
          noteStatusHint.textContent = "Auto-saved ✓";
          noteStatusHint.className = "sp-odml-note-status-hint is-saved";
        }
      });

      // Native Keyboard handling: Backspace, Delete, Enter, Arrows, and All Keys work 100% reliably!
      editor.addEventListener("keydown", (e) => {
        // Stop bubbling so page/document level handlers in Academia never block editor keys
        if (e.key !== "Escape") {
          e.stopPropagation();
        }

        // 1. Backspace key handling: 100% reliable character, selection, and block deletion
        if (e.key === "Backspace" || e.keyCode === 8) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            // Case A: If text is selected (range is not collapsed), delete selection immediately
            if (!sel.isCollapsed) {
              e.preventDefault();
              document.execCommand("delete", false, null);
              editor.classList.toggle("is-empty", isEditorEmpty(editor));
              if (isModal) syncFromModal();
              else syncFromCompact();
              return;
            }

            // Case B: Caret is inside a checklist item (.sp-odml-todo-item)
            const anchor = sel.anchorNode;
            const todoItem = anchor?.nodeType === Node.ELEMENT_NODE
              ? anchor.closest(".sp-odml-todo-item")
              : anchor?.parentElement?.closest(".sp-odml-todo-item");

            if (todoItem) {
              const todoText = todoItem.querySelector(".sp-odml-todo-text");
              const textVal = (todoText?.textContent || "").replace(/[\u200B-\u200D\uFEFF\s]/g, "");
              const isAtStart =
                !textVal ||
                anchor === todoItem ||
                anchor === todoText ||
                (anchor === todoText?.firstChild && sel.anchorOffset === 0);

              if (isAtStart) {
                e.preventDefault();
                const prev = todoItem.previousElementSibling;
                const next = todoItem.nextElementSibling;
                todoItem.remove();

                if (prev) {
                  const r = document.createRange();
                  r.selectNodeContents(prev);
                  r.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(r);
                } else if (next) {
                  const r = document.createRange();
                  r.selectNodeContents(next);
                  r.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(r);
                } else {
                  editor.innerHTML = "";
                  editor.focus();
                }

                editor.classList.toggle("is-empty", isEditorEmpty(editor));
                if (isModal) syncFromModal();
                else syncFromCompact();
                return;
              }
            }
          }

          // Case C: Standard backward character deletion
          e.preventDefault();
          document.execCommand("delete", false, null);
          const empty = isEditorEmpty(editor);
          editor.classList.toggle("is-empty", empty);
          if (empty && !editor.querySelector(".sp-odml-todo-item, ul, ol")) {
            editor.innerHTML = "";
          }
          if (isModal) syncFromModal();
          else syncFromCompact();
          return;
        }

        // 2. Delete key handling (forward delete)
        if (e.key === "Delete" || e.keyCode === 46) {
          e.preventDefault();
          document.execCommand("forwardDelete", false, null);
          const empty = isEditorEmpty(editor);
          editor.classList.toggle("is-empty", empty);
          if (empty && !editor.querySelector(".sp-odml-todo-item, ul, ol")) {
            editor.innerHTML = "";
          }
          if (isModal) syncFromModal();
          else syncFromCompact();
          return;
        }

        // 3. Enter key handling inside checklist items
        if (e.key === "Enter" && !e.shiftKey) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const anchor = sel.anchorNode;
            const todoItem = anchor?.nodeType === Node.ELEMENT_NODE
              ? anchor.closest(".sp-odml-todo-item")
              : anchor?.parentElement?.closest(".sp-odml-todo-item");

            if (todoItem) {
              e.preventDefault();
              const todoText = todoItem.querySelector(".sp-odml-todo-text");
              const textVal = (todoText?.textContent || "").replace(/[\u200B-\u200D\uFEFF\s]/g, "");

              if (!textVal) {
                // Empty item -> transform to normal paragraph
                const p = document.createElement("div");
                p.innerHTML = "<br>";
                todoItem.replaceWith(p);
                const r = document.createRange();
                r.setStart(p, 0);
                r.collapse(true);
                sel.removeAllRanges();
                sel.addRange(r);
              } else {
                // Create next checklist item
                const nextItem = document.createElement("div");
                nextItem.className = "sp-odml-todo-item";
                nextItem.setAttribute("data-done", "false");
                nextItem.innerHTML = '<span class="sp-odml-todo-box">☐</span> <span class="sp-odml-todo-text"><br></span>';
                todoItem.after(nextItem);
                const nextText = nextItem.querySelector(".sp-odml-todo-text");
                const r = document.createRange();
                r.setStart(nextText, 0);
                r.collapse(true);
                sel.removeAllRanges();
                sel.addRange(r);
              }
              editor.classList.toggle("is-empty", isEditorEmpty(editor));
              if (isModal) syncFromModal();
              else syncFromCompact();
              return;
            }
          }
        }

        // 4. Tab key: indentation instead of jumping focus
        if (e.key === "Tab") {
          e.preventDefault();
          if (e.shiftKey) {
            document.execCommand("outdent", false, null);
          } else {
            const sel = window.getSelection();
            const inList = sel && sel.anchorNode && (
              sel.anchorNode.nodeType === Node.ELEMENT_NODE
                ? sel.anchorNode.closest("ul, ol")
                : sel.anchorNode.parentElement?.closest("ul, ol")
            );
            if (inList) {
              document.execCommand("indent", false, null);
            } else {
              document.execCommand("insertText", false, "    ");
            }
          }
          if (isModal) syncFromModal();
          else syncFromCompact();
          return;
        }

        const isCtrl = e.ctrlKey || e.metaKey;
        if (!isCtrl) return;

        const key = e.key.toLowerCase();

        // Ctrl + S: Save note immediately (and prevent browser Save Page dialog)
        if (key === "s" && !e.shiftKey) {
          e.preventDefault();
          state.personalNote = getEditorContent(editor);
          saveStoredData();
          if (noteStatusHint) {
            noteStatusHint.textContent = "Saved ✓";
            noteStatusHint.className = "sp-odml-note-status-hint is-saved";
            setTimeout(() => {
              if (noteStatusHint) {
                noteStatusHint.textContent = "Auto-saved ✓";
                noteStatusHint.className = "sp-odml-note-status-hint is-saved";
              }
            }, 2000);
          }
          return;
        }

        // Ctrl + U: Native underline (prevents browser View Source)
        if (key === "u") {
          e.preventDefault();
          executeRichCommand("underline", null, editor);
          return;
        }

        // Ctrl + Shift + S or Ctrl + D: Sliced / Strike-Through (Mark Done)
        if ((key === "s" && e.shiftKey) || key === "d") {
          e.preventDefault();
          executeRichCommand("strikeThrough", null, editor);
          return;
        }

        // Ctrl + . or Ctrl + Shift + 8: Bullet Points
        if (key === "." || (key === "8" && e.shiftKey)) {
          e.preventDefault();
          executeRichCommand("insertUnorderedList", null, editor);
          return;
        }

        // Ctrl + \: Clear formatting
        if (key === "\\") {
          e.preventDefault();
          executeRichCommand("removeFormat", null, editor);
          return;
        }
      });
    }

    attachRichEditorEvents(modalEditor, true);
    attachRichEditorEvents(noteEditor, false);

    // Save Button in Compact Box (manual save confirmation)
    if (noteSaveBtn && noteEditor) {
      noteSaveBtn.onclick = (e) => {
        e.preventDefault();
        state.personalNote = getEditorContent(noteEditor);
        if (modalEditor) modalEditor.innerHTML = state.personalNote;
        saveStoredData();
        if (noteStatusHint) {
          noteStatusHint.textContent = "Saved ✓";
          noteStatusHint.className = "sp-odml-note-status-hint is-saved";
          setTimeout(() => {
            if (noteStatusHint) {
              noteStatusHint.textContent = "Auto-saved ✓";
              noteStatusHint.className = "sp-odml-note-status-hint is-saved";
            }
          }, 2000);
        }
      };
    }

    // Reset Button in Compact Box
    if (noteResetBtn && noteEditor) {
      noteResetBtn.onclick = (e) => {
        e.preventDefault();
        if (!isEditorEmpty(noteEditor) && !confirm("Are you sure you want to reset your personal note?")) {
          return;
        }
        noteEditor.innerHTML = "";
        state.personalNote = "";
        if (modalEditor) modalEditor.innerHTML = "";
        saveStoredData();
        if (noteStatusHint) {
          noteStatusHint.textContent = "Cleared ✓";
          noteStatusHint.className = "sp-odml-note-status-hint is-saved";
          setTimeout(() => {
            if (noteStatusHint) {
              noteStatusHint.textContent = "";
              noteStatusHint.className = "sp-odml-note-status-hint";
            }
          }, 2000);
        }
      };
    }



    // Dismiss & auto-save on clicking background
    if (noteModal) {
      noteModal.addEventListener("pointerdown", (e) => {
        if (e.target === noteModal) {
          closeModalPopup();
        }
      });
    }

    if (modalDialog) {
      modalDialog.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
      });
    }

    // Open/Toggle Modal Popup ONLY when user clicks the Popup button
    if (notePopupBtn && noteModal) {
      notePopupBtn.onclick = (e) => {
        e.preventDefault();
        // Toggle close if already open
        if (noteModal.classList.contains("is-open") && noteModal.style.display !== "none") {
          closeModalPopup();
          return;
        }
        if (modalEditor && noteEditor) {
          modalEditor.innerHTML = getEditorContent(noteEditor);
        }
        if (modalDialog) {
          modalDialog.style.left = "";
          modalDialog.style.top = "";
        }
        noteModal.classList.add("is-open");
        noteModal.style.setProperty("display", "flex", "important");
        setTimeout(() => modalEditor?.focus(), 50);
      };
    }

    // Modal Save Button
    if (modalSaveBtn && modalEditor) {
      modalSaveBtn.onclick = (e) => {
        e.preventDefault();
        state.personalNote = getEditorContent(modalEditor);
        if (noteEditor) noteEditor.innerHTML = state.personalNote;
        saveStoredData();
        if (noteStatusHint) {
          noteStatusHint.textContent = "Saved ✓";
          noteStatusHint.className = "sp-odml-note-status-hint is-saved";
        }
        if (modalFeedback) {
          modalFeedback.textContent = "Saved Note! ✓";
          modalFeedback.style.display = "inline-block";
          setTimeout(() => {
            if (modalFeedback) modalFeedback.style.display = "none";
          }, 2200);
        }
      };
    }

    // Modal Reset Button
    if (modalResetBtn && modalEditor) {
      modalResetBtn.onclick = (e) => {
        e.preventDefault();
        if (!isEditorEmpty(modalEditor) && !confirm("Are you sure you want to reset your personal note?")) {
          return;
        }
        modalEditor.innerHTML = "";
        state.personalNote = "";
        if (noteEditor) noteEditor.innerHTML = "";
        saveStoredData();
        if (noteStatusHint) {
          noteStatusHint.textContent = "";
          noteStatusHint.className = "sp-odml-note-status-hint";
        }
        if (modalFeedback) {
          modalFeedback.textContent = "Note Cleared ✓";
          modalFeedback.style.display = "inline-block";
          setTimeout(() => {
            if (modalFeedback) modalFeedback.style.display = "none";
          }, 2200);
        }
      };
    }

    function closeModalPopup() {
      if (noteModal) {
        noteModal.classList.remove("is-open");
        noteModal.style.setProperty("display", "none", "important");
      }
      if (modalEditor) {
        state.personalNote = getEditorContent(modalEditor);
        if (noteEditor) noteEditor.innerHTML = state.personalNote;
        saveStoredData();
        if (noteStatusHint) {
          noteStatusHint.textContent = "Auto-saved ✓";
          noteStatusHint.className = "sp-odml-note-status-hint is-saved";
        }
      }
    }

    if (modalCloseBtn) modalCloseBtn.onclick = closeModalPopup;
    if (modalDoneBtn) modalDoneBtn.onclick = closeModalPopup;

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && noteModal && (noteModal.classList.contains("is-open") || noteModal.style.display !== "none")) {
        closeModalPopup();
      }
    });



    // 10. Submit Button: Add Record
    const addBtn = container.querySelector("#sp-odml-add-btn");
    if (addBtn) {
      addBtn.onclick = (e) => {
        e.preventDefault();

        const table = findAttendanceTable();
        const subjects = extractSubjectsFromTable(table);

        if (!state.selectedSubjectCode) {
          const courseTrigger = container.querySelector("#spOdmlCourseTrigger");
          if (courseTrigger) {
            courseTrigger.classList.add("is-glow-alert");
            try {
              courseTrigger.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } catch (_) {}
            setTimeout(() => {
              if (courseTrigger && !state.selectedSubjectCode) {
                courseTrigger.classList.remove("is-glow-alert");
              }
            }, 1800);
          }
          return;
        }

        if (!state.isHoliday && !state.dayOrder) {
          // Instead of giving a popup, glow more the day order button in the UI
          const doStrip = container.querySelector("#spOdmlDoStrip");
          const doBadge = container.querySelector("#spOdmlDoStatusBadge");
          if (doStrip) {
            doStrip.classList.add("is-glow-alert");
            if (doBadge) {
              doBadge.className = "sp-odml-do-status-badge is-unpicked is-alert";
              doBadge.textContent = "Select Day Order!";
            }
            try {
              doStrip.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } catch (_) {}
            setTimeout(() => {
              if (doStrip && !state.dayOrder) {
                doStrip.classList.remove("is-glow-alert");
                if (doBadge && !state.dayOrder) {
                  doBadge.textContent = "Unpicked";
                }
              }
            }, 3000);
          }
          return;
        }

        const isPresetPicked = Boolean(state.activeTag && state.activeTag !== "custom") || Boolean(state.commentText && state.commentText.trim());
        if (!isPresetPicked) {
          const tagsStrip = container.querySelector("#spOdmlReasonTagsStrip");
          const presetBadge = container.querySelector("#spOdmlPresetStatusBadge");
          if (tagsStrip) {
            tagsStrip.classList.add("is-glow-alert");
            if (presetBadge) {
              presetBadge.className = "sp-odml-preset-status-badge is-unpicked is-alert";
              presetBadge.textContent = "Select Preset!";
            }
            try {
              tagsStrip.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } catch (_) {}
            setTimeout(() => {
              if (tagsStrip && !state.activeTag && !state.commentText.trim()) {
                tagsStrip.classList.remove("is-glow-alert");
                if (presetBadge && !state.activeTag && !state.commentText.trim()) {
                  presetBadge.textContent = "Pick Preset";
                }
              }
            }, 3000);
          }
          return;
        }

        let subj = subjects.find((s) => s.code === state.selectedSubjectCode);
        if (!subj && state.customSubjects) {
          subj = state.customSubjects.find((s) => s.code === state.selectedSubjectCode);
        }

        const noteText = state.commentText.trim() || (state.activeTag && state.activeTag !== "custom" ? state.activeTag : "");

        const recordDayOrder = state.isHoliday
          ? state.holidayDisplayText
          : (state.dayOrder ? `DO ${state.dayOrder}` : "DO -");

        let cleanFullName = subj ? (subj.fullName || subj.displayName) : state.selectedSubjectCode;
        if (!cleanFullName) cleanFullName = state.selectedSubjectCode;

        const newRecord = {
          id: "odml_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          date: state.selectedDate,
          dayOrder: recordDayOrder,
          subjectCode: state.selectedSubjectCode,
          subjectFullName: cleanFullName,
          type: state.selectedType,
          hours: state.selectedHours,
          notes: noteText,
          timestamp: Date.now(),
        };

        state.records.push(newRecord);
        state.commentText = "";
        state.activeTag = "";
        if (commentInp) commentInp.value = "";
        tagBtns.forEach((b) => b.classList.remove("active"));

        saveStoredData();
        updateTopHeaderContents(container, subjects);
        enhanceMarginCellsWithOdMl();
      };
    }

    // 13. Import & Export Action Buttons (Right bottom corner)
    const importBtn = container.querySelector("#spOdmlImportBtn");
    const importFileInput = container.querySelector("#spOdmlImportFileInput");
    const exportJsonBtn = container.querySelector("#spOdmlExportJsonBtn");
    const exportPngBtn = container.querySelector("#spOdmlExportPngBtn");

    if (importBtn && importFileInput) {
      importBtn.onclick = (e) => {
        e.preventDefault();
        importFileInput.click();
      };
      importFileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          handleJsonImportFile(e.target.files[0]);
          e.target.value = "";
        }
      };
    }

    if (exportJsonBtn) {
      exportJsonBtn.onclick = (e) => {
        e.preventDefault();
        exportToJson();
      };
    }

    if (exportPngBtn) {
      exportPngBtn.onclick = (e) => {
        e.preventDefault();
        exportToPng();
      };
    }

    // 14. Bottom Whole Collapse Button
    const bottomCollapseBtn = container.querySelector("#spOdmlBottomCollapseBtn");
    if (bottomCollapseBtn) {
      bottomCollapseBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleHeaderExpanded();
      };
    }

    // 15. Leave Marking Guide Info Popover Toggle (Click/Touch & Dismiss)
    const titleInfoWrap = container.querySelector("#spOdmlTitleInfoWrap");
    const titleInfoBtn = container.querySelector("#spOdmlTitleInfoBtn");
    if (titleInfoBtn && titleInfoWrap) {
      titleInfoBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        titleInfoWrap.classList.toggle("is-open");
      };

      document.addEventListener("click", (e) => {
        if (!titleInfoWrap.contains(e.target)) {
          titleInfoWrap.classList.remove("is-open");
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && titleInfoWrap.classList.contains("is-open")) {
          titleInfoWrap.classList.remove("is-open");
        }
      });
    }

    // 16. Personal Note Info Popover Toggle (Click/Touch & Dismiss)
    const pnoteInfoWrap = container.querySelector("#spOdmlPnoteInfoWrap");
    const pnoteInfoBtn = container.querySelector("#spOdmlPnoteInfoBtn");
    if (pnoteInfoBtn && pnoteInfoWrap) {
      pnoteInfoBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        pnoteInfoWrap.classList.toggle("is-open");
      };

      document.addEventListener("click", (e) => {
        if (!pnoteInfoWrap.contains(e.target)) {
          pnoteInfoWrap.classList.remove("is-open");
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && pnoteInfoWrap.classList.contains("is-open")) {
          pnoteInfoWrap.classList.remove("is-open");
        }
      });
    }
  }

  /**
   * Injects the Top Header Section above the Attendance Card
   */
  function injectTopHeaderSection() {
    if (!isAttendancePageActive()) return;

    const table = findAttendanceTable();
    if (!table) return;

    let card = table.closest(".sp-attendance-card") || table.closest(".card");
    if (!card) card = table.parentElement;
    if (!card) return;

    // STRICT USER RULE: OD/ML is strictly 75% only. Never change OD/ML for 65%.
    state.currentThreshold = 75;
    const subjects = extractSubjectsFromTable(table);

    let container = document.getElementById("sp-odml-top-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "sp-odml-top-container";
      card.parentNode.insertBefore(container, card);
      buildTopHeaderSkeleton(container);
      attachTopHeaderEvents(container);
    }

    updateTopHeaderContents(container, subjects);
  }

  /**
   * Strictly finds the card header element for "COURSE WISE ATTENDANCE - During the Period:"
   */
  function findAttendanceCardHeader(table) {
    if (!table) table = findAttendanceTable();
    if (!table) return null;

    const card = table.closest(".sp-attendance-card") || table.closest(".card");
    if (card) {
      // 1. Check direct .card-header
      const ch = card.querySelector(".card-header");
      if (ch) return ch;

      // 2. Scan elements inside card for "COURSE WISE ATTENDANCE" or "DURING THE PERIOD"
      const candidates = card.querySelectorAll("div, h1, h2, h3, h4, h5, h6, .panel-heading");
      for (const el of candidates) {
        if (el.closest("table, #sp-odml-top-container, .card-body, tbody, thead")) continue;
        const text = (el.textContent || "").toUpperCase();
        if (text.includes("COURSE WISE ATTENDANCE") || text.includes("DURING THE PERIOD")) {
          return el;
        }
      }

      // 3. First child of card if before card-body
      const cardBody = card.querySelector(".card-body");
      if (cardBody && cardBody.previousElementSibling) {
        return cardBody.previousElementSibling;
      }
    }

    // 4. Search within #divMainDetails
    const headings = document.querySelectorAll(
      "#divMainDetails .card-header, #divMainDetails h1, #divMainDetails h2, #divMainDetails h3, #divMainDetails h4, #divMainDetails h5, #divMainDetails .page-header"
    );
    for (const h of headings) {
      const text = (h.textContent || "").toUpperCase();
      if (text.includes("COURSE WISE ATTENDANCE") || text.includes("DURING THE PERIOD")) {
        return h;
      }
    }

    return null;
  }

  /**
   * Injects or updates the "View OD/ML" toggle button in the header of
   * "COURSE WISE ATTENDANCE - During the Period:" at the right side.
   */
  function injectCourseWiseAttendanceHeaderBtn(table) {
    if (!isAttendancePageActive()) return;
    const header = findAttendanceCardHeader(table);
    if (!header) return;

    // Apply flex layout classes so title stays left and button is right-aligned
    header.classList.add("sp-odml-card-header-flex");

    // Ensure existing header text/elements are wrapped in a title container
    let titleWrap = header.querySelector(".sp-odml-card-header-title");
    let actionsWrap = header.querySelector(".sp-odml-card-header-actions");

    if (!titleWrap) {
      titleWrap = document.createElement("div");
      titleWrap.className = "sp-odml-card-header-title";

      // Move existing children (except actionsWrap) into titleWrap
      const childrenToMove = Array.from(header.childNodes).filter((node) => {
        return node !== actionsWrap && node.id !== "spOdmlCardHeaderActions";
      });
      childrenToMove.forEach((child) => titleWrap.appendChild(child));
      header.insertBefore(titleWrap, header.firstChild);
    }

    // Ensure actions container exists at the right side
    if (!actionsWrap) {
      actionsWrap = document.createElement("div");
      actionsWrap.className = "sp-odml-card-header-actions";
      actionsWrap.id = "spOdmlCardHeaderActions";
      header.appendChild(actionsWrap);
    }

    // Inject or bind View OD/ML button
    let viewBtn = actionsWrap.querySelector("#spOdmlCardHeaderViewBtn");
    if (!viewBtn) {
      viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.id = "spOdmlCardHeaderViewBtn";
      viewBtn.className = `sp-odml-view-btn ${state.isMarginColumnExpanded ? "is-active" : ""}`;
      viewBtn.setAttribute("aria-pressed", state.isMarginColumnExpanded ? "true" : "false");
      viewBtn.title = state.isMarginColumnExpanded
        ? "Hide OD/ML margin column in attendance table"
        : "View OD/ML margin column in attendance table";
      viewBtn.innerHTML = `
        <span class="sp-odml-view-btn-text">${state.isMarginColumnExpanded ? "Hide OD/ML" : "View OD/ML"}</span>
      `;
      viewBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMarginColumn();
      });
      actionsWrap.appendChild(viewBtn);
    }

    // Remove any card header info trigger if present so hover is ONLY near OD/ML Margin column
    const oldCardInfoTrigger = actionsWrap.querySelector("#spOdmlCardHeaderInfoTrigger");
    if (oldCardInfoTrigger) {
      oldCardInfoTrigger.remove();
    }

    updateMarginColumnToggleButtons();
  }

  /**
   * Enhances the Attendance Table with a DEDICATED NEW COLUMN for OD_ML Margin
   * Only rows where OD/ML credits have changed show margin flow; all other rows show "No OD/ML Added"
   */
  function enhanceMarginCellsWithOdMl(forceRecalc = false) {
    if (!isAttendancePageActive()) return;

    const table = findAttendanceTable();
    if (!table) return;

    // STRICT USER RULE: OD/ML is strictly 75% only. Never change OD/ML for 65%.
    state.currentThreshold = 75;
    const subjects = extractSubjectsFromTable(table);
    if (subjects.length === 0) return;

    const theadRow = table.querySelector("thead tr") || table.querySelector("tr:first-child");
    if (!theadRow) return;

    // 1. Locate Margin Header Cell (Must strictly be .sp-attendance-header created by sp_attendence.js)
    const headMarginCell = theadRow.querySelector(".sp-attendance-header");
    if (!headMarginCell) return;

    // Strictly remove any leftover expand buttons on Margin header (kept in top section only!)
    const oldBtn = headMarginCell.querySelector("#spOdmlMarginExpandBtn");
    if (oldBtn) oldBtn.remove();
    const oldToggleWrap = headMarginCell.querySelector(".sp-odml-header-toggle-wrap");
    if (oldToggleWrap) oldToggleWrap.remove();

    // 2. Inject / Update the NEW Column Header (OD_ML Margin) right after Margin
    let odmlHead = theadRow.querySelector(".sp-odml-col-header");
    if (!odmlHead) {
      odmlHead = document.createElement("th");
      odmlHead.className = `sp-odml-col-header ${state.isMarginColumnExpanded ? "" : "sp-odml-col-hidden"}`;
      odmlHead.id = "sp-odml-col-header";

      odmlHead.innerHTML = `
        <div class="sp-odml-col-header-wrap">
          <div class="sp-odml-col-header-top">
            <span class="sp-odml-col-title">OD/ML Margin</span>
            <div class="sp-odml-col-info-trigger" id="spOdmlColInfoTrigger" tabindex="0" role="button" aria-label="OD/ML Margin note" title="Notes: What It Does">
              <svg class="sp-info-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <button type="button" class="sp-odml-col-collapse-btn" id="spOdmlColCollapseBtn" title="Hide OD/ML Margin column" aria-label="Hide column">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      `;

      const collapseBtn = odmlHead.querySelector("#spOdmlColCollapseBtn");
      if (collapseBtn) {
        collapseBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleMarginColumn(false);
        };
      }
    }

    let colInfoTrigger = odmlHead.querySelector("#spOdmlColInfoTrigger");
    if (!colInfoTrigger) {
      const topWrap = odmlHead.querySelector(".sp-odml-col-header-top");
      if (topWrap) {
        colInfoTrigger = document.createElement("div");
        colInfoTrigger.className = "sp-odml-col-info-trigger";
        colInfoTrigger.id = "spOdmlColInfoTrigger";
        colInfoTrigger.setAttribute("tabindex", "0");
        colInfoTrigger.setAttribute("role", "button");
        colInfoTrigger.setAttribute("aria-label", "OD/ML Margin note");
        colInfoTrigger.setAttribute("title", "Notes: What It Does");
        colInfoTrigger.innerHTML = `
          <svg class="sp-info-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        `;
        const collapseBtn = topWrap.querySelector("#spOdmlColCollapseBtn");
        if (collapseBtn) {
          topWrap.insertBefore(colInfoTrigger, collapseBtn);
        } else {
          topWrap.appendChild(colInfoTrigger);
        }
      }
    }

    if (colInfoTrigger && !colInfoTrigger._hasListeners) {
      colInfoTrigger._hasListeners = true;
      colInfoTrigger.addEventListener("mouseenter", () => showOdmlMarginTooltip(colInfoTrigger));
      colInfoTrigger.addEventListener("mouseleave", hideOdmlMarginTooltip);
      colInfoTrigger.addEventListener("focus", () => showOdmlMarginTooltip(colInfoTrigger));
      colInfoTrigger.addEventListener("blur", hideOdmlMarginTooltip);
      colInfoTrigger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    // STRICT LOCATION LOCK: Always enforce odmlHead is immediately AFTER headMarginCell
    if (headMarginCell.nextElementSibling !== odmlHead) {
      headMarginCell.insertAdjacentElement("afterend", odmlHead);
    }

    odmlHead.classList.toggle("sp-odml-col-hidden", !state.isMarginColumnExpanded);
    odmlHead.style.setProperty("display", state.isMarginColumnExpanded ? "table-cell" : "none", "important");

    // 3. Inject / Update the NEW Column in each Body Row
    subjects.forEach((s) => {
      const row = s.rowEl;
      if (!row) return;

      const marginCell = row.querySelector(".sp-margin-cell");
      if (!marginCell) return;

      const odHours = getTotalOdHoursForSubject(s.code);

      let odmlCell = row.querySelector(".sp-odml-col-cell");
      if (!odmlCell) {
        odmlCell = document.createElement("td");
        odmlCell.className = `sp-odml-col-cell ${state.isMarginColumnExpanded ? "" : "sp-odml-col-hidden"}`;
      }

      // STRICT LOCATION LOCK: Always enforce odmlCell is immediately AFTER marginCell
      if (marginCell.nextElementSibling !== odmlCell) {
        marginCell.insertAdjacentElement("afterend", odmlCell);
      }

      odmlCell.classList.toggle("sp-odml-col-hidden", !state.isMarginColumnExpanded);
      odmlCell.style.setProperty("display", state.isMarginColumnExpanded ? "table-cell" : "none", "important");

      // Strictly show margin flow ONLY if OD/ML credits are changed; for the rest show "No OD/ML Added"
      // Keep margin strictly locked to 75% threshold only in OD/ML Margin column (do not change for 65%)
      if (forceRecalc) {
        odmlCell.dataset.cellSignature = "";
      }
      const cellSig = `${s.conducted}_${s.attended}_${odHours}_75_${state.isMarginColumnExpanded}`;
      if (odmlCell.dataset.cellSignature !== cellSig) {
        odmlCell.dataset.cellSignature = cellSig;

        if (odHours > 0) {
          // Strictly and manually calculate 75% margin (never 65%)
          const oldMarginVal = calculateManual75Margin(s.conducted, s.attended);
          const newAtt = s.attended + odHours;
          const newMarginVal = calculateManual75Margin(s.conducted, newAtt);

          const oldMarginStr =
            oldMarginVal !== null
              ? (oldMarginVal > 0 ? `+${oldMarginVal}` : `${oldMarginVal}`)
              : "-";

          const newMarginStr =
            newMarginVal !== null
              ? (newMarginVal > 0 ? `+${newMarginVal}` : `${newMarginVal}`)
              : "-";

          const oldMarginClass = getMarginBadgeClass(oldMarginVal);
          const newMarginClass = getMarginBadgeClass(newMarginVal);

          // Percentage calculations (fixed to 75% standard for OD/ML Margin)
          const oldPctVal = s.conducted > 0 ? (s.attended / s.conducted) * 100 : 0;
          const newPctVal = s.conducted > 0 ? (newAtt / s.conducted) * 100 : 0;
          const oldPctStr = oldPctVal.toFixed(1) + "%";
          const newPctStr = newPctVal.toFixed(1) + "%";

          const oldPctClass = getPctBadgeClass(oldPctVal, 75);
          const newPctClass = getPctBadgeClass(newPctVal, 75);

          odmlCell.innerHTML = `
            <div class="sp-odml-cell-flow-box" title="${s.displayName}&#10;Original %: ${oldPctStr} ➔ Simulated: ${newPctStr}&#10;Original Margin: ${oldMarginStr} ➔ Simulated: ${newMarginStr} (+${odHours}h)">
              <!-- Percentage Flow Box: current % (green) -> after OD % (yellow) -->
              <div class="sp-odml-flow-card">
                <span class="sp-odml-metric-lbl">Total %</span>
                <div class="sp-odml-flow-group">
                  <span class="sp-odml-flow-box sp-odml-box-green" title="Current Percentage: ${oldPctStr}">${oldPctStr}</span>
                  <svg class="sp-odml-flow-real-arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                  <span class="sp-odml-flow-box sp-odml-box-yellow" title="After OD Percentage: ${newPctStr}">${newPctStr}</span>
                </div>
              </div>

              <!-- Margin Flow Box: current margin (green) -> after OD margin (yellow) -->
              <div class="sp-odml-flow-card">
                <span class="sp-odml-metric-lbl">Margin</span>
                <div class="sp-odml-flow-group">
                  <span class="sp-odml-flow-box sp-odml-box-green" title="Current Margin: ${oldMarginStr}">${oldMarginStr}</span>
                  <svg class="sp-odml-flow-real-arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                  <span class="sp-odml-flow-box sp-odml-box-yellow" title="After OD Margin: ${newMarginStr}">${newMarginStr}</span>
                  <span class="sp-odml-credit-pill">+${odHours}h</span>
                </div>
              </div>
            </div>
          `;
        } else {
          odmlCell.innerHTML = `
            <div class="sp-odml-no-added-box" title="${s.displayName}: No OD/ML records added">
              <span class="sp-odml-no-added-text">No OD/ML Added</span>
            </div>
          `;
        }
      }
    });

    // 4. Handle Total Rows (if present)
    const allRows = table.querySelectorAll("tbody tr");
    allRows.forEach((row) => {
      const cell0 = row.cells[0];
      const cell1 = row.cells[1];
      const cell0Text = (cell0?.innerText || cell0?.textContent || "").trim().toLowerCase();
      const cell1Text = (row.cells[1]?.innerText || row.cells[1]?.textContent || "").trim().toLowerCase();
      const hasCodeBadge = !!cell0?.querySelector?.(".sp-code-badge");
      const isCourseCode = /^[A-Z0-9\-_]{5,15}$/i.test(cell0Text.split(/[\s\-–—:]/)[0]);

      const isTotal =
        !hasCodeBadge &&
        !isCourseCode &&
        (cell0Text === "total" ||
          cell0Text.startsWith("total") ||
          cell1Text === "total" ||
          cell1Text.startsWith("total") ||
          (row === allRows[allRows.length - 1] &&
            allRows.length > 3 &&
            isNaN(parseInt(cell0Text, 10))));

      if (isTotal) {
        const marginCell = row.querySelector(".sp-margin-cell");
        if (!marginCell) return;

        let odmlCell = row.querySelector(".sp-odml-col-cell");
        if (!odmlCell) {
          odmlCell = document.createElement("td");
          odmlCell.className = `sp-odml-col-cell ${state.isMarginColumnExpanded ? "" : "sp-odml-col-hidden"}`;
        }

        // STRICT USER RULE: Exclusively and permanently 75% threshold only. Never for 65%.
        // Total conducted and attended hours are computed directly from enrolled subject summation
        let totConducted = subjects.reduce((sum, s) => sum + s.conducted, 0);
        let totAttended = subjects.reduce((sum, s) => sum + s.attended, 0);

        // In 65% mode or fallback, prioritize saved 75% baseline total to guarantee 75% integrity
        if (table.classList.contains("sp-table-thresh-65") && state.saved75Baseline && state.saved75Baseline.total) {
          totConducted = state.saved75Baseline.total.conducted || totConducted;
          totAttended = state.saved75Baseline.total.attended || totAttended;
        } else if ((totConducted <= 0 || isNaN(totConducted)) && state.saved75Baseline && state.saved75Baseline.total) {
          totConducted = state.saved75Baseline.total.conducted || 0;
          totAttended = state.saved75Baseline.total.attended || 0;
        }

        if (forceRecalc) {
          odmlCell.dataset.cellSignature = "";
        }
        const totalOdHours = state.records.reduce((sum, r) => sum + (parseInt(r.hours, 10) || 0), 0);
        const totalCellSig = `${totConducted}_${totAttended}_${totalOdHours}_75_${state.isMarginColumnExpanded}`;

        if (odmlCell.dataset.cellSignature !== totalCellSig) {
          odmlCell.dataset.cellSignature = totalCellSig;

          if (totalOdHours > 0) {
            const totNewAtt = totAttended + totalOdHours;

            // Recalculate 75% margin manually and strictly (never 65%)
            const oldTotMargin = calculateManual75Margin(totConducted, totAttended);
            const newTotMargin = calculateManual75Margin(totConducted, totNewAtt);

            const oldMarginStr = oldTotMargin !== null ? (oldTotMargin > 0 ? `+${oldTotMargin}` : `${oldTotMargin}`) : "-";
            const newMarginStr = newTotMargin !== null ? (newTotMargin > 0 ? `+${newTotMargin}` : `${newTotMargin}`) : "-";

            const oldMarginClass = getMarginBadgeClass(oldTotMargin);
            const newMarginClass = getMarginBadgeClass(newTotMargin);

            const oldPctVal = totConducted > 0 ? (totAttended / totConducted) * 100 : 0;
            const newPctVal = totConducted > 0 ? (totNewAtt / totConducted) * 100 : 0;
            const oldPctStr = oldPctVal.toFixed(1) + "%";
            const newPctStr = newPctVal.toFixed(1) + "%";

            const oldPctClass = getPctBadgeClass(oldPctVal, 75);
            const newPctClass = getPctBadgeClass(newPctVal, 75);

            odmlCell.innerHTML = `
              <div class="sp-odml-cell-flow-box" title="Total Aggregate&#10;Original %: ${oldPctStr} ➔ Simulated: ${newPctStr}&#10;Original Margin: ${oldMarginStr} ➔ Simulated: ${newMarginStr} (+${totalOdHours}h)">
                <!-- Percentage Flow Box: current % (green) -> after OD % (yellow) -->
                <div class="sp-odml-flow-card">
                  <span class="sp-odml-metric-lbl">Total %</span>
                  <div class="sp-odml-flow-group">
                    <span class="sp-odml-flow-box sp-odml-box-green" title="Current Total %: ${oldPctStr}">${oldPctStr}</span>
                    <svg class="sp-odml-flow-real-arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                    <span class="sp-odml-flow-box sp-odml-box-yellow" title="After OD Total %: ${newPctStr}">${newPctStr}</span>
                  </div>
                </div>

                <!-- Margin Flow Box: current margin (green) -> after OD margin (yellow) -->
                <div class="sp-odml-flow-card">
                  <span class="sp-odml-metric-lbl">Margin</span>
                  <div class="sp-odml-flow-group">
                    <span class="sp-odml-flow-box sp-odml-box-green" title="Current Total Margin: ${oldMarginStr}">${oldMarginStr}</span>
                    <svg class="sp-odml-flow-real-arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                    <span class="sp-odml-flow-box sp-odml-box-yellow" title="After OD Total Margin: ${newMarginStr}">${newMarginStr}</span>
                    <span class="sp-odml-credit-pill">+${totalOdHours}h</span>
                  </div>
                </div>
              </div>
            `;
          } else {
            odmlCell.innerHTML = `
              <div class="sp-odml-no-added-box" title="Total: No OD/ML records added">
                <span class="sp-odml-no-added-text">-</span>
              </div>
            `;
          }
        }

        // STRICT LOCATION LOCK: Always enforce odmlCell is immediately AFTER marginCell
        if (marginCell.nextElementSibling !== odmlCell) {
          marginCell.insertAdjacentElement("afterend", odmlCell);
        }

        odmlCell.classList.toggle("sp-odml-col-hidden", !state.isMarginColumnExpanded);
        odmlCell.style.setProperty("display", state.isMarginColumnExpanded ? "table-cell" : "none", "important");
      }
    });

    // Ensure the View OD/ML button is present in the card header and synchronized
    injectCourseWiseAttendanceHeaderBtn(table);
  }

  /**
   * Main Lifecycle Loop with Page Isolation & Debounced Mutation Observer
   */
  function syncPageState() {
    passivelyScanAndCacheProfile();

    if (!isAttendancePageActive()) {
      // Remove any injected components if not on attendance page
      const topContainer = document.getElementById("sp-odml-top-container");
      if (topContainer) topContainer.remove();
      const cardHeaderActions = document.getElementById("spOdmlCardHeaderActions");
      if (cardHeaderActions) cardHeaderActions.remove();
      const colTooltip = document.getElementById("sp-odml-margin-col-tooltip");
      if (colTooltip) colTooltip.remove();
      document.querySelectorAll(".sp-odml-col-header, .sp-odml-col-cell").forEach((el) => el.remove());
      return;
    }

    injectTopHeaderSection();
    injectCourseWiseAttendanceHeaderBtn();
    enhanceMarginCellsWithOdMl();
  }

  function init() {
    passivelyScanAndCacheProfile();
    loadStoredData();

    // Auto-Sync Academic Calendar Day Order on Load
    syncAcademicCalendarDayOrder();

    // Global Backspace & Delete capture shield for contenteditable editors:
    // Prevents Academia's legacy document/window handlers from blocking Backspace in contenteditable elements
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Backspace" || e.keyCode === 8 || e.key === "Delete" || e.keyCode === 46) {
          const target = e.target;
          const active = document.activeElement;
          const isTargetEditable = target && (target.isContentEditable || target.closest?.("[contenteditable='true']"));
          const isActiveEditable = active && (active.isContentEditable || active.closest?.("[contenteditable='true']"));
          if (isTargetEditable || isActiveEditable) {
            e.stopPropagation();
          }
        }
      },
      true // Capture phase intercepts BEFORE Academia's page listeners!
    );

    // Immediate reactive switch when 65% / 75% threshold buttons are clicked
    document.addEventListener(
      "click",
      (e) => {
        const btn = e.target.closest(".sp-threshold-btn");
        if (btn) {
          const tVal = parseInt(btn.dataset.threshold || btn.textContent, 10);
          const is65Btn = tVal === 65 || btn.classList.contains("sp-btn-65") || btn.dataset.threshold === "65";

          // STRICT USER RULE: When pressed on 65% button, OD/ML margin should NOT change anything!
          if (is65Btn) {
            return;
          }

          // STRICT USER RULE: OD/ML Tracker is strictly and permanently 75% only.
          state.currentThreshold = 75;

          const table = findAttendanceTable();
          if (tVal === 75 && table) {
            // User clicked 75%: update and save fresh 75% baseline data in local storage
            const subjects = extractSubjectsFromTable(table);
            save75BaselineData(subjects, table);
          }
          syncPageState();
          setTimeout(() => {
            syncPageState();
          }, 15);
          setTimeout(() => {
            syncPageState();
          }, 120);
        }

        // Automatically scan & harvest student profile if user clicks any menu/navigation link
        const navItem = e.target.closest("a, button, li, .nav-link, [onclick], .sidebar-link");
        if (navItem) {
          setTimeout(passivelyScanAndCacheProfile, 250);
          setTimeout(passivelyScanAndCacheProfile, 900);
        }
      },
      true // Capture phase intercepts BEFORE sp_attendence stopPropagation!
    );

    let debounceTimer = null;
    const observer = new MutationObserver((mutations) => {
      // Ignore mutations originating from within our own components to avoid feedback loops
      const isSelfMutation = mutations.every((m) => {
        const el = m.target?.nodeType === 3 ? m.target.parentElement : m.target;
        return (
          el &&
          (el.id === "sp-odml-top-container" ||
            el.closest?.("#sp-odml-top-container") ||
            el.id === "spOdmlPersonalNoteModal" ||
            el.closest?.("#spOdmlPersonalNoteModal") ||
            el.classList?.contains("sp-odml-col-header") ||
            el.closest?.(".sp-odml-col-header") ||
            el.classList?.contains("sp-odml-col-cell") ||
            el.closest?.(".sp-odml-col-cell") ||
            el.id === "spOdmlCardHeaderActions" ||
            el.closest?.("#spOdmlCardHeaderActions") ||
            el.id === "spOdmlCardHeaderViewBtn" ||
            el.closest?.("#spOdmlCardHeaderViewBtn") ||
            el.id === "spOdmlColInfoTrigger" ||
            el.closest?.("#spOdmlColInfoTrigger") ||
            el.id === "spOdmlCardHeaderInfoTrigger" ||
            el.closest?.("#spOdmlCardHeaderInfoTrigger") ||
            el.id === "sp-odml-global-tooltip" ||
            el.closest?.("#sp-odml-global-tooltip") ||
            el.id === "sp-odml-margin-col-tooltip" ||
            el.closest?.("#sp-odml-margin-col-tooltip"))
        );
      });

      if (isSelfMutation) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncPageState();
      }, 120);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Periodic safety sweep to catch tab changes or threshold switches (65% / 75%)
    setInterval(() => {
      syncPageState();
    }, 1500);

    // Initial run
    syncPageState();
  }

  // Start initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
