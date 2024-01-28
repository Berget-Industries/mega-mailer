const { io } = require("socket.io-client");
const socketHandler = require("./socketHandler");

module.exports = function initSocket() {
  return new Promise((resolve, reject) => {
    try {
      const { API_HOST, API_KEY } = process.env;

      console.log("API_HOST", API_HOST);
      console.log("API_KEY", API_KEY);

      const socket = io(API_HOST, {
        autoConnect: true,
        withCredentials: true,
        path: "/api/ws/",
        transports: ["websocket"],
        auth: {
          token: API_KEY,
        },
      });

      socketHandler(socket);

      resolve();
    } catch (error) {
      console.log("Error in initSocket", error);
      reject(error);
    }
  });
};
