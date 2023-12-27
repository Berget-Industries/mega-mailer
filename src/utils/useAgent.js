import axios from "npm:axios";

const { API_KEY, AGENT_HOST } = process.env;

export async function testConnection() {
  return new Promise(async (resolve, reject) => {
    const url = AGENT_HOST + "/ping";
    const response = await axios.get(url);
    if (response.status === 200) {
      resolve();
    } else {
      reject();
    }
  });
}

export default async function useAgent(body) {
  return axios.post(AGENT_HOST + "/agent", body, {
    headers: {
      Authorization: API_KEY,
    },
  });
}
