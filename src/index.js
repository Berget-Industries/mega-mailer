require("dotenv").config();

const MainInboxHandler = require("./InboxHandler");
const initHeartbeat = require("./heartbeat");
const checkEnv = require("./utils/checkEnv");
const { testApiConnection } = require("./utils/useApi");
const getActivatedConfigs = require("./utils/getActivatedConfigs");

function init() {
  return new Promise(async (resolve, reject) => {
    try {
      checkEnv();
      initHeartbeat();
      await testApiConnection();

      const activatedConfigs = await getActivatedConfigs();
      resolve(activatedConfigs);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
}

async function main() {
  const activatedConfigs = await init();

  activatedConfigs.forEach((config) => {
    new MainInboxHandler(config);
  });
}

main();
