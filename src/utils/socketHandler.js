const MainInboxHandler = require("../InboxHandler");
const logger = require("./logger");

const handlers = {};
const handleClose = async () =>
  await Promise.all(Object.values(handlers).map((handler) => handler.close()));

process.on("SIGINT", async () => {
  logger.log("SIGINT", "InboxHandler");
  await handleClose();
  process.exit(1);
});

const loadConfigs = (newConfigs, socket) => {
  newConfigs.forEach(({ _id, config }) => {
    logger.log("Loading config...", "InboxHandler", config.imapConfig.user);
    const newHandler = new MainInboxHandler({
      ...config,
      socket,
      pluginId: _id,
    });
    handlers[_id] = newHandler;
  });
};

const addOneConfigs = ({ _id, config }, socket) => {
  logger.log("Adding config...", "InboxHandler", config.imapConfig.user);
  const newHandler = new MainInboxHandler({ ...config, socket, pluginId: _id });
  handlers[_id] = newHandler;
};

const updateConfig = async ({ _id, config }, socket) => {
  await removeConfig(_id);

  logger.log("Updating config...", "InboxHandler", config.imapConfig.user);

  const newHandler = new MainInboxHandler({ ...config, socket, pluginId: _id });
  handlers[_id] = newHandler;
};

const removeConfig = async (_id) => {
  if (!handlers[_id]) return;

  logger.log("Removing config...", "InboxHandler", _id);

  await handlers[_id].close();
  delete handlers[_id];
};

module.exports = function sockerHandler(socket) {
  const handleConnect = () => {
    logger.log("Connected to server", "InboxHandler", "SocketIO");
    socket.emit("register-mailer");
  };

  const handleDisconnect = async () => {
    logger.log("Disconnected from server", "InboxHandler", "SocketIO");

    await handleClose();

    logger.log("Shutdown complete!", "InboxHandler", "SocketIO");
    process.exit(1);
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleDisconnect);
  socket.on("connect_timeout", handleDisconnect);

  socket.on("mailer_assign-configs", (data) => loadConfigs(data, socket));
  socket.on("mailer_assign-config", (data) => addOneConfigs(data, socket));
  socket.on("mailer_update-config", (data) => updateConfig(data, socket));
  socket.on("mailer_remove-config", removeConfig);
};
