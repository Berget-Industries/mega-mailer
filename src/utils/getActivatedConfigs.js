const { useApi } = require("./useApi");

module.exports = async function () {
  const activatedApiKeys = process.env.ACTIVATED_API_KEYS;
  if (!activatedApiKeys) {
    throw new Error("ACTIVATED_API_KEYS not set!");
  }

  const listOfKeys = activatedApiKeys.split(" ");
  const formattedList = [];

  for (const key of listOfKeys) {
    const api = await useApi(key);
    const response = await api.get("/plugins/get-config?plugin=mailer");
    const { config } = response.data;

    formattedList.push({ ...config, apiKey: key });
  }

  return Promise.resolve(formattedList);
};
