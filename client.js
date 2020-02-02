
const agentClient = require("./agentClient")
const process = require("process")

function updateLog() {
  console.log.apply(console, arguments);
}

const address = process.env.HOST
const port = Number.parseInt(process.env.PORT) || 1080
const password = process.env.PASSWORD
agentClient.main(updateLog, address, port, password)
