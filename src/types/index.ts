export enum GoalCategory {
  Daily = 'daily',
  Weekly = 'weekly',
  Annual = 'annual',
}

export enum GoalStatus {
  Active = 'Active',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export type Goal = {
  id: string;
  name: string;
  description: string;

  category: GoalCategory;
  status: GoalStatus;

  createdAt?: string;
  updatedAt?: string;
  deletedAt?: null | string;
};

export type GoalForm = {
  name: string;
  description: string;
  category: GoalCategory;
};

export interface GoalCreateArgs {
  name: string;
  description: string;
  category: GoalCategory;
}

export interface GoalUpdateArgs {
  id: string;
  name: string;
  description: string;
  newCategory: GoalCategory;
  previousCategory: GoalCategory
}

export interface GoalDeleteArgs {
  id: string;
  category: GoalCategory;
}

export type Day = {
  id: string;
  data: Record<GoalCategory, Goal[]>;

  createdAt?: string;
  updatedAt?: string;
  deletedAt?: null | string;
};

export type Days = Record<string, Day>;