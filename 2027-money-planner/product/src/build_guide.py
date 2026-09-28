"""Build the PDF user guide that ships with each edition.

    python build_guide.py     # writes ../dist/*-GUIDE.pdf
"""

import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

import build_workbook as B

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("Body", os.path.join(FONT_DIR, "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("Body-Bold", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body", boldItalic="Body-Bold")

GREEN = colors.HexColor("#" + B.C_PRIMARY)
SAGE = colors.HexColor("#" + B.C_SAGE)
MINT = colors.HexColor("#" + B.C_MINT)
CREAM = colors.HexColor("#" + B.C_CREAM)
MUTED = colors.HexColor("#" + B.C_MUTED)

S = {
    "title": ParagraphStyle("title", fontName="Body-Bold", fontSize=26, leading=32, textColor=GREEN),
    "sub": ParagraphStyle("sub", fontName="Body", fontSize=12, leading=16, textColor=MUTED),
    "h1": ParagraphStyle("h1", fontName="Body-Bold", fontSize=16, leading=22, textColor=GREEN, spaceBefore=10,
                         spaceAfter=6),
    "h2": ParagraphStyle("h2", fontName="Body-Bold", fontSize=11.5, leading=16, textColor=GREEN, spaceBefore=8,
                         spaceAfter=2),
    "p": ParagraphStyle("p", fontName="Body", fontSize=10, leading=14.5, spaceAfter=5),
    "small": ParagraphStyle("small", fontName="Body", fontSize=8.5, leading=12, textColor=MUTED),
    "center": ParagraphStyle("center", fontName="Body", fontSize=9, leading=12, textColor=MUTED, alignment=TA_CENTER),
}


def P(text, style="p"):
    return Paragraph(text, S[style])


def box(rows, widths, header=True):
    t = Table(rows, colWidths=widths)
    style = [
        ("FONT", (0, 0), (-1, -1), "Body", 9.5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D9E2DE")),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), GREEN), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                  ("FONT", (0, 0), (-1, 0), "Body-Bold", 9.5)]
    t.setStyle(TableStyle(style))
    return t


def steps(items):
    rows = [[P(f"<b>{i}</b>", "p"), P(t)] for i, t in enumerate(items, start=1)]
    t = Table(rows, colWidths=[9 * mm, 160 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), MINT), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"), ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.HexColor("#D9E2DE")),
    ]))
    return t


TAB_HELP = {
    B.S_START: "Set your <b>planner year</b> (change it to 2026 to start today, or reuse the file every year) "
               "and your <b>starting balance</b>. The tab list links to every sheet.",
    B.S_CAT: "Rename up to 10 income and 30 expense categories, give each expense a group (Needs, Wants, Savings, "
             "Debt) and a monthly budget. Fill the lists from the top down without gaps. The <b>50/30/20 check</b> "
             "shows how your plan compares with the popular guideline.",
    B.S_TX: "Type one row per income or expense: date, description, category (drop-down) and amount (always a "
            "positive number). <b>Type</b> and <b>Month</b> fill in by themselves. 'Check category' means the "
            "category name doesn't match your Categories tab; 'Other year' means the date is outside your planner year.",
    B.S_MONTH: "Pick a month at the top. You'll see income, spending, what's left over, your savings rate, "
               "budget vs. actual for every category with progress bars, and two charts.",
    B.S_ANNUAL: "All 12 months side by side for every category, with totals, monthly average, annual budget "
                "and variance (positive = better than plan), plus your running balance.",
    B.S_BILLS: "List recurring bills once (due day, amount, autopay). Each month set Paid / Unpaid. Totals show "
               "what's paid and what is still to pay.",
    B.S_SAVE: "Add a goal, a target amount, what you've saved and a target date. You get a progress bar and "
              "the amount to save each month to hit the date.",
    B.S_NW: "Once a month, type the balances of your accounts (assets) and debts (liabilities). Net worth and the "
            "chart update automatically.",
    B.S_DEBT: "List up to 6 debts: balance, APR (type 19.99 for 19.99%) and minimum payment. Choose <b>Snowball</b> "
              "(smallest balance first — quick wins) or <b>Avalanche</b> (highest interest first — least interest). "
              "Add any extra monthly amount and your first payment month to see each payoff date, the interest "
              "you'll pay and your <b>debt-free date</b>. When a debt is paid off, its payment rolls into the next one.",
    B.S_SCHED: "The full month-by-month plan behind the Debt Payoff tab. Nothing to type here. The grey columns "
               "on the right show the math (interest, minimum and extra part of each payment).",
    B.S_HOL: "Set your holiday date and total budget. List everyone you're buying for with a group and budget, add "
             "gift ideas and move each gift through <b>Idea → Ordered → Bought → Wrapped → Given</b>. Track food, "
             "decorations, travel and other costs in 'Other holiday costs'. The budget check tells you if your "
             "plan fits your total budget.",
}

EDITION_TABS = {
    "bundle": [B.S_START, B.S_CAT, B.S_TX, B.S_MONTH, B.S_ANNUAL, B.S_BILLS, B.S_SAVE, B.S_NW, B.S_DEBT,
               B.S_SCHED, B.S_HOL],
    "holiday": [B.S_START, B.S_HOL],
    "debt": [B.S_START, B.S_DEBT, B.S_SCHED],
}
EDITION_TITLE = {
    "bundle": (B.PRODUCT, "Budget • Bills • Savings • Debt payoff • Net worth • Holiday gifts"),
    "holiday": ("Holiday Budget & Gift Tracker", "Plan every gift and stay on budget"),
    "debt": ("Debt Payoff Planner", "Snowball or Avalanche — find your debt-free date"),
}


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Body", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 10 * mm, f"{B.BRAND} • {EDITION_TITLE[doc.edition][0]}")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.setStrokeColor(SAGE)
    canvas.setLineWidth(2)
    canvas.line(18 * mm, A4[1] - 12 * mm, A4[0] - 18 * mm, A4[1] - 12 * mm)
    canvas.restoreState()


def build_guide(edition, outdir):
    file = B.EDITIONS[edition]["file"]
    path = os.path.join(outdir, f"{file}-GUIDE.pdf")
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=20 * mm,
                            bottomMargin=18 * mm, title=f"{EDITION_TITLE[edition][0]} — Guide", author=B.BRAND)
    doc.edition = edition
    title, sub = EDITION_TITLE[edition]
    story = [Spacer(1, 18 * mm), P(title, "title"), P(sub, "sub"), Spacer(1, 6 * mm),
             P("Thank you for your purchase! This short guide gets you set up in about five minutes.")]

    story += [P("Your files", "h1"),
              box([["File", "What it is"],
                   [P(f"<b>{file}.xlsx</b>"), P("Your planner — clean and ready to fill in.")],
                   [P(f"<b>{file}-DEMO.xlsx</b>"), P("The same planner filled with sample data so you can see "
                                                    "how everything works. Explore it, then use the clean file.")],
                   [P(f"<b>{file}-GUIDE.pdf</b>"), P("This guide.")]],
                  [80 * mm, 94 * mm])]

    story += [P("Open it in Google Sheets (free)", "h1"),
              steps(["Go to <b>drive.google.com</b> and sign in with a Google account.",
                     "Click <b>New → File upload</b> and choose the <b>.xlsx</b> file.",
                     "Double-click the uploaded file, then click <b>Open with Google Sheets</b>.",
                     "Click <b>File → Save as Google Sheets</b>. Work in this new copy from now on.",
                     "On your phone, install the <b>Google Sheets</b> app to log expenses on the go."]),
              P("Open it in Microsoft Excel", "h1"),
              steps(["Download the <b>.xlsx</b> file and double-click it (Excel 2010 or newer, Windows or Mac, "
                     "or Excel for the web).",
                     "If Excel shows a yellow <b>Protected View</b> bar, click <b>Enable Editing</b>."]),
              P("Tip: the planner has no currency symbol, so it works with dollars, euros, pounds, dirhams "
                "or any other currency.", "small")]

    story += [P("Color key", "h1"),
              box([["Cell", "Meaning"], ["Cream", "Type here — these are your inputs"],
                   ["White", "Automatic — formulas, no need to edit"], ["Light green", "Totals and summaries"]],
                  [40 * mm, 134 * mm])]
    story.append(PageBreak())

    story.append(P("How to use each tab", "h1"))
    for tab in EDITION_TABS[edition]:
        story.append(KeepTogether([P(tab, "h2"), P(TAB_HELP[tab])]))
    if edition == "bundle":
        story += [P("A simple weekly routine", "h1"),
                  steps(["Once a week, add your receipts and bank transactions to <b>Transactions</b> (10 minutes).",
                         "Check the <b>Monthly Dashboard</b>: anything red is over budget.",
                         "On the 1st of each month: mark bills Paid, update <b>Net Worth</b> and <b>Savings Goals</b>.",
                         "Once a quarter, look at <b>Annual Overview</b> and adjust budgets in <b>Categories</b>."])]

    story += [P("FAQ", "h1")]
    faq = [
        ("Can I use it for a different year?", "Yes. " + ("Change the planner year on Start Here. " if edition == "bundle" else "")
         + "Keep a blank copy of the clean file and start a new copy each year."),
        ("Can I add more categories or rows?", "Yes — rename or fill any empty cream row. To add rows beyond the "
         "built-in ones, insert them inside a table (not below the total) so the formulas include them."),
        ("I typed over a formula by mistake.", "Use Undo (Ctrl/Cmd + Z). In Google Sheets you can also use "
         "File → Version history. Or copy the same cell from the DEMO file."),
        ("Does it work on Apple Numbers / LibreOffice?", "It is designed for Microsoft Excel and Google Sheets. "
         "It may also open in other spreadsheet apps, but we can only support Excel and Google Sheets."),
        ("Is my data private?", "Yes. The file lives on your own computer or Google Drive. Nothing is sent to us."),
        ("Can I share or resell it?", "The planner is licensed for your personal use. Please don't share, resell "
         "or redistribute the files."),
    ]
    for q, a in faq:
        story.append(KeepTogether([P(q, "h2"), P(a)]))
    story += [Spacer(1, 8 * mm),
              P("Questions? Send us a message through the shop where you bought the planner — we're happy to help. "
                "If you enjoy it, a review really helps a small shop. Thank you!", "center"),
              Spacer(1, 3 * mm),
              P("This planner is a budgeting tool, not financial advice.", "center")]
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return path


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "dist")
    os.makedirs(out, exist_ok=True)
    for e in B.EDITIONS:
        print(build_guide(e, out))


if __name__ == "__main__":
    main()
