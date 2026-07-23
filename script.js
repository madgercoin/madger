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
