import type { Meta, StoryObj } from '@storybook/react'
import { WebSearchToggle } from './WebSearchToggle'
import { useState } from 'react'

const meta: Meta<typeof WebSearchToggle> = {
  title: 'UI/WebSearchToggle',
  component: WebSearchToggle,
  tags: ['autodocs'],
  argTypes: {
    selectedModel: {
      control: 'text',
      defaultValue: 'gpt-4',
    },
    disabled: {
      control: 'boolean',
      defaultValue: false,
    },
  },
}
export default meta

type Story = StoryObj<typeof WebSearchToggle>

const Template = (args: any) => {
  const [enabled, setEnabled] = useState(args.useWebSearch ?? false)
  return (
    <WebSearchToggle {...args} useWebSearch={enabled} onToggle={setEnabled} />
  )
}

export const Default: Story = {
  render: Template,
  args: {
    useWebSearch: false,
    selectedModel: 'gpt-4',
    disabled: false,
  },
}

export const Enabled: Story = {
  render: Template,
  args: {
    useWebSearch: true,
    selectedModel: 'gpt-4',
    disabled: false,
  },
}

export const Disabled: Story = {
  render: Template,
  args: {
    useWebSearch: false,
    selectedModel: 'gpt-4',
    disabled: true,
  },
}

export const UnsupportedModel: Story = {
  render: Template,
  args: {
    useWebSearch: false,
    selectedModel: 'unsupported-model',
    disabled: false,
  },
}
