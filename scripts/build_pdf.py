"""
Build the FIAD App Onboarding PDF for client handoff.
Run: python3 scripts/build_pdf.py
Output: docs/FIAD_App_Onboarding_Guide.pdf
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Image, Table, TableStyle, PageBreak, KeepTogether, NextPageTemplate,
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
import os

# ─── Paths ───────────────────────────────────────────────────────────────────
BASE   = Path(__file__).parent.parent
SS_DIR = BASE / "screenshots"
OUT    = BASE / "docs"
OUT.mkdir(exist_ok=True)
PDF_PATH = OUT / "FIAD_App_Onboarding_Guide.pdf"

# ─── Brand colours ───────────────────────────────────────────────────────────
PLUM      = colors.HexColor("#2a1d2a")
CORAL     = colors.HexColor("#D9715A")
CHAMPAGNE = colors.HexColor("#D4AF7A")
CREAM     = colors.HexColor("#F5F0E8")
LIGHT_PLUM= colors.HexColor("#4a3550")
MUTED     = colors.HexColor("#7a6882")
WHITE     = colors.white

# ─── Page geometry ───────────────────────────────────────────────────────────
W, H = A4          # 595 x 842 pt
MARGIN_X = 18*mm
MARGIN_TOP = 16*mm
MARGIN_BOT = 14*mm

# Screenshot column width (mobile screenshots have ~0.46 aspect ratio)
SS_W = 52*mm       # screenshot display width in PDF
SS_H = SS_W / 0.462  # ~112 mm, keeps mobile aspect ratio

# ─── Styles ──────────────────────────────────────────────────────────────────
def style(name, **kw):
    return ParagraphStyle(name, **kw)

S = {
    "cover_title": style("cover_title",
        fontName="Helvetica-Bold", fontSize=36, textColor=WHITE,
        leading=42, spaceAfter=6, alignment=TA_CENTER),
    "cover_sub": style("cover_sub",
        fontName="Helvetica", fontSize=14, textColor=colors.HexColor("#e8d8c0"),
        leading=20, spaceAfter=4, alignment=TA_CENTER),
    "cover_detail": style("cover_detail",
        fontName="Helvetica", fontSize=10, textColor=colors.HexColor("#c0a880"),
        leading=14, spaceAfter=0, alignment=TA_CENTER),
    "section_title": style("section_title",
        fontName="Helvetica-Bold", fontSize=22, textColor=PLUM,
        leading=28, spaceBefore=4, spaceAfter=8),
    "section_intro": style("section_intro",
        fontName="Helvetica", fontSize=10.5, textColor=MUTED,
        leading=16, spaceAfter=14),
    "screen_title": style("screen_title",
        fontName="Helvetica-Bold", fontSize=11, textColor=PLUM,
        leading=15, spaceBefore=12, spaceAfter=3),
    "body": style("body",
        fontName="Helvetica", fontSize=9.5, textColor=colors.HexColor("#3a2e3a"),
        leading=14, spaceAfter=5),
    "bullet": style("bullet",
        fontName="Helvetica", fontSize=9.5, textColor=colors.HexColor("#3a2e3a"),
        leading=13, leftIndent=10, firstLineIndent=-10, spaceAfter=3),
    "note": style("note",
        fontName="Helvetica-Oblique", fontSize=9, textColor=MUTED,
        leading=13, spaceAfter=6),
    "step": style("step",
        fontName="Helvetica-Bold", fontSize=9.5, textColor=CORAL,
        leading=13, spaceAfter=2),
    "tag": style("tag",
        fontName="Helvetica-Bold", fontSize=8, textColor=WHITE,
        leading=10, alignment=TA_CENTER),
    "footer": style("footer",
        fontName="Helvetica", fontSize=8, textColor=MUTED,
        leading=10, alignment=TA_CENTER),
}

# ─── Helpers ─────────────────────────────────────────────────────────────────
def ss(filename: str, width=None, height=None) -> Image:
    """Load a screenshot, downscale to 1x DPI, return as ReportLab Image."""
    import io
    from PIL import Image as PILImage
    path = SS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Screenshot not found: {path}")
    with PILImage.open(path) as im:
        iw, ih = im.size
        # Screenshots captured at 2x — halve to save file size
        if iw > 500:
            new_w, new_h = iw // 2, ih // 2
            im = im.resize((new_w, new_h), PILImage.LANCZOS)
            iw, ih = new_w, new_h
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=82, optimize=True)
        buf.seek(0)
    w = width or SS_W
    h = height or (w * ih / iw)
    return Image(buf, width=w, height=h)

def bullet(text: str) -> Paragraph:
    return Paragraph(f"• {text}", S["bullet"])

def step_para(num: int, text: str):
    return [
        Paragraph(f"Step {num}", S["step"]),
        Paragraph(text, S["body"]),
    ]

def screen_block(img_file: str, title: str, description: str, bullets: list[str] = None,
                 steps: list[str] = None, note: str = None, img_width=None):
    """
    Two-column row: [screenshot | title + description + bullets/steps].
    Returns a Table flowable.
    """
    img = ss(img_file, width=img_width or SS_W)

    right_content = [Paragraph(title, S["screen_title"])]
    right_content.append(Paragraph(description, S["body"]))
    if steps:
        for i, s in enumerate(steps, 1):
            right_content.extend(step_para(i, s))
    if bullets:
        for b in bullets:
            right_content.append(bullet(b))
    if note:
        right_content.append(Spacer(1, 4))
        right_content.append(Paragraph(f"💡 {note}", S["note"]))

    col_gap = 7*mm
    text_w = W - MARGIN_X*2 - SS_W - col_gap - (img_width - SS_W if img_width else 0)

    tbl = Table(
        [[img, right_content]],
        colWidths=[img_width or SS_W, text_w],
        rowHeights=None,
    )
    tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (0, 0),  0),
        ("RIGHTPADDING",  (0, 0), (0, 0),  col_gap),
        ("LEFTPADDING",   (1, 0), (1, 0),  0),
        ("RIGHTPADDING",  (1, 0), (1, 0),  0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return KeepTogether(tbl)

def divider(color=CHAMPAGNE):
    return HRFlowable(width="100%", thickness=0.5, color=color, spaceAfter=10, spaceBefore=4)

def section_header(label: str, description: str, accent=CORAL):
    tag_tbl = Table(
        [[Paragraph(label, S["tag"])]],
        colWidths=[26*mm],
        rowHeights=[7*mm],
    )
    tag_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), accent),
        ("ROUNDEDCORNERS",(0, 0), (-1, -1), [3]),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return [
        tag_tbl,
        Spacer(1, 5),
        Paragraph(label, S["section_title"]),
        Paragraph(description, S["section_intro"]),
        divider(accent),
    ]


# ─── Cover page background canvas callback ───────────────────────────────────
def cover_background(canvas, doc):
    canvas.saveState()
    # Dark plum gradient bg (simulate with solid for PDF compatibility)
    canvas.setFillColor(PLUM)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Subtle gold accent band
    canvas.setFillColor(CHAMPAGNE)
    canvas.setFillAlpha(0.12)
    canvas.rect(0, H*0.35, W, H*0.30, fill=1, stroke=0)
    canvas.setFillAlpha(1.0)
    # Decorative dots
    canvas.setFillColor(CHAMPAGNE)
    canvas.setFillAlpha(0.15)
    for x, y, r in [(60, H-80, 40), (W-50, 120, 30), (W*0.5, H*0.15, 60), (40, H*0.4, 20)]:
        canvas.circle(x, y, r, fill=1, stroke=0)
    canvas.setFillAlpha(1.0)
    canvas.restoreState()

def normal_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Subtle top bar
    canvas.setFillColor(PLUM)
    canvas.rect(0, H-8*mm, W, 8*mm, fill=1, stroke=0)
    # Page number
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(W/2, 8*mm, f"FIAD App Onboarding Guide  ·  Page {doc.page}")
    canvas.restoreState()


# ─── Document setup ──────────────────────────────────────────────────────────
class FIADDoc(BaseDocTemplate):
    def __init__(self, path):
        super().__init__(
            str(path),
            pagesize=A4,
            rightMargin=MARGIN_X,
            leftMargin=MARGIN_X,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOT + 8*mm,
            title="FIAD App Onboarding Guide",
            author="Forever in a Day",
        )
        cover_frame = Frame(0, 0, W, H, leftPadding=MARGIN_X, rightPadding=MARGIN_X,
                            topPadding=MARGIN_TOP, bottomPadding=MARGIN_BOT)
        body_frame  = Frame(MARGIN_X, MARGIN_BOT+8*mm, W-MARGIN_X*2, H-MARGIN_TOP-MARGIN_BOT-8*mm,
                            leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate("cover", frames=[cover_frame], onPage=cover_background),
            PageTemplate("body",  frames=[body_frame],  onPage=normal_background),
        ])


# ─── Content builder ─────────────────────────────────────────────────────────
def build():
    doc = FIADDoc(PDF_PATH)
    story = []

    # ══════════════════════════════════════════════════════════════════════════
    # COVER PAGE
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 55*mm))
    story.append(Paragraph("Forever in a Day", S["cover_title"]))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("App Onboarding Guide", S["cover_sub"]))
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("June 6–7, 2026  ·  Brittany Hotel BGC, Taguig", S["cover_detail"]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("The wedding &amp; debut bazaar — raffles, passport stamps, and curated suppliers under one roof.", S["cover_detail"]))
    story.append(Spacer(1, 50*mm))
    story.append(Paragraph("Prepared for the FIAD Event Team", S["cover_detail"]))
    story.append(Paragraph("Confidential — Do not distribute", S["cover_detail"]))

    story.append(NextPageTemplate("body"))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # TABLE OF CONTENTS  (manual, simple)
    # ══════════════════════════════════════════════════════════════════════════
    toc_items = [
        ("1", "Guest App",         "Signing up, digital ticket, passport, challenges, raffle"),
        ("2", "Store / Booth Clerk App", "Logging in, scanning guests, managing entries & overrides"),
        ("3", "Admin App",         "Dashboard, overrides, guests, prizes & raffle draw"),
        ("4", "Quick-Reference",   "Credentials, daily cap rules, FAQs"),
    ]
    story.append(Paragraph("Contents", ParagraphStyle("toc_h", fontName="Helvetica-Bold",
        fontSize=20, textColor=PLUM, leading=26, spaceAfter=10)))
    story.append(divider())
    for num, title, desc in toc_items:
        row = Table(
            [[Paragraph(f"<b>{num}</b>", ParagraphStyle("tn", fontName="Helvetica-Bold",
                        fontSize=28, textColor=CHAMPAGNE, leading=32)),
              [Paragraph(title, ParagraphStyle("tt", fontName="Helvetica-Bold",
                        fontSize=13, textColor=PLUM, leading=17, spaceAfter=2)),
               Paragraph(desc, ParagraphStyle("td", fontName="Helvetica",
                        fontSize=9, textColor=MUTED, leading=13))]]],
            colWidths=[18*mm, W-MARGIN_X*2-18*mm],
        )
        row.setStyle(TableStyle([
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(row)
        story.append(divider(CREAM))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 1 — GUEST APP
    # ══════════════════════════════════════════════════════════════════════════
    story.extend(section_header(
        "1  GUEST APP",
        "How guests register, access their digital ticket, collect passport stamps, complete challenges, and track raffle entries. The app works on any smartphone — no download required, just open the link in a browser.",
        accent=CORAL,
    ))

    story.append(screen_block(
        "01_landing.png",
        "Landing Page",
        "The entry point guests see when they open the app link. From here they can sign in to an existing account or register as a new guest. Store and Admin operators also log in via the links at the bottom.",
        bullets=[
            "\"Sign in\" — for returning guests who already registered",
            "\"Register\" — first-time guests create their ticket in 30 seconds",
            "\"Store login\" / \"Admin login\" — for event staff (not guests)",
        ],
    ))

    story.append(screen_block(
        "02_guest_register.png",
        "Guest Registration",
        "New guests fill in their name, email, and mobile number. This takes about 30 seconds and creates a digital ticket with a unique QR code. The access code is sent automatically via the GHL welcome email.",
        steps=[
            "Open the event app link (shared in the invite email).",
            "Tap Register and enter full name, email, and mobile number.",
            "Tick the consent checkbox and tap Get my ticket.",
            "The system creates the account and shows the ticket immediately.",
        ],
        note="Guests who already registered tap 'Sign in' and use their email + 6-character access code from the welcome email.",
    ))

    story.append(screen_block(
        "03_guest_login.png",
        "Guest Sign In",
        "Returning guests use their email address and the 6-character access code sent in their welcome email. If a guest loses the code, an admin can look it up in the Guests section of the Admin App.",
        bullets=[
            "Email — the one used during registration",
            "Access code — 6 characters, uppercase (e.g. K7N2QF)",
        ],
    ))

    story.append(divider())

    story.append(screen_block(
        "06_guest_ticket.png",
        "Digital Ticket",
        "After signing in, guests land on their ticket. This is the main screen they'll show to booth clerks when making purchases. The QR code is unique to each guest and is scanned by the store to issue raffle entries.",
        bullets=[
            "Guest name, email, and unique QR code",
            "Live raffle entry count updates as they spend",
            "Next prize draw countdown",
            "Tap 'How it works' for a quick explainer",
        ],
        note="₱100 spent at any booth = 1 raffle entry. The daily cap per guest per booth is ₱5,000.",
    ))

    story.append(screen_block(
        "07_guest_walkthrough_map.png",
        "Event Walkthrough — Map",
        "The Walkthrough section has four tabs. The Map tab shows a floor plan of the venue with all booths colour-coded by category. Guests can tap any booth to see its details.",
        bullets=[
            "Colour coding by supplier category (bridal, catering, decor, etc.)",
            "Tap any booth to open its profile card",
        ],
    ))

    story.append(screen_block(
        "08_guest_walkthrough_booths.png",
        "Event Walkthrough — Booths",
        "The Booths tab lists all participating suppliers with their booth number, category, and contact details. Guests can browse before visiting.",
        bullets=[
            "All 34 registered suppliers listed",
            "Booth number, category tag, and description",
            "Tap a card to open the full profile with website / social links",
        ],
    ))

    story.append(screen_block(
        "09_guest_walkthrough_promos.png",
        "Event Walkthrough — Promos",
        "Suppliers can publish exclusive event-day promos visible here. Guests browse deals before walking the floor.",
    ))

    story.append(screen_block(
        "10_guest_walkthrough_schedule.png",
        "Event Walkthrough — Schedule",
        "The Schedule tab lists all event activities in chronological order: fashion shows, demos, workshops, and the raffle draws. Guests can plan which sessions to attend.",
        bullets=[
            "All Day 1 and Day 2 activities",
            "Time, activity name, and description",
        ],
    ))

    story.append(divider())

    story.append(screen_block(
        "11_guest_passport.png",
        "Passport (Stamp Collection)",
        "Guests earn a passport stamp by visiting each booth and having the clerk scan their QR code. Collecting all stamps unlocks a bonus reward and additional raffle entries.",
        bullets=[
            "Each stamp represents one booth visited",
            "Stamps are added automatically when the store clerk scans the guest",
            "Completing the full passport earns bonus raffle entries",
        ],
        note="The store's Booth QR screen (in the Store App) is what guests scan with their phone camera to collect stamps.",
    ))

    story.append(screen_block(
        "12_guest_challenges.png",
        "Challenges / Quests",
        "Guests can earn bonus raffle entries by completing special challenges — attending specific activities, visiting all booths, or completing other event milestones. Each challenge shows the reward and a completion indicator.",
        bullets=[
            "Booth visit challenges — automatically marked when stamp collected",
            "Visit-all challenge — completes when all booths are stamped",
            "Activity challenges — completed by admin or booth staff",
        ],
    ))

    story.append(screen_block(
        "13_guest_raffle.png",
        "Raffle Entries",
        "Shows the guest's current raffle entries with ticket numbers. Each ₱100 purchase = 1 entry. Bonus entries from challenges also appear here.",
        bullets=[
            "Total entry count displayed prominently",
            "Individual ticket numbers listed",
            "Entries are added in real time as purchases are processed",
        ],
    ))

    story.append(screen_block(
        "14_guest_scan.png",
        "QR Scanner (Passport Stamp)",
        "Guests use this screen to scan a booth's QR code and collect their passport stamp. They can use the camera or manually enter the code if the camera doesn't open.",
        steps=[
            "Tap the camera icon (or 'Enter code' if camera fails).",
            "Point the camera at the booth's QR code (on the Store App).",
            "The stamp is recorded automatically.",
        ],
    ))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 2 — STORE / BOOTH CLERK APP
    # ══════════════════════════════════════════════════════════════════════════
    story.extend(section_header(
        "2  STORE / BOOTH CLERK APP",
        "Each booth has its own login that lets the clerk scan guest QR codes, record purchase amounts, and manage raffle entry issuance. The store app runs in any mobile browser — no download required.",
        accent=CHAMPAGNE,
    ))

    story.append(screen_block(
        "04_store_login.png",
        "Store Login",
        "Each booth clerk logs in with their store-specific passcode. The event coordinator provides this passcode before the event.",
        steps=[
            "Open the app link in your phone browser.",
            "Tap 'Store login' on the landing page.",
            "Enter your store passcode (provided by the event team).",
            "Tap Sign in — you're taken to the scan screen.",
        ],
        note="Each booth has its own unique passcode. Do not share with guests.",
    ))

    story.append(screen_block(
        "15_store_scan.png",
        "Scan Guest & Issue Raffle Entries",
        "This is the main screen booth clerks use throughout the event. Scan the guest's QR code or enter it manually, input the purchase amount, take a receipt photo, and issue entries — all in under 30 seconds.",
        steps=[
            "Show the guest their QR code (on their Ticket screen).",
            "Tap 'Camera' to scan or 'Enter code' to type manually.",
            "After the guest is identified, enter the purchase amount in pesos.",
            "Tap the camera icon to photograph the receipt.",
            "Tap 'Issue entries' to confirm. The guest receives entries instantly.",
        ],
        note="₱5,000 daily cap per guest per booth. Amounts over the cap become override requests for admin approval.",
    ))

    story.append(screen_block(
        "16_store_history.png",
        "Transaction History",
        "View all transactions processed by this booth today. Each entry shows the guest name, amount, number of raffle entries issued, and status.",
        bullets=[
            "Approved — entries were issued immediately",
            "Pending override — amount exceeded daily cap, waiting for admin",
            "Denied — admin rejected the override request",
        ],
    ))

    story.append(screen_block(
        "17_store_overrides.png",
        "Override Requests",
        "When a purchase exceeds the daily cap (₱5,000/guest/booth), the system creates an override request instead of issuing entries. This screen lets the clerk add a note and monitor the status.",
        bullets=[
            "Pending — awaiting admin review",
            "Approved — entries were issued after admin confirmed",
            "Denied — admin rejected; entries were not issued",
        ],
        note="Always add a brief override note explaining why the cap should be waived (e.g., 'Full bridal package — single purchase').",
    ))

    story.append(screen_block(
        "18_store_passport_qr.png",
        "Booth QR Code (Passport Stamp)",
        "Display this screen so guests can scan it with their phone camera to collect their passport stamp for your booth. Keep this visible at your booth throughout the event.",
        bullets=[
            "Guests open their app → Passport tab → tap the scan icon",
            "They point their camera at this QR code",
            "The stamp is added to their passport automatically",
        ],
        note="The QR code is unique to your booth. Leave it on-screen and face it toward guests.",
    ))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 3 — ADMIN APP
    # ══════════════════════════════════════════════════════════════════════════
    story.extend(section_header(
        "3  ADMIN APP",
        "Event coordinators use the Admin App to monitor live metrics, approve or deny purchase overrides, manage guest accounts, run the raffle draw, and configure event settings.",
        accent=LIGHT_PLUM,
    ))

    story.append(screen_block(
        "05_admin_login.png",
        "Admin Login",
        "Admins log in with their name and a shared admin passcode. Multiple admins can be logged in simultaneously on different devices.",
        steps=[
            "Open the app link and tap 'Admin login' at the bottom of the landing page.",
            "Select your name from the dropdown.",
            "Enter the admin passcode and tap Sign in.",
        ],
        note="The admin passcode is set by the event coordinator before the event. Keep it confidential.",
    ))

    story.append(screen_block(
        "19_admin_dashboard.png",
        "Dashboard",
        "The Dashboard gives a live overview of event performance: registered guests, total raffle entries, approved sales total, and pending overrides requiring attention.",
        bullets=[
            "Registered Guests — total signups",
            "Raffle Entries — all entries issued so far",
            "Approved Sales — total peso value of approved transactions",
            "Pending Overrides — needs admin action (tap to review)",
            "Top Stores by Revenue — leaderboard",
        ],
    ))

    story.append(screen_block(
        "21_admin_overrides.png",
        "Override Approvals",
        "When a booth clerk submits a purchase that exceeds the daily cap, it appears here as Pending. Admins review the receipt photo, override note, and guest spend history, then approve or deny.",
        steps=[
            "Tap a pending override to open the detail view.",
            "Review the receipt photo and clerk note.",
            "Tap Approve to issue the entries, or Deny to reject.",
            "The clerk and guest are updated in real time.",
        ],
        note="Only one admin can approve an override — the system is race-condition safe. If two admins tap Approve simultaneously, only one succeeds.",
    ))

    story.append(screen_block(
        "20_admin_guests.png",
        "Guest Management",
        "View all registered guests with their name, email, raffle entry count, and access code. Use this to look up a guest's access code if they've lost it.",
        bullets=[
            "Search by name or email",
            "View access code — share with guest if they can't log in",
            "See entry count per guest",
        ],
    ))

    story.append(screen_block(
        "22_admin_transactions.png",
        "Transactions",
        "Full log of all purchase transactions across all booths. Filterable by status. Use this to audit entries or investigate discrepancies.",
        bullets=[
            "Approved — entries issued, counts toward sales total",
            "Pending override — awaiting admin action",
            "Denied — no entries issued",
        ],
    ))

    story.append(screen_block(
        "23_admin_prizes.png",
        "Prizes",
        "Shows all configured raffle prizes in draw order. Each prize card displays the prize name, sponsor, and whether it has been drawn already.",
    ))

    story.append(screen_block(
        "24_admin_draw.png",
        "Raffle Draw",
        "The live raffle draw screen. The MC uses this to draw winners one prize at a time. The system randomly selects a ticket from all eligible entries.",
        steps=[
            "Go to Admin → Draw.",
            "Tap 'Draw winner' for the current prize.",
            "The winning guest's name and ticket number are displayed.",
            "Announce the winner, then proceed to the next prize.",
        ],
        note="Winners are recorded permanently. A prize cannot be re-drawn once a winner is confirmed.",
    ))

    story.append(screen_block(
        "25_admin_stores.png",
        "Store Management",
        "Lists all registered booths with contact details and booth assignment. Admins can add or edit store details including website, Instagram, and email.",
    ))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 4 — QUICK REFERENCE
    # ══════════════════════════════════════════════════════════════════════════
    story.extend(section_header(
        "4  QUICK REFERENCE",
        "Key rules, numbers, and FAQs for event day.",
        accent=CORAL,
    ))

    # Rules table
    story.append(Paragraph("Event Rules & Limits", S["screen_title"]))
    rules = [
        ["Rule", "Detail"],
        ["Raffle rate", "₱100 spent = 1 raffle entry"],
        ["Daily cap", "₱5,000 per guest per booth, per day"],
        ["Override", "Purchases above cap require admin approval before entries are issued"],
        ["Passport stamp", "1 stamp per booth visit; guest scans the store's QR code"],
        ["Passport reward", "Collecting all stamps earns bonus raffle entries"],
        ["Duplicate submit", "The app is idempotent — double-tapping the Submit button is safe"],
        ["Event days", "Day 1: June 6 · Day 2: June 7 · Daily caps reset at midnight"],
    ]
    t = Table(rules, colWidths=[42*mm, W - MARGIN_X*2 - 42*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  PLUM),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  9),
        ("FONTNAME",      (0, 1), (0, -1),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 1), (-1, -1), 9),
        ("FONTNAME",      (1, 1), (1, -1),  "Helvetica"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, CREAM]),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#d0c8d0")),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t)
    story.append(Spacer(1, 8*mm))

    # FAQ
    story.append(Paragraph("Frequently Asked Questions", S["screen_title"]))
    faqs = [
        ("A guest lost their access code — how do I help them?",
         "Go to Admin → Guests, search for the guest by name or email, and read the access code from the table. Share it with the guest verbally."),
        ("A booth clerk accidentally submitted the wrong amount — what now?",
         "Entries issued by an approved transaction cannot be reversed in the app. Contact the coordinator, who can void the transaction in the Supabase dashboard."),
        ("The camera won't open on a guest's phone.",
         "The guest can tap 'Enter code' on the Scan screen and type the QR value manually. The code is shown on the store's Booth QR screen."),
        ("A purchase is stuck as 'Pending Override'.",
         "An admin needs to review it. Open Admin → Overrides, find the request, and tap Approve or Deny."),
        ("Can two guests share one purchase to split the cap?",
         "No — each transaction is linked to one guest's QR code. The purchase must be recorded against the purchasing guest."),
        ("The raffle draw screen shows no eligible entries.",
         "No raffle entries have been issued yet (transactions may all be pending override). Process the overrides first."),
    ]
    for q, a in faqs:
        story.append(Paragraph(f"<b>Q: {q}</b>", S["body"]))
        story.append(Paragraph(f"A: {a}", ParagraphStyle("ans", fontName="Helvetica",
            fontSize=9.5, textColor=MUTED, leading=14, leftIndent=10, spaceAfter=8)))

    story.append(Spacer(1, 6*mm))
    story.append(divider())
    story.append(Paragraph(
        "For technical issues during the event, contact the app coordinator. "
        "The admin passcode and store passcodes should be kept confidential and rotated after the event.",
        S["note"]
    ))

    # ─── Build ────────────────────────────────────────────────────────────────
    doc.build(story)
    print(f"PDF written → {PDF_PATH}")


if __name__ == "__main__":
    build()
