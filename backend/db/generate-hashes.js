import bcrypt from 'bcrypt';

async function generateHashes() {
    const passwords = {
        admin: 'admin123',
        student: 'student123',
        approver: 'approver123'
    };

    console.log('Generating bcrypt hashes...\n');

    for (const [role, password] of Object.entries(passwords)) {
        const hash = await bcrypt.hash(password, 10);
        console.log(`${role}:${password}`);
        console.log(`Hash: ${hash}\n`);
    }
}

generateHashes();
