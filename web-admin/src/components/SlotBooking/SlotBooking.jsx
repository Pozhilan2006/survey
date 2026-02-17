import React, { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import './SlotBooking.css';

/**
 * SlotBooking Component
 * 
 * Allows students to book calendar slots for surveys
 */
const SlotBooking = ({ surveyId, onBookingComplete, onCancel }) => {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [holdingSlot, setHoldingSlot] = useState(null);
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAvailableSlots();
    }, [surveyId]);

    useEffect(() => {
        if (holdingSlot && countdown > 0) {
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        // Hold expired
                        setHoldingSlot(null);
                        loadAvailableSlots();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [holdingSlot, countdown]);

    const loadAvailableSlots = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await axiosInstance.get(
                `/slots/surveys/${surveyId}/available-slots`
            );
            setSlots(response.data.data);
        } catch (err) {
            console.error('Error loading slots:', err);
            setError('Failed to load available slots');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSlot = (slot) => {
        setSelectedSlot(slot);
    };

    const handleHoldSlot = async () => {
        if (!selectedSlot) return;

        try {
            setError('');
            const response = await axiosInstance.post(
                `/slots/${selectedSlot.id}/hold`
            );
            setHoldingSlot(response.data.data);
            setCountdown(600); // 10 minutes in seconds
            setSelectedSlot(null);
        } catch (err) {
            console.error('Error holding slot:', err);
            setError(err.response?.data?.error || 'Failed to hold slot');
        }
    };

    const handleConfirmBooking = async () => {
        if (!holdingSlot) return;

        try {
            setError('');
            await axiosInstance.post(
                `/slots/bookings/${holdingSlot.id}/confirm`,
                { submissionId: null }
            );

            if (onBookingComplete) {
                onBookingComplete(holdingSlot);
            }
        } catch (err) {
            console.error('Error confirming booking:', err);
            setError(err.response?.data?.error || 'Failed to confirm booking');
        }
    };

    const handleReleaseSlot = async () => {
        if (!holdingSlot) return;

        try {
            setError('');
            await axiosInstance.post(
                `/slots/bookings/${holdingSlot.id}/cancel`,
                { reason: 'User released hold' }
            );
            setHoldingSlot(null);
            setCountdown(0);
            loadAvailableSlots();
        } catch (err) {
            console.error('Error releasing slot:', err);
            setError(err.response?.data?.error || 'Failed to release slot');
        }
    };

    const formatTime = (datetime) => {
        const date = new Date(datetime);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (datetime) => {
        const date = new Date(datetime);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatCountdown = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="slot-booking">
                <div className="loading">Loading available slots...</div>
            </div>
        );
    }

    if (holdingSlot) {
        return (
            <div className="slot-booking">
                <div className="slot-hold-container">
                    <h3>🎯 Slot Reserved</h3>

                    <div className="hold-details">
                        <div className="hold-info">
                            <div className="hold-icon">🕐</div>
                            <div className="hold-time">
                                <div className="time-range">
                                    {formatTime(holdingSlot.slot_details.start_time)} - {formatTime(holdingSlot.slot_details.end_time)}
                                </div>
                                <div className="date">
                                    {formatDate(holdingSlot.slot_details.start_time)}
                                </div>
                            </div>
                        </div>

                        {holdingSlot.slot_details.location && (
                            <div className="location">
                                📍 {holdingSlot.slot_details.location}
                            </div>
                        )}

                        <div className="countdown-container">
                            <div className="countdown-label">Reserved for:</div>
                            <div className={`countdown ${countdown < 60 ? 'urgent' : ''}`}>
                                ⏱️ {formatCountdown(countdown)}
                            </div>
                            {countdown < 60 && (
                                <div className="countdown-warning">
                                    ⚠️ Hurry! Your reservation expires soon
                                </div>
                            )}
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="hold-actions">
                        <button
                            className="btn-confirm"
                            onClick={handleConfirmBooking}
                        >
                            ✓ Confirm Booking
                        </button>
                        <button
                            className="btn-release"
                            onClick={handleReleaseSlot}
                        >
                            Release Slot
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="slot-booking">
            <div className="slot-booking-header">
                <h3>📅 Select a Time Slot</h3>
                <p>Choose your preferred time slot from the available options below</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {slots.length === 0 ? (
                <div className="no-slots">
                    <div className="no-slots-icon">📭</div>
                    <p>No available slots at this time</p>
                </div>
            ) : (
                <>
                    <div className="slot-list">
                        {slots.map(slot => (
                            <div
                                key={slot.id}
                                className={`slot-item ${selectedSlot?.id === slot.id ? 'selected' : ''} ${slot.is_full ? 'full' : ''} ${slot.user_has_booking ? 'booked' : ''}`}
                                onClick={() => !slot.is_full && !slot.user_has_booking && handleSelectSlot(slot)}
                            >
                                <div className="slot-time">
                                    <div className="time-range">
                                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                    </div>
                                    <div className="date">
                                        {formatDate(slot.start_time)}
                                    </div>
                                </div>

                                {slot.location && (
                                    <div className="slot-location">
                                        📍 {slot.location}
                                    </div>
                                )}

                                <div className="slot-capacity">
                                    {slot.user_has_booking ? (
                                        <span className="status-booked">✓ You have a booking</span>
                                    ) : slot.is_full ? (
                                        <span className="status-full">FULL</span>
                                    ) : (
                                        <span className="status-available">
                                            {slot.available_capacity} {slot.available_capacity === 1 ? 'spot' : 'spots'} left
                                        </span>
                                    )}
                                </div>

                                {selectedSlot?.id === slot.id && (
                                    <div className="selected-indicator">✓ Selected</div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="slot-actions">
                        <button
                            className="btn-hold"
                            onClick={handleHoldSlot}
                            disabled={!selectedSlot}
                        >
                            Hold Selected Slot
                        </button>
                        {onCancel && (
                            <button
                                className="btn-cancel"
                                onClick={onCancel}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default SlotBooking;
