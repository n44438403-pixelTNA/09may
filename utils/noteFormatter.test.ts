import assert from 'node:assert';
import { findRelevantNote } from './noteFormatter.ts';

const mockNotes = [
    { topic: 'Ohm\'s Law', id: 1 },
    { topic: 'Newton\'s Second Law of Motion', id: 2 },
    { topic: 'Photosynthesis in Plants', id: 3 },
    { topic: 'Atomic Structure', id: 4 },
];

// Helper to run tests
function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (error) {
        console.error(`❌ ${name}`);
        console.error(error);
        process.exit(1);
    }
}

test('findRelevantNote returns null for invalid inputs', () => {
    assert.strictEqual(findRelevantNote(null as any, 'Ohm'), null);
    assert.strictEqual(findRelevantNote(undefined as any, 'Ohm'), null);
    assert.strictEqual(findRelevantNote([], 'Ohm'), null);
    assert.strictEqual(findRelevantNote({} as any, 'Ohm'), null);
});

test('findRelevantNote handles exact match (case insensitive and trimmed)', () => {
    const result = findRelevantNote(mockNotes, '  ohm\'s law  ');
    assert.ok(result);
    assert.strictEqual(result.id, 1);

    const resultLower = findRelevantNote(mockNotes, 'ohm\'s law');
    assert.ok(resultLower);
    assert.strictEqual(resultLower.id, 1);
});

test('findRelevantNote handles substring match (Search in Note Topic)', () => {
    // 'Newton' matches 'Newton\'s Second Law of Motion'
    const result = findRelevantNote(mockNotes, 'Newton');
    assert.ok(result);
    assert.strictEqual(result.id, 2);
});

test('findRelevantNote handles substring match reverse (Note Topic in Search)', () => {
    // 'Ohm\'s Law derivation for beginners' contains 'Ohm\'s Law'
    const result = findRelevantNote(mockNotes, 'Ohm\'s Law derivation for beginners');
    assert.ok(result);
    assert.strictEqual(result.id, 1);
});

test('findRelevantNote handles token overlap (>= 50% match)', () => {
    // Case 1: 2/3 matches (Threshold 1)
    // Search tokens: ['atomic', 'structure', 'basics'] (length 3)
    // 'Atomic Structure' matches 'atomic' and 'structure'
    const result = findRelevantNote(mockNotes, 'atomic structure basics');
    assert.ok(result);
    assert.strictEqual(result.id, 4);

    // Case 2: 1/3 matches (Threshold 1) - Specifically testing the >= threshold
    // Search tokens: ['atomic', 'basics', 'physics'] (length 3)
    // 'Atomic Structure' matches 'atomic'
    // This does NOT match via substring because "atomic structure" is not in "atomic basics physics"
    const result2 = findRelevantNote(mockNotes, 'atomic basics physics');
    assert.ok(result2, 'Should match "Atomic Structure" via token overlap');
    assert.strictEqual(result2.id, 4);
});

test('findRelevantNote ignores short tokens (<= 2 chars)', () => {
    // 'in' and 'of' should be ignored
    // Search tokens: ['Plants'] (length 1)
    const result = findRelevantNote(mockNotes, 'in Plants');
    assert.ok(result);
    assert.strictEqual(result.id, 3);
});

test('findRelevantNote returns null when no match found', () => {
    const result = findRelevantNote(mockNotes, 'Calculus');
    assert.strictEqual(result, null);
});

test('findRelevantNote handles notes with missing topic field', () => {
    const incompleteNotes = [{ id: 99 }];
    const result = findRelevantNote(incompleteNotes as any, 'Anything');
    assert.strictEqual(result, null);
});
