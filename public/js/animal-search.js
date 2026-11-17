/**
 * animal-search.js — the rules for finding animals by name, shared by the Map page (app.js) and the
 * Animal Encyclopedia (encyclopedia.js), so both search the same way (16 Nov 2026; before, the
 * Encyclopedia had an older copy: "hen" still found two beetles there, typos found nothing).
 *
 * The list is data/korea-animals.json (tools/build-animal-list.php): per animal k = GBIF key,
 * n = English name, s = scientific name, ko = Korean names, c = class, r = records in Korea,
 * t = group keys. It is in order of records, so the best-known animals come first.
 */

// A word of a name starts with the keyword ("boar" fits "Wild boar"); plurals count too
// ("snakes" fits "snake"). Korean has no spaces between parts of a name, so a Korean keyword may
// be anywhere in the name ("노루" fits "보노루").
const HANGUL = /[ㄱ-ㆎ가-힣]/;
function keywordRegex(query, wholeWord = false) {
    const q = query.trim().toLowerCase();
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // One Korean syllable ("벌" bee, "새" bird, "게" crab) is the end of an animal name (꿀벌, 참새,
    // 꽃게), not any part of it (무당벌레 = ladybird is no bee); longer Korean words anywhere
    if (HANGUL.test(q)) return new RegExp(q.length === 1 ? `${esc(q)}$` : esc(q));
    const forms = [...new Set([q, q.replace(/es$/, ''), q.replace(/s$/, '')])].filter(f => f.length >= 2);
    // wholeWord: the keyword is a whole word of the name ("bat" in "Blue bat star", not in "Bath")
    const end = wholeWord ? `(e?s)?($|[\\s\\-'/)])` : '';
    return new RegExp(`(^|[\\s\\-'/(])(${forms.map(esc).join('|')})${end}`);
}
const animalNames = a => [a.n, a.s, ...(a.ko || [])].filter(Boolean);
// The names people use: English and Korean (the scientific name only if there is no English one)
const commonNames = a => [a.n || a.s, ...(a.ko || [])].filter(Boolean);

// Everyday words that are no animal's name in GBIF or Wikipedia, for animals that are not among the
// 2000 of the list (16 Nov: "wild hen" found nothing, "hen" only the Hen Harrier, a bird of prey).
// The wild chicken is called Red Junglefowl (Gallus gallus, GBIF key 9326020). Same fields as the list.
const EVERYDAY_ANIMALS = [
    { k: 9326020, n: 'Red Junglefowl (chicken)', s: 'Gallus gallus', c: 'Aves', t: [44, 212, 723], ko: ['닭'],
      words: ['hen', 'rooster', 'chicken', 'cock', 'wild hen', 'wild chicken', 'wild rooster', 'junglefowl',
              'red junglefowl', '닭', '암탉', '수탉'] },
];
// The everyday animal that the whole keyword means ("hens" = "hen"), or null
function everydayAnimal(text) {
    const forms = wordForms(text);
    return EVERYDAY_ANIMALS.find(a => a.words.some(w => forms.includes(w))) || null;
}
const wordForms = text => {
    const q = text.trim().toLowerCase().replace(/\s+/g, ' ');
    return [q, q.replace(/s$/, ''), q.replace(/es$/, '')];
};

// Everyday words whose animals are in the list under another name (16 Nov: "pig" found the
// pigeons, "rabbit" and "seagull" nothing). The search looks for the name on the right instead;
// the user's word stays in the box.
const KEYWORD_ALIASES = {
    'pig': 'wild boar', 'wild pig': 'wild boar', 'hog': 'wild boar', 'swine': 'wild boar',
    '돼지': '멧돼지', '산돼지': '멧돼지',
    'rabbit': 'hare', 'bunny': 'hare',
    'seagull': 'gull', 'sea gull': 'gull',
    'ladybug': 'ladybird', 'lady bug': 'ladybird',
};
const aliasOf = text => wordForms(text).map(f => KEYWORD_ALIASES[f]).find(Boolean) || text;

// Every animal of the list that the keyword fits, best-known first (the list's order).
// Everyday names come first: "hen" finds the Hen Harrier, not also two beetles whose scientific
// name starts with "Hen…" (Henosepilachna). Only if no everyday name fits are scientific names
// searched, so "Circus cyaneus" still works.
// An everyday word ("hen", "wild hen", "닭") puts its animal first (EVERYDAY_ANIMALS above).
function findByKeyword(list, text) {
    const everyday = everydayAnimal(text);
    const found = findInList(list, aliasOf(text)).filter(a => !everyday || a.k !== everyday.k);
    return everyday ? [everyday, ...found] : found;
}
function findInList(list, text) {
    const q = text.trim();
    if (!list || (q.length < 2 && !HANGUL.test(q))) return [];
    const re = keywordRegex(q);
    const fits = names => a => names(a).some(n => re.test(n.toLowerCase()));
    const common = list.filter(fits(commonNames));
    if (!common.length) return list.filter(fits(animalNames));
    // A whole word wins over the start of a longer word: "bat" finds the Blue bat star, not also
    // "Bath White" or "Batillaria"; "pige" (no whole word) still finds the pigeons
    const whole = keywordRegex(q, true);
    const wholeMatches = common.filter(a => commonNames(a).some(n => whole.test(n.toLowerCase())));
    return wholeMatches.length ? wholeMatches : common;
}

// The server's answer (api/animal.php) is a whole kind that the word names: "bat" -> Bat
// (Chiroptera), "snake" -> Snakes. A bundle of the animals the server found by the word (byName,
// named after the word itself: "pige" -> "Pige") is no kind, so it does not count.
function isKindFor(found, query) {
    return !!(found && found.group && !found.byName && keywordRegex(query, true).test(found.name.toLowerCase()));
}

// Similar names for a keyword that found nothing: the keyword inside a name ("oar" in "boar"),
// or a word that differs by a letter or two ("bore" -> "boar"). Closest first, at most `max`.
function similarNames(list, query, max = 6) {
    const q = query.trim().toLowerCase();
    // Letters that may differ. A Korean syllable is a big part of a word ("치킨" is not "치리"), so
    // Korean allows one change only from 3 syllables on ("고랴니" -> 고라니)
    const allowed = HANGUL.test(q) ? (q.length >= 3 ? 1 : 0) : q.length <= 4 ? 1 : 2;
    const scored = [];
    for (const a of list || []) {
        let best = Infinity, same = 0;
        for (const name of commonNames(a)) {   // everyday names only, as in findByKeyword()
            const low = name.toLowerCase();
            // inside a word of an English or Korean name ("oar" in "boar"; "tivi" is not
            // "Peridea lativitta", which has no English name)
            if (q.length >= 3 && low.includes(q) && name !== a.s) { best = 0; break; }
            // the whole name ("wild bore" -> "wild boar"), then each of its words ("bore" -> "boar")
            // (for an animal with only a scientific name, only the whole name and the genus: "bata"
            // is not "Atractomorpha lata"; 17 Nov)
            const words = name === a.s ? [low, low.split(' ')[0]] : [low, ...low.split(/[\s\-'/()]+/)];
            for (const w of words) {
                // skip bits shorter than 2 letters ("치" of "치 리"): too short to be a similar word
                if (w.length < 2 || Math.abs(w.length - q.length) > allowed) continue;
                const d = editDistance(q, w);
                let p = 0;
                while (p < q.length && q[p] === w[p]) p++;   // letters the same from the start
                if (d < best || (d === best && p > same)) { best = d; same = p; }
            }
        }
        if (best <= allowed) scored.push({ a, best, same });
    }
    // Closest first; for the same distance, the name that starts most like the keyword ("magpy":
    // Magpie before Map). The sort is stable, so best-known first after that.
    scored.sort((x, y) => x.best - y.best || y.same - x.same);
    return scored.slice(0, max).map(({ a }) => a);
}

// How many letters must change to turn one word into the other (Levenshtein distance)
function editDistance(a, b) {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = cur;
    }
    return prev[b.length];
}

// Recent searches (16 Nov): the last 5 words searched on the Map or in the Encyclopedia, shown when
// the user clicks into an empty search box. Kept in this browser only (localStorage), never sent.
const RECENT_KEY = 'wildtrack.recentAnimals';
function recentSearches() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}
function rememberSearch(text) {
    const word = text.trim();
    if (!word) return;
    const list = [word, ...recentSearches().filter(w => w.toLowerCase() !== word.toLowerCase())].slice(0, 5);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage blocked: no list */ }
}
// The recent searches as buttons for a suggestion box (data-recent = the word to search again)
function recentHtml(idPrefix) {
    const words = recentSearches();
    if (!words.length) return '';
    const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return '<div class="suggest-title">Recent searches</div>' + words.map((w, i) =>
        `<button type="button" role="option" id="${idPrefix}-${i}" data-recent="${esc(w)}" aria-label="Search again: ${esc(w)}">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span class="suggest-text"><span class="suggest-main">${esc(w)}</span></span>
        </button>`).join('');
}

// Common names in Title Case, the same on every page (16 Nov): "wild boar" -> "Wild Boar",
// "Eurasian red squirrel" -> "Eurasian Red Squirrel". The part after a hyphen stays as it is
// ("Black-tailed Gull", "28-spotted Lady Beetle", as bird lists write it), small joining words stay
// small ("Bird of Prey"), and names with Korean letters are left as they are. Not for scientific
// names: those keep their own form (Genus species).
const SMALL_WORDS = new Set(['of', 'and', 'the', 'in', 'on', 'de', 'la', 'or']);
function toTitleCase(name) {
    if (!name || HANGUL.test(name)) return name || '';
    return name.split(' ').map((w, i) =>
        i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
}
