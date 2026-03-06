export interface Task {
  id: string;
  name: string;
  points: number;
  category?: string;
  completedAt?: string; // ISO timestamp; undefined = incomplete
  createdAt: string;    // ISO timestamp
}
