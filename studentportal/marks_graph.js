/**
 * ============================================================
 * FILE: marks_graph.js  (Internal Marks - Performance Chart)
 * ============================================================
 * - Y axis: 0-100% performance scale
 * - Each LINE SEGMENT: GREEN if going up, RED if going down
 * - Each AREA SEGMENT: same green/red per direction
 * - Each DOT: green if improved from prev, red if declined
 * - Label BOXES: pill rect behind %  and score/max text
 *   (no text overlap, box flips below if near top edge)
 * ============================================================
 */
(() => {
  "use strict";
  if (!window.location.hostname.includes("sp.srmist.edu.in")) return;
  console.log("[Academia Prime] marks_graph.js loaded");

  const MG_STYLE_ID   = "sp-marks-graph-styles-v1";
  const MG_TABLE_ATTR = "data-mg-graph-injected";

  const C_GREEN      = "#16a34a";
  const C_GREEN_STR  = "#22c55e";
  const C_GREEN_BG   = "rgba(34,197,94,0.12)";
  const C_GREEN_PILL = "#f0fdf4";
  const C_RED        = "#dc2626";
  const C_RED_STR    = "#ef4444";
  const C_RED_BG     = "rgba(239,68,68,0.10)";
  const C_RED_PILL   = "#fff1f2";
  const C_NEUTRAL    = "#253b70";
  const C_NEUT_PILL  = "#e8ecf5";

  // ── Styles ───────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById(MG_STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = MG_STYLE_ID;
    s.textContent = `
      .mg-wrap {
        margin: 14px 0 4px 0 !important;
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        box-shadow: 0 2px 8px rgba(15,23,42,0.06) !important;
        font-family: 'Inter','Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif !important;
      }
      .mg-head {
        display: flex !important; align-items: center !important;
        gap: 8px !important; padding: 10px 16px !important;
        background: #f8fafc !important; border-bottom: 1px solid #e2e8f0 !important;
      }
      .mg-head-icon {
        display: flex !important; align-items: center !important; justify-content: center !important;
        width: 26px !important; height: 26px !important;
        background: #e8ecf5 !important; border: 1px solid #b8c2d9 !important;
        border-radius: 7px !important; flex-shrink: 0 !important;
      }
      .mg-head-title {
        font-size: 12.5px !important; font-weight: 800 !important;
        color: #1e293b !important; letter-spacing: -0.01em !important; flex: 1 !important;
      }
      .mg-head-right { display: flex !important; align-items: center !important; gap: 6px !important; }
      .mg-head-badge {
        font-size: 10px !important; font-weight: 700 !important;
        color: #0d1938 !important; background: #e8ecf5 !important;
        border: 1px solid #b8c2d9 !important; border-radius: 5px !important;
        padding: 2px 8px !important; white-space: nowrap !important;
      }
      .mg-trend-badge { font-size: 10px !important; font-weight: 700 !important; border-radius: 5px !important; padding: 2px 8px !important; white-space: nowrap !important; }
      .mg-trend-up   { color:#15803d !important; background:#dcfce7 !important; border:1px solid #86efac !important; }
      .mg-trend-down { color:#b91c1c !important; background:#fee2e2 !important; border:1px solid #fca5a5 !important; }
      .mg-trend-flat { color:#745900 !important; background:#fff4c2 !important; border:1px solid #F4C542 !important; }
      .mg-chart-area { padding: 10px 16px 10px 8px !important; position: relative !important; user-select: none !important; }
      .mg-svg { display: block !important; width: 100% !important; overflow: visible !important; }
      .mg-tooltip {
        position: absolute !important; font-size: 11px !important; font-weight: 700 !important;
        padding: 5px 10px !important; border-radius: 7px !important;
        pointer-events: none !important; white-space: nowrap !important;
        opacity: 0 !important; transition: opacity 0.12s ease !important;
        z-index: 2147483647 !important; box-shadow: 0 4px 12px rgba(15,23,42,0.25) !important;
        transform: translate(-50%,-115%) !important; color: #ffffff !important;
      }
      .mg-tooltip.mg-tt-on { opacity: 1 !important; }
    `;
    document.head.appendChild(s);
  }

  // ── Helpers ──────────────────────────────────────────────
  function parseMark(raw) {
    if (!raw) return null;
    const c = raw.replace(/[^0-9./\s]/g, "").trim();
    const m = c.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (m) return { scored: parseFloat(m[1]), max: parseFloat(m[2]) };
    const n = parseFloat(c);
    return isNaN(n) ? null : { scored: n, max: null };
  }

  function isTotalRow(row) {
    const t = (row.innerText || row.textContent || "").toLowerCase();
    return t.includes("total") || t.includes("overall") || row.classList.contains("sp-total-row");
  }

  function parseTable(table) {
    if (!table) return [];
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length < 2) return [];
    let header = null, colComp = -1, colMark = -1;
    for (let i = 0; i < Math.min(rows.length, 6); i++) {
      const t = (rows[i].innerText || rows[i].textContent || "").toLowerCase();
      if ((t.includes("component")||t.includes("test")||t.includes("entered")||t.includes("date")) &&
          (t.includes("mark")||t.includes("max")||t.includes("score"))) {
        header = rows[i];
        Array.from(rows[i].children).forEach((c, idx) => {
          const ct = (c.innerText||c.textContent||"").toLowerCase().trim();
          if (ct.includes("component")||ct.includes("assessment")||ct.includes("test")||ct.includes("name")) colComp = idx;
          else if (ct.includes("mark")||ct.includes("max")||ct.includes("score")) colMark = idx;
        });
        break;
      }
    }
    if (colMark === -1 && header && header.children.length >= 2) {
      colMark = header.children.length - 1;
      if (colComp === -1 && colMark > 0) colComp = colMark - 1;
    }
    if (colMark === -1) return [];
    const items = [];
    rows.forEach(row => {
      if (row === header || row.querySelector("th") || row.cells.length < 2) return;
      const label = (colComp >= 0 && row.cells[colComp])
        ? (row.cells[colComp].innerText||row.cells[colComp].textContent||"").trim()
        : "Item " + (items.length + 1);
      const raw = (colMark >= 0 && row.cells[colMark])
        ? (row.cells[colMark].innerText||row.cells[colMark].textContent||"").trim() : "";
      const parsed = parseMark(raw);
      if (!parsed) return;
      items.push({ label: label||"Item "+(items.length+1), scored: parsed.scored, max: parsed.max, isTotal: isTotalRow(row) });
    });
    return items;
  }

  function getPct(item) {
    if (item.max !== null && item.max > 0) return Math.min(100, (item.scored / item.max) * 100);
    return item.scored <= 100 ? item.scored : 100;
  }

  // Direction: +1 up, -1 down, 0 flat
  function dir(a, b) { return b > a ? 1 : b < a ? -1 : 0; }

  function segColors(d) {
    // d: +1, -1, 0
    if (d > 0) return { line: C_GREEN_STR, area: C_GREEN_BG, pill: C_GREEN_PILL, border: C_GREEN, text: C_GREEN };
    if (d < 0) return { line: C_RED_STR,   area: C_RED_BG,   pill: C_RED_PILL,   border: C_RED,   text: C_RED };
    return           { line: "#94a3b8",     area: "rgba(148,163,184,0.08)", pill: C_NEUT_PILL, border: C_NEUTRAL, text: C_NEUTRAL };
  }

  function trendBadge(pcts) {
    if (pcts.length < 2) return null;
    const diff = pcts[pcts.length-1] - pcts[0];
    if (Math.abs(diff) < 3) return { cls: "mg-trend-flat", text: "≈ Stable" };
    if (diff > 0)            return { cls: "mg-trend-up",   text: "↑ Improving +" + diff.toFixed(1) + "%" };
    return                         { cls: "mg-trend-down",  text: "↓ Declining "  + diff.toFixed(1) + "%" };
  }

  // ── SVG label BOX (pill with pct + mark inside) ──────────
  // Returns SVG string for a label box above (or below if near top) a dot
  function labelBox(cx, dotY, pct, markText, col, PAD_T, cH) {
    const BOX_W = 52, BOX_H = 32, BOX_RX = 6;
    const CONNECTOR = 6; // gap between bottom of box and top of dot

    // Default: box above the dot
    let boxY = dotY - CONNECTOR - BOX_H;
    let flipped = false;

    // If box would clip above chart area, flip it below
    if (boxY < PAD_T - 2) {
      boxY = dotY + CONNECTOR + 4; // below dot (dot radius ~4.5)
      flipped = true;
    }

    const boxX = cx - BOX_W / 2;
    const pctY  = boxY + 12;
    const markY = boxY + 24;

    let svg = "";

    // Drop shadow-like rect
    svg += `<rect x="${boxX.toFixed(1)}" y="${boxY.toFixed(1)}" width="${BOX_W}" height="${BOX_H}"
      rx="${BOX_RX}" ry="${BOX_RX}"
      fill="${col.pill}" stroke="${col.border}" stroke-width="1.2"/>`;

    // % line (bold, col.text)
    svg += `<text x="${cx.toFixed(1)}" y="${pctY.toFixed(1)}"
      text-anchor="middle" font-size="10" font-weight="800"
      fill="${col.text}" font-family="Inter,sans-serif">${pct.toFixed(0)}%</text>`;

    // mark/max line (gray)
    svg += `<text x="${cx.toFixed(1)}" y="${markY.toFixed(1)}"
      text-anchor="middle" font-size="8.5" font-weight="600"
      fill="#64748b" font-family="Inter,sans-serif">${markText}</text>`;

    // Small connector line from box to dot
    const lineTop  = flipped ? (boxY - 2) : (boxY + BOX_H);
    const lineBtm  = flipped ? (dotY + 4.5 + 2) : (dotY - 4.5 - 2);
    // Only draw connector if there is actual gap
    if (Math.abs(lineBtm - lineTop) > 2) {
      svg += `<line x1="${cx.toFixed(1)}" y1="${Math.min(lineTop,lineBtm).toFixed(1)}"
        x2="${cx.toFixed(1)}" y2="${Math.max(lineTop,lineBtm).toFixed(1)}"
        stroke="${col.border}" stroke-width="1" stroke-dasharray="2,2"/>`;
    }

    return svg;
  }

  // ── Chart Builder ────────────────────────────────────────
  function buildChart(items, totalItem) {
    injectStyles();
    const data = items.filter(i => !i.isTotal);
    if (data.length === 0) return null;

    const W = 480, H = 210;
    const PAD_L = 38, PAD_R = 14, PAD_T = 50, PAD_B = 36;
    const cW = W - PAD_L - PAD_R;
    const cH = H - PAD_T - PAD_B;

    const n    = data.length;
    const pcts = data.map(d => getPct(d));
    const xs   = data.map((_, i) => PAD_L + (n < 2 ? cW / 2 : (i / (n - 1)) * cW));
    const ys   = pcts.map(p  => PAD_T + cH - (p / 100) * cH);

    const yTicks  = [0, 25, 50, 75, 100];
    const trend   = trendBadge(pcts);
    const baseY   = (PAD_T + cH).toFixed(1);

    let inner = "";

    // ── Y grid + labels ──
    yTicks.forEach(pct => {
      const gy = PAD_T + cH - (pct / 100) * cH;
      inner += `<line x1="${PAD_L}" y1="${gy.toFixed(1)}" x2="${(PAD_L+cW).toFixed(1)}" y2="${gy.toFixed(1)}"
        stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3"/>`;
      inner += `<text x="${PAD_L-4}" y="${(gy+3.5).toFixed(1)}"
        text-anchor="end" font-size="9" fill="#94a3b8"
        font-family="Inter,sans-serif" font-weight="600">${pct}%</text>`;
    });

    // ── Vertical guide lines ──
    xs.forEach(x => {
      inner += `<line x1="${x.toFixed(1)}" y1="${PAD_T}" x2="${x.toFixed(1)}" y2="${baseY}"
        stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,4"/>`;
    });

    // ── Per-segment area fills (direction-coloured) ──
    if (n === 1) {
      // Single point: small area under the dot
      const sc = segColors(0);
      inner += `<rect x="${(xs[0]-cW/4).toFixed(1)}" y="${ys[0].toFixed(1)}"
        width="${(cW/2).toFixed(1)}" height="${(parseFloat(baseY)-ys[0]).toFixed(1)}"
        fill="${sc.area}"/>`;
    } else {
      for (let i = 0; i < n - 1; i++) {
        const d  = dir(pcts[i], pcts[i+1]);
        const sc = segColors(d);
        const segPath = `M${xs[i].toFixed(1)},${ys[i].toFixed(1)} L${xs[i+1].toFixed(1)},${ys[i+1].toFixed(1)} L${xs[i+1].toFixed(1)},${baseY} L${xs[i].toFixed(1)},${baseY} Z`;
        inner += `<path d="${segPath}" fill="${sc.area}"/>`;
      }
    }

    // ── Per-segment lines (direction-coloured) ──
    for (let i = 0; i < n - 1; i++) {
      const d  = dir(pcts[i], pcts[i+1]);
      const sc = segColors(d);
      inner += `<line x1="${xs[i].toFixed(1)}" y1="${ys[i].toFixed(1)}"
        x2="${xs[i+1].toFixed(1)}" y2="${ys[i+1].toFixed(1)}"
        stroke="${sc.line}" stroke-width="2.4" stroke-linecap="round"/>`;
    }

    // ── Dots + label boxes + X labels ──
    data.forEach((d, i) => {
      const x   = xs[i];
      const y   = ys[i];
      const pct = pcts[i];

      // Dot direction color: compare to previous (first dot compares to next)
      let dotDir = 0;
      if (i > 0)       dotDir = dir(pcts[i-1], pcts[i]);
      else if (n > 1)  dotDir = dir(pcts[0], pcts[1]);
      const dc = segColors(dotDir);

      // Raw mark string
      const markText = d.max !== null ? d.scored + " / " + d.max : String(d.scored);

      // Label box above (or below) the dot
      inner += labelBox(x, y, pct, markText, dc, PAD_T, cH);

      // Dot (drawn on top of box connector)
      inner += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5"
        fill="#ffffff" stroke="${dc.border}" stroke-width="2.4" data-idx="${i}"/>`;

      // X-axis label
      const lbl = d.label.length > 8 ? d.label.slice(0, 7) + "…" : d.label;
      inner += `<text x="${x.toFixed(1)}" y="${(PAD_T + cH + 15).toFixed(1)}"
        text-anchor="middle" font-size="9" fill="#64748b"
        font-family="Inter,sans-serif" font-weight="600">${lbl}</text>`;

      // Hover rect (invisible)
      const slotW = n > 1 ? cW / (n - 1) : cW;
      const hx = Math.max(PAD_L, x - slotW / 2);
      inner += `<rect x="${hx.toFixed(1)}" y="${PAD_T}" width="${Math.min(slotW, cW).toFixed(1)}"
        height="${cH}" fill="transparent" class="mg-hover"
        data-idx="${i}" data-label="${d.label}"
        data-scored="${d.scored}" data-max="${d.max !== null ? d.max : ''}"
        data-pct="${pct.toFixed(1)}" data-dir="${dotDir}"/>`;
    });

    // ── Assemble DOM ──
    const wrap = document.createElement("div");
    wrap.className = "mg-wrap";

    const totalText = totalItem && totalItem.max !== null
      ? "Total " + totalItem.scored + " / " + totalItem.max + " (" + getPct(totalItem).toFixed(1) + "%)"
      : data.length + " assessments";
    const trendHtml = trend
      ? `<span class="mg-trend-badge ${trend.cls}">${trend.text}</span>` : "";

    wrap.innerHTML = `
      <div class="mg-head">
        
        <span class="mg-head-title">Performance Graph</span>
        <div class="mg-head-right">${trendHtml}<span class="mg-head-badge">${totalText}</span></div>
      </div>
      <div class="mg-chart-area">
        <svg class="mg-svg" viewBox="0 0 ${W} ${H}">${inner}</svg>
      </div>`;

    // Tooltip
    const tt = document.createElement("div");
    tt.className = "mg-tooltip";
    wrap.querySelector(".mg-chart-area").appendChild(tt);

    setTimeout(() => {
      const svg  = wrap.querySelector(".mg-svg");
      const area = wrap.querySelector(".mg-chart-area");
      if (!svg || !area) return;
      svg.querySelectorAll(".mg-hover").forEach(rect => {
        rect.addEventListener("mouseenter", () => {
          const label  = rect.getAttribute("data-label");
          const scored = rect.getAttribute("data-scored");
          const max    = rect.getAttribute("data-max");
          const pct    = rect.getAttribute("data-pct");
          const d      = parseInt(rect.getAttribute("data-dir"));
          tt.textContent = label + ": " + scored + (max ? " / " + max : "") + "  (" + pct + "%)";
          tt.style.background = d > 0 ? C_GREEN : d < 0 ? C_RED : C_NEUTRAL;

          const idx = rect.getAttribute("data-idx");
          const dot = svg.querySelector('circle[data-idx="' + idx + '"]');
          if (dot) {
            const sr = svg.getBoundingClientRect();
            const ar = area.getBoundingClientRect();
            tt.style.left = (sr.left - ar.left + parseFloat(dot.getAttribute("cx")) * (sr.width  / W)) + "px";
            tt.style.top  = (sr.top  - ar.top  + parseFloat(dot.getAttribute("cy")) * (sr.height / H)) + "px";
          }
          tt.classList.add("mg-tt-on");
        });
        rect.addEventListener("mouseleave", () => tt.classList.remove("mg-tt-on"));
      });
    }, 0);

    return wrap;
  }

  // ── Injection ────────────────────────────────────────────
  function injectGraphs(root) {
    root.querySelectorAll("table.sp-details-breakdown-table").forEach(table => {
      if (table.hasAttribute(MG_TABLE_ATTR)) return;
      table.setAttribute(MG_TABLE_ATTR, "true");
      const items = parseTable(table);
      if (!items.length) return;
      const totalItem = items.find(i => i.isTotal) || null;
      const chart = buildChart(items, totalItem);
      if (!chart) return;
      const anchor = table.closest(".table-responsive") || table;
      if (anchor.parentNode) anchor.parentNode.insertBefore(chart, anchor.nextSibling);
    });
  }

  // ── Observer ─────────────────────────────────────────────
  let timer = null;
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => injectGraphs(document), 130);
  }

  function init() {
    injectGraphs(document);
    new MutationObserver(mutations => {
      for (const m of mutations)
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (
            (n.classList && (n.classList.contains("sp-details-breakdown-table") ||
              n.classList.contains("modal") || n.classList.contains("modal-content"))) ||
            (n.querySelector && n.querySelector("table.sp-details-breakdown-table")) ||
            (n.id && (n.id.toLowerCase().includes("modal") || n.id.toLowerCase().includes("detail")))
          ) { schedule(); return; }
        }
    }).observe(document.body || document.documentElement, { childList: true, subtree: true });

    document.addEventListener("click", e => {
      if (e.target && e.target.closest(".sp-btn-view-details, [onclick]")) {
        [200, 500, 900, 1500, 2400].forEach(d => setTimeout(() => injectGraphs(document), d));
      }
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();