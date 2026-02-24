"""
Playwright E2E tests for the base HTML/CSS foundation feature (index.html).

Tests cover:
- Page loading and structure
- Light / dark theme toggle
- Theme persistence via localStorage
- Accessibility landmarks and attributes
- Responsive footer and filter buttons
- Keyboard accessibility
"""

import pytest
import subprocess
import threading
import time
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

from playwright.sync_api import sync_playwright, expect


# ─── Local file server ──────────────────────────────────────────────────────

REPO_DIR = Path(__file__).parent.parent.parent
PORT = 9876


class _SilentHandler(SimpleHTTPRequestHandler):
    """Suppress request logs to keep test output clean."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_DIR), **kwargs)

    def log_message(self, *args):  # noqa: D102
        pass


@pytest.fixture(scope="session")
def http_server():
    """Start a simple HTTP server for the duration of the test session."""
    server = HTTPServer(("", PORT), _SilentHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://localhost:{PORT}"
    server.shutdown()


@pytest.fixture(scope="session")
def browser_context(http_server):
    """Launch a single browser process for the session."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        yield context, http_server
        browser.close()


@pytest.fixture()
def page(browser_context):
    """Provide a fresh page (with cleared storage) for each test."""
    context, base_url = browser_context
    pg = context.new_page()
    # Clear localStorage between tests
    pg.goto(f"{base_url}/index.html")
    pg.evaluate("localStorage.clear()")
    pg.goto(f"{base_url}/index.html")
    yield pg, base_url
    pg.close()


# ─── Helpers ────────────────────────────────────────────────────────────────

def goto(pg, base_url, clear_storage=True):
    """Navigate to index.html, optionally clearing localStorage first."""
    pg.goto(f"{base_url}/index.html")
    if clear_storage:
        pg.evaluate("localStorage.clear()")
    pg.reload()


# ─── Tests: Page loading ─────────────────────────────────────────────────────

class TestPageLoading:
    def test_page_title(self, page):
        pg, base_url = page
        assert pg.title() == "My Todos"

    def test_no_console_errors(self, page):
        """Page must load without JavaScript errors."""
        pg, base_url = page
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        goto(pg, base_url)
        # Wait briefly for any deferred scripts
        pg.wait_for_timeout(300)
        assert errors == [], f"Console errors detected: {errors}"

    def test_page_responds_with_200(self, page):
        pg, base_url = page
        response = pg.goto(f"{base_url}/index.html")
        assert response.status == 200


# ─── Tests: HTML structure in browser ────────────────────────────────────────

class TestHTMLStructure:
    def test_h1_text(self, page):
        pg, _ = page
        h1 = pg.locator("h1")
        expect(h1).to_have_text("My Todos")

    def test_theme_toggle_button_visible(self, page):
        pg, _ = page
        btn = pg.locator("#theme-toggle")
        expect(btn).to_be_visible()

    def test_todo_input_visible(self, page):
        pg, _ = page
        inp = pg.locator("#todo-input")
        expect(inp).to_be_visible()

    def test_add_button_visible(self, page):
        pg, _ = page
        btn = pg.locator("#add-btn")
        expect(btn).to_be_visible()

    def test_todo_list_present(self, page):
        pg, _ = page
        lst = pg.locator("#todo-list")
        expect(lst).to_be_attached()

    def test_empty_state_visible_initially(self, page):
        pg, _ = page
        empty = pg.locator(".empty-state")
        expect(empty).to_be_visible()

    def test_items_left_span_present(self, page):
        pg, _ = page
        span = pg.locator("#items-left")
        expect(span).to_be_attached()

    def test_filter_buttons_count(self, page):
        pg, _ = page
        filters = pg.locator(".filters button")
        expect(filters).to_have_count(3)

    def test_clear_completed_button_present(self, page):
        pg, _ = page
        btn = pg.locator("#clear-completed")
        expect(btn).to_be_attached()

    def test_main_landmark_present(self, page):
        pg, _ = page
        main = pg.locator("main")
        expect(main).to_be_attached()

    def test_header_landmark_present(self, page):
        pg, _ = page
        header = pg.locator("header")
        expect(header).to_be_attached()

    def test_footer_landmark_present(self, page):
        pg, _ = page
        footer = pg.locator("footer")
        expect(footer).to_be_attached()


# ─── Tests: Default theme ────────────────────────────────────────────────────

class TestDefaultTheme:
    def test_default_theme_is_light(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        theme = pg.evaluate("document.documentElement.getAttribute('data-theme')")
        assert theme == "light"

    def test_moon_icon_visible_in_light_mode(self, page):
        """In light mode the moon icon should be visible (clicking switches to dark)."""
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        moon = pg.locator(".icon-moon")
        # In light mode the moon is shown (display: block via CSS)
        assert pg.evaluate(
            "getComputedStyle(document.querySelector('.icon-moon')).display"
        ) == "block"

    def test_sun_icon_hidden_in_light_mode(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        assert pg.evaluate(
            "getComputedStyle(document.querySelector('.icon-sun')).display"
        ) == "none"


# ─── Tests: Theme toggle interaction ────────────────────────────────────────

class TestThemeToggle:
    def test_click_toggles_to_dark(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        pg.locator("#theme-toggle").click()
        theme = pg.evaluate("document.documentElement.getAttribute('data-theme')")
        assert theme == "dark"

    def test_click_twice_returns_to_light(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        pg.locator("#theme-toggle").click()
        pg.locator("#theme-toggle").click()
        theme = pg.evaluate("document.documentElement.getAttribute('data-theme')")
        assert theme == "light"

    def test_dark_mode_sun_icon_visible(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        pg.locator("#theme-toggle").click()
        assert pg.evaluate(
            "getComputedStyle(document.querySelector('.icon-sun')).display"
        ) == "block"

    def test_dark_mode_moon_icon_hidden(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        pg.locator("#theme-toggle").click()
        assert pg.evaluate(
            "getComputedStyle(document.querySelector('.icon-moon')).display"
        ) == "none"

    def test_toggle_saves_dark_to_localstorage(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        pg.locator("#theme-toggle").click()
        saved = pg.evaluate("localStorage.getItem('theme')")
        assert saved == "dark"

    def test_toggle_twice_saves_light_to_localstorage(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        pg.locator("#theme-toggle").click()
        pg.locator("#theme-toggle").click()
        saved = pg.evaluate("localStorage.getItem('theme')")
        assert saved == "light"

    def test_multiple_toggles_cycle_theme(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        btn = pg.locator("#theme-toggle")
        for _ in range(5):
            btn.click()
        # 5 clicks from light → dark (odd → dark)
        theme = pg.evaluate("document.documentElement.getAttribute('data-theme')")
        assert theme == "dark"


# ─── Tests: Theme persistence ────────────────────────────────────────────────

class TestThemePersistence:
    def test_dark_theme_persists_across_reload(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        # Switch to dark
        pg.locator("#theme-toggle").click()
        # Reload the page
        pg.reload()
        theme = pg.evaluate("document.documentElement.getAttribute('data-theme')")
        assert theme == "dark"

    def test_light_theme_persists_after_dark_then_back(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        # Switch to dark then back to light
        pg.locator("#theme-toggle").click()
        pg.locator("#theme-toggle").click()
        pg.reload()
        theme = pg.evaluate("document.documentElement.getAttribute('data-theme')")
        assert theme == "light"

    def test_anti_fouc_applies_dark_before_paint(self, page):
        """
        Simulate a user who previously saved 'dark' in localStorage.
        The anti-FOUC inline script should apply it before page fully loads.
        """
        pg, base_url = page
        # Pre-seed localStorage with dark theme
        pg.goto(f"{base_url}/index.html")
        pg.evaluate("localStorage.setItem('theme', 'dark')")
        pg.goto(f"{base_url}/index.html")
        theme = pg.evaluate("document.documentElement.getAttribute('data-theme')")
        assert theme == "dark"


# ─── Tests: Accessibility ────────────────────────────────────────────────────

class TestAccessibility:
    def test_theme_toggle_has_aria_label(self, page):
        pg, _ = page
        btn = pg.locator("#theme-toggle")
        label = btn.get_attribute("aria-label")
        assert label and len(label) > 0

    def test_todo_input_has_aria_label(self, page):
        pg, _ = page
        inp = pg.locator("#todo-input")
        label = inp.get_attribute("aria-label")
        assert label and len(label) > 0

    def test_filters_nav_has_aria_label(self, page):
        pg, _ = page
        nav = pg.locator("nav.filters")
        label = nav.get_attribute("aria-label")
        assert label and len(label) > 0

    def test_all_filter_default_aria_pressed_true(self, page):
        pg, _ = page
        btn = pg.locator("[data-filter='all']")
        assert btn.get_attribute("aria-pressed") == "true"

    def test_svg_icons_are_aria_hidden(self, page):
        pg, _ = page
        svgs = pg.locator("#theme-toggle svg")
        count = svgs.count()
        assert count == 2
        for i in range(count):
            assert svgs.nth(i).get_attribute("aria-hidden") == "true"

    def test_theme_toggle_keyboard_accessible(self, page):
        """Tab to the toggle button and activate it with Enter."""
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        # Focus the toggle via keyboard
        pg.locator("#theme-toggle").focus()
        pg.keyboard.press("Enter")
        theme = pg.evaluate("document.documentElement.getAttribute('data-theme')")
        assert theme == "dark"

    def test_todo_input_focusable(self, page):
        pg, _ = page
        inp = pg.locator("#todo-input")
        inp.focus()
        assert pg.evaluate("document.activeElement.id") == "todo-input"


# ─── Tests: CSS custom properties ────────────────────────────────────────────

class TestCSSCustomProperties:
    def test_light_theme_background_var_defined(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        value = pg.evaluate(
            "getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()"
        )
        assert value != ""

    def test_dark_theme_background_var_changes_on_toggle(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        light_bg = pg.evaluate(
            "getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()"
        )
        pg.locator("#theme-toggle").click()
        dark_bg = pg.evaluate(
            "getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()"
        )
        assert light_bg != dark_bg, "Background CSS variable should change when switching themes"

    def test_accent_color_var_defined(self, page):
        pg, base_url = page
        goto(pg, base_url, clear_storage=True)
        value = pg.evaluate(
            "getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()"
        )
        assert value != ""

    def test_transition_speed_var_defined(self, page):
        pg, _ = page
        value = pg.evaluate(
            "getComputedStyle(document.documentElement).getPropertyValue('--transition-speed').trim()"
        )
        assert value != ""


# ─── Tests: Responsive behaviour ────────────────────────────────────────────

class TestResponsive:
    def _set_viewport(self, pg, width, height):
        pg.set_viewport_size({"width": width, "height": height})

    def test_page_loads_on_mobile_viewport(self, page):
        pg, base_url = page
        self._set_viewport(pg, 375, 667)
        goto(pg, base_url, clear_storage=True)
        h1 = pg.locator("h1")
        expect(h1).to_be_visible()

    def test_theme_toggle_visible_on_mobile(self, page):
        pg, base_url = page
        self._set_viewport(pg, 375, 667)
        goto(pg, base_url, clear_storage=True)
        btn = pg.locator("#theme-toggle")
        expect(btn).to_be_visible()

    def test_add_button_visible_on_mobile(self, page):
        pg, base_url = page
        self._set_viewport(pg, 375, 667)
        goto(pg, base_url, clear_storage=True)
        btn = pg.locator("#add-btn")
        expect(btn).to_be_visible()

    def test_todo_input_visible_on_mobile(self, page):
        pg, base_url = page
        self._set_viewport(pg, 375, 667)
        goto(pg, base_url, clear_storage=True)
        inp = pg.locator("#todo-input")
        expect(inp).to_be_visible()
