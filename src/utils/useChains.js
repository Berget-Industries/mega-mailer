import { useApi } from "./useApi";
const api = useApi();

async function useMegaAssistant(body) {
  return api.post("/chains/mega-assistant", body);
}

async function useManualFilter(body) {
  return api.post("/chains/manualFilter", body);
}

async function useMailSubjector(body) {
  return api.post("/chains/mailSubjector", body);
}

module.exports = {
  useMegaAssistant,
  useManualFilter,
  useMailSubjector,
};
