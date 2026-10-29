const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const JOBS = [
  { title: "Python Developer", company: "TechNova", description: "Python SQL REST APIs Git Django problem solving software development" },
  { title: "Machine Learning Intern", company: "DataWorks", description: "Python machine learning statistics pandas numpy scikit-learn data analysis" },
  { title: "Data Analyst", company: "Insight Labs", description: "SQL Excel Python Power BI data visualization statistics communication" },
  { title: "Frontend Developer", company: "PixelCraft", description: "HTML CSS JavaScript React responsive design Git UI development" },
  { title: "AI Engineer Intern", company: "NeuralBridge", description: "Python NLP machine learning deep learning APIs data preprocessing" }
];

const SKILLS = [
  "python","java","c++","c","sql","mysql","mongodb","html","css","javascript",
  "react","node.js","django","flask","fastapi","rest api","machine learning",
  "deep learning","nlp","artificial intelligence","pandas","numpy","scikit-learn",
  "tensorflow","pytorch","excel","power bi","tableau","data analysis",
  "data visualization","statistics","git","github","docker","aws","azure",
  "linux","communication","problem solving","data structures","algorithms","streamlit"
];

function findSkills(text) {
  const lower = text.toLowerCase();
  return [...new Set(SKILLS.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(lower);
  }))].sort();
}
function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9+#.]+/g) || [])
    .filter(word => word.length > 1 && !["and","the","with","for","from","this","that","are","you","your","have","has"].includes(word));
}
function calculateScores(resumeText, jobs) {
  const docs = [resumeText, ...jobs.map(j => `${j.title} ${j.description}`)];
  const tokens = docs.map(tokenize);
  const vocab = new Set(tokens.flat());
  const df = {};
  for (const word of vocab) df[word] = tokens.reduce((n, doc) => n + (doc.includes(word) ? 1 : 0), 0);
  const vectors = tokens.map(doc => {
    const counts = {};
    for (const word of doc) counts[word] = (counts[word] || 0) + 1;
    const vec = {};
    for (const word of vocab) {
      const tf = (counts[word] || 0) / Math.max(1, doc.length);
      const idf = Math.log((docs.length + 1) / (df[word] + 1)) + 1;
      vec[word] = tf * idf;
    }
    return vec;
  });
  const norm = vec => Math.sqrt(Object.values(vec).reduce((sum, x) => sum + x*x, 0));
  const a = vectors[0], normA = norm(a);
  return jobs.map((job, i) => {
    const b = vectors[i+1];
    let dot = 0;
    for (const word of vocab) dot += (a[word] || 0) * (b[word] || 0);
    const raw = normA && norm(b) ? dot / (normA * norm(b)) : 0;
    const resumeSkills = new Set(findSkills(resumeText));
    const jobSkills = new Set(findSkills(`${job.title} ${job.description}`));
    return {
      ...job,
      score: Math.round(raw * 1000) / 10,
      matched: [...jobSkills].filter(s => resumeSkills.has(s)).sort(),
      missing: [...jobSkills].filter(s => !resumeSkills.has(s)).sort()
    };
  }).sort((a,b) => b.score-a.score);
}
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error:"Method not allowed"}) };
  }
  try {
    const body = JSON.parse(event.body || "{}");
    if (!body.data || !body.filename) {
      return { statusCode: 400, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error:"Please select a resume file."}) };
    }
    const ext = String(body.filename).split(".").pop().toLowerCase();
    if (!["pdf","docx"].includes(ext)) {
      return { statusCode: 400, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error:"Only PDF and DOCX files are supported."}) };
    }
    const buffer = Buffer.from(body.data, "base64");
    if (buffer.length > 4 * 1024 * 1024) {
      return { statusCode: 413, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error:"Please upload a file smaller than 4 MB."}) };
    }
    let resumeText = "";
    if (ext === "pdf") {
      const parsed = await pdfParse(buffer);
      resumeText = parsed.text || "";
    } else {
      const parsed = await mammoth.extractRawText({buffer});
      resumeText = parsed.value || "";
    }
    if (!resumeText.trim()) {
      return { statusCode: 422, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error:"No readable text found. Scanned PDFs need OCR before upload."}) };
    }
    const results = calculateScores(resumeText, JOBS);
    return {
      statusCode: 200,
      headers: {"Content-Type":"application/json", "Cache-Control":"no-store"},
      body: JSON.stringify({results, resumeSkills:findSkills(resumeText)})
    };
  } catch (error) {
    console.error("Resume match error:", error && error.message);
    return { statusCode: 500, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error:"Could not read this resume. Please try another PDF or DOCX file."}) };
  }
};
