"use strict";


var net = require("net");

var code = require("./code");

var SERVER_ADDRESS = "localhost";
var SERVER_PORT = 7890;

var LOCAL_PORT = 1080;

var browserIndex = 0;

function main () {
  var server = net.createServer(function (connection) {
    var index = browserIndex;
    browserIndex++;

    console.log(index, "browser connected");

    connection.on("end", function () {
      console.log(index, "browser disconnected");
    });

    connection.on("error", function () {
      console.error(index, "browser error", arguments);
      connection.destroy();
      socket.destroy();
    });

    var serverReady = false;
    var cache = [];

    var socket = net.createConnection(SERVER_PORT, SERVER_ADDRESS, function () {
      serverReady = true;

      if (cache.length > 0) {
        for (var i = 0; i < cache.length; i++) {
          socket.write(cache[i]);
        }
      }

      socket.on("data", function (data) {
        connection.write(code.decode(data));
      });

      socket.on("end", function () {
        connection.destroy();
      });

      socket.on("error", function () {
        console.error(index, "server error ", arguments);
        connection.destroy();
        socket.destroy();
      });

      // connection.pipe(socket);
    });

    connection.on("data", function (data) {
      data = code.encode(data);
      if (serverReady == false) {
        cache.push(data);
      } else {
        socket.write(data);
      }
    });

  });

  server.listen(LOCAL_PORT, function () {
    console.log("Server address is : ", SERVER_ADDRESS);
    console.log("Server port is : ", SERVER_PORT);
    console.log("Client is running on : ", LOCAL_PORT);
  });
}

main();
