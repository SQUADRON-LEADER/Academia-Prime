/**
 * ============================================================
 * FILE: main.js (Content Script — runs on academia.srmist.edu.in)
 * ============================================================
 * PURPOSE:
 *   Injected into every SRM Academia page. Handles the feedback
 *   auto-fill orchestration from within the page context.
 *
 * FEATURES:
 *   - Listens for 'startFilling' message from popup/background
 *   - Injects automator.js into page's MAIN world for jQuery/Select2 access
 *   - Fills dropdowns (via injected automator, with fallback to direct jQuery)
 *   - Fills comment textareas (via injected automator, with fallback)
 *   - Shows a blocking overlay while filling to prevent user clicks
 *   - Emits progress events back to popup for progress bar updates
 *   - Supports termination (user can click STOP mid-fill)
 *
 * SETTINGS:
 *   - RATINGS object: maps rating labels to values ('Excellent' → '5', etc.)
 *   - Dependency wait timeout: 5000ms (in fillFeedback function)
 *   - Overlay auto-remove timeout: 120 seconds
 *
 * TO MODIFY:
 *   - Change rating options → edit RATINGS object
 *   - Change fill behavior → edit fillFeedback() function
 *   - Add new message handlers → add to chrome.runtime.onMessage listener
 *
 * IMPORTANT:
 *   - This runs in the ISOLATED content script world (no direct jQuery access)
 *   - The automator.js runs in MAIN world (has jQuery/Select2 access)
 *   - Communication between them goes through background.js executeInPage
 * ============================================================
 */
(function () {
    'use strict';
    if (window._srmContentLoaded) return;
    window._srmContentLoaded = true;

    // === State ===
    const state = window.srmState = { currentFillToken: null, terminationRequested: false };
    const RATINGS = { 'Excellent': '5', 'Very Good': '4', 'Good': '3', 'Average': '2', 'Poor': '1' };
    const HELPER_FLAG = '__srmAutomatorPreloaded__';

    const checkTermination = (ctx) => {
        if (!state.terminationRequested) return;
        throw new Error('TERMINATION_REQUESTED');
    };

    const safeSend = msg => { try { chrome.runtime.sendMessage(msg, () => chrome.runtime.lastError); } catch { } };
    const getJQ = () => window.jQuery || window.$?.fn ? (window.$ || window.jQuery) : null;

    // === Helper injection ===
    let helperReady = false, helperPromise = null;

    const ensureHelper = () => {
        if (helperReady || window[HELPER_FLAG]) { helperReady = true; return Promise.resolve(true); }
        if (helperPromise) return helperPromise;
        helperPromise = new Promise(async resolve => {
            try {
                const root = document.documentElement || document.head || document.body;
                if (!root) return resolve(false);
                const inject = p => new Promise((res, rej) => {
                    const s = document.createElement('script');
                    s.src = chrome.runtime.getURL(p); s.async = false;
                    s.dataset.srmAutomator = 'helper-preload';
                    s.onload = () => { s.remove(); res(); };
                    s.onerror = () => { s.remove(); rej(); };
                    root.appendChild(s);
                });
                await Promise.all([inject('src/injected/automator.js')]);
                helperReady = true; window[HELPER_FLAG] = true;
                resolve(true);
            } catch { resolve(false); }
            finally { helperPromise = null; }
        });
        return helperPromise;
    };

    // === Progress ===
    const RANGE = { dropdowns: { start: 20, end: 80 }, comments: { start: 80, end: 95 } };

    const calcProgress = (type, d = {}) => {
        const r = RANGE[type], total = +d.total || 0, filled = +d.filled || 0, failed = +d.failed || 0;
        const processed = total ? Math.min(+d.processed || (filled + failed), total) : (filled + failed);
        const remaining = Math.max(total - processed, 0);
        const percent = total ? Math.round(r.start + (r.end - r.start) * (processed / total)) : (d.completed ? r.end : r.start);
        const msg = type === 'dropdowns'
            ? (total ? `Filling dropdowns... ${filled}/${total} done (${remaining} left)` : 'Filling dropdowns...')
            : (d.message || (total ? `Writing comments... ${filled}/${total} done` : 'Writing comments...'));
        return { percent, message: msg, total, filled, failed, processed, remaining, completed: !!d.completed, cancelled: !!d.cancelled, token: d.token };
    };

    window.addEventListener('srmAutomatorProgress', e => {
        const d = e?.detail;
        if (!d || d.token !== state.currentFillToken) return;
        if (d.type !== 'dropdowns' && d.type !== 'comments') return;
        const payload = calcProgress(d.type, d);
        safeSend({ action: 'fillProgressUpdate', stage: d.type, ...payload });
    });

    // === Overlay ===
    const createOverlay = () => {
        if (document.getElementById('srm-overlay')) return;
        const el = document.createElement('div');
        el.id = 'srm-overlay';
        el.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,.05);z-index:2147483647;cursor:wait;pointer-events:all';
        document.body.appendChild(el);
        setTimeout(removeOverlay, 120000);
    };
    const removeOverlay = () => { try { document.getElementById('srm-overlay')?.remove(); } catch { } };

    // === Execute on page ===
    const execInPage = async (method, args = []) => {
        await ensureHelper();
        const res = await chrome.runtime.sendMessage({ action: 'executeInPage', method, args });
        if (res?.success) return res.result;
        throw new Error(res?.error || 'execution failed');
    };

    // === Fallback fills (content-world) ===
    const fallbackDropdowns = rating => {
        const $ = getJQ(); if (!$) throw new Error('no jquery');
        const containers = $('.select2-container').filter(function () {
            const t = $(this).find('.select2-chosen').text().trim();
            return t === '-Select-' || RATINGS[t];
        });
        const selects = containers.map(function () { return $(this).prev('select')[0]; }).get();
        let ok = 0, fail = 0;
        for (const el of selects) {
            try { $(el).val(RATINGS[rating]).trigger('change'); ok++; } catch { fail++; }
        }
        return { success: ok, failed: fail, total: selects.length };
    };

    const fallbackComments = text => {
        const $ = getJQ(); if (!$) throw new Error('no jquery');
        const areas = $('textarea'); let ok = 0, fail = 0;
        for (let i = 0; i < areas.length; i++) {
            try { $(areas[i]).val(text).trigger('input').trigger('change'); ok++; } catch { fail++; }
        }
        return { success: ok, failed: fail, total: areas.length };
    };

    // === Main fill ===
    const fillFeedback = async config => {
        const token = `fill-${Date.now()}`;
        state.currentFillToken = token;
        state.terminationRequested = false;

        const h = (location.hash || '').toLowerCase();
        const href = (location.href || '').toLowerCase();
        const isFeedback = h.includes('course_feedback') || href.includes('#course_feedback');
        if (!isFeedback)
            return { success: false, message: 'Not on feedback page. Go to SRM Academia Course Feedback page.', cancelled: true };

        let identity = { name: null, regNo: null };
        try { identity = await execInPage('getIdentity'); } catch { }

        try {
            createOverlay();
            // Wait for jQuery/Select2
            const start = Date.now();
            while (Date.now() - start < 5000) {
                checkTermination();
                try { const r = await execInPage('checkDependencies'); if (r?.jQuery && r?.select2) break; } catch { }
                await new Promise(r => setTimeout(r, 120));
            }

            let dropResult;
            try { dropResult = await execInPage('fillDropdowns', [config.rating, token]); }
            catch { dropResult = fallbackDropdowns(config.rating); }

            if (state.terminationRequested) return { cancelled: true };
            await new Promise(r => setTimeout(r, 500));

            let commentResult;
            try { commentResult = await execInPage('fillComments', [config.commentText, token]); }
            catch { commentResult = fallbackComments(config.commentText); }

            const totalFail = (dropResult.failed || 0) + (commentResult.failed || 0);
            return {
                success: totalFail === 0, studentName: identity?.name, regNo: identity?.regNo,
                message: totalFail === 0 ? 'Form filled successfully' : 'Partial fill completed'
            };
        } catch (e) { return { success: false, message: e.message }; }
        finally { removeOverlay(); state.currentFillToken = null; state.terminationRequested = false; }
    };

    // === Auto Fill Feedback Top-Right Button ===
    function ensureFeedbackButtonStyles() {
        if (document.getElementById('ar-feedback-btn-styles')) return;
        const style = document.createElement('style');
        style.id = 'ar-feedback-btn-styles';
        style.textContent = `
            #ar-autofill-feedback-top-btn {
                position: fixed !important;
                top: 68px !important;
                right: 22px !important;
                z-index: 2147483647 !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 7px !important;
                padding: 6px 14px !important;
                border-radius: 8px !important;
                background: #ffffff !important;
                color: #0f172a !important;
                border: 1.5px dotted #253b70 !important;
                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                font-size: 12px !important;
                font-weight: 800 !important;
                line-height: 1.2 !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 0 6px rgba(99, 102, 241, 0.25) !important;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
                user-select: none !important;
                text-decoration: none !important;
                box-sizing: border-box !important;
            }
            #ar-autofill-feedback-top-btn:hover {
                transform: translateY(-1.5px) scale(1.02) !important;
                border-color: #132450 !important;
                background: #f8fafc !important;
                color: #000000 !important;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12), 0 0 10px rgba(99, 102, 241, 0.45) !important;
            }
            #ar-autofill-feedback-top-btn:active {
                transform: translateY(0) scale(0.98) !important;
            }
            #ar-autofill-feedback-top-btn .ar-btn-logo {
                width: 16px !important;
                height: 16px !important;
                border-radius: 3px !important;
                object-fit: contain !important;
                flex-shrink: 0 !important;
            }
            #ar-autofill-feedback-top-btn .ar-btn-icon {
                color: #253b70 !important;
                opacity: 0.9 !important;
                transition: transform 0.15s ease !important;
            }
            #ar-autofill-feedback-top-btn:hover .ar-btn-icon {
                opacity: 1 !important;
                transform: translateX(2px) !important;
            }
        `;
        document.head.appendChild(style);
    }

    function isFeedbackPage() {
        let h = '';
        let href = '';
        try {
            h = (window.location.hash || '').toLowerCase();
            href = (window.location.href || '').toLowerCase();
            if (window.top && window.top.location) {
                h = (window.top.location.hash || h).toLowerCase();
                href = (window.top.location.href || href).toLowerCase();
            }
        } catch (e) {
            h = (window.location.hash || '').toLowerCase();
            href = (window.location.href || '').toLowerCase();
        }
        return h.includes('course_feedback') || href.includes('course_feedback');
    }

    function updateFeedbackButton() {
        // Only inject floating button in top-level window to avoid duplicate buttons inside iframes
        if (window.self !== window.top) return;

        const isFeedback = isFeedbackPage();
        let btn = document.getElementById('ar-autofill-feedback-top-btn');

        if (isFeedback) {
            ensureFeedbackButtonStyles();
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'ar-autofill-feedback-top-btn';
                btn.type = 'button';
                btn.title = 'Open Academia Prime Feedback Auto-Filler';
                const logoUrl = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
                    ? chrome.runtime.getURL('icons/academia-prime-logo.png')
                    : '';
                btn.innerHTML = `
                    <img src="${logoUrl}" class="ar-btn-logo" alt="Prime Logo" />
                    <span>Auto Fill Feedback</span>
                    <svg class="ar-btn-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                `;

                let isClickThrottled = false;
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isClickThrottled) return;
                    isClickThrottled = true;
                    setTimeout(() => { isClickThrottled = false; }, 800);
                    try {
                        chrome.runtime.sendMessage({ action: 'openPopup' });
                    } catch (err) { }
                });

                btn.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });

                const targetContainer = document.body || document.documentElement;
                if (targetContainer) targetContainer.appendChild(btn);
            } else {
                btn.style.setProperty('display', 'inline-flex', 'important');
            }
        } else {
            if (btn) btn.remove();
        }
    }

    // Initialize button on load, listen for SPA navigation, and observe DOM mutations
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateFeedbackButton);
    } else {
        updateFeedbackButton();
    }
    window.addEventListener('hashchange', updateFeedbackButton);
    window.addEventListener('popstate', updateFeedbackButton);
    setInterval(updateFeedbackButton, 400);

    // Watch for dynamic DOM changes (e.g. AJAX tab/page loading inside Academia)
    try {
        const observer = new MutationObserver(() => updateFeedbackButton());
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) { }

    // === Message listener ===
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
        if (req.action === 'ping') { sendResponse({ pong: true }); return true; }
        if (req.action === 'startFilling') { fillFeedback(req.config).then(sendResponse); return true; }
        if (req.action === 'terminateFilling') { state.terminationRequested = true; sendResponse({ success: true }); return true; }
        if (req.action === 'checkPage') {
            const isFeedback = isFeedbackPage();
            sendResponse({ isFeedback, url: location.href });
            return true;
        }
        if (req.action === 'openFaq') {
            window.postMessage({ type: 'PRIME_OPEN_TAB', targetTab: 'tab-faq' }, '*');
            sendResponse({ success: true });
            return true;
        }
        if (req.action === 'openBugs') {
            window.postMessage({ type: 'PRIME_OPEN_TAB', targetTab: 'tab-bug' }, '*');
            sendResponse({ success: true });
            return true;
        }
    });
})();