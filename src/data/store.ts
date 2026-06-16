import type {
  Area,
  ChecklistItem,
  DBShape,
  ID,
  LinkItem,
  LinkParentType,
  LinkProvider,
  Project,
  Subtask,
  Task,
  UserSettings,
} from '@/types'
import { detectProvider, normalizeUrl, nowISO, uid } from '@/lib/utils'
import { seedDB } from './seed'

const STORAGE_KEY = '2do.db.v1'

/**
 * Reactive, localStorage-backed store. The UI reads via useSyncExternalStore
 * (see StoreContext). This is the single source of truth today; a Supabase
 * adapter can implement the same mutation surface later without touching the UI.
 */
class Store {
  private db: DBShape
  private listeners = new Set<() => void>()

  constructor() {
    this.db = this.load()
  }

  // ── persistence ──
  private load(): DBShape {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as DBShape
    } catch {
      /* fall through to seed */
    }
    const seeded = seedDB()
    this.persist(seeded)
    return seeded
  }

  private persist(db: DBShape) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      /* ignore quota errors */
    }
  }

  private commit(next: DBShape) {
    this.db = next
    this.persist(next)
    this.listeners.forEach((l) => l())
  }

  // ── subscription surface for useSyncExternalStore ──
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  getSnapshot = (): DBShape => this.db

  // ── settings ──
  updateSettings(patch: Partial<UserSettings>) {
    this.commit({ ...this.db, settings: { ...this.db.settings, ...patch } })
  }

  // ── areas ──
  addArea(name: string, color: string, icon?: string): Area {
    const area: Area = {
      id: uid(),
      name,
      color,
      icon,
      sortOrder: this.db.areas.length,
      createdAt: nowISO(),
    }
    this.commit({ ...this.db, areas: [...this.db.areas, area] })
    return area
  }
  updateArea(id: ID, patch: Partial<Area>) {
    this.commit({
      ...this.db,
      areas: this.db.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })
  }
  deleteArea(id: ID) {
    const projectIds = this.db.projects.filter((p) => p.areaId === id).map((p) => p.id)
    const next = { ...this.db, areas: this.db.areas.filter((a) => a.id !== id) }
    projectIds.forEach((pid) => this.cascadeProject(next, pid))
    next.projects = next.projects.filter((p) => p.areaId !== id)
    this.commit(next)
  }

  // ── projects ──
  addProject(areaId: ID, name: string): Project {
    const order = this.db.projects.filter((p) => p.areaId === areaId).length
    const project: Project = {
      id: uid(),
      areaId,
      name,
      sortOrder: order,
      createdAt: nowISO(),
    }
    this.commit({ ...this.db, projects: [...this.db.projects, project] })
    return project
  }
  updateProject(id: ID, patch: Partial<Project>) {
    this.commit({
      ...this.db,
      projects: this.db.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })
  }
  deleteProject(id: ID) {
    const next = { ...this.db }
    this.cascadeProject(next, id)
    next.projects = next.projects.filter((p) => p.id !== id)
    this.commit(next)
  }
  private cascadeProject(next: DBShape, projectId: ID) {
    const taskIds = next.tasks.filter((t) => t.projectId === projectId).map((t) => t.id)
    taskIds.forEach((tid) => this.cascadeTask(next, tid))
    next.tasks = next.tasks.filter((t) => t.projectId !== projectId)
    next.links = next.links.filter(
      (l) => !(l.parentType === 'project' && l.parentId === projectId),
    )
  }

  // ── tasks ──
  addTask(projectId: ID, title: string): Task {
    const order = this.db.tasks.filter((t) => t.projectId === projectId).length
    const task: Task = {
      id: uid(),
      projectId,
      title,
      completed: false,
      sortOrder: order,
      createdAt: nowISO(),
    }
    this.commit({ ...this.db, tasks: [...this.db.tasks, task] })
    return task
  }
  updateTask(id: ID, patch: Partial<Task>) {
    this.commit({
      ...this.db,
      tasks: this.db.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })
  }
  toggleTask(id: ID) {
    const task = this.db.tasks.find((t) => t.id === id)
    if (!task) return
    this.updateTask(id, {
      completed: !task.completed,
      completedAt: !task.completed ? nowISO() : null,
    })
  }
  deleteTask(id: ID) {
    const next = { ...this.db }
    this.cascadeTask(next, id)
    next.tasks = next.tasks.filter((t) => t.id !== id)
    this.commit(next)
  }
  reorderTasks(projectId: ID, orderedIds: ID[]) {
    const map = new Map(orderedIds.map((id, i) => [id, i]))
    this.commit({
      ...this.db,
      tasks: this.db.tasks.map((t) =>
        t.projectId === projectId && map.has(t.id) ? { ...t, sortOrder: map.get(t.id)! } : t,
      ),
    })
  }
  private cascadeTask(next: DBShape, taskId: ID) {
    const subIds = next.subtasks.filter((s) => s.taskId === taskId).map((s) => s.id)
    next.checklistItems = next.checklistItems.filter((c) => !subIds.includes(c.subtaskId))
    next.subtasks = next.subtasks.filter((s) => s.taskId !== taskId)
    next.links = next.links.filter(
      (l) =>
        !(l.parentType === 'task' && l.parentId === taskId) &&
        !(l.parentType === 'subtask' && subIds.includes(l.parentId)),
    )
  }

  // ── subtasks ──
  addSubtask(taskId: ID, title: string): Subtask {
    const order = this.db.subtasks.filter((s) => s.taskId === taskId).length
    const subtask: Subtask = {
      id: uid(),
      taskId,
      title,
      completed: false,
      sortOrder: order,
      createdAt: nowISO(),
    }
    this.commit({ ...this.db, subtasks: [...this.db.subtasks, subtask] })
    return subtask
  }
  updateSubtask(id: ID, patch: Partial<Subtask>) {
    this.commit({
      ...this.db,
      subtasks: this.db.subtasks.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }
  toggleSubtask(id: ID) {
    const s = this.db.subtasks.find((x) => x.id === id)
    if (s) this.updateSubtask(id, { completed: !s.completed })
  }
  deleteSubtask(id: ID) {
    this.commit({
      ...this.db,
      subtasks: this.db.subtasks
        .filter((s) => s.id !== id)
        // clear dangling waiting-on references
        .map((s) => (s.waitingOnSubtaskId === id ? { ...s, waitingOnSubtaskId: null } : s)),
      checklistItems: this.db.checklistItems.filter((c) => c.subtaskId !== id),
      links: this.db.links.filter((l) => !(l.parentType === 'subtask' && l.parentId === id)),
    })
  }

  // ── checklist items ──
  addChecklistItem(subtaskId: ID, text: string): ChecklistItem {
    const order = this.db.checklistItems.filter((c) => c.subtaskId === subtaskId).length
    const item: ChecklistItem = { id: uid(), subtaskId, text, completed: false, sortOrder: order }
    this.commit({ ...this.db, checklistItems: [...this.db.checklistItems, item] })
    return item
  }
  updateChecklistItem(id: ID, patch: Partial<ChecklistItem>) {
    this.commit({
      ...this.db,
      checklistItems: this.db.checklistItems.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })
  }
  toggleChecklistItem(id: ID) {
    const c = this.db.checklistItems.find((x) => x.id === id)
    if (c) this.updateChecklistItem(id, { completed: !c.completed })
  }
  deleteChecklistItem(id: ID) {
    this.commit({
      ...this.db,
      checklistItems: this.db.checklistItems.filter((c) => c.id !== id),
    })
  }

  // ── links ──
  addLink(parentType: LinkParentType, parentId: ID, rawUrl: string, title?: string): LinkItem {
    const url = normalizeUrl(rawUrl)
    const provider: LinkProvider = detectProvider(url)
    const order = this.db.links.filter(
      (l) => l.parentType === parentType && l.parentId === parentId,
    ).length
    const link: LinkItem = {
      id: uid(),
      parentType,
      parentId,
      url,
      title: title?.trim() || undefined,
      provider,
      sortOrder: order,
    }
    this.commit({ ...this.db, links: [...this.db.links, link] })
    return link
  }
  updateLink(id: ID, patch: Partial<LinkItem>) {
    this.commit({
      ...this.db,
      links: this.db.links.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })
  }
  deleteLink(id: ID) {
    this.commit({ ...this.db, links: this.db.links.filter((l) => l.id !== id) })
  }
}

export const store = new Store()
