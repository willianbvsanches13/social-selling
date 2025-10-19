import { InstagramMediaAsset } from '../entities/instagram-media-asset.entity';

export interface IInstagramMediaAssetRepository {
  create(asset: InstagramMediaAsset): Promise<InstagramMediaAsset>;
  findById(id: string): Promise<InstagramMediaAsset | null>;
  findByUser(userId: string): Promise<InstagramMediaAsset[]>;
  findByClientAccount(clientAccountId: string): Promise<InstagramMediaAsset[]>;
  update(asset: InstagramMediaAsset): Promise<InstagramMediaAsset>;
  delete(id: string): Promise<void>;
  findByS3Key(s3Key: string): Promise<InstagramMediaAsset | null>;
}
