// =============================================================================
// encyclopedia.js - Animal Encyclopedia page (encyclopedia.php)
// 1. The user picks a group in the sidebar (all lists are for South Korea).
// 2. api/encyclopedia.php?action=top lists the group's most-recorded species (GBIF).
// 3. Each card is filled from api/species.php (taxonomy, photo, Wikipedia summary).
// 4. Clicking a card opens the detail dialog, with extra facts from action=facts.
// =============================================================================

const $ = id => document.getElementById(id);
const COUNTRY = 'KR';                // the Encyclopedia only covers South Korea
// list = the species of the open group; openAfterLoad = a species to open once the list is shown
const state = { group: null, list: [], openAfterLoad: null, openedKey: null };   // openedKey: species in the dialog
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

function showIntro(btn, total) {
    const d = btn.dataset;
    $('crumbs').textContent = `Animals › ${d.division} › ${d.name}`;
    $('intro-icon').innerHTML = btn.querySelector('.tree-icon').innerHTML;
    $('intro-icon').style.cssText = `color:${d.color};background:${d.color}1f`;
    $('intro-name').textContent = d.name;
    $('intro-latin').textContent = d.latin;
    $('intro-desc').textContent = d.desc;
    // The group search names the open group, e.g. "Search insects…"
    $('group-search-input').placeholder = `Search ${d.name.toLowerCase()}…`;
    $('group-search-label').textContent = `Search ${d.name.toLowerCase()}`;
    $('intro-facts').innerHTML = total === undefined
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Asking GBIF for the most-recorded species…'
        : `<b>${fmt(total)}</b> records in South Korea on GBIF. Below are the most-recorded species in South Korea, most records first.`;
}

async function loadGroup() {
    const btn = currentGroupButton();
    document.querySelectorAll('.tree-item').forEach(b => b.classList.toggle('active', b === btn));
    history.replaceState(null, '', `#${state.group}`);
    $('tree-current').textContent = btn.dataset.name;
    showIntro(btn);

    const grid = $('species-grid');
    grid.innerHTML = Array.from({ length: 8 }, () => '<div class="sp-card skeleton"></div>').join('');

    const requested = state.group;
    let data;
    try {
        data = await getJson(`api/encyclopedia.php?action=top&taxa=${btn.dataset.taxa}&country=${COUNTRY}`);
    } catch (e) {
        if (requested !== state.group) return;   // an error of a group the user has already left
        grid.innerHTML = `<div class="grid-message"><i class="fa-solid fa-triangle-exclamation"></i>
            Could not load the list from GBIF (${escapeHtml(e.message)}).
            <button class="btn-primary" onclick="loadGroup()">Try again</button></div>`;
        return;
    }
    if (requested !== state.group) return;   // the user already chose another group

    showIntro(btn, data.total);
    if (!data.species.length) {
        grid.innerHTML = '<div class="grid-message">GBIF has no records of this group in South Korea yet.</div>';
        return;
    }
    grid.innerHTML = data.species.map(s => cardHtml(s, null)).join('');
    state.list = data.species;
    if (state.openAfterLoad) {
        openSpecies(state.openAfterLoad, state.openRecords);   // records: known when opened from the search
        state.openAfterLoad = state.openRecords = null;
    }
    await eachLimited(data.species, 6, async s => {
        // The user opened another group: stop loading this one, so the new group's cards load
        // first and the server is not kept busy with cards nobody sees
        if (requested !== state.group) return;
        const sp = await getSpecies(s.speciesKey);
        const card = grid.querySelector(`[data-key="${s.speciesKey}"]`);
        if (card && requested === state.group) card.outerHTML = cardHtml(s, sp);
    });
}

// -----------------------------------------------------------------------------
// Cards and detail dialog
// -----------------------------------------------------------------------------
// English name if known (GBIF writes some in lower case, so capitalize the first letter)
function displayName(sp) {
    const name = sp?.vernacularName || sp?.species || 'Unnamed species';
    return name.charAt(0).toUpperCase() + name.slice(1);
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
    return `<div class="${cls}">${icon}${img}</div>`;
}

function cardHtml(s, sp) {
    if (sp === null && !speciesCache.has(s.speciesKey)) {
        return `<article class="sp-card loading" data-key="${s.speciesKey}"><div class="sp-photo"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <div class="sp-body"><h3>Loading…</h3></div></article>`;
    }
    const name = displayName(sp);
    return `<article class="sp-card" data-key="${s.speciesKey}" tabindex="0" role="button" onclick="openSpecies(${s.speciesKey}, ${s.records})"
                onkeydown="if (event.key === 'Enter') openSpecies(${s.speciesKey}, ${s.records})">
        ${photoHtml(sp, 'sp-photo')}
        <div class="sp-body">
            <h3>${escapeHtml(name)}</h3>
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
            <p class="detail-summary">${escapeHtml(summaryText(sp))}</p>
            <h4>Classification</h4>
            <p class="detail-taxonomy">${ranks.filter(r => sp?.[r]).map(r => `<span title="${r}">${escapeHtml(sp[r])}</span>`).join(' › ') || 'Not available'}</p>
            <div class="detail-links">
                ${sp?.wikiUrl ? `<a class="btn-primary" href="${escapeHtml(sp.wikiUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-wikipedia-w"></i> Read more on Wikipedia</a>` : ''}
                <a class="btn-outline" href="https://www.gbif.org/species/${key}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Explore on GBIF</a>
                ${mapLink(key, name)}
            </div>
        </div>`;
    $('species-dialog').showModal();

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
// Search: "Search all animals" at the top, and "Search mammals…" inside each group
// -----------------------------------------------------------------------------
// data/korea-animals.json lists the 2000 animals with the most GBIF records in South Korea
// (made by tools/build-animal-list.php; the Map page uses it too). It is loaded once and
// searched in the browser, so suggestions appear while typing without asking the server.
let animalList = null, animalListLoading = null;
function loadAnimalList() {
    animalListLoading ??= fetch('data/korea-animals.json').then(r => r.json())
        .then(list => { animalList = list; }).catch(() => { animalList = []; });
    return animalListLoading;
}

// Each group of the tree with its GBIF taxon keys (data-taxa), e.g. ['insects', [216]]
const GROUP_KEYS = [...document.querySelectorAll('.tree-item')].map(b => [b.dataset.key, b.dataset.taxa.split(',').map(Number)]);
// The group of an animal of the list: the group whose keys contain its phylum, class or order key
function groupOfAnimal(a) {
    return GROUP_KEYS.find(([, keys]) => (a.t || []).some(k => keys.includes(k)))?.[0] || null;
}
const groupButton = key => document.querySelector(`.tree-item[data-key="${key}"]`);

// The 8 best-known animals (most records first; the list is in that order) whose English or
// scientific name has a word starting with the typed text; only one group if `group` is given
function matchAnimals(text, group = null) {
    const q = text.trim().toLowerCase();
    if (q.length < 2 || !animalList) return [];
    const wordStart = new RegExp(`(^|[\\s\\-'/(])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    return animalList
        .filter(a => [a.n, a.s].some(n => n && wordStart.test(n.toLowerCase())))
        .map(a => ({ ...a, g: groupOfAnimal(a) }))
        // In a group: only that group. At the top: all animals, also the few without a group in the
        // tree (millipedes, barnacles…): their card opens without changing the group.
        .filter(a => !group || a.g === group)
        .slice(0, 8);
}

function boldMatch(name, text) {
    const i = name.toLowerCase().indexOf(text.trim().toLowerCase());
    if (i < 0 || !text.trim()) return escapeHtml(name);
    const end = i + text.trim().length;
    return `${escapeHtml(name.slice(0, i))}<b>${escapeHtml(name.slice(i, end))}</b>${escapeHtml(name.slice(end))}`;
}

// Draws a suggestion list: each animal with its group icon, names, group and Korean records.
// `message` (instead of animals) explains why there is nothing to show.
function renderList(inputId, boxId, animals, typed, { title = '', message = '' } = {}) {
    const box = $(boxId);
    if (!animals.length && !message) return hideList(inputId, boxId);
    box.innerHTML = (title ? `<div class="suggest-title">${title}</div>` : '')
        + (message ? `<div class="suggest-message">${message}</div>` : '')
        + animals.map((a, i) => {
            const btn = groupButton(a.g);
            const icon = btn ? `<span class="group-icon" style="background:${btn.dataset.color};width:22px;height:22px;font-size:11px">${btn.querySelector('.tree-icon').innerHTML}</span>` : '<i class="fa-solid fa-paw"></i>';
            const name = a.n || a.s;
            const where = [btn?.dataset.name, a.r ? `${fmt(a.r)} records in Korea` : ''].filter(Boolean).join(' · ');
            return `<button type="button" role="option" id="${boxId}-${i}" data-key="${a.k}" data-group="${a.g || ''}" data-records="${a.r || ''}"
                    aria-label="${escapeHtml([name, btn?.dataset.name].filter(Boolean).join(', '))}">
                ${icon}
                <span class="suggest-text">
                    <span class="suggest-main">${boldMatch(name, typed)}</span>
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
        state.openAfterLoad = key;      // opens once the group's list is shown (see loadGroup)
        state.openRecords = records;
        loadGroup();
        if (window.matchMedia('(max-width: 820px)').matches) setTreeOpen(false);
    } else {
        openSpecies(key, records);
    }
}

// Enter in "Search all animals": an exact name of the list opens at once; any other name is
// looked up like on the Map page (api/animal.php: scientific name, Wikipedia, "Did you mean…")
let searchId = 0;
async function searchAll() {
    const typed = $('ency-search-input').value.trim();
    if (!typed) return;
    await loadAnimalList();
    const exact = animalList.find(a => [a.n, a.s].some(n => n && n.toLowerCase() === typed.toLowerCase()));
    if (exact) return openAnimal(exact.k, groupOfAnimal(exact), exact.r);

    const id = ++searchId;
    renderList('ency-search-input', 'ency-suggest', [], typed, { message: '<i class="fa-solid fa-spinner fa-spin"></i> Looking up this name…' });
    let data;
    try { data = await getJson(`api/animal.php?q=${encodeURIComponent(typed)}`); }
    catch (e) { data = { error: e.message }; }
    if (id !== searchId) return;   // the user searched again meanwhile

    const known = key => animalList.find(a => a.k === key);
    if (data.found) {
        const a = known(data.found.key);
        return openAnimal(data.found.key, a ? groupOfAnimal(a) : null, a?.r);
    }
    if (data.suggestions?.length) {
        const list = data.suggestions.map(s => ({ k: s.key, n: s.name, s: s.scientificName, r: s.koreaRecords, g: known(s.key) ? groupOfAnimal(known(s.key)) : null }));
        return renderList('ency-search-input', 'ency-suggest', list, typed, { title: 'Did you mean…' });
    }
    renderList('ency-search-input', 'ency-suggest', [], typed, { message: escapeHtml(data.error || `No animal called "${typed}" was found.`) });
}

// Enter in "Search mammals…": an exact name or the first suggestion of this group opens
async function searchGroup() {
    const typed = $('group-search-input').value.trim();
    if (!typed) return;
    await loadAnimalList();
    const matches = matchAnimals(typed, state.group);
    const exact = matches.find(a => [a.n, a.s].some(n => n && n.toLowerCase() === typed.toLowerCase()));
    const hit = exact || matches[0];
    if (hit) return openAnimal(hit.k, hit.g, hit.r);
    const groupName = groupButton(state.group).dataset.name.toLowerCase();
    renderList('group-search-input', 'group-suggest', [], typed, {
        message: `No ${escapeHtml(groupName)} called "${escapeHtml(typed)}" among the 2000 animals recorded most in South Korea. Try <b>Search all animals</b> at the top.`,
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
    input.addEventListener('focus', loadAnimalList);
    input.addEventListener('input', async () => {
        if (inputId === 'ency-search-input') searchId++;   // a name lookup still running is out of date
        await loadAnimalList();
        const typed = input.value;
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
        if (btn) openAnimal(Number(btn.dataset.key), btn.dataset.group || null, btn.dataset.records);
    });
    $(btnId).addEventListener('click', onEnter);
}
setupSearch('ency-search-input', 'ency-search-btn', 'ency-suggest', searchAll, false);
setupSearch('group-search-input', 'group-search-btn', 'group-suggest', searchGroup, true);

// -----------------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------------
document.querySelectorAll('.tree-item').forEach(btn => btn.addEventListener('click', () => {
    state.group = btn.dataset.key;
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
