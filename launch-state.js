/** Public launch status. Change only through an authorized, reviewed launch-state release. */
(() => {
  const STATES = Object.freeze({
    MINTED_NOT_TRADING: "MINTED_NOT_TRADING",
    LAUNCH_SCHEDULED: "LAUNCH_SCHEDULED",
    TRADING_LIVE: "TRADING_LIVE",
    PAUSED_OR_DELAYED: "PAUSED_OR_DELAYED"
  });
  const current = STATES.MINTED_NOT_TRADING;
  const labels = Object.freeze({
    MINTED_NOT_TRADING: "Minted on Solana — not yet publicly launched for trading.",
    LAUNCH_SCHEDULED: "Public launch scheduled — verify timing only through official channels.",
    TRADING_LIVE: "Public trading is live — verify the mint and official venue before acting.",
    PAUSED_OR_DELAYED: "Public launch is paused or delayed — do not follow trading instructions."
  });
  document.querySelectorAll("[data-launch-state]").forEach(node => { node.textContent = labels[current]; });
  document.documentElement.dataset.launchState = current;
  window.MADGER_LAUNCH_STATE = Object.freeze({ STATES, current });
})();
