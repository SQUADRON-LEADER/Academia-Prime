/**
 * Student Portal Side Panel Engine
 * - Minimal Lightish Theme
 * - Live Search Filter for Menu Items
 * - Clean Standard Navigation Pinned Shortcuts (No Button Highlights)
 * - Pure Vector Logos & Zero Emojis
 */
(() => {
  'use strict';

  // Strictly execute on Student Portal (sp.srmist.edu.in) only - never touch Academia
  if (window.location.hostname.includes('academia.')) {
    return;
  }
  function findSidePanel() {
    const explicitSelectors = [
      '#sidebar',
      '#sidebar-wrapper',
      '#sidebarWrapper',
      '#accordionSidebar',
      '.sidebar',
      '.sidebar-wrapper',
      '.page-sidebar',
      '.main-sidebar',
      '.app-sidebar',
      '.left-side-menu',
      '.vertical-menu',
      '#side-menu',
      '.sidepanel',
      '#sidepanel',
      'aside.main-sidebar',
      'aside#sidebar',
      'aside',
      '.left-sidebar',
      'nav#sidebar',
      '#sidebarMenu',
      '#divMenu',
      '.navigation',
      '.navbar-vertical',
      '#nav_menu',
      '#menu',
      '.side-nav',
      '.sidenav'
    ];

    for (const sel of explicitSelectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }

    // Semantic lookup
    const allAnchors = Array.from(document.querySelectorAll('a, button, li'));
    for (const a of allAnchors) {
      const text = (a.innerText || a.textContent || '').trim().toLowerCase();
      if (
        text.includes('attendance') ||
        text.includes('internal mark') ||
        text.includes('time table') ||
        text.includes('timetable') ||
        text.includes('course') ||
        text.includes('fee payment') ||
        text.includes('hostel') ||
        text.includes('dashboard')
      ) {
        const parentNav = a.closest('aside, nav, ul, .sidebar, [class*="sidebar"], [id*="sidebar"], [class*="menu"], [id*="menu"], [class*="nav"], [id*="nav"]');
        if (parentNav) {
          const grandParent = parentNav.closest('aside, nav, [class*="sidebar"], [id*="sidebar"]');
          return grandParent || parentNav;
        }
      }
    }

    // Geometry fallback
    const allDivs = document.querySelectorAll('div, nav, aside');
    for (const d of allDivs) {
      const rect = d.getBoundingClientRect();
      if (rect.left === 0 && rect.width > 120 && rect.width < 380 && rect.height > 300) {
        return d;
      }
    }

    return null;
  }

  /**
   * Finds the list container for navigation items.
   */
  function findMenuContainer(sidePanel) {
    if (!sidePanel) return null;
    return (
      sidePanel.querySelector('ul.sidebar-menu') ||
      sidePanel.querySelector('ul.nav') ||
      sidePanel.querySelector('ul.metismenu') ||
      sidePanel.querySelector('ul.sidebar-nav') ||
      sidePanel.querySelector('nav ul') ||
      sidePanel.querySelector('ul') ||
      sidePanel.querySelector('.sidebar-content') ||
      sidePanel
    );
  }

  /**
   * Injects the Minimal Lightish Search Bar with SVG Logo only.
   */
  function injectSearchBar(sidePanel, menuContainer) {
    if (!sidePanel || sidePanel.querySelector('#sp-sidepanel-search-wrapper')) return;

    const searchWrapper = document.createElement('div');
    searchWrapper.id = 'sp-sidepanel-search-wrapper';
    searchWrapper.className = 'sp-search-wrapper';
    searchWrapper.innerHTML = `
      <div class="sp-search-input-box">
        <svg class="sp-search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          id="sp-sidepanel-search-input" 
          class="sp-search-input" 
          placeholder="Search menu..." 
          autocomplete="off" 
          spellcheck="false"
        />
      </div>
      <div id="sp-search-no-results" class="sp-search-no-results" style="display: none;">
        <span>No matching menus found</span>
      </div>
    `;

    // Placement
    const profileBox = sidePanel.querySelector('.user-panel, .sidebar-user, .profile-sidebar, .sidebar-profile, .user-info, .sidebar-header, .brand-link');
    if (profileBox && profileBox.parentNode) {
      profileBox.parentNode.insertBefore(searchWrapper, profileBox.nextSibling);
    } else if (menuContainer && menuContainer.parentNode && menuContainer !== sidePanel) {
      menuContainer.parentNode.insertBefore(searchWrapper, menuContainer);
    } else {
      sidePanel.insertBefore(searchWrapper, sidePanel.firstChild);
    }

    const input = searchWrapper.querySelector('#sp-sidepanel-search-input');
    const noResults = searchWrapper.querySelector('#sp-search-no-results');

    // Live filtering
    input.addEventListener('input', () => {
      const query = input.value.trim();
      filterMenuItems(sidePanel, query, noResults);
    });

    // Keyboard shortcut (Escape)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        filterMenuItems(sidePanel, '', noResults);
      }
    });
  }

  /**
   * Filters side panel menu items with robust visibility overrides.
   */
  function filterMenuItems(sidePanel, query, noResultsEl) {
    const q = (query || '').trim().toLowerCase();

    const allNavLinks = Array.from(sidePanel.querySelectorAll('a, button, .nav-link, .sidebar-link, [onclick]'))
      .filter(el => 
        !el.closest('#sp-sidepanel-search-wrapper') && 
        !el.closest('#sp-pinned-menu-section') &&
        !el.classList.contains('sp-menu-pin-btn') &&
        !el.classList.contains('sp-pinned-unpin-btn')
      );

    let matchCount = 0;

    if (!q) {
      allNavLinks.forEach((link) => {
        link.classList.remove('sp-menu-hidden');
        link.style.removeProperty('display');

        const parentLi = link.closest('li, .nav-item, .sidebar-item');
        if (parentLi) {
          parentLi.classList.remove('sp-menu-hidden');
          parentLi.style.removeProperty('display');
        }
      });

      if (noResultsEl) {
        noResultsEl.style.setProperty('display', 'none', 'important');
      }
      return;
    }

    allNavLinks.forEach((link) => {
      const text = (link.innerText || link.textContent || link.getAttribute('title') || '').toLowerCase();
      const isMatch = text.includes(q);
      const parentLi = link.closest('li, .nav-item, .sidebar-item');

      if (isMatch) {
        matchCount++;
        link.classList.remove('sp-menu-hidden');
        link.style.removeProperty('display');

        if (parentLi) {
          parentLi.classList.remove('sp-menu-hidden');
          parentLi.style.removeProperty('display');
        }

        let parent = link.parentElement;
        while (parent && parent !== sidePanel) {
          if (
            parent.classList.contains('treeview-menu') ||
            parent.classList.contains('submenu') ||
            parent.classList.contains('sidebar-dropdown') ||
            parent.classList.contains('collapse') ||
            parent.tagName === 'UL'
          ) {
            parent.style.setProperty('display', 'block', 'important');
            parent.classList.add('show');
            if (parent.parentElement) {
              parent.parentElement.classList.remove('sp-menu-hidden');
              parent.parentElement.style.removeProperty('display');
            }
          }
          parent = parent.parentElement;
        }
      } else {
        link.classList.add('sp-menu-hidden');
        link.style.setProperty('display', 'none', 'important');

        if (parentLi) {
          const otherMatches = parentLi.querySelectorAll('a:not(.sp-menu-hidden), button:not(.sp-menu-hidden)');
          if (otherMatches.length === 0) {
            parentLi.classList.add('sp-menu-hidden');
            parentLi.style.setProperty('display', 'none', 'important');
          }
        }
      }
    });

    if (noResultsEl) {
      noResultsEl.style.setProperty('display', matchCount === 0 ? 'block' : 'none', 'important');
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
     Custom Pinned Shortcuts Persistence & Helpers (Up to 4 custom pins)
     ────────────────────────────────────────────────────────────────────────── */
  const STORAGE_KEY_CUSTOM_PINS = 'ar_sp_custom_pinned_shortcuts_v1';
  const MAX_CUSTOM_PINS = 4;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getCustomPins() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PINS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomPins(pins) {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PINS, JSON.stringify(pins));
    } catch (e) {
      console.warn('[Student Portal] Could not save custom pins:', e);
    }
  }

  function showPinPopup(anchorEl, type = 'success', customText = '') {
    let rect = null;
    if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
      rect = anchorEl.getBoundingClientRect();
    }

    let popup = document.getElementById('sp-pin-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'sp-pin-popup';
      document.body.appendChild(popup);
    }

    clearTimeout(showPinPopup._timer);

    let iconSvg = '';
    let contentHtml = '';

    if (type === 'warning') {
      iconSvg = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
      contentHtml = `
        <div class="sp-popup-inner">
          <span class="sp-popup-icon-wrap">${iconSvg}</span>
          <div class="sp-popup-text-group">
            <span class="sp-popup-title">Maximum 4 Pins</span>
            <span class="sp-popup-sub">Unpin a shortcut to add more</span>
          </div>
        </div>
      `;
    } else if (type === 'unpin') {
      iconSvg = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      contentHtml = `
        <div class="sp-popup-inner">
          <span class="sp-popup-icon-wrap">${iconSvg}</span>
          <span class="sp-popup-msg">${escapeHtml(customText || 'Unpinned')}</span>
        </div>
      `;
    } else {
      iconSvg = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      contentHtml = `
        <div class="sp-popup-inner">
          <span class="sp-popup-icon-wrap">${iconSvg}</span>
          <span class="sp-popup-msg">${escapeHtml(customText || 'Pinned to Shortcuts')}</span>
        </div>
      `;
    }

    popup.innerHTML = contentHtml;
    popup.className = `sp-pin-popup sp-popup-${type}`;

    if (rect) {
      const popupEstimatedWidth = type === 'warning' ? 210 : 170;
      const spaceRight = window.innerWidth - rect.right;

      if (spaceRight >= popupEstimatedWidth + 14) {
        popup.classList.add('sp-pos-right');
        const centerY = Math.max(22, Math.min(window.innerHeight - 22, rect.top + (rect.height / 2)));
        popup.style.top = `${centerY}px`;
        popup.style.left = `${rect.right + 9}px`;
      } else if (rect.top >= 48) {
        popup.classList.add('sp-pos-top');
        const centerX = Math.max(12, Math.min(window.innerWidth - popupEstimatedWidth, rect.left + (rect.width / 2)));
        popup.style.top = `${rect.top - 8}px`;
        popup.style.left = `${centerX}px`;
      } else {
        popup.classList.add('sp-pos-bottom');
        const centerX = Math.max(12, Math.min(window.innerWidth - popupEstimatedWidth, rect.left + (rect.width / 2)));
        popup.style.top = `${rect.bottom + 8}px`;
        popup.style.left = `${centerX}px`;
      }
    } else {
      popup.classList.add('sp-pos-fallback');
      popup.style.top = '24px';
      popup.style.left = '50%';
    }

    requestAnimationFrame(() => {
      popup.classList.add('sp-popup-visible');
    });

    showPinPopup._timer = setTimeout(() => {
      popup.classList.remove('sp-popup-visible');
    }, 1300);
  }

  function showPinToast(msg, isWarning = false) {
    showPinPopup(null, isWarning ? 'warning' : 'success', msg);
  }

  function cleanPinText(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    const excludeSelectors = [
      '.sp-menu-pin-btn',
      '.sp-pinned-unpin-btn',
      'svg',
      '.badge',
      '.label',
      '.pull-right',
      '.arrow',
      'i.fa-angle-left',
      'i.fa-angle-right',
      'i.fa-angle-down',
      'i.fa-chevron-right',
      'i.fa-chevron-down'
    ];
    excludeSelectors.forEach(sel => {
      clone.querySelectorAll(sel).forEach(node => node.remove());
    });
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function getMenuItemKey(el, cleanText) {
    const href = (el.getAttribute('href') || '').trim();
    const onclick = (el.getAttribute('onclick') || '').trim();
    const id = (el.id || '').trim();
    const textKey = (cleanText || cleanPinText(el)).toLowerCase();

    if (href && href !== '#' && !href.startsWith('javascript:')) {
      return `href:${href.toLowerCase()}`;
    }
    if (onclick) {
      return `onclick:${onclick.toLowerCase().replace(/\s+/g, '')}`;
    }
    if (id) {
      return `id:${id.toLowerCase()}`;
    }
    return `text:${textKey}`;
  }

  function extractPinDataFromLink(el) {
    const text = cleanPinText(el);
    const key = getMenuItemKey(el, text);
    const href = el.getAttribute('href') || '';
    const onclick = el.getAttribute('onclick') || '';
    return {
      key,
      text: text.slice(0, 34),
      href: href && href !== '#' ? href : '',
      onclick: onclick || ''
    };
  }

  /**
   * Specifically identifies Attendance element.
   */
  function isAttendanceElement(el) {
    const text = (el.innerText || el.textContent || '').trim().toLowerCase();
    return text.includes('attendance');
  }

  /**
   * Specifically identifies Internal Mark Details element (strictly excluding Grade).
   */
  function isInternalMarkElement(el) {
    const text = (el.innerText || el.textContent || '').trim().toLowerCase();
    if (text.includes('grade')) return false;
    return (
      text.includes('internal mark') ||
      text.includes('internal marks') ||
      (text.includes('internal') && text.includes('mark'))
    );
  }

  /**
   * Specifically identifies Timetable element (strictly regular class schedule, excluding exam).
   */
  function isTimetableElement(el) {
    const text = (el.innerText || el.textContent || '').trim().toLowerCase();
    const href = (el.getAttribute('href') || '').toLowerCase();
    const onclick = (el.getAttribute('onclick') || '').toLowerCase();
    if (text.includes('exam') || href.includes('exam') || onclick.includes('exam')) return false;
    return (
      text.includes('time table') ||
      text.includes('timetable') ||
      href.includes('timetable') ||
      href.includes('time_table') ||
      onclick.includes('timetable') ||
      onclick.includes('time_table')
    );
  }

  /**
   * Specifically identifies Academic Calendar / Planner element.
   */
  function isAcademicPlannerElement(el) {
    const text = (el.innerText || el.textContent || '').trim().toLowerCase();
    const href = (el.getAttribute('href') || '').toLowerCase();
    const onclick = (el.getAttribute('onclick') || '').toLowerCase();
    if (
      href.includes('academicplanner') ||
      href.includes('academic_planner') ||
      onclick.includes('academicplanner') ||
      onclick.includes('academic_planner')
    ) return true;
    return (
      (text.includes('academic') && (text.includes('calend') || text.includes('plann') || text.includes('piann'))) ||
      text.includes('calender/planner') ||
      text.includes('calendar/planner') ||
      text.includes('calendar / planner') ||
      text.includes('calender / planner') ||
      text === 'academic planner' ||
      text === 'academic calender' ||
      text === 'academic calendar'
    );
  }

  /**
   * Identifies whether an element is one of the 4 default permanent pins.
   */
  function isDefaultPinnedElement(el) {
    if (!el) return false;
    if (
      el.classList.contains('sp-highlight-attendance') ||
      el.classList.contains('sp-highlight-marks') ||
      el.classList.contains('sp-highlight-timetable') ||
      el.classList.contains('sp-highlight-calendar') ||
      el.closest('.sp-highlight-attendance, .sp-highlight-marks, .sp-highlight-timetable, .sp-highlight-calendar')
    ) {
      return true;
    }
    return isAttendanceElement(el) || isInternalMarkElement(el) || isTimetableElement(el) || isAcademicPlannerElement(el);
  }

  /**
   * Injects top-to-bottom pinned shortcuts (4 default + up to 4 custom pins).
   */
  function highlightAndPinKeyButtons(sidePanel, menuContainer) {
    if (!sidePanel) return;

    const allElements = Array.from(document.querySelectorAll('a, button, li, .nav-item, .sidebar-item, [onclick]'));

    let attendanceTarget = null;
    let internalMarksTarget = null;
    let timetableTarget = null;
    let academicPlannerTarget = null;

    for (const el of allElements) {
      if (
        el.closest('#sp-pinned-menu-section') || 
        el.closest('#sp-sidepanel-search-wrapper') ||
        el.classList.contains('sp-menu-pin-btn') ||
        el.classList.contains('sp-pinned-unpin-btn')
      ) continue;

      if (!attendanceTarget && isAttendanceElement(el)) {
        attendanceTarget = el.tagName === 'A' || el.tagName === 'BUTTON' ? el : el.querySelector('a, button') || el;
        el.classList.add('sp-highlight-attendance');
        const parent = el.closest('li, .nav-item, .sidebar-item');
        if (parent) parent.classList.add('sp-highlight-attendance');
        const aTag = el.tagName === 'A' ? el : el.querySelector('a');
        if (aTag) aTag.classList.add('sp-highlight-attendance');
      }

      if (!internalMarksTarget && isInternalMarkElement(el)) {
        internalMarksTarget = el.tagName === 'A' || el.tagName === 'BUTTON' ? el : el.querySelector('a, button') || el;
        el.classList.add('sp-highlight-marks');
        const parent = el.closest('li, .nav-item, .sidebar-item');
        if (parent) parent.classList.add('sp-highlight-marks');
        const aTag = el.tagName === 'A' ? el : el.querySelector('a');
        if (aTag) aTag.classList.add('sp-highlight-marks');
      }

      if (!timetableTarget && isTimetableElement(el)) {
        timetableTarget = el.tagName === 'A' || el.tagName === 'BUTTON' ? el : el.querySelector('a, button') || el;
        el.classList.add('sp-highlight-timetable');
        const parent = el.closest('li, .nav-item, .sidebar-item');
        if (parent) parent.classList.add('sp-highlight-timetable');
        const aTag = el.tagName === 'A' ? el : el.querySelector('a');
        if (aTag) aTag.classList.add('sp-highlight-timetable');
      }

      if (!academicPlannerTarget && isAcademicPlannerElement(el)) {
        academicPlannerTarget = el.tagName === 'A' || el.tagName === 'BUTTON' ? el : el.querySelector('a, button') || el;
        el.classList.add('sp-highlight-calendar');
        const parent = el.closest('li, .nav-item, .sidebar-item');
        if (parent) parent.classList.add('sp-highlight-calendar');
        const aTag = el.tagName === 'A' ? el : el.querySelector('a');
        if (aTag) aTag.classList.add('sp-highlight-calendar');
      }
    }

    const customPins = getCustomPins();
    const customPinsSig = customPins.map(p => `${p.key}:${p.text}`).join('|');

    let pinnedSection = sidePanel.querySelector('#sp-pinned-menu-section');
    if (
      pinnedSection && (
        !pinnedSection.querySelector('#sp-pinned-attendance-btn') ||
        !pinnedSection.querySelector('#sp-pinned-marks-btn') ||
        !pinnedSection.querySelector('#sp-pinned-timetable-btn') ||
        !pinnedSection.querySelector('#sp-pinned-calendar-btn') ||
        pinnedSection.dataset.customSig !== customPinsSig
      )
    ) {
      pinnedSection.remove();
      pinnedSection = null;
    }

    if (!pinnedSection) {
      pinnedSection = document.createElement('div');
      pinnedSection.id = 'sp-pinned-menu-section';
      pinnedSection.className = 'sp-pinned-section';
      pinnedSection.dataset.customSig = customPinsSig;

      const customPinsHtml = customPins.map((pin) => `
        <div class="sp-stacked-custom-wrap" data-pin-key="${escapeHtml(pin.key)}">
          <button type="button" class="sp-stacked-nav-btn sp-stacked-custom" title="${escapeHtml(pin.text)}">
            <svg class="sp-stacked-svg-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 17v5"></path>
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a3 3 0 0 0-6 0v4.76z"></path>
            </svg>
            <span class="sp-stacked-label">${escapeHtml(pin.text)}</span>
          </button>
          <button type="button" class="sp-pinned-unpin-btn" title="Unpin ${escapeHtml(pin.text)}" aria-label="Unpin">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `).join('');

      const remainingPins = Math.max(0, MAX_CUSTOM_PINS - customPins.length);
      const pinSubtitleText = remainingPins > 0
        ? `(pin upto ${remainingPins} more section${remainingPins > 1 ? 's' : ''})`
        : `(all ${MAX_CUSTOM_PINS} sections pinned)`;

      pinnedSection.innerHTML = `
        <div class="sp-pinned-header">
          <div class="sp-pinned-header-left">
            <svg class="sp-pinned-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 17v5"></path>
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a3 3 0 0 0-6 0v4.76z"></path>
            </svg>
            <div class="sp-pinned-title-group">
              <span class="sp-pinned-title">PINNED SHORTCUTS</span>
              <span class="sp-pinned-subtitle">${pinSubtitleText}</span>
            </div>
          </div>
          <button type="button" id="sp-about-pinned-btn" class="sp-pinned-about-btn" title="About Academia Prime">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
            <span>About</span>
          </button>
        </div>

        <div class="sp-pinned-stack">
          <!-- Button 1 (Top): Attendance (Emerald Highlight) -->
          <button type="button" id="sp-pinned-attendance-btn" class="sp-stacked-nav-btn sp-stacked-attendance" title="Attendance">
            <svg class="sp-stacked-svg-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <polyline points="9 16 11 18 15 14"></polyline>
            </svg>
            <span class="sp-stacked-label">Attendance</span>
          </button>

          <!-- Button 2: Internal Mark Details (Indigo Highlight) -->
          <button type="button" id="sp-pinned-marks-btn" class="sp-stacked-nav-btn sp-stacked-marks" title="Internal Mark Details">
            <svg class="sp-stacked-svg-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span class="sp-stacked-label">Internal Mark Details</span>
          </button>

          <!-- Button 3: Timetable (Amber Highlight) -->
          <button type="button" id="sp-pinned-timetable-btn" class="sp-stacked-nav-btn sp-stacked-timetable" title="Timetable">
            <svg class="sp-stacked-svg-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="sp-stacked-label">Timetable</span>
          </button>

          <!-- Button 4 (Bottom): Academic Calendar/Planner (Sky Blue Highlight) -->
          <button type="button" id="sp-pinned-calendar-btn" class="sp-stacked-nav-btn sp-stacked-calendar" title="Academic Calendar/Planner">
            <svg class="sp-stacked-svg-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"></path>
            </svg>
            <span class="sp-stacked-label">Academic Calendar/Planner</span>
          </button>

          ${customPinsHtml}
        </div>
      `;

      // Placement
      const searchWrapper = sidePanel.querySelector('#sp-sidepanel-search-wrapper');
      if (searchWrapper && searchWrapper.parentNode) {
        searchWrapper.parentNode.insertBefore(pinnedSection, searchWrapper.nextSibling);
      } else if (menuContainer && menuContainer.parentNode && menuContainer !== sidePanel) {
        menuContainer.parentNode.insertBefore(pinnedSection, menuContainer);
      } else {
        sidePanel.insertBefore(pinnedSection, sidePanel.firstChild);
      }

      // Bind click triggers for 4 default pins
      const attBtn = pinnedSection.querySelector('#sp-pinned-attendance-btn');
      const marksBtn = pinnedSection.querySelector('#sp-pinned-marks-btn');
      const ttBtn = pinnedSection.querySelector('#sp-pinned-timetable-btn');
      const calBtn = pinnedSection.querySelector('#sp-pinned-calendar-btn');

      if (attBtn) {
        attBtn.addEventListener('click', (e) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ar:close_timetable'));
          if (attendanceTarget) {
            triggerNativeClick(attendanceTarget);
          } else {
            findAndClickByText(sidePanel, 'attendance');
          }
          setActivePinned(attBtn);
        });
      }

      if (marksBtn) {
        marksBtn.addEventListener('click', (e) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ar:close_timetable'));
          if (internalMarksTarget) {
            triggerNativeClick(internalMarksTarget);
          } else {
            findAndClickInternalMarks(sidePanel);
          }
          setActivePinned(marksBtn);
        });
      }

      if (ttBtn) {
        ttBtn.addEventListener('click', (e) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ar:open_timetable'));
          if (timetableTarget) {
            triggerNativeClick(timetableTarget);
          } else {
            findAndClickTimetable(sidePanel);
          }
          setActivePinned(ttBtn);
        });
      }

      if (calBtn) {
        calBtn.addEventListener('click', (e) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('ar:close_timetable'));
          if (academicPlannerTarget) {
            triggerNativeClick(academicPlannerTarget);
          } else {
            findAndClickAcademicPlanner(sidePanel);
          }
          setActivePinned(calBtn);
        });
      }

      // Bind click trigger for About Academia Prime button in header
      const aboutBtn = pinnedSection.querySelector('#sp-about-pinned-btn');
      if (aboutBtn) {
        aboutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('ar:open_about'));
        });
      }

      // Bind click triggers & unpin for custom pinned buttons
      const customWraps = pinnedSection.querySelectorAll('.sp-stacked-custom-wrap');
      customWraps.forEach((wrap) => {
        const pinKey = wrap.dataset.pinKey;
        const pin = customPins.find(p => p.key === pinKey);
        if (!pin) return;

        const customBtn = wrap.querySelector('.sp-stacked-custom');
        const unpinBtn = wrap.querySelector('.sp-pinned-unpin-btn');

        if (customBtn) {
          customBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerCustomPinClick(pin, sidePanel);
            setActivePinned(customBtn);
          });
        }

        if (unpinBtn) {
          unpinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const updatedPins = getCustomPins().filter(p => p.key !== pin.key);
            saveCustomPins(updatedPins);
            highlightAndPinKeyButtons(sidePanel, menuContainer);
            injectMenuHoverPinButtons(sidePanel);
          });
        }
      });
    }

    updatePinnedActiveState(pinnedSection);
  }

  /**
   * Triggers click on matching custom pinned item or navigates.
   */
  function triggerCustomPinClick(pin, sidePanel) {
    if (!pin) return;
    window.dispatchEvent(new CustomEvent('ar:close_timetable'));

    const allLinks = Array.from((sidePanel || document).querySelectorAll('a, button, .nav-link, .sidebar-link, [onclick]'))
      .filter(el => 
        !el.closest('#sp-pinned-menu-section') && 
        !el.closest('#sp-sidepanel-search-wrapper') &&
        !el.classList.contains('sp-menu-pin-btn') &&
        !el.classList.contains('sp-pinned-unpin-btn')
      );

    let matchedEl = null;

    // 1. Match by exact key
    for (const el of allLinks) {
      if (getMenuItemKey(el) === pin.key) {
        matchedEl = el;
        break;
      }
    }

    // 2. Match by href
    if (!matchedEl && pin.href) {
      const cleanHref = pin.href.toLowerCase();
      for (const el of allLinks) {
        const h = (el.getAttribute('href') || '').toLowerCase();
        if (h && (h === cleanHref || h.includes(cleanHref) || cleanHref.includes(h))) {
          matchedEl = el;
          break;
        }
      }
    }

    // 3. Match by text
    if (!matchedEl && pin.text) {
      const pinTxtLower = pin.text.toLowerCase().trim();
      for (const el of allLinks) {
        const txt = cleanPinText(el).toLowerCase().trim();
        if (txt === pinTxtLower || txt.includes(pinTxtLower) || pinTxtLower.includes(txt)) {
          matchedEl = el;
          break;
        }
      }
    }

    if (matchedEl) {
      // Expand parents if nested in collapsed treeview
      let parent = matchedEl.parentElement;
      while (parent && parent !== sidePanel && parent !== document.body) {
        if (
          parent.classList.contains('treeview-menu') ||
          parent.classList.contains('submenu') ||
          parent.classList.contains('sidebar-dropdown') ||
          parent.classList.contains('collapse') ||
          parent.tagName === 'UL'
        ) {
          parent.style.setProperty('display', 'block', 'important');
          parent.classList.add('show', 'menu-open');
          if (parent.parentElement) {
            parent.parentElement.classList.add('menu-open', 'active');
          }
        }
        parent = parent.parentElement;
      }

      triggerNativeClick(matchedEl);
    } else if (pin.href && pin.href !== '#') {
      window.location.href = pin.href;
    }
  }

  /**
   * Injects hover pin button on other unpinned menu buttons.
   */
  function injectMenuHoverPinButtons(sidePanel) {
    if (!sidePanel) return;

    const currentPins = getCustomPins();
    const allLinks = Array.from(sidePanel.querySelectorAll('a, button, .nav-link, .sidebar-link, [onclick]'))
      .filter(el => {
        if (el.closest('#sp-pinned-menu-section') || el.closest('#sp-sidepanel-search-wrapper')) return false;
        if (el.classList.contains('sp-menu-pin-btn') || el.classList.contains('sp-pinned-unpin-btn')) return false;
        if (isDefaultPinnedElement(el)) return false;

        const text = cleanPinText(el);
        if (!text || text.length < 2) return false;

        // If not an <a> and contains an <a>, let the <a> hold the pin button
        if (el.tagName !== 'A' && el.querySelector('a')) return false;

        return true;
      });

    allLinks.forEach((link) => {
      const text = cleanPinText(link);
      const pinKey = getMenuItemKey(link, text);
      const isPinned = currentPins.some(p => p.key === pinKey || (p.text && p.text.toLowerCase() === text.toLowerCase()));

      link.classList.add('sp-has-pin-btn');

      let pinBtn = link.querySelector(':scope > .sp-menu-pin-btn');
      if (pinBtn) {
        pinBtn.dataset.pinKey = pinKey;
        pinBtn.classList.toggle('sp-pin-active', isPinned);
        pinBtn.title = isPinned ? `Unpin "${text}"` : `Pin "${text}" (up to 4)`;
        pinBtn.setAttribute('aria-label', isPinned ? 'Unpin' : 'Pin');
        const svg = pinBtn.querySelector('svg');
        if (svg) {
          svg.setAttribute('fill', isPinned ? '#bae6fd' : 'none');
          svg.setAttribute('stroke', isPinned ? '#6b83b4' : 'currentColor');
        }
        return;
      }

      pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.className = `sp-menu-pin-btn ${isPinned ? 'sp-pin-active' : ''}`;
      pinBtn.dataset.pinKey = pinKey;
      pinBtn.title = isPinned ? `Unpin "${text}"` : `Pin "${text}" (up to 4)`;
      pinBtn.setAttribute('aria-label', isPinned ? 'Unpin' : 'Pin');
      pinBtn.innerHTML = `
        <svg class="sp-pin-svg" viewBox="0 0 24 24" width="10" height="10" fill="${isPinned ? '#bae6fd' : 'none'}" stroke="${isPinned ? '#6b83b4' : 'currentColor'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="17" x2="12" y2="22"></line>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V5h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v5.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
        </svg>
      `;

      pinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const pinData = extractPinDataFromLink(link);
        const pins = getCustomPins();
        const existingIdx = pins.findIndex(p => p.key === pinData.key || (p.text && p.text.toLowerCase() === pinData.text.toLowerCase()));

        if (existingIdx >= 0) {
          pins.splice(existingIdx, 1);
          saveCustomPins(pins);
        } else {
          if (pins.length >= MAX_CUSTOM_PINS) {
            showPinPopup(pinBtn, 'warning');
            return;
          }
          pins.push(pinData);
          saveCustomPins(pins);
        }

        const menuContainer = findMenuContainer(sidePanel);
        highlightAndPinKeyButtons(sidePanel, menuContainer);
        injectMenuHoverPinButtons(sidePanel);
      });

      link.appendChild(pinBtn);
    });
  }

  /**
   * Triggers native link click or custom portal event.
   */
  function triggerNativeClick(target) {
    if (!target) return;
    if (typeof target.click === 'function') {
      target.click();
    } else {
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      target.dispatchEvent(event);
    }
  }

  /**
   * Fallback text-based locator and trigger.
   */
  function findAndClickByText(sidePanel, query) {
    const links = document.querySelectorAll('a, button, li');
    for (const link of links) {
      if (
        link.closest('#sp-pinned-menu-section') ||
        link.classList.contains('sp-menu-pin-btn') ||
        link.classList.contains('sp-pinned-unpin-btn')
      ) continue;
      const txt = (link.textContent || '').toLowerCase();
      if (txt.includes(query)) {
        triggerNativeClick(link.tagName === 'A' || link.tagName === 'BUTTON' ? link : link.querySelector('a') || link);
        break;
      }
    }
  }

  /**
   * Strictly clicks Internal Mark Details (NOT Grade).
   */
  function findAndClickInternalMarks(sidePanel) {
    const links = document.querySelectorAll('a, button, li');
    for (const link of links) {
      if (
        link.closest('#sp-pinned-menu-section') ||
        link.classList.contains('sp-menu-pin-btn') ||
        link.classList.contains('sp-pinned-unpin-btn')
      ) continue;
      if (isInternalMarkElement(link)) {
        triggerNativeClick(link.tagName === 'A' || link.tagName === 'BUTTON' ? link : link.querySelector('a') || link);
        break;
      }
    }
  }

  /**
   * Strictly clicks Timetable (NOT Exam).
   */
  function findAndClickTimetable(sidePanel) {
    const links = document.querySelectorAll('a, button, li');
    for (const link of links) {
      if (
        link.closest('#sp-pinned-menu-section') ||
        link.classList.contains('sp-menu-pin-btn') ||
        link.classList.contains('sp-pinned-unpin-btn')
      ) continue;
      if (isTimetableElement(link)) {
        triggerNativeClick(link.tagName === 'A' || link.tagName === 'BUTTON' ? link : link.querySelector('a') || link);
        break;
      }
    }
  }

  /**
   * Strictly clicks Academic Calendar / Planner.
   */
  function findAndClickAcademicPlanner(sidePanel) {
    const links = document.querySelectorAll('a, button, li');
    for (const link of links) {
      if (
        link.closest('#sp-pinned-menu-section') ||
        link.classList.contains('sp-menu-pin-btn') ||
        link.classList.contains('sp-pinned-unpin-btn')
      ) continue;
      if (isAcademicPlannerElement(link)) {
        triggerNativeClick(link.tagName === 'A' || link.tagName === 'BUTTON' ? link : link.querySelector('a') || link);
        break;
      }
    }
  }

  /**
   * Updates visual active highlight on pinned shortcuts.
   */
  function setActivePinned(activeBtn) {
    const section = document.querySelector('#sp-pinned-menu-section');
    if (section) {
      const allBtns = section.querySelectorAll('.sp-stacked-nav-btn');
      allBtns.forEach((btn) => btn && btn.classList.remove('sp-stacked-active'));
    }
    if (activeBtn) activeBtn.classList.add('sp-stacked-active');
  }

  function updatePinnedActiveState(pinnedSection) {
    if (!pinnedSection) return;
    const currentPath = window.location.pathname.toLowerCase();
    const currentHash = (window.location.hash || '').toLowerCase();
    const isAttendance = currentPath.includes('attendance') || currentHash.includes('attendance');
    const isMarks = !currentHash.includes('grade') && (
      currentPath.includes('internal') || 
      currentHash.includes('internal') || 
      currentHash.includes('internal_mark')
    );
    const isTimetable = (
      currentPath.includes('timetable') || 
      currentPath.includes('time_table') || 
      currentHash.includes('timetable') || 
      currentHash.includes('time_table')
    );
    const isPlanner = (
      currentPath.includes('planner') || 
      currentPath.includes('calendar') || 
      currentPath.includes('calender') || 
      currentHash.includes('planner') || 
      currentHash.includes('calendar') || 
      currentHash.includes('calender')
    );

    const attBtn = pinnedSection.querySelector('#sp-pinned-attendance-btn');
    const marksBtn = pinnedSection.querySelector('#sp-pinned-marks-btn');
    const ttBtn = pinnedSection.querySelector('#sp-pinned-timetable-btn');
    const calBtn = pinnedSection.querySelector('#sp-pinned-calendar-btn');

    if (attBtn) attBtn.classList.toggle('sp-stacked-active', isAttendance);
    if (marksBtn) marksBtn.classList.toggle('sp-stacked-active', isMarks);
    if (ttBtn) ttBtn.classList.toggle('sp-stacked-active', isTimetable);
    if (calBtn) calBtn.classList.toggle('sp-stacked-active', isPlanner);

    const customWraps = pinnedSection.querySelectorAll('.sp-stacked-custom-wrap');
    customWraps.forEach((wrap) => {
      const pinKey = wrap.dataset.pinKey || '';
      const customBtn = wrap.querySelector('.sp-stacked-custom');
      if (!customBtn) return;
      let isActive = false;
      if (pinKey.startsWith('href:')) {
        const rawHref = pinKey.replace('href:', '').toLowerCase();
        if (rawHref && (currentPath.includes(rawHref) || (currentHash && currentHash.includes(rawHref)))) {
          isActive = true;
        }
      }
      customBtn.classList.toggle('sp-stacked-active', isActive);
    });
  }

  /**
   * Identifies specific secondary action types for custom dotted pastel styling.
   */
  function getSpecialDottedType(el) {
    if (
      el.closest('#sp-pinned-menu-section') || 
      el.closest('#sp-sidepanel-search-wrapper') ||
      el.classList.contains('sp-menu-pin-btn') ||
      el.classList.contains('sp-pinned-unpin-btn')
    ) return null;

    const text = (el.innerText || el.textContent || '').trim().toLowerCase();
    if (!text) return null;

    // 1. Fee Payment
    if (text.includes('fee payment') || text.includes('fee payments')) return 'fee';

    // 2. Academic Calendar / Planner
    if (
      (text.includes('academic') && (text.includes('calend') || text.includes('plann') || text.includes('piann'))) ||
      text.includes('calender/planner') ||
      text.includes('calendar/planner') ||
      text.includes('calendar / planner') ||
      text.includes('calender / planner')
    ) return 'calendar';

    // 3. Exam Provisional Results
    if (
      text.includes('provisional result') ||
      text.includes('provisional results') ||
      (text.includes('exam') && text.includes('provisional'))
    ) return 'results';

    // 4. Finance Details
    if (text.includes('finance detail') || text.includes('finance details')) return 'finance';

    // 5. Exam HallTicket
    if (text.includes('hallticket') || text.includes('hall ticket') || text.includes('hall-ticket') || text.includes('hall_ticket')) return 'hallticket';

    // 6. Exam Time Table
    if (text.includes('exam') && (text.includes('time table') || text.includes('timetable') || text.includes('time-table') || text.includes('time_table'))) return 'examtimetable';

    // 7. Scholarship Renewal Process
    if (text.includes('scholarship')) return 'scholarship';

    // 8. Scribe Request
    if (text.includes('scribe')) return 'scribe';

    // 9. Student Feedback
    if (text.includes('feedback')) return 'feedback';

    // 10. Hostel
    if (text.includes('hostel')) return 'hostel';

    // 11. Grade / Mark & Credit
    if (text.includes('grade') || (text.includes('mark') && text.includes('credit'))) return 'grade';

    return null;
  }

  /**
   * Applies the colored dotted outline & pastel background classes to the targeted menu items.
   */
  function highlightDottedButtons(sidePanel) {
    if (!sidePanel) return;
    const allLinks = Array.from(sidePanel.querySelectorAll('a, button, .nav-link, .sidebar-link, [onclick]'));
    for (const el of allLinks) {
      if (
        el.closest('#sp-pinned-menu-section') || 
        el.closest('#sp-sidepanel-search-wrapper') ||
        el.classList.contains('sp-menu-pin-btn') ||
        el.classList.contains('sp-pinned-unpin-btn')
      ) continue;
      const type = getSpecialDottedType(el);
      if (type) {
        const target = el.tagName === 'A' || el.tagName === 'BUTTON' ? el : el.querySelector('a, button') || el;
        if (target) {
          if (!target.classList.contains('sp-highlight-dotted')) {
            target.classList.add('sp-highlight-dotted');
          }
          const typeClass = `sp-dotted-${type}`;
          if (!target.classList.contains(typeClass)) {
            target.classList.add(typeClass);
          }
        }
        const parentLi = el.closest('li, .nav-item, .sidebar-item');
        if (parentLi && !parentLi.classList.contains('sp-highlight-dotted-parent')) {
          parentLi.classList.add('sp-highlight-dotted-parent');
        }
      }
    }
  }

  /**
   * Main enhancement orchestrator.
   */
  function enhanceSidePanel() {
    const sidePanel = findSidePanel();
    if (!sidePanel) return;

    if (!sidePanel.classList.contains('sp-sidepanel-modern')) {
      sidePanel.classList.add('sp-sidepanel-modern');
    }

    const userBoxes = sidePanel.querySelectorAll('.user-panel, .sidebar-user, .profile-sidebar, .sidebar-profile, .user-info');
    userBoxes.forEach((box) => {
      if (!box.classList.contains('sp-sidepanel-user-box')) {
        box.classList.add('sp-sidepanel-user-box');
      }
    });

    const menuContainer = findMenuContainer(sidePanel);

    // 1. Search Bar
    injectSearchBar(sidePanel, menuContainer);

    // 2. Clean Neutral Pinned Shortcuts
    highlightAndPinKeyButtons(sidePanel, menuContainer);

    // 3. Hover Pin Buttons for other unpinned buttons (up to 4 custom pins)
    injectMenuHoverPinButtons(sidePanel);

    // 4. Thin Dotted Outline for Secondary Navigation Buttons (Fee Payment, Academic Calendar, Exam Results, etc.)
    highlightDottedButtons(sidePanel);

    // 5. Active Link Highlighter
    const currentPath = window.location.pathname.toLowerCase();
    const currentHash = (window.location.hash || '').toLowerCase();
    const links = sidePanel.querySelectorAll('a');

    links.forEach((link) => {
      if (
        link.closest('#sp-pinned-menu-section') ||
        link.classList.contains('sp-menu-pin-btn') ||
        link.classList.contains('sp-pinned-unpin-btn')
      ) return;

      const href = (link.getAttribute('href') || '').toLowerCase();
      if (!href || href === '#' || href.startsWith('javascript:')) return;

      const isCurrent = 
        (currentHash && href.includes(currentHash)) ||
        (href === currentPath) ||
        (currentPath.endsWith(href) && href !== '/');

      if (isCurrent) {
        link.classList.add('sp-sidepanel-active');
        const parentLi = link.closest('li');
        if (parentLi) parentLi.classList.add('active');
      }
    });
  }

  /**
   * Initialize with retry loops and mutation observer.
   */
  function initSidePanel() {
    const run = () => {
      try {
        enhanceSidePanel();
      } catch (err) {
        console.warn('[Student Portal] Side Panel Theme Error:', err);
      }
    };

    run();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    }
    window.addEventListener('load', run);

    let count = 0;
    const interval = setInterval(() => {
      run();
      count++;
      if (count >= 16) clearInterval(interval);
    }, 500);

    const observer = new MutationObserver(() => {
      run();
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true
      });
    }

    window.addEventListener('hashchange', run);
    window.addEventListener('popstate', run);
  }

  initSidePanel();
})();
