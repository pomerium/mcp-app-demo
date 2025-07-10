export type ColorVariant =
  | 'reasoning'
  | 'processing'
  | 'error'
  | 'completed'
  | 'codecomplete'
  | 'toollist'
  | 'default'

export function getIconVariantStyles(variant: ColorVariant): string {
  switch (variant) {
    case 'processing':
      return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
    case 'codecomplete':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
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

export function getVariantStyles(variant: ColorVariant) {
  switch (variant) {
    case 'processing':
      return {
        background:
          'bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100',
        chevron: 'text-yellow-600 dark:text-yellow-300',
      }
    case 'toollist':
    case 'codecomplete':
      return {
        background:
          'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
        chevron: 'text-blue-600 dark:text-blue-300',
      }
    case 'error':
      return {
        background: 'bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
        chevron: 'text-red-600 dark:text-red-300',
      }
    case 'completed':
      return {
        background:
          'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
        chevron: 'text-green-600 dark:text-green-300',
      }
    case 'reasoning':
      return {
        background:
          'bg-purple-50 text-purple-900 dark:bg-purple-950 dark:text-purple-100',
        chevron: 'text-purple-600 dark:text-purple-300',
      }
    case 'default':
    default:
      return {
        background:
          'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
        chevron: 'text-gray-600 dark:text-gray-300',
      }
  }
}
