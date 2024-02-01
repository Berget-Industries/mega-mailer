require("dotenv").config();
const { simpleParser } = require("mailparser");
const nodemailer = require("nodemailer");
const {
  useMegaAssistant,
  useAutoFilter,
  useMailSubjector,
} = require("./utils/useChains");
const logger = require("./utils/logger");
const EmailStatusManager = require("./utils/EmailStatusManager");

class MessageHandler {
  imap = null;
  message = null;
  accountId = null;

  apiMessageId = "";
  isWorking = false;
  shouldStop = false;
  isMessageFromSelf = false;
  error = [];
  cleanup = () => {};

  messageBodyStream = null;
  parsedMessage = null;

  draft = {
    from: null,
    subject: null,
    to: null,
    html: null,
  };

  constructor({
    imap,
    apiKey,
    autoFilter,
    accountId,
    nodemailerConfig,
    message,
    cleanup,
  }) {
    this.imap = imap;
    this.apiKey = apiKey;
    this.autoFilter = autoFilter;
    this.accountId = accountId;
    this.nodemailerConfig = nodemailerConfig;
    this.message = message;
    this.cleanup = cleanup;

    this.emailStatusManager = new EmailStatusManager();

    logger.log(
      "New MessageHandler created!",
      "MessageHandler",
      this.accountId,
      this.message
    );

    this.runLogic();
  }

  async close() {
    logger.log("Closing...", "MessageHandler", this.accountId, this.message);
    this.shouldStop = true;

    while (this.isWorking) {
      logger.log(
        "Waiting for worker to finish...",
        "MessageHandler",
        this.accountId,
        this.message
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    logger.log("Closed!", "MessageHandler", this.accountId, this.message);
    return Promise.resolve();
  }
  async runLogic() {
    this.isWorking = true;

    try {
      // await this.processNextMessage();
      await this.fetchMessage();
      await this.parseMessage();

      if (this.autoFilter) {
        logger.log(
          "Auto-filtering...",
          "MessageHandler",
          this.accountId,
          this.message
        );

        const autoFilterOutput = await this.checkAutoFilter();

        if (autoFilterOutput === "MEGA-ASSISTANT") {
          await this.movingLogic(".Assistant");
          await this.markMessageAsSeen();

          await this.generateDraft();
          await this.sendDraft();
        } else {
          const split = autoFilterOutput.split("/");

          const parentFolder = split[0];
          const subFolder = autoFilterOutput;

          const onlyCreateFolder = this.accountId.endsWith(
            "@outlook.com" || "@hotmail.com" || "@live.com" || "@msn.com"
          );

          await this.movingLogic(parentFolder, onlyCreateFolder);
          await this.movingLogic(subFolder);
        }
      }

      this.isWorking = false;
      logger.log(
        "Finished! Handler is self closing...",
        "MessageHandler",
        this.accountId,
        this.message
      );
      this.cleanup();
      return;
    } catch (error) {
      if (error === "already-processed") {
        // NOT HANDLED YET.
        // Having some issues not knowing how to think about this.
        // I have to go undergound and think some
      } else if (error === "message-from-self") {
        // NOT HANDLED YET.
        // Having some issues not knowing how to think about this.
        // I have to go undergound and think some
      } else {
        logger.error(error, "MessageHandler", this.accountId, this.message);
        logger.error(
          this.error,
          "MessageHandler",
          this.accountId,
          this.message
        );

        this.emailStatusManager.markMessageAsUnread(
          this.message,
          this.accountId,
          this.message
        );
      }

      this.isWorking = false;
      logger.log(
        "Finished! Handler is self closing.",
        "MessageHandler",
        this.accountId,
        this.message
      );
      this.cleanup();
      return;
    }
  }

  fetchMessage = async () =>
    new Promise((resolve, reject) => {
      const isSeen = this.emailStatusManager.messageHasBeenSeen(
        this.message,
        this.accountId
      );
      if (isSeen) {
        logger.log(
          "Skipping! (Already processed)",
          "MessageHandler",
          this.accountId,
          this.message
        );
        return reject("already-processed");
      }

      this.emailStatusManager.markMessageAsSeen(this.message, this.accountId);

      logger.log(
        "Fetching message...",
        "MessageHandler",
        this.accountId,
        this.message
      );

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
      logger.log(
        "Parsing message...",
        "MessageHandler",
        this.accountId,
        this.message
      );

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

        if (address === this.accountId) {
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
    const { output, messageId: apiMessageId } = response.data;
    this.apiMessageId = apiMessageId;
    return output;
  };

  movingLogic = async (folderName, onlyFolder = false) => {
    try {
      const folderExists = await this.checkIfFolderExists(folderName);

      if (!folderExists) {
        console.log("createFolder", folderName);
        await this.createFolder(folderName);
      }

      if (!onlyFolder) {
        await this.moveMessage(folderName);
      }
    } catch (error) {
      //logger.error(error, "MessageHandler", this.accountId, this.message);
    }
  };

  checkIfFolderExists = async (folderName) =>
    new Promise((resolve, reject) => {
      this.imap.getBoxes((err, boxes) => {
        if (err) {
          logger.error(
            err,
            "MessageHandler",
            this.accountId,
            this.message,
            "checkIfFolderExists"
          );
          return reject(err);
        } else {
          if (folderName.includes("/")) {
            const parentFolder = folderName.split("/")[0];
            const subFolder = folderName.split("/")[1];

            if (
              boxes[parentFolder] &&
              boxes[parentFolder].children &&
              Object.keys(boxes[parentFolder].children).includes(subFolder)
            ) {
              return resolve(true);
            } else {
              return resolve(false);
            }
          } else {
            const folderExists = boxes[folderName] ? true : false;
            return resolve(folderExists);
          }
        }
      });
    });

  createFolder = async (folderName) =>
    new Promise((resolve, reject) => {
      this.imap.addBox(folderName, (err) => {
        if (err) {
          logger.error(
            err,
            "MessageHandler",
            this.accountId,
            this.message,
            "createFolder"
          );
          return reject(err);
        } else {
          logger.log(
            `Folder created: ${folderName}`,
            "MessageHandler",
            this.accountId,
            this.message
          );
          return resolve();
        }
      });
    });

  moveMessage = async (folderName) =>
    new Promise(async (resolve, reject) => {
      this.imap.move(this.message, folderName, async (err) => {
        if (err) {
          logger.error(
            err,
            "MessageHandler",
            this.accountId,
            this.message,
            "moveMessageManual"
          );
          return reject(err);
        } else {
          logger.log(
            `Message moved to ${folderName}`,
            "MessageHandler",
            this.accountId,
            this.message
          );
          return resolve();
        }
      });
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
      logger.log(
        "Generating draft...",
        "MessageHandler",
        this.accountId,
        this.message
      );

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
        messageId: this.apiMessageId,
      };

      try {
        const response = await useMegaAssistant(this.apiKey, requestBody);

        const { output, sessionId, messageId: apiMessageId } = response.data;

        const generatedMailSubjectResponse = await useMailSubjector(
          this.apiKey,
          { messageId: apiMessageId }
        );

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
      logger.log(
        "Sending draft...",
        "MessageHandler",
        this.accountId,
        this.message
      );

      let transporter = nodemailer.createTransport(this.nodemailerConfig);

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
