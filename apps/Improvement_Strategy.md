# KlarText v1 Findings 

In this doc I will cover the current status of the extension, how it's functioning, issues presented and improvement suggestions. These findings can also be used to test and tune our prompts. 

The following test set of websites and logs has been successful in exposing a variety of problems (extraction, cookie banners, headings/lists, long pages, SPAs, multilingual).

I used a variety of websites to test. The logs can be found in the `logs` folder and has links to actual sites. 

Websites were tested based on complexity levels:

##### Level 1: clean, boring HTML (baseline extraction)
- Example Domain — tiny static page; perfect sanity check for "can we extract anything at all?"
- IANA Reserved Domains - simple structure + links; good for verifying no navigation junk.

##### Level 2: Accessibility / structured content (good targets for easy-language)
- W3C WAI: Intro to Web Accessibility — headings + bullets + short paragraphs; great for checking readability transforms without losing meaning.
- W3C WAI: Writing for Web Accessibility — newer content, clear structure.
- Digital.gov Plain Language guides — "plain language" content should become very clean in your output; good benchmark.
**Note** - these were interesting to me because they were websites about easy language standards and to use research websites in testing but probably was not best idea.
- Blog posts - Radden, Scrumming

##### Level 3: Government pages (real-world layout + lots of nav + cookie banners)
- GOV.UK passport application — classic gov style, lots of sections, very scannable; tests whether you keep key facts while simplifying.
- Login needed sites - Vanity Fair

##### Level 4: Developer docs (dense, technical, lots of sidebars)
- MDN Fetch API (EN) — checks whether your rules preserve names/terms/code while still improving readability.
- MDN Fetch API (DE) — same page type, German version.
- React docs (Learn / Quick Start) — modern doc site, lots of in-page nav and dynamic rendering.
- Next.js docs — similar: heavy sidebar + code blocks + deep headings.

##### Level 5: "Stress tests" (long text, news layouts, heavy UI)
- Project Gutenberg plain-text pages — huge content blocks; perfect for chunking + "don't truncate with …" testing.
- Big Wiki pages - Germany

Some sites did not translate well ex: https://www.iana.org/domains/reserved

Within these sites I was interested in how the extension dealt with:
1. extracted text length
2. number of headings/bullets preserves
3. whether names/numbers/dates are perserved
4. whether output includes "assisted framing", any introductory or concluding text (e.g., "Here is the simplified text").

### Next Steps

Design: Need additional consideration for optimized accessibility styling to be in parity with the accessible UI:
To complete visual alignment:
1. Add accessibility-focused fonts (Atkinson Hyperlegible + Lexend)
2. Consider adding CSS custom properties for easier theme management
3. Test extension in different color modes (light/dark/high-contrast)

### Basic overview of findings:
There are a few very fixable prompt/rule/guardrail problems that show up in early runs,
Update prompt rules with output and finding from logs on how performance was against some of the items listed above. 
ex: 
1) The model is adding "helper" framing that isn't in the source
Potential solution: add/revise guardrail: output only the rewrite. No prefaces, no "you are looking at…", no "you want to know…".
2) Titles/headings get "expanded" into summaries (meaning risk)
There are cases where a headline/title gets turned into a mini-explainer with bullets (e.g., "The Silent Shift…" becomes a list of claims). 
That's a classic meaning-preservation failure: a title doesn't contain enough info to justify those bullets, so the model invents.
Potential solution: add/ revise guardrail: if the input is a heading/title (short, no verbs/details), rewrite it only as a heading. No extra explanation.
3) Proper nouns + model names are being dropped (meaning loss)
In the Radden log, the original references specific items like OpenAI's o3 and Llama 4 Scout, but the simplified version generalizes into "AI assistants became more independent…" and loses the named entities. 
This is a meaning loss even if the gist is "sort of" kept — because those specifics are often the point.
Potential solution: add/revise guardrail: preserve all names (people/orgs/products/models), numbers, and dates exactly as written.
4) "Today is …" is being injected into plain dates (wrong meaning). A date string like "Tuesday, January 13, 2026" becomes "Today is Tuesday, January 13, 2026." 
This isn't a simplification — that's a semantic change. On an article page, that date is often publication date, not "today".
Potential solution - try adding a guardrail: never add "today/now/currently" unless it exists in the source chunk.
5) Non-language strings are triggering "refusal-style" responses
ex. in the Wikipedia run, a DOI-like string (10.1017/...) gets treated as "code/number" and you get "We can't rewrite this text…" 
That's bad UX and also wrong behavior for citations/IDs.
Possible solution: add guardrail: detect "mostly-non-language" chunks (DOIs, ISBNs, reference IDs, raw URLs, single numbers) and pass them through unchanged (or return an empty rewrite with skipped_reason if you support that).
6) Cookie banners and privacy text over extraction
ex. Vanity Fair logs show 24+ chunks are GDPR consent text
Possible solution: filter elements with [role="dialog"], [aria-modal="true"], classes containing "consent|cookie|privacy"
Test: These elements should not appear in chunks array
7) Inconsistent you/your vs direct language
ex. "When you use profiles..." vs. "Use profiles"
Need to review baseline prompt vs wording in extension - I have a hunch they are not aligned

### Known issues and Recommended Updates
Reviewing the logs we can get a good sense of a few needed changes:
1. There is latency in the extension translation and the connection with the API often times out. 
There's several ways to handle this: Add progress indicator, cancel option, reduce per-chunk timeout
2. Chunking needs to be reviewed and often the max limit of chunks is not respected.
3. Limit sections of webpages that should be translated (ie. ads, sidebars, etc.)
4. failed to fetch on login required sites. Should have a message like "site requires login"

Need to test german sites:
- Bundesregierung "Aufbau und Aufgaben" — German prose, institutional structure; good for DE pipeline + nav stripping.
- Bundesregierung "Navigations-Hinweise in Leichter Sprache" — great "golden target" for German mode.
- ZDFheute — modern news layout, lots of dynamic modules and likely cookie/consent complexity; good for "real messy web." 


### Suggested prompt/rule changes:
**1) System prompt: meaning-first + no invention**
- Add these as hard constraints:
- Do not add information. Do not guess. Do not summarize beyond the text provided.
- Keep all names, numbers, dates, and quoted phrases exactly.
- No preface text. Output only the rewritten content.
- Avoid "you/your" phrasing. Write direct statements.
- If text is incomplete/cut off: do not complete it; note it's cut off.
- This directly addresses the "Here's the rewritten text…" issue 

**2) Review chunkng**
- Before sending to the LLM, classify the chunk:
- DATE/TIME chunk (matches date patterns) → rewrite format only; don't add "today" 
- HEADING chunk (short, title case, no punctuation beyond : -) → rewrite as heading only; no bullets/explanations 
- CITATION/ID chunk (DOI/ISBN/mostly symbols) → pass-through (or skip) to avoid refusals 
- NORMAL PARAGRAPH → full easy-language rewrite. This change should remove a big chunk of "model does weird stuff" without fighting prompt entropy.

**3) Output formatting rule: bullets only when justified**
- Right now bullets are being overused, even when the source is one sentence/title. 
Possible solution: 
- If source is 1 sentence → output 1–2 short sentences (no bullets)
- If source is a list → keep a list
- If source has 3+ distinct facts → bullets allowed, but each bullet must map to a source fact
- Note: when reviewing chunks, single sentence chunks should not be bulleted

**4) Add post-generation guardrails (deterministic checks)**
- Easy to automate and they'll catch meaning-loss early:
- Numbers/dates must match: every digit sequence in source must appear in output (unless you intentionally normalize formats).
- Proper noun retention check: if source contains tokens like OpenAI/Gemini/Llama/o3, they must appear in output. 
- No "meta phrases" list: strip/flag outputs containing "Here's the rewritten…", "You want to know…", "We don't have info yet…". 

### Possible pipeline issues that may be affecting meaning preservation:
- make sure that the inputs are not getting truncated like in the logs
If that's actually what being sending to the API, meaning preservation is mathematically impossible (with clipped content). The model will predictably smooth over missing parts.
Pipeline fix (if needed): stop truncating the extracted DOM text nodes before sending them. Store the full chunk for runs/evals.
Guardrail (if truncation can still happen): if the input ends with ... or looks cut off, the model must:
rewrite only what's present
add a short note like: "(Text is cut off.)"
not complete the missing content
- When a check fails: either re-run with a stricter prompt, or return the best attempt but mark it as needs_review=true.
- run quality is being skewed by infra errors, lots of rate limiting (429), timeouts "page may be too large" and even CORS failures from Wikipedia to localhost 
This means your dataset of "successful translations" is biased toward shorter/easier chunks, which can mislead you about overall quality.

Not prompt-related, but it will distort feedback loop until fixed:
- implement retry/backoff + queueing around 429s 
- reduce per-request payload / chunk size to avoid timeouts 
- fix CORS for extension origins (or proxy through the extension background script) 

More details on prompt improve detail and experiment performance can be found in the notebook prompts/03.1_prompt_scoring_erinn.ipynb
