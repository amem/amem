# 10 — Rules, scams and privacy

One broken rule can close a Fiverr or Upwork account permanently, with the earnings in it.
Read this once a month. Platform rules change: the platform's current Terms of Service always
win over this summary.

---

## 1. Platform rules that get accounts banned

**Fiverr and Upwork (both):**
- **No payments outside the platform** for a client you met there. Do not send PayPal links,
  bank details or crypto addresses in chat. Do not accept "let's pay outside to avoid fees".
- **No contact details before an order/contract**: no email, phone, WhatsApp, Telegram or
  social handles in messages or gig texts. Use the platform's own tools (calls, file sharing).
- **One account per person.** Never open a second account, never let anyone else use yours,
  never buy or rent an account.
- **Real identity.** Use your real name and documents for verification; your display name can
  be the studio where the platform allows it.
- **No fake or traded reviews.** Do not offer discounts, extras or refunds in exchange for
  reviews, and do not ask friends to buy to leave reviews. You may politely ask a real client
  for an honest review.
- **Honest descriptions.** Only show work you made or have the right to show. Do not claim
  clients, numbers or awards you do not have.
- **Deliver what you sold.** Use "deliver order" only with real work, and do not deliver empty
  files to beat a deadline. Ask for an extension instead.
- **Logging in from unusual places** (VPNs, shared devices) can trigger security checks. Log in
  from your own devices and keep your profile country accurate.

**Fiverr specifics:** keep response time low, do not cancel orders lightly (cancellations hurt
your level), and use custom offers for anything that does not match a package.

**Upwork specifics:** be careful with Connects (spend only on good matches), and do not start
work before a contract is active (an "offer" is not a contract).

## 2. Scams to ignore

| Scam | Sign | What to do |
|---|---|---|
| **Off-platform job** | "Let's continue on Telegram / WhatsApp", often with a great budget | Decline. Report the account. |
| **Malware "test task"** | "Download our project and run `npm install` / this .exe to check the bug" from a new account | Never run unknown code on your main computer. Real clients share code inside the platform and accept a call first. If you must inspect code, read it without running it, or use a throwaway virtual machine. |
| **Fake check / overpayment** | "I sent too much, refund the difference" | Never refund outside the platform. |
| **Unpaid "trial"** | "Make the full game as a test, we pay if we like it" | Offer a paid small milestone instead. |
| **Account rental / review exchange** | "We pay you to use your account" or "buy my gig, I buy yours" | Decline, it leads to a ban. |
| **Phishing** | Emails "from Fiverr/Upwork/Gumroad" asking you to log in via a link | Log in only by typing the address yourself. 2FA on everything. |
| **Crypto / NFT "partnership"** | Revenue promises, wallet connection requests | Decline. |
| **Chargeback after delivery** (direct clients) | Paid by card/PayPal outside a platform, then disputes | For direct clients, take 50 % upfront, deliver the final files after full payment, keep the written agreement. |

## 3. Intellectual property

- Everything in this repo was made from scratch for you: code, procedural art, synthesized
  sounds, built-in icons. The site fonts are open-source (SIL Open Font License, see `site/fonts/OFL.txt`).
- **Client material:** only use logos, photos and names the client has the right to use, and get
  them from the client. For private demos (outreach), never publish the business's brand.
- **No famous brands or characters** in your games or ads (no "Candy Crush style" with their
  art, no cartoon characters you do not own), and no trademarked names in titles or tags
  that suggest affiliation.
- **Licenses:** buyers of the source code get the Standard or Extended license in
  `docs/licenses/`. Clients of custom work get a written usage license (see
  [08-order-fulfillment.md](08-order-fulfillment.md) §3).

## 4. Privacy and lead capture

When a game collects emails or phone numbers:

- The **client** (the business) is responsible for the data and its privacy policy. Tell them so
  in writing, and point to the kit README ("Privacy").
- Keep the **consent checkbox** on, with honest text about what the data is used for.
- Leads go **directly to the client's** sheet or CRM. Do not keep copies; if you test, delete
  the test rows.
- No tracking scripts or analytics unless the client asks for them and updates their privacy
  text (the games make no outside requests by default).
- Data-protection laws (for example the GDPR in the EU, and similar laws elsewhere) apply to
  the client's campaign. If a client targets a country with strict rules, recommend they check
  with their advisor.

## 5. Money, taxes and records

- Keep every invoice and platform statement (the sales log from [01-accounts-setup.md](01-accounts-setup.md)).
- Income from Fiverr, Upwork, itch.io and Gumroad is usually taxable where you live. Rules
  differ by country: ask a local accountant or tax office early, especially about registering
  as self-employed and about foreign-currency income.
- Fill in each platform's tax forms (for example W-8BEN for non-US sellers) truthfully.
- Set aside a share of every payout (for example 20–30 %) until you know your tax rate.

## 6. Healthy business habits

- Do not promise results ("this will double your sales"). Promise what you deliver.
- Put scope, price, deadline and revisions in writing before you start.
- When something goes wrong, tell the client early, with a new time and a fix.
- Back up the project and client folders (cloud + external disk). Turn on 2FA everywhere.
- Rest. A sustainable 60–90 minutes a day beats a burnt-out week.
