# GitHub Issues: drafts to paste

For each issue: **Issues → New issue**, paste the **title** into the title box and the
**body** (the text inside the grey box) into the description. Then set the assignee, labels and
milestone shown above it, on the right-hand side.

**Set up once first:**
- **Labels** (Issues → Labels): `backend`, `frontend`, `qa`, `docs`, `bug`, `setup`
- **Milestones** (Issues → Milestones): `System Design (Oct 17)`, `Working Prototype (Nov 3)`
- **Project board** (Projects → New project → Board): add the issues; columns To do / In progress / Done

---

## 1. Set up the local development environment

**Assignee:** Singh Shubham Kumar, Paudel Amrit · **Labels:** `setup` · **Milestone:** System Design (Oct 17)

```markdown
Each team member sets up WildTrack on their own computer so they can commit from their own
GitHub account.

## Tasks
- [ ] Accept the collaborator invite for this repository
- [ ] Clone the repo into `C:\xampp\htdocs\`
- [ ] Set your own Git identity (the email must be added to your GitHub account):
      `git config user.name "Your Name"` and `git config user.email "you@example.com"`
- [ ] Copy `config/config.example.php` to `config/config.php` (never commit config.php)
- [ ] Reset the database: `DROP DATABASE wildlife_tracker`, then import `sql/schema.sql`
- [ ] Open http://localhost/CAPR-F2026-WildlifeTracker/public/ and check that the pins, the
      table and the Species Profile load

## Done when
Both members have made one small commit from their own account (for example, ticking their
own line in a checklist), and it shows under their name on GitHub.
```

---

## 2. Review and test the species cache in species.php

**Assignee:** Singh Shubham Kumar · **Labels:** `backend` · **Milestone:** System Design (Oct 17)

```markdown
`public/api/species.php` now caches species details in the `species_cache` table, following
the cache rules in System Design Section 4.6. Review the code so you can explain it in the
presentation, and test it.

## Tasks
- [ ] Read through `species.php` and the comments on each rule (1–6)
- [ ] View a species twice in the app. In the browser's Network tab, the response header
      `X-Cache` should be `MISS` the first time and `HIT` the second time
- [ ] Check in phpMyAdmin that a row appears in `species_cache`
- [ ] Set a row's `cached_at` to 40 days ago and check that the next request refreshes it
- [ ] Commit any improvements you find (with a clear commit message)

## Done when
The cache is tested, and you can explain how HIT, MISS and STALE work.
```

---

## 3. Shorten the GBIF timeout (NFR-01)

**Assignee:** Singh Shubham Kumar · **Labels:** `backend` · **Milestone:** Working Prototype (Nov 3)

```markdown
`includes/gbif.php` tries GBIF up to 3 times, and each attempt can wait for the full
`timeout` from config (30 s in `config/config.example.php`), plus 1 s and 2 s pauses between
attempts. If GBIF hangs, the user waits about 90 s before the sample data appears. NFR-01
targets about 5 s for normal searches.

## Tasks
- [ ] Measure how long a normal search takes (for example, Busan and Jeju)
- [ ] Choose a shorter timeout (for example 10 s) and update `config.example.php`
      (and tell the team to update their own config.php)
- [ ] Test that normal searches still succeed, and that the sample-data fallback still
      appears when GBIF can't be reached (for example, by changing `base_url` to a wrong
      address temporarily)

## Done when
The worst-case wait is clearly shorter, and normal searches still work.
```

---

## 4. Write the backend section of README.md

**Assignee:** Singh Shubham Kumar · **Labels:** `docs`, `backend` · **Milestone:** Working Prototype (Nov 3)

```markdown
Document the three API endpoints so the team (and the instructor) can understand them.

## Tasks
- [ ] For `geocode.php`, `sightings.php` and `species.php`: the URL parameters, an example
      request, and an example JSON response
- [ ] Explain the retry ×3 and the sample-data fallback in `includes/gbif.php` (NFR-04)
- [ ] Explain the species cache and the `X-Cache` header
- [ ] Explain how to set up the database from `sql/schema.sql`

## Done when
A new teammate could call each endpoint correctly using only the README.
```

---

## 5. Write the test checklist (docs/testing.md)

**Assignee:** Paudel Amrit · **Labels:** `qa`, `docs` · **Milestone:** Working Prototype (Nov 3)

```markdown
Create a test checklist that the team runs before each submission.

## Tasks
- [ ] One test per use case (UC-01 to UC-11), using its main flow and alternative flows
      from the Requirements Analysis v1.1 (for example, UC-01 A2: "Location not found")
- [ ] Species cache test (see issue #2)
- [ ] Browser test: Chrome, Firefox and Edge (NFR-02)
- [ ] Small-screen test at about 375 px wide (NFR-06)
- [ ] A results column: Pass / Fail / date / tester
- [ ] Run the checklist once and open a `bug` issue for each failure

## Done when
`docs/testing.md` is committed with one full test run recorded.
```

---

## 6. Show "Not specified" instead of the country in the Location column

**Assignee:** Paudel Amrit · **Labels:** `bug`, `frontend` · **Milestone:** Working Prototype (Nov 3)

```markdown
When GBIF gives no locality, the Location column of the Recent Sightings table shows only
the country (for example "Korea, Republic of"), which looks like a precise place.

Code: `public/js/app.js`, the `loc-cell` line in `renderTable()`:
`r.locality || r.country || 'Not specified'`

## Tasks
- [ ] Agree with the team what to show (for example "Korea, Republic of (no locality)",
      or just the locality with "Not specified" as the fallback)
- [ ] Change the table cell; check that the Species Profile's Locality line stays consistent
- [ ] Run `node --check public/js/app.js` and test in the browser

## Done when
Sightings without a locality are shown clearly, and the change is in a reviewed pull request.
```

---

## 7. Review pull requests (QA)

**Assignee:** Paudel Amrit · **Labels:** `qa` · **Milestone:** Working Prototype (Nov 3)

```markdown
As QA, review the other members' pull requests before they are merged.

## Tasks
- [ ] For each PR: read the changes, run the app locally, and test the related use case
- [ ] Leave comments, or approve with "Approve" in the PR's Files changed → Review changes
- [ ] Check that `config/config.php` is never committed (NFR-03)

## Done when
Every PR merged before the Working Prototype has at least one review.
```

---

## 8. Review and polish the Encyclopedia page

**Assignee:** Gupta Aman Kumar · **Labels:** `frontend` · **Milestone:** Working Prototype (Nov 3)

```markdown
The Animal Encyclopedia (`public/encyclopedia.php`, `js/encyclopedia.js`,
`css/encyclopedia.css`) matches System Design Figure 7. Review it so you can explain it,
and polish the interface.

## Tasks
- [ ] Open every group, in both "South Korea" and "Worldwide", and note any card without
      a photo or a description
- [ ] Check the detail dialog: IUCN badge, countries, classification, both buttons, and
      closing with X, Esc and a click outside
- [ ] Check it at small screen widths (NFR-06) and in Chrome, Firefox and Edge (NFR-02)
- [ ] Idea: a "See sightings on the map" button that opens the Map page with that group
- [ ] If the page changes, update Figure 7 and Section 6.4 in the System Design

## Done when
The page is reviewed, any fixes are merged through a reviewed PR, and you can explain how
a group's list and each card are loaded.
```

---

## 9. Update README.md with the new dashboard

**Assignee:** Gupta Aman Kumar · **Labels:** `docs` · **Milestone:** Working Prototype (Nov 3)

```markdown
README.md still describes the app before the dashboard redesign.

## Tasks
- [ ] Describe the Map page (sidebar filters, map, Recent Sightings table, Species Profile)
      and the Encyclopedia page
- [ ] List the six animal groups
- [ ] Add screenshots of both pages
- [ ] Update the setup steps (config.php, database, XAMPP)
- [ ] Link to the backend section (issue #4) and the test checklist (issue #5)

## Done when
README.md matches the current app.
```
