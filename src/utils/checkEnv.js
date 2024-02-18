module.exports = function checkEnv() {
  const { API_HOST, API_KEY } = process.env;

  const vars = {
    API_HOST,
    API_KEY,
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
