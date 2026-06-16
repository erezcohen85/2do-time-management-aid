import type { DBShape } from '@/types'
import { uid, nowISO } from '@/lib/utils'

// First-run sample content so the app never feels empty.
export function seedDB(): DBShape {
  const now = nowISO()

  const areaPersonal = uid()
  const areaWork = uid()

  const projHome = uid()
  const projHealth = uid()
  const projLaunch = uid()

  const taskGroceries = uid()
  const taskRenew = uid()
  const taskGym = uid()
  const taskLaunch = uid()

  const subPlan = uid()
  const subCopy = uid()
  const subShip = uid()

  return {
    settings: { linkDisplayMode: 'chips' },
    areas: [
      {
        id: areaPersonal,
        name: 'Personal',
        color: '#10b981',
        icon: '🏡',
        sortOrder: 0,
        createdAt: now,
      },
      {
        id: areaWork,
        name: 'Work',
        color: '#4f46e5',
        icon: '💼',
        sortOrder: 1,
        createdAt: now,
      },
    ],
    projects: [
      { id: projHome, areaId: areaPersonal, name: 'Home & Errands', sortOrder: 0, createdAt: now },
      { id: projHealth, areaId: areaPersonal, name: 'Health', sortOrder: 1, createdAt: now },
      {
        id: projLaunch,
        areaId: areaWork,
        name: 'Product Launch',
        description: 'Everything for the v1 launch.',
        sortOrder: 0,
        createdAt: now,
      },
    ],
    tasks: [
      {
        id: taskGroceries,
        projectId: projHome,
        title: 'Weekly groceries',
        completed: false,
        sortOrder: 0,
        createdAt: now,
      },
      {
        id: taskRenew,
        projectId: projHome,
        title: 'Renew car insurance',
        dueAt: todayPlus(2),
        completed: false,
        sortOrder: 1,
        createdAt: now,
      },
      {
        id: taskGym,
        projectId: projHealth,
        title: 'Book gym induction',
        completed: false,
        sortOrder: 0,
        createdAt: now,
      },
      {
        id: taskLaunch,
        projectId: projLaunch,
        title: 'Prepare launch announcement',
        description: 'Coordinate copy, design, and the go-live checklist.',
        dueAt: todayPlus(0),
        completed: false,
        sortOrder: 0,
        createdAt: now,
      },
    ],
    subtasks: [
      { id: subPlan, taskId: taskLaunch, title: 'Draft the plan', completed: true, sortOrder: 0, createdAt: now },
      {
        id: subCopy,
        taskId: taskLaunch,
        title: 'Write announcement copy',
        completed: false,
        waitingOnSubtaskId: subPlan,
        sortOrder: 1,
        createdAt: now,
      },
      {
        id: subShip,
        taskId: taskLaunch,
        title: 'Schedule the post',
        completed: false,
        waitingOnSubtaskId: subCopy,
        sortOrder: 2,
        createdAt: now,
      },
    ],
    checklistItems: [
      { id: uid(), subtaskId: subCopy, text: 'Hook / headline', completed: false, sortOrder: 0 },
      { id: uid(), subtaskId: subCopy, text: 'Body', completed: false, sortOrder: 1 },
      { id: uid(), subtaskId: subCopy, text: 'Call to action', completed: false, sortOrder: 2 },
    ],
    links: [
      {
        id: uid(),
        parentType: 'task',
        parentId: taskLaunch,
        url: 'https://docs.google.com/document/d/example/edit',
        title: 'Launch brief',
        provider: 'gdoc',
        sortOrder: 0,
      },
    ],
  }
}

function todayPlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
