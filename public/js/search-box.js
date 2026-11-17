/**
 * search-box.js — a round × in every search box that empties it (17 Nov 2026), on the Map page
 * (place and animal search) and in the Encyclopedia (top and group search).
 *
 * The × only shows while the box has text (CSS: input:placeholder-shown). A click empties the box,
 * keeps the cursor in it, and sends the same "input" event as typing, so each page reacts as if
 * the user had deleted the text: the animal filter ends and recent searches show, the cards of a
 * group are all shown again, the place suggestions close.
 */
document.querySelectorAll('.search-box').forEach(box => {
    const input = box.querySelector('input[type="text"]');
    if (!input) return;
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'search-clear';
    clear.setAttribute('aria-label', 'Clear the search');
    clear.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    clear.addEventListener('mousedown', e => e.preventDefault());   // keep the focus in the box
    clear.addEventListener('click', () => {
        input.value = '';
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    input.after(clear);
});
