const form = document.getElementById("resume-form");
const input = document.getElementById("resume");
const fileLabel = document.getElementById("file-label");
const fileSub = document.getElementById("file-sub");
const statusBox = document.getElementById("status");
const analyzeBtn = document.getElementById("analyze-btn");
const results = document.getElementById("results");
let lastResults = null;

input.addEventListener("change", () => {
  const file = input.files[0];
  if (!file) return;
  fileLabel.textContent = file.name;
  fileSub.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  statusBox.textContent = "";
  statusBox.className = "status";
});

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function chips(items, missing=false) {
  if (!items || !items.length) return `<span class="company">None detected</span>`;
  return items.map(x => `<span class="chip ${missing ? "missing" : ""}">${esc(x)}</span>`).join("");
}
function render(data) {
  lastResults = data;
  document.getElementById("best-job").textContent = data.results[0]?.title || "—";
  document.getElementById("best-score").textContent = `${data.results[0]?.score ?? 0}%`;
  document.getElementById("skill-count").textContent = data.resumeSkills.length;
  document.getElementById("resume-skills").innerHTML = chips(data.resumeSkills);
  document.getElementById("job-list").innerHTML = data.results.map((job, i) => `
    <article class="job-card">
      <div class="job-top"><div><h3>${i+1}. ${esc(job.title)}</h3><div class="company">${esc(job.company)}</div></div><div class="score">${job.score}%</div></div>
      <div class="track"><span style="width:${Math.min(100,Math.max(0,job.score))}%"></span></div>
      <p class="skill-line"><strong>Matched skills:</strong> ${job.matched.length ? esc(job.matched.join(", ")) : "None detected"}</p>
      <div class="chips">${chips(job.matched)}</div>
      <p class="skill-line"><strong>Skills to build:</strong> ${job.missing.length ? esc(job.missing.join(", ")) : "No listed gaps detected"}</p>
      <div class="chips">${chips(job.missing, true)}</div>
    </article>`).join("");
  results.classList.remove("hidden");
  results.scrollIntoView({behavior:"smooth", block:"start"});
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = input.files[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) {
    statusBox.textContent = "Please choose a file smaller than 4 MB.";
    statusBox.className = "status error";
    return;
  }
  const ext = file.name.split(".").pop().toLowerCase();
  if (!["pdf", "docx"].includes(ext)) {
    statusBox.textContent = "Only PDF and DOCX files are supported.";
    statusBox.className = "status error";
    return;
  }
  analyzeBtn.disabled = true;
  statusBox.textContent = "Extracting resume text and calculating job matches…";
  statusBox.className = "status";
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const response = await fetch("/.netlify/functions/match", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({filename:file.name, contentType:file.type, data:base64, candidate:document.getElementById("candidate").value.trim()})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not analyze this file.");
    render(data);
    statusBox.textContent = "Analysis complete.";
    statusBox.className = "status success";
  } catch (error) {
    statusBox.textContent = error.message || "Something went wrong. Please try again.";
    statusBox.className = "status error";
  } finally {
    analyzeBtn.disabled = false;
  }
});
document.getElementById("download-btn").addEventListener("click", () => {
  if (!lastResults) return;
  const quote = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Job","Company","Similarity Score","Matched Skills","Missing Skills"], ...lastResults.results.map(j => [j.title,j.company,j.score,j.matched.join(", "),j.missing.join(", ")])];
  const csv = rows.map(row => row.map(quote).join(",")).join("\r\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="job_match_results.csv"; a.click();
  URL.revokeObjectURL(url);
});
