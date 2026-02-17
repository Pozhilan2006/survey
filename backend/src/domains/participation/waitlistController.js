import waitlistService from './waitlistService.js';

class WaitlistController {
    /**
     * Join waitlist
     * POST /api/v1/participation/waitlist/join
     */
    async joinWaitlist(req, res, next) {
        try {
            const { releaseId } = req.body;
            const userId = req.user.id;

            if (!releaseId) {
                return res.status(400).json({
                    success: false,
                    message: 'Release ID is required'
                });
            }

            const result = await waitlistService.joinWaitlist(userId, releaseId);

            res.json({
                success: true,
                data: result,
                message: `Joined waitlist at position #${result.position}`
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Leave waitlist
     * DELETE /api/v1/participation/waitlist/leave/:releaseId
     */
    async leaveWaitlist(req, res, next) {
        try {
            const { releaseId } = req.params;
            const userId = req.user.id;

            await waitlistService.leaveWaitlist(userId, releaseId);

            res.json({
                success: true,
                message: 'Successfully left waitlist'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get waitlist position
     * GET /api/v1/participation/waitlist/position/:releaseId
     */
    async getPosition(req, res, next) {
        try {
            const { releaseId } = req.params;
            const userId = req.user.id;

            const position = await waitlistService.getPosition(userId, releaseId);

            res.json({
                success: true,
                data: position
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Claim seat from waitlist notification
     * POST /api/v1/participation/waitlist/claim
     */
    async claimSeat(req, res, next) {
        try {
            const { releaseId } = req.body;
            const userId = req.user.id;

            if (!releaseId) {
                return res.status(400).json({
                    success: false,
                    message: 'Release ID is required'
                });
            }

            await waitlistService.convertToParticipation(userId, releaseId);

            res.json({
                success: true,
                message: 'Seat claimed successfully. You can now participate in the survey.'
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new WaitlistController();
