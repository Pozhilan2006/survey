/**
 * Centralized Database Table Names
 * 
 * Use these constants instead of hardcoded strings to prevent schema drift.
 */

export const TABLES = {
    USERS: 'users',
    GROUPS: 'groups',
    GROUP_MEMBERS: 'group_members',
    SURVEYS: 'surveys',
    SURVEY_OPTIONS: 'survey_options',
    SURVEY_RELEASES: 'survey_releases',
    ELIGIBILITY_RULES: 'eligibility_rules',
    SURVEY_SUBMISSIONS: 'survey_submissions',
    SUBMISSION_SELECTIONS: 'submission_selections',
    SEAT_HOLDS: 'seat_holds',
    OPTION_HOLDS: 'option_holds',
    QUOTA_BUCKETS: 'quota_buckets',
    QUOTA_ALLOCATIONS: 'quota_allocations',
    WAITLIST: 'waitlist',
    OPTION_QUOTA_BUCKETS: 'option_quota_buckets',

    // Approvals
    APPROVER_ASSIGNMENTS: 'approver_assignments',

    // Audit
    AUDIT_EVENTS: 'audit_events'
};

export default TABLES;
