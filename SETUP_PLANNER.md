# Sn00zly Daily Sleep Planner — podešavanje i puštanje

Grana: `daily-sleep-planner`. Generator je sada plaćeni **Sn00zly Daily Sleep Planner** ($4.99/mesečno, Stripe).

## Kako radi (ukratko)

| Adresa | Šta je |
|---|---|
| `/` | Prodajna stranica: primer plana, šta se dobija, dugme za kupovinu, FAQ. Ako link ima potpisan share (`?n=…&k=…`), prikazuje podeljeni plan + poziv na kupovinu. |
| `/planner` | Zaključani planner (samo aktivna pretplata). Pamti bebu na uređaju, plan za danas, "rebuild the day", slika i share link, ponuda vodiča sa kuponom, kupon + cheat sheet, "Manage subscription". |
| `/login` | Prijava mejlom: stiže link (važi 30 min), bez lozinke. |
| `/api/checkout` | Pravi Stripe Checkout (pretplata). |
| `/api/checkout/complete` | Stripe vraća kupca ovde → odmah je prijavljen → `/planner?welcome=1`. |
| `/api/stripe/webhook` | Posle kupovine: pravi jedinstven $15 Shopify kupon, šalje Klaviyo događaj (welcome mejl) i Meta Purchase. Beleži otkazivanja. |
| `/api/portal` | Stripe stranica za otkazivanje / promenu kartice. |
| `/api/share`, `/api/og` | Potpisani share linkovi i slika plana. Nepotpisan link prikazuje samo primer, pa se URL ne može menjati za besplatno korišćenje. |
| `/api/cheatsheet` | Preuzimanje Cheat Sheet-a (samo za članove). |

Nema baze: Stripe je izvor istine. Kupon se čuva u Stripe customer metadata (`planner_coupon`).

## 1. Env varijable u Vercelu

Settings → Environment Variables. Za test prvo **Preview** (test ključevi), posle **Production** (live ključevi).
Promena `NEXT_PUBLIC_*` varijabli traži novi deploy.

| Varijabla | Vrednost | Tajna? |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://schedule.sn00zly.com` (za Preview: tačna preview adresa grane) | ne |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key (`sk_test_…` / `sk_live_…`) | **da** |
| `STRIPE_PRICE_ID` | test: `price_1UFzkCLLfbNeUEnKNpA5zlnl`; live: novi ID posle "Copy to live mode" | ne |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` iz koraka 2 | **da** |
| `AUTH_SECRET` | nasumičan niz, min. 32 znaka (npr. `openssl rand -base64 48`). Ne menjati posle puštanja: promena odjavljuje sve i kvari podeljene linkove. | **da** |
| `SHOPIFY_STORE_DOMAIN` | `xxxx.myshopify.com` (Shopify admin → Settings → Domains) | ne |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | iz koraka 3 | **da** (secret) |
| `KLAVIYO_PRIVATE_API_KEY` | već postoji | **da** |
| `SMTP_USER` / `SMTP_PASS` | iz koraka 4 | **da** (pass) |
| `SMTP_FROM` | `Sn00zly <hello@sn00zly.com>` | ne |
| `NEXT_PUBLIC_META_PIXEL_ID` | Pixel ID iz Events Managera | ne |
| `META_CAPI_TOKEN` | Events Manager → Pixel → Settings → Conversions API → Generate access token | **da** |
| `META_TEST_EVENT_CODE` | samo tokom testa (Events Manager → Test events); posle testa **obrisati** | ne |
| `CHEATSHEET_URL` | link do Wake Window Cheat Sheet PDF-a (Shopify → Content → Files) | ne |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | već postoji | ne |

## 2. Stripe webhook

Developers → Webhooks → Add endpoint
- URL: `https://schedule.sn00zly.com/api/stripe/webhook` (za test: preview adresa + `/api/stripe/webhook`)
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Signing secret (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`
- Test i live mode imaju **odvojene** webhook-ove i tajne.

Ako je na Vercelu uključen *Deployment Protection* za preview, Stripe ne može da dođe do webhook-a. Za test ga isključi za preview ili koristi *Protection Bypass for Automation*.

## 3. Shopify aplikacija za kupone

1. Shopify **Dev Dashboard** (dev.shopify.com) → Create app (ista organizacija kao prodavnica).
2. Na verziji aplikacije izaberi scope **`write_discounts`** → Release.
3. Instaliraj aplikaciju na prodavnicu Sn00zly.
4. Settings aplikacije → **Client ID** i **Client secret** → Vercel.

Kupon: `PLANNER-XXXXXXXX`, $15, jedna upotreba, važi na sve proizvode, bez isteka.

## 4. Mejl za prijavu (Google Workspace)

1. Nalog koji šalje mora imati uključen **2-Step Verification**.
2. myaccount.google.com → Security → **App passwords** → napravi "Sn00zly Planner".
3. `SMTP_USER` = mejl tog naloga, `SMTP_PASS` = app password (16 znakova, bez razmaka).
4. Ako je `hello@sn00zly.com` alias, a ne poseban nalog: u Gmailu mora biti podešeno "Send mail as" za hello@.

## 5. Klaviyo

- Novi **flow** sa okidačem metric **"Planner Subscription Started"** (pojaviće se posle prvog test kupovanja). Mejl bez čekanja, sa:
  - `{{ event.coupon_code }}` ($15 kod), `{{ event.shop_url }}` (link koji sam primenjuje kod)
  - `{{ event.planner_url }}` i `{{ event.login_url }}`
  - `{{ event.cheat_sheet_url }}` (Cheat Sheet)
- Opciono: flow na **"Planner Cancellation Scheduled"** / **"Planner Subscription Ended"** (npr. mejl koji poziva nazad).
- Profili dobijaju `planner_member`, `planner_status`, `planner_coupon`, `planner_renews_at` i `planner_utm_*` → segment "Planner members".
- Stari flow za besplatan generator (lista `SFCu7v`) više ne dobija nove ljude; pauziraj ga ako šalje nešto vezano za generator.

## 6. Test (Preview, Stripe Test mode)

1. Otvori preview adresu → **Start my plan** → kartica `4242 4242 4242 4242`, bilo koji budući datum, bilo koji CVC.
2. Treba da završiš na `/planner` sa porukom "Welcome — you're in".
3. Za minut se na planneru pojavljuje kod `PLANNER-…`; u Shopify → Discounts postoji taj kod; stiže Klaviyo mejl.
4. Napravi plan → **Save as image** i **Share link** (otvori link u privatnom prozoru: vidi se plan + ponuda).
5. **Sign out** → `/login` → stiže mejl sa linkom → prijava radi.
6. **Manage subscription** → Cancel → planner piše do kada je otvoren.
7. Meta Events Manager → Test events: `PageView`, `InitiateCheckout`, `Purchase` (browser + server, spojeni).

## 7. Puštanje uživo

1. Stripe: *Copy to live mode* za proizvod → novi live Price ID; Customer portal i branding podesiti i u live modu.
2. Live webhook (korak 2) → novi `whsec_…`.
3. Production env: `sk_live_…`, live `STRIPE_PRICE_ID`, live `STRIPE_WEBHOOK_SECRET`, ostalo kao u testu. **Bez** `META_TEST_EVENT_CODE`.
4. Merge grane u `main` → Vercel deploy.
5. Jedna prava kupovina svojom karticom → provera → refund i otkazivanje u Stripe-u.
6. Nova Meta kampanja: cilj **Sales**, konverzija **Purchase**, odredište `https://schedule.sn00zly.com/`.

## Poznata ograničenja

- Link za prijavu se može iskoristiti više puta u roku od 30 minuta.
- Podeljeni link za jedan plan važi trajno (samo za tu bebu i to vreme buđenja).
- Dok Stripe ponovo pokušava neuspelo plaćanje (`past_due`), planner ostaje otvoren. Kad Stripe otkaže pretplatu, pristup se zatvara.
- Stari linkovi iz mejlova besplatnog generatora sada otvaraju prodajnu stranicu.
- Lokalni `next build` traži pristup fonts.googleapis.com (next/font), a Vercel ga ima.
