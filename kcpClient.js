/*
  created by mail@qhduan.com http://qhduan.com
  reference: http://tools.ietf.org/html/rfc1928

  route:
    browser <= net => client <= quic => server <= net => remote
*/

"use strict";

const net = require("net");
// var fs = require('fs');


const kcp = require('node-kcp')
const dgram = require('dgram')
const TIMEOUT = 30 * 1000


function toBrowser(browser, data) {
    if (browser) {
        browser.write(data);
    }
}


function main(output, serverHost, serverPort, localPort) {

    const HTTP_SERVER = net.createServer((browser) => {

        let cache = []
        let finished = false

        const client = dgram.createSocket('udp4')
        const interval = 10
        const kcpobj = new kcp.KCP(123, {address: serverHost, port: serverPort})
        console.log(serverHost, serverPort)
        // kcpobj.nodelay(0, interval, 0, 0)
        kcpobj.nodelay(1, interval, 2, 1)
        kcpobj.output((data, size, context) => {
            client.send(data, 0, size, context.port, context.address)
        })

        output("browser connected")

        function FINISH(reason) {
            if (finished == false) {
                if (browser) {
                    browser.destroy()
                    browser = null
                }
                output("browser disconnected, because %s",
                    reason || "no reason"
                )
                finished = true
            }
        }

        browser.on("end", function () {
            FINISH("browser end")
        })

        browser.on("close", function () {
            FINISH("browser close")
        })

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
            // cache.push(data)
            console.log('from browser %d', data.length)
            kcpobj.update(Date.now())
            kcpobj.send(data)
        })

        client.on('error', err => {
            console.error(`client error ${err.stack}`)
            client.close()
        })

        client.on('message', (msg, rinfo) => {
            kcpobj.input(msg)
        })

        setInterval(() => {
            kcpobj.update(Date.now())
            const recv = kcpobj.recv()
            if (recv) {
                console.log('from remote %s', recv.length)
                console.log(recv)
                toBrowser(browser, recv)
            }
            // if (cache.length > 0) {
            //     for (var i = 0; i < cache.length; i++) {
            //         kcpobj.send(cache[i])
            //     }
            //     cache = []
            // }
        }, interval)

        if (cache.length > 0) {
            for (var i = 0; i < cache.length; i++) {
                kcpobj.send(cache[i])
            }
            cache = []
        }

    });

    HTTP_SERVER.listen(localPort, () => {
        output("Server address is, %s:%s", serverHost, serverPort);
        output("Client is running on, socks5://localhost:%d", localPort);
    });
}

const serverHost = process.env.SERVER_HOST || 'localhost'
const serverPort = Number.parseInt(process.env.SERVER_PORT) || 1234
const localPort = Number.parseInt(process.env.PORT) || 2080
main(console.log, serverHost, serverPort, localPort)
