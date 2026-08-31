# Sn00zly — Schedule Generator · Build Brief

*31. avgust 2026. · Handoff dokument. Napisan tako da ga sveža Claude Code sesija može izvršiti bez ijednog pitanja.*
*Strategija i obrazloženja: `claude/Sn00zly_Schedule_Generator_Project_Plan.md`. Ovde je samo build.*

---

## Zašto ovaj dokument postoji

Motor je napisan i testiran, ali je do sada živeo **samo unutar jedne HTML stranice u jednoj sesiji.** README_BUILD.md postoji upravo zato što se to jednom već desilo: layout skripte vodiča nisu bile sačuvane i morale su se rekonstruisati iz slika.

Da se ne ponovi, u projekat su upisani:

| Fajl | Šta je |
|---|---|
| `claude/snoozly_schedule_engine.js` | Motor. Deterministički, bez zavisnosti, radi u Node-u i u browseru. |
| `claude/snoozly_engine_tests.js` | 999 slučajeva, 17.219 provera. `node snoozly_engine_tests.js` → izlaz 0. |
| `claude/snoozly_canon.json` | Kanonska tabela v1.1 — jedini izvor istine za brojeve. |

**Pravilo:** broj se menja u `snoozly_canon.json`, propagira u motor, pa se **obavezno** pokreću testovi. Aritmetička provera na dnu testova je ta koja hvata C32 greške.

---

## Stack

| Sloj | Izbor | Trošak |
|---|---|---|
| App | Next.js (App Router) na Vercelu | $0 |
| Ruta | `sn00zly.com/schedule` (rewrite, ne poddomen) | — |
| OG slike | `@vercel/og`, edge runtime | $0 |
| Stanje | **Nema baze.** Sve u query stringu. | $0 |
| Analitika | Plausible ili GA4 | $0–9 |

### Zašto nema baze

Motor je deterministički, pa isti parametri uvek daju isti rezultat. Deljivi link je zato samo URL:

```
sn00zly.com/schedule?n=Mila&d=2026-04-19&w=0645
```

OG slika se generiše iz istih parametara. Supabase, auth i perzistencija u potpunosti ispadaju iz kritičnog puta. Ako se kasnije pokaže da treba istorija ili nalozi, baza se dodaje tada — ne sada.

---

## Redosled

Cilj je najtanja verzija koja omogućava merenje **stope završetka** i **stope deljenja** — dve metrike koje odlučuju da li se išta dalje gradi.

### Korak 1 · Scaffold i motor · ~1 dan
- `npx create-next-app@latest` (App Router, TypeScript opciono)
- `lib/schedule-engine.js` ← kopija iz projekta, nedirnuta
- `lib/canon.json` ← kopija iz projekta
- `npm test` pokreće `snoozly_engine_tests.js`. **Ovo mora prolaziti pre bilo čega drugog.**

### Korak 2 · UI · ~2 dana
Dizajn u celini postoji u objavljenom prototipu (Artifact, v4) — forma, timeline, kartice, ritam-mod, „How did it actually go?". Prenosi se kako jeste.

Obavezno zadržati, jer proizlazi iz kliničke recenzije (§4a plana):
- Naslov **„A starting schedule for [ime]"** — nikad „personalized"
- Rečenicu doslovno: *„Use this as a flexible starting point, not a strict schedule. Follow your baby's individual sleep cues."*
- Sva vremena kao prozori; jedino jutarnje buđenje nosi oznaku „exact"
- Bedtime kao raspon
- Ritam-mod ispod 8 nedelja — **bez vremena za spavanje**
- Bedž: **„Built from pediatrician-reviewed guides"**, nikad „pediatrician-reviewed engine"

Mobile-first. Night mode nije kozmetika — alat se koristi u mraku, u 6 ujutru.

### Korak 3 · Deljivost · ~1–2 dana
Ovde alat ili uspe ili ne postoji.
- Parametri u URL-u, čitaju se na load-u i popunjavaju formu
- `@vercel/og` route koja crta karticu sa imenom bebe i satnicom
- OG meta tagovi (`og:image`, `og:title`, `twitter:card`) — da se u WhatsAppu i iMessage-u prikaže slika, ne goli link
- „Sačuvaj kao sliku": 1080×1920 za story, 1000×1500 za Pinterest

### Korak 4 · Deploy i merenje · ~0.5 dana
- Vercel, rewrite `sn00zly.com/schedule`
- Postojeća lead-magnet stranica → redirect na generator
- Eventi: `generator_start`, `generator_complete`, `share_click`, `image_save`, `product_click`

**Ukupno oko 5 radnih dana.**

---

## Namerno se NE gradi u prvoj verziji

Ništa od ovoga ne menja odgovor na pitanje „da li iko ovo koristi i deli".

- Email sekvenca i Klaviyo integracija
- Programatske stranice po uzrastu
- Baza i perzistencija
- Nalozi i registracija — svaki konkurent ih traži, to što ih Sn00zly ne traži je diferencijacija
- Tracker spavanja — Huckleberryjev teren
- AI coach

---

## Pragovi posle 30 dana

| Metrika | Prag |
|---|---|
| Završetak generatora | >70% |
| **Deljenje / snimanje slike** | **>15%** |
| Generator → stranica proizvoda | >12% |
| Generator → kupovina | ≥1% |

**Kill kriterijum:** posle 500 generisanih rasporeda, ako je deljenje ispod 8%, mehanizam ne vuče. Tada se ne gradi ni email sekvenca, ni programatske stranice, ni coach — nego se ide na pivot opcije.

---

## Stanje kataloga (van builda, ide paralelno)

- ✅ **C26 rešen i live** — Wake Window Cheat Sheet v2, strane 4–7 prerađene iz kanona, zamenjen na Shopify i u email linku (31.08.2026)
- ⏳ **Nap Transition Kit** — najviše ispravki po Pravilu 1; sledeći na redu
- ⏳ **Printable stranice** u stage vodičima, po Pravilu 2
- ⏳ **C32 / C32b** — tabele u Stage 3 i Stage 4 spustiti na vrednosti iz sopstvenih sample rasporeda
- ⏳ **C31** — dodati kolonu za dnevni san u Stage 1
- ⏳ **Night Weaning Blueprint** — „4–6 months" → „6–8 months" (odluka Dr. Alexander, Q2)
- 📄 **Engine review sheet** spreman ako se odluči da se traži pregled same računice; do tada važi samo „built from pediatrician-reviewed guides"

Pipeline za rebuild PDF-ova je dokazan na Cheat Sheetu: fontovi Poppins i Lora su lokalno dostupni, Chromium renderuje, logo je u projektu, a strane se spajaju u original preko `pypdf` tako da nedirnute ostaju bajt-identične.
