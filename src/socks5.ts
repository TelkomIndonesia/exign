import { createServer } from '@outtacontrol/socks'
import { None } from '@outtacontrol/socks/lib/auth/None'

interface newSocks5ServerOptions {
    target: string
    hostmap?: Map<string, string>,
  }
export function newSocks5Server (opts: newSocks5ServerOptions) {
  return createServer(
    function (info, accept) {
      if (opts.hostmap && opts.hostmap.size > 0) {
        info.dstAddr = opts.hostmap.get(info.dstAddr)
          ? opts.target
          : info.dstAddr
      } else {
        info.dstAddr = opts.target
      }

      accept()
    })
    .useAuth(None())
}
