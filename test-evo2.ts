const EVOLUTION_URL = "https://evolution-go.onixagence.com";

async function checkInstances() {
  const globalKey = "BXWlDFI5S3VubVswSHlgijVoCi0TQNYo";
  console.log("Checking instances...");
  
  // Endpoint to fetch instances from Evolution Go
  const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
    headers: { apikey: globalKey }
  });
  
  console.log("Status fetchInstances:", res.status);
  
  if (res.status !== 404) {
      console.log(await res.text());
  }

  // Also check fetching status using a fake key or real key to see format
  const statusRes = await fetch(`${EVOLUTION_URL}/instance/status`, {
    headers: { apikey: globalKey }
  });
  console.log("Status /instance/status:", statusRes.status);
  console.log(await statusRes.text());
}

checkInstances();
