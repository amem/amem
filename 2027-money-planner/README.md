# 2027 Money Planner: digital product launch kit

A complete, ready-to-sell digital product chosen through market research, with every asset needed to list it on Etsy and Payhip/Gumroad and promote it on social media.

**The product:** a budget spreadsheet for Google Sheets and Excel with 11 auto-calculating tabs. It covers the monthly dashboard, transactions, categories with a 50/30/20 check, annual overview, bills, savings goals, net worth, a debt snowball/avalanche planner with a 30-year schedule, and a holiday gift tracker. Two cheaper spin-offs are sold as separate listings.

| Listing | Price | Why |
|---|---|---|
| 2027 Money Planner (bundle) | $12.99 | Hero product: holiday demand now, budgeting peak in January |
| Christmas Budget & Gift Tracker | $5.99 | Seasonal impulse buy; list by early October |
| Debt Payoff Planner | $6.99 | Evergreen niche ("debt snowball") |

➡ **Start here:** [`launch/24H_LAUNCH_PLAN.md`](launch/24H_LAUNCH_PLAN.md), then [`launch/ACCOUNT_SETUP_CHECKLIST.md`](launch/ACCOUNT_SETUP_CHECKLIST.md)

## Folder map

```
2027-money-planner/
├── research/MARKET_RESEARCH.md      why this product won (data, scoring, sources)
├── product/
│   ├── src/build_workbook.py        generates the spreadsheets (3 editions × clean + demo)
│   ├── src/build_guide.py           generates the PDF quick-start guides
│   ├── src/verify.py                recalculates in LibreOffice and checks every number
│   ├── src/package.py               zips each edition for Payhip / Gumroad
│   ├── src/render_previews.py       real screenshots of every sheet
│   ├── src/make_mockups.py          listing images, Pinterest pins, Instagram posts
│   ├── src/make_video.py            10–15 s listing videos
│   └── dist/                        ← built product files (NOT in git, see below)
├── listings/
│   ├── ETSY_LISTINGS.md             titles, 13 tags, descriptions, prices, settings
│   └── GUMROAD_PAYHIP.md            direct-store product pages, coupon, receipt text
├── images/
│   ├── listing/                     13 Etsy images (2400×1800), Gumroad cover/thumb, 3 videos
│   └── marketing/                   4 Pinterest pins (1000×1500), 2 Instagram posts (1080×1350)
├── marketing/SOCIAL_POSTS.md        DMs, Instagram, Reels script, LinkedIn, Pinterest, email
├── launch/
│   ├── 24H_LAUNCH_PLAN.md           hour-by-hour plan and what to do next
│   ├── ACCOUNT_SETUP_CHECKLIST.md   Etsy, Payhip, social: step by step
│   └── sales-tracker.csv            log views, favorites, orders
└── scripts/build_all.sh             rebuild everything with one command
```

## Why the product files aren't in git

This repository (`amem/amem`) is **public**. Committing the paid `.xlsx` files would give the product away for free, so `product/dist/` is in `.gitignore`. To get the files:

```bash
cd 2027-money-planner
./scripts/build_all.sh          # needs python3, LibreOffice Calc, Node + Playwright
# or just the sellable files (only needs python3):
pip install openpyxl reportlab
cd product/src && python3 build_workbook.py && python3 build_guide.py && python3 package.py
```

The files are written to `product/dist/`:

| File | What it is |
|---|---|
| `2027-Money-Planner.xlsx` / `-DEMO.xlsx` / `-GUIDE.pdf` / `.zip` | Bundle (clean, sample data, guide, zip for Payhip) |
| `Holiday-Budget-Gift-Tracker.*` | Holiday edition |
| `Debt-Payoff-Planner.*` | Debt edition |

The generator scripts are public too. Few spreadsheet buyers would run Python to rebuild a $13 product, but if that worries you, make the repository private or move this folder to a private repository.

## Quality checks

`verify.py` opens every workbook in LibreOffice, forces a full recalculation, and then:
- scans **all ~15,300 formulas** for errors (`#NAME?`, `#VALUE!`, `#REF!` and so on). Result: none.
- recomputes the demo numbers in plain Python and compares them: transaction types and months, monthly dashboard totals, savings rate, 12-month annual totals, running balance, holiday totals, and the debt payoff months and total paid for **Snowball** and **Avalanche**. Result: all match.

Only functions available in both Excel and Google Sheets are used (SUMIFS, COUNTIF, INDEX/MATCH, RANK, REPT, DATE and similar). There are no macros. **Before listing, open the DEMO file once in Google Sheets and in Excel** (see the setup checklist); that couldn't be done from the build environment.
