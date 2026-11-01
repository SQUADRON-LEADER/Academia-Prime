/**
 * ============================================================
 * FILE: background.js (Service Worker)
 * ============================================================
 * PURPOSE:
 *   Runs in the background as a Chrome extension service worker.
 *   Handles all message routing between popup ↔ content scripts.
 *
 * FEATURES:
 *   - Saves/loads user config (rating + comment) to chrome.storage
 *   - Relays "fillFeedback" command from popup → content script
 *   - Injects automator.js into the page's MAIN world for Select2 access
 *   - Tracks fill progress and completion state
 *
 * SETTINGS:
 *   - Default rating on install: 'Excellent' (line 6)
 *   - Default comment on install: 'Good' (line 6)
 *   - Injection retries: 3 attempts with backoff (line 93-100)
 *
 * TO MODIFY:
 *   - Change default config → edit chrome.storage.sync.set() in onInstalled
 *   - Add new message actions → add new `if (req.action === '...')` block
 * ============================================================
 */

// Set defaults on install
chrome.runtime.onInstalled.addListener((info) => {
  if (info.reason === 'install') {
    chrome.storage.sync.set({ rating: 'Excellent', commentText: 'Good' });
  }
});

// ============================================================
// CAPTCHA OCR Offscreen Manager
// ============================================================
let offscreenCloseTimer = null;
// Promise lock — prevents concurrent createDocument() races
let _offscreenCreating = null;

async function ensureOffscreenDocument() {
  if (offscreenCloseTimer) clearTimeout(offscreenCloseTimer);
  // Auto-close offscreen document after 5 minutes of idle time to conserve memory
  offscreenCloseTimer = setTimeout(async () => {
    try {
      if (await chrome.offscreen.hasDocument()) {
        await chrome.offscreen.closeDocument();
      }
    } catch { }
  }, 300000);

  // If a creation is already in progress, piggyback on that promise
  if (_offscreenCreating) {
    await _offscreenCreating;
    return;
  }

  if (await chrome.offscreen.hasDocument()) return;

  _offscreenCreating = chrome.offscreen.createDocument({
    url: 'captcha_solver/offscreen.html',
    reasons: [chrome.offscreen.Reason.WORKERS || 'WORKERS'],
    justification: 'Run local WASM ONNX OCR engine for CAPTCHA recognition'
  }).catch((err) => {
    // Chrome throws if the document was created between hasDocument() and createDocument()
    if (!err?.message?.includes('single offscreen document')) throw err;
  }).finally(() => {
    _offscreenCreating = null;
  });

  await _offscreenCreating;
}

async function handleCaptchaSolve(imageData) {
  if (typeof imageData !== 'string') {
    return { error: 'Invalid image data' };
  }
  await ensureOffscreenDocument();
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'OCR_REQUEST', imageData }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ error: chrome.runtime.lastError.message });
      } else if (response && response.type === 'OCR_RESPONSE') {
        resolve(response);
      } else {
        resolve({ error: 'No response from CAPTCHA engine' });
      }
    });
  });
}

// Handle all messages from popup and content scripts
chrome.runtime.onMessage.addListener((req, sender, reply) => {

  // Return saved config
  if (req.action === 'getConfig') {
    chrome.storage.sync.get(['rating', 'commentText'], (data) => {
      reply({
        rating: data.rating ?? 'Excellent',
        commentText: data.commentText ?? 'Good'
      });
    });
    return true;
  }

  // Save config
  if (req.action === 'saveConfig') {
    chrome.storage.sync.set(req.config || {}, () => reply({ success: true }));
    return true;
  }

  // Solve CAPTCHA via local offscreen OCR
  if (req.action === 'solveCaptcha' || req.type === 'OCR_REQUEST') {
    const data = req.imageData || req.dataUrl;
    handleCaptchaSolve(data).then(reply);
    return true;
  }

  // Capture visible tab screenshot for cross-origin CAPTCHA elements
  if (req.action === 'captureTab') {
    (async () => {
      try {
        const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
        const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
        reply(dataUrl ? { dataUrl } : { error: 'Empty tab screenshot' });
      } catch (err) {
        reply({ error: err.message });
      }
    })();
    return true;
  }

  // Fetch Academia Timetable raw data (runs in service worker with host_permissions)
  if (req.action === 'fetchAcademiaTimetable') {
    (async () => {
      try {
        const res = await fetch("https://academia.srmist.edu.in/srm_university/academia-academic-services/page/My_Time_Table_2023_24", {
          headers: { "X-Requested-With": "XMLHttpRequest" }
        });
        if (!res.ok) {
          reply({ success: false, error: 'Academia session status: ' + res.status });
          return;
        }
        const text = await res.text();
        reply({ success: true, html: text });
      } catch (err) {
        reply({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // Open extension tabs safely from content scripts
  if (req.action === 'openCalculator' || req.action === 'openTab') {
    const targetUrl = req.url || chrome.runtime.getURL('src/cgpa_calculator/calculator.html');
    chrome.tabs.create({ url: targetUrl }, (tab) => {
      reply({ success: true, tabId: tab?.id });
    });
    return true;
  }

  // Open extension popup from content scripts
  if (req.action === 'openPopup') {
    if (chrome.action && typeof chrome.action.openPopup === 'function') {
      try {
        chrome.action.openPopup({}, () => {
          if (chrome.runtime.lastError) {
            // Silently ignore if already opening/open — do NOT open external window
            console.log('[Academia Prime] openPopup:', chrome.runtime.lastError.message);
          }
          reply({ success: true });
        });
      } catch (err) {
        reply({ success: false });
      }
    } else {
      reply({ success: false, error: 'action.openPopup not supported' });
    }
    return true;
  }

  // Live Search SRM Staff Finder directly from website API (No new tab needed)
  if (req.action === 'searchSrmStaffLive') {
    (async () => {
      try {
        const query = req.query || '';
        const pageRes = await fetch('https://www.srmist.edu.in/staff-finder/', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const pageHtml = await pageRes.text();
        const nonceMatch = pageHtml.match(/var ajax_display\s*=\s*\{"ajax_url":"([^"]+)","nonce":"([^"]+)"\}/);
        if (!nonceMatch) {
          reply({ success: false, error: 'Could not connect to SRM staff finder search session' });
          return;
        }
        const ajaxUrl = nonceMatch[1].replace(/\\\//g, '/');
        const nonce = nonceMatch[2];

        const formData = new URLSearchParams({
          campus: '',
          college: '',
          department: '',
          faculty: query,
          facultyType: '',
          designation: ''
        }).toString();

        const postBody = new URLSearchParams({
          action: 'list_faculties_default',
          page: '1',
          security: nonce,
          formData: formData
        });

        const searchRes = await fetch(ajaxUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://www.srmist.edu.in/staff-finder/'
          },
          body: postBody
        });

        const resHtml = await searchRes.text();
        reply({ success: true, html: resHtml });
      } catch (err) {
        reply({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // Start feedback filling — relay to content script
  if (req.action === 'fillFeedback') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabList) => {
      const tab = tabList?.[0];
      if (!tab) {
        reply({ success: false, error: 'No active tab' });
        return;
      }
      chrome.tabs.sendMessage(tab.id, {
        action: 'startFilling',
        config: req.config
      }, (res) => reply(res));
    });
    return true;
  }

  // Progress update from content script
  if (req.action === 'fillProgressUpdate') {
    chrome.storage.local.set({
      isCurrentlyFilling: true,
      fillingTime: Date.now(),
      ...(req.percent !== undefined && { fillingProgress: req.percent }),
      ...(req.message !== undefined && { fillingMessage: req.message }),
      ...(req.token !== undefined && { activeFillToken: req.token })
    });
    return false;
  }

  // Fill complete
  if (req.action === 'fillComplete') {
    chrome.storage.local.set({
      isCurrentlyFilling: false,
      lastFillState: req.result,
      lastFillTime: Date.now(),
      activeFillToken: null
    });
    return false;
  }

  // Execute method in page's MAIN world via injected automator
  if (req.action === 'executeInPage') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabList) => {
      const tab = tabList?.[0];
      if (!tab) {
        reply({ success: false, error: 'No active tab' });
        return;
      }

      const tabId = tab.id;

      try {
        // Check if automator already exists
        let isReady = false;
        if (!req.forceReloadHelper) {
          try {
            const probe = await chrome.scripting.executeScript({
              target: { tabId },
              world: 'MAIN',
              func: (method) => {
                const obj = window.srmAutomator;
                if (!obj) return false;
                return method ? typeof obj[method] === 'function' : true;
              },
              args: [req.method]
            });
            isReady = !!probe?.[0]?.result;
          } catch { }
        }

        // Inject helper scripts if not ready
        if (!isReady) {
          let injected = false;
          for (let i = 0; i < 3; i++) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId },
                world: 'MAIN',
                files: ['src/injected/automator.js']
              });
              injected = true;
              break;
            } catch (err) {
              await new Promise(r => setTimeout(r, 200 * (i + 1)));
            }
          }
          if (!injected) {
            reply({ success: false, error: 'Injection failed' });
            return;
          }
        }

        // Verify integrity
        const check = await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: () => {
            const obj = window.srmAutomator;
            if (!obj || typeof obj.verifyIntegrity !== 'function') return { valid: false };
            return obj.verifyIntegrity();
          }
        });

        if (!check?.[0]?.result?.valid) {
          reply({ success: false, error: 'Integrity check failed' });
          return;
        }

        // Execute the requested method
        const result = await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: (method, args) => {
            if (window.srmAutomator?.[method]) {
              return window.srmAutomator[method](...args);
            }
            throw new Error('Method not found');
          },
          args: [req.method, req.args || []]
        });

        reply({ success: true, result: result?.[0]?.result });

      } catch (err) {
        reply({ success: false, error: err.message });
      }
    });
    return true;
  }
});