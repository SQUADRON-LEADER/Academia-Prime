/**
 * Academia Prime - Standalone GPA & CGPA Suite Engine
 * Exact ditto calculation logic and UI matching Student Portal & Academia.
 */

(function () {
  "use strict";

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

  const GRADE_ROWS = [
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

  // ─────────────────────────────────────────────────────────────
  // 1. POPULATE GRADE DETAILS REFERENCE TABLE
  // ─────────────────────────────────────────────────────────────
  function initGradeReferenceTable() {
    const tbody = document.getElementById("sp-grade-tbody-v31");
    if (!tbody) return;
    tbody.innerHTML = "";

    GRADE_ROWS.forEach((r, idx) => {
      const isLast = idx === GRADE_ROWS.length - 1;
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
      tbody.appendChild(tr);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. GPA CALCULATOR LOGIC (Ditto from cgpa_sgpa.js)
  // ─────────────────────────────────────────────────────────────
  const calcTbody = document.getElementById("cgpa-tbody-v31");
  const liveVal = document.getElementById("cgpa-live-val");
  const liveBar = document.getElementById("cgpa-live-bar");
  const pctLbl = document.getElementById("cgpa-pct-lbl");

  function buildCalcRow(name = "", estGrade = null, credit = null, isNew = false, code = "") {
    const tr = document.createElement("tr");
    tr.className = "cgpa-row";
    if (code) tr.dataset.code = code;

    const optHtml = [""].concat(GRADE_OPTIONS)
      .map(
        (k) =>
          `<option value="${k}" ${k === estGrade ? "selected" : ""}>${k || "— Select Grade —"}</option>`,
      )
      .join("");

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

    const inputValue = isNew || !name ? "" : name.replace(/"/g, "&quot;");
    const inputBorder = isNew
      ? "border: 1.5px solid #253b70; box-shadow: 0 0 0 3px rgba(99,102,241,.2);"
      : "border: 1.5px solid #e2e8f0;";
    const inputPlaceholder = isNew ? "Type subject name…" : "Subject name";

    tr.innerHTML = `
      <td style="padding:8px 4px; text-align:center; vertical-align:middle; width:36px;">
        <span class="cgpa-row-idx" style="font-size:11px; font-weight:800; color:#94a3b8; font-family:'JetBrains Mono',monospace;"></span>
      </td>
      <td style="padding:8px 12px; vertical-align:middle;">
        <input type="text" class="cgpa-subj" placeholder="${inputPlaceholder}"
          value="${inputValue}"
          style="width:100%; ${inputBorder} border-radius:10px;
            padding:7px 11px; font-size:12.5px; font-weight:700; color:#1e293b;
            background:#ffffff; transition:border .2s; font-family:inherit; box-sizing:border-box;">
      </td>
      <td style="padding:8px 12px; width:100px; text-align:center; vertical-align:middle;">
        <input type="number" class="cgpa-cred" placeholder="Credit"
          value="${credit !== null && credit !== undefined ? credit : ""}" min="0" max="10" step="0.5"
          style="width:100%; border:1.5px solid #e2e8f0; border-radius:10px;
            padding:7px 8px; font-size:13px; font-weight:800; color:#1e1b4b;
            text-align:center; background:#ffffff; transition:border .2s, box-shadow .2s;
            font-family:'JetBrains Mono',monospace; box-sizing:border-box;">
      </td>
      <td style="padding:8px 10px; width:125px; text-align:center; vertical-align:middle; position:relative;">
        <div class="cgpa-matrix-wrap">
          <button type="button" class="cgpa-matrix-trigger ${getTriggerClass(estGrade)}" title="Choose Grade Matrix">
            <span class="cgpa-matrix-txt">${formatGradeLabel(estGrade)}</span>
            <svg class="cgpa-matrix-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
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
      <td style="padding:8px 6px 8px 10px; width:32px; text-align:center; vertical-align:middle;">
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
      } else if (!isNew && name) {
        credInp.classList.add("cgpa-cred-glow");
      }
      recalcCGPA();
    });

    tr.querySelector(".cgpa-subj").addEventListener("input", (e) => {
      const sVal = e.target.value.trim();
      if (sVal && !credInp.value) credInp.classList.add("cgpa-cred-glow");
      else if (!sVal) credInp.classList.remove("cgpa-cred-glow");
      recalcCGPA();
    });

    tr.querySelector(".cgpa-del").addEventListener("click", (e) => {
      e.preventDefault();
      tr.remove();
      updateRowNumbers();
      recalcCGPA();
    });

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

  // Close matrix on outside click
  document.addEventListener("click", () => {
    document.querySelectorAll(".cgpa-matrix-wrap.open").forEach((w) => {
      w.classList.remove("open");
      w.classList.remove("popover-above");
      w.closest(".cgpa-row")?.classList.remove("popover-active");
    });
  });

  function updateRowNumbers() {
    if (!calcTbody) return;
    calcTbody.querySelectorAll(".cgpa-row").forEach((r, i) => {
      const idxSpan = r.querySelector(".cgpa-row-idx");
      if (idxSpan) idxSpan.textContent = i + 1;
    });
  }

  function recalcCGPA() {
    updateRowNumbers();
    if (!calcTbody) return;
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

    const valEl = document.getElementById("cgpa-live-val");
    const barEl = document.getElementById("cgpa-live-bar");
    const pctLbl = document.getElementById("cgpa-pct-lbl");
    const boxEl = document.getElementById("cgpa-live-box");
    const panelEl = document.getElementById("cgpa-right-panel-v31");

    if (gpa !== null) {
      const pct = (gpa / 10) * 100;
      if (valEl) valEl.textContent = gpa.toFixed(2);
      if (barEl) barEl.style.width = pct.toFixed(1) + "%";
      if (pctLbl) pctLbl.textContent = pct.toFixed(0) + "%";

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

      if (boxEl) {
        boxEl.style.background = bg;
        boxEl.style.borderColor = br;
      }
      if (barEl) {
        barEl.style.background = accent;
      }
      if (panelEl) {
        panelEl.style.borderColor = accent + "66";
        panelEl.style.boxShadow = `0 10px 25px -5px rgba(0,0,0,0.05), 0 0 12px ${accent}22`;
      }

      if (valEl) {
        valEl.classList.remove("cgpa-pulse");
        void valEl.offsetWidth;
        valEl.classList.add("cgpa-pulse");
      }
    } else {
      if (valEl) valEl.textContent = "—";
      if (barEl) barEl.style.width = "0%";
      if (pctLbl) pctLbl.textContent = "0%";
      if (boxEl) {
        boxEl.style.background = "#f8fafc";
        boxEl.style.borderColor = "#f1f5f9";
      }
      if (barEl) {
        barEl.style.background = "#132450";
      }
      if (panelEl) {
        panelEl.style.borderColor = "#e2e8f0";
        panelEl.style.boxShadow = "0 10px 25px -5px rgba(0,0,0,0.05)";
      }
    }

    // Auto-save to localStorage
    const saved = [];
    calcTbody.querySelectorAll(".cgpa-row").forEach((r) => {
      saved.push({
        name: r.querySelector(".cgpa-subj")?.value || "",
        credit: r.querySelector(".cgpa-cred")?.value || "",
        grade: r.querySelector(".cgpa-opt")?.value || "",
        code: r.dataset.code || "",
      });
    });
    try {
      localStorage.setItem("sp_standalone_cgpa_subjects_v1", JSON.stringify(saved));
    } catch (e) {}
  }

  // ─────────────────────────────────────────────────────────────
  // 3. OVERALL CGPA SECTION LOGIC (Exact ditto from cgpa_sgpa.js)
  // ─────────────────────────────────────────────────────────────
  const overallSection = document.getElementById("overall-cgpa-section-v31");
  const grid = document.getElementById("compact-grid");

  let savedSemesters = [];
  try {
    savedSemesters = JSON.parse(localStorage.getItem("sp_overall_cgpa_semesters_v1") || "[]");
  } catch (e) {}

  function saveSemesters() {
    const vals = [];
    overallSection.querySelectorAll(".badge-sem input").forEach((inp) => {
      vals.push(inp.value);
    });
    try {
      localStorage.setItem("sp_overall_cgpa_semesters_v1", JSON.stringify(vals));
    } catch (e) {}
  }

  function createCompactBadge(index, prefillVal) {
    const div = document.createElement("div");
    div.className = "badge-sem";
    const delBtn = index > 8 ? `<button type="button" class="badge-del" title="Remove">&times;</button>` : "";
    div.innerHTML = `
      <div class="num">Semester ${index}</div>
      <input type="number" class="compact-input" placeholder="0.00" min="0" max="10" step="0.01" value="${prefillVal || ""}">
      ${delBtn}
    `;

    function updateBadgeTier(vStr) {
      const v = parseFloat(vStr);
      div.classList.remove("badge-green", "badge-yellow", "badge-red");
      const numEl = div.querySelector(".num");
      const inpEl = div.querySelector("input");
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

    if (prefillVal) updateBadgeTier(prefillVal);

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

    div.querySelector("input").addEventListener("input", (e) => {
      updateBadgeTier(e.target.value);
      recalcOverall();
      saveSemesters();
    });

    return div;
  }

  function recalcOverall() {
    const inputs = overallSection.querySelectorAll(".badge-sem input");
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

  // ─────────────────────────────────────────────────────────────
  // 4. STORAGE / TIMETABLE SYNC HANDLER
  // ─────────────────────────────────────────────────────────────

  /**
   * Retrieve timetable credits and courses from chrome.storage.local
   * (shared cross-origin) with fallback to localStorage.
   * Mirrors getStoredTimetableData() from cgpa_sgpa.js.
   */
  async function getStoredTimetableData() {
    let credits = {};
    let courses = [];

    // 1. Try chrome.storage.local (extension-wide shared storage)
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      try {
        const data = await new Promise((resolve) => {
          chrome.storage.local.get(
            ["ar_credits_v31", "ar_timetable_courses_v31", "sp_cached_courses_v31"],
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
        if (Array.isArray(data.ar_timetable_courses_v31) && data.ar_timetable_courses_v31.length > 0) {
          courses = data.ar_timetable_courses_v31;
        } else if (Array.isArray(data.sp_cached_courses_v31) && data.sp_cached_courses_v31.length > 0) {
          courses = data.sp_cached_courses_v31;
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
        const localCo =
          localStorage.getItem("ar_timetable_courses_v31") ||
          localStorage.getItem("sp_cached_courses_v31");
        if (localCo) courses = JSON.parse(localCo || "[]");
      } catch (e) {}
    }

    // 3. If courses array is empty but credits map exists, derive courses from credits
    if (courses.length === 0 && Object.keys(credits).length > 0) {
      courses = Object.entries(credits).map(([code, cr]) => ({
        code: code,
        title: code,
        credit: cr,
      }));
    }

    return { credits, courses };
  }

  async function syncCourses() {
    const btnSync = document.getElementById("cgpa-restore-subjects-v31");
    if (!btnSync) return;

    const { credits, courses } = await getStoredTimetableData();

    if (Array.isArray(courses) && courses.length > 0) {
      calcTbody.innerHTML = "";
      const seen = new Set();

      courses.forEach((c) => {
        const code = (c.code || "").toUpperCase().trim();
        if (code && seen.has(code)) return;
        if (code) seen.add(code);

        const title = c.title ? (code && !c.title.includes(code) ? `${code} - ${c.title}` : c.title) : code;
        const cr = c.credit !== null && c.credit !== undefined && c.credit !== "" ? c.credit : (credits[code] || "");

        calcTbody.appendChild(buildCalcRow(title, null, cr, false, code));
      });

      updateRowNumbers();
      recalcCGPA();
      saveSubjects();

      const origHtml = btnSync.innerHTML;
      btnSync.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>Synced!
      `;
      btnSync.style.background = "#dcfce7";
      btnSync.style.borderColor = "#86efac";
      btnSync.style.color = "#15803d";
      setTimeout(() => {
        btnSync.innerHTML = origHtml;
        btnSync.style.background = "";
        btnSync.style.borderColor = "";
        btnSync.style.color = "";
      }, 1800);
    } else {
      // Show inline message instead of alert
      const origHtml = btnSync.innerHTML;
      btnSync.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9a7200" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>No data — Open Academia first
      `;
      btnSync.style.background = "#fffaf0";
      btnSync.style.borderColor = "#f4d875";
      btnSync.style.color = "#9a7200";
      setTimeout(() => {
        btnSync.innerHTML = origHtml;
        btnSync.style.background = "";
        btnSync.style.borderColor = "";
        btnSync.style.color = "";
      }, 3000);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. INITIALIZATION & EVENT BINDINGS
  // ─────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    initGradeReferenceTable();

    // Load saved or seed rows
    let savedSubjects = [];
    try {
      savedSubjects = JSON.parse(localStorage.getItem("sp_standalone_cgpa_subjects_v1") || "[]");
    } catch (e) {}

    calcTbody.innerHTML = "";
    if (Array.isArray(savedSubjects) && savedSubjects.length > 0) {
      savedSubjects.forEach((s) => {
        calcTbody.appendChild(buildCalcRow(s.name, s.grade, s.credit, false, s.code));
      });
    } else {
      for (let i = 0; i < 5; i++) {
        calcTbody.appendChild(buildCalcRow("", null, null, false));
      }
    }
    updateRowNumbers();
    recalcCGPA();

    // Populate overall semesters
    const initialCount = Math.max(8, savedSemesters.length);
    for (let i = 1; i <= initialCount; i++) {
      grid.appendChild(createCompactBadge(i, savedSemesters[i - 1]));
    }
    recalcOverall();

    // Bind controls
    document.getElementById("cgpa-add-v31")?.addEventListener("click", () => {
      calcTbody.appendChild(buildCalcRow("", null, null, true));
      updateRowNumbers();
      recalcCGPA();
    });

    document.getElementById("cgpa-clear-all-v31")?.addEventListener("click", () => {
      calcTbody.innerHTML = "";
      for (let i = 0; i < 5; i++) {
        calcTbody.appendChild(buildCalcRow("", null, null, false));
      }
      updateRowNumbers();
      recalcCGPA();
    });

    document.getElementById("cgpa-restore-subjects-v31")?.addEventListener("click", () => {
      syncCourses();
    });

    document.getElementById("cgpa-fresh-v31")?.addEventListener("click", () => {
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
          c.classList.toggle("active", c.dataset.grade === "");
        });
      });
      recalcCGPA();
    });

    document.getElementById("cgpa-reset-credits-v31")?.addEventListener("click", () => {
      try {
        localStorage.removeItem("sp_cgpa_credits_v1");
      } catch (e) {}
      calcTbody.querySelectorAll(".cgpa-cred").forEach((inp) => {
        inp.value = "";
        inp.classList.remove("cgpa-cred-zero");
        const row = inp.closest(".cgpa-row");
        const sVal = row ? row.querySelector(".cgpa-subj").value : "";
        if (sVal) inp.classList.add("cgpa-cred-glow");
      });
      recalcCGPA();
    });

    // Reset Sync Button in Footer Note
    const btnResetSync = document.getElementById("cgpa-reset-sync-btn");
    if (btnResetSync) {
      btnResetSync.addEventListener("mouseenter", () => {
        if (!btnResetSync.dataset.isResetting) {
          btnResetSync.style.background = "#ffe4e6";
          btnResetSync.style.borderColor = "#fda4af";
        }
      });
      btnResetSync.addEventListener("mouseleave", () => {
        if (!btnResetSync.dataset.isResetting) {
          btnResetSync.style.background = "#fff1f2";
          btnResetSync.style.borderColor = "#fecdd3";
          btnResetSync.style.color = "#e11d48";
        }
      });
      btnResetSync.addEventListener("click", async (e) => {
        e.preventDefault();
        if (btnResetSync.dataset.isResetting) return;
        btnResetSync.dataset.isResetting = "true";

        // Clear all sync caches
        try {
          localStorage.removeItem("ar_timetable_courses_v31");
          localStorage.removeItem("ar_credits_v31");
          localStorage.removeItem("sp_cgpa_credits_v1");
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            await new Promise((resolve) => {
              chrome.storage.local.remove(["ar_timetable_courses_v31", "ar_credits_v31"], resolve);
            });
          }
        } catch (err) {}

        // Show cleared state
        const origContent = btnResetSync.innerHTML;
        btnResetSync.innerHTML = `
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9a7200" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span style="color:#9a7200; font-weight:800;">Cache Cleared!</span>
        `;
        btnResetSync.style.background = "#fff4c2";
        btnResetSync.style.borderColor = "#F4C542";
        btnResetSync.style.color = "#9a7200";

        setTimeout(() => {
          delete btnResetSync.dataset.isResetting;
          btnResetSync.innerHTML = origContent;
          btnResetSync.style.background = "#fff1f2";
          btnResetSync.style.borderColor = "#fecdd3";
          btnResetSync.style.color = "#e11d48";
        }, 2000);
      });
    }

    // Overall Buttons
    document.getElementById("add-compact")?.addEventListener("click", (e) => {
      e.preventDefault();
      const newIdx = grid.querySelectorAll(".badge-sem").length + 1;
      grid.appendChild(createCompactBadge(newIdx, ""));
      saveSemesters();
    });

    document.getElementById("reset-compact")?.addEventListener("click", (e) => {
      e.preventDefault();
      grid.innerHTML = "";
      for (let i = 1; i <= 8; i++) {
        grid.appendChild(createCompactBadge(i, ""));
      }
      recalcOverall();
      saveSemesters();
    });
  });
})();
