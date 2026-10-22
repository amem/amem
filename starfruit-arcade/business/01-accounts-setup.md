# 01 — Accounts and setup (Day 1–2)

Open these in order. Use the same studio name, avatar and short bio everywhere so clients
and buyers recognise you across platforms.

> Platforms change their forms and fees often. Where this guide gives a number, check the
> platform's current help page before you rely on it.

## 0. Before you start (15 minutes)

- [ ] **Name.** "Starfruit Arcade" is a placeholder. Keep it or pick your own, then check it is
      free as a Fiverr username, an itch.io page, a Gumroad subdomain and (optionally) a domain.
      Rename everywhere with a project-wide search and replace.
- [ ] **E-mail.** One business address used for every platform.
- [ ] **Photo.** Fiverr and Upwork convert better with a real, friendly photo of you
      (plain background, shoulders up). Use `marketing/out/brand/studio-logo.png` only on the
      product stores (itch.io, Gumroad).
- [ ] **Payout method.** Platforms pay out through bank transfer, PayPal and/or Payoneer
      depending on your country. If PayPal cannot receive money where you live, open a
      Payoneer account first — Fiverr, Upwork and many stores support it.
- [ ] **ID.** Fiverr and Upwork verify identity. Have your national ID or passport ready.

## 1. Fiverr (seller)

1. Sign up at fiverr.com → "Become a Seller".
2. Profile: photo, display name, the description from [02-fiverr.md](02-fiverr.md) §1,
   languages, skills (HTML5, JavaScript, Game Development, Canvas, Web Design).
3. Complete identity verification when asked.
4. Create the gigs from [02-fiverr.md](02-fiverr.md). Upload images from `marketing/out/fiverr/`
   and a trailer from `marketing/out/video/` (see §7 of this file if Fiverr refuses `.webm`).
5. Turn on notifications in the Fiverr mobile app. **Response time is a ranking factor.**

## 2. Upwork (freelancer)

1. Sign up at upwork.com as a freelancer. Choose "Web, Mobile & Software Dev" →
   "Game Development" / "Web Development".
2. Paste the profile from [03-upwork.md](03-upwork.md): title, overview, skills, hourly rate.
3. Add the 4 portfolio items with images from `marketing/out/upwork/` and links to your website.
4. Add the Project Catalog projects (fixed-price offers) from [03-upwork.md](03-upwork.md) §5.
5. New profiles are reviewed and sometimes rejected the first time when a category is busy:
   complete every field, add the portfolio, and resubmit if needed.
6. Proposals cost "Connects" (paid credits). Budget a small amount for the first month.

## 3. itch.io (games + source code store)

1. Create an account at itch.io → set up a creator profile with the studio logo.
2. Settings → Payment: connect your payout method so you can sell.
3. Create the pages from [04-itch-io.md](04-itch-io.md). Upload files from `dist/itch/`
   (browser builds) and `dist/source/` (paid source code).

## 4. Gumroad (or Payhip / Lemon Squeezy)

1. Create an account at gumroad.com and connect a payout method.
   If Gumroad cannot pay out in your country, use **Payhip** or **Lemon Squeezy** instead —
   the same copy and files work.
2. Create the products from [05-gumroad.md](05-gumroad.md) with files from `dist/source/`.

## 5. Your website (free hosting)

The site in `site/` is your portfolio and storefront: it plays every game in the browser
and links to your gigs and stores.

1. Run `npm install` once, then `npm run build` → `dist/site/` is the finished website.
2. Put it online for free, pick one:
   - **Netlify Drop** (easiest): open app.netlify.com/drop and drag the `dist/site` folder in.
   - **GitHub Pages**: create a new **public** repository, upload the contents of `dist/site`,
     then Settings → Pages → Deploy from branch. A ready workflow is in
     `.github/workflows/pages.yml` if you move this whole folder into its own repository.
   - **Cloudflare Pages** or **Vercel**: connect the repository or upload the folder.
3. After your accounts exist, paste their links into `site/site.config.js`, rebuild and redeploy.
   Empty links are hidden automatically, so the site never shows a broken button.
4. Optional: buy a domain (about $10/year) and connect it to the host.

## 6. Payment + tax hygiene (not legal advice)

- Keep a simple spreadsheet: date, platform, client/product, gross, fees, net.
- Platforms take a fee from each sale; price with that in mind (see
  [09-pricing-and-growth.md](09-pricing-and-growth.md)).
- Income from freelancing and digital sales is usually taxable. Check the rules in your
  country, or ask a local accountant once you have regular income.

## 7. Converting trailers to MP4 (if a platform refuses .webm)

The trailers in `marketing/out/video/` are `.webm`. Most platforms accept them; if one
does not, convert for free:
- Desktop: HandBrake (open the file → Preset "Fast 1080p30" → Start).
- Command line: `ffmpeg -i in.webm -c:v libx264 -pix_fmt yuv420p -movflags +faststart out.mp4`
