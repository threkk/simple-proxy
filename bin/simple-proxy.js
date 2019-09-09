#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../lib/index");
var port = process.env.PORT || '8000';
var debug = process.env.NODE_ENV != 'production';
var proxy = index_1.createProxy(debug);
process.on('SIGINT', function () {
    console.log('Stopping the server...');
    setTimeout(function () {
        console.error('Server took too long, process shut down.');
    }, 5000);
    proxy.close(function () {
        console.log('Server stopped.');
        process.exit();
    });
});
console.log("Starting server on port " + port + "...");
var proc = proxy.listen({ port: port }, function () {
    // We know it is not a unix socket or a pipe.
    var _a = proc.address(), address = _a.address, port = _a.port;
    console.log("Server running on " + address + ":" + port);
});
