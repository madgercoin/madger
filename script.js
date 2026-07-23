const moods=[
  ["Still digging.","Markets change. Madger doesn't."],
  ["Not impressed.","Another prediction. Cool."],
  ["Coffee helped.","Barely."],
  ["About time.","Green candles should not be this surprising."],
  ["Nope.","Read the contract before touching anything."],
  ["Burrow mode.","Build quietly. Let the work make noise."],
  ["Unbothered.","Volatility is loud. Bedrock isn't."]
];
const day=Math.floor(Date.now()/86400000);
const [mood,quote]=moods[day%moods.length];
document.getElementById('mood').textContent=mood;
document.getElementById('quote').textContent=quote;
document.getElementById('year').textContent=new Date().getFullYear();

document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  const id=a.getAttribute('href'); if(id==='#')return;
  const target=document.querySelector(id); if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});}
}));