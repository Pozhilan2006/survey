
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

async function run() {
    try {
        console.log('0. Logging in as Admin...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@survey.com',
            password: 'admin123'
        });

        console.log('Login Status:', loginRes.status);
        const { accessToken } = loginRes.data;
        if (!accessToken) {
            console.error('CRITICAL: No access token returned!');
            process.exit(1);
        }
        console.log('Admin Token:', accessToken.substring(0, 20) + '...');

        console.log('1. Creating Survey...');
        const surveyBody = {
            title: "Node Debug Survey ESM",
            type: "RESEARCH",
            maxSelections: 1,
            approvalPolicy: "MANUAL_APPROVE",
            eligibilityRules: {
                rule: "AND",
                conditions: [
                    { rule: "DEPARTMENT_EQUALS", value: "CS" }
                ]
            },
            options: [
                { label: "Option A", value: "A" }
            ]
        };

        const surveyRes = await axios.post(`${BASE_URL}/admin/surveys`, surveyBody, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        console.log('Survey Created:', surveyRes.status, surveyRes.data);

    } catch (error) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

run();
