const Mail = require("../models/Mail");

class EmailStatusManager {
  async messageHasBeenSeen(messageId, accountId) {
    const message = await Mail.findOne({ messageId, accountId });
    return Boolean(message);
  }

  async markMessageAsSeen(messageId, accountId) {
    await Mail.create({ messageId, accountId, isSeen: true });
  }

  async markMessageAsUnread(messageId, accountId) {
    await Mail.findOneAndDelete({ messageId, accountId });
  }
}

module.exports = EmailStatusManager;
