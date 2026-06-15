import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModeToggle } from './ModeToggle'

describe('ModeToggle', () => {
  it('calls onChange with the other mode when clicked', () => {
    const onChange = vi.fn()
    render(<ModeToggle mode="simple" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /pro/i }))
    expect(onChange).toHaveBeenCalledWith('pro')
  })
})
