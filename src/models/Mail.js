const mongoose = require("mongoose");

const mailSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
  },
  accountId: {
    type: String,
    required: true,
  },
  isSeen: {
    type: Boolean,
    default: false,
  },
});

const Mail = mongoose.model("Mail", mailSchema);

module.exports = Mail;
