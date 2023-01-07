import dnsjack from 'dnsjack'

interface options {
    hostsOverride: string[],
    target: string,
    port?: number
    server?: string
}
export function newDNSOverrideServer (opts: options) {
  const server = dnsjack.createServer(opts.server)
    .route(opts.hostsOverride, opts.target)
    .on('error', (err: unknown) => console.error(`[WARN] DNS resolve error: ${err}`))

  return {
    listen: (port: number, cb?: () => void) => {
      server.listen(port)
      cb && cb()
    },
    close: (cb: (...args:unknown[]) => void) => server.close(cb)
  }
}
