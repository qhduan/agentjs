/*
  created by mail@qhduan.com http://qhduan.com
  reference: http://tools.ietf.org/html/rfc1928

  route:
    browser <= net => client <= quic => server <= net => remote
*/

"use strict";

const { createQuicSocket } = require('net');
var net = require("net");
var fs = require('fs');

// var tool = require("./tool");

const kHttp3Alpn = 'h3-29';


var TIMEOUT = 300 * 1000; // 300sec

function toBrowser(browser, data) {
    if (browser) {
        browser.write(data);
    }
}

function toServer(server, data) {
    if (server) {
        // const batchSize = 128
        // for (let i = 0; i < Math.ceil(data.length / batchSize); i++) {
        //     server.write(data.slice(i * batchSize, (i + 1) * batchSize))
        // }
        server.write(data)
        console.log('to server data %d', data.length)
    }
}

async function getServer(host, port) {
    const key  = fs.readFileSync('./ssl_certs/server.key');
    const cert = fs.readFileSync('./ssl_certs/server.crt');
    const ca   = fs.readFileSync('./ssl_certs/server.csr');

    const kHttp3Alpn = 'h3-29';
    const options = { key, cert, ca, alpn: kHttp3Alpn };

    const socket = createQuicSocket({
        client: options
    });

    const req = await socket.connect({
        address: host,
        port,
    });
    return req
}


function main(output, serverHost, serverPort, localPort) {

    const HTTP_SERVER = net.createServer(async (connection) => {

        var serverReady = false;
        var cache = [];
        var server = null; // server 是服务器端的socket
        var stream = null;
        var writeSteram = null;
        var browser = connection; // browser 是浏览器的socket
        var finished = false;

        output("browser connected");

        function FINISH(reason) {
            if (finished == false) {
                if (browser) {
                    browser.destroy();
                    browser = null;
                }
                if (server) {
                    // aserver.close();
                    server = null;
                }
                output("browser disconnected, because %s",
                    reason || "no reason"
                );
                finished = true;
            }
        }

        browser.on("end", function () {
            FINISH("browser end");
        });

        browser.on("close", function () {
            FINISH("browser close");
        });

        browser.setTimeout(TIMEOUT, function () {
            FINISH("browser timeout");
        });

        browser.on("error", function (err) {
            console.error("browser error %s", err);
            FINISH("browser error");
        });

        browser.on("data", function (data) {
            if (data.toString('utf-8').indexOf('GET /autoproxy.pac') == 0) {
                let content = 'HTTP/1.1 200 OK\n'
                content += 'Content-Type: application/x-ns-proxy-autoconfig\n'
                content += '\n'
                content += fs.readFileSync('./autoproxy.pac', { encoding: 'utf-8' })
                browser.write(Buffer.from(content, 'utf-8'))
                browser.end()
                return
            }
            if (serverReady && stream) {
                toServer(writeSteram, data);
            } else {
                cache.push(data);
            }
        });

        // server = new WebSocket(SERVER_ADDRESS);
        server = await getServer(serverHost, serverPort)

        server.on('secure', async function () {
            if (!server) {
                return
            }

            stream = await server.openStream({
                highWaterMark: 1 * 1024 * 1024
            });

            stream.submitInitialHeaders({
                ':method': 'POST',
                ':scheme': 'https',
                ':authority': 'localhost',
                ':path': '/',
            })

            writeSteram = stream; //.pushStream()

            output("connected server");
            serverReady = true;

            if (cache.length > 0) {
                for (var i = 0; i < cache.length; i++) {
                    toServer(writeSteram, cache[i]);
                }
            }

            stream.on("error", function (err) {
                console.error(err);
                FINISH("server error");
            });
    
            stream.on("data", function (data) {
                console.log('from server %d', data.length)
                toBrowser(browser, data);
            });
    
            stream.on("close", function () {
                FINISH("server close");
            });
    
            stream.on("end", function () {
                FINISH("server close");
            });

        });

    });

    HTTP_SERVER.listen(localPort, () => {
        output("Server address is, %s:%s", serverHost, serverPort);
        output("Client is running on, socks5://localhost:%d", localPort);
    });
}

const serverHost = process.env.SERVER_HOST || 'localhost'
const serverPort = Number.parseInt(process.env.SERVER_PORT) || 1234
const localPort = Number.parseInt(process.env.PORT) || 2080
// const password = process.env.PASSWORD
main(console.log, serverHost, serverPort, localPort)
