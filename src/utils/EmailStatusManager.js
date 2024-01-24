const fs = require("fs");
const path = require("path");

class EmailStatusManager {
  constructor() {
    const fileName = "seenEmails.json";
    const filePath = path.join(__dirname, fileName);

    this.filePath = filePath;
    this.ensureDataFileExists();
  }

  ensureDataFileExists() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  readDataFile() {
    try {
      const data = fs.readFileSync(this.filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to read the data file:", error);
      return []; // Returnerar en tom array om något går fel
    }
  }

  writeDataFile(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to write to the data file:", error);
    }
  }

  messageHasBeenSeen(messageId, accountId) {
    const data = this.readDataFile();
    const uniqueId = `${accountId}:${messageId}`;
    return data.includes(uniqueId);
  }

  markMessageAsSeen(messageId, accountId) {
    const data = this.readDataFile();
    const uniqueId = `${accountId}:${messageId}`;
    if (!data.includes(uniqueId)) {
      data.push(uniqueId);
      this.writeDataFile(data);
    }
  }
}

module.exports = EmailStatusManager;
