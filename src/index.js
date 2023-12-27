require("dotenv").config();

const InboxHandler = require("./InboxHandler");
const initHeartbeat = require("./heartbeat");
const checkEnv = require("./utils/checkEnv");
const { testAgentConnection } = require("./utils/useAgent");
const { testApiConnection } = require("./utils/useApi");

function init() {
  return new Promise(async (resolve, reject) => {
    try {
      checkEnv();
      initHeartbeat();
      await testApiConnection();
      await testAgentConnection();
      resolve();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
}

async function main() {
  await init();

  const imapConfig = {
    user: process.env.IMAP_USERNAME,
    password: process.env.IMAP_PASSWORD,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  };

  const inboxHandler = new InboxHandler(imapConfig);
}

main();
