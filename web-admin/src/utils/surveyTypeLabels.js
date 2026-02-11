export const SURVEY_TYPE_LABELS = {
    PICK_N: 'Selection Survey',
    PRIORITY: 'Priority Ranking',
    CALENDAR_SLOT: 'Time Slot Selection',
    WORKFLOW_RELAY: 'Workflow Relay',
    AUTHENTICATION: 'Authentication Challenge',
    VERIFICATION: 'Document Verification'
};

export function getSurveyTypeLabel(type) {
    return SURVEY_TYPE_LABELS[type] || type;
}
