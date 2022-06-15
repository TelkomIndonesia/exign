import Server, { createProxyServer as newProxyServer, ServerOptions } from 'http-proxy'

// https://github.com/http-party/node-http-proxy/issues/1586#issue-1246337115
function withCleanup (proxy: Server): Server {
  return proxy.on('proxyRes', (proxyRes, req, res) => {
    const cleanup = (err: Error) => {
      // cleanup event listeners to allow clean garbage collection
      proxyRes.removeListener('error', cleanup)
      proxyRes.removeListener('close', cleanup)
      res.removeListener('error', cleanup)
      res.removeListener('close', cleanup)

      // destroy all source streams to propagate the caught event backward
      req.destroy(err)
      proxyRes.destroy(err)
    }

    proxyRes.once('error', cleanup)
    proxyRes.once('close', cleanup)
    res.once('error', cleanup)
    res.once('close', cleanup)
  })
}

export function createProxyServer (opts: ServerOptions): Server {
  return withCleanup(newProxyServer(opts))
}
