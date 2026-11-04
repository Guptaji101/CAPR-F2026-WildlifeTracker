/**
 * Photo viewer, shared by the Map page and the Animal Encyclopedia (usability test, 31 Oct:
 * users wanted to click a photo to see it large and to browse more photos of the animal).
 *
 * openPhotoViewer({ url, title, speciesKey }) shows the photo large in a dialog, with more photos
 * of the species underneath (api/photos.php). A click on a small photo shows it large; the arrow
 * buttons or the arrow keys show the previous / next photo; Esc or a click outside closes it.
 */

const viewer = { photos: [], index: 0, speciesKey: null };
// Photos already asked for (url -> Image), so the browser keeps them and a switch is instant
const viewerPreloaded = new Map();

// iNaturalist sends "original" photos: "large" (1024 px) is enough here, "square" for the small ones
function viewerSize(url, size) {
    return url.includes('inaturalist-open-data') ? url.replace(/\/(original|medium|small|square)\./, `/${size}.`) : url;
}

// The dialog is made the first time it is needed, so both pages only include this script
function viewerDialog() {
    let dlg = document.getElementById('photo-viewer');
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = 'photo-viewer';
    dlg.className = 'photo-viewer';
    dlg.setAttribute('aria-labelledby', 'viewer-title');
    dlg.innerHTML = `
        <button class="viewer-close" type="button" title="Close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        <h2 class="viewer-title" id="viewer-title"></h2>
        <div class="viewer-stage" id="viewer-stage">
            <button class="viewer-nav" type="button" data-step="-1" aria-label="Previous photo"><i class="fa-solid fa-chevron-left"></i></button>
            <img id="viewer-img" alt="">
            <span class="viewer-spinner" aria-hidden="true"><i class="fa-solid fa-spinner fa-spin"></i></span>
            <button class="viewer-nav" type="button" data-step="1" aria-label="Next photo"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <p class="viewer-credit" id="viewer-credit"></p>
        <div class="viewer-thumbs" id="viewer-thumbs"></div>`;
    document.body.appendChild(dlg);

    dlg.querySelector('.viewer-close').addEventListener('click', () => dlg.close());
    dlg.querySelectorAll('.viewer-nav').forEach(b =>
        b.addEventListener('click', () => showViewerPhoto(viewer.index + Number(b.dataset.step))));
    dlg.querySelector('#viewer-thumbs').addEventListener('click', e => {
        const thumb = e.target.closest('button');
        if (thumb) showViewerPhoto(Number(thumb.dataset.index));
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });   // click outside
    dlg.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') showViewerPhoto(viewer.index - 1);
        if (e.key === 'ArrowRight') showViewerPhoto(viewer.index + 1);
        // Esc closes only the viewer (the Map page would otherwise also clear the Species Profile)
        if (e.key === 'Escape') e.stopPropagation();
    });
    return dlg;
}

async function openPhotoViewer({ url, title, speciesKey }) {
    const dlg = viewerDialog();
    Object.assign(viewer, { photos: url ? [{ url }] : [], index: 0, speciesKey });
    document.getElementById('viewer-title').textContent = title || 'Photos';
    document.getElementById('viewer-img').removeAttribute('src');   // no photo of the animal opened before
    showViewerPhoto(0);
    showThumbs(speciesKey ? '<i class="fa-solid fa-spinner fa-spin"></i> Looking for more photos…' : '');
    if (!dlg.open) dlg.showModal();
    if (!speciesKey) return;

    let more = [];
    try {
        const res = await fetch(`api/photos.php?speciesKey=${speciesKey}`);
        more = (await res.json()).photos || [];
    } catch { /* no more photos: the first one stays */ }
    if (viewer.speciesKey !== speciesKey || !dlg.open) return;   // closed, or opened for another species

    // The photo that was clicked stays first (with its credit if GBIF has it); the others follow
    const same = p => url && viewerSize(p.url, 'large') === viewerSize(url, 'large');
    viewer.photos = url ? [more.find(same) || { url }, ...more.filter(p => !same(p))] : more;
    showViewerPhoto(viewer.index);
    showThumbs(viewer.photos.length > 1 ? '' : 'No other photos of this animal on GBIF yet.');
}

function showViewerPhoto(index) {
    const n = viewer.photos.length;
    const img = document.getElementById('viewer-img');
    const credit = document.getElementById('viewer-credit');
    document.querySelectorAll('.viewer-nav').forEach(b => { b.hidden = n < 2; });
    if (!n) {
        img.hidden = true;
        credit.textContent = 'No photo of this animal yet.';
        return;
    }
    viewer.index = (index + n) % n;
    const p = viewer.photos[viewer.index];
    img.hidden = false;
    img.alt = `${document.getElementById('viewer-title').textContent}, photo ${viewer.index + 1} of ${n}`;

    // iNaturalist's large photos take several seconds to arrive, the medium ones (500 px) about a
    // third of that. So the medium photo is shown first and swapped for the sharp large one when
    // it has arrived. Until then the old photo stays (dimmed, with a spinner): no empty box.
    const stage = document.getElementById('viewer-stage');
    const medium = viewerSize(p.url, 'medium'), large = viewerSize(p.url, 'large');
    const stillShown = () => viewer.photos[viewer.index]?.url === p.url;   // the user has not moved on
    const whenLoaded = (src, fn) => {
        const image = viewerPreload(src);
        if (image.complete) fn();
        else ['load', 'error'].forEach(type => image.addEventListener(type, fn, { once: true }));
    };
    if (![medium, large].includes(img.getAttribute('src'))) {
        stage.classList.add('loading');
        whenLoaded(medium, () => {
            if (!stillShown() || img.getAttribute('src') === large) return;
            img.src = medium;
            stage.classList.remove('loading');
        });
    }
    whenLoaded(large, () => { if (stillShown()) { img.src = large; stage.classList.remove('loading'); } });
    // The medium photos of all the others in the background, so the arrows switch at once
    viewer.photos.forEach(other => viewerPreload(viewerSize(other.url, 'medium')));

    // Who took it and under which licence (most are Creative Commons and must be credited)
    credit.textContent = n > 1 ? `Photo ${viewer.index + 1} of ${n}` : '';
    if (p.credit) credit.append(`${n > 1 ? ' · ' : ''}Photo: ${p.credit}${p.license ? ` (${p.license})` : ''}`);
    // The Encyclopedia's main photo usually comes from Wikipedia, which has no credit in our data
    else if (p.url.includes('wikimedia.org')) credit.append(`${n > 1 ? ' · ' : ''}Photo: Wikimedia Commons`);
    if (p.record) {
        const link = document.createElement('a');
        link.href = `https://www.gbif.org/occurrence/${p.record}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'GBIF record';
        credit.append(' · ', link);
    }
    document.querySelectorAll('#viewer-thumbs button').forEach(b => {
        const active = Number(b.dataset.index) === viewer.index;
        b.classList.toggle('active', active);
        b.setAttribute('aria-current', active);
    });
}

// Starts downloading a photo (once) and returns its Image
function viewerPreload(src) {
    if (!viewerPreloaded.has(src)) {
        const image = new Image();
        image.src = src;
        viewerPreloaded.set(src, image);
    }
    return viewerPreloaded.get(src);
}

// The row of small photos, or a short message instead
function showThumbs(message) {
    const box = document.getElementById('viewer-thumbs');
    if (message) {
        box.innerHTML = `<span class="viewer-message">${message}</span>`;
        return;
    }
    box.innerHTML = '';
    viewer.photos.forEach((p, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.index = i;
        b.setAttribute('aria-label', `Photo ${i + 1}`);
        const img = document.createElement('img');
        img.src = viewerSize(p.url, 'square');
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = () => b.remove();   // a broken photo is left out
        b.append(img);
        box.append(b);
    });
    showViewerPhoto(viewer.index);   // marks the active small photo
}
