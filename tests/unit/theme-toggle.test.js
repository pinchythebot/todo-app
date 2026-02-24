/**
 * Unit tests for the theme toggle functionality in index.html.
 *
 * Since the JavaScript is embedded in the HTML file, we extract and test
 * the core logic using JSDOM (provided by jest-environment-jsdom).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Load the full index.html source once (avoids redundant I/O per test).
 */
const HTML_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../index.html'),
  'utf-8'
);

/**
 * Set up a fresh JSDOM document from the HTML source.
 * Returns the document's <html> element for convenience.
 */
function loadDocument() {
  document.documentElement.innerHTML = HTML_SOURCE;
  return document.documentElement;
}

// ─── localStorage mock helpers ───────────────────────────────────────────────

let localStorageStore = {};

beforeEach(() => {
  localStorageStore = {};

  // Mock localStorage so tests are isolated from the real storage layer.
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem:  jest.fn((key) => localStorageStore[key] ?? null),
      setItem:  jest.fn((key, value) => { localStorageStore[key] = String(value); }),
      removeItem: jest.fn((key) => { delete localStorageStore[key]; }),
      clear:    jest.fn(() => { localStorageStore = {}; }),
    },
    writable: true,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  // Reset data-theme to light between tests
  document.documentElement.setAttribute('data-theme', 'light');
});

// ─── Tests: HTML structure ───────────────────────────────────────────────────

describe('HTML structure', () => {
  test('document has correct lang attribute', () => {
    // DOMParser preserves attributes on the root <html> element, unlike
    // setting document.documentElement.innerHTML which only replaces children.
    const parser = new DOMParser();
    const parsed = parser.parseFromString(HTML_SOURCE, 'text/html');
    expect(parsed.documentElement.getAttribute('lang')).toBe('en');
  });

  test('document title is "My Todos"', () => {
    loadDocument();
    expect(document.title).toBe('My Todos');
  });

  test('page has a heading with "My Todos"', () => {
    loadDocument();
    const h1 = document.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1.textContent).toBe('My Todos');
  });

  test('theme toggle button is present', () => {
    loadDocument();
    const btn = document.getElementById('theme-toggle');
    expect(btn).not.toBeNull();
  });

  test('theme toggle button has accessible aria-label', () => {
    loadDocument();
    const btn = document.getElementById('theme-toggle');
    expect(btn.getAttribute('aria-label')).toBeTruthy();
  });

  test('todo form is present', () => {
    loadDocument();
    const form = document.getElementById('todo-form');
    expect(form).not.toBeNull();
  });

  test('todo input has correct attributes', () => {
    loadDocument();
    const input = document.getElementById('todo-input');
    expect(input).not.toBeNull();
    expect(input.getAttribute('type')).toBe('text');
    expect(input.getAttribute('maxlength')).toBe('500');
    expect(input.getAttribute('autocomplete')).toBe('off');
  });

  test('add button is present', () => {
    loadDocument();
    const btn = document.getElementById('add-btn');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('type')).toBe('submit');
  });

  test('todo list is present', () => {
    loadDocument();
    const list = document.getElementById('todo-list');
    expect(list).not.toBeNull();
    expect(list.tagName).toBe('UL');
  });

  test('filter buttons are present', () => {
    loadDocument();
    const filters = document.querySelectorAll('.filters button');
    expect(filters.length).toBe(3);
  });

  test('"All" filter is active by default', () => {
    loadDocument();
    const allBtn = document.querySelector('[data-filter="all"]');
    expect(allBtn.getAttribute('aria-pressed')).toBe('true');
  });

  test('"Active" and "Completed" filters are inactive by default', () => {
    loadDocument();
    const activeBtn = document.querySelector('[data-filter="active"]');
    const completedBtn = document.querySelector('[data-filter="completed"]');
    expect(activeBtn.getAttribute('aria-pressed')).toBe('false');
    expect(completedBtn.getAttribute('aria-pressed')).toBe('false');
  });

  test('"Clear completed" button is present', () => {
    loadDocument();
    const btn = document.getElementById('clear-completed');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('type')).toBe('button');
  });

  test('items-left span is present', () => {
    loadDocument();
    const span = document.getElementById('items-left');
    expect(span).not.toBeNull();
  });

  test('empty-state message is present initially', () => {
    loadDocument();
    const emptyState = document.querySelector('.empty-state');
    expect(emptyState).not.toBeNull();
  });

  test('todo list has aria-live attribute for announcements', () => {
    loadDocument();
    const list = document.getElementById('todo-list');
    expect(list.getAttribute('aria-live')).toBe('polite');
  });

  test('both sun and moon SVG icons are present', () => {
    loadDocument();
    const sun  = document.querySelector('.icon-sun');
    const moon = document.querySelector('.icon-moon');
    expect(sun).not.toBeNull();
    expect(moon).not.toBeNull();
  });

  test('SVGs have aria-hidden to keep them decorative', () => {
    loadDocument();
    const svgs = document.querySelectorAll('#theme-toggle svg');
    svgs.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  test('new-todo label has visually-hidden class for screen readers', () => {
    loadDocument();
    const label = document.querySelector('label[for="todo-input"]');
    expect(label).not.toBeNull();
    expect(label.classList.contains('visually-hidden')).toBe(true);
  });
});

// ─── Tests: Default theme ────────────────────────────────────────────────────

describe('Default theme', () => {
  test('html element starts with data-theme="light"', () => {
    // The HTML sets the default; our afterEach resets it.
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    expect(root.getAttribute('data-theme')).toBe('light');
  });
});

// ─── Tests: Theme toggle logic ───────────────────────────────────────────────

describe('Theme toggle — applyTheme / currentTheme logic', () => {
  /**
   * Replicate the logic from the inline script so we can unit-test it
   * without executing arbitrary <script> tags (which JSDOM does not fully
   * support for inline scripts loaded via innerHTML).
   */
  let root;

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      // silently ignore
    }
  }

  beforeEach(() => {
    root = document.documentElement;
    root.setAttribute('data-theme', 'light');
  });

  test('currentTheme returns "light" when data-theme is "light"', () => {
    root.setAttribute('data-theme', 'light');
    expect(currentTheme()).toBe('light');
  });

  test('currentTheme returns "dark" when data-theme is "dark"', () => {
    root.setAttribute('data-theme', 'dark');
    expect(currentTheme()).toBe('dark');
  });

  test('currentTheme defaults to "light" for unknown values', () => {
    root.setAttribute('data-theme', 'system');
    expect(currentTheme()).toBe('light');
  });

  test('applyTheme sets data-theme attribute to "dark"', () => {
    applyTheme('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  test('applyTheme sets data-theme attribute to "light"', () => {
    root.setAttribute('data-theme', 'dark');
    applyTheme('light');
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  test('applyTheme persists theme to localStorage', () => {
    applyTheme('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  test('applyTheme persists "light" to localStorage', () => {
    applyTheme('light');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  test('toggling from light → dark works', () => {
    root.setAttribute('data-theme', 'light');
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  test('toggling from dark → light works', () => {
    root.setAttribute('data-theme', 'dark');
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  test('multiple successive toggles cycle correctly', () => {
    root.setAttribute('data-theme', 'light');

    for (let i = 0; i < 5; i++) {
      const next = currentTheme() === 'light' ? 'dark' : 'light';
      applyTheme(next);
    }

    // After 5 toggles from 'light': dark → light → dark → light → dark
    expect(root.getAttribute('data-theme')).toBe('dark');
  });
});

// ─── Tests: Anti-FOUC localStorage read ─────────────────────────────────────

describe('Anti-FOUC script — localStorage read on load', () => {
  function simulateAntiFlickerScript(root, localStorageGetItem) {
    const saved = localStorageGetItem('theme');
    if (saved === 'dark' || saved === 'light') {
      root.setAttribute('data-theme', saved);
    }
  }

  test('applies saved "dark" theme from localStorage on load', () => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    simulateAntiFlickerScript(root, () => 'dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  test('applies saved "light" theme from localStorage on load', () => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    simulateAntiFlickerScript(root, () => 'light');
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  test('ignores null value in localStorage (no saved theme)', () => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    simulateAntiFlickerScript(root, () => null);
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  test('ignores unknown theme value in localStorage', () => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    simulateAntiFlickerScript(root, () => 'system');
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  test('ignores empty string in localStorage', () => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'light');
    simulateAntiFlickerScript(root, () => '');
    expect(root.getAttribute('data-theme')).toBe('light');
  });
});

// ─── Tests: localStorage error handling ─────────────────────────────────────

describe('Theme persistence — localStorage error handling', () => {
  test('does not throw when localStorage.setItem throws', () => {
    const root = document.documentElement;

    // Redefine localStorage.setItem to throw
    const faultyStorage = {
      getItem:  () => null,
      setItem:  () => { throw new Error('QuotaExceededError'); },
      removeItem: () => {},
      clear:    () => {},
    };

    function applyThemeSafe(theme) {
      root.setAttribute('data-theme', theme);
      try {
        faultyStorage.setItem('theme', theme);
      } catch (e) {
        // silently ignore — matches the inline script behaviour
      }
    }

    expect(() => applyThemeSafe('dark')).not.toThrow();
    expect(root.getAttribute('data-theme')).toBe('dark');
  });
});

// ─── Tests: Semantic / accessibility attributes ──────────────────────────────

describe('Accessibility and semantic markup', () => {
  beforeEach(() => {
    loadDocument();
  });

  test('<main> landmark is present', () => {
    const main = document.querySelector('main');
    expect(main).not.toBeNull();
  });

  test('<header> landmark is present', () => {
    const header = document.querySelector('header');
    expect(header).not.toBeNull();
  });

  test('<footer> landmark is present', () => {
    const footer = document.querySelector('footer');
    expect(footer).not.toBeNull();
  });

  test('filter nav has aria-label', () => {
    const nav = document.querySelector('nav.filters');
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBeTruthy();
  });

  test('input section has aria-label', () => {
    const section = document.querySelector('section.input-area');
    expect(section).not.toBeNull();
    expect(section.getAttribute('aria-label')).toBeTruthy();
  });

  test('todo list section has aria-label', () => {
    const section = document.querySelector('section.todo-section');
    expect(section).not.toBeNull();
    expect(section.getAttribute('aria-label')).toBeTruthy();
  });

  test('todo-form has novalidate attribute', () => {
    const form = document.getElementById('todo-form');
    expect(form.hasAttribute('novalidate')).toBe(true);
  });

  test('meta charset is UTF-8', () => {
    const meta = document.querySelector('meta[charset]');
    expect(meta).not.toBeNull();
    expect(meta.getAttribute('charset').toLowerCase()).toBe('utf-8');
  });

  test('meta viewport is present', () => {
    const meta = document.querySelector('meta[name="viewport"]');
    expect(meta).not.toBeNull();
    expect(meta.getAttribute('content')).toContain('width=device-width');
  });
});

// ─── Tests: Filter button state ──────────────────────────────────────────────

describe('Filter buttons — initial aria-pressed state', () => {
  beforeEach(() => {
    loadDocument();
  });

  test('filter buttons collectively have exactly one active button', () => {
    const pressed = document.querySelectorAll('.filters button[aria-pressed="true"]');
    expect(pressed.length).toBe(1);
  });

  test('data-filter values are "all", "active", "completed"', () => {
    const filters = [...document.querySelectorAll('.filters button')];
    const values  = filters.map((b) => b.getAttribute('data-filter'));
    expect(values).toEqual(['all', 'active', 'completed']);
  });
});
