const MainInboxHandler = require("../InboxHandler");
const logger = require("./logger");

let handlers = [];
const handleClose = async () =>
  await Promise.all(handlers.map((handler) => handler.close()));

process.on("SIGINT", async () => {
  logger.log("SIGINT", "InboxHandler");
  await handleClose();
  process.exit(1);
});

const loadConfigs = (configs) => {
  configs.forEach((config) => {
    logger.log("Loading config...", "InboxHandler", config.imapConfig.user);
    const handler = new MainInboxHandler(config);
    handlers.push(handler);
  });
};

const updateConfigs = async (newConfigs) => {
  await handleClose();
  handlers = [];
  loadConfigs(newConfigs);
};

module.exports = function sockerHandler(socket) {
  const handleConnect = () => {
    console.log("Connected to server");
    socket.emit("register-mailer");
  };

  const handleDisconnect = async () => {
    console.log("Disconnected from server, quitting...");

    await handleClose();

    logger.log("Shutdown complete!", "InboxHandler");
    process.exit(1);
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleDisconnect);
  socket.on("connect_timeout", handleDisconnect);

  socket.on("mailer_assign-configs", loadConfigs);
  //socket.on("mailer_update-configs", updateConfigs);
};
