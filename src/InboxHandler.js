require("dotenv").config();
const Imap = require("imap");
const logger = require("./utils/logger");
const MessageHandler = require("./MessageHandler");

class InboxHandler {
  imap = null;
  imapConfig = null;

  isCloseing = false;
  shouldRestart = false;
  messageHandler = null;
  messageHandlers = {};

  _onReady = this._onReady.bind(this);
  _onError = this._onError.bind(this);
  _onMail = this._onMail.bind(this);
  _onEnd = this._onEnd.bind(this);

  constructor({
    imapConfig,
    mainInbox,
    apiKey,
    autoFilter,
    nodemailerConfig,
    socket,
    pluginId,
  }) {
    this.nodemailerConfig = nodemailerConfig;
    this.imapConfig = imapConfig;
    this.autoFilter = autoFilter;
    this.mainInbox = mainInbox;
    this.apiKey = apiKey;
    this.socket = socket;
    this.pluginId = pluginId;

    this.start();
  }

  start() {
    logger.log("Starting...", "InboxHandler", this.imapConfig.user);
    this.initImap();
    this.initEvents();
    this.connect();
  }

  initHeartbeat() {
    const func = () => {
      this.socket.emit("mailer_heartbeat", this.pluginId);
    };

    this.heartbeat = setInterval(func, 1000 * 60);

    func();
  }

  initImap() {
    this.imap = new Imap(this.imapConfig);
  }

  initEvents() {
    logger.log("Initializing events...", "InboxHandler", this.imapConfig.user);
    if (!this.imap) {
      logger.log("Imap is undefined!", "InboxHandler", this.imapConfig.user);
      this.close();
      return;
    }

    this.imap.once("ready", this._onReady);
    this.imap.on("error", this._onError);
    this.imap.on("mail", this._onMail);
    this.imap.on("end", this._onEnd);
  }

  async _onMail() {
    if (this.isCloseing) {
      return;
    }

    this.imap.search(["UNSEEN"], (err, results) => {
      if (err) {
        logger.error(err, "InboxHandler", this.imapConfig.user);
        this.close();
        return;
      }

      results.forEach((message) => {
        const newHandler = new MessageHandler({
          nodemailerConfig: this.nodemailerConfig,
          accountId: this.imapConfig.user,
          autoFilter: this.autoFilter,
          apiKey: this.apiKey,
          imap: this.imap,
          message,
          cleanup: () => {
            delete this.messageHandlers[message];
          },
        });

        this.messageHandlers[message] = newHandler;
      });
    });
  }

  async _onError(error) {
    logger.error(
      `Error was emitted: (${error})`,
      "InboxHandler",
      this.imapConfig.user
    );

    await this.close();

    this.start();
  }

  async _onEnd() {
    logger.log("Connection ended", "InboxHandler", this.imapConfig.user);
    await this.close();
  }

  _onReady() {
    logger.log("Connection ready!", "InboxHandler", this.imapConfig.user);
    this.initHeartbeat();
    this.imap.openBox(this.mainInbox, false, (err, box) => {
      if (err) {
        logger.error(
          `Error was emitted: (${err})`,
          "InboxHandler",
          this.imapConfig.user
        );
        this.start();
        return;
      }
    });
  }

  async connect() {
    logger.log("Connecting...", "InboxHandler", this.imapConfig.user);
    this.imap.connect();
  }

  async close() {
    if (this.isCloseing) return;
    this.isCloseing = true;

    const messageHandlers = Object.values(this.messageHandlers);
    await Promise.all(messageHandlers.map((handler) => handler.close()));

    logger.log("Closing...", "InboxHandler", this.imapConfig.user);
    this.imap.end();

    this.heartbeat && clearInterval(this.heartbeat);
    delete this.imap;
  }
}

module.exports = InboxHandler;
