const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  statusEl.textContent = "Loading...";
  resultEl.value = "";

  if (file.type.startsWith("image/")) {
    await ocrImage(file);
  } else if (file.type === "application/pdf") {
    await ocrPDF(file);
  } else {
    statusEl.textContent = "File tidak didukung";
  }
});

async function ocrImage(file) {
  const worker = await Tesseract.createWorker();
  await worker.loadLanguage("ara+tur");
  await worker.initialize("ara+tur");

  const { data } = await worker.recognize(file);
  resultEl.value = data.text;

  await worker.terminate();
  statusEl.textContent = "OCR selesai ✅";
}

async function ocrPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const worker = await Tesseract.createWorker();
  await worker.loadLanguage("ara+tur");
  await worker.initialize("ara+tur");

  for (let i = 1; i <= pdf.numPages; i++) {
    statusEl.textContent = `OCR halaman ${i}/${pdf.numPages}`;

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const { data } = await worker.recognize(canvas);

    resultEl.value += `\n\n=== PAGE ${i} ===\n${data.text}`;
  }

  await worker.terminate();
  statusEl.textContent = "OCR PDF selesai ✅";
}
