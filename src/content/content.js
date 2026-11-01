/**
 * ============================================================
 * FILE: content.js (Attendance & Marks Enhancer)
 * ============================================================
 * PURPOSE:
 *   Enhances the SRM Academia "My Attendance" page with a modern
 *   styled table, attendance margin calculation, and marks summary.
 *   This has NOTHING to do with feedback auto-fill — it's a visual
 *   enhancement that runs alongside the feedback filler.
 *
 * FEATURES:
 *   - Adds "Margin" column to attendance table (how many classes you can skip)
 *   - Color-codes margins: green (safe), yellow (borderline), red (short)
 *   - Applies modern indigo-themed table styling with Plus Jakarta Sans font
 *   - Shows total marks with color coding (red if below 50%)
 *   - Maps course codes to course names across tables
 *
 * SETTINGS:
 *   - Attendance threshold: 75% (in calculateAttendanceMargin function)
 *   - Table retry attempts: 10 with 500ms interval (getTableElement)
 *   - Re-injection delay on hash change: 800ms
 *
 * TO MODIFY:
 *   - Change attendance threshold → edit the "75" in calculateAttendanceMargin()
 *   - Change table colors → edit applyPortalTheme() CSS
 *   - Change marks color threshold → edit the "0.5" check in injectEnhancements()
 * ============================================================
 */

const ACADEMIA_MAP = {};
let currentAcademiaThreshold = 75;

function calculateAttendanceMargin(
  total,
  absent,
  threshold = currentAcademiaThreshold,
) {
  let margin = 0,
    present = total - absent;
  let percent = (present / total) * 100,
    conducted = total;
  if (percent >= threshold) {
    while (percent >= threshold) {
      conducted++;
      margin++;
      percent = (present / conducted) * 100;
    }
    margin--;
  } else {
    while (percent < threshold) {
      conducted++;
      margin--;
      present++;
      percent = (present / conducted) * 100;
    }
  }
  return margin;
}

async function getTableElement(selector, retries = 10) {
  for (let i = 0; i < retries; i++) {
    const el = document.querySelector(selector);
    if (el && el.querySelectorAll("tr").length > 1) return el;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

function applyPortalTheme() {
  if (document.getElementById("portal-theme-v31-heavy")) return;
  const style = document.createElement("style");
  style.id = "portal-theme-v31-heavy";
  style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        /* Compact Grid Layout */
        #divMainDetails table, p + table {
            width: 100% !important;
            max-width: 100% !important;
            margin: 8px 0 !important;
            border-collapse: collapse !important;
            border: 1.5px solid #1e1b4b !important;
            font-family: 'Plus Jakarta Sans', sans-serif !important;
        }

        .magic-cell {
            border: 1px solid #cbd5e1 !important; 
            text-align: center !important;
            padding: 8px 12px !important; /* Increased padding for a less compact, wider table layout */
            vertical-align: middle !important;
            font-size: 13px !important;
            color: #0f172a !important;
            background-color: #ffffff !important;
            line-height: 1.1 !important;
        }

        /* High-Contrast Indigo Header */
        .header-modern {
            background-color: #1e1b4b !important;
            color: #ffffff !important;
            font-weight: 800 !important;
            font-size: 11px !important;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .custom-tooltip-trigger:hover .custom-tooltip {
            display: block !important;
        }

        /* Indigo Identity Column */
        .identity-cell {
            background-color: #f8fafc !important; 
            text-align: left !important;
            border-left: 4px solid #132450 !important; 
            padding: 6px 10px !important;
            vertical-align: middle !important;
        }
        
        .code-bold { 
            font-weight: 800 !important; 
            color: #132450 !important; 
            display: inline-block; 
            background-color: #e8ecf5 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-size: 11px !important;
            letter-spacing: 0.03em !important;
            border: 1px solid #b8c2d9 !important;
            box-shadow: 0 1px 1px rgba(0,0,0,0.05) !important;
        }
        .name-small { 
            font-size: 11px !important; 
            font-weight: 600 !important; 
            color: #334155 !important; 
            display: block; 
            line-height: 1.2 !important;
            margin-top: 3px !important;
        }

        /* BOLD MARKS VISUALS */
        .bold-result-line {
            font-size: 16px !important;
            font-weight: 800 !important; /* Forces everything to be bold */
            display: inline-block;
            white-space: nowrap;
        }

        .denom-muted {
            font-size: 14px !important;
            font-weight: 800 !important; /* Denominator is now also bold */
            color: #475569 !important;
        }

        .result-box {
            background-color: #f8fafc !important;
            padding: 6px !important;
        }

        .total-row-v31 {
            border-top: 2px solid #1e1b4b !important;
            background-color: #f1f5ff !important;
        }
    `;
  document.head.appendChild(style);
}

async function injectEnhancements() {
  if (!window.location.href.includes("#Page:My_Attendance")) return;

  const attendanceTable = await getTableElement("table[bgcolor='#FAFAD2']");
  if (!attendanceTable || document.getElementById("margin-head-v31")) return;

  applyPortalTheme();

  const rows = attendanceTable.querySelectorAll("tbody tr:not(:first-child)");
  const header = attendanceTable.querySelector("tbody tr:first-child");

  [...header.cells].forEach((c) =>
    c.classList.add("magic-cell", "header-modern"),
  );

  const marginHead = document.createElement("td");
  marginHead.id = "margin-head-v31";
  marginHead.className = "magic-cell header-modern";
  marginHead.innerHTML = `
    <div style="display:inline-flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; position:relative;">
      <div style="display:inline-flex; align-items:center; gap:4px;">
        <span style="font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:0.04em;">Margin</span>
        <div class="custom-tooltip-trigger" style="position:relative; display:inline-flex; cursor:pointer;" aria-label="Attendance threshold rules">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity:0.8;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <div class="custom-tooltip" style="display:none; position:absolute; top:calc(100% + 6px); left:50%; transform:translateX(-68%); width:240px; background:#ffffff; color:#1e293b; border:1px solid #cbd5e1; border-radius:8px; padding:10px 12px; box-shadow:0 10px 25px rgba(0,0,0,0.2); z-index:9999; text-align:left; text-transform:none; font-size:11px; line-height:1.35; font-weight:normal;">
            <div style="font-weight:800; color:#1e1b4b; margin-bottom:6px; border-bottom:1px solid #f1f5f9; padding-bottom:4px; font-size:11px;">Attendance Threshold Rules</div>
            <div style="display:flex; gap:6px; margin-bottom:6px; align-items:flex-start;">
              <span style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:800; font-size:9.5px; padding:1px 5px; border-radius:3px; flex-shrink:0;">75%</span>
              <span style="font-size:10.5px; color:#334155;"><strong>Normal Requirement:</strong> Mandatory to be eligible for End-Semester Examinations.</span>
            </div>
            <div style="display:flex; gap:6px; align-items:flex-start;">
              <span style="background:#fff4c2; color:#5c4500; border:1px solid #fff4c2; font-weight:800; font-size:9.5px; padding:1px 5px; border-radius:3px; flex-shrink:0;">65%</span>
              <span style="font-size:10.5px; color:#334155;"><strong>Medical / OD Leave:</strong> Minimum condonation limit with approved Medical / OD Leave.</span>
            </div>
          </div>
        </div>
      </div>
      <div class="acad-threshold-toggle" style="display:inline-flex; align-items:center; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.3); border-radius:5px; padding:2px; gap:2px;">
        <button type="button" class="acad-btn-65" data-threshold="65" style="padding:1px 7px; font-size:10px; font-weight:700; border-radius:3px; border:none; cursor:pointer; background:${currentAcademiaThreshold === 65 ? "#c69a22" : "#fff4c2"}; color:${currentAcademiaThreshold === 65 ? "#ffffff" : "#9a7200"}; transition:all 0.15s ease;">65%</button>
        <button type="button" class="acad-btn-75" data-threshold="75" style="padding:1px 7px; font-size:10px; font-weight:700; border-radius:3px; border:none; cursor:pointer; background:${currentAcademiaThreshold === 75 ? "#16a34a" : "#f0fdf4"}; color:${currentAcademiaThreshold === 75 ? "#ffffff" : "#15803d"}; transition:all 0.15s ease;">75%</button>
      </div>
    </div>
  `;

  const attnIdx = [...header.children].findIndex((c) =>
    c.textContent.includes("Attn"),
  );
  if (attnIdx !== -1)
    header.insertBefore(marginHead, header.children[attnIdx + 1]);

  const updateAcademiaMarginRows = () => {
    rows.forEach((row) => {
      const condIdx = Array.from(header.children).findIndex((c) =>
        c.textContent.includes("Conducted"),
      );
      const absIdx = Array.from(header.children).findIndex((c) =>
        c.textContent.includes("Absent"),
      );

      const conducted = Number(row.cells[condIdx]?.textContent);
      const absent = Number(row.cells[absIdx]?.textContent);

      if (!isNaN(conducted)) {
        const margin = calculateAttendanceMargin(
          conducted,
          absent || 0,
          currentAcademiaThreshold,
        );
        let mCell = row.querySelector(".result-box");
        if (!mCell) {
          mCell = document.createElement("td");
          mCell.className = "magic-cell result-box";
          if (attnIdx !== -1)
            row.insertBefore(mCell, row.children[attnIdx + 1]);
        }

        let mColor =
          margin > 0 ? "#16a34a" : margin === 0 ? "#e6ba05" : "#dc2626";
        mCell.innerHTML = `<span class="bold-result-line" style="color:${mColor}">${margin}</span>`;
      }
    });
  };

  const toggleWrap = marginHead.querySelector(".acad-threshold-toggle");
  if (toggleWrap) {
    toggleWrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const val = parseInt(btn.dataset.threshold, 10);
      if (val && (val === 65 || val === 75)) {
        currentAcademiaThreshold = val;
        const b65 = marginHead.querySelector(".acad-btn-65");
        const b75 = marginHead.querySelector(".acad-btn-75");
        if (b65) {
          b65.style.background =
            currentAcademiaThreshold === 65 ? "#c69a22" : "#fff4c2";
          b65.style.color =
            currentAcademiaThreshold === 65 ? "#ffffff" : "#9a7200";
        }
        if (b75) {
          b75.style.background =
            currentAcademiaThreshold === 75 ? "#16a34a" : "#f0fdf4";
          b75.style.color =
            currentAcademiaThreshold === 75 ? "#ffffff" : "#15803d";
        }
        updateAcademiaMarginRows();
      }
    });
  }

  rows.forEach((row) => {
    [...row.cells].forEach((c) => c.classList.add("magic-cell"));
    if (row.cells[0]) row.cells[0].classList.add("identity-cell");

    const categoryIdx = Array.from(header.children).findIndex(
      (c) =>
        c.textContent.includes("Category") || c.textContent.includes("Type"),
    );
    const code = row.cells[0].innerText.split("\n")[0].trim();
    const title = row.cells[1].textContent.trim();
    const type =
      categoryIdx !== -1 && row.cells[categoryIdx]
        ? row.cells[categoryIdx].textContent.trim()
        : "";

    let cleanTitle = title
      .toLowerCase()
      .replace(/\b\w/g, (s) => s.toUpperCase());
    cleanTitle = cleanTitle
      .replace(/\s*-\s*Theory/gi, "")
      .replace(/\s*\(\s*Theory\s*\)/gi, "")
      .replace(/\s*Theory/gi, "")
      .replace(/\s*-\s*Practical/gi, "")
      .replace(/\s*\(\s*Practical\s*\)/gi, "")
      .replace(/\s*Practical/gi, "")
      .trim();

    ACADEMIA_MAP[code] = {
      title: cleanTitle,
      type: type,
    };
  });

  updateAcademiaMarginRows();

  const marksTable = document.querySelector("p + table");
  if (marksTable) {
    const infoText = marksTable.previousElementSibling;
    if (
      infoText &&
      infoText.tagName.toLowerCase() === "p" &&
      !infoText.hasAttribute("data-styled")
    ) {
      infoText.setAttribute("data-styled", "true");
      infoText.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
      infoText.style.fontSize = "13px";
      infoText.style.color = "#1e293b";
      infoText.style.backgroundColor = "#e8ecf5";
      infoText.style.padding = "12px 16px";
      infoText.style.border = "1px solid #bfdbfe";
      infoText.style.borderLeft = "4px solid #3b82f6";
      infoText.style.borderRadius = "8px";
      infoText.style.margin = "24px 0 16px 0";
      infoText.style.fontWeight = "600";
      infoText.style.display = "inline-flex";
      infoText.style.alignItems = "center";
      infoText.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
      infoText.style.letterSpacing = "0.01em";

      const originalText = infoText.innerText.trim();
      infoText.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; color: #3b82f6; flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><span>${originalText}</span>`;
    }

    const mHeader = marksTable.querySelector("tr:first-child");
    let testPerfIdx = -1;
    let mTypeIdx = -1;
    let mCreditIdx = -1;
    if (mHeader) {
      [...mHeader.cells].forEach((c) =>
        c.classList.add("magic-cell", "header-modern"),
      );

      mTypeIdx = Array.from(mHeader.children).findIndex(
        (c) =>
          c.textContent.includes("Category") ||
          c.textContent.includes("Course Type"),
      );
      mCreditIdx = Array.from(mHeader.children).findIndex((c) =>
        c.textContent.includes("Credit"),
      );
      if (mTypeIdx !== -1) {
        mHeader.children[mTypeIdx].style.display = "none";
      }

      if (!document.getElementById("lost-marks-head-v31")) {
        const lostHead = document.createElement("td");
        lostHead.className = "magic-cell header-modern";
        lostHead.id = "lost-marks-head-v31";
        lostHead.innerHTML = "Marks Lost";

        const forecastHead = document.createElement("td");
        forecastHead.className = "magic-cell header-modern";
        forecastHead.id = "forecast-head-v31";
        forecastHead.innerHTML = `
          <div class="tooltip-v31" style="display: flex; align-items: center; justify-content: center; gap: 4px; cursor: help;">
            Target Marks
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #94a3b8;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <div class="tooltip-bubble" style="width:230px;">
               <div style="font-size:8px; color:#132450; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px; font-weight:900;">Target Marks Formula</div>
               <div class="formula-box">
                  <div style="margin-bottom:1px;">(Target Grade &minus; Internal Marks) &times; 75</div>
                  <div class="formula-line"></div>
                  <div style="margin-top:1px;">40</div>
               </div>
            </div>
          </div>
        `;

        testPerfIdx = [...mHeader.children].findIndex((c) =>
          c.textContent.includes("Test Performance"),
        );
        if (testPerfIdx !== -1) {
          mHeader.insertBefore(lostHead, mHeader.children[testPerfIdx + 1]);
          mHeader.insertBefore(forecastHead, mHeader.children[testPerfIdx + 2]);
        } else {
          mHeader.appendChild(lostHead);
          mHeader.appendChild(forecastHead);
        }
      } else {
        testPerfIdx = [...mHeader.children].findIndex((c) =>
          c.textContent.includes("Test Performance"),
        );
      }
    }

    const mRows = marksTable.querySelectorAll("tbody tr:not(:first-child)");
    // Collect subject names + estimated grades for GPA calculator auto-population
    const calcCourseData = [];
    mRows.forEach((row) => {
      [...row.cells].forEach((c) => c.classList.add("magic-cell"));

      if (mTypeIdx !== -1 && row.cells[mTypeIdx]) {
        row.cells[mTypeIdx].style.display = "none";
      }

      let rowCredit = null;
      if (mCreditIdx !== -1 && row.cells[mCreditIdx]) {
        const crVal = parseFloat(row.cells[mCreditIdx].textContent.trim());
        if (!isNaN(crVal)) rowCredit = crVal;
      }

      const codeCell = row.cells[0];
      if (codeCell) {
        codeCell.classList.add("identity-cell");
        const originalText = codeCell.textContent.trim().toLowerCase();
        const code = codeCell.textContent.trim().split(" ")[0];

        let actualType = "";
        if (mTypeIdx !== -1 && row.cells[mTypeIdx]) {
          actualType = row.cells[mTypeIdx].textContent.trim();
        } else {
          if (originalText.includes("theory")) actualType = "Theory";
          else if (
            originalText.includes("practical") ||
            originalText.includes("lab")
          )
            actualType = "Practical";
        }

        if (ACADEMIA_MAP[code]) {
          const courseData =
            typeof ACADEMIA_MAP[code] === "string"
              ? { title: ACADEMIA_MAP[code], type: "" }
              : ACADEMIA_MAP[code];

          if (!actualType) actualType = courseData.type;

          // ── Capture subject data for CGPA calc BEFORE innerHTML is overwritten ──
          // gradeInfo not computed yet; we'll link it below after marks calculation
          // Store the title now so we can push {name, grade} after gradeInfo is set
          row._cgpaSubjectName = courseData.title;
          row._cgpaSubjectCode = code;

          let typeBadge = "";
          if (actualType) {
            const isTheory = actualType.toLowerCase().includes("theory");
            const typeColor = isTheory ? "#132450" : "#ea580c";
            const typeBg = isTheory ? "#e0f2fe" : "#ffedd5";
            const typeBorder = isTheory ? "#bae6fd" : "#fed7aa";
            const finalTypeStr = isTheory ? "Theory" : "Practical";
            typeBadge = `<span style="font-size: 10px; font-weight: 800; color: ${typeColor}; background-color: ${typeBg}; border: 1px solid ${typeBorder}; padding: 2px 6px; border-radius: 4px; margin-left: 8px; letter-spacing: 0.02em; text-transform: uppercase;">${finalTypeStr}</span>`;
          }

          codeCell.innerHTML = `
            <div style="display: flex; align-items: center;">
              <span class="code-bold" style="margin-bottom: 0 !important;">${code}</span>
              ${typeBadge}
            </div>
            <span class="name-small">${courseData.title}</span>
          `;
        }
        // Also capture for subjects NOT in ACADEMIA_MAP using raw cell text
        if (!row._cgpaSubjectName) {
          // Grab original text before any innerHTML changes, split off the course code
          const rawParts = codeCell.textContent.trim().split(/\s+/);
          row._cgpaSubjectCode = rawParts[0] || "";
          row._cgpaSubjectName =
            rawParts.slice(1).join(" ") || rawParts[0] || "";
        }
      }

      const nested =
        row.querySelector("table table") || row.querySelector("table");
      if (!nested || nested === marksTable) return;

      const markNodes = nested.querySelectorAll('td font[size="1.5"]');
      let sum = 0,
        total = 0;

      markNodes.forEach((node) => {
        node.parentElement.classList.add("magic-cell");
        const parts = node.innerHTML.split("<br>");
        const score = parseFloat(parts.pop());
        const max = parseFloat(parts[0].split("/")[1]);
        if (!isNaN(score)) sum += score;
        if (!isNaN(max)) total += max;
      });

      if (total > 0 && !row.querySelector(".lost-marks-cell")) {
        const lostMarksVal = total - sum;
        const lostMarks = lostMarksVal.toFixed(2);

        let gradeInfo;
        if (lostMarksVal < 10)
          gradeInfo = {
            grade: "O",
            color: "#15803d",
            bg: "#dcfce7",
            border: "#bbf7d0",
          };
        else if (lostMarksVal < 20)
          gradeInfo = {
            grade: "A+",
            color: "#132450",
            bg: "#e8ecf5",
            border: "#bfdbfe",
          };
        else if (lostMarksVal < 30)
          gradeInfo = {
            grade: "A",
            color: "#0e7490",
            bg: "#cffafe",
            border: "#a5f3fc",
          };
        else if (lostMarksVal < 40)
          gradeInfo = {
            grade: "B+",
            color: "#9a7200",
            bg: "#ffedd5",
            border: "#fed7aa",
          };
        else if (lostMarksVal < 45)
          gradeInfo = {
            grade: "B",
            color: "#745900",
            bg: "#fff4c2",
            border: "#fff4c2",
          };
        else if (lostMarksVal <= 50)
          gradeInfo = {
            grade: "C",
            color: "#475569",
            bg: "#f1f5f9",
            border: "#e2e8f0",
          };
        else
          gradeInfo = {
            grade: "F",
            color: "#b91c1c",
            bg: "#fee2e2",
            border: "#fca5a5",
          };

        // Push subject name + estimated grade into CGPA calc data array
        // Use the name saved before innerHTML was overwritten
        const subjectTitle = row._cgpaSubjectName || "";
        if (subjectTitle) {
          calcCourseData.push({
            name: subjectTitle,
            code: row._cgpaSubjectCode || "",
            grade: gradeInfo.grade,
            credit: rowCredit,
          });
        }

        // Create new column cell for Marks Lost
        const lostCell = document.createElement("td");
        lostCell.className = "magic-cell result-box lost-marks-cell";

        let isPerfect = lostMarksVal <= 0;
        let marksColor = isPerfect ? "#16a34a" : "#ef4444";
        let marksBg = isPerfect ? "#f0fdf4" : "#fef2f2";
        let marksBorder = isPerfect ? "#bbf7d0" : "#fecaca";
        let displayVal = isPerfect ? "0.00" : `-${lostMarks}`;

        let iconSvg = isPerfect
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${marksColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${marksColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`;

        lostCell.innerHTML = `
          <div style="display: flex; align-items: flex-start; justify-content: center; gap: 8px; font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px 0;">
             
             <!-- Squarish Marks Widget -->
             <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 2px; padding: 0 6px; height: 28px; min-width: 42px; border-radius: 6px; background: ${marksBg}; border: 1px solid ${marksBorder}; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                   ${iconSvg}
                   <span style="font-size: 13px; font-weight: 800; color: ${marksColor}; line-height: 1; letter-spacing: -0.02em;">${displayVal}</span>
                </div>
                <span style="font-size: 7px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.02em; margin-top: 5px;">Marks Lost</span>
             </div>

             <!-- Subtle Separator -->
             <div style="width: 1px; height: 28px; background: #e2e8f0; border-radius: 1px;"></div>

             <!-- Squarish Grade Widget -->
             <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="display: flex; align-items: center; justify-content: center; padding: 0 10px; height: 28px; min-width: 32px; border-radius: 6px; background: ${gradeInfo.bg}; border: 1px solid ${gradeInfo.border}; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                   <span style="font-size: 14px; font-weight: 900; color: ${gradeInfo.color}; line-height: 1;">${gradeInfo.grade}</span>
                </div>
                <span style="font-size: 7px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.02em; margin-top: 5px;">Est. Grade</span>
             </div>

          </div>
        `;

        if (testPerfIdx !== -1 && row.children.length > testPerfIdx) {
          row.insertBefore(lostCell, row.children[testPerfIdx + 1]);
        } else {
          row.appendChild(lostCell);
        }

        // Initialize Forecast Column Data
        const forecastCell = document.createElement("td");
        forecastCell.className = "magic-cell result-box forecast-cell";

        let forecastHTML = "";
        if (total === 100) {
          forecastHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; font-family: 'Plus Jakarta Sans', sans-serif;">
               <span style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Your Grade</span>
               <div style="display: flex; align-items: center; justify-content: center; background: ${gradeInfo.bg}; border: 1px solid ${gradeInfo.border}; padding: 4px 12px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                  <span style="font-size: 16px; font-weight: 900; color: ${gradeInfo.color}; line-height: 1;">${gradeInfo.grade}</span>
               </div>
            </div>`;
        } else if (total !== 60 && total !== 100) {
          forecastHTML = `<div style="font-size: 11px; font-weight: 600; color: #64748b; font-style: italic; display: flex; align-items: center; justify-content: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Let marks be uploaded</div>`;
        } else {
          // Total internals = 60. Final exams scale to 40 (often from a 100 mark exam base).
          // Array holds data for each target grade
          const targetGrades = [
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

          let itemsHTML = targetGrades
            .map((g) => {
              // Formula: Find marks needed out of 40 weightage. Then * 75/40 to find marks needed out of 75.
              let reqScale = g.target - sum;
              // Exact number formatting (drops trailing zeros for integer-like decimals)
              let exactReq = parseFloat((reqScale * (75 / 40)).toFixed(2));
              let display = "";
              let opacityStyle = "";

              if (exactReq > 75) {
                // Impossible to score more than 75 in a 75 mark exam
                display =
                  '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:#ef4444;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                opacityStyle = "opacity: 0.6;";
              } else if (exactReq <= 0) {
                // Marks already secured with internals alone
                display =
                  '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="color:#10b981;"><path d="M20 6L9 17l-5-5"></path></svg>';
              } else {
                // Valid score required out of 75
                display = `<span style="font-size: 11px; font-weight: 800; color: ${g.color};">${exactReq}</span>`;
              }

              // Build a premium compact inline chip for each grade target
              return `
              <div style="display: flex; align-items: center; border: 1px solid ${g.border}; background: ${g.bg}; border-radius: 6px; padding: 2px 6px; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); ${opacityStyle}">
                 <span style="font-size: 10px; font-weight: 800; color: ${g.color};">${g.name}</span>
                 <div style="width: 1px; height: 10px; background: ${g.border};"></div>
                 ${display}
              </div>
            `;
            })
            .join("");

          forecastHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 170px; padding: 4px 0; font-family: 'Plus Jakarta Sans', sans-serif;">
               <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
                 Target / 75
               </div>
               <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; width: 100%;">
                  ${itemsHTML}
               </div>
            </div>
          `;
        }
        forecastCell.innerHTML = forecastHTML;

        // Ensure it's inserted directly after the 'Marks Lost' column
        if (testPerfIdx !== -1 && row.children.length > testPerfIdx + 1) {
          row.insertBefore(forecastCell, row.children[testPerfIdx + 2]);
        } else {
          row.appendChild(forecastCell);
        }

        // Add total marks below the nested table
        if (!row.querySelector(".total-row-v31")) {
          const totalRow = nested.insertRow(-1);
          totalRow.className = "total-row-v31";
          const totalCell = totalRow.insertCell(0);
          totalCell.colSpan = 40;
          totalCell.className = "magic-cell result-box";

          const marksColor = sum / total < 0.5 ? "#dc2626" : "#16a34a";

          totalCell.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center;">
              <span class="bold-result-line">
                <span style="color:${marksColor}">${sum.toFixed(2)}</span>
                <span class="denom-muted"> / ${total.toFixed(2)}</span>
              </span>
            </div>
          `;
        }
      }
    });

    // ============================================================
    // CGPA CALCULATOR — live updating, above the Grade Details table
    // Grade points: O=10, A+=9, A=8, B+=7, B=6, C=5.5, others=0
    // Subjects + estimated grades auto-populated from marks table.
    // No default grade — user must select. CGPA updates live.
    // ============================================================
    if (!document.getElementById("cgpa-calc-section-v31")) {
      // ── Grade points map ──
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

      // ── Inject styles once ──
      if (!document.getElementById("cgpa-calc-styles-v31")) {
        const s = document.createElement("style");
        s.id = "cgpa-calc-styles-v31";
        s.innerHTML = `
          #cgpa-calc-section-v31 { animation: cgpaFadeIn 0.4s ease both; }
          @keyframes cgpaFadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
          /* Info tooltip */
          .cgpa-info-wrap:hover .cgpa-tt { display:block !important; }
          /* Delete btn shows on row hover */
          .cgpa-row:hover .cgpa-del { opacity:1 !important; }
          /* Hide number spinners */
          .cgpa-cred::-webkit-inner-spin-button,.cgpa-cred::-webkit-outer-spin-button{-webkit-appearance:none}
          /* Input focus */
          .cgpa-subj:focus,.cgpa-cred:focus{outline:none;border-color:#253b70 !important;box-shadow:0 0 0 3px rgba(99,102,241,.15) !important}
          
          /* Modernized Grade Dropdown Styles */
          .cgpa-opt {
            appearance: none; -webkit-appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%234f46e5' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
            background-repeat: no-repeat !important;
            background-position: right 10px center !important;
            padding-right: 28px !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .cgpa-opt:hover {
            border-color: #132450 !important;
            background-color: #ffffff !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.12) !important;
          }
          .cgpa-opt:focus {
            outline: none;
            border-color: #132450 !important;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15) !important;
            background-color: #ffffff !important;
            transform: translateY(0);
          }
          .cgpa-opt:active { transform: scale(0.97); }

          /* Select placeholder color */
          .cgpa-opt option[value=""]{color:#94a3b8}
          
          /* Live score pulse */
          @keyframes cgpaPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
          .cgpa-pulse{animation:cgpaPulse 0.3s ease}
          @keyframes liveDot { 0%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 70%{box-shadow:0 0 0 6px rgba(34,197,94,0)} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} }
          .live-dot { width: 7px; height: 7px; background: #22c55e; border-radius: 50%; display: inline-block; vertical-align: middle; margin-right: 6px; position: relative; animation: liveDot 2s infinite; }
          
          /* Hover states for action buttons */
          #cgpa-reset-credits-v31:hover{background:#fff4c2 !important}
          #cgpa-fresh-v31:hover{background:#f1f5f9 !important}
          #cgpa-add-v31:hover{background:#f0f0ff !important}
          .cgpa-row:hover{background:#fafbff !important}
          
          /* Missing credit pulse glow */
          @keyframes cgpaCredPulse { 0%{box-shadow:0 0 0 0 rgba(245,158,11,.4)} 70%{box-shadow:0 0 0 6px rgba(245,158,11,0)} 100%{box-shadow:0 0 0 0 rgba(245,158,11,0)} }
          .cgpa-cred-glow { animation: cgpaCredPulse 2s infinite; border-color:#F4C542 !important; }
        `;
        document.head.appendChild(s);
      }

      // ── Helper: Update table row numbers (1, 2, 3...) ──
      function updateRowNumbers() {
        const rows = calcTbody.querySelectorAll(".cgpa-row");
        rows.forEach((r, idx) => {
          const numEl = r.querySelector(".cgpa-num");
          if (numEl) numEl.textContent = idx + 1;
        });
      }

      // ── Unified Helper: live recalculate CGPA ──
      function recalcCGPA() {
        updateRowNumbers();
        const rows = calcTbody.querySelectorAll(".cgpa-row");
        let totalCr = 0,
          totalPts = 0,
          hasAny = false;
        rows.forEach((r) => {
          const cr = parseFloat(r.querySelector(".cgpa-cred").value);
          const gv = r.querySelector(".cgpa-opt").value;
          if (!isNaN(cr) && gv !== "") {
            const pt = GRADE_PTS[gv] ?? 0;
            totalCr += cr;
            totalPts += cr * pt;
            hasAny = true;
          }
        });
        const cgpa = hasAny && totalCr > 0 ? totalPts / totalCr : null;

        // Update live displays
        const valEl = cgpaSection.querySelector("#cgpa-live-val");
        const barEl = cgpaSection.querySelector("#cgpa-live-bar");
        const lblEl = cgpaSection.querySelector("#cgpa-live-lbl");
        const pctLbl = cgpaSection.querySelector("#cgpa-pct-lbl");
        const boxEl = cgpaSection.querySelector("#cgpa-live-box");
        const panelEl = cgpaSection.querySelector("#cgpa-right-panel-v31");

        if (cgpa !== null) {
          const pct = (cgpa / 10) * 100;
          valEl.textContent = cgpa.toFixed(2);
          barEl.style.width = pct.toFixed(1) + "%";
          pctLbl.textContent = pct.toFixed(0) + "%";

          let bg = "#f8fafc",
            br = "#f1f5f9",
            accent = "#132450";
          if (cgpa >= 9) {
            bg = "#dcfce7";
            br = "#bbf7d0";
            accent = "#15803d";
          } else if (cgpa >= 8) {
            bg = "#e8ecf5";
            br = "#bfdbfe";
            accent = "#132450";
          } else if (cgpa >= 7) {
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

          // Glowing thin border for the whole panel
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

      // ── Helper: build one calculator row ──
      // name: subject name (null/"" for blank new rows)
      // estGrade: pre-selected grade (null for blank)
      // credit: pre-filled credit value (null for blank)
      // isNew: true = new manually-added row (focus+highlight, no value)
      function buildCalcRow(name, estGrade, credit, isNew, code) {
        const tr = document.createElement("tr");
        tr.className = "cgpa-row";
        if (code) tr.dataset.code = code;
        tr.style.cssText =
          "border-bottom:1px solid #e8eaf0;transition:background .15s;";
        const optHtml =
          `<option value="" disabled selected style="color:#94a3b8;background:#ffffff;">— Grade —</option>` +
          GRADE_OPTIONS.map((g) => {
            let bg = "#ffffff",
              co = "#1e293b";
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
            return `<option value="${g}" style="background:${bg};color:${co};font-weight:700;">${g}</option>`;
          }).join("");
        // For new rows: empty value, highlighted border; for seeded: show name
        const inputValue = isNew || !name ? "" : name.replace(/"/g, "&quot;");
        const inputBorder = isNew
          ? "border:1.5px solid #253b70;box-shadow:0 0 0 3px rgba(99,102,241,.2);"
          : "border:1.5px solid #e8eaf0;";
        const inputPlaceholder = isNew ? "Type subject name…" : "Subject name";
        tr.innerHTML = `
          <td class="cgpa-num" style="padding:8px 4px;width:36px;text-align:center;font-size:12px;font-weight:800;color:#64748b;font-family:'Plus Jakarta Sans',sans-serif;"></td>
          <td style="padding:8px 12px;">
            <input class="cgpa-subj" type="text" value="${inputValue}"
              placeholder="${inputPlaceholder}"
              style="width:100%;${inputBorder}border-radius:8px;
                padding:6px 12px;font-size:12px;font-weight:700;color:#1e1b4b;
                background:#ffffff;text-align:left;
                font-family:'Plus Jakarta Sans',sans-serif;
                transition:border-color .2s,box-shadow .2s;" />
          </td>
          <td style="padding:8px 12px;width:80px;text-align:center;">
            <input class="cgpa-cred" type="number" min="0" max="10" step="0.5"
              placeholder="Cr"
              value="${credit !== null && credit !== undefined ? credit : ""}"
              style="width:100%;border:1.5px solid #e8eaf0;border-radius:8px;
                padding:6px 8px;font-size:12px;font-weight:700;color:#1e293b;
                background:#f8fafc;text-align:center;
                font-family:'Plus Jakarta Sans',sans-serif;
                transition:border-color .2s,box-shadow .2s;" />
          </td>
          <td style="padding:8px 12px;width:110px;text-align:center;">
            <select class="cgpa-opt"
              style="width:100%;border:1.5px solid #e2e8f0;border-radius:10px;
                padding:7px 10px;font-size:12px;font-weight:800;
                color:#132450;background:#f8faff;cursor:pointer;
                font-family:'Plus Jakarta Sans',sans-serif;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              ${optHtml}
            </select>
          </td>
          <td style="padding:8px 6px 8px 10px;width:32px;text-align:center;">
            <button class="cgpa-del" title="Remove"
              style="opacity:0;transition:opacity .15s;background:#fef2f2;
                border:1.5px solid #fecaca;color:#ef4444;border-radius:6px;
                width:24px;height:24px;font-size:15px;cursor:pointer;
                display:inline-flex;align-items:center;justify-content:center;font-weight:900;">
              &times;
            </button>
          </td>
        `;

        // ── Highlight empty credits for existing subjects ──
        const credInp = tr.querySelector(".cgpa-cred");
        const isMissing =
          (credit === null || credit === undefined || credit === "") &&
          name &&
          !isNew;
        if (isMissing) credInp.classList.add("cgpa-cred-glow");

        // Remove glow once user inputs something
        credInp.addEventListener("input", () => {
          if (credInp.value !== "") credInp.classList.remove("cgpa-cred-glow");
          else if (!isNew && name) credInp.classList.add("cgpa-cred-glow");
        });

        // Pre-set estimated grade if provided
        const sel = tr.querySelector(".cgpa-opt");
        if (estGrade && GRADE_PTS[estGrade] !== undefined) sel.value = estGrade;
        // Wire live events
        tr.querySelector(".cgpa-cred").addEventListener("input", recalcCGPA);
        tr.querySelector(".cgpa-opt").addEventListener("change", recalcCGPA);
        // Wire delete
        tr.querySelector(".cgpa-del").addEventListener("click", () => {
          tr.remove();
          recalcCGPA();
        });
        // For new rows: auto-focus + select the input
        if (isNew) {
          setTimeout(() => {
            const inp = tr.querySelector(".cgpa-subj");
            if (inp) {
              inp.focus();
              inp.select();
            }
          }, 30);
        }
        // ── Auto-lookup credits & title when typing code or subject name ──
        tr.querySelector(".cgpa-subj").addEventListener("input", (e) => {
          const val = e.target.value.toLowerCase().trim();
          if (val.length < 2) return;
          try {
            const savedCredits = JSON.parse(
              localStorage.getItem("ar_credits_v31") || "{}",
            );
            const savedCourses = JSON.parse(
              localStorage.getItem("ar_timetable_courses_v31") || "[]",
            );

            // Check course list by code or title
            let matchCourse = savedCourses.find(
              (c) =>
                c.code.toLowerCase() === val ||
                c.code.toLowerCase().includes(val) ||
                c.title.toLowerCase().includes(val),
            );

            const credInp = tr.querySelector(".cgpa-cred");
            const subjInp = tr.querySelector(".cgpa-subj");

            if (matchCourse) {
              if (
                !credInp.value &&
                matchCourse.credit !== undefined &&
                matchCourse.credit !== null
              ) {
                credInp.value = matchCourse.credit;
                recalcCGPA();
                credInp.style.borderColor = "#10b981";
                setTimeout(() => {
                  credInp.style.borderColor = "#e8eaf0";
                }, 1500);
              }
              if (val === matchCourse.code.toLowerCase() && matchCourse.title) {
                subjInp.value = `${matchCourse.code} - ${matchCourse.title}`;
              }
            } else {
              const matchCode = Object.keys(savedCredits).find(
                (k) =>
                  val.includes(k.toLowerCase()) ||
                  k.toLowerCase().includes(val),
              );
              if (matchCode && !credInp.value) {
                credInp.value = savedCredits[matchCode];
                recalcCGPA();
                credInp.style.borderColor = "#10b981";
                setTimeout(() => {
                  credInp.style.borderColor = "#e8eaf0";
                }, 1500);
              }
            }
          } catch (err) {}
        });
        return tr;
      }

      // ── Main section container ──
      const cgpaSection = document.createElement("div");
      cgpaSection.id = "cgpa-calc-section-v31";
      cgpaSection.style.cssText =
        "margin-top:32px;margin-bottom:4px;font-family:'Plus Jakarta Sans',sans-serif;";

      // ── Two-panel wrapper: [table | live score] ──
      const panels = document.createElement("div");
      panels.style.cssText = "display:flex;gap:16px;align-items:flex-start;";

      // ───── LEFT PANEL: header + card ─────
      const leftPanel = document.createElement("div");
      leftPanel.style.cssText = "flex:1;min-width:0;";

      // Header
      const hdr = document.createElement("div");
      hdr.style.cssText =
        "display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;";
      hdr.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <span style="font-size:15px;font-weight:900;color:#1e1b4b;text-transform:uppercase;letter-spacing:.04em;">
            GPA Calculator
          </span>
        </div>

        <!-- Action buttons -->
        <div style="display:flex;gap:6px;align-items:center;">
          <button id="cgpa-reset-credits-v31" title="Clear all credit values"
            style="display:flex;align-items:center;gap:5px;background:#fffaf0;
              border:1.5px solid #f4d875;color:#745900;border-radius:8px;
              padding:6px 11px;font-size:11px;font-weight:800;
              font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;
              transition:background .2s;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>Reset Credits
          </button>
          <button id="cgpa-fresh-v31" title="Clear all grades"
            style="display:flex;align-items:center;gap:5px;background:#e8ecf5;
              border:1.5px solid #ddd6fe;color:#132450;border-radius:8px;
              padding:6px 11px;font-size:11px;font-weight:800;
              font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;
              transition:background .2s;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>Reset Grades
          </button>
        </div>
      `;

      // Card
      const card = document.createElement("div");
      card.style.cssText = `
        border:1px solid #b8c2d9;border-radius:16px;overflow:hidden;
        box-shadow:0 20px 40px -12px rgba(79,70,229,.15),0 0 20px rgba(99,102,241,.05);
        background:#ffffff;
      `;

      // Table
      const tbl = document.createElement("table");
      tbl.style.cssText = "width:100%;border-collapse:collapse;";
      tbl.innerHTML = `
        <thead>
          <tr style="background:linear-gradient(135deg,#1e1b4b,#0d1938);">
            <th style="width:36px;padding:11px 4px;text-align:center;font-size:11px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:.08em;">#</th>
            <th style="padding:11px 12px;text-align:left;font-size:11px;font-weight:900;
              color:#ffffff;text-transform:uppercase;letter-spacing:.08em;">Subject</th>
            <th style="padding:11px 12px;text-align:center;font-size:11px;font-weight:900;
              color:#ffffff;text-transform:uppercase;letter-spacing:.08em;width:80px;">Credits</th>
            <th style="padding:11px 12px;text-align:center;font-size:11px;font-weight:900;
              color:#ffffff;text-transform:uppercase;letter-spacing:.08em;width:110px;">Grade</th>
            <th style="width:32px;padding:11px 6px;"></th>
          </tr>
        </thead>
      `;
      const calcTbody = document.createElement("tbody");

      // Load saved credits and courses from localStorage (scraped from timetable)
      let savedCredits = {};
      let savedCourses = [];
      try {
        savedCredits = JSON.parse(
          localStorage.getItem("ar_credits_v31") || "{}",
        );
        savedCourses = JSON.parse(
          localStorage.getItem("ar_timetable_courses_v31") || "[]",
        );
      } catch (e) {}

      // Seed rows from saved timetable courses or scraped marks data (or 5 blanks)
      let seedData = [];
      if (savedCourses.length > 0) {
        seedData = savedCourses.map((c) => {
          const displayName = c.title
            ? c.title.includes(c.code)
              ? c.title
              : `${c.code} - ${c.title}`
            : c.code;
          let grade = null;
          if (calcCourseData.length > 0) {
            const m = calcCourseData.find(
              (s) =>
                s.code === c.code ||
                (s.name &&
                  c.title &&
                  s.name.toLowerCase().includes(c.title.toLowerCase())) ||
                (s.name &&
                  c.title &&
                  c.title.toLowerCase().includes(s.name.toLowerCase())),
            );
            if (m) grade = m.grade;
          }
          return {
            name: displayName,
            grade: grade,
            credit: c.credit,
            code: c.code,
          };
        });
      } else if (calcCourseData.length > 0) {
        seedData = calcCourseData.map((s) => {
          let cr = s.credit;
          let name = s.name;
          const matchCourse = savedCourses.find(
            (c) =>
              c.code === s.code ||
              (c.title &&
                s.name &&
                c.title.toLowerCase().includes(s.name.toLowerCase())),
          );
          if (matchCourse) {
            if (cr === null || cr === undefined) cr = matchCourse.credit;
            if (!name || name === s.code) name = matchCourse.title || name;
          }
          if (cr === null || cr === undefined) {
            if (s.code && savedCredits.hasOwnProperty(s.code))
              cr = savedCredits[s.code];
            else {
              const match = Object.keys(savedCredits).find(
                (k) => s.name && s.name.toLowerCase().includes(k.toLowerCase()),
              );
              if (match) cr = savedCredits[match];
            }
          }
          return { name, grade: s.grade, credit: cr, code: s.code };
        });
      } else {
        seedData = Array.from({ length: 5 }, () => ({
          name: "",
          grade: null,
          credit: null,
        }));
      }

      seedData.forEach((s) => {
        calcTbody.appendChild(
          buildCalcRow(s.name, s.grade, s.credit, false, s.code),
        );
      });

      tbl.appendChild(calcTbody);

      // Footer: Add Subject + Clear All buttons
      const tfoot = document.createElement("tfoot");
      tfoot.innerHTML = `
        <tr>
          <td colspan="5" style="padding:10px 12px;border-top:1.5px solid #e8eaf0;background:#fafbff;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <button id="cgpa-add-v31"
                style="display:inline-flex;align-items:center;gap:5px;
                  background:transparent;border:1.5px dashed #b8c2d9;color:#132450;
                  border-radius:8px;padding:6px 14px;font-size:11px;font-weight:800;
                  font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;
                  transition:background .2s;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>Add Subject
              </button>
              <div style="display:flex;gap:8px;align-items:center;">
                <button id="cgpa-clear-all-v31"
                  style="display:inline-flex;align-items:center;gap:5px;
                    background:transparent;border:1.5px solid #fca5a5;color:#dc2626;
                    border-radius:8px;padding:6px 14px;font-size:11px;font-weight:800;
                    font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;
                    transition:background .2s;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>Clear All
                </button>
                <button id="cgpa-restore-subjects-v31" title="Sync subjects and credits from My Time Table page"
                  style="display:inline-flex;align-items:center;gap:5px;
                    background:#e8ecf5;border:1.5px solid #b8c2d9;color:#132450;
                    border-radius:8px;padding:6px 14px;font-size:11px;font-weight:800;
                    font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;
                    transition:all .2s;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                    <path d="M16 16h5v5"/>
                  </svg>Sync Timetable
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

      // ───── RIGHT PANEL: live score ─────
      const rightPanel = document.createElement("div");
      rightPanel.id = "cgpa-right-panel-v31";
      rightPanel.style.cssText = `
        width:220px; flex-shrink:0;
        background:#ffffff; border:1.5px solid #e2e8f0; border-radius:24px;
        padding:28px 20px; display:flex; flex-direction:column; align-items:center;
        box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);
        position:sticky; top:16px; transition:all 0.3s;
      `;
      rightPanel.innerHTML = `
        <div style="width:100%; text-align:center;">
          <div style="font-size:10px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:12px; display:flex; align-items:center; justify-content:center;">
            <span class="live-dot"></span> Live GPA
          </div>
          <div id="cgpa-live-box" style="background:#f8fafc; border-radius:20px; padding:24px 10px; border:1.5px solid #f1f5f9; margin-bottom:20px; transition:all 0.4s;">
            <div id="cgpa-live-val" style="font-size:58px; font-weight:900; color:#1e1b4b; line-height:1; letter-spacing:-0.04em; transition:all 0.3s;">—</div>
            <div style="font-size:11px; font-weight:800; color:#132450; margin-top:8px; opacity:0.8;">Semester GPA</div>
          </div>
          <div style="width:100%; padding:0 10px;">
             <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:800; color:#64748b; margin-bottom:8px;">
               <span id="cgpa-live-lbl">Progress</span>
               <span id="cgpa-pct-lbl" style="color:#132450;">0%</span>
             </div>
             <div style="width:100%; background:#f1f5f9; border-radius:99px; height:6px; overflow:hidden;">
               <div id="cgpa-live-bar" style="height:100%; width:0%; background:#132450; border-radius:99px; transition:width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
             </div>
          </div>
          <div style="margin-top:24px; display:flex; align-items:center; gap:6px; justify-content:center; padding:0 4px;">
            <div class="tooltip-v31" style="display:flex; align-items:center;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <div class="tooltip-bubble" style="width:200px;">
                <div style="font-size:8px; color:#132450; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px; font-weight:900; text-align:center;">GPA Formula</div>
                <div class="formula-box">
                  <div style="margin-bottom:1px;">Σ (Credits × Points)</div>
                  <div class="formula-line"></div>
                  <div style="margin-top:1px;">Σ Credits</div>
                </div>
              </div>
            </div>
            <span style="font-size:10px; font-weight:700; color:#94a3b8; line-height:1.2; text-align:left;">GPA Calculated from Estimated Grades</span>
          </div>
        </div>
      `;

      panels.appendChild(leftPanel);
      panels.appendChild(rightPanel);
      cgpaSection.appendChild(panels);

      // ───── FOOTER NOTE: Simple 1-line professional note ─────
      const footerNote = document.createElement("div");
      footerNote.style.cssText = `
        margin-top:12px;padding:8px 14px;border-radius:10px;
        background:#f8fafc;border:1.5px solid #e2e8f0;font-size:11px;color:#64748b;
        display:flex;align-items:center;gap:8px;
      `;

      // This section finds the correct "My Time Table" page URL from the sidebar.
      // We do this dynamically so that it works every year (e.g., 2024, 2025) without hardcoding!
      const ttLink = Array.from(
        document.querySelectorAll('a[href*="#Page:My_Time_Table"]'),
      ).find((a) => a.href.includes("Time_Table"));
      const ttHash = ttLink
        ? ttLink.getAttribute("href")
        : "#Page:My_Time_Table_2023_24";

      footerNote.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>Visit the <b id="cgpa-tt-jump-link" style="color:#132450;cursor:pointer;">My Time Table</b> page to automatically sync your subject credits. Manual edits are supported.</span>
      `;
      footerNote.querySelector("#cgpa-tt-jump-link")?.addEventListener("click", () => {
        window.location.hash = ttHash;
      });
      cgpaSection.appendChild(footerNote);

      // Initial calculation
      recalcCGPA();

      // ── Wire action buttons ──
      // Reset Credits: clear all credit inputs
      cgpaSection
        .querySelector("#cgpa-reset-credits-v31")
        .addEventListener("click", () => {
          calcTbody.querySelectorAll(".cgpa-cred").forEach((inp) => {
            inp.value = "";
          });
          recalcCGPA();
        });
      // Reset Grades: clear all grade selects back to placeholder
      cgpaSection
        .querySelector("#cgpa-fresh-v31")
        .addEventListener("click", () => {
          calcTbody.querySelectorAll(".cgpa-opt").forEach((s) => {
            s.value = "";
          });
          recalcCGPA();
        });
      // Add Subject — blank row with highlight + auto-focus
      cgpaSection
        .querySelector("#cgpa-add-v31")
        .addEventListener("click", () => {
          const newRow = buildCalcRow("", null, null, true);
          calcTbody.appendChild(newRow);
          newRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
          recalcCGPA();
        });
      // Clear All — remove every row, insert 5 fresh blank rows
      cgpaSection
        .querySelector("#cgpa-clear-all-v31")
        .addEventListener("click", () => {
          calcTbody.innerHTML = "";
          for (let i = 0; i < 5; i++) {
            calcTbody.appendChild(buildCalcRow("", null, null, false));
          }
          recalcCGPA();
        });

      // Unified Timetable & Subject Sync Handler
      function syncFromTimetable() {
        let savedCredits = {};
        let savedCourses = [];
        try {
          savedCredits = JSON.parse(
            localStorage.getItem("ar_credits_v31") || "{}",
          );
          savedCourses = JSON.parse(
            localStorage.getItem("ar_timetable_courses_v31") || "[]",
          );
        } catch (e) {}

        const hasTT =
          savedCourses.length > 0 || Object.keys(savedCredits).length > 0;
        if (!hasTT) {
          const ttLink = Array.from(
            document.querySelectorAll('a[href*="#Page:My_Time_Table"]'),
          ).find((a) => a.href.includes("Time_Table"));
          const ttHash = ttLink
            ? ttLink.getAttribute("href")
            : "#Page:My_Time_Table_2023_24";

          alert(
            "No timetable data synced yet!\n\nPlease visit the 'My Time Table' page once to automatically sync your subjects and credits.",
          );
          window.location.hash = ttHash;
          return;
        }

        // Preserve user's current selected grades
        const existingGrades = {};
        calcTbody.querySelectorAll(".cgpa-row").forEach((r) => {
          const code = r.dataset.code;
          const subjVal = r
            .querySelector(".cgpa-subj")
            .value.trim()
            .toLowerCase();
          const gVal = r.querySelector(".cgpa-opt").value;
          if (gVal) {
            if (code) existingGrades[code] = gVal;
            if (subjVal) existingGrades[subjVal] = gVal;
          }
        });

        calcTbody.innerHTML = "";

        if (savedCourses.length > 0) {
          savedCourses.forEach((c) => {
            const displayName = c.title
              ? c.title.includes(c.code)
                ? c.title
                : `${c.code} - ${c.title}`
              : c.code;
            let savedGrade =
              existingGrades[c.code] ||
              existingGrades[displayName.toLowerCase()] ||
              null;
            if (!savedGrade && calcCourseData.length > 0) {
              const m = calcCourseData.find(
                (s) =>
                  s.code === c.code ||
                  (s.name &&
                    c.title &&
                    s.name.toLowerCase().includes(c.title.toLowerCase())) ||
                  (s.name &&
                    c.title &&
                    c.title.toLowerCase().includes(s.name.toLowerCase())),
              );
              if (m) savedGrade = m.grade;
            }
            calcTbody.appendChild(
              buildCalcRow(displayName, savedGrade, c.credit, false, c.code),
            );
          });
        } else if (calcCourseData.length > 0) {
          calcCourseData.forEach((s) => {
            let cr = s.credit;
            let name = s.name;
            const matchCourse = savedCourses.find(
              (c) =>
                c.code === s.code ||
                (c.title &&
                  s.name &&
                  c.title.toLowerCase().includes(s.name.toLowerCase())),
            );
            if (matchCourse) {
              if (cr === null || cr === undefined) cr = matchCourse.credit;
              if (!name || name === s.code) name = matchCourse.title || name;
            }
            if (
              (cr === null || cr === undefined) &&
              s.code &&
              savedCredits.hasOwnProperty(s.code)
            ) {
              cr = savedCredits[s.code];
            }
            const savedGrade =
              existingGrades[s.code] ||
              existingGrades[name.toLowerCase()] ||
              s.grade;
            calcTbody.appendChild(
              buildCalcRow(name, savedGrade, cr, false, s.code),
            );
          });
        }
        recalcCGPA();
      }

      const syncBtn = cgpaSection.querySelector("#cgpa-sync-timetable-v31");
      if (syncBtn) syncBtn.addEventListener("click", syncFromTimetable);

      const restoreBtn = cgpaSection.querySelector(
        "#cgpa-restore-subjects-v31",
      );
      if (restoreBtn) restoreBtn.addEventListener("click", syncFromTimetable);

      // ── Insert before grade-details table ──
      marksTable.insertAdjacentElement("afterend", cgpaSection);

      // ============================================================
      // OVERALL SEMESTER-WISE CGPA CALCULATOR (Modern Dashboard)
      // ============================================================
      if (!document.getElementById("overall-cgpa-section-v31")) {
        // ── Modern Styles ──
        if (!document.getElementById("overall-cgpa-styles-v31")) {
          const s = document.createElement("style");
          s.id = "overall-cgpa-styles-v31";
          s.innerHTML = `
          
          #overall-cgpa-section-v31 { animation: cgpaFadeIn 0.3s ease both; margin-top: 24px; max-width: 600px; font-family:'Plus Jakarta Sans',sans-serif; }
            .compact-container { background: #ffffff; border-radius: 14px; border: 1.5px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05); }
            .compact-header { background: #f8fafc; border-bottom: 1.5px solid #f1f5f9; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; color: #1e1b4b; }
            .compact-score-group { display: flex; align-items: center; gap: 12px; }
            .compact-val { font-size: 28px; font-weight: 900; line-height: 1; letter-spacing: -0.02em; color: #1e1b4b; }
            .compact-lbl { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; line-height: 1; }
            
            .compact-grid { padding: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #fff; }
            .badge-sem { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 5px; display: flex; align-items: center; gap: 6px; position: relative; transition: all 0.2s ease; }
            .badge-sem:hover { border-color: #cbd5e1; background: #fff; }
            .badge-sem .num { height: 20px; padding: 0 8px; background: #e8ecf5; color: #132450; border-radius: 6px; font-size: 9px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; white-space: nowrap; }
            .badge-sem input { width: 100%; border: none; background: transparent; font-size: 13px; font-weight: 800; color: #1e293b; text-align: center; padding: 2px; outline: none; font-family: inherit; }
            .badge-sem:focus-within { border-color: #253b70; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
            
            .badge-del { position: absolute; top: -6px; right: -6px; background: #ef4444; color: #fff; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 900; opacity: 0; transition: opacity 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 5; }
            .badge-sem:hover .badge-del { opacity: 1; }
            
            .compact-footer { padding: 8px 12px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; }
            .compact-btn { flex: 1; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; font-size: 10px; font-weight: 800; color: #64748b; cursor: pointer; transition: all 0.2s; font-family: inherit; }
            .compact-btn:hover { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
            .btn-add-compact { background: #e8ecf5; color: #132450; border-color: #b8c2d9; }
            .btn-add-compact:hover { background: #e8ecf5; }
            
            .tooltip-v31 { position: relative; cursor: help; }
            .tooltip-bubble {
              position: absolute;
              bottom: 130%;
              left: 50%;
              transform: translateX(-50%) translateY(6px);
              background: #f4f3ff;
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              color: #1e1b4b;
              padding: 10px 14px;
              border-radius: 14px;
              font-size: 9.5px;
              font-weight: 800;
              width: 210px;
              text-align: center;
              opacity: 0;
              visibility: hidden;
              transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
              box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
              z-index: 2000;
              pointer-events: none;
              border: 1.5px solid #e9e9ff;
              line-height: 1.3;
            }
            .tooltip-bubble::after {
              content: "";
              position: absolute;
              top: 100%;
              left: 50%;
              transform: translateX(-50%);
              border: 6px solid transparent;
              border-top-color: #f4f3ff;
            }
            .tooltip-v31:hover .tooltip-bubble {
              opacity: 1;
              visibility: visible;
              transform: translateX(-50%) translateY(0);
            }
            
            .formula-box { font-family: 'monospace'; background: rgba(255,255,255,0.6); padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.03); color: #132450; line-height: 1.4; font-size: 9.5px; font-weight: 900; text-align: center; }
            .formula-line { height: 1.5px; background: #132450; margin: 3px auto; width: 100%; }
          `;
          document.head.appendChild(s);
        }

        const overallSection = document.createElement("div");
        overallSection.id = "overall-cgpa-section-v31";

        const hdr = document.createElement("div");
        hdr.style.cssText =
          "display:flex; align-items:center; margin-bottom:12px; max-width:600px;";
        hdr.innerHTML = `
          <div style="display:flex; align-items:center; font-size:16px; font-weight:800; color:#1e1b4b; text-transform:uppercase; letter-spacing:0.03em;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; color: #132450;"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/></svg> 
            Overall CGPA
          </div>
          <div class="tooltip-v31" style="margin-left: 8px; color:#94a3b8; display:flex; align-items:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <div class="tooltip-bubble" style="width:180px;">
              <div style="font-size:8px; color:#132450; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px; font-weight:900; text-align:center;">CGPA Formula</div>
              <div class="formula-box">
                <div style="margin-bottom:1px;">Σ Semester GPA</div>
                <div class="formula-line"></div>
                <div style="margin-top:1px;">Total Semester</div>
              </div>
            </div>
          </div>
        `;
        overallSection.appendChild(hdr);

        const container = document.createElement("div");
        container.className = "compact-container";

        container.innerHTML = `
          <div class="compact-header">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <div class="compact-lbl">Semester-wise Average</div>
              <div id="compact-meta" style="font-size:11px; font-weight:700; color:#94a3b8;">0 Terms</div>
            </div>
            <div class="compact-score-group">
              <div style="text-align:right;">
                <div class="compact-lbl">Overall CGPA</div>
                <div id="compact-val" class="compact-val">—</div>
              </div>
            </div>
          </div>
          <div id="compact-grid" class="compact-grid"></div>
          <div class="compact-footer">
            <button id="add-compact" class="compact-btn btn-add-compact">+ Add More</button>
            <button id="reset-compact" class="compact-btn">Reset All</button>
          </div>
        `;
        overallSection.appendChild(container);

        const grid = container.querySelector("#compact-grid");

        function createCompactBadge(index) {
          const div = document.createElement("div");
          div.className = "badge-sem";
          const delBtn =
            index > 8
              ? `<button class="badge-del" title="Remove">&times;</button>`
              : "";
          div.innerHTML = `
            <div class="num">Semester ${index}</div>
            <input type="number" class="compact-input" placeholder="0.00" min="0" max="10" step="0.01">
            ${delBtn}
          `;
          if (index > 8) {
            div.querySelector(".badge-del").addEventListener("click", () => {
              div.remove();
              recalcOverall();
              overallSection.querySelectorAll(".badge-sem").forEach((b, i) => {
                b.querySelector(".num").textContent = `Semester ${i + 1}`;
              });
            });
          }
          div
            .querySelector(".compact-input")
            .addEventListener("input", recalcOverall);
          return div;
        }

        function recalcOverall() {
          const inputs = overallSection.querySelectorAll(".compact-input");
          let total = 0,
            count = 0;
          inputs.forEach((inp) => {
            const v = parseFloat(inp.value);
            if (!isNaN(v) && v > 0) {
              total += v;
              count++;
            }
          });
          const avg = count > 0 ? total / count : null;
          const valEl = overallSection.querySelector("#compact-val");
          const metaEl = overallSection.querySelector("#compact-meta");

          metaEl.textContent = `${count} Semester${count !== 1 ? "s" : ""} Recorded`;
          if (avg !== null) {
            valEl.textContent = avg.toFixed(2);
          } else {
            valEl.textContent = "—";
          }
        }

        for (let i = 1; i <= 8; i++) grid.appendChild(createCompactBadge(i));

        overallSection
          .querySelector("#add-compact")
          .addEventListener("click", () => {
            const newIdx = grid.querySelectorAll(".badge-sem").length + 1;
            grid.appendChild(createCompactBadge(newIdx));
          });

        overallSection
          .querySelector("#reset-compact")
          .addEventListener("click", () => {
            grid.innerHTML = "";
            for (let i = 1; i <= 8; i++)
              grid.appendChild(createCompactBadge(i));
            recalcOverall();
          });

        cgpaSection.insertAdjacentElement("afterend", overallSection);
      }
    }

    if (!document.getElementById("grade-details-section-v31")) {
      const sectionContainer = document.createElement("div");
      sectionContainer.id = "grade-details-section-v31";
      sectionContainer.style.marginTop = "32px";
      sectionContainer.style.marginBottom = "32px";
      sectionContainer.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
      sectionContainer.style.display = "flex";
      sectionContainer.style.flexDirection = "column";
      sectionContainer.style.alignItems = "flex-start";

      const title = document.createElement("div");
      title.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; color: #132450;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> Grade Details`;
      title.style.display = "flex";
      title.style.alignItems = "center";
      title.style.fontSize = "16px";
      title.style.fontWeight = "800";
      title.style.color = "#1e1b4b";
      title.style.marginBottom = "12px";
      title.style.textTransform = "uppercase";
      title.style.letterSpacing = "0.03em";

      const tableWrapper = document.createElement("div");
      tableWrapper.style.width = "100%";
      tableWrapper.style.maxWidth = "520px";
      tableWrapper.style.borderRadius = "12px";
      tableWrapper.style.overflow = "hidden";
      tableWrapper.style.border = "1.5px solid #1e1b4b";
      tableWrapper.style.boxShadow =
        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
      tableWrapper.style.backgroundColor = "#ffffff";

      const gradeTable = document.createElement("table");
      gradeTable.style.width = "100%";
      gradeTable.style.borderCollapse = "collapse";
      gradeTable.style.border = "none";

      const hoverStyle = document.createElement("style");
      hoverStyle.innerHTML = `
        #grade-details-section-v31 table tbody tr { transition: background-color 0.2s ease; }
        #grade-details-section-v31 table tbody tr:hover { background-color: #f8fafc !important; }
        #grade-details-section-v31 table td { border: 1px solid #e2e8f0 !important; }
        #grade-details-section-v31 table th { border: 1px solid #1e1b4b !important; border-top: none !important; }
        #grade-details-section-v31 table th:first-child { border-left: none !important; }
        #grade-details-section-v31 table th:last-child { border-right: none !important; }
        #grade-details-section-v31 table td:first-child { border-left: none !important; }
        #grade-details-section-v31 table td:last-child { border-right: none !important; border-bottom: none !important; }
        #grade-details-section-v31 table tr:last-child td { border-bottom: none !important; }
      `;
      document.head.appendChild(hoverStyle);

      const thead = document.createElement("thead");
      const hRow = document.createElement("tr");

      ["Grade", "Marks Range", "Result"].forEach((text) => {
        const th = document.createElement("th");
        th.className = "magic-cell header-modern";
        th.innerHTML = text;
        th.style.padding = "6px 8px";
        th.style.fontSize = "12px";
        hRow.appendChild(th);
      });
      thead.appendChild(hRow);
      gradeTable.appendChild(thead);

      const tbody = document.createElement("tbody");
      const gradeData = [
        ["O", "91 - 100", "PASS"],
        ["A+", "81 - 90", "PASS"],
        ["A", "71 - 80", "PASS"],
        ["B+", "61 - 70", "PASS"],
        ["B", "56 - 60", "PASS"],
        ["C", "50 - 55", "PASS"],
        ["W", "0 - 100", "FAIL"],
        ["*", "0 - 100", "WITHHELD"],
        ["Ab", "0 - 100", "INCOMPLETE"],
        ["I", "0 - 100", "FAIL"],
        ["F", "0 - 49", "FAIL"],
      ];

      const getGradeBadge = (g) => {
        let conf;
        if (g === "O")
          conf = { color: "#15803d", bg: "#dcfce7", border: "#bbf7d0" };
        else if (g === "A+")
          conf = { color: "#132450", bg: "#e8ecf5", border: "#bfdbfe" };
        else if (g === "A")
          conf = { color: "#0e7490", bg: "#cffafe", border: "#a5f3fc" };
        else if (g === "B+")
          conf = { color: "#9a7200", bg: "#ffedd5", border: "#fed7aa" };
        else if (g === "B")
          conf = { color: "#745900", bg: "#fff4c2", border: "#fff4c2" };
        else if (g === "C")
          conf = { color: "#475569", bg: "#f1f5f9", border: "#e2e8f0" };
        else conf = { color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" };
        return `<div style="display: flex; align-items: center; justify-content: center; width: 100%; padding: 2px 0; background-color: ${conf.bg}; color: ${conf.color}; border: 1px solid ${conf.border}; border-radius: 4px; font-size: 13px; font-weight: 800; box-shadow: 0 1px 2px rgba(0,0,0,0.02); box-sizing: border-box;">${g}</div>`;
      };

      const getResultBadge = (res) => {
        let conf =
          res === "PASS"
            ? { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" }
            : res === "FAIL"
              ? { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" }
              : { color: "#ca8a04", bg: "#fffaf0", border: "#fff4c2" };
        return `<span style="display: inline-block; background-color: ${conf.bg}; color: ${conf.color}; border: 1px solid ${conf.border}; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">${res}</span>`;
      };

      gradeData.forEach((row) => {
        const tr = document.createElement("tr");
        row.forEach((cellData, index) => {
          const td = document.createElement("td");
          td.className = "magic-cell";
          td.style.padding = "4px 8px";

          if (index === 0) {
            td.style.backgroundColor = "#f8fafc";
            td.style.borderRight = "1px dashed #cbd5e1 !important";
            td.innerHTML = getGradeBadge(cellData);
          } else if (index === 2) {
            td.innerHTML = getResultBadge(cellData);
          } else {
            td.innerHTML = `<span style="font-weight: 800; color: #334155; font-size: 14px;">${cellData}</span>`;
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      gradeTable.appendChild(tbody);
      tableWrapper.appendChild(gradeTable);

      const sourceText = document.createElement("div");
      sourceText.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> Table Source: SRM Student Portal`;
      sourceText.style.display = "flex";
      sourceText.style.alignItems = "center";
      sourceText.style.fontSize = "11px";
      sourceText.style.fontWeight = "600";
      sourceText.style.color = "#94a3b8";
      sourceText.style.marginTop = "12px";
      sourceText.style.marginLeft = "4px";

      sectionContainer.appendChild(title);
      sectionContainer.appendChild(tableWrapper);
      sectionContainer.appendChild(sourceText);

      // Insert Grade Details after Overall CGPA calc section (if present), else after CGPA calc, else after marksTable
      const overallEl = document.getElementById("overall-cgpa-section-v31");
      const cgpaEl = document.getElementById("cgpa-calc-section-v31");
      const anchorEl = overallEl || cgpaEl || marksTable;
      anchorEl.insertAdjacentElement("afterend", sectionContainer);
    }

    // ============================================================
    // PRIME INFORMATION HUB (Collapsible Minimal Info Section)
    // ============================================================
    if (!document.getElementById("revanced-info-section-v31")) {
      const infoContainer = document.createElement("div");
      infoContainer.id = "revanced-info-section-v31";
      infoContainer.style.cssText =
        "margin-top: 24px; margin-bottom: 32px; width: 100%; max-width: 100%; font-family: 'Plus Jakarta Sans', sans-serif;";

      if (!document.getElementById("revanced-info-styles-v31")) {
        const infoStyles = document.createElement("style");
        infoStyles.id = "revanced-info-styles-v31";
        infoStyles.innerHTML = `
          .revanced-info-card {
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            overflow: visible;
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .revanced-info-card:hover {
            border-color: #cbd5e1;
          }
          .revanced-info-header {
            background: #f8fafc;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.15s ease;
          }
          .revanced-info-header:hover {
            background: #f1f5f9;
          }
          .revanced-info-title-group {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .revanced-info-title {
            font-size: 14px;
            font-weight: 800;
            color: #1e1b4b;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .free-forever-badge {
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
            font-size: 10px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .revanced-info-toggle-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
          }
          .revanced-info-chevron {
            transition: transform 0.3s ease;
          }
          .revanced-info-chevron.open {
            transform: rotate(180deg);
          }
          .revanced-info-body {
            display: none;
            padding: 16px;
            border-top: 1px solid #e2e8f0;
            background: #ffffff;
            overflow: visible;
          }
          .revanced-info-body.open {
            display: block;
          }
          .revanced-nav-tabs {
            display: flex;
            gap: 8px;
            border-bottom: 1.5px solid #f1f5f9;
            padding-bottom: 10px;
            margin-bottom: 14px;
            position: relative !important;
            z-index: 99999 !important;
            overflow: visible !important;
          }
          .revanced-tab-btn {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            color: #64748b;
            border-radius: 8px;
            padding: 7px 14px;
            font-size: 12px;
            font-weight: 800;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .revanced-tab-btn:hover {
            background: #f1f5f9;
            color: #334155;
          }
          .revanced-tab-btn.active {
            background: #e8ecf5;
            color: #132450;
            border-color: #b8c2d9;
          }
          .revanced-tab-pane {
            display: none;
          }
          .revanced-tab-pane.active {
            display: block;
            animation: cgpaFadeIn 0.25s ease both;
          }
          /* GUIDE ACCORDION TOGGLE */
          details.guide-details summary .guide-collapse-txt { display: inline !important; }
          details.guide-details summary .guide-expand-txt { display: none !important; }
          details.guide-details:not([open]) summary .guide-collapse-txt { display: none !important; }
          details.guide-details:not([open]) summary .guide-expand-txt { display: inline !important; }
          .changelog-ver-item {
            border-left: 3px solid #cbd5e1 !important;
            padding-left: 12px !important;
            margin-bottom: 14px !important;
          }
          .changelog-ver-item.current {
            border-left-color: #10b981 !important;
          }
          .changelog-ver-item:last-child {
            margin-bottom: 0 !important;
          }
          .changelog-ver-head {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            margin-bottom: 5px !important;
          }
          .changelog-ver-tag {
            font-size: 11px !important;
            font-weight: 800 !important;
            color: #132450 !important;
            background: #e8ecf5 !important;
            padding: 1.5px 6px !important;
            border-radius: 4px !important;
          }
          .changelog-ver-tag.current {
            background: #dcfce7 !important;
            color: #15803d !important;
            border: 1px solid #86efac !important;
          }
          .changelog-ver-tag.old {
            background: #f1f5f9 !important;
            color: #475569 !important;
            border: 1px solid #cbd5e1 !important;
          }
          .live-badge-v31 {
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
          .live-dot-v31 {
            width: 5px !important;
            height: 5px !important;
            background: #22c55e !important;
            border-radius: 50% !important;
            display: inline-block !important;
            animation: liveDotPulse 2s infinite !important;
          }
          .changelog-ver-date {
            font-size: 10.5px !important;
            color: #94a3b8 !important;
            font-weight: 600 !important;
          }
          .changelog-list {
            margin: 0 !important;
            padding-left: 18px !important;
            font-size: 11.5px !important;
            color: #334155 !important;
            line-height: 1.5 !important;
          }
          .changelog-list li {
            margin-bottom: 3px !important;
          }
          .android-step-item {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
            align-items: flex-start;
          }
          .android-step-num {
            background: #132450;
            color: #ffffff;
            font-size: 11px;
            font-weight: 900;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 1px;
          }
          .android-step-text {
            font-size: 12px;
            color: #334155;
            line-height: 1.5;
            font-weight: 600;
          }
          .faq-item {
            margin-bottom: 14px;
            padding-bottom: 12px;
            border-bottom: 1px dashed #e2e8f0;
          }
          .faq-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }
          .faq-q {
            font-size: 12.5px;
            font-weight: 800;
            color: #1e1b4b;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .rev-tools-grouped-wrap {
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
          }
          .rev-tools-grouped-wrap:hover {
            z-index: 999999 !important;
          }
          .revanced-tab-btn.tt-btn-thehelper {
            position: relative !important;
            z-index: 1 !important;
          }
          .revanced-tab-btn.tt-btn-thehelper:hover {
            background: #eee5fa !important;
            border-color: #b691ee !important;
            color: #672fcc !important;
            box-shadow: 0 2px 6px rgba(123, 70, 218, 0.25) !important;
            transform: translateY(-1px) !important;
            z-index: 1000000 !important;
          }
          .revanced-tab-btn.tt-btn-exclusive {
            position: relative !important;
            z-index: 1 !important;
          }
          .revanced-tab-btn.tt-btn-exclusive:hover {
            background: #fae8d4 !important;
            border-color: #9a7200 !important;
            color: #451a03 !important;
            box-shadow: 0 2px 6px rgba(244, 197, 66, 0.2) !important;
            transform: translateY(-1px) !important;
            z-index: 1000000 !important;
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
          .rev-tools-grouped-wrap button:hover .ar-themed-tooltip {
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
          .faq-a {
            font-size: 12px;
            color: #475569;
            line-height: 1.5;
            padding-left: 20px;
          }
        `;
        document.head.appendChild(infoStyles);
      }

      const theHelperLogoUrl = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL("icons/academia-prime-logo.png")
        : "icons/academia-prime-logo.png";

      infoContainer.innerHTML = `
        <div class="revanced-info-card">
          <div class="revanced-info-header" id="revanced-info-header-v31">
            <div class="revanced-info-title-group">
              <div class="revanced-info-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                About Prime
              </div>
              <span class="free-forever-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                FREE FOREVER
              </span>
            </div>
            <div class="revanced-info-toggle-btn">
              <span id="revanced-info-status-lbl">Expand Details</span>
              <svg class="revanced-info-chevron" id="revanced-info-chevron-v31" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          <div class="revanced-info-body" id="revanced-info-body-v31">
            <div class="revanced-nav-tabs">
              <button class="revanced-tab-btn active" data-target="tab-guide" style="color: #0f766e; border-color: #99f6e4; background: #f0fdfa; font-weight: 800;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                Guide
              </button>
              <button class="revanced-tab-btn" data-target="tab-changelog" style="color: #15803d; border-color: #fff4c2; background: #fffaf0; font-weight: 800;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Changelog
              </button>
              <button class="revanced-tab-btn" data-target="tab-android" style="color: #132450; border-color: #ddd6fe; background: #e8ecf5; font-weight: 800;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                Phone/Tablet Guide
              </button>
              <button class="revanced-tab-btn" data-target="tab-faq" style="color: #132450; border-color: #bae6fd; background: #e8ecf5; font-weight: 800;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                FAQ
              </button>
              <button class="revanced-tab-btn" data-target="tab-links" style="color: #0d1938; border-color: #b8c2d9; background: #e8ecf5; font-weight: 800;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Important Links
              </button>
              <button class="revanced-tab-btn" data-target="tab-bug" style="color: #dc2626; border-color: #fecaca; background: #fff5f5; font-weight: 800;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 0 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v2"/><path d="M6 13H2"/><path d="M22 13h-4"/><path d="M20 7.13l-3.38 1.35"/><path d="m4 7.13 3.38 1.35"/><path d="m20 18.87-3.38-1.35"/><path d="m4 18.87 3.38-1.35"/></svg>
                Report Bug
              </button>
              <button class="revanced-tab-btn" data-target="tab-review" style="color: #9a7200; border-color: #f4d875; background: #fffaf0; font-weight: 900;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#c69a22" stroke="#c69a22" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Review
              </button>
              <button class="revanced-tab-btn rev-btn-contacts" data-target="tab-contacts" style="color: #15803d; border: 1.5px dotted #F4C542; background: #f0fdf4; font-weight: 800;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Contact Information
              </button>
              <!-- BIG GLOWING DOTTED BUTTON CONTAINER HOUSING THE HELPER & CGPA CALCULATOR -->
              <div class="rev-tools-grouped-wrap tt-tools-grouped-wrap" id="rev-tools-grouped-wrap" style="display: inline-flex !important; align-items: center !important; gap: 4px !important; padding: 3px 4px !important; border-radius: 9px !important; background: linear-gradient(135deg, #e8ecf5 0%, #fdf6ed 100%) !important; border: 1.5px dotted #8b5cf6 !important; box-shadow: 0 0 8px rgba(139, 92, 246, 0.45), 0 0 2px rgba(139, 92, 246, 0.65) !important; margin-left: auto !important; flex: 0 0 auto !important;">
                <button type="button" class="revanced-tab-btn tt-btn-thehelper" id="rev-tab-thehelper-btn" style="margin: 0 !important; border-radius: 6px !important; padding: 5px 9px !important; font-size: 11px !important; font-weight: 700 !important; background: #f7f4fd !important; color: #7b46da !important; border: 1px solid #ddd0f8 !important; position: relative !important;">
                  <img src="${theHelperLogoUrl}" alt="THE HELPER" style="width: 14px !important; height: 14px !important; border-radius: 3px !important; object-fit: contain !important; vertical-align: middle !important; display: inline-block !important;" />
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
                <button type="button" class="revanced-tab-btn tt-btn-exclusive" id="rev-tab-exclusive-btn" style="margin: 0 !important; border-radius: 6px !important; padding: 5px 9px !important; font-size: 11px !important; font-weight: 700 !important; background: #fdf6ed !important; color: #5c4500 !important; border: 1px solid #e8d8c8 !important; position: relative !important;">
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
            <div class="revanced-tab-pane active" id="tab-guide" style="position: relative;">
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
                        <filter id="rev-brush-distress" x="-10%" y="-30%" width="120%" height="160%">
                          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.95" numOctaves="4" result="noise" />
                          <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                        </filter>
                      </defs>
                      <!-- Main rough brush stroke body -->
                      <path d="M 8 11 Q 160 6 312 9 Q 318 24 310 38 Q 160 42 10 37 Q 3 24 8 11 Z" fill="#1e293b" filter="url(#rev-brush-distress)" />
                      <!-- Distressed top & bottom ink spatter lines -->
                      <line x1="12" y1="8" x2="308" y2="8" stroke="#1e293b" stroke-width="2.5" stroke-dasharray="10 6 25 8 4 12 35 6" filter="url(#rev-brush-distress)" />
                      <line x1="16" y1="39" x2="304" y2="39" stroke="#1e293b" stroke-width="2.5" stroke-dasharray="14 8 18 5 30 10 8 14" filter="url(#rev-brush-distress)" />
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
                    since u don't need a guide, review Prime for freshers
                  </span>
                  <span style="background: #F4C542; color: #422006; padding: 4px 10px; border-radius: 7px; font-size: 10.5px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; box-shadow: 0 1px 3px rgba(234, 179, 8, 0.25); margin-left: auto;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="21.17" y1="8" x2="12" y2="8"></line><line x1="3.95" y1="6.06" x2="8.54" y2="14"></line><line x1="10.88" y1="21.94" x2="15.46" y2="14"></line></svg>
                    Chrome Web Store
                  </span>
                </a>
              </div>
            </div>

            <!-- TAB 1: CHANGELOG -->
            <div class="revanced-tab-pane" id="tab-changelog">

              <!-- v1.4.5 (Current) -->
              <div class="changelog-ver-item current">
                <div class="changelog-ver-head">
                  <span class="changelog-ver-tag current">v1.4.5</span>
                  <span class="live-badge-v31"><span class="live-dot-v31"></span>LIVE</span>
                  <span class="changelog-ver-date">27 October 2026</span>
                </div>
                <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin: 4px 0 6px 0; letter-spacing: 0.02em;">PLACEMENT PREPARATION & INSIGHT</div>
                <ul class="changelog-list">
                  <li>Added <b>1.8k+ Aptitude Questions along with Solutions</b> across Quantitative, Logical, Verbal, and Core CSE domains.</li>
                  <li>Added <b>Year 2024, 2025, 2026, 2027 Placement Insights</b> with detailed recruitment matrices, CTC tiers, and company analytics.</li>
                </ul>
              </div>

              <!-- Older Versions (Collapsible: v1.4.0 down to v1.0.0) -->
              <div id="revancedOlderChangelogContainer" style="display: none;">
                <!-- v1.4.0 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.4.0</span>
                    <span class="changelog-ver-date">18 October 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">OD/ML LEAVE TRACKER & CUSTOM PINNED SHORTCUTS</div>
                  <ul class="changelog-list">
                    <li>Added <b>OD/ML Marking</b> : Track your On-Duty (OD) and Medical Leave (ML) hours with recalculated attendance margins and export/import PNG and JSON formats.</li>
                    <li>Added <b>Custom Pinned Shortcuts in Side Panel</b>: Pin up to 4 custom portal sections directly to the side panel alongside default shortcuts.</li>
                  </ul>
                </div>

                <!-- v1.3.6 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.3.6</span>
                    <span class="changelog-ver-date">7 October 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">TIMETABLE SYNC FIX & COLLEGE CONTACTS</div>
                  <ul class="changelog-list">
                    <li>Fixed <b>Time table sync</b> across Academia and Student Portal</li>
                    <li>Added <b>Important College Contact information</b></li>
                  </ul>
                </div>
                <!-- v1.3.5 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.3.5</span>
                    <span class="changelog-ver-date">1 October 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">PRIME TIMETABLE & NEW LOGIN PAGE</div>
                  <ul class="changelog-list">
                    <li>Redesigned <b>Student Portal Login Page</b></li>
                    <li>Added <b>Prime Timetable in Student Portal</b> with interactive slot customizer, 10x ultra-HD export, and cross-portal sync with Academia.</li>
                    <li>Added <b>Toggle on/off Button</b> just in case CAPTCHA is not working or showing error.</li>
                    <li>Added dynamic <b>Reset All</b> and <b>Hide Custom</b> controls with instant in-place schedule restoration.</li>
                  </ul>
                </div>
                <!-- v1.3.0 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.3.0</span>
                    <span class="changelog-ver-date">25 September 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">MARKS LOST, TARGET MARKS, GRAPHS & CGPA CALCULATOR</div>
                  <ul class="changelog-list">
                    <li>Added <b>Marks Lost Count, Target Marks Calculator and Grade Estimation List</b></li>
                    <li>Added <b>Overall & Semester CGPA Calculator</b></li>
                    <li>Added <b>Performance Graphs</b> inside Marks Page to visualize individual subject score changes.</li>
                    <li>Added <b>External CGPA Calculator, just incase if Student Portal is Down. [Check Extension Popup UI]</b></li>
                  </ul>
                </div>
                <!-- v1.2.7 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.2.7</span>
                    <span class="changelog-ver-date">23 September 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">65% OD-ML MARGIN & ATTENDANCE CALCULATOR</div>
                  <ul class="changelog-list">
                    <li>Added <b>65% OD/ML Margin Target</b> inside Margin Section.</li>
                    <li>Added <b>Interactive Manual Attendance Calculator</b> inside Student Portal for manual attendence calculation.</li>
                    <li><b>Inside Scribe Request:</b> View Hidden End Semester Exam Timetable.</li>
                  </ul>
                </div>
                <!-- v1.2.6 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.2.6</span>
                    <span class="changelog-ver-date">26 August 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">OFFLINE CAPTCHA SOLVER & ATTENDANCE THEME</div>
                  <ul class="changelog-list">
                    <li>Added <b>100% Offline CAPTCHA Solver</b> for Student Portal powered by local WASM/ONNX runtime.</li>
                    <li>Automatic recognition for mixed uppercase/lowercase letters & digits with single inline Auto Solve button.</li>
                    <li>Updated <b>Student Portal Attendance Max. Hours</b> box to a sleek <b>Light Blue</b> theme for better visual contrast.</li>
                  </ul>
                </div>

                <!-- v1.2.5 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.2.5</span>
                    <span class="changelog-ver-date">24 August 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">STUDENT PORTAL ADDED</div>
                  <ul class="changelog-list">
                    <li>Modified <b>Student Portal Side Panel</b> for better use.</li>
                    <li>Added <b>Search Filter</b> to quickly search side panel menu items with auto dropdown expansion.</li>
                    <li>Added <b>Top Pinned Shortcuts</b> for <b>Attendance</b> and <b>Internal Mark Details</b>.</li>
                    <li>Added <b>About Prime Tab</b> for quick access to changelogs, guides, bug reporting, and store reviews.</li>
                  </ul>
                </div>

                <!-- v1.2.0 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.2.0</span>
                    <span class="changelog-ver-date">14 August 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">INTERACTIVE TIMETABLE & 10X EXPORT</div>
                  <ul class="changelog-list">
                    <li>Integrated modern, color-coded <b>Prime Timetable</b> directly into the SRM Academic portal.</li>
                    <li>Added <b>Interactive Slot Customizer</b> to edit course titles, rooms, and colors with a live hex picker & presets.</li>
                    <li>Added <b>Optional & Struck-Through Classes</b> with quick strikeout visual toggles.</li>
                    <li>Added <b>Hide / Restore Customizations</b> button to toggle between edits and original schedule.</li>
                  </ul>
                </div>

                <!-- v1.1.5 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.1.5</span>
                    <span class="changelog-ver-date">25 July 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">ABOUT PRIME & GPA SYNC</div>
                  <ul class="changelog-list">
                    <li>Fixed <b>GPA Timetable Sync</b> to extract exact active enrolled subjects from <i>My Time Table</i> page.</li>
                    <li>Added dynamic <b>Subject Numbering (#)</b> to GPA Calculator with live row numbering.</li>
                    <li>Added <b>Session & Logout Data Purging</b> for clean logins.</li>
                    <li>Added <b>Prime Information Tab</b> with Changelogs, Phone Guide, Bug Report and FAQ.</li>
                  </ul>
                </div>

                <!-- v1.1.0 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.1.0</span>
                    <span class="changelog-ver-date">3 March 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">SEMESTER GPA PREDICTOR</div>
                  <ul class="changelog-list">
                    <li>Added <b>Semester-wise CGPA Calculator</b> dashboard for live GPA prediction.</li>
                    <li>Added <b>Dynamic Timetable Sync</b> to automatically fetch course credits regardless of academic year.</li>
                    <li>Added <b>Marks Lost</b> and <b>Target Marks</b> calculation for exam score planning.</li>
                  </ul>
                </div>

                <!-- v1.0.3 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.0.3</span>
                    <span class="changelog-ver-date">24 February 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">MARKS & GRADE PREDICTIONS</div>
                  <ul class="changelog-list">
                    <li>Added <b>Marks Lost</b> tracking with dynamic grading prediction.</li>
                    <li>Added color-coded grade tags in the marks section.</li>
                    <li>Added styled <b>Grade Details</b> reference table showing threshold ranges.</li>
                  </ul>
                </div>

                <!-- v1.0.2 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.0.2</span>
                    <span class="changelog-ver-date">15 January 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">COURSE UI MATCHING</div>
                  <ul class="changelog-list">
                    <li>Fixed Course Type UI styling to match portal table aesthetics.</li>
                  </ul>
                </div>

                <!-- v1.0.1 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.0.1</span>
                    <span class="changelog-ver-date">10 January 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">ICON RESOLUTION SCALING</div>
                  <ul class="changelog-list">
                    <li>Fixed extension icon dimensions and resolution scaling.</li>
                  </ul>
                </div>

                <!-- v1.0.0 -->
                <div class="changelog-ver-item old">
                  <div class="changelog-ver-head">
                    <span class="changelog-ver-tag old">v1.0.0</span>
                    <span class="changelog-ver-date">1 January 2026</span>
                  </div>
                  <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">INITIAL RELEASE</div>
                  <ul class="changelog-list">
                    <li>Initial release with automated course feedback filler and attendance margin visualizer.</li>
                  </ul>
                </div>
              </div>

              <!-- Extend / Expand Button -->
              <div style="text-align: center; margin-top: 10px;">
                <button type="button" id="revancedChangelogToggleBtn" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 14px; font-size: 11.5px; font-weight: 700; color: #0d1938; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
                  <span id="revancedChangelogToggleTxt">Show Older Versions (v1.4.0 – v1.0.0)</span>
                  <svg id="revancedChangelogToggleIcon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- TAB 2: PHONE / TABLET INSTALLATION GUIDE -->
            <div class="revanced-tab-pane" id="tab-android">
              <div style="font-size: 13px; font-weight: 800; color: #4c1d95; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                Phone & Tablet Installation Guide
              </div>
              <div class="android-step-item">
                <div class="android-step-num" style="background:#132450;">1</div>
                <div class="android-step-text">Install any Chromium-based browser that supports Chrome extensions (Recommended: <b>Quetta Browser</b>).</div>
              </div>
              <div class="android-step-item">
                <div class="android-step-num" style="background:#132450;">2</div>
                <div class="android-step-text">Open <b>Quetta Browser</b> on your phone or tablet.</div>
              </div>
              <div class="android-step-item">
                <div class="android-step-num" style="background:#132450;">3</div>
                <div class="android-step-text">Install the <b>Academia Prime</b> extension from the Chrome Web Store.</div>
              </div>
              <div class="android-step-item">
                <div class="android-step-num" style="background:#132450;">4</div>
                <div class="android-step-text">Open and log in to the <code style="background:#e8ecf5; color:#132450; padding:2px 6px; border-radius:4px; font-size:11.5px;">SRM Academia portal</code> in Quetta Browser.</div>
              </div>
              <div class="android-step-item">
                <div class="android-step-num" style="background:#132450;">5</div>
                <div class="android-step-text">The extension will automatically enhance the portal with all available Prime features.</div>
              </div>
            </div>

            <!-- TAB 3: FAQ & CONTACT -->
            <div class="revanced-tab-pane" id="tab-faq">
              <div class="faq-item">
                <div class="faq-q">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  <span>Is it free?</span>
                </div>
                <div class="faq-a"><b>YEPP!</b> Chill Guys Academia Prime is 100% Free Forever with zero paywalls, ads, or subscriptions.</div>
              </div>
              <div class="faq-item">
                <div class="faq-q">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Does it save passwords or credentials?</span>
                </div>
                <div class="faq-a">
                  <div><b>NOPE.</b> Academia Prime does not require login or save any credentials.</div>
                  <div style="margin-top: 8px; padding: 6px 10px; background: #e8ecf5; border: 1.5px dashed #6b83b4; border-radius: 8px; font-size: 11px; display: flex; width: fit-content; align-items: center; gap: 6px; color: #0d1938;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span>Read our official <a href="privacy-policy.html" target="_blank" style="color: #132450; font-weight: 800; text-decoration: underline;">Privacy Policy</a>.</span>
                  </div>
                </div>
              </div>
              <div class="faq-item">
                <div class="faq-q">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c69a22" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span>During Enrollment Phase Extension Won't Work</span>
                </div>
                <div class="faq-a">
                  <ul style="margin: 4px 0 0 0; padding-left: 16px; list-style-type: disc;">
                    <li style="margin-bottom: 4px;">During the enrollment period, the Attendance page is temporarily removed from the original Academia portal.</li>
                    <li style="margin-bottom: 4px;">As a result, all features except <b>Feedback Automation</b>, other features will be unavailable until the Attendance page is restored.</li>
                    <li>If there's any bug after the attendance portal is live, it will be fixed ASAP!</li>
                  </ul>
                </div>
              </div>


              <div class="faq-item">
                <div class="faq-q">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>Total Users</span>
                </div>
                <div class="faq-a">
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

              <div class="faq-item">
                <div class="faq-q">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 0 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v2"/><path d="M6 13H2"/><path d="M22 13h-4"/><path d="M20 7.13l-3.38 1.35"/><path d="m4 7.13 3.38 1.35"/><path d="m20 18.87-3.38-1.35"/><path d="m4 18.87 3.38-1.35"/></svg>
                  <span>Found a bug or issue?</span>
                </div>
                <div class="faq-a">Report any bugs or feedback directly using the integrated <a href="javascript:void(0)" id="open-bug-form-link" style="color: #dc2626; font-weight: 800; text-decoration: underline;">Bug Report Form</a>.</div>
              </div>
              <div class="faq-item">
                <div class="faq-q">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>How to support Academia Prime?</span>
                </div>
                <div class="faq-a">Leave a <a href="javascript:void(0)" id="open-review-form-link" style="color: #132450; font-weight: 800; text-decoration: underline;">Review on Chrome Web Store</a>.</div>
              </div>
              <div class="faq-item">
                <div class="faq-q">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                  <span>Managed By</span>
                </div>
                <div class="faq-a" style="display: flex; flex-direction: column; gap: 6px;">
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

            <!-- TAB: IMPORTANT LINKS -->
            <div class="revanced-tab-pane" id="tab-links">
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

            <!-- TAB 4: REPORT BUG (Integrated Google Form) -->
            <div class="revanced-tab-pane" id="tab-bug">
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

            <!-- TAB 5: LEAVE A REVIEW -->
            <div class="revanced-tab-pane" id="tab-review">
              <div style="background: #fffaf0; border: 1.5px solid #f4d875; border-radius: 12px; padding: 20px; font-family: 'Plus Jakarta Sans', sans-serif;">
                <div style="font-size: 14px; font-weight: 800; color: #5c4500; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#c69a22" stroke="#c69a22" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Feeling Bored ??? ...... Drop a Review on Chrome Web Store for Freshers.
                </div>
                <div style="font-size: 12.5px; color: #451a03; margin-bottom: 16px; font-weight: 600; line-height: 1.5;">
                  Enjoying automated feedback, CGPA prediction & attendance margin tracking? 
                  <br><b>Help new SRM students discover Academia Prime by sharing your review on the Chrome Web Store!</br>
                </div>
                <a href="https://chromewebstore.google.com/detail/academia-revanced/kkhjcadiccbncoajcohhndhdiijpgmdj" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; background: #ffffff; color: #9a7200; border: 1.5px solid #F4C542; padding: 10px 20px; border-radius: 8px; font-size: 12.5px; font-weight: 800; text-decoration: none; box-shadow: 0 2px 8px rgba(180,83,9,0.08); transition: transform 0.15s ease;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#c69a22" stroke="#c69a22" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Drop a Review on Chrome Web Store
                </a>
              </div>
            </div>

            <!-- TAB 6: SRM CONTACT DIRECTORY -->
            <div class="revanced-tab-pane" id="tab-contacts">
              <div id="academia-contacts-directory-container">
                ${typeof window.SRM_CONTACT_DIRECTORY_MODULE !== 'undefined' ? window.SRM_CONTACT_DIRECTORY_MODULE.getContactDirectoryHTML() : ''}
              </div>
            </div>
          </div>
        </div>
      `;

      const headerEl = infoContainer.querySelector("#revanced-info-header-v31");
      const bodyEl = infoContainer.querySelector("#revanced-info-body-v31");
      const chevronEl = infoContainer.querySelector(
        "#revanced-info-chevron-v31",
      );
      const statusLbl = infoContainer.querySelector(
        "#revanced-info-status-lbl",
      );

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

      const tabBtns = infoContainer.querySelectorAll(".revanced-tab-btn");
      const tabPanes = infoContainer.querySelectorAll(".revanced-tab-pane");

      tabBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();

          if (btn.id === "rev-tab-thehelper-btn" || btn.id === "tt-tab-thehelper-btn" || btn.classList.contains("tt-btn-thehelper")) {
            e.preventDefault();
            window.open("https://www.thehelpers.tech/", "_blank");
            return;
          }

          if (btn.id === "rev-tab-exclusive-btn" || btn.id === "tt-tab-exclusive-btn" || btn.classList.contains("tt-btn-exclusive")) {
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
          const targetPane = infoContainer.querySelector(`#${targetId}`);
          if (targetPane) {
            targetPane.classList.add("active");
            if (targetId === "tab-contacts" && window.SRM_CONTACT_DIRECTORY_MODULE) {
              window.SRM_CONTACT_DIRECTORY_MODULE.initContactDirectory(targetPane);
            }
          }
        });
      });

      infoContainer.addEventListener("click", (e) => {
        const spoiler = e.target.closest(
          ".rev-scratch-spoiler, .rev-discord-spoiler",
        );
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
          const dropdown = infoContainer.querySelector(
            ".rev-features-dropdown",
          );
          const icon = featToggle.querySelector(".rev-features-toggle-icon");
          if (dropdown) {
            const isHidden =
              dropdown.style.display === "none" ||
              dropdown.style.display === "";
            dropdown.style.display = isHidden ? "grid" : "none";
            if (icon)
              icon.style.transform = isHidden
                ? "rotate(180deg)"
                : "rotate(0deg)";
          }
          return;
        }
      });

      // Expand / Collapse older changelog versions
      const changelogToggleBtn = infoContainer.querySelector(
        "#revancedChangelogToggleBtn",
      );
      const olderChangelogs = infoContainer.querySelector(
        "#revancedOlderChangelogContainer",
      );
      const changelogToggleTxt = infoContainer.querySelector(
        "#revancedChangelogToggleTxt",
      );
      const changelogToggleIcon = infoContainer.querySelector(
        "#revancedChangelogToggleIcon",
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

      const bugFormLink = infoContainer.querySelector("#open-bug-form-link");
      if (bugFormLink) {
        bugFormLink.addEventListener("click", (e) => {
          e.preventDefault();
          const bugTabBtn = infoContainer.querySelector(
            '.revanced-tab-btn[data-target="tab-bug"]',
          );
          if (bugTabBtn) bugTabBtn.click();
        });
      }

      const reviewFormLink = infoContainer.querySelector(
        "#open-review-form-link",
      );
      if (reviewFormLink) {
        reviewFormLink.addEventListener("click", (e) => {
          e.preventDefault();
          const reviewTabBtn = infoContainer.querySelector(
            '.revanced-tab-btn[data-target="tab-review"]',
          );
          if (reviewTabBtn) reviewTabBtn.click();
        });
      }

      const gradeDetailsEl = document.getElementById(
        "grade-details-section-v31",
      );
      const infoAnchorEl =
        gradeDetailsEl ||
        document.getElementById("overall-cgpa-section-v31") ||
        document.getElementById("cgpa-calc-section-v31") ||
        marksTable;
      infoAnchorEl.insertAdjacentElement("afterend", infoContainer);
    }
  }
}

// ── Student Session & Identity Helpers ───────────────────────
// Extracts the currently logged-in student's Registration Number or User Identity
// so timetable data is strictly isolated per account and cleared on ID switch.
function getStudentIdentity() {
  try {
    const sessionUser = sessionStorage.getItem("ar_student_id_v31");

    // Scan page DOM for Registration Number pattern (e.g. RA2111003010123)
    const bodyText = document.body ? document.body.innerText : "";
    const regMatch = bodyText.match(
      /\b(RA\d{13,15}|AP\d{13,15}|[A-Z]{2}\d{12,15})\b/i,
    );
    if (regMatch) {
      const id = regMatch[1].toUpperCase();
      sessionStorage.setItem("ar_student_id_v31", id);
      return id;
    }

    // Look for welcome text or user details element
    const welcomeEl = document.querySelector(
      "#welcome, .welcome, .user-info, .profile-name, #user-name",
    );
    if (welcomeEl && welcomeEl.textContent.trim()) {
      const txt = welcomeEl.textContent.trim();
      sessionStorage.setItem("ar_student_id_v31", txt);
      return txt;
    }

    if (sessionUser) return sessionUser;
  } catch (e) {}
  return null;
}

function clearStoredTimetableData() {
  try {
    sessionStorage.removeItem("ar_credits_v31");
    sessionStorage.removeItem("ar_timetable_courses_v31");
    sessionStorage.removeItem("ar_student_id_v31");
    localStorage.removeItem("ar_credits_v31");
    localStorage.removeItem("ar_timetable_courses_v31");
    localStorage.removeItem("ar_student_id_v31");
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove([
        "ar_credits_v31",
        "ar_timetable_courses_v31",
        "ar_student_id_v31",
      ]);
    }
  } catch (e) {}
}

function getStoredTimetableData() {
  let savedCredits = {};
  let savedCourses = [];
  try {
    // Read strictly from sessionStorage so fresh logins/refreshes default to empty boxes
    const ssCoursesStr = sessionStorage.getItem("ar_timetable_courses_v31");
    const ssCreditsStr = sessionStorage.getItem("ar_credits_v31");
    if (ssCoursesStr) {
      savedCourses = JSON.parse(ssCoursesStr || "[]");
      savedCredits = JSON.parse(ssCreditsStr || "{}");
    }
  } catch (e) {}

  return { savedCredits, savedCourses };
}

function saveTimetableData(credits, courses) {
  try {
    const currentId = getStudentIdentity();
    const coursesStr = JSON.stringify(courses);
    const creditsStr = JSON.stringify(credits);

    sessionStorage.setItem("ar_credits_v31", creditsStr);
    sessionStorage.setItem("ar_timetable_courses_v31", coursesStr);
    if (currentId) sessionStorage.setItem("ar_student_id_v31", currentId);

    localStorage.setItem("ar_credits_v31", creditsStr);
    localStorage.setItem("ar_timetable_courses_v31", coursesStr);
    if (currentId) localStorage.setItem("ar_student_id_v31", currentId);

    // Save to chrome.storage.local for cross-origin extension access (e.g. Student Portal)
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        ar_credits_v31: credits,
        ar_timetable_courses_v31: courses,
        ar_student_id_v31: currentId,
      });
    }
  } catch (e) {}
}

// Intercept logout link clicks and clear session on login page
function setupLogoutCleaner() {
  try {
    const loc = (window.location.href + window.location.hash).toLowerCase();
    if (loc.includes("login") || loc.includes("page:login")) {
      clearStoredTimetableData();
    }

    document.addEventListener(
      "click",
      (e) => {
        const target = e.target.closest("a, button, [onclick]");
        if (target) {
          const txt = (target.textContent || "").toLowerCase();
          const href = (target.getAttribute("href") || "").toLowerCase();
          const onclick = (target.getAttribute("onclick") || "").toLowerCase();
          if (
            txt.includes("logout") ||
            txt.includes("sign out") ||
            href.includes("logout") ||
            onclick.includes("logout")
          ) {
            clearStoredTimetableData();
          }
        }
      },
      true,
    );
  } catch (e) {}
}

// ── Timetable credit & subject scraper ────────────────────────
// Runs on the My_Time_Table page, reads the course details table (codes, titles, credits),
// and persists both a code→credit map and a full courses array to localStorage
// so the CGPA calculator can use it automatically.
// ──────────────────────────────────────────────────────────────
let _activeScrapeInterval = null;

function scrapeTimetableCredits() {
  const url = window.location.href;

  // Check if current page is specifically the Timetable page.
  const sidebarTT = Array.from(document.querySelectorAll("a")).find(
    (a) =>
      a.textContent.includes("Time Table") &&
      a.getAttribute("href")?.startsWith("#Page:My_Time_Table"),
  );
  const isTimetablePage =
    (sidebarTT && window.location.hash === sidebarTT.getAttribute("href")) ||
    url.includes("My_Time_Table") ||
    window.location.hash.includes("Time_Table");

  if (!isTimetablePage) {
    if (_activeScrapeInterval) {
      clearInterval(_activeScrapeInterval);
      _activeScrapeInterval = null;
    }
    return;
  }

  if (_activeScrapeInterval) {
    clearInterval(_activeScrapeInterval);
    _activeScrapeInterval = null;
  }

  let attempts = 0;
  // We use an interval because Academia loads tables dynamically; we wait until they appear.
  _activeScrapeInterval = setInterval(() => {
    attempts++;
    const tables = document.querySelectorAll("table");
    let foundAny = false;

    // Build fresh maps for each scrape run so old/stale subjects from previous semesters are wiped out!
    let storedCredits = {};
    let storedCoursesMap = {}; // key: rawCode -> { code, title, credit }

    tables.forEach((tbl) => {
      const allRows = Array.from(tbl.querySelectorAll("tr"));
      if (allRows.length === 0) return;

      // Inspect header row to accurately identify Course Code, Course Title / Subject, and Faculty columns
      let titleColIdx = -1;
      let facultyColIdx = -1;
      let creditColIdx = -1;

      const firstRowCells = Array.from(
        allRows[0].querySelectorAll("th, td"),
      ).map((c) => c.textContent.trim().toLowerCase());
      firstRowCells.forEach((text, i) => {
        if (
          text.includes("title") ||
          text.includes("subject") ||
          text.includes("course name")
        )
          titleColIdx = i;
        if (
          text.includes("faculty") ||
          text.includes("staff") ||
          text.includes("teacher") ||
          text.includes("instructor")
        )
          facultyColIdx = i;
        if (text.includes("credit") || text.includes("cr.")) creditColIdx = i;
      });

      allRows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll("td")).map((c) =>
          c.textContent.trim(),
        );
        if (cells.length < 2) return;

        // Find which cell looks like a course code
        let codeIdx = -1;
        let rawCode = "";
        for (let i = 0; i < Math.min(3, cells.length); i++) {
          const firstToken = cells[i]
            .split(/\s+/)[0]
            .replace(/[^A-Z0-9\-]/gi, "");
          if (
            /^[A-Z0-9\-]{5,12}$/i.test(firstToken) &&
            /[A-Z]/i.test(firstToken) &&
            /\d/.test(firstToken)
          ) {
            codeIdx = i;
            rawCode = firstToken.toUpperCase();
            break;
          }
        }
        if (codeIdx === -1 || !rawCode) return;

        // Extract Course Title / Subject Name (strictly avoiding Faculty column)
        let title = "";
        let targetTitleIdx = titleColIdx !== -1 ? titleColIdx : codeIdx + 1;
        if (targetTitleIdx === facultyColIdx && codeIdx + 1 !== facultyColIdx) {
          targetTitleIdx = codeIdx + 1;
        }

        if (cells.length > targetTitleIdx && targetTitleIdx !== facultyColIdx) {
          const potentialTitle = cells[targetTitleIdx];
          const isFacultyLike =
            /^(dr\.|prof\.|mr\.|mrs\.|ms\.)/i.test(potentialTitle) ||
            /\(\d{4,8}\)/.test(potentialTitle);
          if (
            potentialTitle.length >= 3 &&
            !isFacultyLike &&
            !/^\d+(\.\d+)?$/.test(potentialTitle) &&
            !/^[A-Z0-9]{1,3}$/i.test(potentialTitle)
          ) {
            let clean = potentialTitle
              .replace(/\s+/g, " ")
              .replace(/\s*-\s*Theory/gi, "")
              .replace(/\s*\(\s*Theory\s*\)/gi, "")
              .replace(/\s*-\s*Practical/gi, "")
              .replace(/\s*\(\s*Practical\s*\)/gi, "")
              .trim();
            if (clean) {
              if (clean === clean.toUpperCase()) {
                clean = clean
                  .toLowerCase()
                  .replace(/\b\w/g, (s) => s.toUpperCase());
              }
              title = clean;
            }
          }
        }

        // Look for credits in subsequent cells
        let credit = null;
        if (creditColIdx !== -1 && cells.length > creditColIdx) {
          const num = parseFloat(cells[creditColIdx]);
          if (!isNaN(num) && num >= 0 && num <= 10) credit = num;
        }
        if (credit === null) {
          for (let i = codeIdx + 1; i < cells.length; i++) {
            if (i === facultyColIdx) continue;
            const v = cells[i].trim();
            if (/^\d+(\.\d{1,2})?$/.test(v)) {
              const num = parseFloat(v);
              if (!isNaN(num) && num >= 0 && num <= 10) {
                credit = num;
                break;
              }
            }
          }
        }

        if (rawCode && credit !== null) {
          storedCredits[rawCode] = credit;
          storedCoursesMap[rawCode] = {
            code: rawCode,
            title: title || storedCoursesMap[rawCode]?.title || rawCode,
            credit: credit,
          };
          foundAny = true;
        }
      });
    });

    if (foundAny) {
      saveTimetableData(storedCredits, Object.values(storedCoursesMap));
    }

    if (foundAny || attempts >= 15) {
      clearInterval(_activeScrapeInterval);
      _activeScrapeInterval = null;
    }
  }, 700);
}

function init() {
  if (window.location.hostname !== "academia.srmist.edu.in") return;
  setupLogoutCleaner();

  // If timetable data was previously saved in localStorage, sync to chrome.storage.local
  try {
    const savedCr = localStorage.getItem("ar_credits_v31");
    const savedCo = localStorage.getItem("ar_timetable_courses_v31");
    if (savedCr && typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        ar_credits_v31: JSON.parse(savedCr || "{}"),
        ar_timetable_courses_v31: JSON.parse(savedCo || "[]"),
      });
    }
  } catch (e) {}

  // Scrape timetable credits whenever on that page
  scrapeTimetableCredits();
  injectEnhancements();
  window.addEventListener("hashchange", () => {
    setTimeout(() => {
      scrapeTimetableCredits();
      injectEnhancements();
    }, 800);
  });

  let observerTimer = null;
  const observer = new MutationObserver(() => {
    if (observerTimer) clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      if (
        window.location.href.includes("My_Attendance") &&
        !document.getElementById("margin-head-v31")
      ) {
        injectEnhancements();
      }
      if (window.location.href.includes("My_Time_Table")) {
        scrapeTimetableCredits();
      }
    }, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PRIME_OPEN_TAB") {
    const targetTab = event.data.targetTab;
    const infoCard = document.querySelector(".revanced-info-card");
    if (infoCard) {
      const bodyEl = infoCard.querySelector("#revanced-info-body-v31");
      const chevronEl = infoCard.querySelector("#revanced-info-chevron-v31");
      const statusLbl = infoCard.querySelector("#revanced-info-status-lbl");
      if (bodyEl && !bodyEl.classList.contains("open")) {
        bodyEl.classList.add("open");
        if (chevronEl) chevronEl.classList.add("open");
        if (statusLbl) statusLbl.textContent = "Collapse Details";
      }
      const targetBtn = infoCard.querySelector(
        `.revanced-tab-btn[data-target="${targetTab}"]`,
      );
      if (targetBtn) {
        targetBtn.click();
      }
      infoCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
});

init();
