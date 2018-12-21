
var process = require('process');
var agentClient = require("./agentClient");

var util = require("util");

function updateLog () {
    console.log.apply(console, arguments);
}

var address = process.env.ADDRESS || "ws://win:7890";
var port = process.env.PORT || 2080;
var password = process.env.PASSWORD || "abc";

console.log('address', address)
console.log('port', port)
console.log('password', password)

agentClient.main(updateLog, address, port, password);
