const axios = require("axios");

const { API_HOST } = process.env;
const baseUrl = API_HOST + "/api";

async function testApiConnection() {
  return new Promise(async (resolve, reject) => {
    const url = baseUrl + "/ping";
    const response = await axios.get(url);
    if (response.status === 200) {
      resolve();
    } else {
      reject();
    }
  });
}

async function useApi(key) {
  return {
    get: (path) => {
      const url = baseUrl + path;
      return axios.get(url, {
        headers: {
          Authorization: key,
        },
      });
    },
    post: (path, body) => {
      const url = baseUrl + path;
      return axios.post(url, body, {
        headers: {
          Authorization: key,
        },
      });
    },
  };
}

module.exports = { useApi, testApiConnection };
