import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function StatusScreen({ route, navigation }) {
    const { survey } = route.params;

    const handleRefresh = () => {
        // TODO: Refresh survey status from backend
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>🔒</Text>
                </View>

                <Text style={styles.title}>Survey Locked</Text>
                <Text style={styles.surveyTitle}>{survey.title}</Text>

                <View style={styles.reasonContainer}>
                    <Text style={styles.reasonLabel}>Reason:</Text>
                    <Text style={styles.reasonText}>{survey.reason}</Text>
                </View>

                <View style={styles.requirementsContainer}>
                    <Text style={styles.requirementsTitle}>Required Actions:</Text>
                    <View style={styles.bulletList}>
                        <Text style={styles.bulletItem}>
                            • Complete all prerequisite surveys
                        </Text>
                        <Text style={styles.bulletItem}>
                            • Ensure all required documents are verified
                        </Text>
                        <Text style={styles.bulletItem}>
                            • Check eligibility criteria
                        </Text>
                    </View>
                </View>

                <Text style={styles.helpText}>
                    Once you complete the required actions, this survey will become available.
                </Text>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefresh}
                >
                    <Text style={styles.refreshButtonText}>Refresh Status</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5'
    },
    content: {
        padding: 24,
        alignItems: 'center'
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFE5E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 24
    },
    icon: {
        fontSize: 40
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8
    },
    surveyTitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center'
    },
    reasonContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 24
    },
    reasonLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#999',
        marginBottom: 8
    },
    reasonText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24
    },
    requirementsContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 24
    },
    requirementsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12
    },
    bulletList: {
        paddingLeft: 8
    },
    bulletItem: {
        fontSize: 14,
        color: '#666',
        lineHeight: 24,
        marginBottom: 4
    },
    helpText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20
    },
    footer: {
        padding: 16,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5'
    },
    refreshButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center'
    },
    refreshButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600'
    }
});
