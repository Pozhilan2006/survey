import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';
import { getSurveyById, submitSurvey } from '../api/apiClient';

export default function SurveyRunnerScreen({ route, navigation }) {
    const { surveyId } = route.params;
    const [survey, setSurvey] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selections, setSelections] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadSurvey();
    }, [surveyId]);

    const loadSurvey = async () => {
        try {
            const data = await getSurveyById(surveyId);
            setSurvey(data);
        } catch (error) {
            console.error('Failed to load survey:', error);
            Alert.alert('Error', 'Failed to load survey details', [
                { text: 'Go Back', onPress: () => navigation.goBack() }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!survey) return;

        // Config validation
        const config = survey.config || {};

        if (survey.type === 'PICK_N') {
            const { min_selections = 0, max_selections } = config;
            if (min_selections > 0 && selections.length < min_selections) {
                Alert.alert('Error', `Please select at least ${min_selections} option(s)`);
                return;
            }
            if (max_selections && selections.length > max_selections) {
                Alert.alert('Error', `Please select at most ${max_selections} option(s)`);
                return;
            }
        }

        setSubmitting(true);
        try {
            await submitSurvey(surveyId, { selections });
            Alert.alert('Success', 'Survey submitted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Failed to submit survey:', error);
            Alert.alert('Info', 'Submission logic is not yet connected to the backend API.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderPickN = () => {
        const config = survey.config || {};
        const max_selections = config.max_selections || 999;

        const toggleSelection = (optionId) => {
            if (selections.includes(optionId)) {
                setSelections(selections.filter(id => id !== optionId));
            } else {
                if (selections.length < max_selections) {
                    setSelections([...selections, optionId]);
                } else {
                    Alert.alert('Limit Reached', `You can select up to ${max_selections} options`);
                }
            }
        };

        const options = survey.options || [];

        if (options.length === 0) {
            return (
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>No options available for this survey.</Text>
                </View>
            );
        }

        return (
            <View>
                <Text style={styles.instruction}>
                    Select up to {max_selections} option(s)
                </Text>
                {options.map((option) => (
                    <TouchableOpacity
                        key={option.id}
                        style={[
                            styles.optionCard,
                            selections.includes(option.id) && styles.optionCardSelected
                        ]}
                        onPress={() => toggleSelection(option.id)}
                    >
                        <View style={styles.checkbox}>
                            {selections.includes(option.id) && <View style={styles.checkboxInner} />}
                        </View>
                        <View style={styles.optionContent}>
                            <Text style={styles.optionTitle}>{option.title || option.label}</Text>
                            {option.description && (
                                <Text style={styles.optionDescription}>{option.description}</Text>
                            )}
                            {/* Capacity info not available in minimal API yet */}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderPlaceholder = (type) => (
        <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
                {type} survey interface not yet implemented.
            </Text>
            <Text style={styles.todoText}>TODO: Implement {type} interface</Text>
        </View>
    );

    const renderSurveyContent = () => {
        if (!survey) return null;

        switch (survey.type) {
            case 'PICK_N':
                return renderPickN();
            case 'PRIORITY':
            case 'CALENDAR_SLOT':
            case 'VERIFICATION':
            default:
                return renderPlaceholder(survey.type);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (!survey) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Survey not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <Text style={styles.title}>{survey.title}</Text>
                {survey.description && (
                    <Text style={styles.description}>{survey.description}</Text>
                )}

                {renderSurveyContent()}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>Submit Survey</Text>
                    )}
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    scrollView: {
        flex: 1
    },
    content: {
        padding: 16,
        paddingBottom: 100
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8
    },
    description: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24
    },
    instruction: {
        fontSize: 14,
        color: '#007AFF',
        marginBottom: 16,
        fontWeight: '600'
    },
    optionCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 2,
        borderColor: 'transparent'
    },
    optionCardSelected: {
        borderColor: '#007AFF',
        backgroundColor: '#F0F8FF'
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#007AFF',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkboxInner: {
        width: 14,
        height: 14,
        borderRadius: 2,
        backgroundColor: '#007AFF'
    },
    optionContent: {
        flex: 1
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4
    },
    optionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4
    },
    placeholder: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center'
    },
    placeholderText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
        textAlign: 'center'
    },
    todoText: {
        fontSize: 14,
        color: '#FF9500',
        fontStyle: 'italic',
        marginTop: 8
    },
    errorText: {
        fontSize: 16,
        color: '#FF3B30',
        textAlign: 'center'
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5'
    },
    submitButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center'
    },
    submitButtonDisabled: {
        backgroundColor: '#999'
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600'
    }
});
