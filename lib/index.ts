import { Socket, connect } from 'net'
import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import { URL } from 'url'

const WS = '\r\n'

function defaultHandler(_: IncomingMessage, res: ServerResponse): void {
  res
    .writeHead(405, 'Method not allowed', { 'Content-Type': 'text/plain' })
    .end()
}

const createConnectionHandler = (debug: boolean) =>
  function(req: IncomingMessage, conn: Socket, head: Buffer): void {
    const date = new Date(Date.now()).toISOString()
    if (debug) console.log(`[${date}][log] ${req.url}`)

    // Get the original URL requested.
    const { hostname, port } = new URL(`https://${req.url}`)
    if (!hostname) {
      console.error(`[${date}][server] No hostname found`)
      conn.end(`HTTP/1.1 400 Bad Request${WS}${WS}`)
    }

    // Establish the connection with the original target.
    const remote = connect(
      parseInt(port) || 443,
      hostname
    )

    // Attach all connection listeners.
    conn.on('close', () => conn.destroy())
    conn.on('error', err => {
      console.error(`[${date}][conn] ERROR: ${err.message}`)
      if (remote != null) remote.end()
    })
    conn.on('end', () => {
      if (remote != null) remote.end()
    })
    conn.on('timeout', () => {
      console.error(`[${date}][conn] ERROR: Connection timeout.`)
      conn.end(`HTTP/1.1 408 Request Timeout${WS}${WS}`)
      remote.destroy()
      conn.destroy()
    })

    // Attach all remote listeners.
    remote.on('close', () => remote.destroy())
    remote.on('error', err => {
      console.error(`[${date}][remote] ERROR: ${err.message}`)
      if (conn != null) conn.end(`HTTP/1.1 502 Bad Gateway${WS}${WS}`)
    })
    remote.on('end', () => {
      if (conn != null) conn.end()
    })
    remote.on('timeout', () => {
      console.error(`[${date}][remote] ERROR: Connection timeout.`)
      conn.end(`HTTP/1.1 504 Gateway Timeout${WS}${WS}`)
      conn.destroy()
      remote.destroy()
    })

    remote.on('connect', () => {
      // Initial message.
      const msg = [
        'HTTP/1.1 200 Connection Established',
        'Proxy-agent: simple-proxy',
        WS
      ].join(WS)
      conn.write(msg)

      // Write the original headers into the remote connection.
      remote.write(head)

      // Pipe each other.
      remote.pipe(conn)
      conn.pipe(remote)
    })
  }

function clientErrorHandler(_: Error, sock: Socket): void {
  sock.end(`HTTP/1.1 400 Bad Request${WS}${WS}`)
}

function errorHandler(err: Error) {
  console.error(err.message)
}

export function createProxy(debug: boolean = false): Server {
  const server = createServer(defaultHandler)
  const connectHandler = createConnectionHandler(debug)

  // Attach server handlers.
  server.on('connect', connectHandler)
  server.on('clientError', clientErrorHandler)
  server.on('error', errorHandler)

  return server
}

export default createProxy
