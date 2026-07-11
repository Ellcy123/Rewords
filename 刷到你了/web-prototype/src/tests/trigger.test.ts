import { describe, expect, it } from 'vitest'
import { findTrigger } from '../content/triggers'

describe('prototype trigger graph', () => {
  it.each([
    ['W001', 'ladder', 'W101'],
    ['K001', 'ladder', 'K101'],
    ['C001', 'recorder', 'C101'],
    ['W101', 'technician', 'W200'],
    ['W300', 'recorder', 'W301'],
    ['W301', 'projector', 'W400'],
    ['W001', 'technician', 'X001'],
    ['W101', 'ladder', 'X004'],
    ['W300', 'technician', 'X012'],
    ['W301', 'recorder', 'X016'],
    ['C001', 'ladder', 'X021'],
    ['K001', 'technician', 'X028'],
  ] as const)('%s + %s resolves to %s', (target, item, result) => {
    expect(findTrigger(target, item)?.resultNodeId).toBe(result)
  })
})
