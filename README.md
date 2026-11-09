# Velkrypt Wire

A full cybersecurity news website: articles, reader accounts, comments, saved stories, an admin panel, an automatic news feed, a newsletter with real emails, and paid memberships.

**Stack (all free tiers to start):** Next.js 15 · Supabase (database + accounts) · Resend (email) · Stripe (payments) · Vercel (hosting)

---

## What's included

| Area | Features |
|---|---|
| **Public site** | Front page with lead story, live CISA KEV watch + exploited-CVE ticker, categories, full-text and CVE search, article pages, RSS feed, sitemap, SEO metadata |
| **Accounts** | Sign up with email confirmation, sign in, password reset, display name, saved stories, comments |
| **Membership** | Stripe checkout, billing portal (cancel/change card), premium "Members analysis" sections locked at database level |
| **Newsletter** | Double opt-in sign-up, welcome email, send editions to all subscribers, test sends, one-click unsubscribe (Gmail/Outlook compliant), CSV export |
| **Admin panel** | Dashboard, Markdown article editor, drafts/publish/unpublish, lead story, members-only sections, user roles and free premium |
| **Auto news feed** | Every morning pulls new items from CISA, NCSC UK, BleepingComputer, The Hacker News, Krebs, SecurityWeek and CISA KEV into a review queue. One click starts a draft with the source pre-filled; you write it in your own words |
| **Security** | Row Level Security on every table, strict security headers (CSP, HSTS, no framing), sanitised Markdown, CSRF checks, signed Stripe webhooks, timing-safe cron secret, rate-limited sign-ups, no account enumeration, CSV-injection-safe export, zero known vulnerable dependencies |

---

## Deploy it (about 45 minutes, no coding needed)

You need free accounts on **GitHub**, **Supabase**, **Vercel**, **Resend** and **Stripe**.

### 1. Put the code on GitHub
1. Create a new **private** repository called `velkrypt-wire` on github.com.
2. Unzip this project, then upload all the files (drag the folder contents into "Add file → Upload files"). Don't upload `node_modules` or `.next` if they exist.

### 2. Create the database (Supabase)
1. On supabase.com, click **New project**. Pick region **London (eu-west-2)**, set a strong database password, and wait for it to finish.
2. Go to **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, and click **Run**.
3. New query again, paste `supabase/seed.sql` and **Run**. This adds the 18 launch stories.
4. Go to **Project Settings → API** and keep this tab open. You need the **Project URL**, the **anon public** key and the **service_role** key.

### 3. Put it online (Vercel)
1. On vercel.com, click **Add New → Project** and import your `velkrypt-wire` repo.
2. Before clicking Deploy, open **Environment Variables** and add every line from `.env.example` with your real values. You can leave Resend and Stripe as placeholders for now and fill them in at steps 5 and 6.
   - `NEXT_PUBLIC_SITE_URL`: use `https://velkrypt-wire.vercel.app` for now (Vercel shows your exact address after the first deploy; update this and redeploy if it differs).
   - `CRON_SECRET`: any long random string.
3. Click **Deploy**. Your site is now public.

### 4. Connect accounts to your URL (Supabase)
1. In Supabase go to **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel address.
3. Under **Redirect URLs** add `https://YOUR-ADDRESS/auth/callback`.
4. Open your site, click **Join → Create account**, and confirm the email.
5. Make yourself admin: in **SQL Editor** run
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'YOUR-EMAIL');
   ```
6. Refresh the site. You now see an **Admin** button.

### 5. Turn on emails (Resend)
1. On resend.com, create an **API key** and put it in Vercel as `RESEND_API_KEY`.
2. Until you have a domain, keep `EMAIL_FROM="Velkrypt Wire <onboarding@resend.dev>"`. This test sender can only email your own Resend sign-up address.
3. Once you own a domain, go to **Resend → Domains**, add it, add the DNS records they show you at your registrar, then change `EMAIL_FROM` to something like `Velkrypt Wire <news@yourdomain.com>`. Now emails reach everyone.
4. Optional but recommended: in **Supabase → Authentication → SMTP**, enter Resend's SMTP details so account emails also come from your domain (Supabase's built-in sender is rate-limited).

### 6. Turn on memberships (Stripe)
1. In Stripe (stay in **Test mode** first), go to **Product catalog → Add product**, for example "Velkrypt Wire Member", with a recurring monthly price. Copy the **price ID** (`price_…`) into `STRIPE_PRICE_ID`.
2. **Developers → API keys**: copy the secret key into `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://YOUR-ADDRESS/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Billing → Customer portal**: click **Activate**.
5. In Vercel, **Deployments → ⋯ → Redeploy** so the new keys take effect.
6. Test with card `4242 4242 4242 4242`, any future date and any CVC. When it works, switch Stripe to live mode and replace the three Stripe values with the live ones.

### 7. Add your domain later
1. Buy a domain (any registrar, including Fasthosts).
2. **Vercel → Project → Settings → Domains → Add**, then copy the DNS records it shows into your registrar.
3. Update `NEXT_PUBLIC_SITE_URL`, the Supabase Site URL and redirect URL, and the Stripe webhook URL to the new domain, then redeploy.

---

## Daily use

- **Write a story:** Admin → Write a story. Write in Markdown, set category, severity and CVEs, and add a members-only section if you like. Click Publish now.
- **Use the feed:** Admin → News feed. Click **Write story** on anything worth covering. The headline, CVEs and source link are pre-filled, and you write the summary in your own words. Never paste the source's text; link to it.
- **Send the newsletter:** Admin → Newsletter. Write a short intro, keep "Add this week's stories" ticked, click **Send me a test**, check it, then tick the box and **Send to all**.
- **Give someone free membership or editor access:** Admin → Users.

## Run it on your laptop (optional)

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                  # http://localhost:3000
```

## Project map

```
app/                 pages and API routes
  admin/             admin panel (staff only)
  api/newsletter/    subscribe, confirm, unsubscribe
  api/stripe/        checkout, billing portal, webhook
  api/cron/feed      daily news feed job (vercel.json schedules it at 07:00 UTC)
components/          shared UI
lib/                 Supabase clients, auth, email, Stripe, feed, Markdown
supabase/schema.sql  tables + security policies
supabase/seed.sql    launch stories
```

## Notes

- **Costs:** everything runs on free tiers to start. Vercel Hobby is for non-commercial use, so move to Vercel Pro once you take payments. Stripe charges a fee per transaction only.
- **Legal:** the Privacy and Terms pages are a sensible starting point, not legal advice. Review them before taking payments.
- **Content:** feed snippets are stored only for your review and are never published. Always write summaries in your own words and credit the original source.
