// created by mail@qhduan.com http://qhduan.com
// reference: http://tools.ietf.org/html/rfc1928

var crypto = require("crypto");

function encode (key, data) {
  var iv = new Buffer(16);
  var c = crypto.createCipheriv("aes-256-cbc", key, iv);
  var r1 = c.update(data);
  var r2 = c.final();
  return Buffer.concat([iv, r1, r2], iv.length + r1.length + r2.length);
}

function decode (key, data) {
  var iv = data.slice(0, 16);
  data = data.slice(16);
  var d = crypto.createDecipheriv("aes-256-cbc", key, iv);
  var r1 = d.update(data);
  var r2 = d.final();
  return Buffer.concat([r1, r2], r1.length + r2.length);
}

// 测试用的encode和decode
function easy (k, data) {
  for (var i = 0; i < data.length; i++) {
    data[i] = data[i] ^ 0xE9;
  }
  return data;
}

function none (k, data) {
  return data;
}


function time () {
  var now = new Date();
  return now.toISOString().substr(0, 19).replace("T", " ");
}

exports.time = time;

// exports.encode = encode;
// exports.decode = decode;
exports.encode = easy;
exports.decode = easy;
