/**
 * segmented.js — a row of option buttons as one sliding control, like the segmented controls on
 * an iPhone (11 Nov 2026): the chosen option sits on a green "thumb" that slides to the next
 * choice. Hold the mouse button (or a finger) on the row and slide to another option; letting go
 * chooses it. A click or a tap still works as before, and so do the arrow keys.
 *
 * Used for the map style tabs (Street / Satellite / Topographic), the Search Radius and the
 * Number of Records buttons. The buttons keep their own click handlers in app.js: this file only
 * moves the thumb and calls click() on the option chosen by sliding.
 */
function makeSegmented(group) {
    const buttons = [...group.querySelectorAll(':scope > button')];
    if (buttons.length < 2) return;
    group.classList.add('segmented');
    const thumb = document.createElement('span');
    thumb.className = 'seg-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    group.prepend(thumb);

    const active = () => buttons.find(b => b.classList.contains('active'));
    const place = (btn) => {
        group.classList.toggle('no-active', !btn);   // the slider can pick a number with no button
        if (!btn) return;
        thumb.style.width = `${btn.offsetWidth}px`;
        thumb.style.transform = `translateX(${btn.offsetLeft - thumb.offsetLeft}px)`;
    };
    // The button nearest to the pointer, so sliding past the ends keeps the first or last option
    const at = (x) => buttons.reduce((best, b) => {
        const r = b.getBoundingClientRect();
        const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
        return d < best.d ? { b, d } : best;
    }, { b: null, d: Infinity }).b;

    let dragging = false, over = null, startX = 0, ignoreClickUntil = 0;
    const highlight = (b) => {
        buttons.forEach(x => x.classList.toggle('seg-over', x === b));
        place(b);
    };
    group.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();   // on the map: do not start dragging the map
        dragging = true;
        startX = e.clientX;
        over = at(e.clientX);
        group.setPointerCapture(e.pointerId);
        group.classList.add('dragging');
        highlight(over);
    });
    group.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const b = at(e.clientX);
        if (b !== over) { over = b; highlight(b); }
    });
    const finish = (choose) => {
        if (!dragging) return;
        dragging = false;
        group.classList.remove('dragging');
        buttons.forEach(x => x.classList.remove('seg-over'));
        if (choose && over && !over.classList.contains('active')) over.click();   // our own click (not trusted)
        // The browser may still send its own click for the same press: ignore it, it was handled
        if (choose) ignoreClickUntil = Date.now() + 400;
        place(active());
    };
    group.addEventListener('pointerup', () => finish(true));
    group.addEventListener('pointercancel', () => finish(false));
    group.addEventListener('lostpointercapture', () => finish(false));
    // Swallow the browser's click after a press we handled; keyboard clicks (Enter, Space) still work
    group.addEventListener('click', (e) => {
        if (e.isTrusted && e.detail > 0 && Date.now() < ignoreClickUntil) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);
    // The map must not see these presses either (Leaflet listens to mouse and touch events)
    ['mousedown', 'touchstart', 'dblclick', 'wheel'].forEach(t => group.addEventListener(t, e => e.stopPropagation()));

    // Arrow keys move to the previous or next option
    group.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const i = buttons.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        const next = buttons[Math.min(buttons.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)))];
        next.focus();
        next.click();
    });

    // Keep the thumb on the chosen option, however it changes (a click, the slider, a saved search)
    new MutationObserver(() => { if (!dragging) place(active()); })
        .observe(group, { subtree: true, attributes: true, attributeFilter: ['class'] });
    new ResizeObserver(() => place(active())).observe(group);
    group.classList.add('seg-ready');   // from now on the thumb slides (not on the first placement)
    place(active());
}

document.querySelectorAll('.basemap-tabs, .radius-chips').forEach(makeSegmented);
