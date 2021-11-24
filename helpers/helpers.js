const request = require("request");
const fs = require("fs");

module.exports.mediadownloader = (url, path, callback) => {
  request.head(url, (err, res, body) => {
    request(url).pipe(fs.createWriteStream(path)).on("close", callback);
  });
};
