"""Compose listing images (Etsy / Gumroad), Pinterest pins and Instagram posts.

    python render_previews.py   # first: real screenshots of the spreadsheet
    python make_mockups.py      # then: branded images in ../../images/

Every screenshot used here is a real render of the DEMO workbook — the
mockups show the actual product, not an illustration.
"""

import json
import os
import subprocess
import tempfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
TRIM = os.path.join(ROOT, "images", "raw", "trim")
CROPS = os.path.join(ROOT, "images", "raw", "crops")
OUT = os.path.join(ROOT, "images")

# (source screenshot, crop box as fractions of the trimmed image: left, top, right, bottom)
CROP_SPECS = {
    "monthly": ("2027-Money-Planner__Monthly-Dashboard", (0, 0, 1, 1)),
    "monthly_top": ("2027-Money-Planner__Monthly-Dashboard", (0, 0, 0.64, 0.40)),
    "monthly_exp": ("2027-Money-Planner__Monthly-Dashboard", (0, 0.37, 1, 1)),
    "annual": ("2027-Money-Planner__Annual-Overview", (0, 0, 1, 1)),
    "annual_top": ("2027-Money-Planner__Annual-Overview", (0, 0, 1, 0.42)),
    "annual_chart": ("2027-Money-Planner__Annual-Overview", (0, 0.72, 0.56, 1)),
    "bills": ("2027-Money-Planner__Bills", (0, 0, 1, 0.42)),
    "categories": ("2027-Money-Planner__Categories", (0, 0, 1, 1)),
    "transactions": ("2027-Money-Planner__Transactions", (0, 0, 1, 0.5)),
    "savings": ("2027-Money-Planner__Savings-Goals", (0, 0, 1, 0.42)),
    "savings_chart": ("2027-Money-Planner__Savings-Goals", (0, 0.56, 0.62, 1)),
    "networth": ("2027-Money-Planner__Net-Worth", (0, 0, 1, 1)),
    "debt": ("2027-Money-Planner__Debt-Payoff", (0, 0, 1, 1)),
    "debt_top": ("2027-Money-Planner__Debt-Payoff", (0, 0, 0.74, 0.58)),
    "schedule": ("2027-Money-Planner__Debt-Schedule", (0, 0, 1, 0.62)),
    "holiday": ("2027-Money-Planner__Holiday-Planner", (0, 0, 1, 1)),
    "holiday_gifts": ("2027-Money-Planner__Holiday-Planner", (0, 0, 0.70, 0.41)),
    "holiday_side": ("2027-Money-Planner__Holiday-Planner", (0.705, 0.16, 0.995, 0.61)),
    "holiday_kpi": ("2027-Money-Planner__Holiday-Planner", (0, 0.06, 0.70, 0.155)),
    "start": ("2027-Money-Planner__Start-Here", (0, 0, 1, 1)),
}


def make_crops():
    os.makedirs(CROPS, exist_ok=True)
    for key, (src, (l, t, r, b)) in CROP_SPECS.items():
        im = Image.open(os.path.join(TRIM, src + ".png"))
        w, h = im.size
        im.crop((int(l * w), int(t * h), int(r * w), int(b * h))).save(os.path.join(CROPS, key + ".png"))


def img(key):
    return "file://" + os.path.join(CROPS, key + ".png")


CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: %(w)dpx; height: %(h)dpx; overflow: hidden; background: #FBF8F3;
       font-family: 'DejaVu Sans', 'Liberation Sans', sans-serif; color: #2B2B2B; position: relative; }
.green { color: #2F5D50; } .muted { color: #7A8580; }
.h1 { font-weight: 800; letter-spacing: -1px; line-height: 1.05; color: #2F5D50; }
.eyebrow { text-transform: uppercase; letter-spacing: 5px; font-weight: 700; color: #B23A48; }
.pill { display: inline-block; background: #2F5D50; color: #fff; border-radius: 999px; font-weight: 700; }
.pill.gold { background: #E9B872; color: #2B2B2B; } .pill.sage { background: #8FB9A8; color: #fff; }
.pill.red { background: #B23A48; }
.card { background: #fff; border-radius: 22px; box-shadow: 0 18px 50px rgba(47,93,80,.18), 0 2px 6px rgba(0,0,0,.06);
        overflow: hidden; }
.card img { display: block; width: 100%%; }
.screen { background: #1F2A27; border-radius: 26px; padding: 18px; box-shadow: 0 30px 70px rgba(0,0,0,.25); }
.screen .inner { background: #fff; border-radius: 10px; overflow: hidden; }
.screen img { display: block; width: 100%%; }
.dots { position: absolute; border-radius: 50%%; opacity: .5; }
.check li { list-style: none; padding-left: 1.4em; position: relative; margin: .35em 0; }
.check li:before { content: "✓"; position: absolute; left: 0; color: #2F5D50; font-weight: 800; }
.label { position: absolute; background: #fff; border-radius: 16px; padding: 18px 26px; font-weight: 700;
         box-shadow: 0 10px 30px rgba(0,0,0,.12); color: #2F5D50; border-left: 10px solid #E9B872; }
.footer { position: absolute; bottom: 0; left: 0; right: 0; background: #2F5D50; color: #fff; text-align: center;
          font-weight: 700; letter-spacing: 2px; }
"""


def page(w, h, body):
    return f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS % {'w': w, 'h': h}}</style></head><body>{body}</body></html>"


def footer_bar(text, size=34, pad=26):
    return f"<div class='footer' style='font-size:{size}px;padding:{pad}px'>{text}</div>"


BADGES = ("<span class='pill' style='font-size:34px;padding:16px 30px;margin:0 12px 14px 0'>Excel + Google Sheets</span>"
          "<span class='pill gold' style='font-size:34px;padding:16px 30px;margin:0 12px 14px 0'>Instant download</span>"
          "<span class='pill sage' style='font-size:34px;padding:16px 30px;margin:0 12px 14px 0'>Any currency</span>")

W, H = 2400, 1800  # Etsy 4:3


def etsy_images():
    imgs = {}
    # 01 hero
    imgs["etsy-bundle-01-hero"] = page(W, H, f"""
      <div class='dots' style='width:900px;height:900px;background:#EEF4F1;right:-200px;top:-250px'></div>
      <div style='position:absolute;left:110px;top:120px;width:1000px'>
        <div class='eyebrow' style='font-size:34px'>2027 • Budget spreadsheet</div>
        <div class='h1' style='font-size:150px;margin-top:26px'>2027 Money Planner</div>
        <div style='font-size:52px;margin-top:30px;line-height:1.3' class='muted'>Budget, bills, savings, debt payoff,
          net worth <b class='green'>+ Holiday Gift Tracker</b></div>
        <ul class='check' style='font-size:42px;margin-top:44px;line-height:1.35'>
          <li>11 auto-calculating tabs</li><li>Monthly dashboard with charts</li>
          <li>Debt snowball &amp; avalanche</li><li>Reusable every year</li></ul>
        <div style='margin-top:50px'>{BADGES}</div>
      </div>
      <div class='screen' style='position:absolute;right:90px;top:120px;width:1180px'>
        <div class='inner'><img src='{img("monthly")}'></div></div>
      <div class='card' style='position:absolute;left:1130px;bottom:160px;width:780px;transform:rotate(-2deg)'>
        <img src='{img("debt_top")}'></div>
      <div class='card' style='position:absolute;right:110px;bottom:130px;width:430px;transform:rotate(2deg)'>
        <img src='{img("holiday_side")}'></div>
      {footer_bar("INSTANT DOWNLOAD  •  START TODAY  •  NO SUBSCRIPTION")}
    """)
    # 02 what's inside
    tiles = [("monthly", "Monthly Dashboard"), ("annual", "Annual Overview"), ("transactions", "Transactions"),
             ("categories", "Categories + 50/30/20"), ("bills", "Bill Tracker"), ("savings", "Savings Goals"),
             ("networth", "Net Worth"), ("debt", "Debt Payoff"), ("holiday", "Holiday Gift Tracker")]
    grid = "".join(f"""<div style='text-align:center'><div class='card' style='height:330px;display:flex;align-items:flex-start'>
        <img src='{img(k)}' style='width:100%;height:330px;object-fit:cover;object-position:top left'></div>
        <div style='font-size:38px;font-weight:800;margin-top:18px' class='green'>{t}</div></div>""" for k, t in tiles)
    imgs["etsy-bundle-02-whats-inside"] = page(W, H, f"""
      <div style='text-align:center;padding-top:70px'><div class='eyebrow' style='font-size:32px'>What's inside</div>
      <div class='h1' style='font-size:92px;margin-top:14px'>11 tabs. One simple system.</div></div>
      <div style='display:grid;grid-template-columns:repeat(3,1fr);gap:40px 60px;padding:50px 110px 0'>{grid}</div>
      {footer_bar("+ START HERE GUIDE  •  DEBT SCHEDULE  •  DEMO FILE WITH SAMPLE DATA", 32, 22)}
    """)
    # 03 monthly dashboard
    imgs["etsy-bundle-03-monthly-dashboard"] = page(W, H, f"""
      <div style='position:absolute;left:110px;top:90px;width:780px'>
        <div class='eyebrow' style='font-size:32px'>Monthly dashboard</div>
        <div class='h1' style='font-size:104px;margin-top:20px'>Know exactly where your money goes</div>
        <ul class='check' style='font-size:42px;margin-top:50px;line-height:1.4'>
          <li>Pick any month from a drop-down</li><li>Budget vs. actual for every category</li>
          <li>Over-budget turns red automatically</li><li>Savings rate &amp; left-over money</li>
          <li>Charts by Needs / Wants / Savings / Debt</li></ul>
      </div>
      <div class='card' style='position:absolute;right:90px;top:90px;width:1400px'><img src='{img("monthly")}'></div>
    """)
    # 04 annual overview
    imgs["etsy-bundle-04-annual-overview"] = page(W, H, f"""
      <div style='text-align:center;padding-top:70px'><div class='eyebrow' style='font-size:32px'>Annual overview</div>
      <div class='h1' style='font-size:96px;margin-top:14px'>Your whole year at a glance</div>
      <div class='muted' style='font-size:44px;margin-top:22px'>12 months side by side • totals • averages • running balance</div></div>
      <div class='card' style='position:absolute;left:110px;right:110px;top:430px'><img src='{img("annual_top")}'></div>
      <div class='card' style='position:absolute;right:140px;bottom:70px;width:900px'><img src='{img("annual_chart")}'></div>
      <div class='label' style='left:140px;bottom:200px;font-size:40px;width:1000px'>Variance column shows where you beat your plan — and where you overspent (in red)</div>
    """)
    # 05 debt payoff
    imgs["etsy-bundle-05-debt-payoff"] = page(W, H, f"""
      <div style='position:absolute;left:110px;top:90px;width:900px'>
        <div class='eyebrow' style='font-size:32px'>Debt payoff planner</div>
        <div class='h1' style='font-size:104px;margin-top:20px'>See your debt-free date</div>
        <ul class='check' style='font-size:42px;margin-top:46px;line-height:1.4'>
          <li>Snowball or Avalanche — one click</li><li>Payoff date for each debt</li>
          <li>Total interest you'll pay</li><li>Month-by-month schedule (30 years)</li></ul>
      </div>
      <div class='card' style='position:absolute;right:90px;top:120px;width:1260px'><img src='{img("debt_top")}'></div>
      <div class='card' style='position:absolute;left:110px;right:110px;bottom:80px;height:640px'>
        <img src='{img("schedule")}' style='height:640px;width:100%;object-fit:cover;object-position:top left'></div>
    """)
    # 06 holiday
    imgs["etsy-bundle-06-holiday-tracker"] = page(W, H, f"""
      <div style='position:absolute;left:0;right:0;top:0;height:420px;background:#2F5D50'></div>
      <div style='position:absolute;left:110px;top:80px;color:#fff'>
        <div style='font-size:32px;letter-spacing:5px;font-weight:700;color:#E9B872'>BONUS • HOLIDAY PLANNER</div>
        <div style='font-size:104px;font-weight:800;margin-top:18px;letter-spacing:-1px'>Plan every gift. Stay on budget.</div>
        <div style='font-size:42px;margin-top:20px;opacity:.9'>Gift list • budget per person • Idea → Ordered → Bought → Wrapped → Given</div>
      </div>
      <div class='card' style='position:absolute;left:110px;top:500px;width:1580px'><img src='{img("holiday_gifts")}'></div>
      <div class='card' style='position:absolute;right:110px;top:500px;width:540px'><img src='{img("holiday_side")}'></div>
      <div style='position:absolute;left:110px;right:110px;bottom:90px;display:grid;grid-template-columns:repeat(3,1fr);gap:50px'>
        <div class='label' style='position:static;font-size:40px'>Budget per person with over-spend alerts</div>
        <div class='label' style='position:static;font-size:40px'>Color-coded status for every gift</div>
        <div class='label' style='position:static;font-size:40px'>Food, decor, travel &amp; other holiday costs</div></div>
    """)
    # 07 savings + net worth
    imgs["etsy-bundle-07-savings-networth"] = page(W, H, f"""
      <div style='text-align:center;padding-top:70px'><div class='eyebrow' style='font-size:32px'>Savings goals &amp; net worth</div>
      <div class='h1' style='font-size:96px;margin-top:14px'>Watch your money grow</div></div>
      <div class='card' style='position:absolute;left:110px;top:360px;width:1300px'><img src='{img("savings")}'></div>
      <div class='label' style='left:1460px;top:400px;font-size:40px;width:830px'>Auto-calculates how much to save each month to hit every goal</div>
      <div class='card' style='position:absolute;right:110px;bottom:80px;width:1280px'><img src='{img("networth")}'></div>
      <div class='label' style='left:110px;bottom:320px;font-size:40px;width:860px'>Track assets &amp; debts monthly — your net worth charted for the year</div>
    """)
    # 08 bills + transactions
    imgs["etsy-bundle-08-bills-transactions"] = page(W, H, f"""
      <div style='text-align:center;padding-top:70px'><div class='eyebrow' style='font-size:32px'>Bills &amp; transactions</div>
      <div class='h1' style='font-size:96px;margin-top:14px'>Never miss a bill again</div></div>
      <div class='card' style='position:absolute;left:110px;right:110px;top:360px'><img src='{img("bills")}'></div>
      <div class='card' style='position:absolute;left:110px;bottom:70px;width:1250px;height:640px'>
        <img src='{img("transactions")}' style='height:640px;object-fit:cover;object-position:top left'></div>
      <div class='label' style='right:110px;bottom:360px;font-size:40px;width:840px'>Log a transaction in seconds — pick a category from the drop-down, everything else is automatic</div>
    """)
    # 09 how it works (generic, used by every listing)
    steps = [("1", "Download", "Instant download right after purchase — .xlsx file + PDF guide."),
             ("2", "Open", "Open in Microsoft Excel, or free in Google Sheets on any device."),
             ("3", "Start", "Type your numbers in the cream cells. Everything else calculates for you.")]
    cols = "".join(f"""<div style='background:#fff;border-radius:26px;padding:60px 50px;box-shadow:0 18px 50px rgba(47,93,80,.14)'>
        <div class='pill' style='font-size:60px;width:120px;height:120px;line-height:120px;text-align:center;padding:0'>{n}</div>
        <div class='h1' style='font-size:72px;margin-top:40px'>{t}</div>
        <div style='font-size:40px;margin-top:24px;line-height:1.4' class='muted'>{d}</div></div>""" for n, t, d in steps)
    imgs["etsy-common-09-how-it-works"] = page(W, H, f"""
      <div style='text-align:center;padding-top:90px'><div class='eyebrow' style='font-size:32px'>How it works</div>
      <div class='h1' style='font-size:104px;margin-top:14px'>Ready in 5 minutes</div></div>
      <div style='display:grid;grid-template-columns:repeat(3,1fr);gap:60px;padding:90px 130px 0'>{cols}</div>
      <div style='text-align:center;margin-top:80px;font-size:38px' class='muted'>
        Digital product • nothing will be shipped • for personal use • works in any currency</div>
    """)
    # Holiday standalone
    imgs["etsy-holiday-01-hero"] = page(W, H, f"""
      <div style='position:absolute;inset:0;background:#2F5D50'></div>
      <div class='dots' style='width:700px;height:700px;background:#B23A48;left:-260px;bottom:-300px;opacity:.35'></div>
      <div style='position:absolute;left:110px;top:130px;width:900px;color:#fff'>
        <div style='font-size:34px;letter-spacing:5px;font-weight:700;color:#E9B872'>CHRISTMAS &amp; HOLIDAY</div>
        <div style='font-size:118px;font-weight:800;margin-top:24px;line-height:1.02;letter-spacing:-2px'>Budget &amp; Gift Tracker</div>
        <div style='font-size:46px;margin-top:34px;line-height:1.35;opacity:.92'>Every gift, every person, every cost — in one spreadsheet</div>
        <div style='margin-top:60px'>
          <span class='pill gold' style='font-size:34px;padding:16px 30px;margin:0 12px 14px 0'>Excel + Google Sheets</span>
          <span class='pill red' style='font-size:34px;padding:16px 30px;margin:0 12px 14px 0'>Instant download</span></div>
        <div style='margin-top:70px;font-size:36px;opacity:.85;line-height:1.4'>Also great for Eid, Hanukkah, Diwali,<br>birthdays &amp; weddings</div>
      </div>
      <div class='card' style='position:absolute;right:90px;top:150px;width:1200px'><img src='{img("holiday_gifts")}'></div>
      <div class='card' style='position:absolute;right:380px;top:760px;width:640px;transform:rotate(2deg)'><img src='{img("holiday_side")}'></div>
    """)
    imgs["etsy-holiday-02-detail"] = page(W, H, f"""
      <div style='text-align:center;padding-top:70px'><div class='eyebrow' style='font-size:32px'>Holiday gift tracker</div>
      <div class='h1' style='font-size:96px;margin-top:14px'>Nothing forgotten. Nothing overspent.</div></div>
      <div class='card' style='position:absolute;left:110px;right:110px;top:370px'><img src='{img("holiday")}'></div>
    """)
    # Debt standalone
    imgs["etsy-debt-01-hero"] = page(W, H, f"""
      <div class='dots' style='width:900px;height:900px;background:#EEF4F1;right:-200px;top:-250px'></div>
      <div style='position:absolute;left:110px;top:140px;width:960px'>
        <div class='eyebrow' style='font-size:34px'>Snowball • Avalanche</div>
        <div class='h1' style='font-size:140px;margin-top:26px'>Debt Payoff Planner</div>
        <div style='font-size:50px;margin-top:30px;line-height:1.3' class='muted'>Find your <b class='green'>debt-free date</b>
          and how much interest you'll save</div>
        <ul class='check' style='font-size:42px;margin-top:44px;line-height:1.35'>
          <li>Up to 6 debts</li><li>Payoff date per debt</li><li>30-year month-by-month schedule</li></ul>
        <div style='margin-top:50px'>{BADGES}</div>
      </div>
      <div class='screen' style='position:absolute;right:90px;top:260px;width:1180px'>
        <div class='inner'><img src='{img("debt")}'></div></div>
      {footer_bar("INSTANT DOWNLOAD  •  EXCEL + GOOGLE SHEETS  •  ANY CURRENCY")}
    """)
    imgs["etsy-debt-02-schedule"] = page(W, H, f"""
      <div style='text-align:center;padding-top:70px'><div class='eyebrow' style='font-size:32px'>Month-by-month plan</div>
      <div class='h1' style='font-size:96px;margin-top:14px'>Watch every balance hit zero</div></div>
      <div class='card' style='position:absolute;left:110px;right:110px;top:360px'><img src='{img("schedule")}'></div>
    """)
    return {k: (v, W, H) for k, v in imgs.items()}


def social_images():
    out = {}
    PW, PH = 1000, 1500
    pins = [
        ("pin-01-budget-planner", "2027 BUDGET SPREADSHEET", "The Money Planner that does the math for you", "monthly_top",
         "Excel + Google Sheets"),
        ("pin-02-holiday-gift-tracker", "HOLIDAY SEASON", "Christmas Budget &amp; Gift Tracker", "holiday_gifts",
         "Plan every gift • Stay on budget"),
        ("pin-03-debt-snowball", "DEBT SNOWBALL • AVALANCHE", "Find your debt-free date", "debt_top",
         "Free yourself from debt in 2027"),
        ("pin-04-savings-goals", "SAVINGS GOALS", "Know how much to save every month", "savings",
         "Budget planner spreadsheet"),
    ]
    for key, eyebrow, title, shot, sub in pins:
        out[key] = (page(PW, PH, f"""
          <div style='position:absolute;inset:0;background:#FBF8F3'></div>
          <div style='position:relative;padding:80px 70px 0;text-align:center'>
            <div class='eyebrow' style='font-size:26px'>{eyebrow}</div>
            <div class='h1' style='font-size:84px;margin-top:22px'>{title}</div>
            <div class='muted' style='font-size:34px;margin-top:22px'>{sub}</div></div>
          <div class='card' style='position:absolute;left:50px;right:50px;top:640px;height:640px'>
            <img src='{img(shot)}' style='height:640px;object-fit:cover;object-position:top left'></div>
          {footer_bar("INSTANT DOWNLOAD  •  AMEM SHEETS", 28, 30)}
        """), PW, PH)
    IW, IH = 1080, 1350
    out["ig-01-launch"] = (page(IW, IH, f"""
      <div style='position:absolute;inset:0;background:#2F5D50'></div>
      <div style='position:relative;padding:80px 70px 0;color:#fff'>
        <div style='font-size:28px;letter-spacing:5px;font-weight:700;color:#E9B872'>JUST LAUNCHED</div>
        <div style='font-size:92px;font-weight:800;margin-top:20px;line-height:1.03;letter-spacing:-1px'>2027 Money Planner</div>
        <div style='font-size:34px;margin-top:22px;opacity:.9'>Budget • bills • savings • debt payoff • holiday gifts</div></div>
      <div class='card' style='position:absolute;left:50px;right:50px;top:470px'><img src='{img("monthly_top")}'></div>
      <div style='position:absolute;bottom:70px;left:0;right:0;text-align:center'>
        <span class='pill gold' style='font-size:34px;padding:18px 40px'>Link in bio</span></div>
    """), IW, IH)
    out["ig-02-holiday"] = (page(IW, IH, f"""
      <div style='position:absolute;inset:0;background:#FBF8F3'></div>
      <div style='position:relative;padding:80px 70px 0;text-align:center'>
        <div class='eyebrow' style='font-size:28px'>Holiday season is coming</div>
        <div class='h1' style='font-size:84px;margin-top:20px'>Plan every gift. Stay on budget.</div></div>
      <div class='card' style='position:absolute;left:50px;right:50px;top:470px;height:640px'>
        <img src='{img("holiday_gifts")}' style='height:640px;object-fit:cover;object-position:top left'></div>
      <div style='position:absolute;bottom:70px;left:0;right:0;text-align:center'>
        <span class='pill' style='font-size:34px;padding:18px 40px'>Spreadsheet • link in bio</span></div>
    """), IW, IH)
    # Gumroad / Payhip cover (16:9) and square thumbnail
    GW, GH = 1280, 720
    out["gumroad-cover"] = (page(GW, GH, f"""
      <div style='position:absolute;left:60px;top:70px;width:520px'>
        <div class='eyebrow' style='font-size:18px'>Excel + Google Sheets</div>
        <div class='h1' style='font-size:66px;margin-top:14px'>2027 Money Planner</div>
        <div class='muted' style='font-size:24px;margin-top:18px;line-height:1.35'>Budget • bills • savings • debt payoff • net worth <b class='green'>+ Holiday Gift Tracker</b></div>
        <ul class='check' style='font-size:22px;margin-top:26px'><li>11 auto-calculating tabs</li><li>Any currency, reusable every year</li><li>Instant download + PDF guide</li></ul>
      </div>
      <div class='screen' style='position:absolute;right:40px;top:90px;width:640px;padding:10px;border-radius:16px'>
        <div class='inner'><img src='{img("monthly")}'></div></div>
    """), GW, GH)
    out["gumroad-thumb"] = (page(600, 600, f"""
      <div style='position:absolute;inset:0;background:#2F5D50'></div>
      <div style='position:relative;padding:44px 40px 0;color:#fff;text-align:center'>
        <div style='font-size:18px;letter-spacing:4px;font-weight:700;color:#E9B872'>BUDGET SPREADSHEET</div>
        <div style='font-size:58px;font-weight:800;margin-top:12px;line-height:1.02'>2027 Money Planner</div></div>
      <div class='card' style='position:absolute;left:30px;right:30px;bottom:30px;height:300px;border-radius:14px'>
        <img src='{img("monthly_top")}' style='height:300px;object-fit:cover;object-position:top left'></div>
    """), 600, 600)
    return out


NODE = r"""
const { chromium } = require('playwright');
const jobs = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
(async () => {
  const browser = await chromium.launch();
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h } });
    await page.goto('file://' + j.html);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: j.png });
    await page.close();
    console.log(j.png);
  }
  await browser.close();
})();
"""


def main():
    make_crops()
    all_imgs = {**etsy_images(), **social_images()}
    with tempfile.TemporaryDirectory() as tmp:
        jobs = []
        for name, (html, w, h) in all_imgs.items():
            sub = "marketing" if name.startswith(("pin-", "ig-")) else "listing"
            if name.startswith("gumroad-"):
                sub = "listing"
            os.makedirs(os.path.join(OUT, sub), exist_ok=True)
            hp = os.path.join(tmp, name + ".html")
            with open(hp, "w") as f:
                f.write(html)
            jobs.append({"html": hp, "png": os.path.join(OUT, sub, name + ".png"), "w": w, "h": h})
        jp = os.path.join(tmp, "jobs.json")
        with open(jp, "w") as f:
            json.dump(jobs, f)
        js = os.path.join(tmp, "shoot.js")
        with open(js, "w") as f:
            f.write(NODE)
        env = dict(os.environ, NODE_PATH="/opt/node22/lib/node_modules")
        subprocess.run(["node", js, jp], check=True, env=env)
    # Etsy prefers JPGs under ~1MB; keep PNG masters and write JPG copies for upload
    for sub in ("listing", "marketing"):
        d = os.path.join(OUT, sub)
        for f in sorted(os.listdir(d)):
            if f.endswith(".png"):
                Image.open(os.path.join(d, f)).convert("RGB").save(os.path.join(d, f[:-4] + ".jpg"), quality=88,
                                                                    optimize=True)
                os.remove(os.path.join(d, f))


if __name__ == "__main__":
    main()
