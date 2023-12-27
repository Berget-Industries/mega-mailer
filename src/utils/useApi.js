import axios from "npm:axios";

const { API_KEY, API_HOST } = process.env;
const baseUrl = API_HOST + "/api";

export async function testConnection() {
  return new Promise(async (resolve, reject) => {
    const url = API_HOST + "/ping";
    const response = await axios.get(url);
    if (response.status === 200) {
      resolve();
    } else {
      reject();
    }
  });
}

export default async function useApi() {
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
