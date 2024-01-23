require("dotenv").config();
const { simpleParser } = require("mailparser");
const nodemailer = require("nodemailer");
const {
  useMegaAssistant,
  useAutoFilter,
  useMailSubject,
} = require("./utils/useChains");
const logger = require("./utils/logger");

const { IMAP_USERNAME, IMAP_PASSWORD, IMAP_FROM } = process.env;

class MessageHandler {
  imap = null;
  message = null;

  isWorking = false;
  isMessageFromSelf = false;
  error = [];

  messageBodyStream = null;
  parsedMessage = null;

  draft = {
    from: IMAP_FROM,
    subject: null,
    to: null,
    html: null,
  };

  constructor({ imap, organizationId, autoFilter }) {
    this.imap = imap;
    this.organizationId = organizationId;
    this.autoFilter = autoFilter;

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
    try {
      this.isWorking = true;

      await this.processNextMessage();

      await this.fetchMessage();

      await this.parseMessage();

      if (this.autoFilter) {
        logger.log("Auto filteringing...", "MessageHandler");
        const autoFilterOutput = await this.checkAutoFilter();
        if (autoFilterOutput !== "MEGA-ASSISTANT") {
          await this.moveMessage(autoFilterOutput);
          await this.markMessageAsUnseen();
          return;
        }
      }

      await this.generateDraft();

      await this.sendDraft();
    } catch (error) {
      if (error === "no-unread-messages") {
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
    }
  }

  processNextMessage = async () =>
    new Promise((resolve, reject) => {
      logger.log("Processing next message...", "MessageHandler");

      this.imap.search(["UNSEEN"], (err, results) => {
        if (err) {
          logger.error(err, "MessageHandler");

          return reject(err);
        }

        logger.log(results, "MessageHandler", "Queue");
        if (!results || results.length === 0) {
          logger.log("No unread emails left.", "MessageHandler");
          return reject("no-unread-messages");
        }

        this.message = results[0];
        return resolve();
      });
    });

  fetchMessage = async () =>
    new Promise((resolve, reject) => {
      logger.log("Fetching message...", "MessageHandler");

      const fetch = this.imap.fetch(this.message, {
        bodies: "",
        struct: true,
        markSeen: true,
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
    const response = await useAutoFilter({
      ...this.parsedMessage,
      organizationId: this.organizationId,
    });
    return response.data.output;
  };

  moveMessage = async (folderName) =>
    new Promise(async (resolve, reject) => {
      const checkIfFolderExists = (folderName) =>
        new Promise((resolve) => {
          this.imap.getBoxes((error, boxes) => {
            if (error) {
              throw new Error("Kunde inte leta efter inkorgar.");
            }

            const flattenBoxes = (boxes, prefix = "") => {
              let boxList = [];
              Object.keys(boxes).forEach((box) => {
                const currentBoxName = prefix + box;
                boxList.push(currentBoxName);
                if (boxes[box].children) {
                  boxList = [
                    ...boxList,
                    ...flattenBoxes(
                      boxes[box].children,
                      currentBoxName + boxes[box].delimiter
                    ),
                  ];
                }
              });
              return boxList;
            };

            const allBoxes = flattenBoxes(boxes);
            if (allBoxes.includes(folderName)) {
              return resolve(true);
            } else {
              return resolve(false);
            }
          });
        });

      const createFolder = async (folderName) => {
        const _create = (folderName) =>
          new Promise((reolve, reject) => {
            this.imap.addBox(folderName, (err) => {
              if (err) {
                logger.error(err, "MessageHandler", "createFolder");
                return reject(err);
              }
              logger.log(`Folder created: ${folderName}`, "MessageHandler");
              return reolve();
            });
          });

        const split = folderName.split("/");
        if (split.length > 1) {
          const parentFolder = split[0];
          const parentFolderExsists = await checkIfFolderExists(parentFolder);
          if (!parentFolderExsists) {
            await _create(parentFolder);
          }
        }

        await _create(folderName);
        return moveMessage(folderName);
      };

      const moveMessage = (folderName) => {
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

      moveMessage(folderName);
    });

  markMessageAsUnseen = () =>
    new Promise((resolve, reject) => {
      this.imap.delFlags(this.message, ["\\Seen"], (err) => {
        if (err) {
          logger.error(err, "MessageHandler", "markMessageAsUnseen");
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
        organizationId: this.organizationId,
      };

      try {
        const response = await useMegaAssistant(requestBody);

        const { output, sessionId } = response.data;

        const generatedMailSubjectResponse = await useMailSubject({
          userMessage: message,
          assistantMessage: output,
        });

        const newSubject = !subject
          ? `${generatedMailSubjectResponse.data.subject} | ${sessionId}`
          : subject.startsWith("Re: ")
          ? subject
          : `Re: ${subject} | ${sessionId}`;

        this.draft = {
          from: IMAP_FROM,
          subject: newSubject,
          to: address,
          html: output,
          replyTo: IMAP_FROM,
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
