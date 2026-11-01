/**
 * Student Portal - About Prime Engine
 * - Modern Redesigned Modal with Curated Color Accents for each Tab
 * - Full 7-Tab Architecture (Changelog, Phone/Tablet Guide, FAQ, Portal Notice, Important Links, Report Bug, Review)
 * - Expandable Changelog History (v1.4.5 down to v1.0.0)
 * - Inbuilt Interactive Google Form Frame
 * - Chrome Web Store Review Action Box
 */
(() => {
  "use strict";

  // Strictly execute on Student Portal (sp.srmist.edu.in) top frame only - never touch Academia or sub-iframes
  if (window.location.hostname.includes("academia.") || window !== window.top) {
    return;
  }

  const PRIME_VERSION = "1.4.5";
  const LOGO_URL =
    typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL("icons/academia-prime-logo.png")
      : "";
  const BUGS_FORM_URL =
    "https://docs.google.com/forms/d/1tJC_i71rU6TjHtndcNkotq39YTcs9VxU79uCXzi2a3w/viewform";
  const BUGS_EMBED_URL =
    "https://docs.google.com/forms/d/1tJC_i71rU6TjHtndcNkotq39YTcs9VxU79uCXzi2a3w/viewform?embedded=true";
  const CHROME_STORE_URL =
    "https://chromewebstore.google.com/detail/academia-prime/kkhjcadiccbncoajcohhndhdiijpgmdj";
  const PRIVACY_POLICY_URL = chrome.runtime.getURL("privacy-policy.html");

  /**
   * Injects the modern redesigned Prime Modal into the DOM.
   */
  function ensureAboutModal() {
    if (document.getElementById("sp-revanced-modal-overlay")) return;

    const theHelperLogoUrl =
      typeof chrome !== "undefined" && chrome.runtime?.getURL
        ? chrome.runtime.getURL("icons/academia-prime-logo.png")
        : "icons/academia-prime-logo.png";

    const modalOverlay = document.createElement("div");
    modalOverlay.id = "sp-revanced-modal-overlay";
    modalOverlay.className = "sp-rev-overlay";
    modalOverlay.style.display = "none";

    modalOverlay.innerHTML = `
      <div class="sp-about-modal-card" id="spAboutModalCard" role="dialog" aria-modal="true">
        <!-- MODAL HEADER -->
        <div class="sp-about-header">
          <div class="sp-about-title-group">
            <div class="sp-about-title-stack">
              <div class="sp-about-title-row">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span class="sp-about-title">About Prime</span>
                <span class="sp-version-pill">v${PRIME_VERSION}</span>
              </div>
              <span class="sp-about-subtitle">Built for SRM Student Portal & Zoho Academia.</span>
            </div>
          </div>

          <div class="sp-header-actions">
            <button type="button" id="sp-rev-close-btn" class="sp-modal-close-btn" title="Close">×</button>
          </div>
        </div>

        <!-- COLORED TABS BAR -->
        <div class="sp-about-tab-bar-wrap">
          <div class="sp-about-nav-tabs">
            <button type="button" class="sp-about-tab-btn sp-btn-guide active" data-target="sp-tab-guide">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              Guide
            </button>
            <button type="button" class="sp-about-tab-btn sp-btn-changelog" data-target="sp-tab-changelog">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Changelog
            </button>
            <button type="button" class="sp-about-tab-btn sp-btn-android" data-target="sp-tab-android">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              Phone/Tablet Guide
            </button>
            <button type="button" class="sp-about-tab-btn sp-btn-faq" data-target="sp-tab-faq">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              FAQ
            </button>
            <button type="button" class="sp-about-tab-btn sp-btn-notice" data-target="sp-tab-notice" style="display: none !important;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
              Portal Notice
            </button>
            <button type="button" class="sp-about-tab-btn sp-btn-bug" data-target="sp-tab-bug">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 0 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v2"/><path d="M6 13H2"/><path d="M22 13h-4"/><path d="M20 7.13l-3.38 1.35"/><path d="m4 7.13 3.38 1.35"/><path d="m20 18.87-3.38-1.35"/><path d="m4 18.87 3.38-1.35"/></svg>
              Report Bug
            </button>
            <button type="button" class="sp-about-tab-btn sp-btn-links" data-target="sp-tab-links">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Important Links
            </button>

            <button type="button" class="sp-about-tab-btn sp-btn-review" data-target="sp-tab-review">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Review
            </button>
            <button type="button" class="sp-about-tab-btn sp-btn-contacts" data-target="sp-tab-contacts">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Contact Information
            </button>
            <!-- BIG GLOWING DOTTED BUTTON CONTAINER HOUSING THE HELPER & CGPA CALCULATOR -->
            <div class="sp-tools-grouped-wrap" id="sp-tools-grouped-wrap" style="display: inline-flex !important; align-items: center !important; gap: 4px !important; padding: 3px 4px !important; border-radius: 9px !important; background: linear-gradient(135deg, #e8ecf5 0%, #fdf6ed 100%) !important; border: 1.5px dotted #8b5cf6 !important; box-shadow: 0 0 8px rgba(139, 92, 246, 0.45), 0 0 2px rgba(139, 92, 246, 0.65) !important; margin-left: auto !important; flex: 0 0 auto !important;">
              <button type="button" class="sp-about-tab-btn sp-btn-thehelper" id="sp-tab-thehelper-btn" style="margin: 0 !important; border-radius: 6px !important; padding: 5px 9px !important; font-size: 11px !important; font-weight: 700 !important; background: #f7f4fd !important; color: #7b46da !important; border: 1px solid #ddd0f8 !important; position: relative !important;">
                <img src="${theHelperLogoUrl}" alt="THE HELPER" class="sp-thehelper-logo-img" />
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
              <button type="button" class="sp-about-tab-btn sp-btn-exclusive" id="sp-tab-exclusive-btn" style="margin: 0 !important; border-radius: 6px !important; padding: 5px 9px !important; font-size: 11px !important; font-weight: 700 !important; background: #fdf6ed !important; color: #5c4500 !important; border: 1px solid #e8d8c8 !important; position: relative !important;">
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
        </div>

        <!-- MODAL BODY -->
        <div class="sp-about-body">
          <!-- TAB 0: GUIDE (DEFAULT) -->
          <div class="sp-about-tab-pane active" id="sp-tab-guide" style="position: relative;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 22px 14px 18px;">
              <!-- DOTTED BOX UI IN MIDDLE -->
              <div class="rev-guide-dotted-box" style="width: 100%; max-width: 480px; padding: 22px 18px; background: #ffffff; border: 2px dashed #a855f7; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: 0 4px 16px rgba(168, 85, 247, 0.06); box-sizing: border-box;">
                <div style="font-family: 'Space Grotesk', -apple-system, sans-serif; font-size: 16.5px; font-weight: 800; letter-spacing: 0.02em; color: #132450; margin-bottom: 8px;">
                  Prime Guide
                </div>
                <!-- GRUNGE BRUSH SCRATCH SPOILER -->
                <div class="rev-scratch-spoiler" style="position: relative; display: inline-flex; align-items: center; justify-content: center; padding: 4px 10px; cursor: pointer; user-select: none;" title="">
                  <svg class="rev-grunge-brush" viewBox="0 0 320 48" preserveAspectRatio="none" style="position: absolute; inset: -4px -8px; width: calc(100% + 16px); height: calc(100% + 8px); pointer-events: none; z-index: 2; opacity: 0.4; transition: opacity 0.2s ease;">
                    <defs>
                      <filter id="sp-brush-distress" x="-10%" y="-30%" width="120%" height="160%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.04 0.95" numOctaves="4" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                      </filter>
                    </defs>
                    <!-- Main rough brush stroke body -->
                    <path d="M 8 11 Q 160 6 312 9 Q 318 24 310 38 Q 160 42 10 37 Q 3 24 8 11 Z" fill="#1e293b" filter="url(#sp-brush-distress)" />
                    <!-- Distressed top & bottom ink spatter lines -->
                    <line x1="12" y1="8" x2="308" y2="8" stroke="#1e293b" stroke-width="2.5" stroke-dasharray="10 6 25 8 4 12 35 6" filter="url(#sp-brush-distress)" />
                    <line x1="16" y1="39" x2="304" y2="39" stroke="#1e293b" stroke-width="2.5" stroke-dasharray="14 8 18 5 30 10 8 14" filter="url(#sp-brush-distress)" />
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
              <a href="${CHROME_STORE_URL}" target="_blank" rel="noopener noreferrer" style="width: 100%; max-width: 480px; padding: 11px 14px; background: #fffaf0; color: #5c4500; border: 2px dashed #F4C542; border-radius: 14px; font-size: 11.5px; font-weight: 800; font-family: 'Space Grotesk', -apple-system, sans-serif; text-decoration: none; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.18s ease; box-sizing: border-box; box-shadow: 0 2px 10px rgba(234, 179, 8, 0.12);">
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
          <div class="sp-about-tab-pane" id="sp-tab-changelog">

            <!-- v1.4.5 (Current) -->
            <div class="sp-changelog-card current">
              <div class="sp-changelog-ver-head">
                <span class="sp-changelog-ver-tag current">v1.4.5</span>
                <span class="sp-live-badge"><span class="sp-live-dot"></span>LIVE</span>
                <span class="sp-changelog-ver-date">27 October 2026</span>
              </div>
              <div style="font-size: 11.5px; font-weight: 800; color: #1e1b4b; margin: 4px 0 6px 0; letter-spacing: 0.02em;">PLACEMENT PREPARATION & INSIGHT</div>
              <ul class="sp-changelog-list">
                <li>Added <b>1.8k+ Aptitude Questions along with Solutions</b> across Quantitative, Logical, Verbal, and Core CSE domains.</li>
                <li>Added <b>Year 2024, 2025, 2026, 2027 Placement Insights</b> with detailed recruitment matrices, CTC tiers, and company analytics.</li>
              </ul>
            </div>

            <!-- Older Versions (Collapsible: v1.4.0 down to v1.0.0) -->
            <div id="spOlderChangelogContainer" style="display: none;">
              <!-- v1.4.0 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.4.0</span>
                  <span class="sp-changelog-ver-date">18 October 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">OD/ML LEAVE TRACKER & CUSTOM PINNED SHORTCUTS</div>
                <ul class="sp-changelog-list">
                  <li>Added <b>OD/ML Marking</b> : Track your On-Duty (OD) and Medical Leave (ML) hours with recalculated attendance margins and export/import PNG and JSON formats.</li>
                  <li>Added <b>Custom Pinned Shortcuts in Side Panel</b>: Pin up to 4 custom portal sections directly to the side panel alongside default shortcuts.</li>
                </ul>
              </div>

              <!-- v1.3.6 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.3.6</span>
                  <span class="sp-changelog-ver-date">7 October 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">TIMETABLE SYNC FIX & COLLEGE CONTACTS</div>
                <ul class="sp-changelog-list">
                  <li>Fixed <b>Time table sync</b> across Academia Portal and Student Portal</li>
                  <li>Added <b>Important College Contact information</b></li>
                </ul>
              </div>
              <!-- v1.3.5 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.3.5</span>
                  <span class="sp-changelog-ver-date">1 October 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">PRIME TIMETABLE & NEW LOGIN PAGE</div>
                <ul class="sp-changelog-list">
                  <li>Redesigned <b>Student Portal Login Page</b></li>
                  <li>Added <b>Prime Timetable in Student Portal</b> with interactive slot customizer, 10x ultra-HD export, and cross-portal sync with Academia.</li>
                  <li>Added <b>Toggle on/off Button</b> just in case CAPTCHA is not working or showing error.</li>
                  <li>Added dynamic <b>Reset All</b> and <b>Hide Custom</b> controls with instant in-place schedule restoration.</li>
                </ul>
              </div>
              <!-- v1.3.0 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.3.0</span>
                  <span class="sp-changelog-ver-date">25 September 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">MARKS LOST, TARGET MARKS, GRAPHS & CGPA CALCULATOR</div>
                <ul class="sp-changelog-list">
                  <li>Added <b>Marks Lost Count, Target Marks Calculator and Grade Estimation List</b></li>
                  <li>Added <b>Overall & Semester CGPA Calculator</b></li>
                  <li>Added <b>Performance Graphs</b> inside Marks Page to visualize individual subject score changes.</li>
                  <li>Added <b>External CGPA Calculator, just incase if Student Portal is Down. [Check Extension Popup UI]</b></li>
                </ul>
              </div>
              <!-- v1.2.7 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.2.7</span>
                  <span class="sp-changelog-ver-date">23 September 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">65% OD-ML MARGIN & ATTENDANCE CALCULATOR</div>
                <ul class="sp-changelog-list">
                  <li>Added <b>65% OD/ML Margin Target</b> inside Margin Section.</li>
                  <li>Added <b>Interactive Manual Attendance Calculator</b> inside Student Portal for manual attendence calculation.</li>
                  <li><b>Inside Scribe Request:</b> View Hidden End Semester Exam Timetable.</li>
                </ul>
              </div>
              <!-- v1.2.6 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.2.6</span>
                  <span class="sp-changelog-ver-date">26 August 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">OFFLINE CAPTCHA SOLVER & ATTENDANCE THEME</div>
                <ul class="sp-changelog-list">
                  <li>Added <b>100% Offline CAPTCHA Solver</b> for Student Portal powered by local WASM/ONNX runtime.</li>
                  <li>Automatic recognition for mixed uppercase/lowercase letters & digits with single inline Auto Solve button.</li>
                  <li>Updated <b>Student Portal Attendance Max. Hours</b> box to a sleek <b>Light Blue</b> theme for better visual contrast.</li>
                </ul>
              </div>

              <!-- v1.2.5 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.2.5</span>
                  <span class="sp-changelog-ver-date">24 August 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">STUDENT PORTAL ADDED</div>
                <ul class="sp-changelog-list">
                  <li>Modified <b>Student Portal Side Panel</b> for better use.</li>
                  <li>Added <b>Search Filter</b> to quickly search side panel menu items with auto dropdown expansion.</li>
                  <li>Added <b>Top Pinned Shortcuts</b> for <b>Attendance</b> and <b>Internal Mark Details</b>.</li>
                  <li>Added <b>About Prime Tab</b> for quick access to changelogs, guides, bug reporting, and store reviews.</li>
                </ul>
              </div>

              <!-- v1.2.0 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.2.0</span>
                  <span class="sp-changelog-ver-date">14 August 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">INTERACTIVE TIMETABLE & 10X EXPORT</div>
                <ul class="sp-changelog-list">
                  <li>Integrated modern, color-coded <b>Prime Timetable</b> directly into the SRM Academic portal.</li>
                  <li>Added <b>Interactive Slot Customizer</b> to edit course titles, rooms, and colors with a live hex picker & presets.</li>
                  <li>Added <b>Optional & Struck-Through Classes</b> with quick strikeout visual toggles.</li>
                  <li>Added <b>Hide / Restore Customizations</b> button to toggle between edits and original schedule.</li>
                </ul>
              </div>

              <!-- v1.1.5 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.1.5</span>
                  <span class="sp-changelog-ver-date">25 July 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">ABOUT PRIME & GPA SYNC</div>
                <ul class="sp-changelog-list">
                  <li>Fixed <b>GPA Timetable Sync</b> to extract exact active enrolled subjects from <i>My Time Table</i> page.</li>
                  <li>Added dynamic <b>Subject Numbering (#)</b> to GPA Calculator with live row numbering.</li>
                  <li>Added <b>Session & Logout Data Purging</b> for clean logins.</li>
                  <li>Added <b>Prime Information Tab</b> with Changelogs, Phone Guide, Bug Report and FAQ.</li>
                </ul>
              </div>

              <!-- v1.1.0 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.1.0</span>
                  <span class="sp-changelog-ver-date">3 March 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">SEMESTER GPA PREDICTOR</div>
                <ul class="sp-changelog-list">
                  <li>Added <b>Semester-wise CGPA Calculator</b> dashboard for live GPA prediction.</li>
                  <li>Added <b>Dynamic Timetable Sync</b> to automatically fetch course credits regardless of academic year.</li>
                  <li>Added <b>Marks Lost</b> and <b>Target Marks</b> calculation for exam score planning.</li>
                </ul>
              </div>

              <!-- v1.0.3 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.0.3</span>
                  <span class="sp-changelog-ver-date">24 February 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">MARKS & GRADE PREDICTIONS</div>
                <ul class="sp-changelog-list">
                  <li>Added <b>Marks Lost</b> tracking with dynamic grading prediction.</li>
                  <li>Added color-coded grade tags in the marks section.</li>
                  <li>Added styled <b>Grade Details</b> reference table showing threshold ranges.</li>
                </ul>
              </div>

              <!-- v1.0.2 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.0.2</span>
                  <span class="sp-changelog-ver-date">15 January 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">COURSE UI MATCHING</div>
                <ul class="sp-changelog-list">
                  <li>Fixed Course Type UI styling to match portal table aesthetics.</li>
                </ul>
              </div>

              <!-- v1.0.1 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.0.1</span>
                  <span class="sp-changelog-ver-date">10 January 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">ICON RESOLUTION SCALING</div>
                <ul class="sp-changelog-list">
                  <li>Fixed extension icon dimensions and resolution scaling.</li>
                </ul>
              </div>

              <!-- v1.0.0 -->
              <div class="sp-changelog-card old">
                <div class="sp-changelog-ver-head">
                  <span class="sp-changelog-ver-tag old">v1.0.0</span>
                  <span class="sp-changelog-ver-date">1 January 2026</span>
                </div>
                <div style="font-size: 11px; font-weight: 800; color: #475569; margin: 3px 0 5px 0;">INITIAL RELEASE</div>
                <ul class="sp-changelog-list">
                  <li>Initial release with automated course feedback filler and attendance margin visualizer.</li>
                </ul>
              </div>
            </div>

            <!-- Extend / Expand Button -->
            <div style="text-align: center; margin-top: 10px;">
              <button type="button" id="spChangelogToggleBtn" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 14px; font-size: 11.5px; font-weight: 700; color: #0d1938; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
                <span id="spChangelogToggleTxt">Show Older Versions (v1.4.0 – v1.0.0)</span>
                <svg id="spChangelogToggleIcon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- TAB 2: PHONE / TABLET GUIDE -->
          <div class="sp-about-tab-pane" id="sp-tab-android">
            <div style="font-size: 13px; font-weight: 800; color: #4c1d95; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              Phone/Tablet Installation Guide
            </div>
            <div class="sp-step-item">
              <div class="sp-step-num">1</div>
              <div class="sp-step-text">Install any Chromium-based browser supporting extensions (Recommended: <b>Quetta Browser</b>).</div>
            </div>
            <div class="sp-step-item">
              <div class="sp-step-num">2</div>
              <div class="sp-step-text">Open <b>Quetta Browser</b> on your phone or tablet.</div>
            </div>
            <div class="sp-step-item">
              <div class="sp-step-num">3</div>
              <div class="sp-step-text">Install the <b>Academia Prime</b> extension from Chrome Web Store.</div>
            </div>
            <div class="sp-step-item">
              <div class="sp-step-num">4</div>
              <div class="sp-step-text">Log in to the SRM Academia or Student Portal to view attendance and timetable enhancements.</div>
            </div>
          </div>

          <!-- TAB 3: FAQ -->
          <div class="sp-about-tab-pane" id="sp-tab-faq">
            <div class="sp-faq-item">
              <div class="sp-faq-q">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                <span>Is it free?</span>
              </div>
              <div class="sp-faq-a"><b>YEPP Obviously!</b> Academia Prime is 100% Free Forever with zero paywalls, ads, or subscriptions.</div>
            </div>
            <div class="sp-faq-item">
              <div class="sp-faq-q">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Does it save passwords or credentials?</span>
              </div>
              <div class="sp-faq-a">
                <div><b>NOPE,</b> Academia Prime operates 100% locally within your active browser session.</div>
                <div style="margin-top: 8px; padding: 6px 10px; background: #e8ecf5; border: 1.5px dashed #6b83b4; border-radius: 8px; font-size: 11px; display: flex; width: fit-content; align-items: center; gap: 6px; color: #0d1938;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>Read our official <a href="${PRIVACY_POLICY_URL}" target="_blank" style="color: #132450; font-weight: 800; text-decoration: underline;">Privacy Policy</a>.</span>
                </div>
              </div>
            </div>
            <div class="sp-faq-item">
              <div class="sp-faq-q">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Total Users</span>
              </div>
              <div class="sp-faq-a">
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
            <div class="sp-faq-item">
              <div class="sp-faq-q">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#132450" stroke-width="2.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                <span>Managed By</span>
              </div>
              <div class="sp-faq-a">
                <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 2px;">
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
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="display: inline-flex; align-items: center; gap: 4px; color: #5865F2; font-weight: 700;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                      Discord:
                    </span>
                    <span style="font-weight: 800; color: #1e1b4b;">@im_batman_at_2am</span>
                    <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; color: #15803d; background: #dcfce7; border: 1px solid #86efac; padding: 2px 6px; border-radius: 4px;">
                      <span style="width: 5px; height: 5px; border-radius: 50%; background: #22c55e;"></span>
                      Just a text away
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 4: PORTAL NOTICE -->
          <div class="sp-about-tab-pane" id="sp-tab-notice">
            <div class="sp-notice-main-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c69a22" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
              <span>Attendance Availability & Prime Feature Status</span>
            </div>

            <!-- Section 1: Unavailable Cause -->
            <div class="sp-notice-cause-box">
              <div class="sp-notice-cause-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>Why is the Attendance Page Unavailable?</span>
              </div>
              <ul class="sp-notice-cause-list">
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
              <div class="sp-notice-grid" style="margin-bottom: 10px;">
                <!-- What Works -->
                <div class="sp-notice-col work">
                  <div class="sp-notice-col-title work">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                    <span>What Will Work:</span>
                  </div>
                  <ul class="sp-notice-col-list work">
                    <li><b>Prime Timetable:</b> Fully functional weekly schedule view.</li>
                    <li><b>Interactive Slot Customizer:</b> Custom edits, colors & optional strikes.</li>
                    <li><b>Feedback Automation:</b> Instant faculty feedback autofill.</li>
                  </ul>
                </div>

                <!-- What Won't Work -->
                <div class="sp-notice-col paused">
                  <div class="sp-notice-col-title paused">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    <span>What Won't Work (Temporarily Paused):</span>
                  </div>
                  <ul class="sp-notice-col-list paused">
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
              <div class="sp-notice-grid">
                <!-- What Works -->
                <div class="sp-notice-col work">
                  <div class="sp-notice-col-title work">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                    <span>What Will Work:</span>
                  </div>
                  <ul class="sp-notice-col-list work">
                    <li>1) <b>Every added feature</b> (Live Attendance Stats, Bunk / Margin Predictor, Modified Side Panel, etc.).</li>
                  </ul>
                </div>

                <!-- What Won't Work -->
                <div class="sp-notice-col paused">
                  <div class="sp-notice-col-title paused">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    <span>What Won't Work:</span>
                  </div>
                  <ul class="sp-notice-col-list paused">
                    <li><b>None:</b> All features are active and 100% operational.</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Section 3: Restoration & Bug Fixing -->
            <div class="sp-notice-restore-box">
              <div class="sp-notice-restore-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>When Attendance is Active Again:</span>
              </div>
              <div class="sp-notice-restore-text">
                All attendance tracking and margin features will automatically reactivate without needing any update. 
                <br><b>Found any bug after the page is active?</b> Submit a report via the <b>Report Bug</b> tab and it will be fixed <b>ASAP!</b>
              </div>
            </div>
          </div>

          <!-- TAB 5: IMPORTANT LINKS -->
          <div class="sp-about-tab-pane" id="sp-tab-links">
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
          <div class="sp-about-tab-pane" id="sp-tab-bug">
            <div class="sp-bug-header-row">
              <div class="sp-bug-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 0 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v2"/><path d="M6 13H2"/><path d="M22 13h-4"/><path d="M20 7.13l-3.38 1.35"/><path d="m4 7.13 3.38 1.35"/><path d="m20 18.87-3.38-1.35"/><path d="m4 18.87 3.38-1.35"/></svg>
                Report Bug & Feedback Form
              </div>
              <a href="${BUGS_FORM_URL}" target="_blank" rel="noopener noreferrer" class="sp-bug-open-link">
                Open in New Tab
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
            <div class="sp-gform-container">
              <iframe 
                src="${BUGS_EMBED_URL}" 
                width="100%" 
                height="480" 
                frameborder="0" 
                marginheight="0" 
                marginwidth="0" 
                class="sp-gform-iframe"
                title="Bug Report Form"
              >
                Loading Bug Report Form…
              </iframe>
            </div>
          </div>

          <!-- TAB 6: REVIEW -->
          <div class="sp-about-tab-pane" id="sp-tab-review">
            <div class="sp-review-container">
              <div class="sp-review-heading">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#c69a22" stroke="#c69a22" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Feeling Bored ??? ...... Drop a Review on Chrome Web Store for Freshers.
              </div>
              <div class="sp-review-body-text">
                Enjoying automated feedback, CGPA prediction, timetable & attendance margin tracking? 
                <br><b>Help new SRM students discover Academia Prime by sharing your review on the Chrome Web Store!</b>
              </div>
              <a href="${CHROME_STORE_URL}" target="_blank" class="sp-review-action-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#c69a22" stroke="#c69a22" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Drop a Review on Chrome Web Store
              </a>
            </div>
          </div>

          <!-- TAB 7: SRM CONTACT DIRECTORY -->
          <div class="sp-about-tab-pane" id="sp-tab-contacts">
            <div id="sp-contacts-directory-container">
              ${typeof window.SRM_CONTACT_DIRECTORY_MODULE !== 'undefined' ? window.SRM_CONTACT_DIRECTORY_MODULE.getContactDirectoryHTML() : ''}
            </div>
          </div>
        </div>

        <!-- MODAL FOOTER -->
        <div class="sp-about-modal-footer">
          <span class="sp-free-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            FREE FOREVER
          </span>
          <span class="sp-about-author-link">
            Managed by Aayush
          </span>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    // Tab switcher
    const tabBtns = modalOverlay.querySelectorAll(".sp-about-tab-btn");
    const tabPanes = modalOverlay.querySelectorAll(".sp-about-tab-pane");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (btn.id === "sp-tab-thehelper-btn") {
          e.preventDefault();
          e.stopPropagation();
          window.open("https://www.thehelpers.tech/", "_blank");
          return;
        }

        if (btn.id === "sp-tab-exclusive-btn" || btn.classList.contains("sp-btn-exclusive")) {
          e.preventDefault();
          e.stopPropagation();
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
          if (!b.closest(".sp-tools-grouped-wrap, .tt-tools-grouped-wrap, .rev-tools-grouped-wrap")) {
            b.classList.remove("active");
          }
        });
        tabPanes.forEach((p) => p.classList.remove("active"));

        btn.classList.add("active");
        const targetPane = modalOverlay.querySelector(`#${targetId}`);
        if (targetPane) {
          targetPane.classList.add("active");
          if (targetId === "sp-tab-contacts" && window.SRM_CONTACT_DIRECTORY_MODULE) {
            window.SRM_CONTACT_DIRECTORY_MODULE.initContactDirectory(targetPane);
          }
        }
      });
    });

    // Expand / Collapse Older Changelog
    const toggleBtn = modalOverlay.querySelector("#spChangelogToggleBtn");
    const olderContainer = modalOverlay.querySelector(
      "#spOlderChangelogContainer",
    );
    const toggleTxt = modalOverlay.querySelector("#spChangelogToggleTxt");
    const toggleIcon = modalOverlay.querySelector("#spChangelogToggleIcon");

    if (toggleBtn && olderContainer) {
      toggleBtn.addEventListener("click", () => {
        const isHidden = olderContainer.style.display === "none";
        if (isHidden) {
          olderContainer.style.display = "block";
          if (toggleTxt) toggleTxt.textContent = "Hide Older Versions";
          if (toggleIcon) toggleIcon.style.transform = "rotate(180deg)";
        } else {
          olderContainer.style.display = "none";
          if (toggleTxt)
            toggleTxt.textContent = "Show Older Versions (v1.4.0 – v1.0.0)";
          if (toggleIcon) toggleIcon.style.transform = "rotate(0deg)";
        }
      });
    }

    // Close handlers
    const closeBtn = modalOverlay.querySelector("#sp-rev-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeAboutModal);

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeAboutModal();
      }
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
        const dropdown = modalOverlay.querySelector(".rev-features-dropdown");
        const icon = featToggle.querySelector(".rev-features-toggle-icon");
        if (dropdown) {
          const isHidden =
            dropdown.style.display === "none" || dropdown.style.display === "";
          dropdown.style.display = isHidden ? "grid" : "none";
          if (icon)
            icon.style.transform = isHidden ? "rotate(180deg)" : "rotate(0deg)";
        }
        return;
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalOverlay.style.display !== "none") {
        const memeModal = modalOverlay.querySelector(".rev-guide-fun-modal");
        if (memeModal && memeModal.style.display !== "none") {
          memeModal.style.display = "none";
        } else {
          closeAboutModal();
        }
      }
    });
  }

  /**
   * Opens the About Modal.
   */
  function openAboutModal() {
    ensureAboutModal();
    const overlay = document.getElementById("sp-revanced-modal-overlay");
    if (!overlay) return;

    overlay.style.display = "flex";
    requestAnimationFrame(() => {
      overlay.classList.add("sp-rev-open");
    });
  }

  /**
   * Closes the About Modal.
   */
  function closeAboutModal() {
    const overlay = document.getElementById("sp-revanced-modal-overlay");
    if (!overlay) return;

    overlay.classList.remove("sp-rev-open");
    setTimeout(() => {
      overlay.style.display = "none";
    }, 200);
  }

  /**
   * Injects the sleek "About" trigger button with Prime graduation logo in the Pinned Shortcuts section header.
   */
  function injectPinnedAboutButton() {
    const pinnedSection = document.getElementById("sp-pinned-menu-section");
    if (!pinnedSection || pinnedSection.querySelector("#sp-about-pinned-btn"))
      return;

    const pinnedHeader = pinnedSection.querySelector(".sp-pinned-header");
    if (!pinnedHeader) return;

    const aboutBtn = document.createElement("button");
    aboutBtn.type = "button";
    aboutBtn.id = "sp-about-pinned-btn";
    aboutBtn.className = "sp-pinned-about-btn";
    aboutBtn.title = "About Academia Prime";
    aboutBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
      </svg>
      <span>About</span>
    `;

    aboutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAboutModal();
    });

    pinnedHeader.appendChild(aboutBtn);
  }

  /**
   * Main lifecycle handler.
   */
  function initAboutPrime() {
    let observer = null;
    let observerTimer = null;

    // Delegated click listener so clicking About anywhere reliably triggers the modal
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#sp-about-pinned-btn, .sp-pinned-about-btn");
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        openAboutModal();
      }
    });

    // Custom event listener from other scripts (e.g., sp_sidepanel.js)
    window.addEventListener("ar:open_about", () => {
      openAboutModal();
    });

    const run = () => {
      try {
        ensureAboutModal();
        injectPinnedAboutButton();
      } catch (err) {
        console.warn("[Student Portal] About Prime Error:", err);
      }
    };

    run();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    }
    window.addEventListener("load", run);

    let count = 0;
    const interval = setInterval(() => {
      run();
      count++;
      if (count >= 15) {
        clearInterval(interval);
      }
    }, 500);

    observer = new MutationObserver(() => {
      if (
        !document.getElementById("sp-revanced-modal-overlay") ||
        !document.getElementById("sp-about-pinned-btn")
      ) {
        if (observerTimer) clearTimeout(observerTimer);
        observerTimer = setTimeout(run, 200);
      }
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    }
  }

  initAboutPrime();
})();
