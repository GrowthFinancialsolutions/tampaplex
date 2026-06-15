import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExplainTip } from './ExplainTip'

describe('ExplainTip', () => {
  it('hides content until toggled', () => {
    render(<ExplainTip title="Cap rate" body="Yearly income as a % of price." />)
    expect(screen.queryByText(/yearly income/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /explain cap rate/i }))
    expect(screen.getByText(/yearly income/i)).toBeInTheDocument()
  })
})
