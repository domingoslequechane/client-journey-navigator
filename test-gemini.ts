const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testVeo(imageFormatFunc: any) {
    const instance: any = imageFormatFunc("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="); // 1x1 png
    instance.prompt = "A test video with an image.";
    
    const parameters = { durationSeconds: Number("4"), aspectRatio: "16:9", personGeneration: "allow_adult" };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning`, {
        method: "POST",
        headers: { "x-goog-api-key": GEMINI_API_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ instances: [instance], parameters })
    });
    console.log("Format:", JSON.stringify(instance));
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
    console.log("------------------------");
}

async function run() {
if (!GEMINI_API_KEY) {
  console.log("No API key defined. Please run with GEMINI_API_KEY env var.");
} else {
  // Test 1: inlineData
  try {
    await testVeo((b64: string) => ({ image: { inlineData: { mimeType: "image/png", data: b64 } } }));
  } catch (e: any) { console.error(e); }
  // Test 2: imageBytes
  try {
    await testVeo((b64: string) => ({ image: { imageBytes: b64, mimeType: "image/png" } }));
  } catch (e: any) { console.error(e); }
  // Test 3: direct base64
  try {
    await testVeo((b64: string) => ({ image: b64 }));
  } catch (e: any) { console.error(e); }
  // Test 4: referenceImages
  try {
    await testVeo((b64: string) => ({ referenceImages: [{ image: { inlineData: { mimeType: "image/png", data: b64 } }, referenceType: "asset" }] }));
  } catch (e: any) { console.error(e); }
}
}
run();
