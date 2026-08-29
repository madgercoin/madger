/** Public launch status. Change only through an authorized, reviewed launch-state release. */
(() => {
  const STATES = Object.freeze({
    MINTED_NOT_TRADING: "MINTED_NOT_TRADING",
    LAUNCH_SCHEDULED: "LAUNCH_SCHEDULED",
    TRADING_LIVE: "TRADING_LIVE",
    PAUSED_OR_DELAYED: "PAUSED_OR_DELAYED"
  });
  const current = STATES.PAUSED_OR_DELAYED;
  const labels = Object.freeze({
    MINTED_NOT_TRADING: Object.freeze({
      default: "Minted on Solana — public trading is not open.",
      safety: "MADGER exists on Solana; its public market is not open.",
      research: "On-chain token created; market launch remains pending."
    }),
    LAUNCH_SCHEDULED: Object.freeze({
      default: "Launch timing has been published through official channels.",
      safety: "A launch window is approved; confirm its details before acting.",
      research: "Launch phase scheduled; venue and timing disclosures are active."
    }),
    TRADING_LIVE: Object.freeze({
      default: "MADGER trading is live through the published official venue.",
      safety: "Market access is active; confirm the mint and venue before signing.",
      research: "Trading phase active; consult the published launch record."
    }),
    PAUSED_OR_DELAYED: Object.freeze({
      default: "Launch preparation continues. Public trading is not live.",
      safety: "No official MADGER pool is live. Ignore purchase links and direct messages.",
      research: "The August 27 target passed without a verified pool; a new date is not announced."
    })
  });
  document.querySelectorAll("[data-launch-state]").forEach(node => {
    const voice = node.dataset.launchVoice || "default";
    node.textContent = labels[current][voice] || labels[current].default;
  });
  document.documentElement.dataset.launchState = current;
  window.MADGER_LAUNCH_STATE = Object.freeze({ STATES, current });
})();
