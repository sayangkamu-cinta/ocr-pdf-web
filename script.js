const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");
const output = document.getElementById("output");

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  statusEl.textContent = "Processing...";

  // IMAGE
  if (file.type.startsWith("image/")) {
    const result = await Tesseract.recognize(
      file,
      "ara+tur",
      { logger: m => statusEl.textContent = m.status }
    );
    output.value = result.data.text;
    statusEl.textContent = "Done";
    return;
  }

  // PDF
  const pdfData = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    statusEl.textContent = `OCR page ${i}/${pdf.numPages}`;

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const result = await Tesseract.recognize(
      canvas,
      "ara+tur",
      { logger: () => {} }
    );

    fullText += `\n=== PAGE ${i} ===\n`;
    fullText += result.data.text;
    output.value = fullText;
  }

  statusEl.textContent = "Done";
});
