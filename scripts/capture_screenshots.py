"""
Capture screenshots of all FIAD app pages for the onboarding PDF.
Run: python3 scripts/capture_screenshots.py
Requires: playwright + chromium installed
"""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5174"
OUT_DIR = Path(__file__).parent.parent / "screenshots"
OUT_DIR.mkdir(exist_ok=True)

GUEST_AUTH  = json.dumps({"state": {"session": {"role": "guest",  "guestId": "guest_he2f2c49498s"}}, "version": 0})
STORE_AUTH  = json.dumps({"state": {"session": {"role": "store",  "storeId": "store_01_mcatering"}}, "version": 0})
ADMIN_AUTH  = json.dumps({"state": {"session": {"role": "admin",  "adminId": "adm_1"}}, "version": 0})
NO_AUTH     = json.dumps({"state": {"session": {"role": None}}, "version": 0})

VIEWPORT = {"width": 390, "height": 844}  # iPhone 14 Pro

def goto_authed(page, auth_json: str, url: str, wait_ms: int = 2000):
    """Navigate to url with auth injected, then reload so Zustand reads it synchronously."""
    page.goto(BASE_URL)
    page.evaluate(f"localStorage.setItem('fiad.auth', {json.dumps(auth_json)})")
    page.goto(url)
    page.wait_for_timeout(wait_ms)

def shot(page, filename: str, wait_ms: int = 0):
    page.wait_for_timeout(wait_ms)
    page.screenshot(path=str(OUT_DIR / filename), full_page=False)
    print(f"  ✓ {filename}")

def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(viewport=VIEWPORT, device_scale_factor=2)
        page = ctx.new_page()

        # ── PUBLIC ──────────────────────────────────────────────────────────
        print("Public pages…")
        goto_authed(page, NO_AUTH, BASE_URL + "/")
        shot(page, "01_landing.png")

        goto_authed(page, NO_AUTH, BASE_URL + "/app/register")
        shot(page, "02_guest_register.png")

        goto_authed(page, NO_AUTH, BASE_URL + "/app/login")
        shot(page, "03_guest_login.png")

        goto_authed(page, NO_AUTH, BASE_URL + "/store/login")
        shot(page, "04_store_login.png")

        goto_authed(page, NO_AUTH, BASE_URL + "/admin/login")
        shot(page, "05_admin_login.png")

        # ── GUEST ───────────────────────────────────────────────────────────
        print("Guest pages…")
        goto_authed(page, GUEST_AUTH, BASE_URL + "/app/ticket")
        shot(page, "06_guest_ticket.png")

        goto_authed(page, GUEST_AUTH, BASE_URL + "/app/walkthrough")
        shot(page, "07_guest_walkthrough_map.png")

        # Booths tab
        page.locator("button", has_text="Booths").click()
        shot(page, "08_guest_walkthrough_booths.png", wait_ms=800)

        # Promos tab
        page.locator("button", has_text="Promos").click()
        shot(page, "09_guest_walkthrough_promos.png", wait_ms=800)

        # Schedule tab
        page.locator("button", has_text="Schedule").click()
        shot(page, "10_guest_walkthrough_schedule.png", wait_ms=800)

        goto_authed(page, GUEST_AUTH, BASE_URL + "/app/passport")
        shot(page, "11_guest_passport.png")

        goto_authed(page, GUEST_AUTH, BASE_URL + "/app/challenges")
        shot(page, "12_guest_challenges.png")

        goto_authed(page, GUEST_AUTH, BASE_URL + "/app/raffle")
        shot(page, "13_guest_raffle.png")

        goto_authed(page, GUEST_AUTH, BASE_URL + "/app/scan")
        shot(page, "14_guest_scan.png")

        # ── STORE ───────────────────────────────────────────────────────────
        print("Store pages…")
        goto_authed(page, STORE_AUTH, BASE_URL + "/store/scan")
        shot(page, "15_store_scan.png")

        goto_authed(page, STORE_AUTH, BASE_URL + "/store/history")
        shot(page, "16_store_history.png")

        goto_authed(page, STORE_AUTH, BASE_URL + "/store/overrides")
        shot(page, "17_store_overrides.png")

        goto_authed(page, STORE_AUTH, BASE_URL + "/store/passport-qr")
        shot(page, "18_store_passport_qr.png")

        # ── ADMIN ───────────────────────────────────────────────────────────
        print("Admin pages…")
        goto_authed(page, ADMIN_AUTH, BASE_URL + "/admin/dashboard")
        shot(page, "19_admin_dashboard.png")

        goto_authed(page, ADMIN_AUTH, BASE_URL + "/admin/guests")
        shot(page, "20_admin_guests.png")

        goto_authed(page, ADMIN_AUTH, BASE_URL + "/admin/overrides")
        shot(page, "21_admin_overrides.png")

        goto_authed(page, ADMIN_AUTH, BASE_URL + "/admin/transactions")
        shot(page, "22_admin_transactions.png")

        goto_authed(page, ADMIN_AUTH, BASE_URL + "/admin/prizes")
        shot(page, "23_admin_prizes.png")

        goto_authed(page, ADMIN_AUTH, BASE_URL + "/admin/draw")
        shot(page, "24_admin_draw.png")

        goto_authed(page, ADMIN_AUTH, BASE_URL + "/admin/stores")
        shot(page, "25_admin_stores.png")

        browser.close()
        print(f"\nAll screenshots saved to {OUT_DIR}")

if __name__ == "__main__":
    run()
