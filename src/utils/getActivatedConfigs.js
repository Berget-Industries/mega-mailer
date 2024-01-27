const { useApi } = require("./useApi");
const logger = require("./logger");

module.exports = async function () {
  const activatedApiKeys = process.env.ACTIVATED_API_KEYS;
  if (!activatedApiKeys) {
    throw new Error("ACTIVATED_API_KEYS not set!");
  }

  const listOfKeys = activatedApiKeys.split(" ");
  const formattedList = [];

  for (const key of listOfKeys) {
    const api = await useApi(key);
    api
      .get("/plugins/get-config?plugin=mailer")
      .then(({ status, data }) => {
        if (status === "success") {
          formattedList.push({ ...data.config, apiKey: key });
        }
      })
      .catch((error) => {
        logger.error(`Kunde inte ladda config för nyckel: ${key}.`);
      });
  }

  return Promise.resolve(formattedList);
};
