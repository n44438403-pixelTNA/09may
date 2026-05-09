import assert from 'node:assert';
import { getISTDate, getISTDateString } from './dateUtils.ts';

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

const OriginalDate = global.Date;

/**
 * Mocks the global Date constructor to simulate a specific system time.
 */
function mockSystemTime(isoString: string) {
    // @ts-ignore
    global.Date = class extends OriginalDate {
        constructor(arg?: any) {
            if (arg === undefined) {
                return new OriginalDate(isoString);
            }
            return new OriginalDate(arg);
        }
        static now() {
            return new OriginalDate(isoString).getTime();
        }
    } as any;
}

function restoreTime() {
    global.Date = OriginalDate;
}

test('getISTDate returns correct IST time (Scenario 1: Same Day)', () => {
    // 2024-03-28 02:00 UTC -> 2024-03-28 07:30 IST
    mockSystemTime('2024-03-28T02:00:00Z');
    try {
        const istDate = getISTDate();
        // Since we are in a UTC environment, new Date("3/28/2024, 7:30:00 AM")
        // will result in a Date object at 07:30 UTC.
        assert.strictEqual(istDate.getUTCHours(), 7, 'Hours should be 7');
        assert.strictEqual(istDate.getUTCMinutes(), 30, 'Minutes should be 30');
        assert.strictEqual(istDate.getUTCDate(), 28, 'Date should be 28');
    } finally {
        restoreTime();
    }
});

test('getISTDate returns correct IST time (Scenario 2: Next Day transition)', () => {
    // 2024-03-28 22:00 UTC -> 2024-03-29 03:30 IST
    mockSystemTime('2024-03-28T22:00:00Z');
    try {
        const istDate = getISTDate();
        assert.strictEqual(istDate.getUTCHours(), 3, 'Hours should be 3');
        assert.strictEqual(istDate.getUTCMinutes(), 30, 'Minutes should be 30');
        assert.strictEqual(istDate.getUTCDate(), 29, 'Date should be 29 (next day)');
        assert.strictEqual(istDate.getUTCMonth(), 2, 'Month should be 2 (March)');
    } finally {
        restoreTime();
    }
});

test('getISTDateString returns correct date string', () => {
    // 2024-03-28 22:00 UTC -> 2024-03-29 03:30 IST
    mockSystemTime('2024-03-28T22:00:00Z');
    try {
        const istDateString = getISTDateString();
        // Expected format: "Fri Mar 29 2024" (or similar depending on platform, but should contain date parts)
        assert.ok(istDateString.includes('Mar 29 2024'), `Expected string to include "Mar 29 2024", got "${istDateString}"`);
    } finally {
        restoreTime();
    }
});

test('getISTDate returns a valid Date object', () => {
    const istDate = getISTDate();
    assert.ok(istDate instanceof Date);
    assert.ok(!isNaN(istDate.getTime()));
});
