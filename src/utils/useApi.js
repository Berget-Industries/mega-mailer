import axios from "npm:axios";

const { API_KEY, API_URL } = process.env;

export async function testConnection() {
  return new Promise(async (resolve, reject) => {
    const url = API_URL + "/ping";
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
      const url = API_URL + path;
      return axios.get(url, {
        headers: {
          Authorization: API_KEY,
        },
      });
    },
    post: (path, body) => {
      const url = API_URL + path;
      return axios.post(url, body, {
        headers: {
          Authorization: API_KEY,
        },
      });
    },
  };
}
