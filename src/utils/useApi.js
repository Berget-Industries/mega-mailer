const axios = require("axios");

const { API_KEY, API_HOST } = process.env;
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

async function useApi() {
  return {
    get: (path) => {
      const url = baseUrl + path;
      return axios.get(url, {
        headers: {
          Authorization: API_KEY,
        },
      });
    },
    post: (path, body) => {
      const url = baseUrl + path;
      return axios.post(url, body, {
        headers: {
          Authorization: API_KEY,
        },
      });
    },
  };
}

module.exports = { useApi, testApiConnection };
