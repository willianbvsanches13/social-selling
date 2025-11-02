# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Instagram Participant Profiles**: Fixed missing participant profile data in conversations created via Instagram webhooks
  - Participant profiles (username, profile picture) are now fetched and saved when new conversations are created
  - Implemented non-blocking profile fetch with graceful error handling to prevent webhook processing failures
  - Added Redis caching (24-hour TTL) for participant profiles to reduce Instagram API calls
  - Created backfill worker to enrich existing conversations with missing participant profiles
  - Improved rate limiting strategy to handle profile API calls efficiently

### Added
- **Backfill Worker**: New BullMQ processor to backfill participant profiles for existing conversations
  - Queue name: `backfill-participant-profiles`
  - Supports batch processing with configurable batch size (default: 10)
  - Implements exponential backoff and retry logic (up to 3 attempts)
  - Respects Instagram API rate limits with concurrency=1
  - Returns detailed statistics (success/error counts, duration, errors list)

### Deployment Notes
- **Action Required**: After deployment, trigger the backfill worker to enrich existing conversations:
  - Via API: `POST /api/workers/backfill-profiles { "accountId": "your-account-id", "batchSize": 10 }`
  - Or via Redis CLI: `LPUSH bull:backfill-participant-profiles:add '{"accountId":"your-account-id","batchSize":10}'`
- Monitor the worker progress in BullMQ dashboard or logs
- Large datasets may require multiple job executions (processes 10 conversations per job by default)
- Rate limiting ensures compliance with Instagram API limits (failures are logged, not thrown)

### Technical Details
- Enhanced `InstagramApiService.getUserProfileById()` with comprehensive JSDoc and rate limiting documentation
- Enhanced `MessageWebhookHandler.fetchAndUpdateParticipantProfile()` with detailed implementation notes
- Enhanced `Conversation.updateParticipantProfile()` domain method with validation and documentation
- Added comprehensive JSDoc to `BackfillParticipantProfilesProcessor` with usage instructions
- Verified Swagger annotations for `InstagramProfileDto` are complete and accurate
