/**
 * ============================================================
 * FILE: popup.js (Extension Popup UI Logic)
 * ============================================================
 * PURPOSE:
 *   Controls the extension popup that appears when clicking the
 *   extension icon. Lets users pick a rating, type a comment,
 *   and click AUTOFILL to fill the feedback form.
 *
 * FEATURES:
 *   - Rating dropdown + comment textarea with auto-save to chrome.storage
 *   - AUTOFILL button that sends fill command to content script
 *   - STOP button to terminate a fill in progress
 *   - Progress bar with live updates from content script
 *   - Page detection: disables button if not on feedback page
 *   - Credit text scramble animation on hover
 *
 * SETTINGS:
 *   - VALID_RATINGS: List of allowed rating values
 *   - DEFAULT_RATING: 'Excellent' (used when no saved config)
 *   - DEFAULT_COMMENT: 'Good' (used when no saved config)
 *   - Comment max length: 120 characters
 *
 * TO MODIFY:
 *   - Change available ratings → edit VALID_RATINGS array + popup.html <select>
 *   - Change default values → edit DEFAULT_RATING / DEFAULT_COMMENT
 *   - Change popup appearance → edit popup.css
 *   - Change credit text → edit the 'original' and 'target' strings at bottom
 * ============================================================
 */

const elements = {
  rating: document.getElementById("rating"),
  commentText: document.getElementById("commentText"),
  fillBtn: document.getElementById("fillBtn"),
  terminateBtn: document.getElementById("terminateBtn"),
  statusMessage: document.getElementById("statusMessage"),
  progressContainer: document.getElementById("progressContainer"),
  progressFill: document.getElementById("progressFill"),
  progressText: document.getElementById("progressText"),
};

const VALID_RATINGS = ["Excellent", "Very Good", "Good", "Average", "Poor"];
const DEFAULT_RATING = "Excellent";
const DEFAULT_COMMENT = "Good";

let isCurrentlyFilling = false;
let shouldTerminate = false;
let activeFillToken = null;
let debounceTimer = null;
let pageStatus = { isAcademia: false, isFeedback: false };

// --- Config ---

function validateRating(r) {
  return typeof r === "string" && VALID_RATINGS.includes(r)
    ? r
    : DEFAULT_RATING;
}

// This makes sure the comment text isn't too long (max 120 characters)
function validateComment(c) {
  return typeof c === "string" ? c.trim().slice(0, 120) : DEFAULT_COMMENT;
}

async function loadConfig() {
  try {
    const stored = await chrome.storage.sync.get(["rating", "commentText"]);
    elements.rating.value = validateRating(stored.rating);
    elements.commentText.value =
      stored.commentText !== undefined
        ? validateComment(stored.commentText)
        : DEFAULT_COMMENT;
  } catch (e) {
    console.error("[Popup] loadConfig failed:", e);
  }
}

async function saveConfig() {
  try {
    await chrome.storage.sync.set({
      rating: validateRating(elements.rating.value),
      commentText: validateComment(elements.commentText.value),
    });
  } catch (e) {
    console.error("[Popup] saveConfig failed:", e);
  }
}

function getCurrentConfig() {
  return {
    rating: validateRating(elements.rating.value),
    commentText: validateComment(elements.commentText.value),
  };
}

// --- UI Helpers ---

function updateProgress(percent, message = "") {
  elements.progressContainer.style.display = "flex";
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = message || `${percent}%`;
}

function hideProgress() {
  elements.progressContainer.style.display = "none";
  elements.progressFill.style.width = "0%";
}

function showStatus(type, message, details = null, linkObj = null) {
  elements.statusMessage.className = `status-message ${type}`;
  elements.statusMessage.textContent = "";

  const title = document.createElement("strong");
  title.textContent = message;
  elements.statusMessage.appendChild(title);

  if (details) {
    const meta = document.createElement("div");
    meta.className = "details";
    meta.textContent = details;
    elements.statusMessage.appendChild(meta);
  }

  if (linkObj && linkObj.url) {
    const actionBtn = document.createElement("a");
    actionBtn.className = "status-action-link";
    actionBtn.href = linkObj.url;
    actionBtn.textContent = linkObj.text || "Open Link ↗";
    actionBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab && tab.id) {
          await chrome.tabs.update(tab.id, { url: linkObj.url });
        } else {
          await chrome.tabs.create({ url: linkObj.url });
        }
      } catch {
        window.open(linkObj.url, "_blank");
      }
      window.close();
    });
    elements.statusMessage.appendChild(actionBtn);
  }

  elements.statusMessage.style.display = "block";
}

function hideStatus() {
  elements.statusMessage.style.display = "none";
}

function setFilling(isFilling) {
  isCurrentlyFilling = isFilling;
  elements.fillBtn.disabled = isFilling;
  elements.fillBtn.style.display = isFilling ? "none" : "block";
  elements.terminateBtn.style.display = isFilling ? "block" : "none";
  elements.rating.disabled = isFilling;
  elements.commentText.disabled = isFilling;
}

// --- Tab Helper ---

async function getTargetTab() {
  try {
    const [focusedTab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (focusedTab && !focusedTab.url?.startsWith("chrome-extension://")) {
      return focusedTab;
    }
  } catch {}
  try {
    const [curTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (curTab && !curTab.url?.startsWith("chrome-extension://")) {
      return curTab;
    }
  } catch {}
  try {
    const tabs = await chrome.tabs.query({
      url: "*://academia.srmist.edu.in/*",
    });
    if (tabs && tabs.length > 0) {
      return tabs[0];
    }
  } catch {}
  try {
    const [tab] = await chrome.tabs.query({ active: true });
    return tab;
  } catch {}
  return null;
}

// --- Page Check ---

// Checks if the user is on Academia, Student Portal, or other sites
function deriveStatusFromUrl(url) {
  const lower = (url || "").toLowerCase();
  const isAcademia = lower.includes("academia.srmist.edu.in");
  const isStudentPortal = lower.includes("sp.srmist.edu.in");
  const hashIdx = lower.indexOf("#");
  const hash = hashIdx !== -1 ? lower.slice(hashIdx) : "";
  const isFeedback = isAcademia && (hash.includes("course_feedback") || lower.includes("course_feedback") || lower.includes("feedback"));

  return { isAcademia, isStudentPortal, isFeedback, url };
}

async function checkCurrentPage() {
  try {
    const tab = await getTargetTab();
    if (!tab) {
      pageStatus = {
        isAcademia: false,
        isStudentPortal: false,
        isFeedback: false,
      };
      updateAvailability();
      return;
    }

    pageStatus = deriveStatusFromUrl(tab.url);

    // Try getting more accurate info from content script if on Academia
    if (pageStatus.isAcademia) {
      try {
        const response = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: "checkPage" }, (res) => {
            if (chrome.runtime.lastError) resolve(null);
            else resolve(res);
          });
        });

        if (response && typeof response.isFeedback === "boolean") {
          pageStatus.isFeedback = response.isFeedback;
        }
      } catch {}
    }

    updateAvailability();
  } catch (e) {
    console.error("[Popup] checkCurrentPage failed:", e);
    pageStatus = {
      isAcademia: false,
      isStudentPortal: false,
      isFeedback: false,
    };
    updateAvailability();
  }
}

function updateAvailability() {
  const canFill =
    pageStatus.isAcademia && pageStatus.isFeedback && !isCurrentlyFilling;

  elements.fillBtn.disabled = !canFill;
  elements.fillBtn.style.pointerEvents = canFill ? "auto" : "none";

  if (pageStatus.isStudentPortal) {
    // 1. User is on Student Portal
    showStatus(
      "warning",
      "You are on Student Portal",
      "Course feedback autofill is available on SRM Academia.",
      {
        text: "Go to Academia Course Feedback ↗",
        url: "https://academia.srmist.edu.in/#Course_Feedback",
      },
    );
  } else if (pageStatus.isAcademia && !pageStatus.isFeedback) {
    // 2. User is on Academia but not on feedback section
    showStatus(
      "error",
      "Wrong Section",
      "Open the Course Feedback page to autofill.",
      {
        text: "Open Course Feedback Page ↗",
        url: "https://academia.srmist.edu.in/#Course_Feedback",
      },
    );
  } else if (!pageStatus.isAcademia) {
    // 3. User is on any other website
    showStatus(
      "error",
      "Wrong Webpage",
      "Course feedback automation runs on SRM Academia.",
      {
        text: "Go to SRM Academia Course Feedback ↗",
        url: "https://academia.srmist.edu.in/#Course_Feedback",
      },
    );
  } else {
    // 4. On Academia Feedback page
    hideStatus();
  }
}

// --- Fill Process ---

async function fillFeedback() {
  if (isCurrentlyFilling) return;
  if (!pageStatus.isAcademia || !pageStatus.isFeedback) {
    updateAvailability();
    return;
  }

  try {
    setFilling(true);
    shouldTerminate = false;
    activeFillToken = null;
    hideStatus();

    updateProgress(5, "Initializing...");

    const tab = await getTargetTab();
    if (!tab) throw new Error("No active tab found");

    if (shouldTerminate) throw new Error("terminated");

    // Ensure content script is there
    updateProgress(10, "Checking page...");
    try {
      await chrome.tabs.sendMessage(tab.id, { action: "ping" });
    } catch {
      updateProgress(15, "Loading extension...");
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            "src/content/main.js",
          ],
        });
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        throw new Error(
          "Cannot run on this page. Go to SRM Academia feedback page.",
        );
      }
    }

    if (shouldTerminate) throw new Error("terminated");

    updateProgress(20, "Filling dropdowns...");

    const config = getCurrentConfig();
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "startFilling",
      config,
    });

    if (shouldTerminate) throw new Error("terminated");

    updateProgress(100, "Done!");
    await new Promise((r) => setTimeout(r, 500));
    hideProgress();

    setFilling(false);

    if (response.success) {
      showStatus("success", response.message || "Form filled successfully!");
      saveConfig();
    } else {
      const type = (response.message || "").toLowerCase().includes("partial")
        ? "warning"
        : "error";
      showStatus(type, response.message || "Fill failed.");
    }
  } catch (error) {
    console.error("[Popup] Fill error:", error);
    hideProgress();
    setFilling(false);

    if (error.message === "terminated") {
      shouldTerminate = false;
      return;
    }

    showStatus("error", error.message || "Unknown error");
    shouldTerminate = false;
  }
}

// --- Terminate ---

async function terminateProcess() {
  if (shouldTerminate) return;
  shouldTerminate = true;

  elements.terminateBtn.disabled = true;
  showStatus("error", "Stopping...", "Cancelling the automation.");

  try {
    const tab = await getTargetTab();
    if (tab) {
      await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: "terminateFilling" }, () =>
          resolve(),
        );
      });
    }
  } catch (e) {
    console.warn("[Popup] Terminate error:", e);
  }

  hideProgress();
  setFilling(false);
  elements.terminateBtn.disabled = false;
  showStatus("error", "Process terminated by user.");
  setTimeout(hideStatus, 3000);
  shouldTerminate = false;
}

// --- Progress from background ---

chrome.runtime.onMessage.addListener((request) => {
  if (
    request?.action === "fillProgressUpdate" &&
    isCurrentlyFilling &&
    !shouldTerminate
  ) {
    const percent =
      typeof request.percent === "number"
        ? Math.min(100, Math.max(0, request.percent))
        : null;
    if (percent !== null) {
      updateProgress(percent, request.message || "Filling...");
    }
  }

  if (request?.action === "fillComplete") {
    isCurrentlyFilling = false;
    activeFillToken = null;
    hideProgress();
    setFilling(false);
    if (request.result) {
      const msg = request.result.message || "Operation completed.";
      showStatus(request.result.success ? "success" : "error", msg);
    }
  }
});

// --- Portal Navigation Helper ---

async function openPortalTab(tabName, fallbackUrl) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const isAcademia =
      tab && (tab.url || "").toLowerCase().includes("academia.srmist.edu.in");

    if (isAcademia) {
      chrome.tabs.sendMessage(
        tab.id,
        { action: tabName === "tab-bug" ? "openBugs" : "openFaq" },
        (response) => {
          if (chrome.runtime.lastError || !response?.success) {
            if (fallbackUrl) chrome.tabs.create({ url: fallbackUrl });
          }
        },
      );
    } else if (fallbackUrl) {
      chrome.tabs.create({ url: fallbackUrl });
    }
  } catch {
    if (fallbackUrl) chrome.tabs.create({ url: fallbackUrl });
  }
}

// --- Init ---

async function init() {
  await loadConfig();
  checkCurrentPage();

  // Button listeners
  elements.fillBtn.addEventListener("click", fillFeedback);
  elements.terminateBtn.addEventListener("click", terminateProcess);

  const mainView = document.getElementById("mainView");
  const detailView = document.getElementById("detailView");

  const bugsBtn = document.getElementById("bugsBtn");
  const faqBtn = document.getElementById("faqBtn");
  const androidBtn = document.getElementById("androidBtn");
  const cgpaBtn = document.getElementById("cgpaBtn");

  const bugsContent = document.getElementById("bugsContent");
  const faqContent = document.getElementById("faqContent");
  const androidContent = document.getElementById("androidContent");

  const backBtn = document.getElementById("backBtn");
  const panelBackBtn = document.getElementById("panelBackBtn");

  const allContents = [bugsContent, faqContent, androidContent];

  function openTab(targetContent) {
    if (!targetContent) return;
    if (mainView) mainView.style.display = "none";
    if (detailView) detailView.style.display = "block";
    if (backBtn) backBtn.style.display = "inline-flex";

    allContents.forEach((c) => {
      if (c) c.style.display = "none";
    });
    targetContent.style.display = "block";
  }

  function showMainView() {
    if (detailView) detailView.style.display = "none";
    if (mainView) mainView.style.display = "block";
    if (backBtn) backBtn.style.display = "none";
  }

  if (cgpaBtn) {
    cgpaBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("src/cgpa_calculator/calculator.html") });
    });
  }

  if (bugsBtn) bugsBtn.addEventListener("click", () => openTab(bugsContent));
  if (faqBtn) faqBtn.addEventListener("click", () => openTab(faqContent));
  if (androidBtn)
    androidBtn.addEventListener("click", () => openTab(androidContent));

  if (backBtn) backBtn.addEventListener("click", showMainView);
  if (panelBackBtn) panelBackBtn.addEventListener("click", showMainView);


  // Config change listeners
  elements.rating.addEventListener("change", saveConfig);
  elements.commentText.addEventListener("input", () => {
    elements.commentText.style.height = "";
    elements.commentText.style.height = elements.commentText.scrollHeight + "px";
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      saveConfig();
      debounceTimer = null;
    }, 300);
  });

  // Close button
  const closeBtn = document.getElementById("closeBtn");
  if (closeBtn) closeBtn.addEventListener("click", () => window.close());

  // Page status listeners
  chrome.tabs.onActivated.addListener(() => checkCurrentPage());
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab?.active && (changeInfo.status === "complete" || changeInfo.url))
      checkCurrentPage();
  });
  window.addEventListener("focus", () => checkCurrentPage());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// --- Credit text animation ---
const creditLink = document.getElementById("creditLink");
const creditText = document.getElementById("creditText");

if (creditLink && creditText) {
  const original = "Managed by Aayush";
  const target = "Managed by Aayush";
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let interval = null;

  function scrambleText(finalText) {
    let iteration = 0;
    clearInterval(interval);

    interval = setInterval(() => {
      creditText.textContent = finalText
        .split("")
        .map((char, index) => {
          if (char === " ") return " ";
          if (index < iteration) return finalText[index];
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("");

      if (iteration >= finalText.length) {
        creditText.textContent = finalText;
        clearInterval(interval);
      }

      iteration += 1 / 3;
    }, 20);
  }

  creditLink.addEventListener("mouseenter", () => scrambleText(target));
  creditLink.addEventListener("mouseleave", () => scrambleText(original));
}
