const fileInput = document.getElementById("fileInput");
const output = document.getElementById("output");
const statusEl = document.getElementById("status");

fileInput.addEventListener("change", handleFile);

async function handleFile() {
  const file = fileInput.files[0];
  if (!file) return;

  output.value = "";
  statusEl.textContent = "Loading file...";

  if (file.type === "application/pdf") {
    await ocrPDF(file);
  } else {
    await ocrImage(file);
  }
}

/* ================= OCR WORKER (ARAB ONLY) ================= */

async function createWorkerArabic() {
  const worker = await Tesseract.createWorker({
    logger: m => statusEl.textContent = m.status,
    langPath: "https://tessdata.projectnaptha.com/4.0.0"
  });

  await worker.loadLanguage("ara");
  await worker.initialize("ara");

  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    preserve_interword_spaces: "1",
    textord_heavy_nr: "1"
  });

  return worker;
}

/* ================= IMAGE OCR ================= */

async function ocrImage(file) {
  const worker = await createWorkerArabic();
  const { data } = await worker.recognize(file);
  output.value = data.text;
  await worker.terminate();
}

/* ================= PDF OCR (VISION ONLY) ================= */

async function ocrPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const worker = await createWorkerArabic();

  for (let i = 1; i <= pdf.numPages; i++) {
    statusEl.textContent = `OCR page ${i}/${pdf.numPages}`;

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 3 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const { data } = await worker.recognize(canvas);

    output.value += `\n\n=== PAGE ${i} ===\n`;
    output.value += data.text;
  }

  await worker.terminate();
  statusEl.textContent = "OCR finished";
}
