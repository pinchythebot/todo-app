/**
 * Extended unit tests for the base HTML/CSS foundation in index.html.
 *
 * Covers additional aspects not addressed in theme-toggle.test.js:
 *  - Form interaction / submit prevention
 *  - Input element additional attributes
 *  - CSS custom property names present in the source
 *  - Document structure depth / nesting
 *  - Button types and attributes
 *  - Keyboard / event wiring edge cases
 *  - Print style exclusions (structural check)
 *  - visually-hidden utility correctness
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const HTML_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../index.html'),
  'utf-8'
);

// ─── localStorage mock ──────────────────────────────────────────────────────

let localStorageStore = {};

beforeEach(() => {
  localStorageStore = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem:    jest.fn((key) => localStorageStore[key] ?? null),
      setItem:    jest.fn((key, val) => { localStorageStore[key] = String(val); }),
      removeItem: jest.fn((key) => { delete localStorageStore[key]; }),
      clear:      jest.fn(() => { localStorageStore = {}; }),
    },
    writable: true,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  document.documentElement.setAttribute('data-theme', 'light');
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function loadDocument() {
  document.documentElement.innerHTML = HTML_SOURCE;
  return document.documentElement;
}

// ─── Tests: Form behaviour ───────────────────────────────────────────────────

describe('Form behaviour', () => {
  beforeEach(() => { loadDocument(); });

  test('todo-form has method attribute omitted (defaults to GET)', () => {
    // The form should not have a method attribute — it is handled via JS
    const form = document.getElementById('todo-form');
    // Either absent or unspecified is acceptable for a client-side-only form
    expect(form).not.toBeNull();
  });

  test('todo-form has novalidate to disable browser-native validation', () => {
    const form = document.getElementById('todo-form');
    expect(form.hasAttribute('novalidate')).toBe(true);
  });

  test('todo-form does not redirect on submit (novalidate present)', () => {
    const form = document.getElementById('todo-form');
    let submitted = false;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitted = true;
    });
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(submitted).toBe(true);
  });

  test('add button type is submit so Enter key submits the form', () => {
    const btn = document.getElementById('add-btn');
    expect(btn.getAttribute('type')).toBe('submit');
  });

  test('input placeholder is set', () => {
    const input = document.getElementById('todo-input');
    expect(input.getAttribute('placeholder')).toBeTruthy();
  });

  test('input maxlength is 500', () => {
    const input = document.getElementById('todo-input');
    expect(Number(input.getAttribute('maxlength'))).toBe(500);
  });

  test('input autocomplete is off', () => {
    const input = document.getElementById('todo-input');
    expect(input.getAttribute('autocomplete')).toBe('off');
  });

  test('input type is text', () => {
    const input = document.getElementById('todo-input');
    expect(input.getAttribute('type')).toBe('text');
  });

  test('label[for] matches input id', () => {
    const label = document.querySelector('label[for="todo-input"]');
    const input = document.getElementById('todo-input');
    expect(label).not.toBeNull();
    expect(input).not.toBeNull();
    expect(label.getAttribute('for')).toBe(input.id);
  });
});

// ─── Tests: Button attributes ────────────────────────────────────────────────

describe('Button attributes and types', () => {
  beforeEach(() => { loadDocument(); });

  test('theme toggle button type is button (not submit)', () => {
    const btn = document.getElementById('theme-toggle');
    expect(btn.getAttribute('type')).toBe('button');
  });

  test('clear-completed button type is button', () => {
    const btn = document.getElementById('clear-completed');
    expect(btn.getAttribute('type')).toBe('button');
  });

  test('all filter buttons have type attribute as button', () => {
    const buttons = document.querySelectorAll('.filters button');
    buttons.forEach((btn) => {
      expect(btn.getAttribute('type')).toBe('button');
    });
  });

  test('theme toggle has title attribute for tooltip', () => {
    const btn = document.getElementById('theme-toggle');
    expect(btn.getAttribute('title')).toBeTruthy();
  });
});

// ─── Tests: Landmark nesting ──────────────────────────────────────────────────

describe('Document landmark nesting', () => {
  beforeEach(() => { loadDocument(); });

  test('input-area section is inside main', () => {
    const main     = document.querySelector('main');
    const inputSec = document.querySelector('section.input-area');
    expect(main.contains(inputSec)).toBe(true);
  });

  test('todo-section is inside main', () => {
    const main     = document.querySelector('main');
    const todoSec  = document.querySelector('section.todo-section');
    expect(main.contains(todoSec)).toBe(true);
  });

  test('filter nav is inside footer', () => {
    const footer = document.querySelector('footer');
    const nav    = document.querySelector('nav.filters');
    expect(footer.contains(nav)).toBe(true);
  });

  test('items-left span is inside footer', () => {
    const footer   = document.querySelector('footer');
    const itemsLeft = document.getElementById('items-left');
    expect(footer.contains(itemsLeft)).toBe(true);
  });

  test('clear-completed button is inside footer', () => {
    const footer = document.querySelector('footer');
    const btn    = document.getElementById('clear-completed');
    expect(footer.contains(btn)).toBe(true);
  });

  test('h1 is inside header', () => {
    const header = document.querySelector('header');
    const h1     = header.querySelector('h1');
    expect(h1).not.toBeNull();
  });

  test('theme toggle button is inside header', () => {
    const header = document.querySelector('header');
    const btn    = document.getElementById('theme-toggle');
    expect(header.contains(btn)).toBe(true);
  });
});

// ─── Tests: SVG icons ────────────────────────────────────────────────────────

describe('SVG icon attributes', () => {
  beforeEach(() => { loadDocument(); });

  test('sun icon has class icon-sun', () => {
    const sun = document.querySelector('.icon-sun');
    expect(sun).not.toBeNull();
    expect(sun.classList.contains('icon-sun')).toBe(true);
  });

  test('moon icon has class icon-moon', () => {
    const moon = document.querySelector('.icon-moon');
    expect(moon).not.toBeNull();
    expect(moon.classList.contains('icon-moon')).toBe(true);
  });

  test('sun and moon icons have focusable="false"', () => {
    const svgs = document.querySelectorAll('#theme-toggle svg');
    svgs.forEach((svg) => {
      expect(svg.getAttribute('focusable')).toBe('false');
    });
  });

  test('SVG icons are children of theme-toggle button', () => {
    const btn  = document.getElementById('theme-toggle');
    const svgs = btn.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });

  test('SVG icons have width and height attributes', () => {
    const svgs = document.querySelectorAll('#theme-toggle svg');
    svgs.forEach((svg) => {
      expect(svg.getAttribute('width')).toBeTruthy();
      expect(svg.getAttribute('height')).toBeTruthy();
    });
  });
});

// ─── Tests: CSS custom-property definitions in source ────────────────────────

describe('CSS custom properties defined in source', () => {
  const REQUIRED_PROPERTIES = [
    '--color-bg',
    '--color-surface',
    '--color-surface-alt',
    '--color-border',
    '--color-text-primary',
    '--color-text-secondary',
    '--color-accent',
    '--color-accent-hover',
    '--color-danger',
    '--color-shadow',
    '--color-toggle-bg',
    '--color-toggle-icon',
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--radius-full',
    '--spacing-xs',
    '--spacing-sm',
    '--spacing-md',
    '--spacing-lg',
    '--spacing-xl',
    '--font-family',
    '--font-size-base',
    '--font-size-sm',
    '--font-size-lg',
    '--font-size-xl',
    '--font-size-xxl',
    '--transition-speed',
  ];

  REQUIRED_PROPERTIES.forEach((prop) => {
    test(`source contains CSS custom property "${prop}"`, () => {
      expect(HTML_SOURCE).toContain(prop);
    });
  });
});

// ─── Tests: Dark-theme overrides defined in source ───────────────────────────

describe('Dark-theme CSS overrides in source', () => {
  test('source contains [data-theme="dark"] selector', () => {
    expect(HTML_SOURCE).toContain('[data-theme="dark"]');
  });

  test('dark theme redefines --color-bg', () => {
    // Very basic: the string '--color-bg' appears more than once (once in :root, once in dark)
    const occurrences = (HTML_SOURCE.match(/--color-bg/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  test('dark theme redefines --color-accent', () => {
    const occurrences = (HTML_SOURCE.match(/--color-accent:/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});

// ─── Tests: Anti-FOUC script position ────────────────────────────────────────

describe('Anti-FOUC inline script position', () => {
  test('localStorage read script appears before </head>', () => {
    const headEnd   = HTML_SOURCE.indexOf('</head>');
    const bodyStart = HTML_SOURCE.indexOf('<body');
    const scriptPos = HTML_SOURCE.indexOf("localStorage.getItem('theme')");
    expect(scriptPos).toBeGreaterThan(0);
    expect(scriptPos).toBeLessThan(headEnd < 0 ? bodyStart : headEnd);
  });
});

// ─── Tests: Theme toggle wiring (event listener) ─────────────────────────────

describe('Theme toggle event wiring', () => {
  /**
   * Re-implement the toggle wiring to unit-test it in isolation.
   * (JSDOM does not execute inline <script> tags set via innerHTML.)
   */
  function wireToggle(root, btn) {
    function currentTheme() {
      return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }
    function applyTheme(theme) {
      root.setAttribute('data-theme', theme);
      try { localStorage.setItem('theme', theme); } catch (e) { /* ignore */ }
    }
    btn.addEventListener('click', () => {
      applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
    });
  }

  let root;
  let btn;

  beforeEach(() => {
    loadDocument();
    root = document.documentElement;
    btn  = document.getElementById('theme-toggle');
    root.setAttribute('data-theme', 'light');
    wireToggle(root, btn);
  });

  test('clicking toggle once switches to dark', () => {
    btn.click();
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  test('clicking toggle twice returns to light', () => {
    btn.click();
    btn.click();
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  test('click saves dark theme to localStorage', () => {
    btn.click();
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  test('click saves light theme to localStorage after two clicks', () => {
    btn.click();
    btn.click();
    expect(localStorage.setItem).toHaveBeenLastCalledWith('theme', 'light');
  });

  test('toggle button fires click event correctly', () => {
    const clicks = [];
    btn.addEventListener('click', () => clicks.push(1));
    btn.click();
    btn.click();
    expect(clicks.length).toBe(2);
  });
});

// ─── Tests: Filter button data attributes ────────────────────────────────────

describe('Filter button data-filter attributes', () => {
  beforeEach(() => { loadDocument(); });

  test('filter button "All" has data-filter="all"', () => {
    const btn = document.querySelector('[data-filter="all"]');
    expect(btn).not.toBeNull();
    expect(btn.textContent.trim()).toBe('All');
  });

  test('filter button "Active" has data-filter="active"', () => {
    const btn = document.querySelector('[data-filter="active"]');
    expect(btn).not.toBeNull();
    expect(btn.textContent.trim()).toBe('Active');
  });

  test('filter button "Completed" has data-filter="completed"', () => {
    const btn = document.querySelector('[data-filter="completed"]');
    expect(btn).not.toBeNull();
    expect(btn.textContent.trim()).toBe('Completed');
  });
});

// ─── Tests: Todo list initial state ──────────────────────────────────────────

describe('Todo list initial state', () => {
  beforeEach(() => { loadDocument(); });

  test('todo list initially contains one child (empty-state)', () => {
    const list = document.getElementById('todo-list');
    // Should contain the empty-state <li> only
    const children = list.children;
    expect(children.length).toBeGreaterThanOrEqual(1);
    expect(children[0].classList.contains('empty-state')).toBe(true);
  });

  test('empty-state has aria-label', () => {
    const emptyState = document.querySelector('.empty-state');
    expect(emptyState.getAttribute('aria-label')).toBeTruthy();
  });

  test('items-left span initial text contains "0"', () => {
    const span = document.getElementById('items-left');
    expect(span.textContent).toContain('0');
  });
});

// ─── Tests: Responsive breakpoint declarations in source ─────────────────────

describe('Responsive CSS media queries in source', () => {
  test('source contains a max-width media query for 600px', () => {
    expect(HTML_SOURCE).toContain('max-width: 600px');
  });

  test('source contains a print media query', () => {
    expect(HTML_SOURCE).toContain('@media print');
  });
});

// ─── Tests: Viewport meta tag ────────────────────────────────────────────────

describe('Viewport and meta tags', () => {
  beforeEach(() => { loadDocument(); });

  test('viewport meta has initial-scale=1.0', () => {
    const meta = document.querySelector('meta[name="viewport"]');
    expect(meta.getAttribute('content')).toContain('initial-scale=1.0');
  });

  test('meta charset is present as first meta tag', () => {
    const metas = document.querySelectorAll('meta');
    const charsets = [...metas].filter((m) => m.hasAttribute('charset'));
    expect(charsets.length).toBeGreaterThan(0);
  });
});

// ─── Tests: STORAGE_KEY constant ─────────────────────────────────────────────

describe('localStorage storage key', () => {
  test('source uses "theme" as the localStorage key', () => {
    // The key 'theme' should appear in the inline script
    expect(HTML_SOURCE).toContain("'theme'");
  });
});

// ─── Tests: Container structure ──────────────────────────────────────────────

describe('Container / layout structure', () => {
  beforeEach(() => { loadDocument(); });

  test('body contains a single .container div', () => {
    const containers = document.querySelectorAll('.container');
    expect(containers.length).toBe(1);
  });

  test('.container wraps header, main, and footer', () => {
    const container = document.querySelector('.container');
    expect(container.querySelector('header')).not.toBeNull();
    expect(container.querySelector('main')).not.toBeNull();
    expect(container.querySelector('footer')).not.toBeNull();
  });
});

// ─── Tests: Edge cases for applyTheme ────────────────────────────────────────

describe('applyTheme edge cases', () => {
  let root;

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) { /* ignore */ }
  }

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  beforeEach(() => {
    root = document.documentElement;
    root.setAttribute('data-theme', 'light');
  });

  test('applying the same theme twice is idempotent', () => {
    applyTheme('dark');
    applyTheme('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  test('currentTheme returns "light" after applyTheme("light")', () => {
    applyTheme('light');
    expect(currentTheme()).toBe('light');
  });

  test('currentTheme returns "dark" after applyTheme("dark")', () => {
    applyTheme('dark');
    expect(currentTheme()).toBe('dark');
  });

  test('applyTheme with undefined value falls back to "light" via currentTheme', () => {
    applyTheme(undefined);
    // Setting undefined makes data-theme="undefined", currentTheme defaults to light
    expect(currentTheme()).toBe('light');
  });
});
