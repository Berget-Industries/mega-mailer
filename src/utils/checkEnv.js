module.exports = function checkEnv() {
  const {
    HEARTBEAT_PORT,
    IMAP_USERNAME,
    IMAP_PASSWORD,
    IMAP_FROM,
    API_HOST,
    ACTIVATED_API_KEYS,
  } = process.env;

  const vars = {
    HEARTBEAT_PORT,
    IMAP_USERNAME,
    IMAP_PASSWORD,
    IMAP_FROM,
    API_HOST,
    ACTIVATED_API_KEYS,
  };

  const isEmpty = Object.entries(vars)
    .filter(([k, v]) => v === "" || v === undefined)
    .map(([k, v]) => k);

  if (isEmpty.length > 0) {
    console.log("Enviornment variables not set!");
    console.log("Missing values for: ", isEmpty);
    process.exit(1);
  }
};
