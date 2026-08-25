const moods = [
  ["Still digging.", "Markets change. Madger doesn't."],
  ["Not impressed.", "Another prediction. Cool."],
  ["Coffee helped.", "Barely."],
  ["About time.", "Green candles should not be this surprising."],
  ["Read first.", "Verify the contract before touching anything."],
  ["Burrow mode.", "Build quietly. Let the work make noise."],
  ["Unbothered.", "Volatility is loud. Bedrock isn't."]
];

const day = Math.floor(Date.now() / 86400000);
const [mood, quote] = moods[day % moods.length];
document.querySelector("#mood").textContent = mood;
document.querySelector("#quote").textContent = quote;
document.querySelector("#year").textContent = new Date().getFullYear();

const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector("#main-nav");
menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
nav.addEventListener("click", event => {
  if (event.target.matches("a")) {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }
});

const copyButton = document.querySelector("[data-copy-target]");
const copyStatus = document.querySelector(".copy-status");
copyButton?.addEventListener("click", async () => {
  const address = document.querySelector(`#${copyButton.dataset.copyTarget}`).textContent;
  try {
    await navigator.clipboard.writeText(address);
    copyStatus.textContent = "Official mint address copied.";
  } catch {
    copyStatus.textContent = "Copy unavailable. Select and copy the address above.";
  }
});

const countdown = document.querySelector("[data-countdown]");
if (countdown) {
  const launchAt = Date.parse(countdown.dataset.launchAt);
  const fields = {
    days: countdown.querySelector("[data-countdown-days]"),
    hours: countdown.querySelector("[data-countdown-hours]"),
    minutes: countdown.querySelector("[data-countdown-minutes]"),
    seconds: countdown.querySelector("[data-countdown-seconds]")
  };
  const note = document.querySelector("[data-countdown-note]");

  const renderCountdown = () => {
    const remaining = Math.max(0, launchAt - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    fields.days.textContent = String(Math.floor(totalSeconds / 86400)).padStart(2, "0");
    fields.hours.textContent = String(Math.floor(totalSeconds / 3600) % 24).padStart(2, "0");
    fields.minutes.textContent = String(Math.floor(totalSeconds / 60) % 60).padStart(2, "0");
    fields.seconds.textContent = String(totalSeconds % 60).padStart(2, "0");
    if (remaining === 0) {
      note.textContent = "The target time has arrived. Wait for a verified live-status update and official market link on this website before taking any action.";
    }
  };

  renderCountdown();
  window.setInterval(renderCountdown, 1000);
}
