import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config();

if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET not found in .env file');
    process.exit(1);
}

// Get user ID from command line argument
const userId = process.argv[2];

if (!userId) {
    console.error('❌ Usage: node generate-token.js <user-uuid>');
    console.error('');
    console.error('Example:');
    console.error('  node generate-token.js 123e4567-e89b-12d3-a456-426614174000');
    console.error('');
    console.error('💡 Get user UUID from Supabase dashboard:');
    console.error('   1. Go to Table Editor');
    console.error('   2. Select "users" table');
    console.error('   3. Copy the "id" column value');
    process.exit(1);
}

const token = jwt.sign(
    {
        id: userId,
        role: 'STUDENT'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);

console.log('✅ JWT Token generated successfully!');
console.log('');
console.log('Token (copy this):');
console.log('─'.repeat(80));
console.log(token);
console.log('─'.repeat(80));
console.log('');
console.log('📝 Use this token in API requests:');
console.log('   -H "Authorization: Bearer ' + token + '"');
console.log('');
console.log('⏰ Token expires in: 7 days');
