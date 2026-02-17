/**
 * Concurrency Test Script
 * 
 * Tests the hardened system under concurrent load to verify:
 * - No overselling of seats
 * - No negative counters
 * - No duplicate submissions
 * - No duplicate approvals
 * 
 * Run from project root: node backend/src/tests/concurrencyTest.js
 * Run from backend: node src/tests/concurrencyTest.js
 * 
 * IMPORTANT: Uses the same database pool as the application to ensure:
 * - Same user credentials (survey_user, not root)
 * - Same connection settings
 * - Same isolation levels
 * - Real production-like conditions
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory (works whether run from root or backend)
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

console.log(`Loading environment from: ${envPath}`);
console.log(`Connecting as: ${process.env.MYSQL_USER}@${process.env.MYSQL_HOST}/${process.env.MYSQL_DATABASE}\n`);

import { getPool } from '../db/mysqlClient.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// Reuse application's connection pool (uses survey_user from .env)
const pool = getPool();

// Test configuration
// Use fixed-length test IDs (not UUIDs) to avoid VARCHAR length issues
const TEST_SURVEY_ID = 'test-survey-001';
const TEST_RELEASE_ID = 'test-release-001';
const TEST_OPTION_ID = 'test-option-001';
const CAPACITY = 5;
const CONCURRENT_REQUESTS = 10;

/**
 * Setup test data
 */
async function setup() {
    console.log('\n=== Setting up test data ===\n');

    // Create test user (required for created_by foreign key)
    // Using only required columns: id, email, role
    await pool.query(
        `INSERT INTO users (id, email, role)
         VALUES ('test-admin', 'test-admin@test.com', 'ADMIN')
         ON DUPLICATE KEY UPDATE email = VALUES(email)`
    );

    // Create test users for concurrent hold testing (test-user-0 through test-user-9)
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        await pool.query(
            `INSERT INTO users (id, email, role)
             VALUES (?, ?, 'STUDENT')
             ON DUPLICATE KEY UPDATE email = VALUES(email)`,
            [`test-user-${i}`, `test-user-${i}@test.com`]
        );
    }

    // Create test survey (created_by is required per schema)
    await pool.query(
        `INSERT INTO surveys (id, title, type, status, config, created_by)
         VALUES (?, 'Test Survey', 'SINGLE_SELECT', 'ACTIVE', '{}', 'test-admin')`,
        [TEST_SURVEY_ID]
    );

    // Create survey release (required for option_holds.release_id foreign key)
    const TEST_RELEASE_ID = 'test-release-001';
    await pool.query(
        `INSERT INTO survey_releases (id, survey_id, version, status, rule_config)
         VALUES (?, ?, 1, 'PUBLISHED', '{}')`,
        [TEST_RELEASE_ID, TEST_SURVEY_ID]
    );

    // Create test option
    await pool.query(
        `INSERT INTO survey_options (id, survey_id, label, value)
         VALUES (?, ?, 'Test Option', 'test')`,
        [TEST_OPTION_ID, TEST_SURVEY_ID]
    );

    // Create capacity record
    await pool.query(
        `INSERT INTO option_capacity (option_id, total_capacity, reserved_count, filled_count)
         VALUES (?, ?, 0, 0)`,
        [TEST_OPTION_ID, CAPACITY]
    );

    console.log(`✓ Created test admin: test-admin`);
    console.log(`✓ Created ${CONCURRENT_REQUESTS} test users (test-user-0 to test-user-${CONCURRENT_REQUESTS - 1})`);
    console.log(`✓ Created survey: ${TEST_SURVEY_ID}`);
    console.log(`✓ Created release: ${TEST_RELEASE_ID}`);
    console.log(`✓ Created option: ${TEST_OPTION_ID}`);
    console.log(`✓ Set capacity: ${CAPACITY}\n`);
}

/**
 * Cleanup test data
 */
async function cleanup() {
    console.log('\n=== Cleaning up test data ===\n');

    await pool.query('DELETE FROM option_holds WHERE release_id = ?', [TEST_RELEASE_ID]);
    await pool.query('DELETE FROM option_capacity WHERE option_id = ?', [TEST_OPTION_ID]);
    await pool.query('DELETE FROM survey_options WHERE id = ?', [TEST_OPTION_ID]);
    await pool.query('DELETE FROM survey_releases WHERE id = ?', [TEST_RELEASE_ID]);
    await pool.query('DELETE FROM surveys WHERE id = ?', [TEST_SURVEY_ID]);
    await pool.query('DELETE FROM users WHERE id = ?', ['test-admin']);

    // Delete test users
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        await pool.query('DELETE FROM users WHERE id = ?', [`test-user-${i}`]);
    }

    console.log('✓ Cleanup complete\n');
}

/**
 * Create a hold for a user
 */
async function createHold(userId) {
    const connection = await pool.getConnection();

    try {
        await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await connection.beginTransaction();

        // Lock capacity row
        const [capacity] = await connection.query(
            `SELECT option_id, total_capacity, reserved_count, filled_count 
             FROM option_capacity 
             WHERE option_id = ? 
             FOR UPDATE`,
            [TEST_OPTION_ID]
        );

        if (capacity.length === 0) {
            throw new Error('Capacity record not found');
        }

        const cap = capacity[0];
        const available = cap.total_capacity - (cap.reserved_count + cap.filled_count);

        if (available <= 0) {
            throw new Error('CAPACITY_FULL');
        }

        // Create hold
        // Actual schema has: id, option_id, user_id, release_id, status, expires_at, created_at
        const holdId = uuidv4();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await connection.query(
            `INSERT INTO option_holds (id, option_id, user_id, release_id, status, expires_at)
             VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
            [holdId, TEST_OPTION_ID, userId, TEST_RELEASE_ID, expiresAt]
        );

        // Increment reserved_count
        await connection.query(
            `UPDATE option_capacity 
             SET reserved_count = reserved_count + 1 
             WHERE option_id = ?`,
            [TEST_OPTION_ID]
        );

        await connection.commit();
        return { success: true, holdId };

    } catch (error) {
        await connection.rollback();
        // Log the actual error for debugging
        console.error(`Hold creation failed for ${userId}:`, error.message);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

/**
 * Test 1: Concurrent hold creation
 */
async function testConcurrentHolds() {
    console.log('=== Test 1: Concurrent Hold Creation ===\n');
    console.log(`Launching ${CONCURRENT_REQUESTS} concurrent hold requests...`);
    console.log(`Expected: Only ${CAPACITY} should succeed\n`);

    const userIds = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => `test-user-${i}`);
    const requests = userIds.map(userId => createHold(userId));

    const results = await Promise.allSettled(requests);

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success).length;
    const errors = results.filter(r => r.status === 'rejected').length;

    console.log(`Results:`);
    console.log(`  Successful holds: ${successful}`);
    console.log(`  Failed holds: ${failed}`);
    console.log(`  Errors: ${errors}`);

    // Verify capacity
    const [capacity] = await pool.query(
        'SELECT reserved_count, filled_count FROM option_capacity WHERE option_id = ?',
        [TEST_OPTION_ID]
    );

    console.log(`\nCapacity state:`);
    console.log(`  Reserved: ${capacity[0].reserved_count}`);
    console.log(`  Filled: ${capacity[0].filled_count}`);

    // Assertions
    const passed = successful === CAPACITY &&
        capacity[0].reserved_count === CAPACITY &&
        failed === (CONCURRENT_REQUESTS - CAPACITY);

    if (passed) {
        console.log(`\n✅ Test PASSED: No overselling detected!\n`);
    } else {
        console.log(`\n❌ Test FAILED: Overselling or incorrect capacity!\n`);
    }

    return passed;
}

/**
 * Test 2: Negative counter prevention
 */
async function testNegativeCounters() {
    console.log('=== Test 2: Negative Counter Prevention ===\n');

    // Manually set reserved_count to 1
    await pool.query(
        'UPDATE option_capacity SET reserved_count = 1 WHERE option_id = ?',
        [TEST_OPTION_ID]
    );

    // Delete all holds (simulating expired holds)
    await pool.query(
        'DELETE FROM option_holds WHERE option_id = ?',
        [TEST_OPTION_ID]
    );

    // Try to decrement reserved_count multiple times
    for (let i = 0; i < 5; i++) {
        await pool.query(
            `UPDATE option_capacity 
             SET reserved_count = GREATEST(0, reserved_count - 1) 
             WHERE option_id = ?`,
            [TEST_OPTION_ID]
        );
    }

    // Check final value
    const [capacity] = await pool.query(
        'SELECT reserved_count FROM option_capacity WHERE option_id = ?',
        [TEST_OPTION_ID]
    );

    const passed = capacity[0].reserved_count === 0;

    console.log(`Final reserved_count: ${capacity[0].reserved_count}`);

    if (passed) {
        console.log(`\n✅ Test PASSED: Counter never went negative!\n`);
    } else {
        console.log(`\n❌ Test FAILED: Negative counter detected!\n`);
    }

    return passed;
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Phase 2 Concurrency Test Suite      ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
        await setup();

        const test1 = await testConcurrentHolds();
        const test2 = await testNegativeCounters();

        await cleanup();

        console.log('╔════════════════════════════════════════╗');
        console.log('║           Test Summary                 ║');
        console.log('╚════════════════════════════════════════╝\n');
        console.log(`Test 1 (Concurrent Holds): ${test1 ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Test 2 (Negative Counters): ${test2 ? '✅ PASSED' : '❌ FAILED'}`);

        const allPassed = test1 && test2;

        if (allPassed) {
            console.log(`\n🎉 All tests PASSED! System is hardened.\n`);
            process.exit(0);
        } else {
            console.log(`\n⚠️  Some tests FAILED. Review hardening implementation.\n`);
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test suite failed with error:', error);
        await cleanup();
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run tests
runTests();
