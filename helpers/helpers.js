const request = require("request");
const fs = require("fs");

module.exports.mediadownloader = (url, path, callback) => {
  request.head(url, (err, res, body) => {
    request(url).pipe(fs.createWriteStream(path)).on("close", callback);
  });
};

module.exports.getFinalNumber = (number) => {
  const sanitized_number = number.toString().replace(/[- )(]/g, ""); // remove unnecessary chars from the number
  const final_number = `${sanitized_number.substring(
    sanitized_number.length - 12
  )}`;

  return final_number;
};
