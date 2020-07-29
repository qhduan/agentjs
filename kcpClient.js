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
        let step = 0

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
            console.log('from browser %d', data.length)
            if (step === 0) {
                step++

                /*
                浏览器首先会发送一个版本请求信息
                +----+----------+----------+
                |VER | NMETHODS | METHODS  |
                +----+----------+----------+
                | 1  |    1     | 1 to 255 |
                +----+----------+----------+
                格式大概是这样的
                VER是版本，必须是5
                METHODS是n个字节(1<=n<=255)的一个字节数组
                METHODS中具体有多少个字节是由第二个变量NMETHODS决定的
                */
                var VER = data[0];
                var NMETHODS = data[1];

                /*
                METHODS中所有可能的选项为这些
                我们只支持NO AUTHENTICATION REQUIRED，也就是要求METHODS中至少有一个0
                o  X'00' NO AUTHENTICATION REQUIRED
                o  X'01' GSSAPI
                o  X'02' USERNAME/PASSWORD
                o  X'03' to X'7F' IANA ASSIGNED
                o  X'80' to X'FE' RESERVED FOR PRIVATE METHODS
                o  X'FF' NO ACCEPTABLE METHODS
                */
                var METHODS = [];
                var methodSupported = false;
                for (var i = 0; i < NMETHODS; i++) {
                    METHODS[i] = data[2 + i];
                    if (METHODS[i] == 0) { //
                        methodSupported = true;
                    }
                }
                console.log("VER, NMETHODS, METHODS : ", VER, NMETHODS, METHODS);

                if (VER != 5) {
                    // 如果版本不对
                    toBrowser(browser, new Buffer([5, 0xff]))
                    // FINISH("invalid version");
                } else if (methodSupported == false) {
                    // 或者没写支持的METHOD
                    toBrowser(browser, new Buffer([5, 0xff]));
                    // FINISH("methods not supported");
                } else {
                    // 向browser返回[5, 0]，代表我们版本是5，支持0的NO AUTHENTICATION模式
                    toBrowser(browser, new Buffer([5, 0]));
                }
            } else {
                kcpobj.update(Date.now())
                kcpobj.send(data)
            }
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
const serverPort = Number.parseInt(process.env.SERVER_PORT) || 7891
const localPort = Number.parseInt(process.env.PORT) || 2080
main(console.log, serverHost, serverPort, localPort)
