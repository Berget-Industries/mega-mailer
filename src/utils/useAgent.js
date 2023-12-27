const axios = require("axios");

const { API_KEY, AGENT_HOST } = process.env;

async function testAgentConnection() {
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

async function useAgent(body) {
  return axios.post(AGENT_HOST + "/agent", body, {
    headers: {
      Authorization: API_KEY,
    },
  });
}

module.exports = { useAgent, testAgentConnection };
