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

var engineClient = require("engine.io-client");

var code = require("./code");

var SERVER_PORT = 7890;
//var SERVER_ADDRESS = "http://qhduan.com:" + SERVER_PORT;
var SERVER_ADDRESS = "ws://localhost:" + SERVER_PORT;

var LOCAL_PORT = 1080;

var TIMEOUT = 30 * 1000; // 30sec

var browserIndex = 0;
var browserList = {};

function toBrowser (browser, data) {
  if (browser) {
    browser.write(data);
  }
}

function toServer (server, data) {
  if (server) {
    server.send(code.encode(data));
  }
}

function main () {
  net.createServer(function (connection) {
    var index = browserIndex;
    browserIndex++;

    var serverReady = false;
    var cache = [];
    var server = null; // server 是服务器端的socket
    var browser = connection; // browser 是浏览器的socket
    var finished = false;

    browserList[index] = {
      browser: browser
    };

    console.log("No.%d browser connected, total %d", index, Object.keys(browserList).length);

    function FINISH (reason) {
      if (finished == false) {
        if (browser) {
          browser.destroy();
          browser = null;
        }
        if (server) {
          server.close();
          server = null;
        }
        if (browserList.hasOwnProperty(index)) {
          delete browserList[index];
        }
        console.log("No.%d browser disconnected, because %s, total %d [%s]",
          index,
          reason || "no reason",
          Object.keys(browserList).length,
          (new Date().toISOString())
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
      if (serverReady) {
        toServer(server, data);
      } else {
        cache.push(data);
      }
    });

    server = engineClient(SERVER_ADDRESS, {
      reconnection: false,
      timeout: TIMEOUT
    });

    server.on("open", function () {
      console.log("No.%d connected server", index);
      serverReady = true;

      if (browserList.hasOwnProperty(index)) {
        browserList[index].server = server;
      }

      if (cache.length > 0) {
        for (var i = 0; i < cache.length; i++) {
          toServer(server, cache[i]);
        }
      }
    });

    server.on("error", function (err) {
      console.error(err);
      FINISH("server error");
    });

    server.on("message", function (data) {
      data = code.decode(data);
      toBrowser(browser, data);
    });

    server.on("close", function () {
      FINISH("server close");
    });

  }).listen(LOCAL_PORT, function () {
    console.log("Server address is, %s", SERVER_ADDRESS);
    console.log("Client is running on, socks5://localhost:%d", LOCAL_PORT);
  });
}

main();
