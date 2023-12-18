require("dotenv").config();
const { simpleParser } = require("mailparser");
const { default: axios } = require("axios");
const nodemailer = require("nodemailer");
const Imap = require("imap");

const logger = require("./utils/logger");

const { IMAP_USERNAME, IMAP_PASSWORD, IMAP_FROM, AI_URL } = process.env;

if (!IMAP_USERNAME || !IMAP_PASSWORD || !IMAP_FROM || !AI_URL) {
  console.log("Enviornment variables not set!");
  process.exit(1);
}

function sendMail({ message, sendTo, subject }) {
  return new Promise((resolve, reject) => {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.IMAP_USERNAME,
        pass: process.env.IMAP_PASSWORD,
      },
    });

    transporter.sendMail(
      {
        from: process.env.IMAP_FROM,
        subject: subject,
        to: sendTo,
        html: message,
      },
      (err, info) => {
        if (err) {
          logger.error(err, "Mailer", "sendMail");
          return reject(err);
        } else {
          return resolve(info);
        }
      }
    );
  });
}

function removeEmailHistory(text) {
  const historyRegex = /^On\s.+wrote:$/gm;
  const lines = text.split("\n");
  const historyIndex = lines.findIndex(
    (line) => historyRegex.test(line) || line.startsWith(">")
  );

  if (historyIndex !== -1) {
    return lines.slice(0, historyIndex).join("\n");
  }

  return text;
}

async function processEmail(email) {
  return new Promise(async (resolve) => {
    const { name, address } = email.from.value[0];
    const message = removeEmailHistory(email.text);
    const subject = email.subject ? email.subject : "";

    const idRegex = /[0-9a-f]{24}/;
    const match = subject.match(idRegex);
    const sessionId = match ? match[0] : null;

    const requestBody = {
      name,
      address,
      message,
      sessionId,
    };

    logger.log("Processing new email from " + address, "Processor");
    console.log(requestBody);

    try {
      const response = await axios.post(process.env.AI_URL, requestBody);

      const { output, sessionId } = response.data;
      const subject = `Converstaion: ${sessionId}`;

      const status = await sendMail({
        message: output,
        sendTo: address,
        subject,
      });

      resolve();
    } catch (error) {
      logger.error(error, "Processor");
      resolve();
    }
  });
}

let imap = null;
let isWorking = false;

function processNextUnreadEmail() {
  isWorking = true;
  imap.search(["UNSEEN"], (err, results) => {
    if (err) {
      logger.error(err, "Manager");
      isWorking = false;
      return;
    }

    logger.log(results, "Manager", "Queue");
    // If no results, end the IMAP connection
    if (!results || results.length === 0) {
      logger.log("No unread emails left.", "Manager");
      isWorking = false;
      return;
    }

    // Use the first unread email
    const fetch = imap.fetch(results[0], {
      bodies: "",
      struct: true,
      markSeen: true, // This will mark the email as seen
    });

    fetch.on("message", (msg) => {
      msg.on("body", (stream) => {
        simpleParser(stream, async (err, parsed) => {
          if (err) {
            logger.error(err, "Manager", "Row 95");
            return;
          }

          const from = parsed.from.value[0].address;
          if (from === process.env.IMAP_USERNAME) {
            logger.log("Skipping self!", "Manager");
            processNextUnreadEmail();
            return;
          }

          await processEmail(parsed);
          isWorking = false;
          processNextUnreadEmail();
          // After processing, check for more emails
        });
      });
    });

    fetch.once("error", (err) => {
      logger.error(err, "Manager", "Fetch error:");
      isWorking = false;
    });
  });
}

function init() {
  imap = new Imap({
    user: process.env.IMAP_USERNAME,
    password: process.env.IMAP_PASSWORD,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  });
  logger.log("Connecting...", "IMAP");

  imap.once("ready", () => {
    imap.openBox("[Gmail]/Alla mail", false, (err, box) => {
      if (err) {
        logger.error(`Error was emitted: (${err.code})`, "IMAP");
        restart();
        return;
      }
    });
  });

  imap.on("mail", () => {
    logger.log("New mail received.", "Watcher");
    if (!isWorking) {
      processNextUnreadEmail();
    }
  });

  imap.on("error", function (err) {
    logger.error(`Error was emitted: (${err.code})`, "IMAP");
    restart();
  });

  imap.on("end", function () {
    logger.log("Connection ended");
  });

  imap.connect();
}

function restart() {
  logger.error("Ending and restarting...", "IMAP");
  imap = null;
  init();
}

init();
