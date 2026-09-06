# How to add a language or translation key

AEGIS uses [next-intl](https://next-intl.dev) (v4.8) with a cookie-based
locale — there is no locale-prefixed routing (no `/hi/dashboard`), and no
`middleware.ts` involvement in locale selection at all.

## Prerequisites

- Node/pnpm environment set up (see the repo root `README.md` Quick Start)
- A translator for the target language, or the exact strings to add

## How locale selection actually works

1. `src/i18n/request.ts` reads the `NEXT_LOCALE` cookie server-side on every
   request, validates it against `SUPPORTED_LOCALES = ["en", "hi", "mr",
   "gu"]`, and falls back to `"en"` for anything else (missing cookie,
   unsupported value, whatever).
2. It then dynamically imports `messages/<locale>.json` and hands the whole
   file to next-intl as the message tree for that request.
3. The locale switcher lives in `src/components/layout/top-bar.tsx`. Picking
   a language sets the cookie directly:
   `document.cookie = \`NEXT_LOCALE=${newLocale};path=/;max-age=${60*60*24*365}\``
   — a full page reload picks up the new locale on the next request, there
   is no client-side re-render of already-rendered server components.

## Steps: add a language the app doesn't support yet

1. Add the new code to `SUPPORTED_LOCALES` in `src/i18n/request.ts`.
2. Add its entry to the `LANGUAGES` list in
   `src/components/layout/top-bar.tsx` (the array the switcher renders).
3. Create `messages/<code>.json` — the fastest correct start is
   `cp messages/en.json messages/<code>.json`, since the four existing
   locale files have the exact structure described below.
4. Translate every leaf string, keeping every key path identical to
   `en.json`. Do not translate keys — only string *values*.
5. Verify parity before committing (script below) — it fails loudly if a key
   is missing.
6. `pnpm build` and manually check a screen in the new locale; ICU
   placeholders (`{count}`, `{name}`) must survive translation unchanged.

## Steps: add a translation key to an existing namespace

1. Add the key under the right namespace in `messages/en.json`. The 11
   existing namespaces are `Common`, `Navigation`, `TopBar`, `Dashboard`,
   `Compliance`, `AuditPlan`, `Findings`, `Reports`, `Auditee`, `Settings`,
   `Login` — put a genuinely new area of the UI in its own namespace rather
   than growing `Common` indefinitely.
2. Add the same key, translated, to `messages/hi.json`, `messages/mr.json`,
   and `messages/gu.json`. Nothing enforces this — see below.
3. Call it from the component with `useTranslations("Namespace")`, then
   `t("keyName")`.

## Verify translation-key parity

There is no CI check for this today — a missing key does not fail the
build, `lint`, or any test. Run this before committing a change that adds or
renames a key:

```bash
node -e '
const fs = require("fs");
function flatten(obj, prefix="") {
  let out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? prefix + "." + k : k;
    if (typeof v === "object" && v !== null) out.push(...flatten(v, p));
    else out.push(p);
  }
  return out;
}
const locales = ["en", "hi", "mr", "gu"];
const sets = Object.fromEntries(
  locales.map((l) => [l, new Set(flatten(JSON.parse(fs.readFileSync(`messages/${l}.json`))))]),
);
for (const l of locales) {
  if (l === "en") continue;
  const missing = [...sets.en].filter((k) => !sets[l].has(k));
  const extra = [...sets[l]].filter((k) => !sets.en.has(k));
  console.log(l, "missing:", missing.length, "extra:", extra.length);
  if (missing.length) console.log("  " + missing.join("\n  "));
}
'
```

## Known state, verified at doc-generation time

`hi.json`, `mr.json`, and `gu.json` are each missing the same **39 keys**
present in `en.json` — entirely in the `Navigation` namespace (13 nav-item
labels: `auditTrail`, `admin`, `reports`, `compliance`, `analytics`, `ram`,
`calendar`, `concurrentAudit`, `riskManagement`, `controls`, `issues`,
`workProgram`, `qaAssessment`, `governance`, `housekeeping`, `investments`,
`isAudit`, `regulatory`, `auditExecution`) and the `Login` namespace (signup,
password-confirmation, and session-expiry strings — the sign-up flow and its
error states were added after the last full translation pass).

**What a user in a non-English locale sees for a missing key**: next-intl is
not configured with a custom `onError`/`getMessageFallback` in this codebase,
so its library defaults apply — a missing key renders as the literal
`Namespace.keyName` string (e.g. `Navigation.auditTrail`) in place of
translated text, and logs a `console.error`. It does not throw and does not
break the page. If you're translating, these 39 keys under `Navigation.*`
and `Login.*` in the three non-English files are exactly what needs filling
in; the parity script above lists them by exact path.
