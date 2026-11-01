/**
 * ============================================================
 * Academia Prime - Student Portal CAPTCHA Solver
 * ============================================================
 * Automatically detects, solves, and fills CAPTCHAs locally.
 * Strictly limited to Student Portal (sp.srmist.edu.in).
 * ============================================================
 */

(() => {
  "use strict";

  // Strictly execute on Student Portal (sp.srmist.edu.in) only
  if (!window.location.hostname.includes("sp.srmist.edu.in")) {
    return;
  }

  // Prevent double injection
  if (window.__ACADEMIA_CAPTCHA_SOLVER_LOADED__) return;
  window.__ACADEMIA_CAPTCHA_SOLVER_LOADED__ = true;

  const CAPTCHA_KEYWORDS = [
    "captcha", "vcode", "validcode", "checkcode", "authcode",
    "verification", "seccode", "imgcode", "verifycode", "validatecode", "captchaimg"
  ];

  const IGNORED_KEYWORDS = [
    "logo", "banner", "photo", "avatar", "user", "icon", "srm", "header", "footer", "nav"
  ];

  /**
   * Strictly verify if an image element is the Student Portal CAPTCHA.
   */
  function scoreCaptchaElement(el) {
    if (!el || el.dataset.revancedCaptchaProcessed) return 0;

    // Only allow 1 solver button on the page at a time
    if (document.querySelector(".revanced-captcha-host")) return 0;

    const identifiers = [
      el.id,
      el.className,
      el.getAttribute("name") || "",
      el.getAttribute("alt") || "",
      el.getAttribute("src") || ""
    ].join(" ").toLowerCase();

    // Ignore known non-captcha images
    if (IGNORED_KEYWORDS.some((kw) => identifiers.includes(kw) && !identifiers.includes("captcha"))) {
      return 0;
    }

    if (el.closest('header, nav, footer, [role="banner"], [role="navigation"], .navbar, .sidebar')) {
      return 0;
    }

    let score = 0;
    const rect = el.getBoundingClientRect();
    const width = rect.width || el.naturalWidth || 0;
    const height = rect.height || el.naturalHeight || 0;

    // Explicit SRM Student Portal Captcha ID/Name
    if (el.id === "imgCaptcha" || el.getAttribute("name") === "imgCaptcha" || identifiers.includes("captchaservlet") || identifiers.includes("randomcaptcha")) {
      return 100;
    }

    // Has explicit captcha keyword
    if (CAPTCHA_KEYWORDS.some((kw) => identifiers.includes(kw))) {
      score += 15;
    }

    // Typical CAPTCHA dimensions (strictly 40-300w and 18-90h)
    if (width >= 40 && width <= 320 && height >= 18 && height <= 90) {
      score += 5;
    }

    // Is accompanied by an adjacent captcha text input
    if (findAssociatedInput(el)) {
      score += 10;
    }

    return score;
  }

  /**
   * Locate the associated input box for a CAPTCHA element.
   */
  function findAssociatedInput(captchaEl) {
    const form = captchaEl.closest("form") || document;

    // Explicit known IDs for SRM Student Portal
    const explicitMatches = form.querySelectorAll(
      '#txtCaptcha, #captcha, #txt_captcha, #vcode, #captchacode, input[name="txtCaptcha"], input[name="captcha"], input[name="vcode"]'
    );
    for (const input of explicitMatches) {
      if (input.offsetParent !== null || input.type !== "hidden") return input;
    }

    // Check text inputs matching captcha keywords
    const textInputs = form.querySelectorAll('input[type="text"], input:not([type]), input[type="number"]');
    for (const input of textInputs) {
      if (input.type === "hidden" || input.style.display === "none") continue;
      const text = [input.id, input.className, input.name, input.placeholder || ""].join(" ").toLowerCase();
      if (CAPTCHA_KEYWORDS.some((kw) => text.includes(kw))) {
        return input;
      }
    }

    // Proximity search within 250px
    const captchaRect = captchaEl.getBoundingClientRect();
    let closestInput = null;
    let minDistance = 250;

    for (const input of textInputs) {
      if (input.type === "hidden" || input.style.display === "none") continue;
      const inputRect = input.getBoundingClientRect();
      const dist = Math.hypot(captchaRect.left - inputRect.left, captchaRect.top - inputRect.top);
      if (dist < minDistance) {
        minDistance = dist;
        closestInput = input;
      }
    }

    return closestInput;
  }

  /**
   * Convert an image/canvas element to a Base64 data URL.
   */
  async function elementToDataUrl(el) {
    if (el instanceof HTMLCanvasElement) {
      return el.toDataURL("image/png");
    }

    if (el instanceof HTMLImageElement && el.src && el.src.startsWith("data:image/")) {
      return el.src;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = el.naturalWidth || el.width || 120;
      canvas.height = el.naturalHeight || el.height || 40;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(el, 0, 0);
      return canvas.toDataURL("image/png");
    } catch {
      return captureElementViaScreenshot(el);
    }
  }

  /**
   * Fallback screenshot crop when canvas is tainted by CORS.
   */
  async function captureElementViaScreenshot(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) throw new Error("Target CAPTCHA element is not visible");

    if (rect.top < 0 || rect.left < 0 || rect.bottom > window.innerHeight || rect.right > window.innerWidth) {
      el.scrollIntoView({ block: "center", inline: "center" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    const updatedRect = el.getBoundingClientRect();
    const response = await chrome.runtime.sendMessage({ action: "captureTab" });
    if (!response || response.error || !response.dataUrl) {
      throw new Error(response?.error || "Failed to capture viewport screenshot");
    }

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Failed to load screenshot image"));
      img.src = response.dataUrl;
    });

    const dpr = window.devicePixelRatio || 1;
    const sx = Math.max(0, Math.round(updatedRect.left * dpr));
    const sy = Math.max(0, Math.round(updatedRect.top * dpr));
    const sw = Math.min(img.naturalWidth - sx, Math.round(updatedRect.width * dpr));
    const sh = Math.min(img.naturalHeight - sy, Math.round(updatedRect.height * dpr));

    if (sw < 1 || sh < 1) throw new Error("Cropped region has zero dimensions");

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas.toDataURL("image/png");
  }

  /**
   * Update visual states of the Auto Solve button.
   */
  function setButtonState(btn, state, labelText) {
    if (!btn) return;
    const textSpan = btn.querySelector(".revanced-btn-text");
    const solidIcon = btn.querySelector(".revanced-solid-icon");
    const spinner = btn.querySelector(".revanced-spinner");

    btn.classList.remove("revanced-loading", "revanced-success", "revanced-error");

    if (state === "loading") {
      btn.classList.add("revanced-loading");
      if (spinner) spinner.style.display = "inline-block";
      if (solidIcon) solidIcon.style.display = "none";
      if (textSpan) textSpan.textContent = labelText || "Solving...";
    } else if (state === "success") {
      btn.classList.add("revanced-success");
      if (spinner) spinner.style.display = "none";
      if (solidIcon) solidIcon.style.display = "inline-block";
      if (textSpan) textSpan.textContent = labelText || "Solved";
    } else if (state === "error") {
      btn.classList.add("revanced-error");
      if (spinner) spinner.style.display = "none";
      if (solidIcon) solidIcon.style.display = "inline-block";
      if (textSpan) textSpan.textContent = labelText || "Retry";
    } else {
      if (spinner) spinner.style.display = "none";
      if (solidIcon) solidIcon.style.display = "inline-block";
      if (textSpan) textSpan.textContent = "Auto Solve";
    }
  }

  /**
   * Execute CAPTCHA solve request.
   */
  async function solveCaptcha(captchaEl, inputEl, buttonEl) {
    if (!captchaEl) return;
    if (buttonEl) {
      setButtonState(buttonEl, "loading", "Solving...");
    }

    try {
      const imageData = await elementToDataUrl(captchaEl);
      const response = await chrome.runtime.sendMessage({
        action: "solveCaptcha",
        imageData: imageData
      });

      if (response?.error) {
        throw new Error(response.error);
      }

      let solvedText = response?.text?.trim() || "";
      if (!solvedText) {
        throw new Error("No text recognized");
      }

      const targetInput = inputEl || findAssociatedInput(captchaEl);
      if (targetInput) {
        targetInput.value = solvedText;
        targetInput.dispatchEvent(new Event("input", { bubbles: true }));
        targetInput.dispatchEvent(new Event("change", { bubbles: true }));
        targetInput.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
      }

      if (buttonEl) {
        setButtonState(buttonEl, "success", "Solved");
      }

      console.log("[Academia Prime] CAPTCHA auto-solved:", solvedText);
    } catch (err) {
      console.warn("[Academia Prime] CAPTCHA solve failed:", err.message || err);
      if (buttonEl) {
        setButtonState(buttonEl, "error", "Retry");
      }
    } finally {
      if (buttonEl) {
        setTimeout(() => {
          if (!buttonEl.classList.contains("revanced-loading")) {
            setButtonState(buttonEl, "idle");
          }
        }, 2500);
      }
    }
  }

  /**
   * Attach solver UI strictly to the verified CAPTCHA element.
   */
  function setupCaptchaSolver(captchaEl) {
    // Only attach 1 solver on the page
    if (document.querySelector(".revanced-captcha-host")) return;
    if (captchaEl.dataset.revancedCaptchaProcessed) return;
    captchaEl.dataset.revancedCaptchaProcessed = "true";

    const inputEl = findAssociatedInput(captchaEl);

    // Create wrapper host
    const host = document.createElement("span");
    host.className = "revanced-captcha-host";
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: inline-flex !important;
        align-items: center !important;
        margin: 0 0 0 8px !important;
        vertical-align: middle !important;
        position: relative !important;
        z-index: 100 !important;
        flex-shrink: 0 !important;
        max-width: fit-content !important;
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      }
      .revanced-tooltip-wrapper {
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
      }
      .revanced-solve-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        height: 28px !important;
        padding: 0 11px !important;
        border: 1px solid #b8c2d9 !important;
        border-radius: 6px !important;
        background: #e8ecf5 !important;
        color: #0d1938 !important;
        cursor: pointer !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
        letter-spacing: 0.01em !important;
        box-shadow: 0 1px 2px rgba(79, 70, 229, 0.08) !important;
        transition: all 0.15s ease !important;
        user-select: none !important;
        white-space: nowrap !important;
        box-sizing: border-box !important;
      }
      .revanced-solve-btn:hover {
        background: #132450 !important;
        border-color: #0d1938 !important;
        color: #ffffff !important;
        box-shadow: 0 2px 6px rgba(79, 70, 229, 0.28) !important;
        transform: translateY(-1px) !important;
      }
      .revanced-solve-btn:hover .revanced-solid-icon {
        color: #ffffff !important;
      }
      .revanced-solve-btn:active {
        transform: translateY(0) !important;
      }
      .revanced-solid-icon {
        width: 14px !important;
        height: 14px !important;
        display: inline-block !important;
        flex-shrink: 0 !important;
        color: #132450 !important;
        transition: color 0.15s ease !important;
      }
      .revanced-btn-favicon {
        width: 14px !important;
        height: 14px !important;
        border-radius: 2px !important;
        display: inline-block !important;
        flex-shrink: 0 !important;
        vertical-align: middle !important;
      }
      .revanced-solve-btn.revanced-loading .revanced-btn-favicon {
        display: none !important;
      }
      .revanced-btn-text {
        display: inline-block !important;
        font-size: 13px !important;
        font-weight: 700 !important;
      }
      .revanced-solve-btn.revanced-loading {
        pointer-events: none !important;
        background: #f8fafc !important;
        color: #64748b !important;
        border-color: #cbd5e1 !important;
      }
      .revanced-solve-btn.revanced-success {
        background: #f0fdf4 !important;
        color: #15803d !important;
        border-color: #86efac !important;
      }
      .revanced-solve-btn.revanced-success .revanced-solid-icon {
        color: #15803d !important;
      }
      .revanced-solve-btn.revanced-error {
        background: #fef2f2 !important;
        color: #b91c1c !important;
        border-color: #fca5a5 !important;
      }
      .revanced-solve-btn.revanced-error .revanced-solid-icon {
        color: #b91c1c !important;
      }
      .revanced-spinner {
        display: none;
        width: 12px !important;
        height: 12px !important;
        border: 2px solid #cbd5e1 !important;
        border-top-color: #132450 !important;
        border-radius: 50% !important;
        animation: revanced-spin 0.6s linear infinite !important;
        flex-shrink: 0 !important;
      }
      @keyframes revanced-spin {
        to { transform: rotate(360deg); }
      }

      /* MINIMAL LIGHT HOVER TOOLTIP */
      .revanced-tooltip-card {
        position: absolute !important;
        bottom: calc(100% + 8px) !important;
        left: 50% !important;
        transform: translateX(-50%) translateY(4px) !important;
        width: 265px !important;
        padding: 10px 13px !important;
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.04) !important;
        color: #1e293b !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s !important;
        z-index: 999999 !important;
        text-align: left !important;
      }
      .revanced-tooltip-wrapper:hover .revanced-tooltip-card {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateX(-50%) translateY(0) !important;
      }
      .revanced-tt-header {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        margin-bottom: 6px !important;
        padding-bottom: 5px !important;
        border-bottom: 1px solid #f1f5f9 !important;
      }
      .revanced-tt-dot {
        width: 6px !important;
        height: 6px !important;
        background: #16a34a !important;
        border-radius: 50% !important;
        box-shadow: 0 0 5px rgba(22, 163, 74, 0.4) !important;
        display: inline-block !important;
      }
      .revanced-tt-title {
        font-size: 12px !important;
        font-weight: 800 !important;
        color: #1e1b4b !important;
        letter-spacing: 0.02em !important;
      }
      .revanced-tt-list {
        list-style: none !important;
        margin: 0 !important;
        padding: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 5px !important;
      }
      .revanced-tt-list li {
        font-size: 11.5px !important;
        line-height: 1.35 !important;
        color: #475569 !important;
        display: flex !important;
        align-items: flex-start !important;
        gap: 6px !important;
      }
      .revanced-tt-list li::before {
        content: "•" !important;
        color: #132450 !important;
        font-weight: 900 !important;
        font-size: 12.5px !important;
        line-height: 1 !important;
      }
      .revanced-tt-list li b {
        color: #1e1b4b !important;
        font-weight: 700 !important;
      }
      .revanced-tt-arrow {
        position: absolute !important;
        top: 100% !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 0 !important;
        height: 0 !important;
        border-left: 5px solid transparent !important;
        border-right: 5px solid transparent !important;
        border-top: 5px solid #ffffff !important;
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.08)) !important;
      }
    `;
    shadow.appendChild(style);

    const faviconUrl =
      typeof chrome !== "undefined" && chrome.runtime?.getURL
        ? chrome.runtime.getURL("icons/academia-prime-logo.png")
        : "icons/academia-prime-logo.png";

    const wrapper = document.createElement("div");
    wrapper.className = "revanced-tooltip-wrapper";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "revanced-solve-btn";

    btn.innerHTML = `
      <img src="${faviconUrl}" class="revanced-btn-favicon" alt="Prime" />
      <span class="revanced-spinner"></span>
      <span class="revanced-btn-text">Auto Solve</span>
    `;

    const tooltip = document.createElement("div");
    tooltip.className = "revanced-tooltip-card";
    tooltip.innerHTML = `
      <div class="revanced-tt-header">
        <img src="${faviconUrl}" style="width: 14px; height: 14px; border-radius: 2px; vertical-align: middle;" alt="" />
        <span class="revanced-tt-title">Academia Prime</span>
      </div>
      <ul class="revanced-tt-list">
        <li><span><b>~95%+</b> Offline Accuracy</span></li>
        <li><span>Upper & lower case letter may looks odd but it works</span></li>
        <li><span>100% Private & Local</span></li>
      </ul>
      <div class="revanced-tt-arrow"></div>
    `;

    wrapper.appendChild(btn);
    wrapper.appendChild(tooltip);
    shadow.appendChild(wrapper);

    // Smart placement: insert right next to captcha image (or its refresh icon)
    if (captchaEl.parentElement) {
      if (captchaEl.parentElement.tagName === "TD") {
        captchaEl.parentElement.style.whiteSpace = "nowrap";
      }

      let targetSibling = captchaEl;
      const next = captchaEl.nextElementSibling;
      if (
        next &&
        (next.tagName === "A" ||
          next.tagName === "BUTTON" ||
          next.title?.toLowerCase().includes("refresh") ||
          next.getAttribute("onclick")?.toLowerCase().includes("refresh"))
      ) {
        targetSibling = next;
      }

      targetSibling.parentElement.insertBefore(host, targetSibling.nextSibling);
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      solveCaptcha(captchaEl, inputEl, btn);
    });

    const isAutoSolveEnabled = () => {
      try {
        const val = localStorage.getItem("ar_auto_captcha_enabled");
        return val === null ? true : val === "true";
      } catch {
        return true;
      }
    };

    // Auto-solve when captcha image loads/changes
    const triggerAutoSolve = () => {
      if (!isAutoSolveEnabled()) {
        console.log("[Academia Prime] Auto CAPTCHA solve is turned OFF by user.");
        return;
      }
      setTimeout(() => {
        solveCaptcha(captchaEl, inputEl, btn);
      }, 350);
    };

    // Listen for toggle changes (e.g. user toggles auto-solve back ON while on page)
    window.addEventListener("ar-captcha-toggle-changed", (e) => {
      if (e.detail?.enabled) {
        const targetInput = inputEl || findAssociatedInput(captchaEl);
        if (!targetInput?.value?.trim()) {
          triggerAutoSolve();
        }
      }
    });

    if (captchaEl instanceof HTMLImageElement) {
      if (captchaEl.complete && captchaEl.naturalWidth > 0) {
        triggerAutoSolve();
      } else {
        captchaEl.addEventListener("load", triggerAutoSolve, { once: true });
      }

      // Re-solve if image source changes (e.g. user clicks refresh captcha)
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === "attributes" && m.attributeName === "src") {
            triggerAutoSolve();
            break;
          }
        }
      });
      observer.observe(captchaEl, { attributes: true });
    } else {
      triggerAutoSolve();
    }
  }

  /**
   * Scan page strictly for Student Portal CAPTCHA.
   */
  function scanAndAttach() {
    // If solver button is already mounted on the page, don't create any other
    if (document.querySelector(".revanced-captcha-host")) return;

    // First try explicit known SRM Student Portal Captcha element
    const directCaptcha = document.querySelector(
      '#imgCaptcha, img[name="imgCaptcha"], img[src*="CaptchaServlet" i], img[src*="captcha" i], img[id*="captcha" i]'
    );
    if (directCaptcha && scoreCaptchaElement(directCaptcha) >= 10) {
      setupCaptchaSolver(directCaptcha);
      return;
    }

    // Fallback search strictly validating candidates
    const candidates = document.querySelectorAll("img");
    for (const el of candidates) {
      if (scoreCaptchaElement(el) >= 15) {
        setupCaptchaSolver(el);
        break; // Stop after attaching the single button
      }
    }
  }

  // Observe dynamically added forms or modals (disconnects once single verified button is attached)
  const pageObserver = new MutationObserver(() => {
    if (document.querySelector(".revanced-captcha-host")) {
      pageObserver.disconnect();
      return;
    }
    scanAndAttach();
    if (document.querySelector(".revanced-captcha-host")) {
      pageObserver.disconnect();
    }
  });

  // Initial scan
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      scanAndAttach();
      if (document.querySelector(".revanced-captcha-host")) {
        pageObserver.disconnect();
      }
    });
  } else {
    scanAndAttach();
  }

  if (!document.querySelector(".revanced-captcha-host")) {
    pageObserver.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }

  console.log("[Academia Prime] CAPTCHA Solver active (Single Verified Button Mode)");
})();
