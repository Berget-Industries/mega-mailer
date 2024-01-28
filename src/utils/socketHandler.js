const MainInboxHandler = require("../InboxHandler");

const handlers = [];
const handleMailerAssignConfigs = (configs) => {
  configs.forEach((config) => {
    const handler = new MainInboxHandler(config);
    handlers.push(handler);
  });
};

module.exports = function sockerHandler(socket) {
  const handleConnect = () => {
    console.log("Connected to server");
    socket.emit("register-mailer");
  };

  const handleDisconnect = () => {
    console.log("Disconnected from server, quitting...");
    process.exit(1);
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleDisconnect);
  socket.on("connect_timeout", handleDisconnect);

  socket.on("mailer_assign-configs", handleMailerAssignConfigs);
};
