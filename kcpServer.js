/*
  created by mail@qhduan.com http://qhduan.com
  reference: http://tools.ietf.org/html/rfc1928

  route:
    browser <= net => client <= quic => server <= net => remote
*/

"use strict";

const process = require('process')
const net = require('net')
const kcp = require('node-kcp')
const dgram = require('dgram')
const TIMEOUT = 30 * 1000


function createServer() {
    const server = dgram.createSocket('udp4')
    return server
}


function toRemote(remote, data) {
    if (remote) {
        remote.write(data)
    }
}


function compose (data, kcpobj, status, k) {
    // console.log(`server recv ${recv} from ${kcpobj.context()}`)
    let {
        remote, step, cache, remoteReady,
    } = status[k]

    console.log('status %s', JSON.stringify(status[k]))

    if (step == 0) {
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
        console.log("data from client", data);
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
            kcpobj.send(new Buffer([5, 0xff]));
            // FINISH("invalid version");
        } else if (methodSupported == false) {
            // 或者没写支持的METHOD
            kcpobj.send(new Buffer([5, 0xff]));
            // FINISH("methods not supported");
        } else {
            // 向browser返回[5, 0]，代表我们版本是5，支持0的NO AUTHENTICATION模式
            kcpobj.send(new Buffer([5, 0]));
            step++;
        }

    } else if (step == 1) {
        /*
        如果浏览器觉得没问题，会发来第二次信息，这次信息就包括了浏览器想要访问的地址
        格式为：
        +----+-----+-------+------+----------+----------+
        |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
        +----+-----+-------+------+----------+----------+
        | 1  |  1  | X'00' |  1   | Variable |    2     |
        +----+-----+-------+------+----------+----------+
        o  VER    protocol version: X'05' 版本，必须是 5
        o  CMD    模式，我们只支持 1
        o  CONNECT X'01'
        o  BIND X'02'
        o  UDP ASSOCIATE X'03'
        o  RSV    RESERVED 保留字，没用，必须是 0
        o  ATYP   address type of following address 地址类型，很重要
        o  IP V4 address: X'01'
        o  DOMAINNAME: X'03'
        o  IP V6 address: X'04'
        o  DST.ADDR       desired destination address 想要访问的地址
        o  DST.PORT desired destination port in network octet order 想要访问远程的端口
        */
        var VER = data[0];
        var CMD = data[1];
        var RSV = data[2];
        var ATYP = data[3];
        console.log("VER, CMD, RSV, ATYP", VER, CMD, RSV, ATYP);

        if (CMD != 1) {
            // 我们只支持CMD是1,也就是CONNECT的类型
            // 如果CMD不是1,则告诉浏览器我们不支持，数组中 7 代表  X'07' Command not supported
            kcpobj.send(
                new Buffer([5, 7, 0, 1, 0, 0, 0, 0, 0, 0])
            )
            // FINISH("CMD not supported");
            return;
        }

        var ADDRESS = null;
        var PORT = null;

        if (ATYP == 1) { // ipv4
            ADDRESS = data[4] + "." + data[5] + "." + data[6] + "." + data[7];
            PORT = data[8] * 256 + data[9];
        } else if (ATYP == 3) { // 域名
            var length = data[4]; // 域名长度
            ADDRESS = "";
            var i;
            for (i = 0; i < length; i++) {
                ADDRESS = ADDRESS + String.fromCharCode(data[5 + i]);
            }
            PORT = data[i + 5] * 256 + data[i + 6];
        } else if (ATYP == 4) { // ipv6
            var C = function (a, b) {
                var r = a * 256 + b;
                return r.toString(16);
            }
            // 把16个字节转换为IPv6的地址
            ADDRESS = C(data[4], data[5]) + "." +
                C(data[6], data[7]) + "." +
                C(data[8], data[9]) + "." +
                C(data[10], data[11]) + "." +
                C(data[12], data[13]) + "." +
                C(data[14], data[15]) + "." +
                C(data[16], data[17]) + "." +
                C(data[18], data[19]);
            PORT = data[20] * 256 + data[21];
        }

        console.log("ADDRESS:PORT : %s", ADDRESS + ":" + PORT);

        step++;

        // 因为我们取得了IPv4或者IPv6或者域名，所以我们要尝试连接服务器
        remote = net.createConnection(PORT, ADDRESS, () => {

            console.log('connected %s', ADDRESS + ":" + PORT)
            // 如果成功我们就向浏览器返回一个数组
            // 第1位的 5 是版本
            // 第2位的 0 代表我们成功了
            // 第3位的 0 是保留字
            // 第4位的 1 代表地址是IPv4, 实际上在CONNECT模式下，这一位和下面六位没什么用
            // 第5到第8位 四个字节的地址，BIND模式才需要
            // 第9第10位 两个字节的端口，BIND模式才需要
            kcpobj.update(Date.now())
            kcpobj.send(new Buffer([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]))
            console.log('send success')
            // remoteReady = true;
            status[k].remoteReady = true

            if (cache.length) {
                for (var i = 0; i < cache.length; i++) {
                    toRemote(remote, cache[i]);
                }
            }

        })

        remote.on("data", function (data) {
            kcpobj.send(data);
        });

        remote.on("end", function () {
            // FINISH("remote end");
        });

        remote.on("close", function () {
            // FINISH("remote close");
        });

        remote.setTimeout(TIMEOUT, function () {
            // FINISH("remote timeout");
        });

        remote.on("error", function () {
            if (remoteReady) {
                console.error("cannot connect to remote server ", arguments);
                // FINISH("remote connect error");
            } else {
                // 第2位为 1 ，代表返回一个通用socks5错误
                kcpobj.send(new Buffer([5, 1, 0, 1, 0, 0, 0, 0, 0, 0]));
                // FINISH("remote other error");
            }
        });

    } else {
        console.log('remoteReady %s, %d', remoteReady, data.length)
        if (remoteReady) {
            toRemote(remote, data);
        } else {
            cache.push(data);
        }
    }

    status[k] = {
        remote, step, cache, remoteReady,
    }
}


function main() {

    const server = createServer()
    const interval = 10
    const clients = {}
    const status = {}

    const output = function (data, size, context) {
        server.send(data, 0, size, context.port, context.address)
    }

    server.on('error', err => {
        console.error(`server on error ${err.stack}`)
        server.close()
    })

    server.on('message', (msg, rinfo) => {
        const k = rinfo.address + '_' + rinfo.port
        if (undefined === clients[k]) {
            const context = {
                'address': rinfo.address,
                'port': rinfo.port
            }
            const kcpobj = new kcp.KCP(123, context)
            // kcpobj.nodelay(0, interval, 0, 0)
            kcpobj.nodelay(1, interval, 2, 1)
            kcpobj.output(output)
            clients[k] = kcpobj
            status[k] = {
                remote: null,
                step: 0,
                cache: [],
                remoteReady: false,
                finished: false,
            }
        }
        clients[k].input(msg)
    })

    server.on('listening', () => {
        const address = server.address()
        console.log(`server listen ${address.address} : ${address.port}`)

        setInterval(() => {
            for (const k in clients) {
                const kcpobj = clients[k]
                kcpobj.update(Date.now())
                const data = kcpobj.recv()
                if (data) {
                    console.log('from client %d', data.length)
                    compose(data, kcpobj, status, k)
                }
            }
        }, interval)
    })

    const serverPort = Number.parseInt(process.env.SERVER_PORT) || 7891
    server.bind(serverPort)

}

main();
