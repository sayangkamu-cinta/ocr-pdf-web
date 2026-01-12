window.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("fileInput");
  const status = document.getElementById("status");
  const output = document.getElementById("output");

  if (!input) {
    alert("ERROR: file input not found");
    return;
  }

  input.addEventListener("change", async () => {
    if (!input.files || input.files.length === 0) {
      status.textContent = "No file selected";
      return;
    }

    const file = input.files[0];
    status.textContent = "Selected: " + file.name;

    if (file.type.startsWith("image/")) {
      status.textContent = "Running OCR...";
      const result = await Tesseract.recognize(file, "ara+tur", {
        logger: m => status.textContent = m.status
      });
      output.value = result.data.text;
      status.textContent = "Done";
    } else {
      output.value = "PDF detected. Upload works. OCR disabled in this demo.";
      status.textContent = "Upload OK";
    }
  });
});
