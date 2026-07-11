import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../App'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return { get length() { return values.size }, clear: () => values.clear(), getItem: key => values.get(key) ?? null, key: index => [...values.keys()][index] ?? null, removeItem: key => { values.delete(key) }, setItem: (key, value) => { values.set(key, value) } }
}

describe('app shell', () => {
  it('renders the first short video and navigates by keyboard', async () => {
    render(<App storage={memoryStorage()} />)
    expect(screen.getAllByText('婚礼开始第 7 秒，新娘死亡').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '改命礼物' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeTruthy()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getAllByText('王妃翻墙私逃，被抓现行').length).toBeGreaterThan(0)
  })

  it('toggles playback from the stage', async () => {
    render(<App storage={memoryStorage()} />)
    await userEvent.click(screen.getByRole('button', { name: '暂停或继续视频' }))
    expect(screen.getByText('已暂停')).toBeTruthy()
  })
})
