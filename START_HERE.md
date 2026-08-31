# Prompt za prvu Claude Code sesiju

Otvori Claude Code u praznom folderu u koji si prethodno kopirao pet fajlova iz ovog
paketa, pa nalepi tekst ispod.

---

Gradimo besplatan generator rasporeda spavanja za Sn00zly, na Next.js + Vercel.

U folderu se nalazi sve što ti treba:

- `Sn00zly_Generator_Build_Brief.md` — pročitaj prvo, ceo. To je specifikacija.
- `snoozly_schedule_engine.js` — gotov motor. NE prepisuj ga i ne "poboljšavaj" ga.
- `snoozly_engine_tests.js` — 999 slučajeva, 17.219 provera.
- `snoozly_canon.json` — kanonska tabela, jedini izvor istine za brojeve.
- `prototype_reference.html` — radni prototip. Sav dizajn, copy i ponašanje UI-ja
  se preuzimaju odavde. Otvori ga u browseru da vidiš kako izgleda.

Radi po koracima iz brief-a, redom, i ne preskači korak 1.

Korak 1 — scaffold:
1. `npx create-next-app@latest . --app`
2. Kopiraj motor i kanon u `lib/`
3. Dodaj `"test": "node snoozly_engine_tests.js"` u package.json
4. Pokreni `npm test`. Mora proći svih 999 slučajeva pre nego što napišeš ijednu
   liniju UI koda. Ako ne prolazi, stani i javi mi šta je palo.

Kad korak 1 prođe, javi mi pre nego što kreneš na korak 2.

Tri pravila koja važe kroz ceo build:

- Brojevi se menjaju SAMO u `snoozly_canon.json`, pa se obavezno pokreću testovi.
  Nikad ne diraj brojeve direktno u motoru.
- Copy iz prototipa se prenosi doslovno. Formulacije su prošle kliničku recenziju —
  posebno "A starting schedule", disclaimer rečenica, i to da su sva vremena prozori.
- Nigde ne sme stajati "pediatrician-reviewed engine" ni bilo šta što implicira da je
  sama računica pregledana. Dozvoljeno je isključivo "Built from our
  pediatrician-reviewed guides".
