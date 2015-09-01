
var crypto = require("crypto");

var CRYPTOKEY = crypto.createHash('sha256').update("&Y(Yfhsd89fsd98*)").digest();
var CRYPTOIV = "w09r2w3foawoeuf9";

function encode (data) {
  var c = crypto.createCipheriv("aes-256-cbc", CRYPTOKEY, CRYPTOIV);
  var r1 = c.update(data);
  var r2 = c.final();
  return Buffer.concat([r1, r2], r1.length + r2.length);
}

function decode (data) {
  var d = crypto.createDecipheriv("aes-256-cbc", CRYPTOKEY, CRYPTOIV);
  var r1 = d.update(data);
  var r2 = d.final();
  return Buffer.concat([r1, r2], r1.length + r2.length);
}

function easy (data) {
  for (var i = 0; i < data.length; i++) {
    data[i] = data[i] ^ 0xAA;
  }
  return data;
}

exports.encode = easy;
exports.decode = easy;
