/**
 * ============================================================
 * FILE: automator.js (Injected into page's MAIN world)
 * ============================================================
 * PURPOSE:
 *   The core feedback-filling engine. Runs in the page's MAIN world
 *   so it has direct access to jQuery and Select2 on the Academia page.
 *   Exposes window.srmAutomator with methods called by background.js.
 *
 * FEATURES:
 *   - fillDropdowns(rating, token): Fills all Select2 feedback dropdowns
 *     → Tries programmatic .val() + .trigger('change') first (fast path)
 *     → Falls back to UI simulation (open dropdown → find option → click)
 *   - fillComments(text, token): Fills all <textarea> comment boxes
 *   - getIdentity(): Scrapes student name + reg number from page
 *   - checkDependencies(): Checks if jQuery + Select2 are loaded
 *   - cancelOperation(token): Cancels an in-progress fill
 *
 * SETTINGS:
 *   - RATINGS: Rating label → value mapping ('Excellent' → '5')
 *     To add/change ratings, edit the RATINGS object below
 *   - W.panel / W.opts: Retry counts for waiting for dropdown panel/options
 *   - Batch size: 25 dropdowns processed concurrently per batch
 *
 * TO MODIFY:
 *   - Change how dropdowns are detected → edit the isPlace/isRate filters
 *     in fillDropdowns()
 *   - Change dropdown fill strategy → edit fillOne() function
 *   - Change comment detection → currently uses all <textarea> elements
 *   - Change identity scraping → edit getIdentity() regex pattern
 *
 * HOW DROPDOWN FILLING WORKS:
 *   1. Find all .select2-container elements showing placeholder or rating
 *   2. For each one, resolve the hidden <select> element behind it
 *   3. Try fast path: set value programmatically + trigger change events
 *   4. If fast path fails: open dropdown UI → wait for options → click match
 *   5. Verify the displayed text matches what we set
 * ============================================================
 */
(function () {
    if (window.srmAutomator) return;

    const VERSION = '1.3.3', SIG = 'srm-automator-v1.3.3-verified';
    const RATINGS = Object.freeze({ Excellent: '5', 'Very Good': '4', Good: '3', Average: '2', Poor: '1' });
    const REQUIRED = ['fillDropdowns', 'fillComments', 'checkDependencies', 'cancelOperation', 'getIdentity'];
    const PLACEHOLDERS = new Set(['-select-', '--select--', 'select', 'please select']);
    const LOADING = ['loading', 'loading...', 'searching', 'searching...', 'please wait'];
    const W = { panel: 25, panelMs: 80, opts: 200, optsMs: 25, retries: 3, retryBase: 200 };

    // Cancellation tokens
    const cancelled = new Set();
    const cancel = t => t && cancelled.add(t);
    const isCancelled = t => !!(t && cancelled.has(t));

    const norm = v => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const $ = () => window.jQuery || window.$ || null;

    const isPlace = t => PLACEHOLDERS.has(norm(t).replace(/[-–—]/g, '').trim());
    const isRate = t => Object.keys(RATINGS).some(k => norm(k) === norm(t));

    const emit = (type, detail) => {
        try { window.dispatchEvent(new CustomEvent('srmAutomatorProgress', { detail: { type, origin: 'injected', ...detail } })); } catch { }
    };

    // Get displayed text from select2 container
    const dispText = $c => {
        const jq = $();
        if (!jq || !$c?.length) return '';
        for (const s of ['.select2-selection__rendered', '.select2-chosen', '.select2-selection__single']) {
            const $n = $c.find(s).first();
            if ($n.length && norm($n.text())) return $n.text().trim();
        }
        return $c.text().trim();
    };

    // Resolve the underlying <select> for a select2 container
    const findSelect = ($c, jq) => {
        let inst = $c.data('select2') || $c.data('select2-old');
        let $s = jq();

        const tryEl = i => {
            if (!i) return;
            for (const p of ['element', '$element', 'select']) if (!$s.length && i[p]) $s = i[p].jquery ? i[p] : jq(i[p].nodeType ? i[p] : i[p][0]);
            if (!$s.length && i.opts?.element) $s = jq(i.opts.element);
            if (!inst) inst = i;
        };
        tryEl(inst);

        if (!$s.length) { const $h = $c.siblings('.select2-hidden-accessible,.select2-offscreen').first(); if ($h.length) { $s = $h; inst = inst || $h.data('select2'); } }
        if (!$s.length) { const $p = $c.prevAll('select').first(); if ($p.length) { $s = $p; inst = inst || $p.data('select2'); } }
        if (!$s.length) {
            jq('select').each(function () {
                if ($s.length) return false;
                const ci = jq(this).data('select2') || jq(this).data('select2-old');
                if (ci && (ci.container?.[0] || ci.$container?.[0]) === $c[0]) { $s = jq(this); inst = inst || ci; return false; }
            });
        }
        return { $sel: $s, inst };
    };

    const openDrop = ($c, inst) => {
        if (inst?.open) try { inst.open(); return true; } catch { }
        const $t = $c.find('a.select2-choice, span.select2-selection').first();
        if ($t.length) { ['mousedown', 'mouseup', 'click'].forEach(e => $t[0].dispatchEvent(new MouseEvent(e, { bubbles: true, cancelable: true }))); return true; }
        return false;
    };

    const closeDrop = (inst) => {
        if (inst?.close) try { inst.close(); return; } catch { }
        try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true })); } catch { }
    };

    const waitPanel = async ($c, jq, token) => {
        for (let i = 0; i < W.panel; i++) {
            if (isCancelled(token)) return jq();
            const $p = jq('#select2-drop, .select2-dropdown').filter(':visible').first();
            if ($p.length) return $p;
            await wait(W.panelMs);
        }
        return jq();
    };

    const waitOpts = async ($panel, jq, desired, token) => {
        const nd = norm(desired);
        for (let i = 0; i < W.opts; i++) {
            if (isCancelled(token)) return { $o: jq(), loading: false };
            const ptxt = norm($panel.text());
            if (LOADING.some(w => ptxt.includes(w))) { if (i > W.opts / 2) return { $o: jq(), loading: true }; await wait(W.optsMs); continue; }

            let $o = jq();
            for (const s of ['.select2-results__option', '.select2-results li', 'li.select2-result']) { $o = $panel.find(s); if ($o.length) break; }
            $o = $o.filter(':visible').filter(function () { return !LOADING.some(w => norm(jq(this).text()).includes(w)); });

            if ($o.length && (!nd || $o.toArray().some(n => { const t = norm(jq(n).text()); return t === nd || t.includes(nd); })))
                return { $o, loading: false };
            await wait(W.optsMs);
        }
        return { $o: jq(), loading: false };
    };

    const ensureOpt = ($sel, rText, rVal) => {
        if (!$sel?.length) return { value: rVal, text: rText };
        const nt = norm(rText);
        for (const o of Array.from($sel[0].options || [])) {
            if (rVal && o.value === rVal) return { value: o.value, text: o.text || rText };
            if (nt && norm(o.text) === nt) return { value: o.value || rVal, text: o.text || rText };
        }
        try { $sel.append(new Option(rText, rVal)); } catch { }
        return { value: rVal, text: rText };
    };

    const findMatch = ($opts, text, val, jq) => {
        const nt = norm(text); let partial = null;
        for (let i = 0; i < $opts.length; i++) {
            const n = $opts[i], ot = norm(n.textContent || '');
            if (nt && ot === nt) return jq(n);
            const ov = n.value || n.getAttribute('value') || jq.data?.(n, 'data')?.id;
            if (val && ov?.toString() === val.toString()) return jq(n);
            if (!partial && nt && ot.includes(nt)) partial = n;
        }
        return partial ? jq(partial) : null;
    };

    const clickOpt = async $o => {
        if (!$o?.length) return false;
        const n = $o[0];
        ['mousemove', 'mouseover', 'mousedown', 'mouseup', 'click'].forEach(e => n.dispatchEvent(new MouseEvent(e, { bubbles: true, cancelable: true, view: window })));
        if (n.click) n.click();
        await wait(30); return true;
    };

    // Programmatic value set
    const setProgrammatic = async (ctx, text, val) => {
        const jq = $(), payload = { id: val, text };
        if (ctx.inst?.trigger) try { ctx.inst.trigger('select', { data: payload }); ctx.inst.trigger('change'); await wait(5); return true; } catch { }
        if (ctx.$sel?.length) {
            if (typeof ctx.$sel.select2 === 'function') try { ctx.$sel.select2('trigger', 'select', { data: payload }); await wait(5); return true; } catch { }
            ctx.$sel.val(val).trigger('input').trigger('change').trigger('change.select2'); await wait(5); return true;
        }
        return false;
    };

    const verify = ($c, text) => { const c = norm(dispText($c)), t = norm(text); return c === t || c.includes(t); };

    // Fill one dropdown
    const fillOne = async ($w, rText, rVal, jq, token) => {
        const shown = dispText($w);
        if (isRate(shown) && norm(shown) === norm(rText)) return { success: true, skipped: true };
        if (isCancelled(token)) return { success: false, cancelled: true };

        const ctx = findSelect($w, jq);
        if (!ctx.$sel?.length) return { success: false };

        const { value: fVal, text: fText } = ensureOpt(ctx.$sel, rText, rVal);
        const label = fText || rText;

        // Try programmatic first
        if (await setProgrammatic(ctx, label, fVal)) {
            ctx.$sel.trigger('input').trigger('change').trigger('change.select2');
            if (verify($w, label)) return { success: true };
        }

        // UI path
        for (let attempt = 0; attempt < 2; attempt++) {
            if (isCancelled(token)) return { success: false, cancelled: true };
            if (!openDrop($w, ctx.inst)) continue;

            const $panel = await waitPanel($w, jq, token);
            if (!$panel?.length) continue;

            const { $o, loading } = await waitOpts($panel, jq, label, token);
            if (loading) { closeDrop(ctx.inst); await wait(W.retryBase * (attempt + 1)); continue; }
            if (isCancelled(token)) return { success: false, cancelled: true };

            const $m = findMatch($o, label, fVal, jq);
            if ($m?.length && await clickOpt($m)) {
                ctx.$sel.trigger('input').trigger('change').trigger('change.select2');
                return { success: verify($w, label) };
            }
        }

        // Last resort programmatic
        await setProgrammatic(ctx, label, fVal);
        ctx.$sel.trigger('input').trigger('change').trigger('change.select2');
        return { success: verify($w, label) };
    };

    // === PUBLIC: Fill all dropdowns ===
    const fillDropdowns = async (ratingText, token) => {
        try {
            const jq = $();
            if (!jq || typeof jq.fn.select2 === 'undefined') return { success: false, filled: 0, failed: 0, total: 0, error: 'No jQuery/Select2' };
            const rVal = RATINGS[ratingText];
            if (!rVal) return { success: false, filled: 0, failed: 0, total: 0, error: 'Invalid rating' };

            const $all = jq('.select2-container').filter(function () { const t = dispText(jq(this)); return isPlace(t) || isRate(t); });
            const total = $all.length;
            if (!total) { if (token) emit('dropdowns', { token, total: 0, completed: true }); return { success: true, filled: 0, failed: 0, total: 0, message: 'No feedback dropdowns found' }; }

            let filled = 0, failed = 0, skipped = 0;
            emit('dropdowns', { token, total, filled: 0, failed: 0, processed: 0, remaining: total });

            for (let i = 0; i < total; i += 25) {
                if (isCancelled(token)) { emit('dropdowns', { token, total, filled, failed, cancelled: true }); return { success: false, filled, failed, total, cancelled: true }; }
                const batch = [];
                for (let j = i; j < Math.min(i + 25, total); j++)
                    batch.push(fillOne(jq($all[j]), ratingText, rVal, jq, token).catch(() => ({ success: false })));

                for (const r of await Promise.all(batch)) {
                    if (r.cancelled) break;
                    if (r.success) { r.skipped ? skipped++ : filled++; } else failed++;
                }
                emit('dropdowns', { token, total, filled, failed, processed: filled + failed, remaining: Math.max(total - filled - failed, 0) });
                await wait(10);
            }

            emit('dropdowns', { token, total, filled, failed, completed: true });
            return { success: failed === 0, filled, skipped, failed, total };
        } finally { if (token) cancelled.delete(token); }
    };

    // === PUBLIC: Fill all comments ===
    const fillComments = async (text, token) => {
        const val = (text || '').trim();
        const nodes = Array.from(document.querySelectorAll('textarea'));
        const total = nodes.length;

        if (isCancelled(token)) return { success: false, filled: 0, failed: 0, total: 0, cancelled: true };
        if (!total) { emit('comments', { token, total: 0, completed: true }); return { success: true, filled: 0, failed: 0, total: 0 }; }

        let filled = 0, failed = 0;
        for (let i = 0; i < total; i++) {
            if (isCancelled(token)) return { success: false, filled, failed, total, cancelled: true };
            try {
                const ta = nodes[i];
                if ((ta.value || '').trim() !== val) {
                    ta.value = val;
                    ta.dispatchEvent(new InputEvent('input', { bubbles: true, data: val, inputType: 'insertFromPaste' }));
                    ta.dispatchEvent(new Event('change', { bubbles: true }));
                    filled++;
                }
            } catch { failed++; }
            emit('comments', { token, total, filled, failed, processed: filled + failed, remaining: total - filled - failed });
        }
        emit('comments', { token, total, filled, failed, completed: true });
        return { success: failed === 0, filled, failed, total };
    };

    const getIdentity = () => {
        try {
            const jq = $(); if (!jq) return { name: null, regNo: null };
            let name = null, regNo = null;
            jq('span, div, label').each(function () {
                if (regNo && name) return false;
                const m = jq(this).text().trim().match(/([A-Za-z]{1,5}\d{8,})\s*-\s*([A-Za-z\s.]{3,})/);
                if (m?.[1]?.length >= 5) { regNo = m[1].trim(); name = m[2].replace(/Do Share.*|Please.*|My Courses.*/gi, '').trim(); }
            });
            return { name, regNo };
        } catch { return { name: null, regNo: null }; }
    };

    const checkDependencies = () => { const jq = $(); return { jQuery: !!jq, select2: !!jq && typeof jq.fn.select2 === 'function', dropdownCount: jq ? jq('.select2-container').length : 0 }; };

    const automator = { VERSION, version: VERSION, RATING_VALUES: RATINGS, fillDropdowns, fillComments, checkDependencies,
        cancelOperation: t => { if (!t) return { success: false }; cancel(t); return { success: true, token: t }; },
        getIdentity, getContainerDisplayText: dispText, getJQuery: $ };

    Object.defineProperty(automator, '__signature__', { value: SIG, writable: false, enumerable: false, configurable: false });
    Object.defineProperty(automator, 'verifyIntegrity', {
        value: function () {
            if (this.__signature__ !== SIG) return { valid: false };
            for (const m of REQUIRED) if (typeof this[m] !== 'function') return { valid: false };
            return { valid: true, version: VERSION };
        }, writable: false, enumerable: false, configurable: false
    });

    Object.freeze(automator);
    window.srmAutomator = automator;
    window.dispatchEvent(new CustomEvent('srmAutomatorReady', { detail: checkDependencies() }));
})();