#!/usr/bin/env ts-node

/**
 * Backfill Conversations from HTTP Request Logs
 *
 * This script:
 * 1. Deletes all existing conversations and messages
 * 2. Fetches webhook payloads from http_request_logs
 * 3. Reprocesses them using the corrected WebhookMessageHandler logic
 *
 * Usage:
 *   npm run backfill:conversations
 *   or
 *   ts-node scripts/backfill-conversations-from-logs.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Database } from '../src/infrastructure/database/database';
import { WebhookMessageHandler } from '../src/modules/instagram/handlers/webhook-message.handler';
import { InstagramWebhookEvent } from '../src/domain/entities/instagram-webhook-event.entity';

interface HttpRequestLog {
  id: string;
  request_body: any;
  created_at: Date;
}

async function bootstrap() {
  console.log('🚀 Starting backfill process...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const database = app.get(Database);
  const webhookMessageHandler = app.get(WebhookMessageHandler);

  try {
    // Step 1: Delete existing conversations and messages
    console.log('📦 Step 1: Cleaning existing data...');
    await database.query('DELETE FROM messages');
    console.log('   ✓ Deleted all messages');

    await database.query('DELETE FROM conversations');
    console.log('   ✓ Deleted all conversations\n');

    // Step 2: Fetch webhook logs
    console.log('📦 Step 2: Fetching webhook logs from http_request_logs...');
    const logs: HttpRequestLog[] = await database.query(
      `SELECT id, request_body, created_at
       FROM http_request_logs
       WHERE path = '/api/instagram/webhooks'
       AND method = 'POST'
       AND status_code = 200
       AND request_body IS NOT NULL
       ORDER BY created_at ASC`,
    );

    console.log(`   ✓ Found ${logs.length} webhook logs to process\n`);

    if (logs.length === 0) {
      console.log('⚠️  No webhook logs found. Exiting...');
      await app.close();
      return;
    }

    // Step 3: Process each webhook
    console.log('📦 Step 3: Processing webhooks...');
    let processedCount = 0;
    let errorCount = 0;
    const errors: Array<{ logId: string; error: string }> = [];

    for (const log of logs) {
      try {
        const payload = log.request_body;

        // Extract entries from webhook payload
        if (!payload.entry || !Array.isArray(payload.entry)) {
          console.log(`   ⚠️  Skipping log ${log.id}: No entries found`);
          continue;
        }

        for (const entry of payload.entry) {
          const messaging = entry.messaging || [];

          for (const messagingEvent of messaging) {
            // Skip if no message
            if (!messagingEvent.message) {
              continue;
            }

            // Create InstagramWebhookEvent
            const webhookEvent: InstagramWebhookEvent = {
              id: `backfill-${log.id}-${Date.now()}`,
              eventType: 'messages',
              payload: {
                entry: [
                  {
                    id: entry.id,
                    time: entry.time,
                    messaging: [messagingEvent],
                  },
                ],
                object: payload.object,
              },
              timestamp: log.created_at,
            } as any;

            // Find client account ID from the entry.id or recipient.id
            // We need to find which client account this webhook belongs to
            const clientAccounts = await database.query(
              `SELECT id FROM client_accounts
               WHERE platform_account_id = $1 OR instagram_account_id = $1
               LIMIT 1`,
              [entry.id],
            );

            if (clientAccounts.length === 0) {
              console.log(
                `   ⚠️  Skipping: No client account found for platform ID ${entry.id}`,
              );
              continue;
            }

            const clientAccountId = clientAccounts[0].id;

            // Process the message event
            await webhookMessageHandler.processMessageEvent(
              webhookEvent,
              clientAccountId,
            );

            processedCount++;
            if (processedCount % 10 === 0) {
              console.log(`   ⏳ Processed ${processedCount} messages...`);
            }
          }
        }
      } catch (error) {
        errorCount++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ logId: log.id, error: errorMessage });
        console.error(`   ❌ Error processing log ${log.id}: ${errorMessage}`);
      }
    }

    // Step 4: Summary
    console.log('\n📊 Backfill Summary:');
    console.log(`   ✓ Total webhook logs: ${logs.length}`);
    console.log(`   ✓ Messages processed: ${processedCount}`);
    console.log(`   ✓ Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(({ logId, error }) => {
        console.log(`   - Log ${logId}: ${error}`);
      });
    }

    // Step 5: Show results
    const conversationCount = await database.query(
      'SELECT COUNT(*) as count FROM conversations',
    );
    const messageCount = await database.query(
      'SELECT COUNT(*) as count FROM messages',
    );

    console.log('\n📈 Final Statistics:');
    console.log(`   ✓ Conversations created: ${conversationCount[0].count}`);
    console.log(`   ✓ Messages created: ${messageCount[0].count}`);

    console.log('\n✅ Backfill completed successfully!');
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
