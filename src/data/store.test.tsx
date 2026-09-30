import { act, render, screen } from '@testing-library/react'
import { emptyDb } from './defaults'
import { useDb } from './hooks'
import { localStoragePersistence, normalizeDb, STORAGE_KEY } from './persistence'
import { createStore } from './store'
import { addArea } from './mutations'
import { store } from './store'
import { bindActions } from './actions'

describe('persistence', () => {
  it('returns an empty db when nothing is stored or data is corrupt', () => {
    const p = localStoragePersistence()
    expect(p.load()).toEqual(emptyDb())
    localStorage.setItem(STORAGE_KEY, '{oops')
    expect(p.load()).toEqual(emptyDb())
  })
  it('round-trips', () => {
    const p = localStoragePersistence()
    const db = addArea(emptyDb(), { id: 'a', name: 'Home' })
    p.save(db)
    expect(p.load().areas[0].name).toBe('Home')
  })
  it('fills missing keys from older data', () => {
    const db = normalizeDb({ areas: [], settings: { ritual: { time: '20:15' }, theme: 'dark' } })
    expect(db.settings.ritual).toEqual({ mode: 'evening', time: '20:15', reminder: true })
    expect(db.settings.theme).toBe('dark')
    expect(db.settings.timer.pomodoro.workMin).toBe(25)
    expect(db.items).toEqual([])
  })
  it('uses the v2 key', () => {
    expect(STORAGE_KEY).toBe('2do.db.v2')
  })
})

describe('store', () => {
  it('notifies on change, not on identity no-ops, and persists', () => {
    const p = localStoragePersistence()
    const s = createStore(p)
    let calls = 0
    const off = s.subscribe(() => calls++)
    s.update((db) => addArea(db, { id: 'a', name: 'Home' }))
    s.update((db) => db)
    expect(calls).toBe(1)
    expect(p.load().areas).toHaveLength(1)
    off()
    s.update((db) => addArea(db, { id: 'b', name: 'Work' }))
    expect(calls).toBe(1)
  })
  it('binds mutations as actions', () => {
    const s = createStore(localStoragePersistence())
    const actions = bindActions(s)
    actions.addArea({ id: 'a', name: 'Home' })
    actions.renameArea('a', 'House')
    expect(s.getState().areas[0].name).toBe('House')
  })
})

describe('useDb', () => {
  it('re-renders when the slice changes', () => {
    function Areas() {
      const areas = useDb((db) => db.areas)
      return <p>{areas.map((a) => a.name).join(',') || 'none'}</p>
    }
    render(<Areas />)
    expect(screen.getByText('none')).toBeInTheDocument()
    act(() => store.update((db) => addArea(db, { id: 'a', name: 'Home' })))
    expect(screen.getByText('Home')).toBeInTheDocument()
    act(() => store.reload())
  })
})
