/**
 * tilt3d.js – lets animal cards and the profile photo tilt toward the mouse (see css/depth3d.css).
 *
 * The cards are built later by encyclopedia.js / app.js, so one listener on the page handles every
 * card, including new ones. Only on a device with a mouse, and not when the user asked for less motion.
 */
(function () {
    'use strict';

    const TILT = '.sp-card, .profile-photo';
    const MAX_DEG = 8;                       // how far a card tilts at its edge

    const mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
    const calm  = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mouse.matches || calm.matches) return;

    let current = null;
    let frame = 0;

    function reset(el) {
        el.classList.remove('tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
    }

    document.addEventListener('pointermove', (e) => {
        const el = e.target.closest(TILT);
        if (current && current !== el) { reset(current); current = null; }
        if (!el) return;

        el.classList.add('tilt3d', 'tilting');
        current = el;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            const r = el.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;      // 0 … 1 from left to right
            const y = (e.clientY - r.top) / r.height;      // 0 … 1 from top to bottom
            el.style.setProperty('--ry', ((x - 0.5) * 2 * MAX_DEG).toFixed(2) + 'deg');
            el.style.setProperty('--rx', ((0.5 - y) * 2 * MAX_DEG).toFixed(2) + 'deg');
            el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
            el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
    }, { passive: true });

    document.addEventListener('pointerleave', () => { if (current) { reset(current); current = null; } });

    // Cards that are already on the page get the 3D class at once, so they lift on the first hover
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll(TILT).forEach((el) => el.classList.add('tilt3d'));
    });
})();
