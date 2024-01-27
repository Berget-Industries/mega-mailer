require("dotenv").config();
const { simpleParser } = require("mailparser");
const nodemailer = require("nodemailer");
const {
  useMegaAssistant,
  useAutoFilter,
  useMailSubject,
} = require("./utils/useChains");
const logger = require("./utils/logger");
const EmailStatusManager = require("./utils/EmailStatusManager");

class MessageHandler {
  imap = null;
  message = null;
  accountId = null;

  isWorking = false;
  messageQueue = [];
  isMessageFromSelf = false;
  error = [];

  messageBodyStream = null;
  parsedMessage = null;

  draft = {
    from: null,
    subject: null,
    to: null,
    html: null,
  };

  constructor({ imap, apiKey, autoFilter, accountId }) {
    this.imap = imap;
    this.apiKey = apiKey;
    this.autoFilter = autoFilter;
    this.accountId = accountId;

    this.emailStatusManager = new EmailStatusManager();

    logger.log("New message handler", "MessageHandler");
  }

  reset = () => {
    this.message = null;

    this.isWorking = false;
    this.isMessageFromSelf = false;
    this.error = [];

    this.messageBodyStream = null;
    this.parsedMessage = null;

    this.parsedMessage = {
      name: null,
      address: null,
      message: null,
      sessionId: null,
    };

    this.draft = {
      to: null,
      from: null,
      html: null,
      subject: null,
    };
  };

  async runLogic() {
    if (this.isWorking || this.messageQueue.length === 0) return;
    this.isWorking = true;

    // Ta bort första meddelandet från kön och bearbeta det
    const message = this.messageQueue.shift();
    this.message = message;

    try {
      await this.processNextMessage();
      await this.fetchMessage();
      await this.parseMessage();

      if (this.autoFilter) {
        logger.log("Auto-filtering...", "MessageHandler");
        const autoFilterOutput = await this.checkAutoFilter();

        if (autoFilterOutput === "MEGA-ASSISTANT") {
          await this.moveMessage(".Assistant");
          await this.markMessageAsSeen();
        } else {
          const split = autoFilterOutput.split("/");

          const parentFolder = split[0];
          const subFolder = autoFilterOutput;

          await this.moveMessage(parentFolder);
          await this.moveMessage(subFolder);

          return;
        }
      }

      await this.generateDraft();
      await this.sendDraft();
    } catch (error) {
      if (error === "already-processed") {
        // NOT HANDLED YET.
        // Having some issues not knowing how to think about this.
        // I have to go undergound and think some
        return;
      }

      if (error === "message-from-self") {
        // NOT HANDLED YET.
        // Having some issues not knowing how to think about this.
        // I have to go undergound and think some
        return;
      }

      logger.error(error, "MessageHandler");
      logger.error(this.error, "MessageHandler");
    } finally {
      this.isWorking = false;
      if (this.messageQueue.length > 0) {
        setImmediate(() => this.runLogic()); // Bearbeta nästa meddelande om det finns något kvar i kön
      }
    }
  }

  async enqueueMessage(message) {
    this.messageQueue.push(message); // Lägg till meddelandet i kön
    if (!this.isWorking) {
      await this.runLogic(); // Försök att köra logiken endast om den inte redan körs
    }
  }

  processNextMessage = async () =>
    new Promise((resolve, reject) => {
      // logger.log("Processing next message...", "MessageHandler");

      this.imap.search(["UNSEEN"], (err, results) => {
        if (err) {
          logger.error(err, "MessageHandler");
          return reject(err);
        }

        if (!results || results.length === 0) {
          logger.log("No unread emails left.", "MessageHandler");
          return reject("no-unread-messages");
        }

        logger.log(this.messageQueue, "MessageHandler", "Queue");
        logger.log(
          `Next in line: ${this.accountId}:${this.message}`,
          "MessageHandler",
          "Queue"
        );

        const message = results.find(
          (msg) =>
            !this.emailStatusManager.messageHasBeenSeen(msg, this.accountId)
        );

        if (!message) {
          logger.log(
            "Message has been processed.",
            "MessageHandler",
            this.accountId + ":" + this.message
          );
          return reject("already-processed");
        }

        this.emailStatusManager.markMessageAsSeen(message, this.accountId);

        this.message = message;
        return resolve();
      });
    });

  fetchMessage = async () =>
    new Promise((resolve, reject) => {
      logger.log("Fetching message...", "MessageHandler");

      const fetch = this.imap.fetch(this.message, {
        bodies: "",
        struct: true,
        markSeen: false,
      });

      fetch.on("message", (msg) => {
        msg.on("body", async (stream) => {
          this.messageBodyStream = stream;
        });
        msg.on("end", () => resolve());
      });

      fetch.once("error", (err) => {
        logger.error(err, "Manager", "Fetch error:");
        this.error.push(err);
        reject();
      });
    });

  parseMessage = () =>
    new Promise((resolve, reject) => {
      logger.log("Parsing message...", "MessageHandler");

      simpleParser(this.messageBodyStream, async (err, parsed) => {
        if (err) {
          this.error.push(err);
          return reject(err);
        }

        const { name, address } = parsed.from.value[0];
        const message = this.removeMessageHistory(parsed.text);
        const subject = parsed.subject ? parsed.subject : "";

        const idRegex = /[0-9a-f]{24}/;
        const match = subject.match(idRegex);
        const sessionId = match ? match[0] : null;
        const messageId = parsed.headers.get("message-id");
        const references = parsed.headers.get("references");

        if (address === IMAP_USERNAME) {
          this.isMessageFromSelf = true;
          return reject("message-from-self");
        }

        this.parsedMessage = {
          name,
          address,
          message,
          subject,
          sessionId,
          messageId,
          references,
        };
        return resolve();
      });
    });

  checkAutoFilter = async () => {
    const response = await useAutoFilter(this.apiKey, this.parsedMessage);
    return response.data.output;
  };

  moveMessage = async (folderName) =>
    new Promise((resolve, reject) => {
      const moveMessage = () => {
        this.imap.move(this.message, folderName, (err) => {
          if (err && err.textCode === "TRYCREATE") {
            return createFolder(folderName);
          } else if (err) {
            logger.error(err, "MessageHandler", "moveMessageManual");
            return reject(err);
          } else {
            logger.log(`Message moved to ${folderName}`, "MessageHandler");
            return resolve();
          }
        });
      };

      const createFolder = () => {
        this.imap.addBox(folderName, (err) => {
          if (err) {
            logger.error(err, "MessageHandler", "createFolder");
            return reject(err);
          }
          logger.log(`Folder created: ${folderName}`, "MessageHandler");
          return moveMessage();
        });
      };

      moveMessage();
    });

  markMessageAsSeen = () =>
    new Promise((resolve, reject) => {
      this.imap.addFlags(this.message, ["\\Seen"], (err) => {
        if (err) {
          logger.error(err, "MessageHandler", "markMessageAsSeen");
          return reject(err);
        } else {
          resolve();
        }
      });
    });

  generateDraft = () =>
    new Promise(async (resolve, reject) => {
      logger.log("Generating draft...", "MessageHandler");

      const {
        name,
        address,
        message,
        subject,
        sessionId,
        messageId,
        references,
      } = this.parsedMessage;

      const requestBody = {
        name,
        address,
        message,
        sessionId,
      };

      try {
        const response = await useMegaAssistant(this.apiKey, requestBody);

        const { output, sessionId } = response.data;

        const generatedMailSubjectResponse = await useMailSubject(this.apiKey, {
          userMessage: message,
          assistantMessage: output,
        });

        const newSubject = !subject
          ? `${generatedMailSubjectResponse.data.subject} | ${sessionId}`
          : subject.startsWith("Re: ")
          ? subject
          : `Re: ${subject} | ${sessionId}`;

        this.draft = {
          from: this.accountId,
          subject: newSubject,
          to: address,
          html: output,
          replyTo: this.accountId,
          headers: {
            "In-Reply-To": messageId,
            References: references
              ? [...references, messageId].join(" ")
              : messageId,
          },
        };

        resolve();
      } catch (error) {
        reject(error);
      }
    });

  removeMessageHistory(text) {
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

  sendDraft = () =>
    new Promise((resolve, reject) => {
      logger.log("Sending draft...", "MessageHandler");

      let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: IMAP_USERNAME,
          pass: IMAP_PASSWORD,
        },
      });

      transporter.sendMail(this.draft, (err, info) => {
        if (err) {
          logger.error(err, "MessageHandler", "sendMail");
          return reject(err);
        } else {
          return resolve(info);
        }
      });
    });
}

module.exports = MessageHandler;
