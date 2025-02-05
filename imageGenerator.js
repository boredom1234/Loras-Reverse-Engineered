const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const fs = require("fs");
const path = require("path");

const API_URL = "https://www.loras.dev/api/image";
const API_KEY =
  "6101599d6e33e3bda336b8d007ca22e35a64c72cfd52c2d8197f663389fc50c5";

async function generateImage(prompt, index, sessionDir) {
    const prefix = "shou_xin, pencil sketch";
    const fullPrompt = `${prefix}, ${prompt}`;
    const seed = Math.floor(Math.random() * 1000000000);

    const requestBody = {
        lora: "shou_xin",
        prompt: fullPrompt,
        seed: seed,
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
            fs.writeFileSync(
                path.join(sessionDir, `image_${index + 1}.png`),
                data.image.b64_json,
                "base64"
            );
            console.log(`Image ${index + 1} generated with seed: ${seed}`);
        }
        
        return { seed, imageUrl: `/generated_images/image_${index + 1}.png` };
    } catch (error) {
        console.error(`Error generating image ${index + 1}:`, error);
        throw error;
    }
}

async function generateImages(prompts) {
    // Clear previous images
    const dir = "generated_images";
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
    }
    fs.mkdirSync(dir);

    for (let i = 0; i < prompts.length; i++) {
        console.log(`Generating image ${i + 1} of ${prompts.length}`);
        await generateImage(prompts[i].prompt, i);
        // Add a delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    
    return prompts.length; // Return number of images generated
}

// Export both functions
module.exports = { generateImages, generateImage }; 