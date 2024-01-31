require("dotenv").config();

const checkEnv = require("./utils/checkEnv");
const { testApiConnection } = require("./utils/useApi");
const initSocket = require("./utils/initSocket");

function init() {
  return new Promise(async (resolve, reject) => {
    try {
      checkEnv();
      await testApiConnection();
      await initSocket();

      resolve();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
}

init();
