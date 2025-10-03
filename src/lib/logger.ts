import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isBrowser = typeof window !== 'undefined'

// Create a browser-compatible logger that uses console but in a structured way
const createBrowserLogger = (module: string) => {
  const enabled = !isTest || process.env.ENABLE_TEST_LOGGING === 'true'

  const formatMessage = (level: string, context: any, message: string) => {
    const logEntry = {
      level,
      service: 'mcp-app-demo',
      environment: process.env.NODE_ENV || 'development',
      module,
      ...context,
      msg: message,
      time: new Date().toISOString(),
    }
    return logEntry
  }

  return {
    debug: (context: any, message?: string) => {
      if (!enabled) return
      const msg = typeof context === 'string' ? context : message || ''
      const ctx = typeof context === 'string' ? {} : context
      if (!isProduction) {
        console.debug(formatMessage('debug', ctx, msg))
      }
    },
    info: (context: any, message?: string) => {
      if (!enabled) return
      const msg = typeof context === 'string' ? context : message || ''
      const ctx = typeof context === 'string' ? {} : context
      console.info(formatMessage('info', ctx, msg))
    },
    warn: (context: any, message?: string) => {
      if (!enabled) return
      const msg = typeof context === 'string' ? context : message || ''
      const ctx = typeof context === 'string' ? {} : context
      console.warn(formatMessage('warn', ctx, msg))
    },
    error: (context: any, message?: string) => {
      if (!enabled) return
      const msg = typeof context === 'string' ? context : message || ''
      const ctx = typeof context === 'string' ? {} : context
      console.error(formatMessage('error', ctx, msg))
    },
    fatal: (context: any, message?: string) => {
      if (!enabled) return
      const msg = typeof context === 'string' ? context : message || ''
      const ctx = typeof context === 'string' ? {} : context
      console.error(formatMessage('fatal', ctx, msg))
    },
    child: (_childContext: any) => createBrowserLogger(module),
  }
}

// Server-side logger using Pino
const createServerLogger = () => {
  return pino({
    // Log level configuration
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

    // Disable logging during tests unless explicitly enabled
    enabled: !isTest || process.env.ENABLE_TEST_LOGGING === 'true',

    // Pretty printing in development (optional)
    transport: !isProduction
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,

    // Base fields included in every log entry
    base: {
      service: 'mcp-app-demo',
      environment: process.env.NODE_ENV || 'development',
    },

    // Custom formatters
    formatters: {
      level: (label) => {
        return { level: label }
      },
    },
  })
}

// Create appropriate logger based on environment
export const logger = isBrowser ? createBrowserLogger('app') : createServerLogger()

// Create child loggers for different modules
export const createLogger = (module: string) => {
  return isBrowser ? createBrowserLogger(module) : logger.child({ module })
}

// Context interface for structured logging
export interface LogContext {
  userId?: string
  requestId?: string
  sessionId?: string
  correlationId?: string
  operation?: string
  [key: string]: any
}

// Create logger with context
export const logWithContext = (context: LogContext) => {
  return logger.child(context)
}
