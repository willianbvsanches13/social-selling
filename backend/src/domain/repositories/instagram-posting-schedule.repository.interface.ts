import { InstagramPostingSchedule } from '../entities/instagram-posting-schedule.entity';

export interface IInstagramPostingScheduleRepository {
  create(schedule: InstagramPostingSchedule): Promise<InstagramPostingSchedule>;
  findById(id: string): Promise<InstagramPostingSchedule | null>;
  findByClientAccount(
    clientAccountId: string,
  ): Promise<InstagramPostingSchedule[]>;
  update(schedule: InstagramPostingSchedule): Promise<InstagramPostingSchedule>;
  findByClientAccountAndDay(
    clientAccountId: string,
    dayOfWeek: number,
  ): Promise<InstagramPostingSchedule | null>;
}
