/**
 * Data Transfer Object for message attachments
 * Represents attachment metadata in API responses
 */
export class AttachmentDto {
  /**
   * URL of the attachment resource
   */
  url!: string;

  /**
   * Type of attachment (image, video, audio, document)
   */
  type!: string;

  /**
   * Additional metadata about the attachment
   * May include: filename, size, dimensions, duration, etc.
   */
  metadata!: Record<string, unknown>;
}
