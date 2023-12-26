import axios from "npm:axios";
import dotenv from "npm:dotenv";
dotenv.config();

export default async function useApi() {
  const { API_KEY, API_URL } = process.env;

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
