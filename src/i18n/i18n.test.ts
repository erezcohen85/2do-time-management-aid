import { catalogs, dirOf, translate } from '.'
import { en } from './en'
import { he } from './he'

describe('catalogs', () => {
  it('he has exactly the keys of en, all non-empty', () => {
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort())
    for (const [k, v] of Object.entries(catalogs.he)) expect(v, k).not.toBe('')
  })
  it('interpolates params and falls back to the key', () => {
    expect(translate('en', 'common.min')).toBe('min')
    expect(dirOf('he')).toBe('rtl')
    expect(dirOf('en')).toBe('ltr')
  })
})
