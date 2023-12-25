require("dotenv").config();
const Imap = require("imap");
const logger = require("./utils/logger");
const MessageHandler = require("./MessageHandler");

class InboxHandler {
  imap = null;
  imapConfig = null;

  messageHandler = null;

  _onReady = this._onReady.bind(this);
  _onError = this._onError.bind(this);
  _onMail = this._onMail.bind(this);
  _onEnd = this._onEnd.bind(this);

  constructor(imapConfig) {
    this.imapConfig = imapConfig;

    this.initImap(this.imapConfig);
    this.initEvents();
    this.connect();
  }

  initImap(config) {
    this.imap = new Imap(config);
    this.messageHandler = new MessageHandler(this.imap);
  }

  initEvents() {
    logger.log("Initializing events...", "InboxHandler");
    if (!this.imap) {
      logger.log("Imap is undefined!", "InboxHandler");
      return;
    }

    this.imap.once("ready", this._onReady);
    this.imap.on("error", this._onError);
    this.imap.on("mail", this._onMail);
    this.imap.on("end", this._onEnd);
  }

  async _onMail() {
    logger.log("New mail received.", "InboxHandler");
    if (!this.messageHandler.isWorking) {
      this.messageHandler.runLogic();
    }
  }

  _onError(error) {
    logger.error(`Error was emitted: (${error.code})`, "InboxHandler");
    this.restart();
  }

  _onEnd() {
    logger.log("Connection ended", "InboxHandler");
    this.restart();
  }

  _onReady() {
    this.imap.openBox("[Gmail]/Alla mail", false, (err, box) => {
      if (err) {
        logger.error(`Error was emitted: (${err.code})`, "IMAP");
        this.restart();
        return;
      }
    });
  }

  async connect() {
    logger.log("Connecting...", "InboxHandler");
    this.imap.connect();
  }

  restart() {
    logger.error("RESTARTING!", "InboxHandler");

    this.imap = null;
    this.messageHandler = null;

    this.initImap(this.imapConfig);
    this.initEvents();
    this.connect();
  }
}

module.exports = InboxHandler;
