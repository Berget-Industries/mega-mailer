import axios from "npm:axios";

const { API_KEY, AI_URL } = process.env;

export async function testConnection() {
  return new Promise(async (resolve, reject) => {
    const url = AI_URL + "/ping";
    const response = await axios.get(url);
    if (response.status === 200) {
      resolve();
    } else {
      reject();
    }
  });
}

export default async function useAgent(body) {
  return axios.post(AI_URL, body, {
    headers: {
      Authorization: API_KEY,
    },
  });
}
