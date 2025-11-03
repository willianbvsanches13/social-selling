const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'social_selling',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function query() {
  try {
    await client.connect();

    console.log('=== INSTAGRAM ACCOUNTS ===');
    const accounts = await client.query(`
      SELECT id, user_id, platform_account_id, platform_username
      FROM client_accounts
      WHERE platform = 'instagram' AND deleted_at IS NULL
    `);
    console.log(JSON.stringify(accounts.rows, null, 2));

    console.log('\n=== RECENT CONVERSATIONS ===');
    const convs = await client.query(`
      SELECT id, client_account_id, platform_conversation_id, participant_platform_id, participant_username, created_at
      FROM conversations
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(convs.rows, null, 2));

    console.log('\n=== DUPLICATES ===');
    const dups = await client.query(`
      SELECT client_account_id, participant_platform_id, COUNT(*) as count, array_agg(id) as conversation_ids
      FROM conversations
      GROUP BY client_account_id, participant_platform_id
      HAVING COUNT(*) > 1
    `);
    console.log(JSON.stringify(dups.rows, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

query();
