const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args)); // Dynamic import for Node.js
const fs = require("fs");

const API_URL = "https://www.loras.dev/api/image";
const API_KEY = process.env.API_KEY;

async function generateImage(prompt, index) {
  const prefix = "shou_xin, pencil sketch";
  const fullPrompt = `${prefix}, ${prompt}`;

  const requestBody = {
    lora: "shou_xin",
    prompt: fullPrompt,
    seed: Math.floor(Math.random() * 1000000000),
    userAPIKey: API_KEY,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Processing image ${index + 1}...`);

    if (data.image && data.image.b64_json) {
      const dir = "generated_images";
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      fs.writeFileSync(
        `${dir}/image_${index + 1}.png`,
        data.image.b64_json,
        "base64"
      );
      console.log("Seed:", data.seed);
      console.log(`Image saved as image_${index + 1}.png`);
    }
  } catch (error) {
    console.error(`Error generating image ${index + 1}:`, error);
  }
}

async function processAllPrompts() {
  const prompts = JSON.parse(fs.readFileSync("prompts.json", "utf8"));

  for (let i = 0; i < prompts.length; i++) {
    console.log(`Generating image ${i + 1} of ${prompts.length}`);
    await generateImage(prompts[i].prompt, i);
    // Add a delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

processAllPrompts().catch((error) => {
  console.error("Error processing prompts:", error);
});
