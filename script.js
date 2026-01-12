const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

/* ===== FIX PDF.JS WORKER ===== */
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  statusEl.textContent = "Processing...";
  resultEl.value = "";

  try {
    if (file.type === "application/pdf") {
      await ocrPDF(file);
    } else if (file.type.startsWith("image/")) {
      await ocrImage(file);
    } else {
      statusEl.textContent = "File tidak didukung";
    }
  } catch (e) {
    statusEl.textContent = "ERROR: " + e.message;
    console.error(e);
  }
});

async function createWorker() {
  const worker = await Tesseract.createWorker({
    logger: m => statusEl.textContent = m.status,
    langPath: "https://tessdata.projectnaptha.com/4.0.0"
  });
  await worker.loadLanguage("ara+tur");
  await worker.initialize("ara+tur");
  return worker;
}

async function ocrImage(file) {
  const worker = await createWorker();
  const { data } = await worker.recognize(file);
  resultEl.value = data.text;
  await worker.terminate();
  statusEl.textContent = "OCR selesai ✅";
}

async function ocrPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const worker = await createWorker();

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
