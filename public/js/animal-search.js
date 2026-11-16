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
    if (HANGUL.test(q)) return new RegExp(esc(q));
    const forms = [...new Set([q, q.replace(/es$/, ''), q.replace(/s$/, '')])].filter(f => f.length >= 2);
    // wholeWord: the keyword is a whole word of the name ("bat" in "Blue bat star", not in "Bath")
    const end = wholeWord ? `(e?s)?($|[\\s\\-'/)])` : '';
    return new RegExp(`(^|[\\s\\-'/(])(${forms.map(esc).join('|')})${end}`);
}
const animalNames = a => [a.n, a.s, ...(a.ko || [])].filter(Boolean);
// The names people use: English and Korean (the scientific name only if there is no English one)
const commonNames = a => [a.n || a.s, ...(a.ko || [])].filter(Boolean);

// Every animal of the list that the keyword fits, best-known first (the list's order).
// Everyday names come first: "hen" finds the Hen Harrier, not also two beetles whose scientific
// name starts with "Hen…" (Henosepilachna). Only if no everyday name fits are scientific names
// searched, so "Circus cyaneus" still works.
function findByKeyword(list, text) {
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
            for (const w of [low, ...low.split(/[\s\-'/()]+/)]) {
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
