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
const moodNode = document.querySelector("#mood");
const quoteNode = document.querySelector("#quote");
const yearNode = document.querySelector("#year");
if (moodNode) moodNode.textContent = mood;
if (quoteNode) quoteNode.textContent = quote;
if (yearNode) yearNode.textContent = new Date().getFullYear();

const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector("#main-nav");
menuButton?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});
nav?.addEventListener("click", event => {
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

const launchNotifyForm = document.querySelector("#launch-notify-form");
const launchNotifyStatus = document.querySelector("#launch-notify-status");
if (launchNotifyForm) {
  launchNotifyForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = launchNotifyForm.querySelector("button[type='submit']");
    const data = new FormData(launchNotifyForm);
    data.append("_subject", "$MADGER launch reminder signup");
    data.append("launch_time_utc", "2026-08-31 14:00 UTC");
    data.append("source", "madgercoin.com launch countdown");
    data.append("submitted_at", new Date().toISOString());
    button.disabled = true;
    launchNotifyStatus.textContent = "Saving your reminder…";
    try {
      const response = await fetch("https://formsubmit.co/ajax/madgercoin@gmail.com", { method: "POST", headers: { Accept: "application/json" }, body: data });
      if (!response.ok) throw new Error("Signup failed");
      const calendar = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//MADGER//Launch Reminder//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT","UID:madger-launch-20260831@madgercoin.com","DTSTAMP:20260829T000000Z","DTSTART:20260831T140000Z","DTEND:20260831T143000Z","SUMMARY:$MADGER Launch","DESCRIPTION:$MADGER launch reminder from madgercoin.com","URL:https://madgercoin.com/","BEGIN:VALARM","TRIGGER:-PT24H","ACTION:DISPLAY","DESCRIPTION:$MADGER launches in 24 hours","END:VALARM","BEGIN:VALARM","TRIGGER:-PT1H","ACTION:DISPLAY","DESCRIPTION:$MADGER launches in 1 hour","END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");
      const objectUrl = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a"); link.href = objectUrl; link.download = "MADGER-launch-reminder.ics"; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      launchNotifyForm.reset(); launchNotifyStatus.textContent = "Saved — add the downloaded reminder to your phone calendar.";
    } catch { launchNotifyStatus.textContent = "Could not save yet. Please try again."; }
    finally { button.disabled = false; }
  });
}

const manifestoFooter = document.querySelector(".manifesto blockquote footer");
if (manifestoFooter) {
  const fieldMark = document.createElement("p");
  fieldMark.className = "launch-note";
  fieldMark.setAttribute("aria-label", "Burrow field mark: DIGPASTNOISE27");
  fieldMark.innerHTML = '<span class="dot" aria-hidden="true"></span> BURROW FIELD MARK · <strong>DIGPASTNOISE27</strong>';
  manifestoFooter.insertAdjacentElement("afterend", fieldMark);
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

if (!reducedMotion) {
  window.addEventListener("pointermove", event => {
    root.style.setProperty("--mouse-x", `${event.clientX}px`);
    root.style.setProperty("--mouse-y", `${event.clientY}px`);
  }, { passive: true });
}

const updateScrollProgress = () => {
  const available = document.documentElement.scrollHeight - window.innerHeight;
  root.style.setProperty("--scroll", `${available > 0 ? (window.scrollY / available) * 100 : 0}%`);
};
updateScrollProgress();
window.addEventListener("scroll", updateScrollProgress, { passive: true });

const revealNodes = document.querySelectorAll(".reveal");
if (reducedMotion || !("IntersectionObserver" in window)) {
  revealNodes.forEach(node => node.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  revealNodes.forEach(node => observer.observe(node));
}

if (!reducedMotion) {
  document.querySelectorAll("[data-tilt]").forEach(card => {
    card.addEventListener("pointermove", event => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      card.style.setProperty("--ry", `${x * 7}deg`);
      card.style.setProperty("--rx", `${y * -7}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--ry", "0deg");
      card.style.setProperty("--rx", "0deg");
    });
  });
}
