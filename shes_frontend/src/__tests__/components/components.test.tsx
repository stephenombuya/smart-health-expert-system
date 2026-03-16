/**
 * SHES Tests – UI Component Tests
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/common/Button'
import { Input, Select, Textarea } from '@/components/common/Input'
import {
  Card, Badge, UrgencyBadge, MoodBadge,
  Spinner, EmptyState, ErrorMessage, SuccessMessage,
  StatCard, PageHeader,
} from '@/components/common'

// ─── Button ───────────────────────────────────────────────────────────────────
describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handler = vi.fn()
    render(<Button onClick={handler}>Go</Button>)
    await userEvent.click(screen.getByText('Go'))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Saving</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows spinner when loading', () => {
    render(<Button loading>Saving</Button>)
    expect(document.querySelector('svg.animate-spin')).toBeTruthy()
  })

  it('is disabled when disabled prop passed', () => {
    render(<Button disabled>No</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const handler = vi.fn()
    render(<Button disabled onClick={handler}>Nope</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('applies fullWidth class', () => {
    render(<Button fullWidth>Wide</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })

  it('renders leftIcon', () => {
    render(<Button leftIcon={<span data-testid="icon">★</span>}>With Icon</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('applies danger variant styles', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })
})

// ─── Input ────────────────────────────────────────────────────────────────────
describe('Input', () => {
  it('renders label', () => {
    render(<Input label="Email" id="email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<Input label="Email" id="email" error="Invalid email" />)
    expect(screen.getByText(/Invalid email/)).toBeInTheDocument()
  })

  it('shows helper text when no error', () => {
    render(<Input label="Email" id="email" helper="We will never spam you" />)
    expect(screen.getByText('We will never spam you')).toBeInTheDocument()
  })

  it('hides helper text when error present', () => {
    render(<Input label="Email" id="email" error="Bad" helper="Helper" />)
    expect(screen.queryByText('Helper')).not.toBeInTheDocument()
  })

  it('shows required asterisk', () => {
    render(<Input label="Name" id="name" required />)
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('accepts user input', async () => {
    render(<Input id="test" label="Test" />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'hello')
    expect((input as HTMLInputElement).value).toBe('hello')
  })

  it('is disabled when disabled prop is set', () => {
    render(<Input id="test" label="Test" disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})

// ─── Select ───────────────────────────────────────────────────────────────────
describe('Select', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]

  it('renders all options', () => {
    render(<Select id="sel" label="Pick" options={options} />)
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('renders placeholder option', () => {
    render(<Select id="sel" label="Pick" options={options} placeholder="Choose one" />)
    expect(screen.getByText('Choose one')).toBeInTheDocument()
  })
})

// ─── Textarea ─────────────────────────────────────────────────────────────────
describe('Textarea', () => {
  it('renders label and textarea', () => {
    render(<Textarea id="notes" label="Notes" />)
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})

// ─── Card ─────────────────────────────────────────────────────────────────────
describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content here</Card>)
    expect(screen.getByText('Content here')).toBeInTheDocument()
  })

  it('calls onClick', async () => {
    const handler = vi.fn()
    render(<Card onClick={handler}>Click card</Card>)
    await userEvent.click(screen.getByText('Click card'))
    expect(handler).toHaveBeenCalledOnce()
  })
})

// ─── Badge ────────────────────────────────────────────────────────────────────
describe('Badge', () => {
  it('renders text', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
  it('applies variant class', () => {
    const { container } = render(<Badge variant="danger">Danger</Badge>)
    expect(container.firstChild).toHaveClass('bg-red-100')
  })
})

// ─── UrgencyBadge ────────────────────────────────────────────────────────────
describe('UrgencyBadge', () => {
  it('shows Emergency label', () => {
    render(<UrgencyBadge level="emergency" />)
    expect(screen.getByText('Emergency')).toBeInTheDocument()
  })
  it('shows Self-Care label', () => {
    render(<UrgencyBadge level="self_care" />)
    expect(screen.getByText('Self-Care')).toBeInTheDocument()
  })
})

// ─── MoodBadge ───────────────────────────────────────────────────────────────
describe('MoodBadge', () => {
  it('renders mood category', () => {
    render(<MoodBadge category="excellent" />)
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })
})

// ─── Spinner ─────────────────────────────────────────────────────────────────
describe('Spinner', () => {
  it('renders SVG', () => {
    const { container } = render(<Spinner />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})

// ─── EmptyState ───────────────────────────────────────────────────────────────
describe('EmptyState', () => {
  it('renders title and message', () => {
    render(<EmptyState title="Nothing here" message="Add something to get started." />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.getByText('Add something to get started.')).toBeInTheDocument()
  })

  it('renders action button', () => {
    render(<EmptyState title="Empty" action={<button>Add</button>} />)
    expect(screen.getByText('Add')).toBeInTheDocument()
  })
})

// ─── ErrorMessage ─────────────────────────────────────────────────────────────
describe('ErrorMessage', () => {
  it('renders message text', () => {
    render(<ErrorMessage message="Something went wrong." />)
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
  })
})

// ─── SuccessMessage ───────────────────────────────────────────────────────────
describe('SuccessMessage', () => {
  it('renders message text', () => {
    render(<SuccessMessage message="Saved successfully." />)
    expect(screen.getByText('Saved successfully.')).toBeInTheDocument()
  })
})

// ─── StatCard ─────────────────────────────────────────────────────────────────
describe('StatCard', () => {
  it('renders label, value, and unit', () => {
    render(<StatCard label="Glucose" value={95} unit="mg/dL" />)
    expect(screen.getByText('Glucose')).toBeInTheDocument()
    expect(screen.getByText('95')).toBeInTheDocument()
    expect(screen.getByText('mg/dL')).toBeInTheDocument()
  })
})

// ─── PageHeader ───────────────────────────────────────────────────────────────
describe('PageHeader', () => {
  it('renders title and subtitle', () => {
    render(<PageHeader title="Dashboard" subtitle="Overview of your health" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Overview of your health')).toBeInTheDocument()
  })
  it('renders action element', () => {
    render(<PageHeader title="Test" action={<button>New</button>} />)
    expect(screen.getByText('New')).toBeInTheDocument()
  })
})
