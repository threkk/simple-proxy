"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net_1 = require("net");
var http_1 = require("http");
var url_1 = require("url");
var WS = '\r\n';
function defaultHandler(_, res) {
    res
        .writeHead(405, 'Method not allowed', { 'Content-Type': 'text/plain' })
        .end();
}
var createConnectionHandler = function (debug) {
    return function (req, conn, head) {
        var date = new Date(Date.now()).toISOString();
        if (debug)
            console.log("[" + date + "][log] " + req.url);
        // Get the original URL requested.
        var _a = new url_1.URL("https://" + req.url), hostname = _a.hostname, port = _a.port;
        if (!hostname) {
            console.error("[" + date + "][server] No hostname found");
            conn.end("HTTP/1.1 400 Bad Request" + WS + WS);
        }
        // Establish the connection with the original target.
        var remote = net_1.connect(parseInt(port) || 443, hostname);
        // Attach all connection listeners.
        conn.on('close', function () { return conn.destroy(); });
        conn.on('error', function (err) {
            console.error("[" + date + "][conn] ERROR: " + err.message);
            if (remote != null)
                remote.end();
        });
        conn.on('end', function () {
            if (remote != null)
                remote.end();
        });
        conn.on('timeout', function () {
            console.error("[" + date + "][conn] ERROR: Connection timeout.");
            conn.end("HTTP/1.1 408 Request Timeout" + WS + WS);
            remote.destroy();
            conn.destroy();
        });
        // Attach all remote listeners.
        remote.on('close', function () { return remote.destroy(); });
        remote.on('error', function (err) {
            console.error("[" + date + "][remote] ERROR: " + err.message);
            if (conn != null)
                conn.end("HTTP/1.1 502 Bad Gateway" + WS + WS);
        });
        remote.on('end', function () {
            if (conn != null)
                conn.end();
        });
        remote.on('timeout', function () {
            console.error("[" + date + "][remote] ERROR: Connection timeout.");
            conn.end("HTTP/1.1 504 Gateway Timeout" + WS + WS);
            conn.destroy();
            remote.destroy();
        });
        remote.on('connect', function () {
            // Initial message.
            var msg = [
                'HTTP/1.1 200 Connection Established',
                'Proxy-agent: simple-proxy',
                WS
            ].join(WS);
            conn.write(msg);
            // Write the original headers into the remote connection.
            remote.write(head);
            // Pipe each other.
            remote.pipe(conn);
            conn.pipe(remote);
        });
    };
};
function clientErrorHandler(_, sock) {
    sock.end("HTTP/1.1 400 Bad Request" + WS + WS);
}
function errorHandler(err) {
    console.error(err.message);
}
function createProxy(debug) {
    if (debug === void 0) { debug = false; }
    var server = http_1.createServer(defaultHandler);
    var connectHandler = createConnectionHandler(debug);
    // Attach server handlers.
    server.on('connect', connectHandler);
    server.on('clientError', clientErrorHandler);
    server.on('error', errorHandler);
    return server;
}
exports.createProxy = createProxy;
exports.default = createProxy;
