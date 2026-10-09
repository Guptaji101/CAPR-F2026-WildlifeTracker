// =============================================================================
// encyclopedia.js - Animal Encyclopedia page (encyclopedia.php)
// 1. The user picks a region and a group in the sidebar.
// 2. api/encyclopedia.php?action=top lists the group's most-recorded species (GBIF).
// 3. Each card is filled from api/species.php (taxonomy, photo, Wikipedia summary).
// 4. Clicking a card opens the detail dialog, with extra facts from action=facts.
// =============================================================================

const $ = id => document.getElementById(id);
const state = { region: 'KR', group: null };
const speciesCache = new Map();   // speciesKey -> promise of species.php data (one request each)

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n).toLocaleString('en-US');
const regionName = new Intl.DisplayNames(['en'], { type: 'region' });

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
    const where = state.region ? `in ${regionName.of(state.region)}` : 'worldwide';
    $('crumbs').textContent = `Animals › ${d.division} › ${d.name}`;
    $('intro-icon').innerHTML = btn.querySelector('.tree-icon').innerHTML;
    $('intro-icon').style.cssText = `color:${d.color};background:${d.color}1f`;
    $('intro-name').textContent = d.name;
    $('intro-latin').textContent = d.latin;
    $('intro-desc').textContent = d.desc;
    $('intro-facts').innerHTML = total === undefined
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Asking GBIF for the most-recorded species…'
        : `<b>${fmt(total)}</b> records ${where} on GBIF. Below are the most-recorded species ${where}, most records first.`;
}

async function loadGroup() {
    const btn = currentGroupButton();
    document.querySelectorAll('.tree-item').forEach(b => b.classList.toggle('active', b === btn));
    history.replaceState(null, '', `#${state.group}${state.region ? '' : '-world'}`);
    showIntro(btn);

    const grid = $('species-grid');
    grid.innerHTML = Array.from({ length: 8 }, () => '<div class="sp-card skeleton"></div>').join('');

    const requested = `${state.group}|${state.region}`;
    let data;
    try {
        data = await getJson(`api/encyclopedia.php?action=top&taxa=${btn.dataset.taxa}&country=${state.region}`);
    } catch (e) {
        grid.innerHTML = `<div class="grid-message"><i class="fa-solid fa-triangle-exclamation"></i>
            Could not load the list from GBIF (${escapeHtml(e.message)}).
            <button class="btn-primary" onclick="loadGroup()">Try again</button></div>`;
        return;
    }
    if (requested !== `${state.group}|${state.region}`) return;   // the user already chose something else

    showIntro(btn, data.total);
    if (!data.species.length) {
        grid.innerHTML = '<div class="grid-message">GBIF has no records of this group here. Try "Worldwide".</div>';
        return;
    }
    grid.innerHTML = data.species.map(s => cardHtml(s, null)).join('');
    await eachLimited(data.species, 6, async s => {
        const sp = await getSpecies(s.speciesKey);
        const card = grid.querySelector(`[data-key="${s.speciesKey}"]`);
        if (card && requested === `${state.group}|${state.region}`) card.outerHTML = cardHtml(s, sp);
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
    const sp = await getSpecies(key);
    const name = displayName(sp);
    const ranks = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'];
    $('species-detail').innerHTML = `
        ${photoHtml(sp, 'detail-photo')}
        <div class="detail-body">
            <h2>${escapeHtml(name)}</h2>
            <p class="sp-sci">${escapeHtml(sp?.scientificName || '')}</p>
            <div class="detail-badges" id="detail-badges"><span class="badge muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading facts…</span></div>
            <p class="detail-summary">${escapeHtml(summaryText(sp))}</p>
            <h4>Where it is recorded most</h4>
            <div id="detail-countries" class="detail-countries">…</div>
            <h4>Classification</h4>
            <p class="detail-taxonomy">${ranks.filter(r => sp?.[r]).map(r => `<span title="${r}">${escapeHtml(sp[r])}</span>`).join(' › ') || 'Not available'}</p>
            <div class="detail-links">
                ${sp?.wikiUrl ? `<a class="btn-primary" href="${escapeHtml(sp.wikiUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-wikipedia-w"></i> Read more on Wikipedia</a>` : ''}
                <a class="btn-outline" href="https://www.gbif.org/species/${key}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Explore on GBIF</a>
            </div>
        </div>`;
    $('species-dialog').showModal();

    try {
        const f = await getJson(`api/encyclopedia.php?action=facts&speciesKey=${key}`);
        const [label, color] = IUCN[f.iucn?.code] || IUCN.NE;
        $('detail-badges').innerHTML =
            `<span class="badge" style="background:${color}" title="IUCN Red List of Threatened Species">${label}</span>
             <span class="badge muted"><i class="fa-solid fa-location-dot"></i> ${fmt(f.records ?? records)} records worldwide</span>`;
        // GBIF uses codes like "ZZ" for records without a country: leave those out
        const countries = f.countries.map(c => ({ ...c, name: regionName.of(c.code) })).filter(c => c.name !== 'Unknown Region');
        $('detail-countries').innerHTML = countries.length
            ? countries.map(c => `<span>${escapeHtml(c.name)} <b>${fmt(c.records)}</b></span>`).join('')
            : 'No country information.';
    } catch {
        $('detail-badges').innerHTML = `<span class="badge muted">${fmt(records)} records in this list</span>`;
        $('detail-countries').textContent = 'Could not load from GBIF.';
    }
}

// -----------------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------------
document.querySelectorAll('.tree-item').forEach(btn => btn.addEventListener('click', () => {
    state.group = btn.dataset.key;
    loadGroup();
}));

document.querySelectorAll('#region-chips .chip').forEach(chip => chip.addEventListener('click', () => {
    document.querySelectorAll('#region-chips .chip').forEach(c => c.classList.toggle('active', c === chip));
    state.region = chip.dataset.region;
    loadGroup();
}));

// Close the dialog by clicking outside it
$('species-dialog').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

// The address remembers the choice, e.g. encyclopedia.php#birds or #birds-world
const [hashGroup, hashWorld] = location.hash.slice(1).split('-');
state.group = document.querySelector(`.tree-item[data-key="${hashGroup}"]`) ? hashGroup : 'mammals';
if (hashWorld === 'world') {
    state.region = '';
    document.querySelectorAll('#region-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.region === ''));
}
loadGroup();
