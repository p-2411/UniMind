// TypeScript types matching backend database models

export interface Assessment {
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  due_at: string | null; // ISO 8601 datetime string
  weight: number | null; // percentage (e.g., 20.00 for 20%)
  created_at: string; // ISO 8601 datetime string
}

export interface Topic {
  id: string;
  course_code: string;
  name: string;
  description: string | null;
  created_at: string; // ISO 8601 datetime string
}

export interface Course {
  code: string;
  name: string;
  created_at: string; // ISO 8601 datetime string
}

export interface DailyStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null; // ISO 8601 date string
  updated_at: string; // ISO 8601 datetime string
}