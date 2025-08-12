import { useState } from 'react'
import { BackgroundToggle } from './BackgroundToggle'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta: Meta<typeof BackgroundToggle> = {
  title: 'UI/BackgroundToggle',
  component: BackgroundToggle,
  tags: ['autodocs'],
  argTypes: {
    selectedModel: {
      control: 'select',
      options: ['gpt-4o', 'gpt-4.1', 'gpt-3.5-turbo', 'claude-3-opus'],
      defaultValue: 'gpt-4o',
    },
    disabled: {
      control: 'boolean',
      defaultValue: false,
    },
    maxJobsReached: {
      control: 'boolean',
      defaultValue: false,
    },
  },
}
export default meta

type Story = StoryObj<typeof BackgroundToggle>

const Template = (args: any) => {
  const [useBackground, setUseBackground] = useState(
    args.useBackground ?? false,
  )
  return (
    <BackgroundToggle
      {...args}
      useBackground={useBackground}
      onToggle={setUseBackground}
    />
  )
}

export const Default: Story = {
  render: Template,
  args: {
    useBackground: false,
    selectedModel: 'gpt-4o',
    disabled: false,
    maxJobsReached: false,
  },
}

export const Enabled: Story = {
  render: Template,
  args: {
    useBackground: true,
    selectedModel: 'gpt-4o',
    disabled: false,
    maxJobsReached: false,
  },
}

export const Disabled: Story = {
  render: Template,
  args: {
    useBackground: false,
    selectedModel: 'gpt-4o',
    disabled: true,
    maxJobsReached: false,
  },
}

export const UnsupportedModel: Story = {
  render: Template,
  args: {
    useBackground: false,
    selectedModel: 'gpt-3.5-turbo',
    disabled: false,
    maxJobsReached: false,
  },
}

export const MaxJobsReached: Story = {
  render: Template,
  args: {
    useBackground: false,
    selectedModel: 'gpt-4o',
    disabled: false,
    maxJobsReached: true,
  },
}

export const UnsupportedModelWithMaxJobs: Story = {
  render: Template,
  args: {
    useBackground: false,
    selectedModel: 'claude-3-opus',
    disabled: false,
    maxJobsReached: true,
  },
}
