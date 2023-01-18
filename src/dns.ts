import dnsjack from 'dnsjack'

interface options {
    hosts: string[],
    address: string,
    port?: number
    resolver?: string
}
export function newDNSOverrideServer (opts: options) {
  const server = dnsjack.createServer(opts.resolver)
    .route(opts.hosts, opts.address)
    .on('error', (err: unknown) => console.error(`[WARN] DNS resolve error: ${err}`))

  return {
    listen: (port: number, cb?: () => void) => {
      server.listen(port)
      cb && setImmediate(cb)
    },
    close: (cb: (...args:unknown[]) => void) => server.close(cb)
  }
}
