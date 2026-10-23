# 01 — Accounts setup

Open the shop in this order. It takes about three hours, mostly waiting for verification
emails. Use the same studio name and the same logo everywhere, so buyers recognise you.

> Platform rules, fees and payout options change. Each section links to nothing on purpose:
> open the platform's own help centre and check the current terms before you rely on a number here.

## 1. Basics (15 minutes)

- [ ] **Studio name.** "Starfruit Arcade" is the default. To rename, search the project for
      "Starfruit Arcade" and replace it (catalog, site, licenses, `studio` in every `config.js`,
      `studioCredit` in `games/promo-arcade/brand.config.js`), then run `npm run assets` and
      `npm run build`. Before you decide, check the name is free as a Fiverr username, an itch.io
      username and a domain.
- [ ] **A dedicated email address** for the business (a free webmail account is fine).
- [ ] **Password manager** and **two-factor authentication** on every account below.
- [ ] **Avatar:** `marketing/out/brand/studio-logo.png` (800 × 800).
- [ ] **A sales log:** a spreadsheet with columns *date, platform, product/gig, buyer, amount,
      fee, net, notes*. You need it for taxes and to see what works.

## 2. Payouts (do this before your first sale)

You get paid through the platforms, then withdraw to your own account. The options differ by
country, so open each platform's payout settings and see what is offered where you live:

| Platform | Typical payout methods | Notes |
|---|---|---|
| Fiverr | Bank transfer, PayPal, Payoneer (country-dependent) | Earnings clear some days after an order is completed |
| Upwork | Bank transfer, PayPal, Payoneer, others (country-dependent) | Short security hold on new accounts |
| itch.io | PayPal or Stripe-type payouts, depending on your payment mode | A tax interview is required before payouts |
| Gumroad | Bank account or PayPal (country-dependent) | Payouts run on a fixed schedule |

Tips:
- A Payoneer or PayPal account usually covers Fiverr, Upwork and itch.io in one go.
- Use your **legal name** exactly as on your ID for payouts and tax forms. The studio name is
  only the shop front.
- Fill in each platform's **tax information form** (W-8BEN or similar for non-US sellers)
  when asked. It is normal and protects you from extra withholding.

## 3. Fiverr (30 minutes + review)

1. Sign up as a buyer, then choose **Become a Seller**.
2. Use your real name and photo for identity verification. Your display name can be the
   studio (follow Fiverr's current rules for business names).
3. Fill the seller profile from [02-fiverr.md](02-fiverr.md) §1: description, skills, languages, portfolio.
4. Publish **Gig 1 (branded mini-game)** and **Gig 2 (HTML5 game)** on day 1, then Gig 4 and Gig 5 on day 2
   (Gig 3 and Gig 6 when Fiverr lets your account add more gigs).
5. Install the Fiverr mobile app and turn on notifications. Fast replies win early orders.

## 4. Upwork (30 minutes + approval)

1. Sign up as a freelancer. Profile approval can take a day or more, and new profiles are
   sometimes declined in busy categories. If that happens, improve the portfolio and title and
   resubmit (see [03-upwork.md](03-upwork.md) §1).
2. Category: *Web, Mobile & Software Dev → Game Development* (and add *Web Development* skills).
3. Add the 7 portfolio items from `marketing/out/upwork/`.
4. Upwork charges "Connects" to send proposals. Spend them only on well-matched jobs.

## 5. Put the website online (20 minutes)

The website is your link in every bio, email and proposal. `npm run build` creates it in
`dist/site/` (every product is playable under `play/`).

**Fastest: Netlify Drop (free)**
1. Run `npm run build`.
2. Open Netlify Drop in your browser, sign up, and drag the `dist/site` folder onto the page.
3. Rename the site (*Site configuration → Change site name*) to something like
   `starfruit-arcade`. Your address becomes `https://starfruit-arcade.netlify.app`.

**Alternatives:** Cloudflare Pages (upload `dist/site`), GitHub Pages (push `dist/site` to a
repository and enable Pages), or any web host by FTP.

**After every change:** edit `site/site.config.js` (Fiverr, Upwork, itch.io, Gumroad links,
public email), run `npm run build`, and drag `dist/site` again.

**Custom domain (optional, about $10–15/year):** buy `yourstudio.com` from any registrar and
connect it in the host's domain settings. Nice to have, not needed to start.

Then test on your phone: open the site, play every game, tap every button.

## 6. itch.io (30 minutes)

1. Create an account with the studio name as username, so your page is `studioname.itch.io`.
2. *Settings → Payments*: choose how you get paid and complete the tax interview.
3. Follow [04-itch-io.md](04-itch-io.md) to publish 7 free browser demos and 7 source-code pages.

## 7. Gumroad (30 minutes)

1. Sign up, set the shop name and avatar, connect your payout method.
2. Follow [05-gumroad.md](05-gumroad.md) to create 7 products and the bundle.
3. Paste the product links into `site/site.config.js` and rebuild the site.

## 8. Social accounts (20 minutes)

Create the same handle on **TikTok, Instagram and YouTube** (Shorts). Use the studio logo
and a one-line bio: *"HTML5 games and branded mini-games for businesses. Play the demos 👇"*
with your website link. The trailers in `marketing/out/video/` are your first posts
([07-marketing.md](07-marketing.md) §3).

## Checklist

- [ ] Business email, 2FA everywhere, password manager
- [ ] Payout method connected on each platform, tax forms done
- [ ] Website live and tested on a phone
- [ ] Fiverr: profile + Gig 1 + Gig 2 live
- [ ] Upwork: profile submitted with portfolio
- [ ] itch.io and Gumroad pages live, links in `site/site.config.js`, site rebuilt
- [ ] Social handles created with the website link
