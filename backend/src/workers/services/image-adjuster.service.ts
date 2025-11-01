import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Instagram aspect ratio constraints
 */
export const INSTAGRAM_CONSTRAINTS = {
  MIN_ASPECT_RATIO: 0.8, // 4:5 portrait
  MAX_ASPECT_RATIO: 1.91, // 1.91:1 landscape
  MIN_DIMENSION: 320,
  MAX_DIMENSION: 1080,
  IDEAL_DIMENSION: 1080,
};

/**
 * Adjustment strategy enum
 */
export enum AdjustmentStrategy {
  CROP = 'crop', // Crop to fit
  PAD = 'pad', // Add padding/borders
  SMART = 'smart', // Intelligently choose between crop and pad
}

/**
 * Image adjustment result
 */
export interface ImageAdjustmentResult {
  adjustedPath: string;
  originalAspectRatio: number;
  newAspectRatio: number;
  originalDimensions: { width: number; height: number };
  newDimensions: { width: number; height: number };
  strategy: string;
}

/**
 * Service for adjusting images to meet Instagram requirements
 */
@Injectable()
export class ImageAdjusterService {
  private readonly logger = new Logger(ImageAdjusterService.name);

  /**
   * Adjust image to meet Instagram aspect ratio requirements
   * @param imagePath Path to the image file
   * @param strategy Adjustment strategy (default: SMART)
   * @returns Adjustment result with new file path
   */
  async adjustImage(
    imagePath: string,
    strategy: AdjustmentStrategy = AdjustmentStrategy.SMART,
  ): Promise<ImageAdjustmentResult> {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to determine image dimensions');
      }

      const originalAspectRatio = metadata.width / metadata.height;

      // Check if adjustment is needed
      if (
        originalAspectRatio >= INSTAGRAM_CONSTRAINTS.MIN_ASPECT_RATIO &&
        originalAspectRatio <= INSTAGRAM_CONSTRAINTS.MAX_ASPECT_RATIO
      ) {
        this.logger.log(
          `Image already meets Instagram requirements (aspect ratio: ${originalAspectRatio.toFixed(2)})`,
        );
        return {
          adjustedPath: imagePath,
          originalAspectRatio,
          newAspectRatio: originalAspectRatio,
          originalDimensions: {
            width: metadata.width,
            height: metadata.height,
          },
          newDimensions: { width: metadata.width, height: metadata.height },
          strategy: 'none',
        };
      }

      this.logger.log(
        `Adjusting image from aspect ratio ${originalAspectRatio.toFixed(2)} to fit Instagram constraints`,
      );

      let adjustedImage: sharp.Sharp;
      let newWidth: number;
      let newHeight: number;
      let usedStrategy: string;

      // Determine strategy
      if (strategy === AdjustmentStrategy.SMART) {
        // Smart strategy: crop if close to constraint, pad if far
        const ratioDistance = Math.min(
          Math.abs(
            originalAspectRatio - INSTAGRAM_CONSTRAINTS.MIN_ASPECT_RATIO,
          ),
          Math.abs(
            originalAspectRatio - INSTAGRAM_CONSTRAINTS.MAX_ASPECT_RATIO,
          ),
        );

        // If the image is within 15% of the constraint, use crop, otherwise pad
        strategy =
          ratioDistance < 0.15
            ? AdjustmentStrategy.CROP
            : AdjustmentStrategy.PAD;
      }

      if (strategy === AdjustmentStrategy.CROP) {
        const result = await this.cropToFit(
          image,
          metadata.width,
          metadata.height,
          originalAspectRatio,
        );
        adjustedImage = result.image;
        newWidth = result.width;
        newHeight = result.height;
        usedStrategy = 'crop';
      } else {
        const result = await this.padToFit(
          image,
          metadata.width,
          metadata.height,
          originalAspectRatio,
        );
        adjustedImage = result.image;
        newWidth = result.width;
        newHeight = result.height;
        usedStrategy = 'pad';
      }

      // Resize to Instagram's ideal dimensions if needed
      const maxDimension = Math.max(newWidth, newHeight);
      if (maxDimension > INSTAGRAM_CONSTRAINTS.IDEAL_DIMENSION) {
        const scale = INSTAGRAM_CONSTRAINTS.IDEAL_DIMENSION / maxDimension;
        newWidth = Math.round(newWidth * scale);
        newHeight = Math.round(newHeight * scale);
        adjustedImage = adjustedImage.resize(newWidth, newHeight, {
          fit: 'fill',
        });
      }

      // Save adjusted image
      const adjustedPath = this.generateAdjustedPath(imagePath);
      await adjustedImage.toFile(adjustedPath);

      const newAspectRatio = newWidth / newHeight;

      this.logger.log(
        `Image adjusted successfully using ${usedStrategy} strategy: ${metadata.width}x${metadata.height} (${originalAspectRatio.toFixed(2)}) -> ${newWidth}x${newHeight} (${newAspectRatio.toFixed(2)})`,
      );

      return {
        adjustedPath,
        originalAspectRatio,
        newAspectRatio,
        originalDimensions: { width: metadata.width, height: metadata.height },
        newDimensions: { width: newWidth, height: newHeight },
        strategy: usedStrategy,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to adjust image: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Crop image to fit Instagram constraints
   * Smart cropping from center
   */
  private async cropToFit(
    image: sharp.Sharp,
    width: number,
    height: number,
    aspectRatio: number,
  ): Promise<{ image: sharp.Sharp; width: number; height: number }> {
    let newWidth: number;
    let newHeight: number;

    if (aspectRatio < INSTAGRAM_CONSTRAINTS.MIN_ASPECT_RATIO) {
      // Too tall - crop height
      newWidth = width;
      newHeight = Math.round(width / INSTAGRAM_CONSTRAINTS.MIN_ASPECT_RATIO);
    } else {
      // Too wide - crop width
      newHeight = height;
      newWidth = Math.round(height * INSTAGRAM_CONSTRAINTS.MAX_ASPECT_RATIO);
    }

    // Center crop
    const left = Math.round((width - newWidth) / 2);
    const top = Math.round((height - newHeight) / 2);

    this.logger.debug(
      `Cropping from ${width}x${height} to ${newWidth}x${newHeight} (left: ${left}, top: ${top})`,
    );

    return {
      image: image.extract({
        left: Math.max(0, left),
        top: Math.max(0, top),
        width: newWidth,
        height: newHeight,
      }),
      width: newWidth,
      height: newHeight,
    };
  }

  /**
   * Add padding to image to fit Instagram constraints
   * Adds blur background or solid color
   */
  private async padToFit(
    image: sharp.Sharp,
    width: number,
    height: number,
    aspectRatio: number,
  ): Promise<{ image: sharp.Sharp; width: number; height: number }> {
    let newWidth: number;
    let newHeight: number;

    if (aspectRatio < INSTAGRAM_CONSTRAINTS.MIN_ASPECT_RATIO) {
      // Too tall - add width
      newHeight = height;
      newWidth = Math.round(height * INSTAGRAM_CONSTRAINTS.MIN_ASPECT_RATIO);
    } else {
      // Too wide - add height
      newWidth = width;
      newHeight = Math.round(width / INSTAGRAM_CONSTRAINTS.MAX_ASPECT_RATIO);
    }

    this.logger.debug(
      `Padding from ${width}x${height} to ${newWidth}x${newHeight}`,
    );

    // Create blurred background
    const background = await image
      .clone()
      .resize(newWidth, newHeight, { fit: 'cover' })
      .blur(50)
      .toBuffer();

    // Composite original image on top of blurred background
    return {
      image: sharp(background).composite([
        {
          input: await image.toBuffer(),
          gravity: 'center',
        },
      ]),
      width: newWidth,
      height: newHeight,
    };
  }

  /**
   * Generate path for adjusted image
   */
  private generateAdjustedPath(originalPath: string): string {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const basename = path.basename(originalPath, ext);
    return path.join(dir, `${basename}-adjusted${ext}`);
  }

  /**
   * Check if image needs adjustment
   */
  needsAdjustment(width: number, height: number): boolean {
    const aspectRatio = width / height;
    return (
      aspectRatio < INSTAGRAM_CONSTRAINTS.MIN_ASPECT_RATIO ||
      aspectRatio > INSTAGRAM_CONSTRAINTS.MAX_ASPECT_RATIO
    );
  }

  /**
   * Clean up adjusted image file
   */
  async cleanupAdjustedImage(adjustedPath: string): Promise<void> {
    try {
      if (await fs.pathExists(adjustedPath)) {
        await fs.remove(adjustedPath);
        this.logger.log(`Cleaned up adjusted image: ${adjustedPath}`);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to cleanup adjusted image ${adjustedPath}: ${errorMessage}`,
      );
    }
  }
}
