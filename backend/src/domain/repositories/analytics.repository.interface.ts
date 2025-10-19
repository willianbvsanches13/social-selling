import {
  AnalyticsEvent,
  AnalyticsEventType,
} from '../entities/analytics-event.entity';
import { DateRange } from '../value-objects/date-range.vo';

export interface IAnalyticsRepository {
  findById(id: string): Promise<AnalyticsEvent | null>;
  findByClientAccount(
    clientAccountId: string,
    eventType?: AnalyticsEventType,
    dateRange?: DateRange,
  ): Promise<AnalyticsEvent[]>;
  findByPlatformMediaId(platformMediaId: string): Promise<AnalyticsEvent[]>;
  create(analyticsEvent: AnalyticsEvent): Promise<AnalyticsEvent>;
  getLatestForClientAccount(
    clientAccountId: string,
    eventType: AnalyticsEventType,
  ): Promise<AnalyticsEvent | null>;
}
