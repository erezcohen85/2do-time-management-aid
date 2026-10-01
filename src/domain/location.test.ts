import { locationLabel, locationOf } from './location'

const areas = [{ id: 'a1', name: 'Home', order: 1 }]
const projects = [{ id: 'p1', areaId: 'a1', name: 'Admin', order: 1, archived: false }]

describe('location', () => {
  it('project implies its area', () => {
    expect(locationLabel(locationOf({ projectId: 'p1', areaId: null }, projects, areas))).toBe('Home / Admin')
  })
  it('area-only task', () => {
    expect(locationLabel(locationOf({ projectId: null, areaId: 'a1' }, projects, areas))).toBe('Home')
  })
  it('loose task, missing refs', () => {
    expect(locationLabel(locationOf({ projectId: null }, projects, areas))).toBe('')
    expect(locationLabel(locationOf({ projectId: 'gone', areaId: 'gone' }, projects, areas))).toBe('')
  })
})
