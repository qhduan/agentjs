
const { exec } = require('child_process')


function testip(name) {

return new Promise((resolve) => {
exec('ifconfig | grep inet | grep wlan | grep ' + name, (err, stdout) => {
if (!err) {
     var m = stdout.match(new RegExp(name + "[\.0-9]+"))
     if (m) {resolve(m[0])}
  }
  resolve(null)
})

})

}

function getip() {
return new Promise(resolve => {
testip('192').then(ip => {
  if (ip) { resolve(ip) } else {
    testip('172').then(ip => {
      if (ip) { resolve(ip) } else {
        testip('10').then(ip => {
	  if (ip) {resolve(ip)} else {
	    resolve('127.0.0.1')
	  }
	})
      }
    })
  }
})
})

}

module.exports = getip
// getip().then(name => {console.log("hello", name)})

