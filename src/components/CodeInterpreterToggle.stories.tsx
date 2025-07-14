import { useState } from 'react'
import { CodeInterpreterToggle } from './CodeInterpreterToggle'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta: Meta<typeof CodeInterpreterToggle> = {
  title: 'UI/CodeInterpreterToggle',
  component: CodeInterpreterToggle,
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

type Story = StoryObj<typeof CodeInterpreterToggle>

const Template = (args: any) => {
  const [enabled, setEnabled] = useState(args.useCodeInterpreter ?? false)
  return (
    <CodeInterpreterToggle
      {...args}
      useCodeInterpreter={enabled}
      onToggle={setEnabled}
    />
  )
}

export const Default: Story = {
  render: Template,
  args: {
    useCodeInterpreter: false,
    selectedModel: 'gpt-4',
    disabled: false,
  },
}

export const Enabled: Story = {
  render: Template,
  args: {
    useCodeInterpreter: true,
    selectedModel: 'gpt-4',
    disabled: false,
  },
}

export const Disabled: Story = {
  render: Template,
  args: {
    useCodeInterpreter: false,
    selectedModel: 'gpt-4',
    disabled: true,
  },
}

export const UnsupportedModel: Story = {
  render: Template,
  args: {
    useCodeInterpreter: false,
    selectedModel: 'unsupported-model',
    disabled: false,
  },
}
