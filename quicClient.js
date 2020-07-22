/*
  created by mail@qhduan.com http://qhduan.com
  reference: http://tools.ietf.org/html/rfc1928

  engine.io https://github.com/socketio/engine.io
  engine.io-client https://github.com/socketio/engine.io-client

  route:
    browser <= net => client <= websocket(engine.io) => server <= net => remote

    net 是指node.js的net库
    websocket 使用engine.io提供的服务(客户端用engine.io-client)

    browser 是浏览器，或者说需要socks服务的应用程序
    client 是agentjs的客户端
    server 是agentjs的服务器端
    remote 是browser所希望访问的远程服务器

  nginx conf(proxy 80 port):

  server{
    server_name www.server.com;
    location / {
      proxy_pass http://localhost:7890;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }
  }

*/

"use strict";

const { createQuicSocket } = require('net');
var net = require("net");
// var crypto = require("crypto");
var fs = require('fs');

// var WebSocket = require("ws");
var tool = require("./tool");

//var SERVER_ADDRESS = "ws://localhost:7890";
// var SERVER_ADDRESS = null;
// var LOCAL_PORT = null;
// var PASSWORD = null;
// var HTTP_SERVER = null;

var TIMEOUT = 300 * 1000; // 300sec

var browserIndex = 0;
var browserList = {};

function toBrowser(browser, data) {
    if (browser) {
        browser.write(data);
    }
}

function toServer(server, data) {
    if (server) {
        server.write(data);
    }
}

function getServer(host, port) {
    const key  = fs.readFileSync('./ssl_certs/server.key');
    const cert = fs.readFileSync('./ssl_certs/server.crt');
    const ca   = fs.readFileSync('./ssl_certs/server.csr');

    const socket = createQuicSocket({
        client: {
            key,
            cert,
            ca,
            requestCert: true,
            alpn: 'hello',
            servername: 'localhost'
        }
    });

    const req = socket.connect({
        address: host,
        port,
    });
    return req
}


function main(output, serverHost, serverPort, localPort) {
    // SERVER_ADDRESS = serverAddress;
    // LOCAL_PORT = localPort;
    // PASSWORD = password;
    // PASSWORD = crypto.createHash('sha256').update(PASSWORD).digest();

    const HTTP_SERVER = net.createServer(connection => {
    
        console.log('linked connections')
        var index = browserIndex;
        browserIndex++;

        var serverReady = false;
        var cache = [];
        var server = null; // server 是服务器端的socket
        var stream = null;
        var browser = connection; // browser 是浏览器的socket
        var finished = false;

        browserList[index] = {
            browser: browser
        };

        output("No.%d browser connected, total %d [%s]", index, Object.keys(browserList).length, tool.time());

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
                if (browserList.hasOwnProperty(index)) {
                    delete browserList[index];
                }
                output("No.%d browser disconnected, because %s, total %d [%s]",
                    index,
                    reason || "no reason",
                    Object.keys(browserList).length,
                    tool.time()
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
            console.error("No.%d browser error ", index, err);
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
                toServer(stream, data);
            } else {
                cache.push(data);
            }
        });

        // server = new WebSocket(SERVER_ADDRESS);
        server = getServer(serverHost, serverPort)

        server.on('secure', function () {
            if (!server) {
                return
            }
            stream = server.openStream();

            output("No.%d connected server [%s]", index, tool.time());
            serverReady = true;

            if (browserList.hasOwnProperty(index)) {
                browserList[index].server = server;
            }

            if (cache.length > 0) {
                for (var i = 0; i < cache.length; i++) {
                    toServer(stream, cache[i]);
                }
            }

            stream.on("error", function (err) {
                console.error(err);
                FINISH("server error");
            });
    
            stream.on("data", function (data) {
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

// exports.main = main;
// exports.list = browserList;
// exports.stop = function () {
//     if (HTTP_SERVER) {
//         HTTP_SERVER.close();
//     }
// }

const serverHost = process.env.SERVER_HOST || 'localhost'
const serverPort = Number.parseInt(process.env.SERVER_PORT) || 1234
const localPort = Number.parseInt(process.env.PORT) || 2080
// const password = process.env.PASSWORD
main(console.log, serverHost, serverPort, localPort)
