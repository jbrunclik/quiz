const test = require('node:test');
const assert = require('node:assert');

const { normalize, allowedDistance, fuzzyMatch } = require('../web/js/matching.js');

test('normalize lowercases, trims, collapses whitespace and strips diacritics', () => {
    assert.strictEqual(normalize('  Fotosyntéza  '), 'fotosynteza');
    assert.strictEqual(normalize('Krevní   oběh'), 'krevni obeh');
});

test('allowedDistance scales with length', () => {
    assert.strictEqual(allowedDistance(3), 0);   // very short: exact only
    assert.strictEqual(allowedDistance(5), 1);
    assert.strictEqual(allowedDistance(7), 1);
    assert.strictEqual(allowedDistance(10), 2);
    assert.strictEqual(allowedDistance(15), 3);
});

test('exact match ignoring case and diacritics', () => {
    assert.ok(fuzzyMatch('FOTOSYNTÉZA', 'fotosyntéza'));
    assert.ok(fuzzyMatch('fotosynteza', 'fotosyntéza'));
    assert.ok(fuzzyMatch('  fotosyntéza ', 'fotosyntéza'));
});

test('tolerates a typo proportional to length', () => {
    assert.ok(fuzzyMatch('fotosyntéze', 'fotosyntéza'));  // 1 edit, len 11 allows 2
    assert.ok(fuzzyMatch('praga', 'praha'));              // 1 edit, len 5 allows 1
});

test('rejects a single edit on very short answers', () => {
    assert.ok(!fuzzyMatch('les', 'pes'));   // len 3 requires exact
    assert.ok(fuzzyMatch('pes', 'pes'));
});

test('rejects clearly different answers', () => {
    assert.ok(!fuzzyMatch('kočka', 'pes'));
    assert.ok(!fuzzyMatch('vodík', 'kyslík'));
});

test('rejects an empty user answer', () => {
    assert.ok(!fuzzyMatch('', 'pes'));
    assert.ok(!fuzzyMatch('   ', 'fotosyntéza'));
});
