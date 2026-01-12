pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.min.js";

const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");
const output = document.getElementById("output");

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  statusEl.textContent = "Loading file...";
  output.value = "";

  const pdfData = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

  let fullText = "";

  const worker = await Tesseract.createWorker({
    workerPath: './tesseract.min.js',
    corePath: './tesseract.min.js'
  });

  await worker.loadLanguage('ara');
  await worker.initialize('ara');

  for (let i = 1; i <= pdf.numPages; i++) {
    statusEl.textContent = `OCR page ${i}/${pdf.numPages}`;

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const result = await worker.recognize(canvas);
    fullText += `\n=== PAGE ${i} ===\n` + result.data.text;
    output.value = fullText;
  }

  await worker.terminate();
  statusEl.textContent = "Done";
});
