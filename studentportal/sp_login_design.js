/**
 * ============================================================
 * Academia Prime - Student Portal Login Page Theme Engine
 * ============================================================
 * Applies modern minimalist Prime aesthetics strictly to
 * the Student Portal (sp.srmist.edu.in) login page.
 *
 * Rearranged Hierarchy:
 * 1. Centered SRM Logo at the very top
 * 2. Welcome & NetID Guidance Card ("Dear Student...") right after logo
 * 3. Expanded, Centered Login Screen (#divLogin)
 *
 * Reorganized CAPTCHA Section:
 * - Row 1: [Captcha Image] [Refresh Button] [Auto Solve] [Auto: ON] (Centered Controls Bar)
 * - Row 2: Full-width CAPTCHA text input matching NetID & Password
 * - Row 3: Full-width Yellow Troubleshooting Notice Box (Dotted Outline)
 * - Row 4: Full-width Elevated Indigo Login button
 *
 * Strictly preserves all inputs, IDs, form action, and buttons.
 * ============================================================
 */

(() => {
  "use strict";

  // Strictly execute on Student Portal (sp.srmist.edu.in) only
  if (!window.location.hostname.includes("sp.srmist.edu.in")) {
    return;
  }

  /**
   * Strictly verify if the current page is the Student Portal login page.
   */
  function isLoginPage() {
    return (
      window.location.pathname.includes("/loginManager/") ||
      window.location.pathname.includes("Login.jsp") ||
      document.getElementById("login_form") !== null ||
      document.getElementById("divLogin") !== null
    );
  }

  /**
   * Apply Prime scoping class to activate theme styles.
   */
  function applyLoginTheme() {
    if (!isLoginPage()) return;

    document.documentElement.classList.add("revanced-login-page");
    if (document.body) {
      document.body.classList.add("revanced-login-page");
    }
  }

  /**
   * Rearrange Page Layout:
   * 1. LEFT SIDE: SRM Logo at top-left + "Dear Student..." guidance + Yellow Notice Box
   * 2. RIGHT SIDE: Student Portal Login Screen (#divLogin) with NetID, Password, Captcha, Login button
   */
  function rearrangePageLayout() {
    if (!isLoginPage()) return;

    const divLogin = document.getElementById("divLogin");
    if (!divLogin) return;

    // Accurately locate the exact row containing the login form
    const rowWrapper = divLogin.closest(".row");
    if (!rowWrapper) return;

    if (!rowWrapper.classList.contains("revanced-rearranged-flow")) {
      rowWrapper.classList.add("revanced-rearranged-flow");
    }

    // 1. Locate the login form column (RIGHT) and text column (LEFT)
    const formCol = Array.from(rowWrapper.children).find((el) =>
      el.contains(divLogin)
    );
    const textCol = Array.from(rowWrapper.children).find(
      (el) =>
        el !== formCol &&
        (el.querySelector("h4") ||
          el.textContent.includes("Dear Student") ||
          !el.contains(divLogin))
    );

    if (textCol && !textCol.classList.contains("revanced-student-welcome-section")) {
      textCol.classList.add("revanced-student-welcome-section");
    }
    if (formCol && !formCol.classList.contains("revanced-login-form-section")) {
      formCol.classList.add("revanced-login-form-section");
    }

    // 2. Move SRM Logo to the TOP-LEFT of the LEFT column (textCol)
    const logoImg = document.querySelector('img[src*="srmist" i], img[src*="logo" i]');
    if (logoImg && textCol) {
      let logoWrap = textCol.querySelector(".revanced-left-logo-wrap");
      if (!logoWrap) {
        logoWrap = document.createElement("div");
        logoWrap.className = "revanced-left-logo-wrap";
        textCol.insertBefore(logoWrap, textCol.firstChild);
      }
      if (logoImg.parentElement !== logoWrap) {
        logoWrap.appendChild(logoImg);
      }
      // Strictly unstretch: set once to avoid forcing reflows on every pass
      if (!logoImg.dataset.revancedStyled) {
        logoImg.dataset.revancedStyled = "true";
        logoImg.removeAttribute("width");
        logoImg.removeAttribute("height");
        logoImg.style.setProperty("width", "auto", "important");
        logoImg.style.setProperty("height", "auto", "important");
        logoImg.style.setProperty("max-width", "250px", "important");
        logoImg.style.setProperty("max-height", "56px", "important");
        logoImg.style.setProperty("object-fit", "contain", "important");
        logoImg.style.setProperty("object-position", "left center", "important");
      }
    }

    // 3. Mark the NetID instructions paragraph for the dotted box
    const netIdP = Array.from(textCol ? textCol.querySelectorAll("p") : []).find(
      (p) =>
        p.textContent.includes("NetID") ||
        p.textContent.includes("netid") ||
        p.textContent.includes("mail id")
    );
    if (netIdP && !netIdP.classList.contains("revanced-netid-box")) {
      netIdP.classList.add("revanced-netid-box");
    }

    // 4. Ensure the troubleshooting Note card is present in the LEFT column at the bottom
    if (textCol) {
      let noticeCard = textCol.querySelector(".revanced-notice-card");
      const noticeHost = document.querySelector(".revanced-captcha-notice-host");
      if (!noticeCard && !noticeHost) {
        noticeCard = document.createElement("div");
        noticeCard.className = "revanced-notice-card";
        noticeCard.innerHTML = `
          <div class="revanced-notice-header">
            <svg class="revanced-notice-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span class="revanced-notice-title">Note:</span>
          </div>
          <ul class="revanced-notice-list">
            <li>While Login, if the portal keeps refreshing without showing any error, <span class="revanced-notice-pill" style="display: inline-block; padding: 1px 6px; border: 1.5px dotted #9a7200; border-radius: 5px; font-weight: normal; background: #fff4c2; color: #5c4500; line-height: 1.25; margin: 1px 2px;">turn Auto Captcha OFF and enter the CAPTCHA manually</span> or <span class="revanced-notice-pill" style="display: inline-block; padding: 1px 6px; border: 1.5px dotted #9a7200; border-radius: 5px; font-weight: normal; background: #fff4c2; color: #5c4500; line-height: 1.25; margin: 1px 2px;">refresh the page</span> or <span class="revanced-notice-pill" style="display: inline-block; padding: 1px 6px; border: 1.5px dotted #9a7200; border-radius: 5px; font-weight: normal; background: #fff4c2; color: #5c4500; line-height: 1.25; margin: 1px 2px;">just click on captcha text box</span> then press ENTER press login.<br><span class="revanced-notice-red" style="color: #dc2626; font-weight: normal;">(it's website or portal issue not extension bug)</span>.</li>
            <li>If you see <b>"Invalid captcha"</b> repeatedly, please <a href="https://docs.google.com/forms/d/1tJC_i71rU6TjHtndcNkotq39YTcs9VxU79uCXzi2a3w/viewform" target="_blank" rel="noopener noreferrer" class="revanced-report-link">report it here ↗</a> so I can fix it ASAP.</li>
          </ul>
        `;
        textCol.appendChild(noticeCard);
      } else if (noticeHost && noticeHost.parentElement !== textCol) {
        textCol.appendChild(noticeHost);
      }
    }

    // 4. Strictly lock textCol as 1st child (LEFT side) and formCol as 2nd child (RIGHT side)
    if (textCol && formCol && textCol.parentElement === rowWrapper && formCol.parentElement === rowWrapper) {
      if (textCol.nextElementSibling !== formCol) {
        rowWrapper.insertBefore(textCol, formCol);
      }
    }
  }

  /**
   * Layout Optimization Algorithm:
   * Algorithmically reorganizes the CAPTCHA area into a clean, centered,
   * modern component without changing any input IDs, names, or form actions.
   */
  function optimizeCaptchaLayout() {
    if (!isLoginPage()) return;

    const loginForm = document.getElementById("login_form");
    if (!loginForm) return;

    const captchaRow = loginForm.querySelector(".form-group.row");
    if (!captchaRow) return;

    const captchaImg = captchaRow.querySelector("#secure_captcha, #captchaImg, img[id*='captcha' i]");
    const refreshBtn = captchaRow.querySelector("#btnRefresh");
    const inputGroup = captchaRow.querySelector(".col-sm-6, .input-group");
    const solverHost = document.querySelector(".revanced-captcha-host");
    const toggleHost = document.querySelector(".revanced-captcha-toggle-host");
    const noticeHost = document.querySelector(".revanced-captcha-notice-host");

    if (!captchaImg || !inputGroup) return;

    // 1. Ensure dedicated centered controls bar exists at the top of the captcha group
    let controlsBar = captchaRow.querySelector(".revanced-captcha-controls-bar");
    if (!controlsBar) {
      controlsBar = document.createElement("div");
      controlsBar.className = "revanced-captcha-controls-bar";
      captchaRow.insertBefore(controlsBar, captchaRow.firstChild);
    }

    // 2. Group captcha image and refresh button cleanly into controlsBar
    if (captchaImg.parentElement !== controlsBar) {
      controlsBar.appendChild(captchaImg);
    }
    if (refreshBtn && refreshBtn.parentElement !== controlsBar) {
      controlsBar.appendChild(refreshBtn);
    }
    if (refreshBtn && !refreshBtn.dataset.revancedReady) {
      refreshBtn.dataset.revancedReady = "true";
      refreshBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
      `;
      refreshBtn.title = "Refresh CAPTCHA";
    }

    // 3. Move Auto Solve & Toggle hosts into controlsBar
    if (solverHost && solverHost.parentElement !== controlsBar) {
      controlsBar.appendChild(solverHost);
    }
    if (toggleHost && toggleHost.parentElement !== controlsBar) {
      controlsBar.appendChild(toggleHost);
    }

    // 4. Style input group to be full width
    if (inputGroup.classList.contains("col-sm-6")) {
      inputGroup.classList.remove("col-sm-6");
      inputGroup.classList.add("revanced-captcha-input-group");
    }

    // 5. Ensure notice host sits neatly on the LEFT side inside the Welcome & Notes guidance section
    const welcomeSection = document.querySelector(".revanced-student-welcome-section");
    if (noticeHost && welcomeSection && noticeHost.parentElement !== welcomeSection) {
      welcomeSection.appendChild(noticeHost);
    }
    const exclusiveCard = document.querySelector("#revanced-exclusive-login-box, .revanced-exclusive-login-card");
    if (exclusiveCard && welcomeSection && exclusiveCard.parentElement === welcomeSection) {
      welcomeSection.appendChild(exclusiveCard);
    }

    // 6. Hide empty leftover Bootstrap column containers
    captchaRow.querySelectorAll(".col-sm-5, .col-sm-1").forEach((el) => {
      if (el.style.display !== "none" && (el.children.length === 0 || (el.children.length === 1 && el.children[0].children.length === 0))) {
        el.style.display = "none";
      }
    });
  }

  let isLayoutComplete = false;
  let layoutDebounceTimer = null;
  let observer = null;

  function runLayoutPass() {
    if (!isLoginPage()) return;
    applyLoginTheme();
    rearrangePageLayout();
    optimizeCaptchaLayout();

    // Strictly remove any stray bottom-left header placement buttons on login page
    document.querySelectorAll("#sp-placement-prep-container, .sp-placement-prep-nav-item").forEach((el) => {
      if (!el.closest("#revanced-exclusive-login-box")) {
        el.remove();
      }
    });

    const rowWrapper = document.querySelector(".revanced-rearranged-flow");
    const controlsBar = document.querySelector(".revanced-captcha-controls-bar");
    const solverHost = document.querySelector(".revanced-captcha-host");
    const toggleHost = document.querySelector(".revanced-captcha-toggle-host");
    const noticeCard = document.querySelector(".revanced-notice-card, .revanced-captcha-notice-host");
    const exclusiveCard = document.querySelector("#revanced-exclusive-login-box, .revanced-exclusive-login-card");

    if (rowWrapper && controlsBar && solverHost && toggleHost && noticeCard && exclusiveCard) {
      isLayoutComplete = true;
      if (observer) {
        observer.disconnect();
      }
    }
  }

  function scheduleLayoutPass() {
    if (isLayoutComplete) return;
    if (layoutDebounceTimer) clearTimeout(layoutDebounceTimer);
    layoutDebounceTimer = setTimeout(() => {
      runLayoutPass();
    }, 40);
  }

  // Initial execution
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runLayoutPass);
  } else {
    runLayoutPass();
  }

  // Debounced, targeted MutationObserver that stops once layout is complete
  observer = new MutationObserver((mutations) => {
    if (isLayoutComplete) {
      observer.disconnect();
      return;
    }

    let shouldRun = false;
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length > 0) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            if (
              node.id === "login_form" ||
              node.id === "divLogin" ||
              node.classList?.contains("revanced-captcha-host") ||
              node.classList?.contains("revanced-captcha-toggle-host") ||
              node.querySelector?.("#divLogin, .revanced-captcha-host")
            ) {
              shouldRun = true;
              break;
            }
          }
        }
      }
      if (shouldRun) break;
    }

    if (shouldRun) {
      scheduleLayoutPass();
    }
  });

  const target = document.body || document.documentElement;
  if (target) {
    observer.observe(target, {
      childList: true,
      subtree: true
    });
  }
})();
