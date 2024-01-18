require("dotenv").config();

const MainInboxHandler = require("./InboxHandler");
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
      resolve();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
}

async function main() {
  await init();

  const mailerConfig = {
    organizationId: "6567688da895a324a728385d",
    mainInbox: "[Gmail]/Alla mail",
    manualFilter: true,
    imapConfig: {
      user: process.env.IMAP_USERNAME,
      password: process.env.IMAP_PASSWORD,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    },
  };

  const mainInboxHandler = new MainInboxHandler(mailerConfig);
}

main();
