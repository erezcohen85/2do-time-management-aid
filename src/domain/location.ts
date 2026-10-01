import type { Area, Item, Project } from '@/types'

export interface Location {
  area?: Area
  project?: Project
}

/** Where an item lives: in a project (and its area), in an area only, or nowhere. */
export function locationOf(item: Pick<Item, 'projectId' | 'areaId'>, projects: Project[], areas: Area[]): Location {
  const project = item.projectId ? projects.find((p) => p.id === item.projectId) : undefined
  const areaId = project ? project.areaId : item.areaId
  return { project, area: areaId ? areas.find((a) => a.id === areaId) : undefined }
}

/** "Area / Project", "Area", "Project" or "". */
export function locationLabel(loc: Location): string {
  return [loc.area?.name, loc.project?.name].filter(Boolean).join(' / ')
}
