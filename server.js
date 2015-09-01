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
        var VER = data[0];
        var NMETHODS = data[1];
        var METHODS = [];
        console.log(index, "VER, NMETHODS", VER, NMETHODS)
        for (var i = 0; i < NMETHODS; i++) {
          METHODS[i] = data[2 + i];
        }
        console.log(index, "METHODS", METHODS)

        // 5 is the version
        // 0 is we use NO AUTHENTICATION REQUIRED
        connection.write(code.encode(new Buffer([5, 0])));
        step++;
      } else if (step == 1) {
        var VER = data[0];
        var CMD = data[1];
        var RSV = data[2];
        var ATYP = data[3];
        console.log(index, "VER, CMD, RSV, ATYP", VER, CMD, RSV, ATYP);

        var ADDRESS = null;
        var PORT = null;

        if (ATYP == 1) { // ipv4
          ADDRESS = data[4] + "." + data[5] + "." + data[6] + "." + data[7];
          PORT = data[8] * 256 + data[9];
        } else if (ATYP == 3) { // domain
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

        socket = net.createConnection(PORT, ADDRESS, function () {

          // 5 is version
          // 0 is REP, 0 is succeeded
          // 0 is RSV
          // 1 is ATYP, 1 is ipv4
          // 0*4 is address
          // 0*2 is port
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
