"""
Build the FIAD App Onboarding Presentation PDF (landscape, slide-deck format).
Run: python3 scripts/build_presentation.py
Output: docs/FIAD_App_Presentation.pdf
"""
import io
from pathlib import Path
from PIL import Image as PILImage
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Image, Table, TableStyle, PageBreak, KeepTogether, NextPageTemplate,
)
from reportlab.platypus.flowables import HRFlowable, Flowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# ─── Paths ───────────────────────────────────────────────────────────────────
BASE   = Path(__file__).parent.parent
SS_DIR = BASE / "screenshots"
OUT    = BASE / "docs"
OUT.mkdir(exist_ok=True)
PDF_PATH = OUT / "FIAD_App_Presentation.pdf"

# ─── Page geometry ───────────────────────────────────────────────────────────
SW, SH = landscape(A4)   # 841.9 × 595.3 pt  (~16:11)
MARGIN_X = 20*mm
MARGIN_Y = 14*mm

# Screenshot column in slides
SS_W = 62*mm             # display width
CROP_TOP = 0.72          # keep top 72% of each screenshot (cuts nav bar + blank)

# Derived: screenshot display height
# Native pixel ratio (after crop): width / (height * CROP_TOP) ≈ 0.462 / CROP_TOP
SS_H = SS_W * (1.0 / (0.462 / CROP_TOP))   # ≈ SS_W * 1.558

HEADER_H = 32            # header bar height (pt)
CONTENT_H = SH - HEADER_H - MARGIN_Y - MARGIN_Y  # usable content height

# ─── Brand colours ───────────────────────────────────────────────────────────
PLUM      = colors.HexColor("#2a1d2a")
CORAL     = colors.HexColor("#D9715A")
CHAMPAGNE = colors.HexColor("#D4AF7A")
CREAM     = colors.HexColor("#F5F0E8")
LIGHT_PLUM= colors.HexColor("#4a3550")
MUTED     = colors.HexColor("#7a6882")
WHITE     = colors.white

SECTION_COLORS = {
    "guest":  CORAL,
    "store":  CHAMPAGNE,
    "admin":  LIGHT_PLUM,
    "ref":    CORAL,
}

# ─── Styles ──────────────────────────────────────────────────────────────────
def S(name, **kw):
    return ParagraphStyle(name, **kw)

STYLES = {
    # Cover
    "cv_title": S("cv_title", fontName="Helvetica-Bold", fontSize=38, textColor=WHITE,
                  leading=46, spaceAfter=6, alignment=TA_CENTER),
    "cv_sub":   S("cv_sub",   fontName="Helvetica", fontSize=15, textColor=colors.HexColor("#e8d8c0"),
                  leading=22, spaceAfter=4, alignment=TA_CENTER),
    "cv_det":   S("cv_det",   fontName="Helvetica", fontSize=10, textColor=colors.HexColor("#c0a880"),
                  leading=14, alignment=TA_CENTER),
    # Slide header label (small, in bar)
    "bar_label": S("bar_label", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE,
                   leading=10, alignment=TA_RIGHT),
    # Slide content
    "slide_title": S("slide_title", fontName="Helvetica-Bold", fontSize=17, textColor=PLUM,
                     leading=22, spaceAfter=6),
    "slide_body": S("slide_body", fontName="Helvetica", fontSize=10.5, textColor=colors.HexColor("#3a2e3a"),
                    leading=15, spaceAfter=4),
    "slide_bullet": S("slide_bullet", fontName="Helvetica", fontSize=10.5, textColor=colors.HexColor("#3a2e3a"),
                      leading=14, leftIndent=12, firstLineIndent=-12, spaceAfter=3),
    "slide_step_num": S("slide_step_num", fontName="Helvetica-Bold", fontSize=9.5, textColor=CORAL,
                        leading=13, spaceAfter=1),
    "slide_step_txt": S("slide_step_txt", fontName="Helvetica", fontSize=10.5, textColor=colors.HexColor("#3a2e3a"),
                        leading=14, leftIndent=8, spaceAfter=5),
    "slide_note": S("slide_note", fontName="Helvetica-Oblique", fontSize=9.5, textColor=MUTED,
                    leading=13, spaceAfter=4),
    # Section divider
    "div_kicker": S("div_kicker", fontName="Helvetica", fontSize=11,
                    textColor=colors.HexColor("#c0a880"), leading=14, spaceAfter=6, alignment=TA_CENTER),
    "div_title": S("div_title", fontName="Helvetica-Bold", fontSize=36, textColor=WHITE,
                   leading=44, spaceAfter=10, alignment=TA_CENTER),
    "div_sub": S("div_sub", fontName="Helvetica", fontSize=12,
                 textColor=colors.HexColor("#d8c8d8"), leading=18, alignment=TA_CENTER),
    # ToC
    "toc_num": S("toc_num", fontName="Helvetica-Bold", fontSize=32, textColor=CHAMPAGNE,
                 leading=38, alignment=TA_CENTER),
    "toc_title": S("toc_title", fontName="Helvetica-Bold", fontSize=15, textColor=PLUM,
                   leading=19, spaceAfter=2),
    "toc_desc": S("toc_desc", fontName="Helvetica", fontSize=10, textColor=MUTED,
                  leading=13),
    "footer": S("footer", fontName="Helvetica", fontSize=8, textColor=MUTED,
                leading=10, alignment=TA_CENTER),
}


# ─── Image helper ─────────────────────────────────────────────────────────────
def ss(filename: str, width=None, crop_top: float = CROP_TOP) -> Image:
    """Load screenshot, crop to top fraction, compress, return as Image."""
    path = SS_DIR / filename
    with PILImage.open(path) as im:
        iw, ih = im.size
        # Halve resolution (captured at 2x)
        if iw > 500:
            im = im.resize((iw // 2, ih // 2), PILImage.LANCZOS)
            iw, ih = im.size
        # Crop to top portion
        crop_h = int(ih * crop_top)
        im = im.crop((0, 0, iw, crop_h))
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=84, optimize=True)
        buf.seek(0)
    w = width or SS_W
    h = w * (crop_h / iw)
    return Image(buf, width=w, height=h)


# ─── Helpers ──────────────────────────────────────────────────────────────────
def bullet(text: str) -> Paragraph:
    return Paragraph(f"• {text}", STYLES["slide_bullet"])

def note(text: str) -> Paragraph:
    return Paragraph(f"💡 {text}", STYLES["slide_note"])

def step(num: int, text: str) -> list:
    return [
        Paragraph(f"Step {num}", STYLES["slide_step_num"]),
        Paragraph(text, STYLES["slide_step_txt"]),
    ]

def divider(color=CHAMPAGNE):
    return HRFlowable(width="100%", thickness=0.5, color=color, spaceAfter=8, spaceBefore=2)


# ─── Page background callbacks ────────────────────────────────────────────────
_current_section = [None]   # mutable reference for callbacks

def cover_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PLUM)
    canvas.rect(0, 0, SW, SH, fill=1, stroke=0)
    canvas.setFillColor(CHAMPAGNE)
    canvas.setFillAlpha(0.10)
    canvas.rect(0, SH*0.3, SW, SH*0.4, fill=1, stroke=0)
    canvas.setFillAlpha(0.12)
    for x, y, r in [(80, SH-60, 50), (SW-60, 80, 35), (SW*0.5, SH*0.1, 70)]:
        canvas.circle(x, y, r, fill=1, stroke=0)
    canvas.setFillAlpha(1.0)
    canvas.restoreState()

def divider_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PLUM)
    canvas.rect(0, 0, SW, SH, fill=1, stroke=0)
    # Accent strip
    canvas.setFillColor(CORAL)
    canvas.setFillAlpha(0.18)
    canvas.rect(0, SH*0.35, SW, SH*0.30, fill=1, stroke=0)
    canvas.setFillAlpha(1.0)
    canvas.restoreState()

def slide_bg(canvas, doc):
    canvas.saveState()
    # White background
    canvas.setFillColor(WHITE)
    canvas.rect(0, 0, SW, SH, fill=1, stroke=0)
    # Plum header bar
    canvas.setFillColor(PLUM)
    canvas.rect(0, SH - HEADER_H, SW, HEADER_H, fill=1, stroke=0)
    # Slide number footer
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(SW / 2, 8, f"Forever in a Day  ·  App Onboarding  ·  {doc.page}")
    canvas.restoreState()


# ─── Document ─────────────────────────────────────────────────────────────────
class PresentationDoc(BaseDocTemplate):
    def __init__(self, path):
        super().__init__(
            str(path),
            pagesize=(SW, SH),
            rightMargin=MARGIN_X, leftMargin=MARGIN_X,
            topMargin=HEADER_H + MARGIN_Y,
            bottomMargin=MARGIN_Y + 10,
            title="FIAD App Onboarding",
            author="Forever in a Day",
        )
        full_frame = Frame(0, 0, SW, SH,
                           leftPadding=MARGIN_X, rightPadding=MARGIN_X,
                           topPadding=MARGIN_Y, bottomPadding=MARGIN_Y)
        content_frame = Frame(
            MARGIN_X, MARGIN_Y + 10,
            SW - MARGIN_X * 2, SH - HEADER_H - MARGIN_Y * 2 - 10,
            leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        )
        self.addPageTemplates([
            PageTemplate("cover",   frames=[full_frame],    onPage=cover_bg),
            PageTemplate("divider", frames=[full_frame],    onPage=divider_bg),
            PageTemplate("slide",   frames=[content_frame], onPage=slide_bg),
        ])


# ─── Slide builder ────────────────────────────────────────────────────────────
def slide(img_file: str, title: str, body: str,
          steps_list=None,
          bullets_list=None,
          note_text=None,
          crop=None,
          img_width=None) -> KeepTogether:
    if crop is None:
        crop = CROP_TOP
    """
    One presentation slide: [screenshot | title + content].
    """
    img = ss(img_file, width=img_width or SS_W, crop_top=crop)

    right = [Paragraph(title, STYLES["slide_title"])]
    right.append(Paragraph(body, STYLES["slide_body"]))
    if steps_list:
        for i, s in enumerate(steps_list, 1):
            right.extend(step(i, s))
    if bullets_list:
        for b in bullets_list:
            right.append(bullet(b))
    if note_text:
        right.append(Spacer(1, 4))
        right.append(note(note_text))

    gap = 14
    text_w = SW - MARGIN_X * 2 - (img_width or SS_W) - gap

    tbl = Table(
        [[img, right]],
        colWidths=[img_width or SS_W, text_w],
    )
    tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (0, 0),   0),
        ("RIGHTPADDING",  (0, 0), (0, 0),   gap),
        ("LEFTPADDING",   (1, 0), (1, 0),   0),
        ("RIGHTPADDING",  (1, 0), (1, 0),   0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return KeepTogether(tbl)


def section_divider(number: str, title: str, subtitle: str) -> list:
    """
    Returns the CONTENT of a section divider page plus the exit break.
    The CALLER is responsible for:
      1. story += [NextPageTemplate("divider"), PageBreak()]   ← enter divider
      2. story.extend(section_divider(...))                   ← content + exit
    This ensures NextPageTemplate lands on the previous page (not a blank new one).
    """
    return [
        Spacer(1, SH * 0.22),
        Paragraph(f"Section {number}", STYLES["div_kicker"]),
        Paragraph(title, STYLES["div_title"]),
        Spacer(1, 6),
        Paragraph(subtitle, STYLES["div_sub"]),
        NextPageTemplate("slide"),
        PageBreak(),
    ]

def enter_divider():
    """Switch to divider template on the CURRENT page, then break to it."""
    return [NextPageTemplate("divider"), PageBreak()]


# ─── Build ────────────────────────────────────────────────────────────────────
def build():
    doc = PresentationDoc(PDF_PATH)
    story = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, SH * 0.22))
    story.append(Paragraph("Forever in a Day", STYLES["cv_title"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph("App Onboarding Guide", STYLES["cv_sub"]))
    story.append(Spacer(1, 8))
    story.append(Paragraph("June 6–7, 2026  ·  Brittany Hotel BGC, Taguig", STYLES["cv_det"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "The wedding &amp; debut bazaar — raffles, passport stamps, and curated suppliers under one roof.",
        STYLES["cv_det"]))
    story.append(Spacer(1, SH * 0.14))
    story.append(Paragraph("Prepared for the FIAD Event Team", STYLES["cv_det"]))

    story.append(NextPageTemplate("slide"))
    story.append(PageBreak())

    # ── Contents slide ────────────────────────────────────────────────────────
    toc_rows = [
        ("1", "Guest App",              "Sign in · Digital ticket · Passport stamps · Challenges · Raffle"),
        ("2", "Store / Booth Clerk App","Log in · Scan guests · Issue entries · Overrides · Booth QR"),
        ("3", "Admin App",              "Dashboard · Approve overrides · Guests · Prizes · Raffle draw"),
        ("4", "Quick Reference",        "Rules · Daily cap · FAQs"),
    ]
    story.append(Paragraph("Contents", ParagraphStyle("toc_h", fontName="Helvetica-Bold",
        fontSize=22, textColor=PLUM, leading=28, spaceAfter=8)))
    story.append(divider())
    rows_data = []
    for num, title, desc in toc_rows:
        rows_data.append([
            Paragraph(num, STYLES["toc_num"]),
            [Paragraph(title, STYLES["toc_title"]),
             Paragraph(desc, STYLES["toc_desc"])],
        ])
    toc_tbl = Table(rows_data, colWidths=[20*mm, SW - MARGIN_X*2 - 20*mm])
    toc_tbl.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW",     (0, 0), (-1, -2), 0.4, colors.HexColor("#e0d8e0")),
    ]))
    story.append(toc_tbl)
    # Enter divider ON the TOC page so next page renders with divider template
    story.extend(enter_divider())

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 1: GUEST APP
    # ══════════════════════════════════════════════════════════════════════════
    story.extend(section_divider(
        "1", "Guest App",
        "How guests access the app, collect stamps, complete challenges, and track raffle entries."
    ))

    story.append(slide(
        "01_landing.png",
        "Opening the App",
        "Guests open the app link sent in their welcome email. From here they sign in to their existing account.",
        bullets_list=[
            "\"Sign in\" — returning guests with email + access code",
            "\"Register\" — walk-in guests not pre-registered via invite",
            "Store and Admin logins are at the bottom for event staff",
        ],
    ))
    story.append(PageBreak())

    story.append(slide(
        "02_guest_register.png",
        "Guest Account Setup",
        "Accounts are automatically created when the event team adds a guest via the invite link. "
        "The guest receives a welcome email with their personal access code — no separate sign-up needed.",
        bullets_list=[
            "Invited guests: click the link in the welcome email → signed in instantly",
            "Walk-in guests: tap Register, fill in name, email &amp; mobile → account created in 30 seconds",
            "Access code is auto-generated and sent by email",
        ],
        note_text="If a guest loses their access code, an admin can look it up in Admin → Guests.",
    ))
    story.append(PageBreak())

    story.append(slide(
        "03_guest_login.png",
        "Returning Guest Sign In",
        "Returning guests sign in with their email and the 6-character access code from their welcome email.",
        bullets_list=[
            "Email — same one used at registration",
            "Access code — 6 uppercase characters (e.g. K7N2QF)",
            "Tap 'Register instead' if they haven't registered yet",
        ],
    ))
    story.append(PageBreak())

    story.append(slide(
        "06_guest_ticket.png",
        "Digital Ticket & QR Code",
        "After signing in, guests land on their ticket. This QR code is shown to booth clerks when making purchases.",
        bullets_list=[
            "Live raffle entry count — updates as they spend",
            "Next prize draw countdown",
            "Tap 'How it works' for a quick explainer",
        ],
        note_text="₱100 spent at any booth = 1 raffle entry. Cap: ₱5,000 per guest per booth per day.",
    ))
    story.append(PageBreak())

    story.append(slide(
        "07_guest_walkthrough_map.png",
        "Event Map",
        "The Map tab shows a colour-coded floor plan of the venue. Guests tap any booth to see its full profile.",
        bullets_list=[
            "Colour-coded by supplier category",
            "Tap any booth to open its info card",
            "Filter by category using the chips at the top",
        ],
        crop=0.80,
    ))
    story.append(PageBreak())

    story.append(slide(
        "08_guest_walkthrough_booths.png",
        "Booth Directory",
        "The Booths tab lists all 34 participating suppliers. Guests can browse before visiting the floor.",
        bullets_list=[
            "Booth number, category tag, and description",
            "Tap a card to open the full profile",
            "Website and social links available in profiles",
        ],
        crop=0.75,
    ))
    story.append(PageBreak())

    story.append(slide(
        "09_guest_walkthrough_promos.png",
        "Promos & Schedule",
        "Suppliers publish exclusive event-day deals in the Promos tab. The Schedule tab lists all activities — fashion shows, demos, workshops, and raffle draws.",
        bullets_list=[
            "Promos: event-day deals from participating booths",
            "Schedule: all Day 1 and Day 2 activities with times",
        ],
        crop=0.80,
    ))
    story.append(PageBreak())

    story.append(slide(
        "11_guest_passport.png",
        "Passport — Collect Stamps",
        "Guests earn a stamp for each booth they visit. Collecting all stamps unlocks a bonus reward and additional raffle entries.",
        steps_list=[
            "Guest taps the Passport tab → scan icon.",
            "They point their camera at the booth's QR code (on the store's Booth QR screen).",
            "Stamp is recorded instantly.",
        ],
        note_text="Complete all booth stamps to unlock the passport completion bonus.",
    ))
    story.append(PageBreak())

    story.append(slide(
        "12_guest_challenges.png",
        "Challenges / Quests",
        "Guests earn bonus raffle entries by completing special event challenges.",
        bullets_list=[
            "Booth visit — automatically completed when stamp is collected",
            "Visit-all — completes once every booth stamp is earned",
            "Activity challenges — e.g. attend a fashion show or workshop",
        ],
    ))
    story.append(PageBreak())

    story.append(slide(
        "13_guest_raffle.png",
        "Raffle Entries",
        "Shows total entries and individual ticket numbers. Entries accumulate in real time as purchases are processed and challenges are completed.",
        bullets_list=[
            "Purchase entries: ₱100 = 1 entry (approved by booth clerk)",
            "Challenge entries: bonus entries for completing quests",
            "Passport entries: bonus for visiting all booths",
        ],
    ))
    story.extend(enter_divider())  # switch to divider ON last guest slide

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 2: STORE / BOOTH CLERK APP
    # ══════════════════════════════════════════════════════════════════════════
    story.extend(section_divider(
        "2", "Store / Booth Clerk App",
        "Scan guest QR codes, record purchase amounts, and manage raffle entry issuance."
    ))

    story.append(slide(
        "04_store_login.png",
        "Store Login",
        "Each booth clerk logs in with their store-specific passcode provided by the event coordinator before the event.",
        steps_list=[
            "Open the app link and tap 'Store login' on the landing page.",
            "Enter the store passcode (provided by the event team).",
            "You're taken directly to the scan screen.",
        ],
        note_text="Each booth has a unique passcode. Do not share with guests.",
    ))
    story.append(PageBreak())

    story.append(slide(
        "15_store_scan.png",
        "Scan Guest & Issue Raffle Entries",
        "The main screen used throughout the event. Scan the guest QR, enter the amount, photograph the receipt, and issue entries — under 30 seconds.",
        steps_list=[
            "Guest shows their QR code (on their Ticket screen).",
            "Tap Camera to scan or 'Enter code' to type manually.",
            "Enter the purchase amount and take a receipt photo.",
            "Tap 'Issue entries' to confirm.",
        ],
        note_text="Amounts over the ₱5,000 daily cap become override requests for admin approval.",
    ))
    story.append(PageBreak())

    story.append(slide(
        "16_store_history.png",
        "Transaction History",
        "View all transactions processed by this booth today.",
        bullets_list=[
            "Approved — entries were issued immediately",
            "Pending override — amount exceeded cap, waiting for admin",
            "Denied — admin rejected the request",
        ],
    ))
    story.append(PageBreak())

    story.append(slide(
        "18_store_passport_qr.png",
        "Booth QR Code",
        "Display this screen so guests can scan it to collect their passport stamp for your booth. Keep it visible throughout the event.",
        bullets_list=[
            "Guest opens app → Passport → tap scan icon",
            "Points camera at this QR code",
            "Stamp is added to their passport automatically",
        ],
        note_text="Leave this screen on-screen and facing outward toward guests.",
    ))
    story.extend(enter_divider())  # switch to divider ON last store slide

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 3: ADMIN APP
    # ══════════════════════════════════════════════════════════════════════════
    story.extend(section_divider(
        "3", "Admin App",
        "Monitor live metrics, approve overrides, manage guests, and run the raffle draw."
    ))

    story.append(slide(
        "05_admin_login.png",
        "Admin Login",
        "Admins log in with their name and the shared admin passcode. Multiple admins can be active simultaneously on different devices.",
        steps_list=[
            "Tap 'Admin login' at the bottom of the landing page.",
            "Select your name from the dropdown.",
            "Enter the admin passcode and tap Sign in.",
        ],
    ))
    story.append(PageBreak())

    story.append(slide(
        "19_admin_dashboard.png",
        "Live Dashboard",
        "Real-time overview of event performance. The Pending Overrides card turns red when action is needed.",
        bullets_list=[
            "Registered Guests — total signups",
            "Raffle Entries — all entries issued so far",
            "Approved Sales — total peso value processed",
            "Pending Overrides — tap to review immediately",
            "Top Stores by Revenue — live leaderboard",
        ],
        crop=0.88,
    ))
    story.append(PageBreak())

    story.append(slide(
        "21_admin_overrides.png",
        "Override Approvals",
        "Purchases over the daily cap appear here as Pending. Review the receipt photo and clerk note, then approve or deny.",
        steps_list=[
            "Tap a pending override to open the detail view.",
            "Review the receipt photo and clerk note.",
            "Tap Approve to issue entries, or Deny to reject.",
        ],
        note_text="The system is race-condition safe — if two admins tap Approve simultaneously, only one succeeds.",
    ))
    story.append(PageBreak())

    story.append(slide(
        "20_admin_guests.png",
        "Guest Management",
        "View all registered guests with name, email, entry count, and access code. Use this to help a guest who's locked out.",
        bullets_list=[
            "Search by name or email",
            "Copy access code to share with the guest",
            "See how many entries each guest has",
        ],
        crop=0.85,
    ))
    story.append(PageBreak())

    story.append(slide(
        "24_admin_draw.png",
        "Raffle Draw",
        "The MC uses this screen to draw winners one prize at a time. Each tap selects a random ticket from all eligible entries.",
        steps_list=[
            "Go to Admin → Draw.",
            "Tap 'Draw winner' for the current prize.",
            "Announce the winning guest's name and ticket number.",
            "Proceed to the next prize.",
        ],
        note_text="Winners are recorded permanently. A prize cannot be re-drawn once a winner is confirmed.",
    ))
    story.extend(enter_divider())  # switch to divider ON last admin slide

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 4: QUICK REFERENCE
    # ══════════════════════════════════════════════════════════════════════════
    story.extend(section_divider(
        "4", "Quick Reference",
        "Key rules and FAQs for event day."
    ))

    # Rules table slide
    story.append(Paragraph("Event Rules at a Glance", STYLES["slide_title"]))
    story.append(Spacer(1, 4))
    rules = [
        ["Rule", "Detail"],
        ["Raffle rate",      "₱100 spent = 1 raffle entry"],
        ["Daily cap",        "₱5,000 per guest per booth, per day — resets at midnight"],
        ["Over-cap",         "Automatic override request created → admin must approve before entries are issued"],
        ["Passport stamp",   "1 per booth; guest scans the store's Booth QR with their phone camera"],
        ["Passport reward",  "Complete all stamps = bonus raffle entries + surprise gift"],
        ["Duplicate submit", "Idempotent — double-tapping the Submit button is safe"],
        ["Event days",       "Day 1: June 6  ·  Day 2: June 7"],
    ]
    t = Table(rules, colWidths=[48*mm, SW - MARGIN_X*2 - 48*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  PLUM),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  10),
        ("FONTNAME",      (0, 1), (0, -1),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 1), (-1, -1), 10),
        ("FONTNAME",      (1, 1), (1, -1),  "Helvetica"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, CREAM]),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("GRID",          (0, 0), (-1, -1), 0.3, colors.HexColor("#d0c8d0")),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t)
    story.append(PageBreak())

    # FAQ slide
    story.append(Paragraph("Common Questions", STYLES["slide_title"]))
    story.append(Spacer(1, 4))
    faqs = [
        ("Guest lost their access code?",
         "Admin → Guests → search by name or email → share the access code verbally."),
        ("Clerk submitted wrong amount?",
         "Contact the coordinator to void it in the Supabase dashboard — entries cannot be reversed in-app."),
        ("Camera won't open on guest's phone?",
         "Guest taps 'Enter code' on the Scan screen and types the QR value manually."),
        ("Purchase stuck as Pending Override?",
         "Admin → Overrides → tap the request → Approve or Deny."),
        ("Raffle draw shows no eligible entries?",
         "All transactions may still be pending overrides. Process overrides first, then retry."),
    ]
    for q, a in faqs:
        story.append(Paragraph(f"<b>Q: {q}</b>", STYLES["slide_body"]))
        story.append(Paragraph(f"A: {a}", ParagraphStyle("faq_a", fontName="Helvetica",
            fontSize=10.5, textColor=MUTED, leading=14, leftIndent=12, spaceAfter=8)))

    doc.build(story)
    print(f"Presentation PDF written → {PDF_PATH}")


if __name__ == "__main__":
    build()
