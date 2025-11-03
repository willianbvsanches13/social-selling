#!/bin/bash

# Script to mark all migrations as completed in an existing database

docker compose exec -T postgres psql -U social_selling_user -d social_selling <<'EOF'
-- Get all migration files and insert them into the migrations table
INSERT INTO migrations (name, file)
SELECT
    filename,
    filename
FROM (
    VALUES
        ('001-initial-schema.sql'),
        ('002-create-refresh-tokens.sql'),
        ('003-create-client-accounts.sql'),
        ('004-create-oauth-tokens.sql'),
        ('005-create-products.sql'),
        ('006-create-product-links.sql'),
        ('007-create-conversations.sql'),
        ('008-create-messages.sql'),
        ('009-create-message-products.sql'),
        ('010-create-analytics.sql'),
        ('011-create-instagram-media.sql'),
        ('012-create-notifications.sql'),
        ('013-create-message-triggers.sql'),
        ('014-enhance-client-accounts.sql'),
        ('015-create-instagram-message-templates.sql'),
        ('016-create-instagram-quick-replies.sql'),
        ('017-enhance-instagram-conversations.sql'),
        ('018-create-instagram-webhook-events.sql'),
        ('019-create-instagram-webhook-subscriptions.sql'),
        ('020-create-instagram-webhook-logs.sql'),
        ('021-create-instagram-post-templates.sql'),
        ('022-create-instagram-scheduled-posts.sql'),
        ('023-create-instagram-posting-schedules.sql'),
        ('024-create-instagram-media-assets.sql'),
        ('025-create-instagram-account-insights.sql'),
        ('026-create-instagram-media-insights.sql'),
        ('027-create-instagram-story-insights.sql'),
        ('028-create-instagram-analytics-reports.sql'),
        ('029-create-instagram-comments.sql'),
        ('030-create-instagram-mentions.sql'),
        ('031-create-auto-reply-rules.sql'),
        ('032-create-auto-reply-logs.sql'),
        ('033-create-email-logs.sql'),
        ('034-add-stories-media-type.sql'),
        ('034-create-instagram-message-reactions.sql'),
        ('035-create-instagram-messaging-postbacks.sql'),
        ('036-create-instagram-messaging-seen.sql'),
        ('037-create-http-request-logs.sql'),
        ('038-fix-message-sender-types.sql'),
        ('039-add-message-reply-and-attachments.sql'),
        ('040-backfill-attachments-from-mediaurl.sql')
) AS files(filename)
WHERE NOT EXISTS (
    SELECT 1 FROM migrations WHERE name = filename
);

-- Show status
SELECT COUNT(*) as total_migrations FROM migrations;
EOF

echo ""
echo "Migration status updated! All migrations marked as completed."
echo "You can now run new migrations with: docker compose exec backend npm run migrate:prod up"
