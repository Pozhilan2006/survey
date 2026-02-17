import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './PriorityRanking.css';

/**
 * Priority Ranking Component
 * Allows students to rank survey options by dragging and dropping
 */
const PriorityRanking = ({ options, initialRanking, onChange, maxSelections }) => {
    const [rankedOptions, setRankedOptions] = useState([]);
    const [unrankedOptions, setUnrankedOptions] = useState([]);

    useEffect(() => {
        // Initialize ranked and unranked options
        if (initialRanking && initialRanking.length > 0) {
            const ranked = initialRanking.map(id =>
                options.find(opt => opt.id === id)
            ).filter(Boolean);

            const unranked = options.filter(opt =>
                !initialRanking.includes(opt.id)
            );

            setRankedOptions(ranked);
            setUnrankedOptions(unranked);
        } else {
            setRankedOptions([]);
            setUnrankedOptions([...options]);
        }
    }, [options, initialRanking]);

    const handleDragEnd = (result) => {
        const { source, destination } = result;

        // Dropped outside any droppable area
        if (!destination) {
            return;
        }

        // Dropped in the same position
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        // Moving within ranked list
        if (source.droppableId === 'ranked' && destination.droppableId === 'ranked') {
            const newRanked = Array.from(rankedOptions);
            const [removed] = newRanked.splice(source.index, 1);
            newRanked.splice(destination.index, 0, removed);

            setRankedOptions(newRanked);
            notifyChange(newRanked);
            return;
        }

        // Moving from unranked to ranked
        if (source.droppableId === 'unranked' && destination.droppableId === 'ranked') {
            // Check max selections limit
            if (maxSelections && rankedOptions.length >= maxSelections) {
                return; // Don't allow adding more
            }

            const newUnranked = Array.from(unrankedOptions);
            const newRanked = Array.from(rankedOptions);

            const [removed] = newUnranked.splice(source.index, 1);
            newRanked.splice(destination.index, 0, removed);

            setUnrankedOptions(newUnranked);
            setRankedOptions(newRanked);
            notifyChange(newRanked);
            return;
        }

        // Moving from ranked to unranked
        if (source.droppableId === 'ranked' && destination.droppableId === 'unranked') {
            const newRanked = Array.from(rankedOptions);
            const newUnranked = Array.from(unrankedOptions);

            const [removed] = newRanked.splice(source.index, 1);
            newUnranked.splice(destination.index, 0, removed);

            setRankedOptions(newRanked);
            setUnrankedOptions(newUnranked);
            notifyChange(newRanked);
            return;
        }
    };

    const notifyChange = (ranked) => {
        if (onChange) {
            onChange(ranked.map(opt => opt.id));
        }
    };

    const getRankBadge = (index) => {
        const badges = ['🥇', '🥈', '🥉'];
        return badges[index] || `#${index + 1}`;
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="priority-ranking">
                <div className="ranking-section">
                    <div className="section-header">
                        <h3>Your Ranked Preferences</h3>
                        {maxSelections && (
                            <span className="selection-count">
                                {rankedOptions.length} / {maxSelections}
                            </span>
                        )}
                    </div>

                    <Droppable droppableId="ranked">
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`droppable-area ranked ${snapshot.isDraggingOver ? 'dragging-over' : ''
                                    } ${rankedOptions.length === 0 ? 'empty' : ''}`}
                            >
                                {rankedOptions.length === 0 ? (
                                    <div className="empty-state">
                                        <p>Drag options here to rank them</p>
                                        <p className="hint">Higher position = Higher priority</p>
                                    </div>
                                ) : (
                                    rankedOptions.map((option, index) => (
                                        <Draggable
                                            key={option.id}
                                            draggableId={option.id}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`option-card ranked ${snapshot.isDragging ? 'dragging' : ''
                                                        }`}
                                                >
                                                    <span className="rank-badge">
                                                        {getRankBadge(index)}
                                                    </span>
                                                    <div className="option-content">
                                                        <span className="option-label">
                                                            {option.label}
                                                        </span>
                                                        {option.capacity && (
                                                            <span className="option-meta">
                                                                Capacity: {option.capacity}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="drag-handle">⋮⋮</span>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))
                                )}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>

                <div className="ranking-section">
                    <div className="section-header">
                        <h3>Available Options</h3>
                        <span className="option-count">
                            {unrankedOptions.length} remaining
                        </span>
                    </div>

                    <Droppable droppableId="unranked">
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`droppable-area unranked ${snapshot.isDraggingOver ? 'dragging-over' : ''
                                    }`}
                            >
                                {unrankedOptions.map((option, index) => (
                                    <Draggable
                                        key={option.id}
                                        draggableId={option.id}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`option-card unranked ${snapshot.isDragging ? 'dragging' : ''
                                                    }`}
                                            >
                                                <div className="option-content">
                                                    <span className="option-label">
                                                        {option.label}
                                                    </span>
                                                    {option.capacity && (
                                                        <span className="option-meta">
                                                            Capacity: {option.capacity}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="drag-handle">⋮⋮</span>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>

                {maxSelections && rankedOptions.length >= maxSelections && (
                    <div className="max-reached-notice">
                        ℹ️ Maximum selections reached. Remove an item to add another.
                    </div>
                )}
            </div>
        </DragDropContext>
    );
};

export default PriorityRanking;
