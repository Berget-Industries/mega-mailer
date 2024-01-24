const { useApi } = require("./useApi");

async function useMegaAssistant(body) {
  const api = await useApi();
  return api.post("/chains/mega-assistant", body);
}

async function useAutoFilter(body) {
  const api = await useApi();
  return api.post("/chains/auto-filter", body);
}

async function useMailSubjector(body) {
  const api = await useApi();
  return api.post("/chains/mailSubjector", body);
}

module.exports = {
  useMegaAssistant,
  useAutoFilter,
  useMailSubjector,
};
