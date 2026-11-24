const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const preview = document.getElementById('preview');
const emptyUpload = document.getElementById('emptyUpload');
const changeHint = document.getElementById('changeHint');
const fileMeta = document.getElementById('fileMeta');
const analyzeBtn = document.getElementById('analyzeBtn');
const buttonText = document.getElementById('buttonText');
const errorMsg = document.getElementById('errorMsg');
const resultsContent = document.getElementById('resultsContent');
const resultsEmpty = document.getElementById('resultsEmpty');
const resultBadge = document.getElementById('resultBadge');
const paletteStrip = document.getElementById('paletteStrip');
const colorList = document.getElementById('colorList');
const copyAllBtn = document.getElementById('copyAllBtn');
let currentFile = null;
let currentColors = [];
let previewUrl = null;

const validTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']);
function showError(message) { errorMsg.textContent = message; errorMsg.hidden = false; }
function clearError() { errorMsg.textContent = ''; errorMsg.hidden = true; }
function resetResults() { resultsContent.hidden = true; resultsEmpty.hidden = false; resultBadge.textContent = 'AWAITING IMAGE'; currentColors = []; }
function setFile(file) {
  clearError();
  if (!file) return;
  if (!validTypes.has(file.type)) { showError('Choose a JPG, PNG, WEBP, GIF, or BMP image.'); return; }
  if (file.size > 10 * 1024 * 1024) { showError('The image must be smaller than 10 MB.'); return; }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  currentFile = file;
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  preview.hidden = false;
  emptyUpload.hidden = true;
  changeHint.hidden = false;
  fileMeta.innerHTML = '';
  const name = document.createElement('span'); name.textContent = file.name;
  const size = document.createElement('span'); size.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  fileMeta.append(name, size);
  analyzeBtn.disabled = false;
  resetResults();
}
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
fileInput.addEventListener('change', e => setFile(e.target.files[0]));
['dragenter', 'dragover'].forEach(name => dropzone.addEventListener(name, e => { e.preventDefault(); dropzone.classList.add('drag-over'); }));
['dragleave', 'drop'].forEach(name => dropzone.addEventListener(name, e => { e.preventDefault(); dropzone.classList.remove('drag-over'); }));
dropzone.addEventListener('drop', e => setFile(e.dataTransfer.files[0]));
function makeEl(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; }
async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); const old = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = old, 1400); }
  catch { showError('Copy failed. Please copy the code manually.'); }
}
function renderResults(colors) {
  currentColors = colors;
  paletteStrip.replaceChildren(); colorList.replaceChildren();
  colors.forEach((color, i) => {
    const block = makeEl('div'); block.style.width = `${color.percentage}%`; block.style.backgroundColor = color.hex; block.title = `${color.hex} · ${color.percentage}%`; paletteStrip.appendChild(block);
    const row = makeEl('div', 'color-row');
    const chip = makeEl('div', 'color-chip'); chip.style.backgroundColor = color.hex;
    const number = makeEl('span', 'color-number', String(i + 1).padStart(2, '0'));
    const values = makeEl('div', 'color-values');
    values.append(makeEl('div', 'color-hex', color.hex), makeEl('div', 'color-rgb', `RGB (${color.rgb.join(', ')})`));
    const percent = makeEl('span', 'color-percent', `${color.percentage.toFixed(1)}%`);
    const copyBtn = makeEl('button', 'copy-btn', '⧉'); copyBtn.type = 'button'; copyBtn.title = `Copy ${color.hex}`; copyBtn.setAttribute('aria-label', `Copy ${color.hex}`);
    copyBtn.addEventListener('click', () => copy(color.hex, copyBtn));
    row.append(chip, number, values, percent, copyBtn); colorList.appendChild(row);
  });
  resultsEmpty.hidden = true; resultsContent.hidden = false; resultBadge.textContent = 'EXTRACTION COMPLETE';
}
analyzeBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  clearError(); analyzeBtn.disabled = true; buttonText.textContent = 'Analyzing image…';
  const fileToAnalyze = currentFile;
  const data = new FormData(); data.append('image', fileToAnalyze);
  try {
    const response = await fetch('/api/analyze', { method: 'POST', body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not analyze this image.');
    if (currentFile === fileToAnalyze) renderResults(result.colors);
  } catch (error) { showError(error.message || 'Something went wrong. Please try again.'); }
  finally { analyzeBtn.disabled = false; buttonText.textContent = 'Extract color palette'; }
});
copyAllBtn.addEventListener('click', () => copy(currentColors.map(c => c.hex).join(', '), copyAllBtn));
