/**
 * Comprehensive Test Script for Survey System
 * 
 * This script tests all features:
 * 1. Creates test approver user
 * 2. Assigns approver to surveys
 * 3. Tests approver API endpoints
 * 4. Verifies permissions
 * 5. Tests student flow
 * 6. Validates all features
 */

import axios from 'axios';
import { getDb } from '../src/config/database.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = 'http://localhost:3000/api/v1';
const db = getDb();

// Test credentials
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'admin123';
const STUDENT_EMAIL = 'student@test.com';
const STUDENT_PASSWORD = 'student123';
const APPROVER_EMAIL = 'approver@test.com';
const APPROVER_PASSWORD = 'password123';

let adminToken = '';
let studentToken = '';
let approverToken = '';
let testSurveyId = '';
let testReleaseId = '';
let testSubmissionId = '';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
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
    log(`\n${'='.repeat(60)}`, 'blue');
    log(`  ${message}`, 'blue');
    log(`${'='.repeat(60)}`, 'blue');
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

// 1. Setup: Create test users
async function setupTestUsers() {
    logSection('SETUP: Creating Test Users');

    try {
        // Create approver user
        const approverId = uuidv4();
        const hashedPassword = await bcrypt.hash(APPROVER_PASSWORD, 10);

        await db.query(`
            INSERT INTO users (id, email, password_hash, role, name, created_at)
            VALUES (?, ?, ?, 'APPROVER', 'Test Approver', NOW())
            ON DUPLICATE KEY UPDATE 
                password_hash = VALUES(password_hash),
                role = 'APPROVER'
        `, [approverId, APPROVER_EMAIL, hashedPassword]);

        logSuccess('Approver user created/updated');

        // Verify users exist
        const [users] = await db.query(`
            SELECT id, email, role FROM users 
            WHERE email IN (?, ?, ?)
        `, [ADMIN_EMAIL, STUDENT_EMAIL, APPROVER_EMAIL]);

        logInfo(`Found ${users.length} test users:`);
        users.forEach(u => log(`  - ${u.email} (${u.role})`));

        return true;
    } catch (error) {
        logError(`Setup failed: ${error.message}`);
        return false;
    }
}

// 2. Login all users
async function loginAllUsers() {
    logSection('LOGIN: Authenticating Test Users');

    // Login as admin
    const adminLogin = await apiCall('POST', '/auth/login', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
    });

    if (adminLogin.success) {
        adminToken = adminLogin.data.token;
        logSuccess(`Admin logged in`);
    } else {
        logError(`Admin login failed: ${JSON.stringify(adminLogin.error)}`);
        return false;
    }

    // Login as student
    const studentLogin = await apiCall('POST', '/auth/login', {
        email: STUDENT_EMAIL,
        password: STUDENT_PASSWORD
    });

    if (studentLogin.success) {
        studentToken = studentLogin.data.token;
        logSuccess(`Student logged in`);
    } else {
        logError(`Student login failed: ${JSON.stringify(studentLogin.error)}`);
    }

    // Login as approver
    const approverLogin = await apiCall('POST', '/auth/login', {
        email: APPROVER_EMAIL,
        password: APPROVER_PASSWORD
    });

    if (approverLogin.success) {
        approverToken = approverLogin.data.token;
        logSuccess(`Approver logged in`);
    } else {
        logError(`Approver login failed: ${JSON.stringify(approverLogin.error)}`);
        return false;
    }

    return true;
}

// 3. Assign approver to surveys
async function assignApproverToSurveys() {
    logSection('ASSIGNMENT: Assigning Approver to Surveys');

    try {
        // Get available surveys
        const [surveys] = await db.query('SELECT id, title FROM surveys LIMIT 2');

        if (surveys.length === 0) {
            logError('No surveys found in database');
            return false;
        }

        testSurveyId = surveys[0].id;

        // Get approver ID
        const [approver] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [APPROVER_EMAIL]
        );

        const approverId = approver[0].id;

        // Get admin ID
        const [admin] = await db.query(
            'SELECT id FROM users WHERE role = "ADMIN" LIMIT 1'
        );

        const adminId = admin[0].id;

        // Create assignments
        for (const survey of surveys) {
            await db.query(`
                INSERT INTO approver_assignments (id, approver_id, survey_id, assigned_by, assigned_at)
                VALUES (?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE assigned_at = NOW()
            `, [uuidv4(), approverId, survey.id, adminId]);

            logSuccess(`Assigned to: ${survey.title}`);
        }

        return true;
    } catch (error) {
        logError(`Assignment failed: ${error.message}`);
        return false;
    }
}

// 4. Test Approver Dashboard
async function testApproverDashboard() {
    logSection('TEST: Approver Dashboard');

    const result = await apiCall('GET', '/approver/dashboard', null, approverToken);

    if (result.success) {
        const { stats, assignedSurveys } = result.data.data;
        logSuccess(`Dashboard loaded`);
        logInfo(`  Pending Approvals: ${stats.pendingApprovals}`);
        logInfo(`  Assigned Surveys: ${stats.assignedSurveys}`);
        logInfo(`  Surveys: ${assignedSurveys.map(s => s.title).join(', ')}`);
        return true;
    } else {
        logError(`Dashboard failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// 5. Test Approver Pending Approvals
async function testPendingApprovals() {
    logSection('TEST: Pending Approvals');

    const result = await apiCall('GET', '/approver/pending', null, approverToken);

    if (result.success) {
        const approvals = result.data.data;
        logSuccess(`Pending approvals loaded: ${approvals.length} items`);

        if (approvals.length > 0) {
            testSubmissionId = approvals[0].submission_id;
            logInfo(`  First submission: ${approvals[0].survey_title}`);
            logInfo(`  Student: ${approvals[0].student_email}`);
        }

        return true;
    } else {
        logError(`Pending approvals failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// 6. Test Permission Restrictions
async function testPermissionRestrictions() {
    logSection('TEST: Permission Restrictions');

    // Approver should NOT be able to create surveys
    const createSurvey = await apiCall('POST', '/admin/surveys', {
        title: 'Unauthorized Survey',
        description: 'This should fail',
        type: 'PICK_N'
    }, approverToken);

    if (!createSurvey.success && createSurvey.status === 403) {
        logSuccess('Approver correctly blocked from creating surveys');
    } else {
        logError('Approver was able to create surveys (SECURITY ISSUE!)');
        return false;
    }

    // Approver should be able to access approver routes
    const dashboard = await apiCall('GET', '/approver/dashboard', null, approverToken);

    if (dashboard.success) {
        logSuccess('Approver can access approver routes');
    } else {
        logError('Approver cannot access approver routes');
        return false;
    }

    // Student should NOT be able to access approver routes
    const studentDashboard = await apiCall('GET', '/approver/dashboard', null, studentToken);

    if (!studentDashboard.success && studentDashboard.status === 403) {
        logSuccess('Student correctly blocked from approver routes');
    } else {
        logError('Student was able to access approver routes (SECURITY ISSUE!)');
        return false;
    }

    return true;
}

// 7. Test Student Dashboard
async function testStudentDashboard() {
    logSection('TEST: Student Dashboard');

    const result = await apiCall('GET', '/participation/dashboard', null, studentToken);

    if (result.success) {
        const surveys = result.data.data;
        logSuccess(`Student dashboard loaded: ${surveys.length} eligible surveys`);

        if (surveys.length > 0) {
            logInfo(`  Surveys: ${surveys.map(s => s.title).join(', ')}`);
        }

        return true;
    } else {
        logError(`Student dashboard failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// 8. Test My Commitments
async function testMyCommitments() {
    logSection('TEST: My Commitments Page');

    const result = await apiCall('GET', '/participation/my-commitments', null, studentToken);

    if (result.success) {
        const { stats, all } = result.data.data;
        logSuccess(`My Commitments loaded`);
        logInfo(`  Total: ${stats.total}`);
        logInfo(`  Approved: ${stats.approved}`);
        logInfo(`  Pending: ${stats.pending}`);
        logInfo(`  Rejected: ${stats.rejected}`);
        return true;
    } else {
        logError(`My Commitments failed: ${JSON.stringify(result.error)}`);
        return false;
    }
}

// 9. Test Waitlist
async function testWaitlist() {
    logSection('TEST: Waitlist Functionality');

    // Get a survey to test with
    const [releases] = await db.query(`
        SELECT sr.id, s.title 
        FROM survey_releases sr
        JOIN surveys s ON sr.survey_id = s.id
        WHERE sr.active_from <= NOW() AND sr.active_to >= NOW()
        LIMIT 1
    `);

    if (releases.length === 0) {
        logInfo('No active releases to test waitlist');
        return true;
    }

    const releaseId = releases[0].id;

    // Try to join waitlist
    const joinResult = await apiCall('POST', '/participation/waitlist/join', {
        releaseId
    }, studentToken);

    if (joinResult.success) {
        logSuccess(`Joined waitlist for: ${releases[0].title}`);
        logInfo(`  Position: ${joinResult.data.data.position}`);

        // Try to leave waitlist
        const leaveResult = await apiCall('DELETE', `/participation/waitlist/leave/${releaseId}`, null, studentToken);

        if (leaveResult.success) {
            logSuccess('Left waitlist successfully');
        } else {
            logError(`Leave waitlist failed: ${JSON.stringify(leaveResult.error)}`);
        }
    } else {
        logInfo(`Waitlist join result: ${joinResult.error?.error || 'Already on waitlist or survey not full'}`);
    }

    return true;
}

// 10. Summary Report
async function generateSummaryReport() {
    logSection('TEST SUMMARY');

    try {
        // Count users by role
        const [userCounts] = await db.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role
        `);

        log('\n📊 User Statistics:', 'cyan');
        userCounts.forEach(row => {
            log(`  ${row.role}: ${row.count}`);
        });

        // Count surveys
        const [surveyCounts] = await db.query(`
            SELECT type, COUNT(*) as count 
            FROM surveys 
            GROUP BY type
        `);

        log('\n📋 Survey Statistics:', 'cyan');
        surveyCounts.forEach(row => {
            log(`  ${row.type}: ${row.count}`);
        });

        // Count submissions by status
        const [submissionCounts] = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM survey_submissions 
            GROUP BY status
        `);

        log('\n📝 Submission Statistics:', 'cyan');
        submissionCounts.forEach(row => {
            log(`  ${row.status}: ${row.count}`);
        });

        // Count approver assignments
        const [assignmentCount] = await db.query(`
            SELECT COUNT(*) as count FROM approver_assignments
        `);

        log('\n👥 Approver Assignments:', 'cyan');
        log(`  Total: ${assignmentCount[0].count}`);

        return true;
    } catch (error) {
        logError(`Summary failed: ${error.message}`);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    log('\n🚀 Starting Comprehensive Test Suite\n', 'blue');

    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    const tests = [
        { name: 'Setup Test Users', fn: setupTestUsers },
        { name: 'Login All Users', fn: loginAllUsers },
        { name: 'Assign Approver to Surveys', fn: assignApproverToSurveys },
        { name: 'Approver Dashboard', fn: testApproverDashboard },
        { name: 'Pending Approvals', fn: testPendingApprovals },
        { name: 'Permission Restrictions', fn: testPermissionRestrictions },
        { name: 'Student Dashboard', fn: testStudentDashboard },
        { name: 'My Commitments', fn: testMyCommitments },
        { name: 'Waitlist Functionality', fn: testWaitlist },
        { name: 'Summary Report', fn: generateSummaryReport }
    ];

    for (const test of tests) {
        try {
            const result = await test.fn();
            results.tests.push({ name: test.name, passed: result });
            if (result) {
                results.passed++;
            } else {
                results.failed++;
            }
        } catch (error) {
            logError(`Test "${test.name}" threw error: ${error.message}`);
            results.tests.push({ name: test.name, passed: false });
            results.failed++;
        }
    }

    // Final summary
    logSection('FINAL RESULTS');
    log(`\nTotal Tests: ${tests.length}`, 'cyan');
    log(`Passed: ${results.passed}`, 'green');
    log(`Failed: ${results.failed}`, 'red');
    log(`Success Rate: ${((results.passed / tests.length) * 100).toFixed(1)}%\n`, 'yellow');

    // List failed tests
    const failedTests = results.tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
        log('\n❌ Failed Tests:', 'red');
        failedTests.forEach(t => log(`  - ${t.name}`));
    }

    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
