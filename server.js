// created by mail@qhduan.com http://qhduan.com
// reference: http://tools.ietf.org/html/rfc1928

"use strict";


var net = require("net");

var code = require("./code");

var PORT = 7890

var clientIndex = 0;

function main () {
  var server = net.createServer(function (connection) {

    var index = clientIndex;
    clientIndex++;

    connection.on("end", function () {
      console.log(index, "client disconnected");
    });

    connection.on("error", function () {
      connection.destroy();
      socket.destroy();
    });

    var step = 0;
    var cache = [];
    var socket = null;
    var connected = false;

    connection.on("data", function (data) {

      data = code.decode(data);

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
        console.log(index, "VER, NMETHODS", VER, NMETHODS)
        var can = false;
        for (var i = 0; i < NMETHODS; i++) {
          METHODS[i] = data[2 + i];
          if (METHODS[i] == 0) { //
            can = true;
          }
        }
        console.log(index, "METHODS", METHODS)

        if (VER != 5 || can == false) {
          // 如果版本不对，或者没写支持的METHOD
          connection.write(code.encode(new Buffer([5, 0xff])));
          connection.destroy();
        } else {
          // 返回[5, 0]，代表我们版本是5,支持0的NO AUTHENTICATION模式
          connection.write(code.encode(new Buffer([5, 0])));
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
        console.log(index, "VER, CMD, RSV, ATYP", VER, CMD, RSV, ATYP);

        if (CMD != 1) {
          // 我们只支持CMD是1,也就是CONNECT的类型
          // 如果CMD不是1,则告诉浏览器我们不支持，数组中 7 代表  X'07' Command not supported
          connection.write(code.encode(new Buffer([5, 7, 0, 1, 0, 0, 0, 0, 0, 0])));
          connection.destroy();
          return;
        }

        var ADDRESS = null;
        var PORT = null;

        if (ATYP == 1) { // ipv4
          ADDRESS = data[4] + "." + data[5] + "." + data[6] + "." + data[7];
          PORT = data[8] * 256 + data[9];
        } else if (ATYP == 3) { // 域名
          var length = data[4];
          var i;
          ADDRESS = "";
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

        console.log(index, "ADDRESS, PORT : ", ADDRESS, PORT);

        step++;

        // 因为我们取得了IPv4或者IPv6或者域名，所以我们要尝试连接服务器
        socket = net.createConnection(PORT, ADDRESS, function () {

          // 如果成功我们就向浏览器返回一个数组
          // 第一位的 5 是版本
          // 第二位的 0 代表我们成功了
          // 第三位的 0 是保留字
          // 第四位的 1 代表地址是IPv4, 实际上在CONNECT模式下，这一位和下面六位没什么用
          // 四个字节的地址，BIND模式才需要
          // 两个字节的端口，BIND模式才需要
          connection.write(code.encode(new Buffer([5, 0, 0, 1, 0, 0, 0, 0, 0, 0])));
          connected = true;

          if (cache.length) {
            for (var i = 0; i < cache.length; i++) {
              socket.write(cache[i]);
            }
          }

          socket.on("data", function (data) {
            connection.write(code.encode(data));
          });

          socket.on("end", function () {
            connection.destroy();
          });

        });

        socket.on("error", function () {
          if (connected) {
            console.error(index, "cannot connect to remote server ", arguments);
            connection.destroy();
            socket.destroy();
          } else {
            connection.write(code.encode(new Buffer([5, 1, 0, 1, 0, 0, 0, 0, 0, 0])));
            connection.destroy();
            socket.destroy();
          }
        });

      } else {
        if (socket) {
          socket.write(data);
        } else {
          cache.push(data);
        }
      }
    });

  });

  server.listen(PORT, function () {
    console.log("Server is running on : ", PORT);
  });
}

main();
