import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import './WaitlistButton.css';

const WaitlistButton = ({ survey, onUpdate }) => {
    const [onWaitlist, setOnWaitlist] = useState(false);
    const [position, setPosition] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [expiresAt, setExpiresAt] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        checkWaitlistStatus();
    }, [survey.releaseId]);

    const checkWaitlistStatus = async () => {
        try {
            const response = await axiosInstance.get(
                `/participation/waitlist/position/${survey.releaseId}`
            );

            if (response.data.data) {
                setOnWaitlist(true);
                setPosition(response.data.data.position);
                setStatus(response.data.data.status);
                setExpiresAt(response.data.data.expires_at);
            }
        } catch (error) {
            // Not on waitlist - this is expected
            setOnWaitlist(false);
        }
    };

    const handleJoinWaitlist = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await axiosInstance.post(
                '/participation/waitlist/join',
                { releaseId: survey.releaseId }
            );

            setOnWaitlist(true);
            setPosition(response.data.data.position);
            setStatus('ACTIVE');

            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Error joining waitlist:', err);
            setError(err.response?.data?.message || 'Failed to join waitlist');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveWaitlist = async () => {
        try {
            setLoading(true);
            setError('');

            await axiosInstance.delete(
                `/participation/waitlist/leave/${survey.releaseId}`
            );

            setOnWaitlist(false);
            setPosition(null);
            setStatus(null);
            setExpiresAt(null);

            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Error leaving waitlist:', err);
            setError(err.response?.data?.message || 'Failed to leave waitlist');
        } finally {
            setLoading(false);
        }
    };

    const handleClaimSeat = async () => {
        try {
            setLoading(true);
            setError('');

            await axiosInstance.post(
                '/participation/waitlist/claim',
                { releaseId: survey.releaseId }
            );

            // After claiming, the user can now participate
            // Trigger a refresh to update the survey card status
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Error claiming seat:', err);
            setError(err.response?.data?.message || 'Failed to claim seat');
        } finally {
            setLoading(false);
        }
    };

    // Notified status - seat is available
    if (status === 'NOTIFIED') {
        return (
            <div className="waitlist-notified">
                <div className="notification-banner">
                    <span className="notification-icon">🔔</span>
                    <div className="notification-content">
                        <strong>Seat Available!</strong>
                        <span className="expiry-info">
                            Claim within 24 hours
                        </span>
                    </div>
                </div>
                {error && <div className="waitlist-error">{error}</div>}
                <button
                    className="btn-claim"
                    onClick={handleClaimSeat}
                    disabled={loading}
                >
                    {loading ? 'Claiming...' : 'Claim Seat Now'}
                </button>
            </div>
        );
    }

    // On waitlist
    if (onWaitlist) {
        return (
            <div className="waitlist-status">
                <div className="waitlist-info">
                    <span className="waitlist-icon">⏳</span>
                    <div className="waitlist-details">
                        <span className="waitlist-position">Position #{position}</span>
                        <span className="waitlist-label">in waitlist</span>
                    </div>
                </div>
                {error && <div className="waitlist-error">{error}</div>}
                <button
                    className="btn-leave-waitlist"
                    onClick={handleLeaveWaitlist}
                    disabled={loading}
                >
                    {loading ? 'Leaving...' : 'Leave Waitlist'}
                </button>
            </div>
        );
    }

    // Not on waitlist - show join button
    return (
        <div className="waitlist-join">
            {error && <div className="waitlist-error">{error}</div>}
            <button
                className="btn-join-waitlist"
                onClick={handleJoinWaitlist}
                disabled={loading}
            >
                {loading ? 'Joining...' : 'Join Waitlist'}
            </button>
        </div>
    );
};

export default WaitlistButton;
