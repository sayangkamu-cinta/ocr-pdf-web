const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  resultEl.value = "";
  statusEl.textContent = "Loading PDF...";

  // pastikan pdfjs ada
  if (!window.pdfjsLib) {
    statusEl.textContent = "pdf.js not loaded";
    return;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  statusEl.textContent = `PDF loaded. Pages: ${pdf.numPages}`;

  // set bahasa Arab + Turki
  const worker = await Tesseract.createWorker({
    logger: m => {
      if (m.status === "recognizing text") {
        statusEl.textContent = `OCR page ${currentPage}/${pdf.numPages} (${Math.round(m.progress * 100)}%)`;
      }
    }
  });

  await worker.loadLanguage("ara+tur");
  await worker.initialize("ara+tur");

  for (var currentPage = 1; currentPage <= pdf.numPages; currentPage++) {
    statusEl.textContent = `Rendering page ${currentPage}/${pdf.numPages}`;

    const page = await pdf.getPage(currentPage);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    statusEl.textContent = `OCR page ${currentPage}/${pdf.numPages}`;

    const { data } = await worker.recognize(canvas);

    resultEl.value +=
      `\n\n===== PAGE ${currentPage} =====\n\n` +
      data.text;
  }

  await worker.terminate();
  statusEl.textContent = "OCR finished ✅";
});
