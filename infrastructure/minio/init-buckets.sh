#!/bin/bash
set -e

echo "Initializing MinIO buckets..."

# Wait for MinIO to be ready
until mc alias set myminio http://minio:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD; do
  echo "Waiting for MinIO to be ready..."
  sleep 2
done

echo "MinIO is ready!"

# Create bucket if it doesn't exist
mc mb myminio/social-selling-media --ignore-existing
echo "Bucket 'social-selling-media' created or already exists"

# Set lifecycle policy (delete after 90 days)
mc ilm add myminio/social-selling-media --expiry-days 90 --id "ExpireOldObjects" || echo "Lifecycle policy already exists"
echo "Lifecycle policy set: 90-day expiration"

# Optional: Set versioning (disabled for MVP to save storage)
# mc version enable myminio/social-selling-media

# Optional: Set encryption for production
# mc encrypt set sse-s3 myminio/social-selling-media

# Set quota (optional - prevent unlimited storage usage)
# mc admin bucket quota myminio/social-selling-media --hard 50gb

echo "MinIO buckets initialized successfully!"
