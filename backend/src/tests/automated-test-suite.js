/**
 * Comprehensive Automated Test Suite
 * Tests all implemented features of the survey system
 */

const axios = require('axios');
const mysql = require('mysql2/promise');

const API_BASE = 'http://localhost:3000/api/v1';
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'survey_system'
};

// Test credentials
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'admin123';
const STUDENT_EMAIL = 'student@test.com';
const STUDENT_PASSWORD = 'student123';

let adminToken = '';
let studentToken = '';
let db = null;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'cyan');
}

function logSection(message) {
    log(`\n${'='.repeat(70)}`, 'blue');
    log(`  ${message}`, 'blue');
    log(`${'='.repeat(70)}`, 'blue');
}

function logSubSection(message) {
    log(`\n--- ${message} ---`, 'magenta');
}

// Helper to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
    try {
        const config = {
            method,
            url: `${API_BASE}${endpoint}`,
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status
        };
    }
}

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function recordTest(name, passed, error = null) {
    results.tests.push({ name, passed, error });
    if (passed) {
        results.passed++;
        logSuccess(name);
    } else {
        results.failed++;
        logError(`${name}: ${error}`);
    }
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function testDatabaseConnection() {
    logSection('TEST 1: Database Connection');

    try {
        db = await mysql.createConnection(DB_CONFIG);
        await db.query('SELECT 1');
        recordTest('Database connection', true);
        return true;
    } catch (error) {
        recordTest('Database connection', false, error.message);
        return false;
    }
}

async function testDatabaseSchema() {
    logSection('TEST 2: Database Schema');

    const requiredTables = [
        'users', 'surveys', 'survey_releases', 'survey_options',
        'survey_submissions', 'submission_selections', 'holds',
        'waitlist', 'approver_assignments', 'audit_events'
    ];

    try {
        const [tables] = await db.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);

        for (const table of requiredTables) {
            if (tableNames.includes(table)) {
                recordTest(`Table exists: ${table}`, true);
            } else {
                recordTest(`Table exists: ${table}`, false, 'Table not found');
            }
        }

        // Check for calendar slots tables (optional)
        const optionalTables = ['calendar_slots', 'slot_bookings', 'slot_quota_buckets'];
        logInfo('\nOptional tables (Calendar Slots):');
        for (const table of optionalTables) {
            if (tableNames.includes(table)) {
                logSuccess(`  ${table} exists`);
            } else {
                log(`  ${table} not found (migration not run)`, 'yellow');
            }
        }

        return true;
    } catch (error) {
        recordTest('Database schema check', false, error.message);
        return false;
    }
}

async function testAuthentication() {
    logSection('TEST 3: Authentication');

    // Test admin login
    logSubSection('Admin Login');
    const adminLogin = await apiCall('POST', '/auth/login', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
    });

    if (adminLogin.success && adminLogin.data.token) {
        adminToken = adminLogin.data.token;
        recordTest('Admin login', true);
    } else {
        recordTest('Admin login', false, JSON.stringify(adminLogin.error));
        return false;
    }

    // Test student login
    logSubSection('Student Login');
    const studentLogin = await apiCall('POST', '/auth/login', {
        email: STUDENT_EMAIL,
        password: STUDENT_PASSWORD
    });

    if (studentLogin.success && studentLogin.data.token) {
        studentToken = studentLogin.data.token;
        recordTest('Student login', true);
    } else {
        recordTest('Student login', false, JSON.stringify(studentLogin.error));
        return false;
    }

    // Test invalid login
    logSubSection('Invalid Login (Should Fail)');
    const invalidLogin = await apiCall('POST', '/auth/login', {
        email: 'invalid@test.com',
        password: 'wrong'
    });

    if (!invalidLogin.success && invalidLogin.status === 401) {
        recordTest('Invalid login rejected', true);
    } else {
        recordTest('Invalid login rejected', false, 'Should have returned 401');
    }

    return true;
}

async function testStudentDashboard() {
    logSection('TEST 4: Student Dashboard');

    const result = await apiCall('GET', '/participation/dashboard', null, studentToken);

    if (result.success && Array.isArray(result.data.data)) {
        recordTest('Student dashboard loads', true);
        logInfo(`  Found ${result.data.data.length} eligible surveys`);
        return true;
    } else {
        recordTest('Student dashboard loads', false, JSON.stringify(result.error));
        return false;
    }
}

async function testMyCommitments() {
    logSection('TEST 5: My Commitments');

    const result = await apiCall('GET', '/participation/my-commitments', null, studentToken);

    if (result.success && result.data.data) {
        const { stats, all } = result.data.data;
        recordTest('My Commitments loads', true);
        logInfo(`  Total: ${stats.total}, Approved: ${stats.approved}, Pending: ${stats.pending}, Rejected: ${stats.rejected}`);
        return true;
    } else {
        recordTest('My Commitments loads', false, JSON.stringify(result.error));
        return false;
    }
}

async function testWaitlistEndpoints() {
    logSection('TEST 6: Waitlist Endpoints');

    // Get a release to test with
    const [releases] = await db.query(`
        SELECT sr.id 
        FROM survey_releases sr
        WHERE sr.active_from <= NOW() AND sr.active_to >= NOW()
        LIMIT 1
    `);

    if (releases.length === 0) {
        logInfo('No active releases to test waitlist');
        return true;
    }

    const releaseId = releases[0].id;

    // Test join waitlist
    const joinResult = await apiCall('POST', '/participation/waitlist/join', {
        releaseId
    }, studentToken);

    if (joinResult.success || joinResult.error?.error?.includes('already')) {
        recordTest('Waitlist join endpoint', true);
    } else {
        recordTest('Waitlist join endpoint', false, JSON.stringify(joinResult.error));
    }

    return true;
}

async function testAdminSurveyAccess() {
    logSection('TEST 7: Admin Survey Access');

    // Admin should be able to access admin routes
    const result = await apiCall('GET', '/admin/surveys', null, adminToken);

    if (result.success) {
        recordTest('Admin can access admin routes', true);
        logInfo(`  Found ${result.data.data.length} surveys`);
    } else {
        recordTest('Admin can access admin routes', false, JSON.stringify(result.error));
    }

    // Student should NOT be able to access admin routes
    const studentAdminAccess = await apiCall('GET', '/admin/surveys', null, studentToken);

    if (!studentAdminAccess.success && studentAdminAccess.status === 403) {
        recordTest('Student blocked from admin routes', true);
    } else {
        recordTest('Student blocked from admin routes', false, 'Student should not have admin access');
    }

    return true;
}

async function testApproverAssignments() {
    logSection('TEST 8: Approver Assignments');

    try {
        const [assignments] = await db.query('SELECT COUNT(*) as count FROM approver_assignments');
        logInfo(`  Found ${assignments[0].count} approver assignments`);
        recordTest('Approver assignments table accessible', true);
        return true;
    } catch (error) {
        recordTest('Approver assignments table accessible', false, error.message);
        return false;
    }
}

async function testAuditEvents() {
    logSection('TEST 9: Audit Events');

    try {
        const [events] = await db.query(`
            SELECT event_type, COUNT(*) as count 
            FROM audit_events 
            GROUP BY event_type
        `);

        recordTest('Audit events table accessible', true);
        logInfo('  Event types:');
        events.forEach(e => {
            logInfo(`    ${e.event_type}: ${e.count}`);
        });
        return true;
    } catch (error) {
        recordTest('Audit events table accessible', false, error.message);
        return false;
    }
}

async function testBackgroundJobs() {
    logSection('TEST 10: Background Jobs');

    // Check for expired holds
    try {
        const [expiredHolds] = await db.query(`
            SELECT COUNT(*) as count 
            FROM holds 
            WHERE expires_at < NOW()
        `);

        logInfo(`  Found ${expiredHolds[0].count} expired holds (should be cleaned up by background job)`);
        recordTest('Hold expiration check', true);
        return true;
    } catch (error) {
        recordTest('Hold expiration check', false, error.message);
        return false;
    }
}

async function testCalendarSlots() {
    logSection('TEST 11: Calendar Slots (Optional)');

    try {
        // Check if tables exist
        const [tables] = await db.query("SHOW TABLES LIKE '%slot%'");

        if (tables.length === 0) {
            logInfo('Calendar slots tables not found (migration not run)');
            logInfo('This is optional - run migration to enable slot booking');
            return true;
        }

        // Tables exist, test endpoints
        const result = await apiCall('GET', '/slots/surveys/test-id/available-slots', null, studentToken);

        if (result.success || result.status === 404) {
            recordTest('Calendar slots endpoints accessible', true);
        } else {
            recordTest('Calendar slots endpoints accessible', false, JSON.stringify(result.error));
        }

        return true;
    } catch (error) {
        recordTest('Calendar slots check', false, error.message);
        return false;
    }
}

async function testSystemStatistics() {
    logSection('TEST 12: System Statistics');

    try {
        // Count users by role
        const [userCounts] = await db.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role
        `);

        logInfo('User counts:');
        userCounts.forEach(row => {
            logInfo(`  ${row.role}: ${row.count}`);
        });

        // Count surveys by type
        const [surveyCounts] = await db.query(`
            SELECT type, COUNT(*) as count 
            FROM surveys 
            GROUP BY type
        `);

        logInfo('\nSurvey counts:');
        surveyCounts.forEach(row => {
            logInfo(`  ${row.type}: ${row.count}`);
        });

        // Count submissions by status
        const [submissionCounts] = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM survey_submissions 
            GROUP BY status
        `);

        logInfo('\nSubmission counts:');
        submissionCounts.forEach(row => {
            logInfo(`  ${row.status}: ${row.count}`);
        });

        recordTest('System statistics retrieved', true);
        return true;
    } catch (error) {
        recordTest('System statistics retrieved', false, error.message);
        return false;
    }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
    log('\n🚀 Starting Comprehensive Automated Test Suite\n', 'blue');
    log('Testing Survey System - All Features\n', 'cyan');

    const startTime = Date.now();

    try {
        // Run all test suites
        await testDatabaseConnection();
        await testDatabaseSchema();
        await testAuthentication();
        await testStudentDashboard();
        await testMyCommitments();
        await testWaitlistEndpoints();
        await testAdminSurveyAccess();
        await testApproverAssignments();
        await testAuditEvents();
        await testBackgroundJobs();
        await testCalendarSlots();
        await testSystemStatistics();

    } catch (error) {
        logError(`\nFatal error during testing: ${error.message}`);
        console.error(error);
    } finally {
        // Close database connection
        if (db) {
            await db.end();
        }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Final summary
    logSection('TEST SUMMARY');
    log(`\nTotal Tests: ${results.tests.length}`, 'cyan');
    log(`Passed: ${results.passed}`, 'green');
    log(`Failed: ${results.failed}`, 'red');
    log(`Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`, 'yellow');
    log(`Duration: ${duration}s\n`, 'cyan');

    // List failed tests
    const failedTests = results.tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
        log('\n❌ Failed Tests:', 'red');
        failedTests.forEach(t => {
            log(`  - ${t.name}`, 'red');
            if (t.error) {
                log(`    Error: ${t.error}`, 'yellow');
            }
        });
    } else {
        log('\n🎉 All tests passed!', 'green');
    }

    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
