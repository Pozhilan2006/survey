import ParticipationService from './service.js';
import logger from '../../utils/logger.js';

/**
 * Participation Controller
 * 
 * Handles HTTP requests for survey participation
 */
class ParticipationController {
    constructor(db) {
        this.service = new ParticipationService(db);
    }

    /**
     * Check eligibility for a release
     */
    async checkEligibility(req, res, next) {
        try {
            const { releaseId } = req.params;
            const userId = req.user.id;

            const result = await this.service.checkEligibility(userId, releaseId);

            res.json({
                eligible: result.decision === 'ALLOW' || result.decision === 'ALLOW_WITH_REQUIREMENTS',
                decision: result.decision,
                requirements: result.requirements,
                reason: result.reason,
                metadata: result.metadata
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Start participation (transition to VIEWING state)
     */
    async startParticipation(req, res, next) {
        try {
            const { releaseId } = req.params;
            const userId = req.user.id;

            const participation = await this.service.startParticipation(userId, releaseId);

            res.status(201).json({
                participation,
                nextAction: {
                    type: 'VIEW_OPTIONS',
                    availableActions: ['HOLD_SEAT']
                }
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Get participation details
     */
    async getParticipation(req, res, next) {
        try {
            const { participationId } = req.params;
            const userId = req.user.id;

            const participation = await this.service.getParticipation(participationId, userId);

            // Determine next action based on state
            const nextAction = this.determineNextAction(participation);

            res.json({
                participation,
                nextAction
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Hold a seat
     */
    async holdSeat(req, res, next) {
        try {
            const { participationId } = req.params;
            const { optionId } = req.body;
            const userId = req.user.id;

            const result = await this.service.holdSeat(participationId, optionId, userId);

            res.json({
                participation: result.participation,
                hold: result.hold,
                nextAction: {
                    type: 'SUBMIT_SURVEY',
                    expiresAt: result.hold.expires_at
                }
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Release a hold
     */
    async releaseHold(req, res, next) {
        try {
            const { participationId } = req.params;
            const userId = req.user.id;

            const participation = await this.service.releaseHold(participationId, userId);

            res.json({
                participation,
                nextAction: {
                    type: 'VIEW_OPTIONS',
                    availableActions: ['HOLD_SEAT']
                }
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Submit survey
     */
    async submitSurvey(req, res, next) {
        try {
            const { participationId } = req.params;
            const { selections, answers } = req.body;
            const userId = req.user.id;

            const participation = await this.service.submitSurvey(
                participationId,
                selections,
                answers,
                userId
            );

            res.json({
                participation,
                nextAction: this.determineNextAction(participation)
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user's participations
     */
    async getUserParticipations(req, res, next) {
        try {
            const userId = req.user.id;

            const participations = await this.service.getUserParticipations(userId);

            res.json({
                participations
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Determine next action based on participation state
     */
    determineNextAction(participation) {
        switch (participation.state) {
            case 'ELIGIBLE':
                return {
                    type: 'START_PARTICIPATION',
                    action: 'Click to start survey'
                };

            case 'VIEWING':
                return {
                    type: 'VIEW_OPTIONS',
                    availableActions: ['HOLD_SEAT']
                };

            case 'HOLD_ACTIVE':
                return {
                    type: 'SUBMIT_SURVEY',
                    message: 'Complete and submit your survey before hold expires'
                };

            case 'SUBMITTED':
                return {
                    type: 'WAIT',
                    message: 'Submission received. Awaiting processing.'
                };

            case 'PENDING_APPROVAL':
                return {
                    type: 'WAIT',
                    message: 'Awaiting approval from faculty/admin'
                };

            case 'APPROVED':
                return {
                    type: 'WAIT',
                    message: 'Approved! Awaiting allocation.'
                };

            case 'ALLOCATED':
                return {
                    type: 'VIEW_RESULT',
                    message: 'Allocation complete. View your results.'
                };

            case 'REJECTED':
                return {
                    type: 'VIEW_REASON',
                    message: 'Submission rejected. View reason.'
                };

            case 'WAITLISTED':
                return {
                    type: 'WAIT',
                    message: 'You are on the waitlist. We will notify you if a spot opens.'
                };

            default:
                return {
                    type: 'UNKNOWN',
                    message: 'Unknown state'
                };
        }
    }
}

export default ParticipationController;
