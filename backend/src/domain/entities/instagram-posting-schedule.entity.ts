export interface InstagramPostingScheduleProps {
  id: string;
  clientAccountId: string;
  dayOfWeek: number;
  timeSlots: string[];
  timezone: string;
  isOptimal: boolean;
  engagementScore?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class InstagramPostingSchedule {
  private props: InstagramPostingScheduleProps;

  private constructor(props: InstagramPostingScheduleProps) {
    this.props = props;
  }

  static create(
    props: Omit<
      InstagramPostingScheduleProps,
      'id' | 'createdAt' | 'updatedAt' | 'isOptimal'
    >,
  ): InstagramPostingSchedule {
    if (props.dayOfWeek < 0 || props.dayOfWeek > 6) {
      throw new Error(
        'Day of week must be between 0 (Sunday) and 6 (Saturday)',
      );
    }

    return new InstagramPostingSchedule({
      ...props,
      id: crypto.randomUUID(),
      isOptimal: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(
    props: InstagramPostingScheduleProps,
  ): InstagramPostingSchedule {
    return new InstagramPostingSchedule(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get clientAccountId(): string {
    return this.props.clientAccountId;
  }

  get dayOfWeek(): number {
    return this.props.dayOfWeek;
  }

  get dayName(): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[this.props.dayOfWeek];
  }

  get timeSlots(): string[] {
    return this.props.timeSlots;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get isOptimal(): boolean {
    return this.props.isOptimal;
  }

  get engagementScore(): number | undefined {
    return this.props.engagementScore;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  // Mutators
  updateTimeSlots(timeSlots: string[]): void {
    // Validate time format HH:MM
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
    for (const slot of timeSlots) {
      if (!timeRegex.test(slot)) {
        throw new Error(`Invalid time format: ${slot}. Expected HH:MM`);
      }
    }

    this.props.timeSlots = timeSlots;
    this.props.updatedAt = new Date();
  }

  updateTimezone(timezone: string): void {
    this.props.timezone = timezone;
    this.props.updatedAt = new Date();
  }

  setAsOptimal(engagementScore: number): void {
    if (engagementScore < 0 || engagementScore > 100) {
      throw new Error('Engagement score must be between 0 and 100');
    }

    this.props.isOptimal = true;
    this.props.engagementScore = engagementScore;
    this.props.updatedAt = new Date();
  }

  clearOptimal(): void {
    this.props.isOptimal = false;
    this.props.engagementScore = undefined;
    this.props.updatedAt = new Date();
  }

  setActive(isActive: boolean): void {
    this.props.isActive = isActive;
    this.props.updatedAt = new Date();
  }

  addTimeSlot(timeSlot: string): void {
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(timeSlot)) {
      throw new Error(`Invalid time format: ${timeSlot}. Expected HH:MM`);
    }

    if (!this.props.timeSlots.includes(timeSlot)) {
      this.props.timeSlots.push(timeSlot);
      this.props.timeSlots.sort(); // Keep sorted
      this.props.updatedAt = new Date();
    }
  }

  removeTimeSlot(timeSlot: string): void {
    this.props.timeSlots = this.props.timeSlots.filter(
      (slot) => slot !== timeSlot,
    );
    this.props.updatedAt = new Date();
  }

  hasTimeSlot(timeSlot: string): boolean {
    return this.props.timeSlots.includes(timeSlot);
  }

  toJSON(): InstagramPostingScheduleProps {
    return {
      ...this.props,
    };
  }
}
