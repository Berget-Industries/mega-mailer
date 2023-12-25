require("dotenv").config();

const logger = require("./utils/logger");
const MessageHandler = require("./MessageHandler");
const InboxHandler = require("./InboxHandler");
const initHeartbeat = require("./heartbeat");

const { IMAP_USERNAME, IMAP_PASSWORD, IMAP_FROM, AI_URL } = process.env;

if (!IMAP_USERNAME || !IMAP_PASSWORD || !IMAP_FROM || !AI_URL) {
  console.log("Enviornment variables not set!");
  process.exit(1);
}

function main() {
  initHeartbeat();

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
