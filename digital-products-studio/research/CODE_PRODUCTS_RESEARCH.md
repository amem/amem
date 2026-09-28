# Research: code products (web apps, games, scripts) and automated listing

*Research date: 28 September 2026. Figures are quoted from the sources at the end; recommendations are my judgment.*

## 1. What sells in code products

| Marketplace | What sells | Numbers |
|---|---|---|
| **CodeCanyon** (Envato) | PHP scripts (project management, SaaS scripts), plugins/add-ons, HTML5 games | Best-selling HTML5 games cost $16–59; PHP scripts $34–89 [1]. Since **1 July 2026 every seller gets a flat 50% revenue share** (the exclusive model ended) [2]. Authors must pass an **ID check with biometric verification** [3], and there is an AI-generated content policy [4]. |
| **itch.io** | Game **assets** outsell games: pixel-art tilesets, characters, icon packs, big bundles [5] | Default revenue share is **10%, adjustable from 0 to 100%** [6]. A **generative-AI disclosure is required for assets** (optional for games) [7]. |
| **Gumroad / Lemon Squeezy / Polar** | Boilerplates, templates, scripts, tools | Stripe/SaaS boilerplates sell for $49–249. Of 73 surveyed developers, first-90-day earnings ranged from $1,200 to $4,800 [8]. Sales depend on your own audience. |
| **Web-game portals** (CrazyGames, Poki, GameDistribution) | Casual HTML5 games | Portals pay an **ad-revenue share or a flat licence fee**; CrazyGames reaches about 20M players [9][10]. |

**Takeaways**
1. Marketplaces with built-in traffic (CodeCanyon, itch.io, Etsy) are the fastest way to reach buyers without an audience, but CodeCanyon now takes 50% and has a strict review and ID check.
2. Direct stores (Gumroad, Polar, Payhip) keep more of each sale (5–10%) but need you to bring the traffic: social posts, SEO, communities.
3. **One product, many channels:** list every product on every platform that fits it.

## 2. The products built (and why)

| Product | Type | Channels | Price |
|---|---|---|---|
| **Neon Stack** | HTML5 game + source code | itch.io (playable + source), Gumroad, Polar, web-game portals (ad revenue), CodeCanyon (optional) | $19 |
| **Invoice Studio** | Offline web app | Etsy (freelancers buy invoice templates), Gumroad, Polar | $12.99 on Etsy / $19 direct |
| **Watermark Studio** | Browser tool | **Etsy** (sellers need watermarked product photos), Gumroad, Polar | $9.99 on Etsy / $12 direct |
| **Python Automation Kit** | 11 scripts + menu | Gumroad, Polar | $15 |
| 2027 Money Planner ×3 | Spreadsheets (first project) | Etsy, Gumroad, Polar | $5.99–12.99 |

Choices favor products that are **useful on their own**, **fully buildable and testable here**, and **sellable on several marketplaces at once**. Every product ships with automated tests: 69 across the four new products.

## 3. Which marketplaces allow automatic listing (official APIs)

| Platform | Create listings by API? | How the publisher does it |
|---|---|---|
| **Etsy** | ✅ Open API v3: create a draft listing (`type=download`), upload images, files and video, then activate [11]. The key header must be `keystring:shared_secret` (enforced since 9 Feb 2026) [12] | OAuth 2.0 with PKCE; drafts by default |
| **Gumroad** | ✅ `POST /v2/products` (added in 2026), with a file presign/upload/complete flow and covers/thumbnails after creation. Verified in Gumroad's open-source code [13][14] | Drafts by default (`draft: true`) |
| **Polar** | ✅ Files → download benefit → product (`visibility: draft/public`) → checkout link [15][16] | Drafts by default |
| **itch.io** | ⚠️ No API to create project pages; **butler** uploads builds and files to existing projects [17] | Create the page once, then updates are automatic |
| **Lemon Squeezy** | ❌ Products API is read-only [18] | Manual listing (copy in `listings/`) |
| **Payhip** | ❌ The API covers coupons and license keys only [19] | Manual listing |
| **CodeCanyon / Envato** | ❌ No upload API; manual review plus ID check [3] | Manual, optional |

## 4. Fees (2026)

| Platform | Fee |
|---|---|
| Etsy | $0.20 per listing, 6.5% transaction fee, 3% + $0.25 payment processing, and a one-time setup fee of $15–29 |
| Gumroad | 10% + $0.50 per sale; 30% on sales that come from Gumroad Discover |
| Polar | New organizations: **5% + 50¢** on the free Starter plan; lower rates on paid plans [20] |
| itch.io | 10% by default, adjustable [6] |
| Payhip | 5% on the free plan, plus PayPal/Stripe fees |
| CodeCanyon | 50% [2] |

## 5. Rules to respect

- **AI disclosure:** Etsy requires it on listings and removes listings without it, itch.io requires it for assets, and Envato has an AI content policy [4][7]. Every description here says "Built with AI assistance, then tested and reviewed."
- **Account creation:** every marketplace requires the real owner to sign up, verify email/phone and identity, add payout details and accept the terms. Automated sign-ups break their terms and are blocked by CAPTCHAs, so accounts must be created by you.

## Sources

1. [CodeCanyon best-selling HTML5 games](https://codecanyon.net/popular_item/by_category?category=html5%2Fgames) · [best-selling PHP scripts](https://codecanyon.net/popular_item/by_category?category=php-scripts)
2. [Envato moves all sellers to a flat 50% revenue share](https://www.therepository.email/envato-ends-exclusive-author-model-moves-all-marketplace-sellers-to-flat-50-revenue-share)
3. [Envato author ID checks](https://help.author.envato.com/hc/en-us/articles/360038865632-Author-ID-Checks)
4. [Envato AI-generated content policy](https://help.author.envato.com/hc/en-us/articles/13313674070681-AI-generated-content-policy-for-Market-and-Elements)
5. [itch.io top-selling game assets](https://itch.io/game-assets/top-sellers)
6. [itch.io open revenue sharing](https://itch.io/updates/introducing-open-revenue-sharing)
7. [itch.io generative-AI disclosure tagging](https://itch.io/t/4309690/generative-ai-disclosure-tagging)
8. [Boilerplate income for developers, 2026](https://jakeinsight.com/side-income/2026-04-26-sell-prebuilt-stripe-billing-integration-boilerpla/)
9. [Submitting to CrazyGames and game portals](https://www.abratabia.com/publishing-web-games/game-portals.php)
10. [CrazyGames developer portal](https://developer.crazygames.com/)
11. [Etsy Open API v3 reference](https://developers.etsy.com/documentation/reference/)
12. [Etsy: requests without the shared secret rejected after 9 Feb 2026](https://github.com/etsy/open-api/discussions/1529)
13. [Gumroad: publish API-created products by default (PR #7518)](https://github.com/antiwork/gumroad/pull/7518)
14. [Gumroad source code (API v2 controllers)](https://github.com/antiwork/gumroad)
15. [Polar: create product](https://polar.sh/docs/api-reference/products/create)
16. [Polar: automated file downloads](https://polar.sh/docs/features/benefits/file-downloads)
17. [itch.io butler: pushing builds](https://itch.io/docs/butler/pushing.html)
18. [Lemon Squeezy feedback: API to create products](https://lemonsqueezy.nolt.io/279)
19. [Payhip public API](https://help.payhip.com/article/347-public-api)
20. [Polar plans and fees](https://polar.sh/docs/merchant-of-record/fees) · [Polar 2026 pricing review](https://fungies.io/polar-sh-review-2026/)
