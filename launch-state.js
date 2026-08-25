/** Public launch status. Change only through an authorized, reviewed launch-state release. */
(() => {
  const STATES = Object.freeze({
    MINTED_NOT_TRADING: "MINTED_NOT_TRADING",
    LAUNCH_SCHEDULED: "LAUNCH_SCHEDULED",
    TRADING_LIVE: "TRADING_LIVE",
    PAUSED_OR_DELAYED: "PAUSED_OR_DELAYED"
  });
  const current = STATES.LAUNCH_SCHEDULED;
  const labels = Object.freeze({
    MINTED_NOT_TRADING: Object.freeze({
      default: "Minted on Solana — public trading is not open.",
      safety: "MADGER exists on Solana; its public market is not open.",
      research: "On-chain token created; market launch remains pending."
    }),
    LAUNCH_SCHEDULED: Object.freeze({
      default: "Launch scheduled for August 27, 2026 at 14:00 GMT through Raydium LaunchLab.",
      safety: "Launch is scheduled for August 27 at 14:00 GMT. Verify the mint and venue through madgercoin.com.",
      research: "Launch scheduled for August 27, 2026 at 14:00 GMT through Raydium LaunchLab on Solana."
    }),
    TRADING_LIVE: Object.freeze({
      default: "MADGER trading is live through the published official venue.",
      safety: "Market access is active; confirm the mint and venue before signing.",
      research: "Trading phase active; consult the published launch record."
    }),
    PAUSED_OR_DELAYED: Object.freeze({
      default: "The launch is paused. Wait for a new official update.",
      safety: "Market instructions are suspended; ignore links until further notice.",
      research: "Launch phase paused; the prior timetable is no longer operative."
    })
  });
  document.querySelectorAll("[data-launch-state]").forEach(node => {
    const voice = node.dataset.launchVoice || "default";
    node.textContent = labels[current][voice] || labels[current].default;
  });
  document.documentElement.dataset.launchState = current;
  window.MADGER_LAUNCH_STATE = Object.freeze({ STATES, current });
})();
