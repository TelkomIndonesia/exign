import { createServer } from '@outtacontrol/socks'
import { None } from '@outtacontrol/socks/lib/auth/None'

interface newSocks5ServerOptions {
    target: string
    hosts?: Map<string, unknown>,
    ports?: Map<number, unknown>
  }
export function newSocks5Server (opts: newSocks5ServerOptions) {
  return createServer(
    function (info, accept) {
      if (opts.ports && opts.ports.size > 0 && !opts.ports.get(info.dstPort)) {
        return accept()
      }

      if (opts.hosts && opts.hosts.size > 0 && !opts.hosts.get(info.dstAddr)) {
        return accept()
      }

      info.dstAddr = opts.target
      accept()
    })
    .useAuth(None())
}
