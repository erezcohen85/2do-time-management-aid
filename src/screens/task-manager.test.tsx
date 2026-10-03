import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { actions, makeItem } from '@/data/actions'
import { store } from '@/data/store'
import { resetStore } from '@/test/utils'

const go = (path: string) => window.history.pushState({}, '', path)
const items = () => store.getState().items
const seed = () => {
  actions.addArea({ id: 'a1', name: 'Home' })
  actions.addProject({ id: 'p1', areaId: 'a1', name: 'Admin' })
  actions.addItem(makeItem({ id: 'i1', title: 'Call accountant', projectId: 'p1' }))
  actions.addItem(makeItem({ id: 'i2', title: 'Tax form', projectId: 'p1' }))
  actions.addItem(makeItem({ id: 'i3', title: 'Loose thing' }))
}

beforeEach(() => {
  resetStore()
  localStorage.removeItem('2do.tm.view')
  go('/tasks')
})

describe('Task Manager: capture and grading', () => {
  it('shows an empty-state hint', () => {
    render(<App />)
    expect(screen.getByText(/Add your first task/)).toBeInTheDocument()
  })

  it('quick add with ⌘⇧A creates an ungraded item that shows in the inbox', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('{Meta>}{Shift>}a{/Shift}{/Meta}')
    await user.type(await screen.findByPlaceholderText('What needs doing?'), 'Call bank{Enter}')
    expect(items()).toHaveLength(1)
    expect(items()[0]).toMatchObject({ title: 'Call bank', grade: null, parentId: null, projectId: null })
    expect(within(screen.getByTestId('ungraded-inbox')).getByText('Call bank')).toBeInTheDocument()
  })

  it('one click grades an ungraded item and ranks it in its grade group', async () => {
    const user = userEvent.setup()
    seed()
    render(<App />)
    const inbox = screen.getByTestId('ungraded-inbox')
    const row = within(inbox).getByText('Call accountant').closest('[data-testid=item-row]') as HTMLElement
    await user.click(within(row).getByRole('radio', { name: /Grade A/ }))
    expect(items().find((i) => i.id === 'i1')).toMatchObject({ grade: 'A', gradeRank: 1 })
    const groupA = screen.getByTestId('grade-group-A')
    expect(within(groupA).getByText('Call accountant')).toBeInTheDocument()
    expect(within(groupA).getByTestId('rank')).toHaveTextContent('A1')
    expect(within(screen.getByTestId('ungraded-inbox')).queryByText('Call accountant')).not.toBeInTheDocument()

    const row2 = within(screen.getByTestId('ungraded-inbox')).getByText('Tax form').closest('[data-testid=item-row]') as HTMLElement
    await user.click(within(row2).getByRole('radio', { name: /Grade A/ }))
    const ranks = within(screen.getByTestId('grade-group-A')).getAllByTestId('rank').map((r) => r.textContent)
    expect(ranks).toEqual(['A1', 'A2'])
  })

  it('ticking an item moves it to Done', async () => {
    const user = userEvent.setup()
    seed()
    actions.setGrade('i1', 'A')
    render(<App />)
    await user.click(screen.getByRole('checkbox', { name: 'Mark “Call accountant” done' }))
    expect(items().find((i) => i.id === 'i1')!.done).toBe(true)
    await user.click(within(screen.getByTestId('done-group')).getByRole('button', { name: /Done/ }))
    expect(within(screen.getByTestId('done-group')).getByText('Call accountant')).toBeInTheDocument()
  })

  it('collapsed grade groups show their count and can be expanded', async () => {
    const user = userEvent.setup()
    seed()
    actions.setGrade('i1', 'C')
    render(<App />)
    const c = screen.getByTestId('grade-group-C')
    expect(c).toHaveTextContent('(1)')
    expect(within(c).queryByText('Call accountant')).not.toBeInTheDocument()
    await user.click(within(c).getByRole('button', { name: /C/ }))
    expect(within(c).getByText('Call accountant')).toBeInTheDocument()
  })

  it('marks blocked items as locked', () => {
    seed()
    actions.setGrade('i2', 'A')
    actions.updateItem('i2', { waitingOnId: 'i1' })
    render(<App />)
    expect(screen.getByLabelText('Waiting on “Call accountant”')).toBeInTheDocument()
  })
})

describe('Task Manager: By Project', () => {
  it('builds areas and projects and adds tasks inline', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: 'By Project' }))
    await user.click(screen.getByRole('button', { name: 'Add area' }))
    await user.type(await screen.findByPlaceholderText('Area name'), 'Home{Enter}')
    expect(store.getState().areas.map((a) => a.name)).toEqual(['Home'])
    await user.click(screen.getByRole('button', { name: 'Add project' }))
    await user.type(await screen.findByPlaceholderText('Project name'), 'Admin{Enter}')
    expect(store.getState().projects).toHaveLength(1)
    const block = screen.getByTestId('project-block')
    expect(within(block).queryByPlaceholderText('Add a task')).not.toBeInTheDocument()
    await user.click(within(block).getByRole('button', { name: 'Add a task to Admin' }))
    await user.type(within(block).getByPlaceholderText('Add a task'), 'Pay rent{Enter}')
    expect(items()[0]).toMatchObject({ title: 'Pay rent', projectId: store.getState().projects[0].id })
  })

  it('shows loose tasks and deleting an area keeps tasks as loose', async () => {
    const user = userEvent.setup()
    seed()
    localStorage.setItem('2do.tm.view', 'project')
    render(<App />)
    expect(within(screen.getByTestId('loose-tasks')).getByText('Loose thing')).toBeInTheDocument()
    await user.click(within(screen.getByTestId('area-block')).getByRole('button', { name: 'Home' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(store.getState().areas).toEqual([])
    expect(items().every((i) => i.projectId === null)).toBe(true)
    expect(within(screen.getByTestId('loose-tasks')).getByText('Call accountant')).toBeInTheDocument()
  })
})

describe('By Project: collapsing and the + next to titles', () => {
  beforeEach(() => localStorage.setItem('2do.tm.view', 'project'))

  it('areas and projects collapse and expand, and the choice is remembered', async () => {
    const user = userEvent.setup()
    seed()
    const { unmount } = render(<App />)
    const area = screen.getByTestId('area-block')
    expect(within(area).getByText('Call accountant')).toBeInTheDocument()
    await user.click(within(screen.getByTestId('project-block')).getByTestId('node-toggle'))
    expect(within(area).queryByText('Call accountant')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('project-block')).getByRole('button', { name: 'Expand Admin' })).toHaveAttribute('aria-expanded', 'false')
    await user.click(within(area).getAllByTestId('node-toggle')[0])
    expect(screen.queryByTestId('project-block')).not.toBeInTheDocument()
    unmount()
    render(<App />) // remembered after a reload
    expect(screen.queryByTestId('project-block')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Expand Home' }))
    expect(screen.getByTestId('project-block')).toBeInTheDocument()
    // the project inside stayed collapsed, as left
    expect(within(screen.getByTestId('project-block')).queryByText('Call accountant')).not.toBeInTheDocument()
  })

  it('no empty field by default; + opens a focused field, Enter creates and keeps it open, Esc closes', async () => {
    const user = userEvent.setup()
    seed()
    render(<App />)
    expect(screen.queryByPlaceholderText('Add a task')).not.toBeInTheDocument()
    const block = screen.getByTestId('project-block')
    await user.click(within(block).getByRole('button', { name: 'Add a task to Admin' }))
    const field = within(block).getByPlaceholderText('Add a task')
    expect(field).toHaveFocus()
    await user.keyboard('First{Enter}Second{Enter}')
    expect(items().filter((i) => i.projectId === 'p1').map((i) => i.title)).toEqual(expect.arrayContaining(['First', 'Second']))
    await user.keyboard('{Escape}')
    expect(within(block).queryByPlaceholderText('Add a task')).not.toBeInTheDocument()
  })

  it('+ on a collapsed node expands it and shows the field', async () => {
    const user = userEvent.setup()
    seed()
    render(<App />)
    await user.click(within(screen.getByTestId('project-block')).getByTestId('node-toggle'))
    await user.click(within(screen.getByTestId('project-block')).getByRole('button', { name: 'Add a task to Admin' }))
    expect(within(screen.getByTestId('project-block')).getByPlaceholderText('Add a task')).toHaveFocus()
    expect(within(screen.getByTestId('project-block')).getByRole('button', { name: 'Collapse Admin' })).toBeInTheDocument()
  })

  it('the + sits right after the title (reading order), in English and Hebrew', async () => {
    seed()
    const { unmount } = render(<App />)
    const order = (el: HTMLElement) => [...el.querySelectorAll('h2, [data-testid=node-add]')].map((n) => n.tagName)
    expect(order(screen.getByTestId('area-block').querySelector('[data-node=a1]')!.parentElement!)).toEqual(['H2', 'BUTTON'])
    unmount()
    actions.updateSettings({ language: 'he' })
    render(<App />)
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByTestId('area-block').querySelector('h2')!.nextElementSibling).toHaveAttribute('data-testid', 'node-add')
  })

  it('loose tasks collapse and add the same way', async () => {
    const user = userEvent.setup()
    seed()
    render(<App />)
    const loose = screen.getByTestId('loose-tasks')
    await user.click(within(loose).getByRole('button', { name: 'Add a task to Loose tasks' }))
    await user.type(within(loose).getByPlaceholderText('Add a task'), 'Stray{Enter}')
    expect(items().find((i) => i.title === 'Stray')).toMatchObject({ projectId: null })
    await user.click(within(loose).getByRole('button', { name: 'Collapse Loose tasks' }))
    expect(within(loose).queryByText('Stray')).not.toBeInTheDocument()
  })
})

describe('Tasks in an area without a project', () => {
  it('can be added inline under the area and shows area path in the grade view', async () => {
    const user = userEvent.setup()
    seed()
    localStorage.setItem('2do.tm.view', 'project')
    render(<App />)
    const area = screen.getByTestId('area-block')
    await user.click(within(area).getByRole('button', { name: 'Add a task to Home' }))
    await user.type(within(within(area).getByTestId('area-tasks')).getByPlaceholderText('Add a task'), 'Water plants{Enter}')
    const t = items().find((i) => i.title === 'Water plants')!
    expect(t).toMatchObject({ projectId: null, areaId: 'a1' })
    expect(within(within(area).getByTestId('area-tasks')).getByText('Water plants')).toBeInTheDocument()
    expect(within(screen.getByTestId('loose-tasks')).queryByText('Water plants')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ungraded-inbox')).not.toBeInTheDocument() // no inbox in By Project
    await user.click(screen.getByRole('radio', { name: 'By Grade' }))
    expect(within(screen.getByTestId('ungraded-inbox')).getByText('Water plants').closest('[data-testid=item-row]')).toHaveTextContent('Home')
  })

  it('quick add and the detail panel can pick an area without a project', async () => {
    const user = userEvent.setup()
    seed()
    const first = render(<App />)
    await user.keyboard('{Meta>}{Shift>}a{/Shift}{/Meta}')
    await user.type(await screen.findByPlaceholderText('What needs doing?'), 'Pay water bill')
    await user.click(screen.getByRole('combobox', { name: 'Project' }))
    await user.click(await screen.findByRole('option', { name: 'Home: no project' }))
    await user.click(screen.getByRole('button', { name: 'Add task' }))
    expect(items().find((i) => i.title === 'Pay water bill')).toMatchObject({ projectId: null, areaId: 'a1' })

    first.unmount()
    go('/tasks?item=i3')
    render(<App />)
    const d = within(await screen.findByTestId('item-detail'))
    await user.click(d.getByRole('combobox', { name: 'Project' }))
    await user.click(await screen.findByRole('option', { name: 'Home: no project' }))
    expect(items().find((i) => i.id === 'i3')).toMatchObject({ projectId: null, areaId: 'a1' })
  })

  it('deleting the area clears the placement; deleting a project keeps tasks in its area', () => {
    seed()
    actions.updateItem('i1', {})
    store.update((db) => ({ ...db, items: db.items.map((i) => (i.id === 'i3' ? { ...i, areaId: 'a1' } : i)) }))
    actions.deleteProject('p1')
    expect(items().find((i) => i.id === 'i1')).toMatchObject({ projectId: null, areaId: 'a1' })
    actions.deleteArea('a1')
    expect(items().every((i) => !i.areaId && !i.projectId)).toBe(true)
  })
})

describe('Item detail panel', () => {
  async function open(id: string) {
    go(`/tasks?item=${id}`)
    render(<App />)
    return within(await screen.findByTestId('item-detail'))
  }

  it('opens from the URL and edits the title on blur', async () => {
    const user = userEvent.setup()
    seed()
    const d = await open('i1')
    const title = d.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Call the accountant')
    await user.tab()
    expect(items().find((i) => i.id === 'i1')!.title).toBe('Call the accountant')
  })

  it('opens from a row click and closes with Escape', async () => {
    const user = userEvent.setup()
    seed()
    render(<App />)
    await user.click(within(screen.getByTestId('ungraded-inbox')).getByText('Tax form'))
    expect(await screen.findByTestId('item-detail')).toBeInTheDocument()
    expect(window.location.search).toBe('?item=i2')
    await user.keyboard('{Escape}')
    expect(window.location.search).toBe('')
  })

  it('sets grade, estimate and notes', async () => {
    const user = userEvent.setup()
    seed()
    const d = await open('i1')
    await user.click(d.getByRole('radio', { name: /Grade B/ }))
    expect(items().find((i) => i.id === 'i1')).toMatchObject({ grade: 'B', gradeRank: 1 })
    expect(d.getByTestId('detail-rank')).toHaveTextContent('B1')
    await user.type(d.getByLabelText('Estimate (min)'), '45')
    await user.tab()
    expect(items().find((i) => i.id === 'i1')!.estimateMin).toBe(45)
    await user.type(d.getByLabelText('Notes'), 'remember the receipts')
    await user.tab()
    expect(items().find((i) => i.id === 'i1')!.notes).toBe('remember the receipts')
  })

  it('SMART: toggle reveals fields, measurable shows progress, badge counts filled fields', async () => {
    const user = userEvent.setup()
    seed()
    const d = await open('i1')
    expect(d.queryByLabelText('Specific')).not.toBeInTheDocument()
    await user.click(d.getByRole('switch', { name: 'SMART goal' }))
    await user.type(d.getByLabelText('Specific'), 'File taxes')
    await user.tab()
    await user.type(d.getByLabelText('Measurable: what you measure'), 'forms')
    await user.tab()
    await user.type(d.getByLabelText('Target'), '4')
    await user.tab()
    await user.type(d.getByLabelText('Current'), '1')
    await user.tab()
    const it = items().find((i) => i.id === 'i1')!
    expect(it.smart).toMatchObject({ specific: 'File taxes', metric: 'forms', target: 4, current: 1 })
    expect(d.getByTestId('smart-progress')).toHaveTextContent('1 of 4 forms')
    await user.keyboard('{Escape}')
    expect(await screen.findByText('SMART 2/5')).toBeInTheDocument()
  })

  it('SMART toggle off clears the fields', async () => {
    const user = userEvent.setup()
    seed()
    actions.updateItem('i1', { smart: { specific: 'x' } })
    const d = await open('i1')
    await user.click(d.getByRole('switch', { name: 'SMART goal' }))
    expect(items().find((i) => i.id === 'i1')!.smart).toBeUndefined()
  })

  it('subtasks: add, grade independently, make the parent non-plannable', async () => {
    const user = userEvent.setup()
    seed()
    actions.setGrade('i1', 'A')
    const d = await open('i1')
    await user.type(d.getByLabelText('Add a subtask'), 'Gather receipts{Enter}')
    const sub = items().find((i) => i.parentId === 'i1')!
    expect(sub).toMatchObject({ title: 'Gather receipts', projectId: 'p1', grade: null })
    const box = within(d.getByTestId('subtasks'))
    await user.click(box.getByRole('radio', { name: /Grade C/ }))
    expect(items().find((i) => i.id === sub.id)!.grade).toBe('C')
    expect(items().find((i) => i.id === 'i1')!.grade).toBe('A')
  })

  it('checklist entries toggle and remove', async () => {
    const user = userEvent.setup()
    seed()
    const d = await open('i1')
    await user.type(d.getByLabelText('Add a checklist item'), 'passport{Enter}')
    expect(items().find((i) => i.id === 'i1')!.checklist).toMatchObject([{ text: 'passport', done: false }])
    await user.click(within(d.getByTestId('checklist')).getByRole('checkbox', { name: 'passport' }))
    expect(items().find((i) => i.id === 'i1')!.checklist[0].done).toBe(true)
    await user.click(within(d.getByTestId('checklist')).getByRole('button', { name: 'Remove' }))
    expect(items().find((i) => i.id === 'i1')!.checklist).toEqual([])
  })

  it('links: detects the provider, rejects garbage', async () => {
    const user = userEvent.setup()
    seed()
    const d = await open('i1')
    const input = d.getByLabelText('Paste a link')
    await user.type(input, 'not a link{Enter}')
    expect(d.getByText('That does not look like a link.')).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, 'https://github.com/erezcohen85/2do{Enter}')
    const chip = d.getByTestId('link-chip')
    expect(chip).toHaveTextContent('GitHub')
    expect(chip).toHaveAttribute('data-provider', 'github')
    expect(items().find((i) => i.id === 'i1')!.links).toHaveLength(1)
  })

  it('waiting on: picks a blocker and explains the block', async () => {
    const user = userEvent.setup()
    seed()
    const d = await open('i1')
    await user.click(d.getByRole('combobox', { name: 'Waiting on' }))
    await user.click(await screen.findByRole('option', { name: 'Tax form' }))
    expect(items().find((i) => i.id === 'i1')!.waitingOnId).toBe('i2')
    expect(d.getByText('Blocked until “Tax form” is done.')).toBeInTheDocument()
  })

  it('delete asks for confirmation and removes the item', async () => {
    const user = userEvent.setup()
    seed()
    const d = await open('i3')
    await user.click(d.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete', hidden: false }))
    expect(items().find((i) => i.id === 'i3')).toBeUndefined()
  })

  it('moves a task (and subtasks) to another project', async () => {
    seed()
    actions.addProject({ id: 'p2', areaId: 'a1', name: 'Travel' })
    actions.addItem(makeItem({ id: 's1', title: 'sub', parentId: 'i1', projectId: 'p1' }))
    act(() => actions.moveItemToProject('i1', 'p2'))
    expect(items().filter((i) => ['i1', 's1'].includes(i.id)).map((i) => i.projectId)).toEqual(['p2', 'p2'])
  })
})

describe('Search ⌘K', () => {
  it('finds a task and opens its detail', async () => {
    const user = userEvent.setup()
    seed()
    render(<App />)
    await user.keyboard('{Meta>}k{/Meta}')
    await user.type(await screen.findByPlaceholderText('Search tasks and projects…'), 'tax')
    expect(within(screen.getByRole('dialog')).queryByText('Loose thing')).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /Tax form/ }))
    expect(await screen.findByTestId('item-detail')).toBeInTheDocument()
    expect(window.location.search).toBe('?item=i2')
  })

  it('finds projects too', async () => {
    const user = userEvent.setup()
    seed()
    render(<App />)
    await user.keyboard('{Meta>}k{/Meta}')
    await user.type(await screen.findByPlaceholderText('Search tasks and projects…'), 'admin')
    await user.click(screen.getByRole('option', { name: /^Admin\s*Home$/ }))
    expect(await screen.findByTestId('project-detail')).toBeInTheDocument()
  })
})
