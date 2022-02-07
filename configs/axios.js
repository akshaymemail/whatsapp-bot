const axios = require("axios").default;

const Axios = axios.create({
  baseURL: "http://prankycrmapi.jaakhoo.com",
});

module.exports.Axios = Axios;
