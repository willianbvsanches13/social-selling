const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'social_selling',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

(async () => {
  try {
    console.log('=== RECENT CONVERSATIONS ===');
    const result = await pool.query(`
      SELECT id, platform_conversation_id, participant_platform_id, created_at
      FROM conversations
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`Found ${result.rows.length} conversations`);
    result.rows.forEach((conv, index) => {
      console.log(`\n--- Conversation ${index + 1} ---`);
      console.log(`ID: ${conv.id}`);
      console.log(`platform_conversation_id: ${conv.platform_conversation_id}`);
      console.log(`participant_platform_id: ${conv.participant_platform_id}`);
      console.log(`created_at: ${conv.created_at}`);
    });

    console.log('\n=== CHECKING FOR DUPLICATES ===');
    const dups = await pool.query(`
      SELECT participant_platform_id, COUNT(*) as count, array_agg(platform_conversation_id) as conv_ids
      FROM conversations
      GROUP BY participant_platform_id
      HAVING COUNT(*) > 1
    `);

    if (dups.rows.length > 0) {
      console.log(`Found ${dups.rows.length} participants with duplicate conversations:`);
      dups.rows.forEach(dup => {
        console.log(`  - Participant ${dup.participant_platform_id}: ${dup.count} conversations`);
        console.log(`    IDs: ${dup.conv_ids.join(', ')}`);
      });
    } else {
      console.log('No duplicate conversations found!');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
})();
