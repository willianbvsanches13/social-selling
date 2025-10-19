import { InstagramPostTemplate } from '../entities/instagram-post-template.entity';

export interface IInstagramPostTemplateRepository {
  create(template: InstagramPostTemplate): Promise<InstagramPostTemplate>;
  findById(id: string): Promise<InstagramPostTemplate | null>;
  findByUser(userId: string): Promise<InstagramPostTemplate[]>;
  update(template: InstagramPostTemplate): Promise<InstagramPostTemplate>;
  delete(id: string): Promise<void>;
}
