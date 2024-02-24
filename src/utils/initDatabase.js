const mongoose = require("mongoose");

module.exports = async function initDatabase() {
  const URI = process.env.MONGOOSE_CONNECT_URI;
  if (!URI) {
    throw new Error("MONGOOSE_CONNECT_URI is not defined");
  }

  await mongoose.connect(URI);

  const db = mongoose.connection;

  db.on("error", console.error.bind(console, "Connection error:"));
  db.once("open", () => {
    console.log("Connected to the database");
  });
};
