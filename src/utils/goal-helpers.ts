import { GoalCreateArgs, GoalStatus } from '@/types'

export const createGoal = async (args: GoalCreateArgs) => {
    try {
        // get existing goals
        const storageGoals = localStorage.getItem('goals')
        const goals = storageGoals ? JSON.parse(storageGoals) : []

        // format new goal
        const newGoal = {
            // TODO :: generate unique id
            id: 'generate-unique-id', 
            ...args,
            status: GoalStatus.Active,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            deletedAt: null
        }

        // save goals
        goals.push(newGoal)
        localStorage.setItem('goals', JSON.stringify(goals))

        // return newly created goal
        return newGoal

    } catch (error) {
        throw error
    }
}