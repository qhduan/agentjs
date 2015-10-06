
  var agentClient = require("./agentClient");

  var util = require("util");

  function updateLog () {
    console.log.apply(console, arguments);
  }

  var address = "ws://localhost:7890";
  var port = 1080;
  var password = "abc";
  agentClient.main(updateLog, address, port, password);
