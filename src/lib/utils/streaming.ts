/**
 * Stops a response's readable stream from being processed further.
 * This is useful for halting streaming responses when needed.
 *
 * @param response The response object to modify.
 */
export function stopStreamProcessing(response: Response) {
  const emptyStream = new ReadableStream({
    start(controller) {
      controller.close()
    },
  })

  Object.defineProperty(response, 'body', {
    value: emptyStream,
  })
}
