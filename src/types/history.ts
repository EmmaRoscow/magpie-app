export interface DaySnapshot {
  periodStart: string; // ISO timestamp of previous reset (start of this period)
  periodEnd: string;   // ISO timestamp of this reset (end of this period)
  points: number;      // total points earned during this period
}
