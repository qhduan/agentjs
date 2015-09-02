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
var SERVER_PORT = 7890;

// var SERVER_ADDRESS = "qhduan.com";
// var SERVER_PORT = 7890;

var LOCAL_PORT = 1080;

var TIMEOUT = 30 * 1000; // 60sec

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

    function FINISH () {
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
      console.log("No.%d browser disconnected, total %d", index, Object.keys(browserList).length);
    }

    browser.on("end", function () {
      FINISH();
    });

    browser.on("close", function () {
      FINISH();
    });

    browser.setTimeout(TIMEOUT, function () {
      console.log("No.%d browser timeout", index);
      FINISH();
    });

    browser.on("error", function () {
      console.error(index, "browser error", arguments);
      FINISH();
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
      FINISH();
    });

    server.on("close", function () {
      FINISH();
    });

    server.setTimeout(TIMEOUT, function () {
      console.log("No.%d server timeout", index);
      FINISH();
    });

    server.on("error", function () {
      console.error(index, "server error ", arguments);
      FINISH();
    });

  }).listen(LOCAL_PORT, function () {
    console.log("Server address is, %s:%d", SERVER_ADDRESS, SERVER_PORT);
    console.log("Client is running on, socks5://localhost:%d", LOCAL_PORT);
  });
}

main();
