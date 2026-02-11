import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BootstrapScreen from './screens/BootstrapScreen';
import SurveyListScreen from './screens/SurveyListScreen';
import SurveyRunnerScreen from './screens/SurveyRunnerScreen';
import StatusScreen from './screens/StatusScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Bootstrap"
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#007AFF'
                    },
                    headerTintColor: '#FFF',
                    headerTitleStyle: {
                        fontWeight: 'bold'
                    }
                }}
            >
                <Stack.Screen
                    name="Bootstrap"
                    component={BootstrapScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="SurveyList"
                    component={SurveyListScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="SurveyRunner"
                    component={SurveyRunnerScreen}
                    options={{ title: 'Survey' }}
                />
                <Stack.Screen
                    name="Status"
                    component={StatusScreen}
                    options={{ title: 'Survey Status' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
