/*
  created by mail@qhduan.com http://qhduan.com
  reference: http://tools.ietf.org/html/rfc1928

  route:
    browser <==> client <==> server <==> remote
    browser 是浏览器，或者说需要socks服务器的应用程序
    client 是agentjs的客户端
    server 是agentjs的服务器端
    remote 是browser所希望访问的远程服务器
*/

"use strict";

var net = require("net");

var code = require("./code");

var SERVER_ADDRESS = "localhost";
// var SERVER_PORT = 7890;

//var SERVER_ADDRESS = "qhduan.com";
var SERVER_PORT = 7890;

var LOCAL_PORT = 1080;

var TIMEOUT = 30 * 1000; // 30sec

var browserIndex = 0;
var browserList = {};

function main () {
  net.createServer(function (connection) {
    var index = browserIndex;
    browserIndex++;

    var serverReady = false;
    var cache = [];
    var server = null; // server 是服务器端的socket
    var browser = connection; // browser 是浏览器的socket

    browserList[index] = {
      browser: browser
    };

    console.log("No.%d browser connected, total %d", index, Object.keys(browserList).length);

    var closed = false;
    function FINISH (reason) {
      if (closed) {
        return;
      }
      if (browser) {
        browser.destroy();
        browser = null;
      }
      if (server) {
        server.destroy();
        server = null;
      }
      if (browserList.hasOwnProperty(index)) {
        delete browserList[index];
      }
      reason = reason || "no reason";
      console.log("No.%d browser disconnected, because %s, total %d [%s]", index, reason, Object.keys(browserList).length, (new Date().toISOString()));
      closed = true;
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

    browser.on("error", function () {
      console.error(index, "browser error", arguments);
      FINISH("browser error");
    });

    browser.on("data", function (data) {
      data = code.encode(data);
      if (serverReady) {
        server.write(data);
      } else {
        cache.push(data);
      }
    });

    server = net.createConnection(SERVER_PORT, SERVER_ADDRESS, function () {
      serverReady = true;

      if (browserList.hasOwnProperty(index)) {
        browserList[index].server = server;
      }

      if (cache.length > 0) {
        for (var i = 0; i < cache.length; i++) {
          server.write(cache[i]);
        }
      }
    });

    server.on("data", function (data) {
      browser.write(code.decode(data));
    });

    server.on("end", function () {
      FINISH("server end");
    });

    server.on("close", function () {
      FINISH("server close");
    });

    server.setTimeout(TIMEOUT, function () {
      FINISH("server timeout");
    });

    server.on("error", function () {
      console.error(index, "server error ", arguments);
      FINISH("server error");
    });

  }).listen(LOCAL_PORT, function () {
    console.log("Server address is, %s:%d", SERVER_ADDRESS, SERVER_PORT);
    console.log("Client is running on, socks5://localhost:%d", LOCAL_PORT);
  });
}

main();
