const { useApi } = require("./useApi");

async function useMegaAssistant(key, body) {
  const api = await useApi(key);
  return api.post("/chains/mega-assistant", body);
}

async function useAutoFilter(key, body) {
  const api = await useApi(key);
  return api.post("/chains/auto-filter", body);
}

async function useMailSubjector(key, body) {
  const api = await useApi(key);
  return api.post("/chains/mailSubjector", body);
}

module.exports = {
  useMegaAssistant,
  useAutoFilter,
  useMailSubjector,
};
