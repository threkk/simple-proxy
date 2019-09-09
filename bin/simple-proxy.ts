#! /usr/bin/env node
import { createProxy } from '../lib/index'
import { AddressInfo } from 'net'

const port: string = process.env.PORT || '8000'
const debug: boolean = process.env.NODE_ENV != 'production'

const proxy = createProxy(debug)

process.on('SIGINT', () => {
  console.log('Stopping the server...')

  setTimeout(() => {
    console.error('Server took too long, process shut down.')
  }, 5000)

  proxy.close(() => {
    console.log('Server stopped.')
    process.exit()
  })
})

console.log(`Starting server on port ${port}...`)
const proc = proxy.listen({ port }, () => {
  // We know it is not a unix socket or a pipe.
  const { address, port } = proc.address() as AddressInfo
  console.log(`Server running on ${address}:${port}`)
})
