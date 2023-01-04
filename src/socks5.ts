import { createServer } from '@outtacontrol/socks'
import { None } from '@outtacontrol/socks/lib/auth/None'

interface newSocks5ServerOptions {
    hostmap: Map<string, string>,
}
export function newSocks5Server (opts?: newSocks5ServerOptions) {
  return createServer(
    function (info, accept) {
      info.dstAddr = opts?.hostmap.get(info.dstAddr) ? '0.0.0.0' : info.dstAddr
      accept()
    })
    .useAuth(None())
}
