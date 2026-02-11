import { v4 as uuidv4 } from 'uuid';

/**
 * Participation Repository
 * 
 * Data access layer for survey participation
 */
class ParticipationRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * Create a new participation record
     */
    async create(data, connection = null) {
        const db = connection || this.db;
        const id = uuidv4();

        await db.query(
            `INSERT INTO survey_participation 
       (id, release_id, user_id, state, eligibility_result)
       VALUES (?, ?, ?, ?, ?)`,
            [
                id,
                data.releaseId,
                data.userId,
                data.state,
                JSON.stringify(data.eligibilityResult)
            ]
        );

        // Fetch created record
        const [rows] = await db.query(
            'SELECT * FROM survey_participation WHERE id = ?',
            [id]
        );

        return rows[0];
    }

    /**
     * Find participation by ID
     */
    async findById(id, connection = null) {
        const db = connection || this.db;

        const [rows] = await db.query(
            'SELECT * FROM survey_participation WHERE id = ?',
            [id]
        );

        return rows[0] || null;
    }

    /**
     * Find participation by user and release
     */
    async findByUserAndRelease(userId, releaseId, connection = null) {
        const db = connection || this.db;

        const [rows] = await db.query(
            'SELECT * FROM survey_participation WHERE user_id = ? AND release_id = ?',
            [userId, releaseId]
        );

        return rows[0] || null;
    }

    /**
     * Find all participations for a user
     */
    async findByUser(userId, connection = null) {
        const db = connection || this.db;

        const [rows] = await db.query(
            `SELECT 
         sp.*,
         sr.survey_id,
         s.title as survey_title,
         s.type as survey_type
       FROM survey_participation sp
       JOIN survey_releases sr ON sr.id = sp.release_id
       JOIN surveys s ON s.id = sr.survey_id
       WHERE sp.user_id = ?
       ORDER BY sp.created_at DESC`,
            [userId]
        );

        return rows;
    }

    /**
     * Find all participations for a release
     */
    async findByRelease(releaseId, connection = null) {
        const db = connection || this.db;

        const [rows] = await db.query(
            `SELECT 
         sp.*,
         u.college_user_id,
         u.role
       FROM survey_participation sp
       JOIN users u ON u.id = sp.user_id
       WHERE sp.release_id = ?
       ORDER BY sp.created_at DESC`,
            [releaseId]
        );

        return rows;
    }

    /**
     * Update participation state
     */
    async updateState(id, state, connection = null) {
        const db = connection || this.db;

        await db.query(
            `UPDATE survey_participation 
       SET state = ?, state_updated_at = NOW()
       WHERE id = ?`,
            [state, id]
        );

        return await this.findById(id, db);
    }

    /**
     * Get participation with selections
     */
    async findWithSelections(id, connection = null) {
        const db = connection || this.db;

        const participation = await this.findById(id, db);

        if (!participation) {
            return null;
        }

        const [selections] = await db.query(
            `SELECT 
         ss.*,
         so.title as option_title
       FROM survey_selections ss
       JOIN survey_options so ON so.id = ss.option_id
       WHERE ss.participation_id = ?
       ORDER BY ss.rank_order NULLS LAST, ss.created_at`,
            [id]
        );

        const [answers] = await db.query(
            `SELECT * FROM survey_answers 
       WHERE participation_id = ?`,
            [id]
        );

        return {
            ...participation,
            selections: selections,
            answers: answers
        };
    }

    /**
     * Delete participation (admin only)
     */
    async delete(id, connection = null) {
        const db = connection || this.db;

        // Fetch before delete to return it (simulating RETURNING)
        const record = await this.findById(id, db);

        if (record) {
            await db.query(
                'DELETE FROM survey_participation WHERE id = ?',
                [id]
            );
        }

        return record;
    }
}

export default ParticipationRepository;
