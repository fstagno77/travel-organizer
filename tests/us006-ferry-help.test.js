/**
 * US-006: Sezione Help — categoria Traghetti
 * Tests per la categoria 'traghetti' in helpPage.js e gli articoli in helpDetailPage.js
 */

const fs = require('fs');
const path = require('path');

// ── Caricamento moduli ────────────────────────────────────────────────────────

function loadModule(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const win = {};
  const doc = { getElementById: () => null };
  new Function('window', 'document', code)(win, doc);
  return win;
}

const helpPageWin = loadModule(path.join(__dirname, '../js/helpPage.js'));
const helpDetailWin = loadModule(path.join(__dirname, '../js/helpDetailPage.js'));

const helpPage = helpPageWin.helpPage;
const helpDetailPage = helpDetailWin.helpDetailPage;

// ── helpPage.js ───────────────────────────────────────────────────────────────

describe('helpPage.js — categoria traghetti', () => {
  test('CATEGORIES contiene oggetto con id:"traghetti"', () => {
    const cat = helpPage.CATEGORIES.find(c => c.id === 'traghetti');
    expect(cat).toBeDefined();
  });

  test('colore categoria traghetti è #0369a1', () => {
    const cat = helpPage.CATEGORIES.find(c => c.id === 'traghetti');
    expect(cat.color).toBe('#0369a1');
  });

  test('titleIt è "Traghetti e Navi"', () => {
    const cat = helpPage.CATEGORIES.find(c => c.id === 'traghetti');
    expect(cat.titleIt).toBe('Traghetti e Navi');
  });

  test('titleEn è "Ferries & Ships"', () => {
    const cat = helpPage.CATEGORIES.find(c => c.id === 'traghetti');
    expect(cat.titleEn).toBe('Ferries & Ships');
  });

  test('gradient definito e non vuoto', () => {
    const cat = helpPage.CATEGORIES.find(c => c.id === 'traghetti');
    expect(cat.gradient).toBeTruthy();
    expect(cat.gradient.length).toBeGreaterThan(5);
  });

  test('icon definita e contiene SVG', () => {
    const cat = helpPage.CATEGORIES.find(c => c.id === 'traghetti');
    expect(cat.icon).toBeTruthy();
    expect(cat.icon).toContain('<svg');
  });

  test('descIt definita e non vuota', () => {
    const cat = helpPage.CATEGORIES.find(c => c.id === 'traghetti');
    expect(cat.descIt).toBeTruthy();
  });

  test('descEn definita e non vuota', () => {
    const cat = helpPage.CATEGORIES.find(c => c.id === 'traghetti');
    expect(cat.descEn).toBeTruthy();
  });
});

// ── helpDetailPage.js ─────────────────────────────────────────────────────────

describe('helpDetailPage.js — articoli traghetti', () => {
  test('CONTENT contiene sezione "traghetti"', () => {
    expect(helpDetailPage.CONTENT['traghetti']).toBeDefined();
  });

  test('sezione "traghetti" ha articoli in italiano', () => {
    const it = helpDetailPage.CONTENT['traghetti'].it;
    expect(it).toBeDefined();
    expect(it.articles).toBeDefined();
    expect(Array.isArray(it.articles)).toBe(true);
  });

  test('almeno 4 articoli in italiano', () => {
    const articles = helpDetailPage.CONTENT['traghetti'].it.articles;
    expect(articles.length).toBeGreaterThanOrEqual(4);
  });

  test('ogni articolo IT ha titleIt non vuoto', () => {
    const articles = helpDetailPage.CONTENT['traghetti'].it.articles;
    articles.forEach(a => {
      expect(a.title).toBeTruthy();
      expect(a.title.trim()).not.toBe('');
    });
  });

  test('sezione "traghetti" ha articoli in inglese', () => {
    const en = helpDetailPage.CONTENT['traghetti'].en;
    expect(en).toBeDefined();
    expect(en.articles).toBeDefined();
    expect(Array.isArray(en.articles)).toBe(true);
  });

  test('almeno 4 articoli in inglese', () => {
    const articles = helpDetailPage.CONTENT['traghetti'].en.articles;
    expect(articles.length).toBeGreaterThanOrEqual(4);
  });

  test('ogni articolo EN ha title non vuoto', () => {
    const articles = helpDetailPage.CONTENT['traghetti'].en.articles;
    articles.forEach(a => {
      expect(a.title).toBeTruthy();
      expect(a.title.trim()).not.toBe('');
    });
  });

  test('articolo "come caricare ricevuta traghetto" presente in IT', () => {
    const articles = helpDetailPage.CONTENT['traghetti'].it.articles;
    const found = articles.find(a => a.id === 'caricare-ricevuta-traghetto');
    expect(found).toBeDefined();
  });

  test('articolo "smart parser beta" presente in IT', () => {
    const articles = helpDetailPage.CONTENT['traghetti'].it.articles;
    const found = articles.find(a => a.id === 'smartparse-beta-traghetti');
    expect(found).toBeDefined();
  });

  test('articolo "veicoli a bordo" presente in IT', () => {
    const articles = helpDetailPage.CONTENT['traghetti'].it.articles;
    const found = articles.find(a => a.id === 'veicoli-a-bordo');
    expect(found).toBeDefined();
  });

  test('articolo "compagnia non riconosciuta" presente in IT', () => {
    const articles = helpDetailPage.CONTENT['traghetti'].it.articles;
    const found = articles.find(a => a.id === 'compagnia-non-riconosciuta');
    expect(found).toBeDefined();
  });

  test('colore categoria in helpPage (#0369a1) coerente con activityCategories', () => {
    // Verifica la coerenza del colore leggendo activityCategories.js
    const catCode = fs.readFileSync(path.join(__dirname, '../js/activityCategories.js'), 'utf8');
    expect(catCode).toContain('#0369a1');
    const cat = helpPage.CATEGORIES.find(c => c.id === 'traghetti');
    expect(cat.color).toBe('#0369a1');
  });

  test('ogni articolo IT ha steps non vuoti', () => {
    const articles = helpDetailPage.CONTENT['traghetti'].it.articles;
    articles.forEach(a => {
      expect(Array.isArray(a.steps)).toBe(true);
      expect(a.steps.length).toBeGreaterThan(0);
    });
  });

  test('ogni articolo EN ha steps non vuoti', () => {
    const articles = helpDetailPage.CONTENT['traghetti'].en.articles;
    articles.forEach(a => {
      expect(Array.isArray(a.steps)).toBe(true);
      expect(a.steps.length).toBeGreaterThan(0);
    });
  });
});
