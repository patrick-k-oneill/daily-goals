import { GoalCreateArgs, GoalUpdateArgs, Goal, GoalStatus } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { del } from 'vue-demi'

export const createGoal = async (args: GoalCreateArgs) => {
  try {
    // get existing goals
    const storageGoals = localStorage.getItem('goals')
    const goals = storageGoals ? JSON.parse(storageGoals) : []
    // format new goal
    const newGoal = {
      id: uuidv4(),
      ...args,
      status: GoalStatus.Active,
      createdAt: new Date(Date.now()).toISOString(),
      updatedAt: new Date(Date.now()).toISOString(),
      deletedAt: null,
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

/**
 * Until DB CRUD flows are established: import
 * goals array from local storage, splice
 * in goal with updated args
 */
export const updateGoal = async (args: GoalUpdateArgs) => {
  try {
    // get existing goals
    const storageGoals = localStorage.getItem('goals')
    const goals = storageGoals ? JSON.parse(storageGoals) : []

    const goalIndex = goals.findIndex((item: Goal) => item.id === args.id)
    if (goalIndex === -1) return
    const goal: Goal = goals[goalIndex]

    // format updated goal
    const updatedGoal = {
      ...args,
      // ask Chris for less-verbose way to do this
      status: goal.status,
      createdAt: goal.createdAt,
      updatedAt: new Date(Date.now()).toISOString(),
      deletedAt: null,
    }

    // splice in updated goal
    goals.splice(goalIndex, 1, updatedGoal)
    localStorage.setItem('goals', JSON.stringify(goals))

    // return updated goal
    return updatedGoal
  } catch (error) {
    throw error
  }
}

/**
 * Until DB CRUD flows are established: define
 * goal's 'deletedAt' prop, splice back
 * into array. Used to style
 * deleted goal
 */
export const deleteGoal = async (id: string) => {
  try {
    // get existing goals
    const storageGoals = localStorage.getItem('goals')
    const goals = storageGoals ? JSON.parse(storageGoals) : []

    const goalIndex = goals.findIndex((item: Goal) => item.id === id)
    if (goalIndex === -1) return
    const goal: Goal = goals[goalIndex]

    // format deleted goal
    const deletedGoal: Goal = Object.assign({}, goal)
    deletedGoal.deletedAt = new Date(Date.now()).toISOString()

    // splice in deleted goal
    goals.splice(goalIndex, 1, deletedGoal)
    localStorage.setItem('goals', JSON.stringify(goals))

    // return deleted goal
    return deletedGoal
  } catch (error) {
    throw error
  }
}
