// =============================================================================
// encyclopedia.js - Animal Encyclopedia page (encyclopedia.php)
// 1. The user picks a group in the sidebar (all lists are for South Korea).
// 2. api/encyclopedia.php?action=top lists the group's most-recorded species (GBIF).
// 3. Each card is filled from api/species.php (taxonomy, photo, Wikipedia summary).
// 4. Clicking a card opens the detail dialog, with extra facts from action=facts, and (17 Nov) a
//    photo slideshow, a sound ("Listen"), "When to see it" (sightings per month, action=extras)
//    and "Where in Korea" (GBIF's map of the sightings). The page starts with an "Animal of the day".
// =============================================================================

const $ = id => document.getElementById(id);
const COUNTRY = 'KR';                // the Encyclopedia only covers South Korea
// list = the species of the open group; openAfterLoad = a species to open once the list is shown
// openedKey: species in the dialog; kind: a searched kind of animal ("Deer") shown inside its group
const state = { group: null, kind: null, list: [], openAfterLoad: null, openedKey: null };
const speciesCache = new Map();   // speciesKey -> promise of species.php data (one request each)

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n).toLocaleString('en-US');

// IUCN Red List categories: label and badge color
const IUCN = {
    LC: ['Least Concern', '#2f9e44'], NT: ['Near Threatened', '#74b816'], VU: ['Vulnerable', '#f59f00'],
    EN: ['Endangered', '#e8590c'], CR: ['Critically Endangered', '#e03131'], EW: ['Extinct in the Wild', '#862e9c'],
    EX: ['Extinct', '#212529'], DD: ['Data Deficient', '#868e96'], NE: ['Not Evaluated', '#adb5bd'],
};

async function getJson(url) {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

// The photos and the extras of an animal are asked for once per page (17 Nov) and can be asked
// for early: when the mouse goes over an animal (or a finger touches it), so they are often ready
// when the window opens. The server keeps them too, so the second visitor gets them at once.
const earlyCache = new Map();
function getOnce(url) {
    if (!earlyCache.has(url)) earlyCache.set(url, getJson(url).catch(e => { earlyCache.delete(url); throw e; }));
    return earlyCache.get(url);
}
const photosUrl = key => `api/photos.php?speciesKey=${key}`;
const extrasUrl = key => `api/encyclopedia.php?action=extras&speciesKey=${key}`;
function warmUp(key) {
    if (!key) return;
    getOnce(photosUrl(key)).catch(() => {});
    getOnce(extrasUrl(key)).catch(() => {});
}
['pointerenter', 'touchstart', 'focusin'].forEach(type => document.addEventListener(type, e => {
    const el = e.target.closest?.('[data-key]');
    if (el) warmUp(Number(el.dataset.key));
}, { capture: true, passive: true }));

function getSpecies(key) {
    if (!speciesCache.has(key)) {
        speciesCache.set(key, getJson(`api/species.php?speciesKey=${key}`).catch(() => null));
    }
    return speciesCache.get(key);
}

// Runs fn over items with at most `limit` running at once (gentle on GBIF and Wikipedia)
async function eachLimited(items, limit, fn) {
    let next = 0;
    const worker = async () => { while (next < items.length) await fn(items[next++]); };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// -----------------------------------------------------------------------------
// Group selection
// -----------------------------------------------------------------------------
function currentGroupButton() {
    return document.querySelector(`.tree-item[data-key="${state.group}"]`);
}

// The view on screen: a group ("birds"), or a searched kind inside it ("birds:1450" = owls)
const viewKey = () => state.group + (state.kind ? `:${state.kind.keys}` : '');

function showIntro(btn, total) {
    const d = btn.dataset;
    const kind = state.kind;   // a searched kind of animal ("Deer"), shown inside its group
    // Search results across all groups ("Animals called "cat"") are not inside one group: no group
    // in the crumbs, a search icon, and no group highlighted in the tree (see loadGroup)
    $('crumbs').textContent = kind?.keyword ? `Animals › Search › ${kind.name}`
        : `Animals › ${d.division} › ${d.name}${kind ? ` › ${kind.name}` : ''}`;
    $('intro-icon').innerHTML = kind?.keyword ? '<i class="fa-solid fa-magnifying-glass"></i>' : btn.querySelector('.tree-icon').innerHTML;
    $('intro-icon').style.cssText = kind?.keyword ? 'color:var(--green-700);background:var(--green-50)' : `color:${d.color};background:${d.color}1f`;
    // A searched word with several animals ("pige": the pigeons) shows them all (16 Nov)
    $('intro-name').textContent = kind?.keyword ? `Animals called ${kind.name}` : kind ? `${kind.name} (all kinds)` : d.name;
    $('intro-latin').textContent = kind ? (kind.scientificName || '') : d.latin;
    $('intro-desc').textContent = kind?.keyword
        ? `Every animal of South Korea whose name fits ${kind.name}, most records first${groupsOf(kind.keys)}. Click a card to read about it, or a group on the left to see the whole group.`
        : kind
        ? `Every kind of ${kind.name.toLowerCase()} recorded in South Korea (part of the ${d.name.toLowerCase()} group). Click a group on the left to see the whole group again.`
        : d.desc;
    // The group search names the open group, e.g. "Search insects…"; on search results it only
    // filters the cards shown (16 Nov)
    $('group-search-input').placeholder = kind?.keyword ? 'Filter matching animals…' : `Search ${d.name.toLowerCase()}…`;
    $('group-search-label').textContent = kind?.keyword ? 'Filter matching animals' : `Search ${d.name.toLowerCase()}`;
    $('intro-facts').innerHTML = total === undefined
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Asking GBIF for the most-recorded species…'
        : `<b>${fmt(total)}</b> records in South Korea on GBIF. Below are the most-recorded species in South Korea, most records first.`;
}

async function loadGroup() {
    const btn = currentGroupButton();
    // On search results across groups no group is highlighted (they are not limited to it)
    document.querySelectorAll('.tree-item').forEach(b => b.classList.toggle('active', b === btn && !state.kind?.keyword));
    history.replaceState(null, '', `#${state.group}`);
    $('tree-current').textContent = btn.dataset.name;
    showIntro(btn);

    const grid = $('species-grid');
    grid.innerHTML = Array.from({ length: 8 }, () => '<div class="sp-card skeleton"></div>').join('');

    const requested = viewKey();
    const taxa = state.kind ? state.kind.keys.join(',') : btn.dataset.taxa;
    let data;
    try {
        data = await getJson(`api/encyclopedia.php?action=top&taxa=${taxa}&country=${COUNTRY}`);
    } catch (e) {
        if (requested !== viewKey()) return;   // an error of a group the user has already left
        grid.innerHTML = `<div class="grid-message"><i class="fa-solid fa-triangle-exclamation"></i>
            Could not load the list from GBIF (${escapeHtml(e.message)}).
            <button class="btn-primary" onclick="loadGroup()">Try again</button></div>`;
        return;
    }
    if (requested !== viewKey()) return;   // the user already chose another group

    showIntro(btn, data.total);
    if (!data.species.length) {
        grid.innerHTML = '<div class="grid-message">GBIF has no records of this group in South Korea yet.</div>';
        return;
    }
    grid.innerHTML = data.species.map(s => cardHtml(s, null)).join('');
    state.list = data.species;
    filterCards();   // the box may still hold a word typed before the cards arrived
    if (state.openAfterLoad) {
        openSpecies(state.openAfterLoad, state.openRecords);   // records: known when opened from the search
        state.openAfterLoad = state.openRecords = null;
    }
    await eachLimited(data.species, 6, async s => {
        // The user opened another group: stop loading this one, so the new group's cards load
        // first and the server is not kept busy with cards nobody sees
        if (requested !== viewKey()) return;
        const sp = await getSpecies(s.speciesKey);
        const card = grid.querySelector(`[data-key="${s.speciesKey}"]`);
        if (card && requested === viewKey()) {
            card.outerHTML = cardHtml(s, sp);
            filterCards();   // a card that just got its name follows the filter being typed
        }
    });
}

// Instant card filter (16 Nov): while the user types in "Search mammals…", the cards on the page
// narrow down to the ones that fit every typed word, in the name, scientific name or summary
// ("black bear", "korea endemic"). Small typos count too ("sqirrel"). The suggestion list under
// the box works as before; an empty box shows all cards again.
function filterCards() {
    const grid = $('species-grid');
    const words = $('group-search-input').value.trim().toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    const cards = [...grid.querySelectorAll('.sp-card[data-key]:not(.loading)')];
    let shown = 0;
    for (const card of cards) {
        const text = card.textContent.toLowerCase();
        const textWords = text.split(/[^a-z가-힣ㄱ-ㅎ0-9]+/);
        // a word fits when it is in the text, or (4+ letters) one letter away from one of its words
        const fits = w => text.includes(w) || (w.length >= 4 && textWords.some(t =>
            Math.abs(t.length - w.length) <= 1 && editDistance(w, t) <= 1));
        const ok = words.every(fits);
        card.style.display = ok ? '' : 'none';
        if (ok) shown++;
    }
    let note = $('card-filter-note');
    if (!note) {
        note = document.createElement('p');
        note.id = 'card-filter-note';
        note.className = 'card-filter-note';
        note.setAttribute('aria-live', 'polite');
        grid.before(note);
    }
    note.hidden = !words.length || !cards.length;
    note.textContent = shown
        ? `${shown} of ${cards.length} cards fit "${$('group-search-input').value.trim()}".`
        : `No card on this page fits "${$('group-search-input').value.trim()}". ` + (state.kind?.keyword
            ? 'Clear this box to see all the results again.'
            : `Press Enter to search all ${groupButton(state.group).dataset.name.toLowerCase()}.`);
}

// -----------------------------------------------------------------------------
// Cards and detail dialog
// -----------------------------------------------------------------------------
// English name if known, in Title Case like on the Map page ("Eurasian Red Squirrel";
// toTitleCase in animal-search.js); else the scientific name as it is
function displayName(sp) {
    if (sp?.vernacularName) return toTitleCase(sp.vernacularName, sp.scientificName || sp.species);
    return sp?.species || 'Unnamed species';
}

// Wikipedia summary, or a short description from the taxonomy when there is no English article
function summaryText(sp) {
    if (sp?.summary) return sp.summary;
    if (!sp) return 'Details could not be loaded from GBIF.';
    const where = [sp.family && `the ${sp.family} family`, sp.order && `order ${sp.order}`].filter(Boolean).join(', ');
    return `${where ? `A member of ${where}. ` : ''}There is no English Wikipedia article about this species yet.`;
}

// Link to the Map page showing only this species. The Map remembers the last searched place,
// so the user sees this species' sightings around that place (for example Gwacheon).
function mapLink(key, name) {
    return `<a class="btn-outline" href="index.php?species=${key}&name=${encodeURIComponent(name)}"><i class="fa-regular fa-map"></i> See ${escapeHtml(name)} on the map</a>`;
}

// Phones: the group tree is folded away behind the "Animal group" button
function setTreeOpen(open) {
    $('ency-layout').classList.toggle('tree-open', open);
    $('tree-toggle').setAttribute('aria-expanded', open);
}

// Photo box: the group icon sits underneath, so it shows if there is no photo or it fails to load
function photoHtml(sp, cls) {
    const icon = currentGroupButton().querySelector('.tree-icon').innerHTML;
    const img = sp && sp.imageUrl
        ? `<img src="${escapeHtml(sp.imageUrl)}" alt="${escapeHtml(sp.vernacularName || sp.species || '')}" loading="lazy" onerror="this.remove()">`
        : '';
    // The dialog's photo opens the photo viewer (js/photo-viewer.js), also without a photo of its own
    const more = cls === 'detail-photo'
        ? '<button class="photo-expand" type="button"><i class="fa-solid fa-expand"></i> More photos</button>' : '';
    return `<div class="${cls}">${icon}${img}${more}</div>`;
}

// On search results across groups ("Animals called "cat"") each card names its animal group, as a
// small badge in the group's colour and icon from the tree (16 Nov: the tree no longer shows one)
function groupOfKey(key) {
    const a = animalList?.find(x => x.k === key) || EVERYDAY_ANIMALS.find(x => x.k === key);
    return a ? groupOfAnimal(a) : null;
}
// "in Birds (5) and Insects (1)": the groups of the found animals, for the results description
function groupsOf(keys) {
    const counts = new Map();
    for (const k of keys) {
        const name = groupButton(groupOfKey(k))?.dataset.name;
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
    }
    const parts = [...counts].map(([name, n]) => `${name} (${n})`);
    if (!parts.length) return '';
    return `, in ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]}`;
}
function groupBadge(key) {
    const btn = groupButton(groupOfKey(key));
    if (!btn) return '';
    return `<span class="sp-group" style="color:${btn.dataset.color};background:${btn.dataset.color}1a">
        ${btn.querySelector('.tree-icon').innerHTML} ${escapeHtml(btn.dataset.name)}</span>`;
}

function cardHtml(s, sp) {
    if (sp === null && !speciesCache.has(s.speciesKey)) {
        return `<article class="sp-card loading" data-key="${s.speciesKey}"><div class="sp-photo"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <div class="sp-body">${state.kind?.keyword ? groupBadge(s.speciesKey) : ''}<h3>Loading…</h3></div></article>`;
    }
    const name = displayName(sp);
    // A click anywhere on the card opens it. For the keyboard and screen readers the name is a
    // real button inside the heading (a card with role="button" hid its heading from screen
    // readers: accessibility scan, 31 Oct); its click reaches the card, so it opens it too.
    return `<article class="sp-card" data-key="${s.speciesKey}" onclick="openSpecies(${s.speciesKey}, ${s.records})">
        ${photoHtml(sp, 'sp-photo')}
        <div class="sp-body">
            ${state.kind?.keyword ? groupBadge(s.speciesKey) : ''}
            <h3><button type="button" class="sp-open">${escapeHtml(name)}</button></h3>
            <p class="sp-sci">${escapeHtml(sp?.species || '')}</p>
            <p class="sp-summary">${escapeHtml(summaryText(sp))}</p>
            <span class="sp-records"><i class="fa-solid fa-location-dot"></i> ${fmt(s.records)} records</span>
        </div>
    </article>`;
}

async function openSpecies(key, records) {
    // If the user opens another card before this one has loaded, this one is out of date
    const opened = state.openedKey = key;
    const sp = await getSpecies(key);
    if (opened !== state.openedKey) return;
    const name = displayName(sp);
    const ranks = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'];
    $('species-detail').innerHTML = `
        ${photoHtml(sp, 'detail-photo')}
        <div class="detail-body">
            <h2>${escapeHtml(name)}</h2>
            <p class="sp-sci">${escapeHtml(sp?.scientificName || '')}</p>
            <div class="detail-badges" id="detail-badges"><span class="badge muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading facts…</span></div>
            <div class="detail-listen" id="detail-listen"></div>
            <p class="detail-summary">${escapeHtml(summaryText(sp))}</p>
            <h4>Classification</h4>
            <p class="detail-taxonomy">${ranks.filter(r => sp?.[r]).map(r => `<span title="${r}">${escapeHtml(sp[r])}</span>`).join(' › ') || 'Not available'}</p>
            <div class="detail-extras">
                <div class="extra-box">
                    <h4>When to see it</h4>
                    <div id="detail-months" class="months-chart" aria-live="polite"><span class="badge muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading…</span></div>
                </div>
                <div class="extra-box">
                    <h4>Where in Korea</h4>
                    ${koreaMapHtml(key, name)}
                </div>
            </div>
            <div class="detail-links">
                ${sp?.wikiUrl ? `<a class="btn-primary" href="${escapeHtml(sp.wikiUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-wikipedia-w"></i> Read more on Wikipedia</a>` : ''}
                <a class="btn-outline" href="https://www.gbif.org/species/${key}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Explore on GBIF</a>
                ${mapLink(key, name)}
            </div>
        </div>`;
    $('species-dialog').showModal();
    $('species-detail').querySelector('.detail-photo').addEventListener('click', () =>
        openPhotoViewer({ url: sp?.imageUrl, title: name, speciesKey: key }));
    startSlideshow(key, sp?.imageUrl, opened);
    loadExtras(key, opened);

    // Conservation status from GBIF; the record count is the one from the South Korea list
    // (unknown if the species was opened from the Map page and is not in the top 24)
    records ??= state.list.find(s => s.speciesKey === key)?.records;
    const korea = records == null ? ''
        : `<span class="badge muted"><i class="fa-solid fa-location-dot"></i> ${fmt(records)} records in South Korea</span>`;
    try {
        const f = await getJson(`api/encyclopedia.php?action=facts&speciesKey=${key}`);
        if (opened !== state.openedKey) return;   // the dialog now shows another species
        const [label, color] = IUCN[f.iucn?.code] || IUCN.NE;
        $('detail-badges').innerHTML =
            `<span class="badge" style="background:${color}" title="IUCN Red List of Threatened Species">${label}</span> ${korea}`;
    } catch {
        if (opened === state.openedKey) $('detail-badges').innerHTML = korea;
    }
}

// -----------------------------------------------------------------------------
// Animal window extras (17 Nov): slideshow, Listen, When to see it, Where in Korea
// -----------------------------------------------------------------------------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const extras = { timer: null, audio: null };

// The photo changes every 4 seconds: the animal's main photo first, then photos of sightings in
// Korea (photos.php, the same as "More photos"). A click still opens the photo viewer. Without
// motion (prefers-reduced-motion) only the dots change it.
async function startSlideshow(key, mainUrl, opened) {
    const box = $('species-detail').querySelector('.detail-photo');
    let urls = [];
    try { urls = (await getOnce(photosUrl(key))).photos.map(p => p.url); } catch { return; }
    if (opened !== state.openedKey || !box) return;
    urls = [...new Set([mainUrl, ...urls].filter(Boolean))].slice(0, 6);
    if (urls.length < 2) return;
    const first = box.querySelector('img');
    if (first) first.classList.add('slide', 'on');
    urls.slice(first ? 1 : 0).forEach(u => {
        const img = document.createElement('img');
        // Loaded at once (not "lazy"), so the next photo is ready when its turn comes (17 Nov)
        img.src = u; img.alt = ''; img.decoding = 'async'; img.className = 'slide';
        img.onerror = () => img.remove();
        box.insertBefore(img, box.querySelector('.photo-expand'));
    });
    const dots = document.createElement('div');
    dots.className = 'slide-dots';
    dots.innerHTML = urls.map((_, i) => `<button type="button" aria-label="Photo ${i + 1} of ${urls.length}"></button>`).join('');
    box.append(dots);
    let i = 0;
    const show = (n, auto) => {
        const slides = [...box.querySelectorAll('img.slide')];
        i = (n + slides.length) % slides.length;
        // By itself the slideshow waits for a photo that is still loading instead of showing a blank
        if (auto && !slides[i].complete) { i = (i - 1 + slides.length) % slides.length; return; }
        slides.forEach((s, j) => s.classList.toggle('on', j === i));
        dots.querySelectorAll('button').forEach((d, j) => d.classList.toggle('on', j === i));
    };
    // A dot shows its photo (the click must not also open the photo viewer)
    dots.addEventListener('click', e => {
        const d = e.target.closest('button');
        if (!d) return;
        e.stopPropagation();
        show([...dots.children].indexOf(d));
    });
    show(0);
    clearInterval(extras.timer);
    if (!calm()) extras.timer = setInterval(() => { if (!box.matches(':hover')) show(i + 1, true); }, 4000);
}

// A small map of South Korea with red areas where the animal was seen: 4 map tiles (zoom 6) from
// OpenStreetMap with GBIF's map of the sightings on top, in hexagons (red.poly; single dots were
// yellow and hard to see, 17 Nov). Images only, nothing to install. A click opens the Map page
// with this animal, like "See … on the map".
function koreaMapHtml(key, name) {
    const tile = (x, y) => `<span style="background-image:url(https://tile.openstreetmap.org/6/${x}/${y}.png)">
        <img src="https://api.gbif.org/v2/map/occurrence/density/6/${x}/${y}@1x.png?taxonKey=${key}&country=KR&style=red.poly&bin=hex&hexPerTile=28" alt="" loading="lazy" onerror="this.remove()"></span>`;
    return `<a class="korea-map" href="index.php?species=${key}&name=${encodeURIComponent(name)}"
            aria-label="Map of South Korea with the places where ${escapeHtml(name)} was seen. Open it on the Map page"
            title="See ${escapeHtml(name)} on the Map page">
            <span class="korea-tiles">${tile(54, 24)}${tile(55, 24)}${tile(54, 25)}${tile(55, 25)}</span>
            <span class="korea-open"><i class="fa-regular fa-map"></i> Open on the map</span>
        </a>
        <p class="extra-note">Red: areas where it was seen. Map © OpenStreetMap, data GBIF.</p>`;
}

// "Listen" and "When to see it" come from api/encyclopedia.php?action=extras
async function loadExtras(key, opened) {
    let x = null;
    try { x = await getOnce(extrasUrl(key)); } catch { /* shown below */ }
    if (opened !== state.openedKey) return;
    // When to see it: 12 bars, the 3 busiest months dark
    const months = x?.months || [];
    const max = Math.max(0, ...months);
    if (!max) {
        $('detail-months').innerHTML = '<p class="extra-note">No dated sightings in South Korea yet.</p>';
    } else {
        const top = months.map((n, i) => [n, i]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(t => t[1]);
        const best = [...top].sort((a, b) => a - b).map(i => MONTHS[i]);
        $('detail-months').innerHTML = `
            <div class="months-bars">${months.map((n, i) => `<span class="${top.includes(i) ? 'top' : ''}" style="height:${Math.max(4, n / max * 100)}%"
                title="${MONTHS[i]}: ${fmt(n)} sightings"></span>`).join('')}</div>
            <div class="months-labels">${MONTHS.map(m => `<span>${m[0]}</span>`).join('')}</div>
            <p class="extra-note">Seen most in <b>${best.slice(0, -1).join(', ')} and ${best.at(-1)}</b>.</p>`;
    }
    // Listen: only when a recording exists
    const s = x?.sound;
    if (!s) return;
    $('detail-listen').innerHTML = `
        <button type="button" class="listen-btn" aria-pressed="false"><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span> <span class="listen-label">Listen</span></button>
        <span class="extra-note">Sound: ${escapeHtml(s.credit || 'unknown')}${s.license ? ` (${escapeHtml(s.license)})` : ''}, recorded ${s.korea ? 'in South Korea' : 'outside Korea'} ·
            <a href="https://www.gbif.org/occurrence/${s.record}" target="_blank" rel="noopener noreferrer">GBIF record</a></span>`;
    const btn = $('detail-listen').querySelector('.listen-btn');
    const set = (playing, loading) => {
        btn.classList.toggle('playing', playing && !loading);
        btn.classList.toggle('loading', !!loading);
        btn.setAttribute('aria-pressed', String(playing));
        btn.querySelector('.listen-label').textContent = loading ? 'Loading…' : playing ? 'Stop' : 'Listen';
    };
    // The sound starts loading when the mouse goes over the button, a moment before the click
    const prepare = () => {
        if (extras.audio && extras.audio.dataset.key === String(key)) return;
        extras.audio?.pause();
        extras.audio = new Audio();
        extras.audio.preload = 'auto';
        extras.audio.src = s.url;
        extras.audio.dataset.key = key;
        extras.audio.addEventListener('ended', () => set(false));
        // "Loading…" while the sound is not ready yet (big files), then "Stop"
        extras.audio.addEventListener('waiting', () => { if (!extras.audio.paused) set(true, true); });
        extras.audio.addEventListener('playing', () => set(true));
        extras.audio.addEventListener('error', () => { set(false); btn.disabled = true; btn.querySelector('.listen-label').textContent = 'Sound not available'; });
    };
    btn.addEventListener('pointerenter', prepare);
    btn.addEventListener('focus', prepare);
    btn.addEventListener('click', () => {
        prepare();
        if (extras.audio.paused) { set(true, extras.audio.readyState < 3); extras.audio.play().catch(() => set(false)); }
        else { extras.audio.pause(); set(false); }
    });
}

// Closing the window stops the slideshow and the sound
$('species-dialog').addEventListener('close', () => {
    clearInterval(extras.timer);
    extras.audio?.pause();
    state.openedKey = null;
});

// -----------------------------------------------------------------------------
// Animals of the day (17 Nov): 5 of the 120 best-known animals with an English name, different
// ones each day (the same for everyone on that day). They slide past one by one, 4 seconds each,
// and after 20 seconds the card folds away. Pointing at it (or focusing it) pauses it; a click on
// an animal opens it; the arrows and dots move by hand (then it stays open); × closes the card. Without motion (prefers-reduced-motion) nothing moves
// by itself: the dots show the other animals.
// -----------------------------------------------------------------------------
const AOD_COUNT = 5, AOD_SECONDS = 4;
async function showAnimalOfDay() {
    await loadAnimalList();
    const pool = (animalList || []).slice(0, 120).filter(a => a.n);
    if (pool.length < AOD_COUNT) return;
    const day = Math.floor(Date.now() / 86400000);
    const picks = Array.from({ length: AOD_COUNT }, (_, i) => pool[(day * AOD_COUNT + i) % pool.length]);
    const species = await Promise.all(picks.map(a => getSpecies(a.k)));
    const box = $('animal-of-day');
    box.innerHTML = `
        <div class="aod-track">${picks.map((a, i) => {
            const sp = species[i];
            const name = displayName(sp) || a.n;
            return `<article class="aod-slide" data-i="${i}" data-key="${a.k}" aria-hidden="${i ? 'true' : 'false'}">
                ${sp?.imageUrl ? `<img src="${escapeHtml(sp.imageUrl)}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.remove()">` : '<span class="aod-noimg"></span>'}
                <div class="aod-text">
                    <span class="aod-tag"><i class="fa-solid fa-star"></i> Animals of the day · ${i + 1} of ${AOD_COUNT}</span>
                    <h2><button type="button" class="aod-open" ${i ? 'tabindex="-1"' : ''}>${escapeHtml(name)}</button></h2>
                    <p><i>${escapeHtml(a.s)}</i> · ${fmt(a.r)} records in South Korea${a.ko?.[0] ? ` · ${escapeHtml(a.ko[0])}` : ''}</p>
                    <p class="aod-summary">${escapeHtml(summaryText(sp))}</p>
                </div>
            </article>`;
        }).join('')}</div>
        <div class="aod-dots">${picks.map((_, i) => `<button type="button" aria-label="Animal ${i + 1} of ${AOD_COUNT}"></button>`).join('')}</div>
        <button type="button" class="aod-arrow aod-prev" aria-label="Previous animal"><i class="fa-solid fa-chevron-left"></i></button>
        <button type="button" class="aod-arrow aod-next" aria-label="Next animal"><i class="fa-solid fa-chevron-right"></i></button>
        <button type="button" class="aod-close" aria-label="Close the animals of the day">×</button>`;
    box.hidden = false;

    let index = 0, timer = null, paused = false;
    const show = (n) => {
        index = n;
        warmUp(picks[n].k);   // its photos and sound are ready if it is clicked
        box.querySelector('.aod-track').style.transform = `translateX(-${n * 100}%)`;
        box.querySelectorAll('.aod-slide').forEach((s, j) => {
            s.setAttribute('aria-hidden', String(j !== n));
            s.querySelector('.aod-open').tabIndex = j === n ? 0 : -1;
        });
        box.querySelectorAll('.aod-dots button').forEach((d, j) => d.classList.toggle('on', j === n));
    };
    const close = () => {
        clearInterval(timer);
        box.classList.add('aod-closing');
        setTimeout(() => { box.hidden = true; box.classList.remove('aod-closing'); }, 600);
    };
    // Every 4 seconds the next animal; after the 5th, the card folds away (20 seconds in all)
    const tick = () => {
        if (paused) return;
        if (index + 1 < AOD_COUNT) show(index + 1);
        else close();
    };
    show(0);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(tick, AOD_SECONDS * 1000);
    box.addEventListener('mouseenter', () => { paused = true; });
    box.addEventListener('mouseleave', () => { paused = false; });
    box.addEventListener('focusin', () => { paused = true; });
    box.addEventListener('focusout', () => { paused = false; });
    box.addEventListener('click', e => {
        if (e.target.closest('.aod-close')) return close();
        // Arrows and dots: the user is browsing, so the card stops moving and stays open
        const arrow = e.target.closest('.aod-arrow');
        if (arrow) { clearInterval(timer); return show((index + (arrow.classList.contains('aod-prev') ? -1 : 1) + AOD_COUNT) % AOD_COUNT); }
        const dot = e.target.closest('.aod-dots button');
        if (dot) { clearInterval(timer); return show([...dot.parentElement.children].indexOf(dot)); }
        const slide = e.target.closest('.aod-slide');
        if (!slide) return;
        const a = picks[Number(slide.dataset.i)];
        clearInterval(timer);   // the user picked one: it stays
        openAnimal(a.k, groupOfAnimal(a), a.r);
    });
}

// -----------------------------------------------------------------------------
// Search: "Search all animals" at the top, and "Search mammals…" inside each group
// -----------------------------------------------------------------------------
// data/korea-animals.json lists the 2000 animals with the most GBIF records in South Korea
// (made by tools/build-animal-list.php; the Map page uses it too). It is loaded once and
// searched in the browser, so suggestions appear while typing without asking the server.
let animalList = null, animalListLoading = null;
function loadAnimalList() {
    animalListLoading ??= fetch(`data/korea-animals.json?v=${document.querySelector('meta[name=animal-list-version]')?.content || ''}`)        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(list => { animalList = list; })
        // no list (server restarting): use none for now, and try again at the next search
        .catch(() => { animalList = []; animalListLoading = null; });
    return animalListLoading;
}

// Each group of the tree with its GBIF taxon keys (data-taxa), e.g. ['insects', [216]]
const GROUP_KEYS = [...document.querySelectorAll('.tree-item')].map(b => [b.dataset.key, b.dataset.taxa.split(',').map(Number)]);
// The group of an animal of the list: the group whose keys contain its phylum, class or order key
function groupOfAnimal(a) {
    return GROUP_KEYS.find(([, keys]) => (a.t || []).some(k => keys.includes(k)))?.[0] || null;
}
const groupButton = key => document.querySelector(`.tree-item[data-key="${key}"]`);

// The 8 best-known animals (most records first; the list is in that order) that the typed text
// fits, with the same rules as the Map page (findByKeyword in animal-search.js: everyday names
// first, whole words before parts of words, Korean names: "고라니" = water deer); only one group
// if `group` is given
function matchAnimals(text, group = null, max = 8) {
    return inGroup(findByKeyword(animalList, text), group, max);
}
// Similar names when nothing fits (typos: "sparow" -> sparrows), the same as on the Map page
function similarAnimals(text, group = null) {
    return inGroup(similarNames(animalList, text, 50), group);
}
function inGroup(animals, group, max = 8) {
    return animals
        .map(a => ({ ...a, g: groupOfAnimal(a) }))
        // In a group: only that group. At the top: all animals, also the few without a group in the
        // tree (millipedes, barnacles…): their card opens without changing the group.
        .filter(a => !group || a.g === group)
        .slice(0, max);
}

function boldMatch(name, text) {
    const i = name.toLowerCase().indexOf(text.trim().toLowerCase());
    if (i < 0 || !text.trim()) return escapeHtml(name);
    const end = i + text.trim().length;
    return `${escapeHtml(name.slice(0, i))}<b>${escapeHtml(name.slice(i, end))}</b>${escapeHtml(name.slice(end))}`;
}

// Draws a suggestion list: each animal with its group icon, names, group and Korean records.
// `message` (instead of animals) explains why there is nothing to show.
function renderList(inputId, boxId, animals, typed, { message = '' } = {}) {
    const box = $(boxId);
    if (!animals.length && !message) return hideList(inputId, boxId);
    box.innerHTML = (message ? `<div class="suggest-message">${message}</div>` : '')
        + animals.map((a, i) => {
            const btn = groupButton(a.g);
            const icon = btn ? `<span class="group-icon" style="background:${btn.dataset.color};width:22px;height:22px;font-size:11px">${btn.querySelector('.tree-icon').innerHTML}</span>` : '<i class="fa-solid fa-paw"></i>';
            const name = a.n ? toTitleCase(a.n) : a.s;
            // a Korean search shows the Korean name it found ("Chinese Water Deer · 고라니")
            const ko = HANGUL.test(typed) ? (a.ko || []).find(n => n.includes(typed.trim())) : '';
            const where = [btn?.dataset.name, a.r ? `${fmt(a.r)} records in Korea` : ''].filter(Boolean).join(' · ');
            return `<button type="button" role="option" id="${boxId}-${i}" data-key="${a.k}" data-group="${a.g || ''}" data-records="${a.r || ''}"
                    aria-label="${escapeHtml([name, btn?.dataset.name].filter(Boolean).join(', '))}">
                ${icon}
                <span class="suggest-text">
                    <span class="suggest-main">${boldMatch(name, typed)}${ko ? ` · ${boldMatch(ko, typed)}` : ''}</span>
                    <span class="suggest-sub">${a.n ? `<i>${boldMatch(a.s, typed)}</i> · ` : ''}${escapeHtml(where)}</span>
                </span>
            </button>`;
        }).join('');
    box.hidden = false;
    $(inputId).setAttribute('aria-expanded', 'true');
}

function hideList(inputId, boxId) {
    $(boxId).hidden = true;
    $(inputId).setAttribute('aria-expanded', 'false');
    $(inputId).removeAttribute('aria-activedescendant');
}

// Open an animal: switch to its group first if needed, then open its detail dialog
function openAnimal(key, group, records) {
    hideList('ency-search-input', 'ency-suggest');
    hideList('group-search-input', 'group-suggest');
    records = records ? Number(records) : undefined;
    if (group && group !== state.group) {
        state.group = group;
        state.kind = null;
        state.openAfterLoad = key;      // opens once the group's list is shown (see loadGroup)
        state.openRecords = records;
        loadGroup();
        if (window.matchMedia('(max-width: 820px)').matches) setTreeOpen(false);
    } else {
        openSpecies(key, records);
    }
}

// Enter in "Search all animals": an exact name of the list opens at once; any other name is
// looked up like on the Map page (api/animal.php: scientific name, Wikipedia, common names)
let searchId = 0;
async function searchAll() {
    const typed = $('ency-search-input').value.trim();
    if (!typed) return;
    rememberSearch(typed);   // for "Recent searches" when the box is empty
    await loadAnimalList();
    const groupBtn = groupByWord(typed);
    if (groupBtn) { hideList('ency-search-input', 'ency-suggest'); return groupBtn.click(); }
    // One card opens at once only for an animal's full name that no other animal fits ("wild boar",
    // "고라니", "wild hen"). Any other word shows its results as cards (16 Nov: "cat" opened only the
    // domestic Cat, though the Leopard cat fits too, while "duck" showed all ducks).
    const matches = matchAnimals(typed, null, 24);   // up to 24 as cards; the list shows 8
    if (matches.length === 1 && isFullName(matches[0], typed)) return openAnimal(matches[0].k, matches[0].g, matches[0].r);

    // The animals of the list that fit the word stay in the list (to click) while the server is
    // asked for a whole kind ("bat": all bats, which the list does not have) or a name it knows
    const id = ++searchId;
    const said = `"${escapeHtml(typed)}"`;
    renderList('ency-search-input', 'ency-suggest', matches.slice(0, 8), typed,
        { message: `<i class="fa-solid fa-spinner fa-spin"></i> Looking for all kinds of ${said}…` });
    let data;
    try { data = await getJson(`api/animal.php?q=${encodeURIComponent(typed)}`); }
    catch (e) { data = { error: e.message }; }
    if (id !== searchId) return;   // the user searched again meanwhile

    const found = data.found;
    // A whole kind that the word names ("bat", "deer", "snakes"): its cards
    if (isKindFor(found, typed)) return showKind(found);
    // Animals of the list that fit the word: their cards ("pige": the pigeons; "cat": Cat and Leopard
    // cat; "dog": the Raccoon dog), under the user's word (it is not swapped for another name)
    if (matches.length) return showMatches(typed, matches);
    // A name the server knows that fits the word ("tiger" -> Tiger, "Pica pica")
    const re = keywordRegex(typed);
    if (found && [found.name, found.scientificName].some(n => n && re.test(n.toLowerCase()))) {
        if (found.group) return showKind(found);   // several animals of that name ("snake")
        const a = animalList.find(x => x.k === found.key);
        return openAnimal(found.key, a ? groupOfAnimal(a) : groupOfAnimal({ t: found.path }), a?.r);
    }
    // Nothing fits: similar names, as on the Map page ("sparow" -> sparrows), and kind words
    // ("bata" -> bat: a click searches all bats; animal-search.js, #18)
    const similar = similarAnimals(typed).slice(0, 6);
    const words = similarWords(typed);
    renderList('ency-search-input', 'ency-suggest', similar, '', {
        message: similar.length || words.length ? `No animal called ${said} was found. Did you mean…`
            : `No animal called ${said} was found. Check the spelling, or try the scientific name.`,
    });
    if (words.length) $('ency-suggest').querySelector('.suggest-message').insertAdjacentHTML('afterend', wordsHtml(words, 'ency-suggest'));
}

// A whole group by its name or a word of it ("reptiles", "Insect", "shrimps" -> Crabs & shrimps):
// the group button of the tree, or null
function groupByWord(text) {
    const singular = s => s.replace(/s$/, '');
    const w = text.trim().toLowerCase();
    const forms = [w, singular(w), w.replace(/es$/, '')];
    return [...document.querySelectorAll('.tree-item')].find(b => {
        const name = b.dataset.name.toLowerCase();
        return [name, ...name.split(/\s*&\s*/)].some(part => forms.includes(singular(part)));
    }) || null;
}

// The typed text is the whole name of this animal (English, scientific, Korean, or one of its
// everyday words: "wild hen"), not only a word of it
function isFullName(a, typed) {
    const t = typed.trim().toLowerCase();
    return [a.n, a.s, ...(a.ko || []), ...(a.words || [])].some(n => n && n.toLowerCase() === t);
}

// Several animals fit the searched word ("pige": Rock Pigeon, Hill Pigeon, Japanese Wood-Pigeon):
// their cards, like a kind, instead of a list to pick from (16 Nov: picking one was annoying).
// Shown inside the group of the best-known one; at most 24 (what one card list holds).
function showMatches(typed, matches) {
    hideList('ency-search-input', 'ency-suggest');
    hideList('group-search-input', 'group-suggest');
    state.group = matches.find(a => a.g)?.g || state.group;
    state.kind = { name: `"${typed}"`, keys: matches.slice(0, 24).map(a => a.k), keyword: true };
    $('group-search-input').value = '';
    loadGroup();
    if (window.matchMedia('(max-width: 820px)').matches) setTreeOpen(false);
}

// A searched kind of animal ("deer", "snakes"): cards of all of them, inside their group
function showKind(found) {
    hideList('ency-search-input', 'ency-suggest');
    state.group = groupOfAnimal({ t: found.path }) || state.group;
    state.kind = found;
    $('group-search-input').value = '';
    loadGroup();
    if (window.matchMedia('(max-width: 820px)').matches) setTreeOpen(false);
}

// Enter in "Search mammals…": an exact name or the first suggestion of this group opens
async function searchGroup() {
    const typed = $('group-search-input').value.trim();
    // On search results the box only filters the cards shown (as you type), so Enter does nothing more
    if (state.kind?.keyword) { hideList('group-search-input', 'group-suggest'); return filterCards(); }
    if (!typed) return;
    await loadAnimalList();
    const matches = matchAnimals(typed, state.group, 24);
    // The same rule as "Search all animals": one card opens only for a full name that no other
    // animal fits; other words show their cards ("cat" in mammals: Cat and Leopard cat)
    if (matches.length === 1 && isFullName(matches[0], typed)) return openAnimal(matches[0].k, matches[0].g, matches[0].r);
    if (matches.length) return showMatches(typed, matches);
    const groupName = groupButton(state.group).dataset.name.toLowerCase();
    const similar = similarAnimals(typed, state.group).slice(0, 6);   // typos: "sparow" -> sparrows
    renderList('group-search-input', 'group-suggest', similar, '', {
        message: `No ${escapeHtml(groupName)} called "${escapeHtml(typed)}" among the 2000 animals recorded most in South Korea. `
            + (similar.length ? 'Did you mean…' : 'Try <b>Search all animals</b> at the top.'),
    });
}

// Arrow keys move through a list, Enter picks the highlighted entry (or searches), Esc closes
function onSuggestKey(e, inputId, boxId, onEnter) {
    const options = [...$(boxId).querySelectorAll('button')];
    const open = !$(boxId).hidden && options.length;
    const current = options.findIndex(b => b.classList.contains('active'));
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const next = (current + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        options.forEach((b, i) => b.classList.toggle('active', i === next));
        $(inputId).setAttribute('aria-activedescendant', options[next].id);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (open && current >= 0) options[current].click();
        else onEnter();
    } else if (e.key === 'Escape') {
        hideList(inputId, boxId);
    }
}

// Wire up one search box: suggestions while typing (all groups, or only the open group)
function setupSearch(inputId, btnId, boxId, onEnter, onlyOpenGroup) {
    const input = $(inputId), box = $(boxId);
    const top = inputId === 'ency-search-input';
    // The top box, when empty, shows the last searches (recentHtml in animal-search.js)
    const showRecent = () => {
        const html = top ? recentHtml(boxId) : '';
        if (!html) return hideList(inputId, boxId);
        box.innerHTML = html;
        box.hidden = false;
        input.setAttribute('aria-expanded', 'true');
    };
    input.addEventListener('focus', () => { loadAnimalList(); if (!input.value.trim()) showRecent(); });
    input.addEventListener('input', async () => {
        if (top) searchId++;   // a name lookup still running is out of date
        await loadAnimalList();
        const typed = input.value;
        if (!typed.trim()) return showRecent();
        if (!top && state.kind?.keyword) return hideList(inputId, boxId);   // results view: only the card filter
        renderList(inputId, boxId, matchAnimals(typed, onlyOpenGroup ? state.group : null), typed);
    });
    input.addEventListener('keydown', e => onSuggestKey(e, inputId, boxId, onEnter));
    // Close the list only when the focus has left both the box and the list: with Tab the focus
    // moves into the list, which must stay open so Enter can open the focused suggestion.
    // Esc inside the list closes it and goes back to the box.
    const inside = el => el === input || box.contains(el);
    const check = () => setTimeout(() => { if (!inside(document.activeElement)) hideList(inputId, boxId); }, 150);
    input.addEventListener('blur', check);
    box.addEventListener('focusout', check);
    box.addEventListener('keydown', e => { if (e.key === 'Escape') { hideList(inputId, boxId); input.focus(); } });
    box.addEventListener('mousedown', e => e.preventDefault());   // keep the focus in the box
    box.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (btn?.dataset.recent) {   // a recent search: search that word again
            input.value = btn.dataset.recent;
            return onEnter();
        }
        if (btn && top) rememberSearch(btn.querySelector('.suggest-main')?.textContent.split(' · ')[0] || '');
        if (btn) openAnimal(Number(btn.dataset.key), btn.dataset.group || null, btn.dataset.records);
    });
    $(btnId).addEventListener('click', onEnter);
}
setupSearch('ency-search-input', 'ency-search-btn', 'ency-suggest', searchAll, false);
setupSearch('group-search-input', 'group-search-btn', 'group-suggest', searchGroup, true);
$('group-search-input').addEventListener('input', filterCards);   // the cards narrow down as you type

// -----------------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------------
document.querySelectorAll('.tree-item').forEach(btn => btn.addEventListener('click', () => {
    state.group = btn.dataset.key;
    state.kind = null;                    // the whole group again, not a searched kind
    $('group-search-input').value = '';   // a search typed for the previous group does not apply
    loadGroup();
    if (window.matchMedia('(max-width: 820px)').matches) {
        setTreeOpen(false);
        $('group-intro').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}));
$('tree-toggle').addEventListener('click', () => setTreeOpen(!$('ency-layout').classList.contains('tree-open')));

// Close the dialog by clicking outside it
$('species-dialog').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

// The address remembers the group, e.g. encyclopedia.php#birds. The Map page links to one
// species with encyclopedia.php#birds/2481197: that species opens once the list is loaded.
const [hashGroup, hashSpecies] = location.hash.slice(1).split('/');
state.group = document.querySelector(`.tree-item[data-key="${hashGroup}"]`) ? hashGroup : 'mammals';
if (Number(hashSpecies) > 0) state.openAfterLoad = Number(hashSpecies);
loadGroup();
showAnimalOfDay();

// Links with a query also work (16 Nov): encyclopedia.php?taxonKey=7705930 opens that animal's card
// (in its group), encyclopedia.php?q=wild%20boar searches the name as if typed at the top. The
// Map page links with #group/key (above); this form is for links shared or typed by people.
const linkParams = new URLSearchParams(location.search);
const linkKey = Number(linkParams.get('taxonKey'));
const linkQuery = (linkParams.get('q') || '').trim();
if (linkKey > 0 || linkQuery) {
    loadAnimalList().then(() => {
        if (linkQuery) $('ency-search-input').value = linkQuery;
        if (linkKey > 0) {
            const a = animalList.find(x => x.k === linkKey);
            openAnimal(linkKey, a ? groupOfAnimal(a) : null, a?.r);
        } else {
            searchAll();
        }
    });
}
