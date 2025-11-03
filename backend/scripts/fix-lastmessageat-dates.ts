#!/usr/bin/env ts-node

/**
 * Fix lastMessageAt Date Format Issues
 *
 * This script investigates and fixes date format issues where
 * timestamps are showing as "+057808-10-30T11:43:25.000Z"
 *
 * The problem occurs when timestamps (in milliseconds) are incorrectly
 * interpreted as dates, resulting in dates in the far future.
 *
 * Usage:
 *   npm run fix:dates
 *   or
 *   ts-node scripts/fix-lastmessageat-dates.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Database } from '../src/infrastructure/database/database';

async function bootstrap() {
  console.log('🔍 Starting date investigation and fix...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const database = app.get(Database);

  try {
    // Step 1: Check for problematic dates
    console.log('📦 Step 1: Checking for problematic dates...');
    const problematicDates = await database.query(
      `SELECT
        id,
        participant_username,
        last_message_at,
        EXTRACT(EPOCH FROM last_message_at) as epoch_seconds,
        created_at
       FROM conversations
       WHERE last_message_at > '2100-01-01'::timestamptz
       ORDER BY last_message_at DESC`,
    );

    if (problematicDates.length === 0) {
      console.log('   ✓ No problematic dates found!\n');

      // Show some sample dates
      console.log('📊 Sample of current dates:');
      const sampleDates = await database.query(
        `SELECT
          id,
          participant_username,
          last_message_at,
          created_at
         FROM conversations
         WHERE last_message_at IS NOT NULL
         ORDER BY last_message_at DESC
         LIMIT 5`,
      );

      sampleDates.forEach((row: any) => {
        console.log(
          `   ${row.participant_username || 'Unknown'}: ${row.last_message_at}`,
        );
      });
    } else {
      console.log(
        `   ⚠️  Found ${problematicDates.length} conversations with problematic dates\n`,
      );

      // Show some examples
      console.log('Examples of problematic dates:');
      problematicDates.slice(0, 5).forEach((row: any) => {
        console.log(
          `   - ${row.participant_username || 'Unknown'}: ${row.last_message_at} (epoch: ${row.epoch_seconds})`,
        );
      });

      console.log('\n📦 Step 2: Fixing problematic dates...');

      // The fix: if the date is in the far future, it's likely because
      // milliseconds were stored as a timestamp. We need to convert them back.
      const updateResult = await database.query(
          `UPDATE conversations
           SET last_message_at = to_timestamp(EXTRACT(EPOCH FROM last_message_at) / 1000000)
           WHERE last_message_at > '2100-01-01'::timestamptz
           RETURNING id, participant_username, last_message_at`,
      );

      console.log(`   ✓ Fixed ${updateResult.length} dates\n`);

      // Show fixed dates
      if (updateResult.length > 0) {
        console.log('Examples of fixed dates:');
        updateResult.slice(0, 5).forEach((row: any) => {
          console.log(
            `   - ${row.participant_username || 'Unknown'}: ${row.last_message_at}`,
          );
        });
      }
    }

    // Step 3: Final verification
    console.log('\n📊 Final Statistics:');
    const stats = await database.query(
      `SELECT
        COUNT(*) as total_conversations,
        COUNT(last_message_at) as conversations_with_messages,
        COUNT(CASE WHEN last_message_at > '2100-01-01'::timestamptz THEN 1 END) as still_problematic
       FROM conversations`,
    );

    console.log(`   Total conversations: ${stats[0].total_conversations}`);
    console.log(
      `   Conversations with messages: ${stats[0].conversations_with_messages}`,
    );
    console.log(`   Still problematic: ${stats[0].still_problematic}`);

    if (parseInt(stats[0].still_problematic) === 0) {
      console.log('\n✅ All dates are now correct!');
    } else {
      console.log(
        `\n⚠️  There are still ${stats[0].still_problematic} problematic dates that need manual review`,
      );
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
