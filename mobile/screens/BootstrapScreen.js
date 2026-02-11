import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { getCurrentUser } from '../api/apiClient';

export default function BootstrapScreen({ navigation }) {
    const [error, setError] = useState(null);

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        try {
            // TODO: Simulate SSO completion - in production, handle SSO callback here
            // TODO: Extract token from SSO response and store in secure storage

            // Fetch current user data
            const user = await getCurrentUser();

            // TODO: Store user data in context/redux
            console.log('User loaded:', user);

            // Navigate to survey list
            navigation.replace('SurveyList', { user });

        } catch (err) {
            console.error('Bootstrap error:', err);
            setError(err.message);
            Alert.alert(
                'Error',
                'Failed to load user data. Please try again.',
                [
                    { text: 'Retry', onPress: initializeApp }
                ]
            );
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>College Survey System</Text>

            {error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 40
    },
    loadingContainer: {
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666'
    },
    errorContainer: {
        padding: 20,
        backgroundColor: '#FFE5E5',
        borderRadius: 8
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 14,
        textAlign: 'center'
    }
});
