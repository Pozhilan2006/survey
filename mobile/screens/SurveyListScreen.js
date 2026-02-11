import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    Alert
} from 'react-native';
import { getMySurveys } from '../api/apiClient';
import { getSurveyTypeLabel } from '../utils/surveyTypeLabels';
import { getSurveyStatusLabel } from '../utils/surveyStatusLabels';

const STATUS_COLORS = {
    NOT_STARTED: '#007AFF', // Blue
    ACTIVE: '#007AFF', // Blue
    LOCKED: '#999',
    SUBMITTED: '#FF9500', // Orange
    APPROVED: '#34C759', // Green
    REJECTED: '#FF3B30', // Red
    PUBLISHED: '#007AFF',
    DRAFT: '#FF9500',
    CLOSED: '#333'
};

export default function SurveyListScreen({ navigation }) {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadSurveys();
    }, []);

    const loadSurveys = async () => {
        try {
            setError(null);
            const data = await getMySurveys();
            setSurveys(data);
        } catch (error) {
            console.error('Failed to load surveys:', error);
            setError('Unable to load surveys. Please check your connection.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadSurveys();
    };

    const handleSurveyPress = (survey) => {
        // Simple navigation to runner for now since we don't have detailed status tracking in minimal API
        navigation.navigate('SurveyRunner', { surveyId: survey.id });
    };

    const renderSurveyCard = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleSurveyPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || '#999' }]}>
                    <Text style={styles.badgeText}>{getSurveyStatusLabel(item.status)}</Text>
                </View>
            </View>

            <Text style={styles.typeLabel}>
                {getSurveyTypeLabel(item.type)}
            </Text>

            {/* Config metadata display if helpful */}
            {item.config && item.config.max_selections && (
                <Text style={styles.detailText}>
                    Select up to {item.config.max_selections} options
                </Text>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={loadSurveys} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>My Surveys</Text>

            <FlatList
                data={surveys}
                renderItem={renderSurveyCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No surveys available</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5'
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#FFF'
    },
    listContent: {
        padding: 16
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        marginRight: 8
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600'
    },
    typeLabel: {
        color: '#666',
        fontSize: 14,
        marginBottom: 4,
        fontWeight: '500'
    },
    detailText: {
        fontSize: 13,
        color: '#888',
        marginTop: 4
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center'
    },
    emptyText: {
        fontSize: 16,
        color: '#999'
    },
    errorText: {
        fontSize: 16,
        color: '#FF3B30',
        textAlign: 'center',
        marginBottom: 16
    },
    retryButton: {
        padding: 10,
        backgroundColor: '#007AFF',
        borderRadius: 8
    },
    retryText: {
        color: '#FFF',
        fontWeight: '600'
    }
});
