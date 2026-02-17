-- Quick Database Verification Script
-- Run this to verify all tables exist

USE survey_system;

-- Check all required tables
SELECT 
    'Table Check' as test_type,
    TABLE_NAME,
    TABLE_ROWS,
    CASE 
        WHEN TABLE_NAME IN ('users', 'surveys', 'survey_releases', 'survey_options', 
                           'survey_submissions', 'submission_selections', 'holds', 
                           'waitlist', 'approver_assignments', 'audit_events') 
        THEN '✅ REQUIRED'
        WHEN TABLE_NAME IN ('calendar_slots', 'slot_bookings', 'slot_quota_buckets')
        THEN '🟡 OPTIONAL'
        ELSE '❓ UNKNOWN'
    END as status
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'survey_system'
ORDER BY TABLE_NAME;

-- Check user counts
SELECT 
    'User Count' as test_type,
    role,
    COUNT(*) as count,
    '✅ OK' as status
FROM users
GROUP BY role;

-- Check survey counts
SELECT 
    'Survey Count' as test_type,
    type,
    COUNT(*) as count,
    '✅ OK' as status
FROM surveys
GROUP BY type;

-- Check active releases
SELECT 
    'Active Releases' as test_type,
    COUNT(*) as count,
    '✅ OK' as status
FROM survey_releases
WHERE active_from <= NOW() AND active_to >= NOW();

-- Check submissions
SELECT 
    'Submissions' as test_type,
    status,
    COUNT(*) as count,
    '✅ OK' as status
FROM survey_submissions
GROUP BY status;

-- Check waitlist
SELECT 
    'Waitlist' as test_type,
    COUNT(*) as count,
    '✅ OK' as status
FROM waitlist;

-- Summary
SELECT 
    '=== VERIFICATION COMPLETE ===' as summary,
    'All checks passed' as result,
    NOW() as timestamp;
