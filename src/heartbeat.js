const http = require("http");

module.exports = initHeartbeat = () => {
  const server = http.createServer((req, res) => {
    if (req.url === "/ping" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "success", message: "Online" }));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "Not Found" }));
    }
  });

  const PORT = process.env.HEARTBEAT_PORT || 3000; // Du kan ändra porten efter behov
  server.listen(PORT, () => {
    console.log(`Hearbeat started on port: ${PORT}`);
  });
};
