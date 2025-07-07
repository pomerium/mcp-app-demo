export type ColorVariant =
  | 'reasoning'
  | 'processing'
  | 'toollist'
  | 'error'
  | 'completed'
  | 'default'

export function getIconVariantStyles(variant: ColorVariant): string {
  switch (variant) {
    case 'processing':
      return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
    case 'toollist':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
    case 'error':
      return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
    case 'completed':
      return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
    case 'reasoning':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
    case 'default':
    default:
      return 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
  }
}
