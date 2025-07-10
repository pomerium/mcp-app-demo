import type { Meta, StoryObj } from '@storybook/react'
import { ToolToggle } from './ToolToggle'
import { useState } from 'react'

const meta: Meta<typeof ToolToggle> = {
  title: 'UI/ToolToggle',
  component: ToolToggle,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      defaultValue: 'Tool',
    },
    tooltip: {
      control: 'text',
      defaultValue: 'Toggle this tool',
    },
    disabled: {
      control: 'boolean',
      defaultValue: false,
    },
    isSupported: {
      control: 'boolean',
      defaultValue: true,
    },
  },
}
export default meta

type Story = StoryObj<typeof ToolToggle>

const Template = (args: any) => {
  const [selected, setSelected] = useState(args.isSelected ?? false)
  return (
    <ToolToggle
      {...args}
      isSelected={selected}
      onToggle={setSelected}
      icon={
        <span role="img" aria-label="tool">
          🛠️
        </span>
      }
    />
  )
}

export const Default: Story = {
  render: Template,
  args: {
    isSelected: false,
    isSupported: true,
    label: 'Tool',
    tooltip: 'Toggle this tool',
    disabled: false,
  },
}

export const Enabled: Story = {
  render: Template,
  args: {
    isSelected: true,
    isSupported: true,
    label: 'Tool',
    tooltip: 'Toggle this tool',
    disabled: false,
  },
}

export const Disabled: Story = {
  render: Template,
  args: {
    isSelected: false,
    isSupported: true,
    label: 'Tool',
    tooltip: 'Toggle this tool',
    disabled: true,
  },
}

export const Unsupported: Story = {
  render: Template,
  args: {
    isSelected: false,
    isSupported: false,
    label: 'Tool',
    tooltip: 'This tool is not supported',
    disabled: false,
  },
}
