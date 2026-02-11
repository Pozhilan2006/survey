import 'dotenv/config';
import { query, withTransaction, closePool } from './mysqlClient.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  try {
    console.log('Seeding database...');

    await withTransaction(async (connection) => {
      // Insert test admin user
      const userId = uuidv4();
      await connection.execute(
        'INSERT INTO users (id, email, role, created_at) VALUES (?, ?, ?, NOW())',
        [userId, 'admin@example.com', 'ADMIN']
      );

      // Insert test group
      const groupId = uuidv4();
      await connection.execute(
        'INSERT INTO `groups` (id, name, created_at) VALUES (?, ?, NOW())',
        [groupId, 'Test Group']
      );

      console.log('✓ Seed data inserted successfully');
    });

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed:', error.message);
    await closePool();
    process.exit(1);
  }
}

seed();
