// ───────────────────────── 2DO domain model ─────────────────────────
// Mirrors the Supabase schema (see supabase/migrations). All ids are uuids.

export type ID = string

export type LinkProvider =
  | 'gdoc'
  | 'gsheet'
  | 'gslides'
  | 'gform'
  | 'gdrive'
  | 'web'

export type LinkParentType = 'project' | 'task' | 'subtask'

export type LinkDisplayMode = 'chips' | 'list'

export interface Area {
  id: ID
  name: string
  color: string // hex accent for the area dot
  icon?: string // optional emoji
  sortOrder: number
  createdAt: string
}

export interface Project {
  id: ID
  areaId: ID
  name: string
  description?: string
  sortOrder: number
  createdAt: string
}

export interface Task {
  id: ID
  projectId: ID
  title: string
  description?: string
  notes?: string
  dueAt?: string | null // ISO date (yyyy-mm-dd) or full ISO
  remindAt?: string | null
  completed: boolean
  completedAt?: string | null
  sortOrder: number
  createdAt: string
}

export interface Subtask {
  id: ID
  taskId: ID
  title: string
  completed: boolean
  waitingOnSubtaskId?: ID | null // gentle "waiting on" dependency
  sortOrder: number
  createdAt: string
}

export interface ChecklistItem {
  id: ID
  subtaskId: ID
  text: string
  completed: boolean
  sortOrder: number
}

export interface LinkItem {
  id: ID
  parentType: LinkParentType
  parentId: ID
  url: string
  title?: string
  provider: LinkProvider
  sortOrder: number
}

export interface UserSettings {
  linkDisplayMode: LinkDisplayMode
}

// The full in-memory database shape used by the local adapter.
export interface DBShape {
  areas: Area[]
  projects: Project[]
  tasks: Task[]
  subtasks: Subtask[]
  checklistItems: ChecklistItem[]
  links: LinkItem[]
  settings: UserSettings
}
