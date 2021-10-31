export enum GoalCategory {
    Daily = 'Daily',
    Weekly = 'Weekly',
    Annual = 'Annual',
}

export enum GoalStatus {
    Active = 'Active',
    Completed = 'Completed',
    Cancelled = 'Cancelled',
}

export type Goal = {
    id: string;
    name: string;
    description?: string;
    
    category: GoalCategory;
    status: GoalStatus;
    
    // created/maintained by backend
    createdAt?: string; // set at creation, never updated
    updatedAt?: string; // update each time you update the goal
    deletedAt?: null | string; // for handling soft deletes
}

export interface GoalCreateArgs {
    name: string;
    description: string;
    category: GoalCategory;
}

export type GoalGroup = {
    name: GoalCategory;
    goals: Goal[];
}



    // const goalCategories = reactive<GoalGroup[]>([
    //     {
    //         name: GoalCategory.Daily,
    //         goals: [
    //             {
    //                 id: '1',
    //                 name: 'Read a book',
    //                 description: 'Read a book',
    //                 category: GoalCategory.Daily,
    //                 progress: 0,
    //                 target: 1,
    //                 isCompleted: true,
    //             },
    //             {
    //                 id: '2',
    //                 name: 'Learn a new language',
    //                 description: 'Learn a new language',
    //                 category: GoalCategory.Daily,
    //                 progress: 0,
    //                 target: 1,
    //                 isCompleted: false,
    //             },
    //         ],
    //     },
    //     {
    //         name: GoalCategory.Weekly,
    //         goals: [
    //             {
    //                 id: '3',
    //                 name: 'Learn a new language',
    //                 description: 'Learn a new language',
    //                 category: GoalCategory.Weekly,
    //                 progress: 0,
    //                 target: 1,
    //                 isCompleted: false,
    //             },
    //             {
    //                 id: '4',
    //                 name: 'Read a book',
    //                 description: 'Read a book',
    //                 category: GoalCategory.Weekly,
    //                 progress: 0,
    //                 target: 1,
    //                 isCompleted: false,
    //             },
    //         ],
    //     },
    //     {
    //         name: GoalCategory.Annual,
    //         goals: [
    //             {
    //                 id: '5',
    //                 name: 'Read a book',
    //                 description: 'Read a book',
    //                 category: GoalCategory.Annual,
    //                 progress: 0,
    //                 target: 1,
    //                 isCompleted: false,
    //             },
    //             {
    //                 id: '6',
    //                 name: 'Learn a new language',
    //                 description: 'Learn a new language',
    //                 category: GoalCategory.Annual,
    //                 progress: 0,
    //                 target: 1,
    //                 isCompleted: false,
    //             },
    //         ],
    //     },
    // ])