export const SURVEY_STATUS_LABELS = {
    DRAFT: 'Draft',
    ACTIVE: 'Open for Responses',
    COMPLETED: 'Completed',
    ARCHIVED: 'Archived',
    PUBLISHED: 'Published',
    CLOSED: 'Closed',
    DEPRECATED: 'Deprecated'
};

export function getSurveyStatusLabel(status) {
    return SURVEY_STATUS_LABELS[status] || status;
}
