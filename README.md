# Dearly Club

Website for **Dearly Club**, Ariane Lignier's monthly mail club: *Create deeper connection, one letter at a time.*

Built with React 19 + Vite, hosted on GitHub Pages. Payments go through Stripe; orders, members and the secure Stripe connection run on Firebase (Cloud Functions + Firestore, region europe-west1).

## Getting started

Requires Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build locally
```

Useful pages while building:

- `/` — home (Phase 1 preview)
- `/styleguide` — colours, type, buttons, surfaces and the full photo library

## Project structure

```
src/
  assets/images/      Ariane's photos (max 2400px) + index.js with alt text and where each is used
  components/
    layout/           Site shell (header, footer, page wrapper)
    ui/               Reusable pieces: Button, Container, Section, Eyebrow, ResponsiveImage
  content/site.js     All site copy, plans and prices — text from the old Wix site is marked "verbatim"
  hooks/              Small React hooks (page titles, later: scroll reveal)
  pages/              One file per page
  styles/
    tokens.css        Design tokens: colours, type scale, spacing, radii, shadows, motion
    base.css          Reset, typography and utilities
```

### Design tokens

Everything visual comes from `src/styles/tokens.css`. Change a colour or spacing there and it updates everywhere. Motion tokens fall to zero when a visitor has "reduce motion" turned on.

### Images

Photos are imported through `src/assets/images/index.js`. At build time `vite-imagetools` makes WebP + JPEG versions at 640, 1200 and 1920px wide, and `<ResponsiveImage>` serves the right size:

```jsx
import { images } from '../assets/images'
<ResponsiveImage image={images.poppyCardPen} sizes="(min-width: 900px) 50vw, 100vw" />
```

To add a photo: drop the `.jpg` in `src/assets/images/` and add a line with its alt text to `library` in `index.js`.

### Logo

`src/assets/brand/logo.png` (burgundy) and `logo-cream.png` (for photos and dark bands), used through `<Logo tone="cream" />`. Favicons, the iPhone home-screen icon and the link-preview image (`og-image.jpg`) are in `public/`.

### Fonts

Cormorant Garamond (headings) and Jost (body) are self-hosted via Fontsource, so no visitor data goes to Google Fonts (GDPR).

## Payments setup (Firebase + Stripe)

How a purchase works:

1. `/checkout` collects name, email and the full shipping address (required) plus consent to the terms and, for members, the monthly renewal.
2. The `createCheckoutSession` Cloud Function re-checks everything, saves the order to Firestore (`orders/`), and returns a link to Stripe's secure hosted checkout. Stripe Tax adds VAT/sales tax from the address.
3. After paying, Stripe sends the shopper to `/checkout/success`, and sends a webhook to `stripeWebhook`, which marks the order paid, records members (`members/`), and adds a new order every month a membership renews.
4. Members manage their address, card, skips and cancellation at `/manage` (Stripe customer portal, no password).

The website itself holds no secret keys. The Stripe secret key and webhook secret live only in Firebase Secret Manager.

### First-time setup (test mode)

From the project folder, in Git Bash:

```bash
npm i -g firebase-tools          # once
firebase login                   # once
cd functions && npm install && cd ..

# 1. Store the Stripe secret key (paste sk_test_... when asked — it is never shown or saved in files)
firebase functions:secrets:set STRIPE_SECRET_KEY

# 2. Create the products, prices and member portal in Stripe
cd functions
STRIPE_SECRET_KEY=sk_test_... npm run setup:stripe
#    → copy the "Portal login link" it prints into src/content/site.js → stripeLinks.portalLoginUrl
cd ..

# 3. Deploy the functions and database rules (first deploy takes a few minutes)
firebase deploy --only functions,firestore

# 4. Create the webhook (use the stripeWebhook URL printed by the deploy)
cd functions
STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe.js --webhook https://europe-west1-dearly-club.cloudfunctions.net/stripeWebhook
#    → it prints a whsec_... secret. Store it:
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
cd ..
firebase deploy --only functions     # picks up the new secret
```

In the **Stripe dashboard** (test mode):

- **Tax → Get started**: set the business address and add a registration where Ariane is VAT-registered. Until then, set `STRIPE_TAX_ENABLED=false` in `functions/.env` and redeploy, or checkout will refuse to start.
- **Settings → Customer emails**: turn on "Successful payments" and "Refunds" so customers get receipts.

Test cards: `4242 4242 4242 4242`, any future date, any CVC. Then check Firestore → `orders` in the Firebase console.

### Gift memberships

1. `/gift`: the buyer picks 3, 6 or 12 months (€27 / €54 / €108), enters their name and email, the recipient's name and email, an optional message and an optional send date. No address is needed.
2. `createGiftCheckout` saves the gift (`gifts/`) and opens Stripe Checkout (one payment, no renewal).
3. When Stripe confirms payment, the webhook gives the gift a unique code (`DEAR-XXXX-XXXX`, no look-alike characters), emails the buyer a confirmation, and emails the recipient their e-gift card, straight away or at 8:00 on the chosen date (`sendScheduledGifts`).
4. `/redeem`: the recipient enters the code, their name, email and shipping address. `redeemGift` checks the code (10 tries per hour per visitor), marks it used, and puts the first letter on the shipping list (`orders/`, type `gift`).
5. On the 1st of each month, `monthlyGiftOrders` adds one more order per active gift until its months run out.

### Email (Brevo, sent by our own function)

Every email (order confirmations, gift cards, contact messages, newsletters…) is written to the Firestore `mail` collection. The `sendQueuedEmail` function sends each one through **Brevo** from **Dearly Club <hello@dearlyclub.eu>** (replies go to hello@dearlyclub.eu, which Namecheap forwards to Ariane's Gmail). Each mail document gets a `delivery` field showing SUCCESS or ERROR; failed sends (e.g. Brevo's free 300/day limit) are retried every 30 minutes, up to 4 times. Until it's set up, emails wait safely in the queue.

(We don't use Firebase's "Trigger Email" extension: Firebase Extensions shut down on 31 March 2027.)

Setup (done once — dearlyclub.eu is already authenticated in Brevo):

1. Brevo → **SMTP & API → SMTP**: copy the **SMTP login** into `functions/.env` as `BREVO_SMTP_LOGIN=…`.
2. Brevo → **Generate a new SMTP key**, then store it (paste when asked, never in a file):
   ```bash
   firebase functions:secrets:set BREVO_SMTP_KEY
   ```
3. `firebase deploy --only functions`
4. Test: Admin → **Email members** → *One person* → your own email.

The email images (`public/email/`) load from the live site, set by `SITE_URL` (default: the GitHub Pages address). At launch, set `SITE_URL=https://dearlyclub.eu/` in `functions/.env` and redeploy.

### Going live

Repeat steps 1–4 with the `sk_live_...` key, and set up Stripe Tax in live mode. Full order of steps: **Launch runbook** below.

### Tax note

Prices are created with tax **added on top** of €9 (`TAX_BEHAVIOR=exclusive`), as agreed. EU consumer rules normally require the price shown to include VAT, so confirm with Ariane's accountant. To switch, create the prices with `TAX_BEHAVIOR=inclusive`.

## Admin area

Lives at `/admin` (e.g. `…/Dearly-Club/admin`, later `dearlyclub.eu/admin`). It is hidden from search engines and only loads when opened.

**Pages**

- **Dashboard** — active members, this month's revenue, the next shipping batch and a "needs attention" list (letters to post, new messages, withdrawal requests, failed payments, unsent gift cards), plus a six-month summary.
- **Shipping list** — every paid letter for one month (December letters are posted 20th–25th November). Tick letters and **Mark as posted**; **Download CSV** gives names and addresses for labels (opens in Excel/Numbers, or a label tool).
- **Orders** — every checkout, renewal and gift letter; click one to review the details and jump to it in Stripe (refunds happen in Stripe).
- **Members** — monthly members by status, with CSV export and links to Stripe.
- **Gift cards** — who bought what for whom, codes, months left; resend a gift card email.
- **Inbox** — contact-form messages and withdrawal requests (each also arrives by email). Withdrawals show the 14-day refund deadline.
- **Email members** — write once, send to active members, gift members, everyone, or one person. Each person gets a private email starting "Dear [first name],". It shows how many people it will reach and asks you to confirm.

**Giving someone admin access (one-time, in the Firebase console)**

1. **Authentication → Users → Add user**: enter their email and a temporary password.
2. Copy the new user's **User UID** from that list.
3. **Firestore Database → Start collection** `admins` (or open it) → **Add document** → Document ID = that UID → add a field `email` (string) with their email → **Save**.
4. They sign in at `/admin` and use **Forgot password?** to choose their own password.

To remove access, delete their document in `admins` (and the user in Authentication).

The database rules (`firestore.rules`) let admins read business records and only change a letter's posted status or a message's handled status; everything else is written only by the Cloud Functions. Deploy rules and functions with:

```bash
firebase deploy --only firestore,functions
```

## The Dearly Chat (community)

**Accounts** live at `/account`. People sign up with an emailed sign-in link (no password) or with email + password (then confirm their email). On first sign-in they create a profile — display name, country, short bio, interests, avatar colour — and confirm they're 18+ and accept the Community Guidelines.

**Free or member is automatic.** An account counts as a *member* when its confirmed email matches an active (or retrying) mail-club membership, or a redeemed gift with months left. It updates by itself when a membership starts, is cancelled or a gift runs out. Members who joined with a different email can sign up with that one instead. The browser can never set this — only the Cloud Functions do.

- `profiles/{uid}` — what other members can see (never the email).
- `users/{uid}` — private: email, tier, consent record. Only the owner and admins can read it.
- **Admin → Community**: every account, member/free, CSV export, and **Pause account** (signs them out and blocks sign-in) / **Restore**.
- **Lifetime memberships** (Admin → Community): complimentary, permanent member access by email, no subscription needed — for Ariane, friends, collaborators. Admins always count as members. Stored in `complimentary/{email}`.
- Members can **delete their account** from `/account` (it doesn't touch their mail-club membership).

**The Dearly Club chat** lives at `/dearly-chat/the-dearly-club` (linked from the Dearly Chat page and the account page). Messages appear live for everyone in the room.

- Sending goes through the `postMessage` function: it checks the person is signed in, confirmed, not paused and allowed in the room, and limits posting to 8 messages a minute / 60 an hour. Links are shown as plain text (not clickable), which takes the fun out of spam.
- Anyone can **delete** their own message, **report** someone else's (with a reason), or **block** a member (their messages disappear for you; they aren't told). Blocked members can be unblocked from `/account`.
- A message reported by **3 different people is hidden automatically** until reviewed.
- **Admin → Moderation**: every report with the message text and reasons — **Hide**, **Restore** or **Dismiss**; pause the author from **Community**. Open reports also show on the Dashboard.
- Ariane's own chat profile shows a **Host** badge (any account listed in `admins/` gets it when it saves its profile — create Ariane's chat profile at `/account` with her admin login).
- Deleting an account blanks all of that person's messages ("Former member").

**Pen Pal Match & Chat** (`/dearly-chat/pen-pals`, members only)

- A member chooses the languages they write in, where their pen pal should be (anywhere / another country / their country) and how they'll write (letters, chat, or both). They're matched straight away with the longest-waiting compatible member, or wait (re-tried every hour). Both get an email.
- Matching never pairs people who blocked each other or were pen pals before.
- Each pair gets a **private chat** (`/dearly-chat/pen-pals/<id>`). Reports from it go to Moderation like any other message.
- **Exchange addresses**: each person can offer their postal address. The other person only sees it once **both** have offered. Either can take it back; ending the match deletes both addresses.
- Either person can **end the match**: the chat becomes read-only and they can ask for a new pen pal.
- **Admin → Pen pals**: who's waiting, active pairs, **Match these two** by hand (ignores preferences, never blocks), and **End match**. Admins can't see addresses.

**Slow Rituals** (`/dearly-chat/slow-rituals`, members only): a library of rituals (newest month open first) and the *Slow Rituals circle* chat underneath. **Admin → Slow Rituals**: write a ritual (title, month, short intro, the ritual itself), save as draft or tick *Published*.

**One-time Firebase console setup**

1. **Authentication → Sign-in method**: *Email/Password* on, with *Email link (passwordless sign-in)* on. (Already done.)
2. **Authentication → Templates**: set the sender name to *Dearly Club* and adjust the wording of the verification, password-reset and sign-in emails. At launch you can also send them from an @dearlyclub.eu address (*Customize domain* — it gives DNS records to add at Namecheap).
3. **Authentication → Settings → Authorized domains** must include `christian-schneider-davis.github.io`, `dearlyclub.eu` and `www.dearlyclub.eu`. (Already done.)
4. Deploy: `firebase deploy --only firestore,functions` (this also creates the chat's database indexes).

## Shipping schedule

Letters are posted between the 20th and 25th of each month. Orders and renewals paid by the 19th (Paris time) receive the next month's letter (`letterMonth`, e.g. `2026-12`, saved on every order). The site shows shoppers which month's letter they'll get. Gift memberships add their next letter on the 19th at 20:00.

## Legal & consent

- Policy pages live in `src/content/legal.js` (drafts to EU and US norms, not legal advice). Fill in `legalEntity`, have them reviewed, then set `draft = false` to remove the "draft" notice.
- **Withdraw from contract here** (`/legal/withdraw`, linked in every footer): the EU withdrawal button required since 19 June 2026. Two steps (review → confirm); the `submitWithdrawal` function saves it with the time received, emails the customer a confirmation, and emails Ariane (`ADMIN_EMAIL` in `functions/.env`) to refund and cancel.
- Every paid order gets a confirmation email with the renewal terms, how to cancel and the right of withdrawal.
- Cookie consent: `ConsentProvider` + banner (Accept and Reject weighted equally), "Cookie settings" in the footer, choices kept 12 months, Global Privacy Control respected. Wrap any future optional script in `<ConsentGate category="analytics">`.

## Deployment

Pushing to `main` builds and deploys automatically (`.github/workflows/deploy.yml`).

One-time setup on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The site is then live at https://christian-schneider-davis.github.io/Dearly-Club/

### Preview vs. live address

The build reads two GitHub repository variables (**Settings → Secrets and variables → Actions → Variables**):

| Variable | Before launch (unset) | At launch |
|---|---|---|
| `SITE_BASE` | `/Dearly-Club/` | `/` |
| `SITE_URL` | `https://christian-schneider-davis.github.io/Dearly-Club/` | `https://dearlyclub.eu/` |

While the site runs on the github.io address it tells search engines not to index it, so it never competes with dearlyclub.eu. `sitemap.xml` and `robots.txt` are generated for whichever address is set.

## Newsletter

Replaces the Wix mailing list. The home-page form sends a confirmation email; people are only added once they click it (double opt-in). Every newsletter email has an unsubscribe link (and a `List-Unsubscribe` header).

- **Admin → Newsletter list**: see subscribers, export CSV, remove someone, and **Import the Wix mailing list** (Wix → Contacts → filter *Email subscribers: Subscribed* → Export). Imported people get no email; anyone who unsubscribed stays unsubscribed.
- **Admin → Email members → Newsletter subscribers** to send one.

## Launch runbook

**Before launch day (on the github.io preview)**

1. Stripe test mode works end to end (README → First-time setup): a member checkout, a one-time letter, a gift + redeem, cancelling in the portal.
2. Email is set up (Email section above), and these arrive: order confirmation, gift card, contact message, newsletter confirmation.
3. Ariane's legal details are in `src/content/legal.js`, reviewed, and `draft = false`.
4. Ariane has admin access and has signed in.
5. The Wix mailing list is imported (Admin → Newsletter list).
6. Write down the current DNS records for dearlyclub.eu (wherever the domain is managed — Wix if it was bought there). **Keep any MX/TXT records**: they run the domain's email.

**Launch day**

1. **Stripe live**: run the Stripe setup with the `sk_live_...` key, create the live webhook, store its `whsec_...`, turn on Stripe Tax in live mode, and put the live **portal login link** in `src/content/site.js → stripeLinks.portalLoginUrl`.
2. **Functions**: in `functions/.env` set `SITE_URL=https://dearlyclub.eu/`, then `firebase deploy --only firestore,functions`.
3. **GitHub variables**: set `SITE_BASE` = `/` and `SITE_URL` = `https://dearlyclub.eu/` (table above).
4. **GitHub domain**: verify the domain first (your GitHub *account* Settings → Pages → Add a domain — protects it from takeover), then repo **Settings → Pages → Custom domain**: `dearlyclub.eu`.
5. **DNS** (at the domain's provider): remove the Wix `A`/`CNAME` records for `@` and `www`, then add
   - `A` `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` `@` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` `www` → `christian-schneider-davis.github.io`
   
   Leave MX/TXT (email) records alone.
6. When GitHub shows the DNS check passing (minutes to a few hours), tick **Enforce HTTPS**.
7. Push to `main` (or Actions → Deploy → **Run workflow**) so the site rebuilds for dearlyclub.eu.
8. **Smoke test** on a phone and a computer: home, memberships, a real €9 one-time order with your own card (refund it in Stripe), gift page, contact form, newsletter sign-up, `/admin`, an old Wix link such as `/pricing-plans/memberships` (should land on Memberships), and a made-up address (should show the 404 page).
9. **Google Search Console**: add `dearlyclub.eu`, submit `https://dearlyclub.eu/sitemap.xml`.
10. Update the link in the Instagram and TikTok bios if needed.

**After launch**

- **Cancel the old Wix recurring plans** (Wix → Pricing Plans → subscriptions) so nobody is charged twice once they re-join here.
- Export Wix contacts and orders for your records.
- Then cancel the Wix Premium plan. If the domain is registered with Wix, keep the domain subscription (or transfer it out) — cancelling the site plan doesn't need to touch the domain.

Old Wix links (`/pricing-plans/…`, `/dearlychat`, `/group-page/…`, `/category/…`, events, bookings) redirect to the closest new page (`src/lib/redirects.js`); anything else shows the 404 page with links back in.

## Build plan

| Phase | Scope | Status |
|---|---|---|
| 1. Foundations | Project setup, design tokens, fonts, UI primitives, content + photo backup, deploy pipeline | ✅ Done |
| 2. Look & feel | Animated header, footer, scroll reveals, Home and About | ✅ Done |
| 3. Store | Memberships page, pricing selector, Contact | ✅ Done |
| 4. Checkout | Required address form, Stripe + Stripe Tax, confirmations, member self-service | ✅ Built — see Payments setup |
| 5. Gift memberships | Gift purchase, e-gift card email, redemption | ✅ Built — needs email setup |
| 6. Legal & cookies | Cookie banner, policy pages, consent at checkout, withdrawal button | ✅ Built — needs legal review |
| 7. Admin | Dashboard, shipping list, orders, members, gift cards, inbox, email members | ✅ Built — see Admin area |
| 8. Launch | Newsletter, old-link redirects, SEO, device + accessibility pass, launch runbook | ✅ Built — follow the Launch runbook |
| 9. Community accounts | Sign up/in (email link or password), profiles, automatic free/member status, delete account, admin Community page | ✅ Built — see The Dearly Chat |
| 10. The Dearly Club chat | Live group chat for all accounts, report, block, delete, admin Moderation | ✅ Built — see The Dearly Chat |
| 11. Members' clubs | Pen Pal Match & Chat (matching, private chat, address exchange), Slow Rituals (library + circle chat), admin Pen pals & Slow Rituals | ✅ Built — see The Dearly Chat |

## Still needed from Ariane

- Legal details are filled in (`src/content/legal.js` → `legalEntity`): Dearly Club, Spain, hello@dearlyclub.eu, AEPD. **Address and NIF/VAT number are left out for now.** Spanish law for online businesses (LSSI, art. 10) and EU consumer rules normally require a postal address and tax ID on the site — ask the reviewer whether hers can be omitted (e.g. a registered business address or PO box instead of a home address).
- After a legal review, set `draft = false` in `src/content/legal.js` (removes the "draft" notice on legal pages).
- VAT registration status (affects Stripe Tax settings).
