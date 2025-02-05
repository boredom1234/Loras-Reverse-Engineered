const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function createCollage(sessionDir) {
  // Read all images from the session directory
  const files = fs
    .readdirSync(sessionDir)
    .filter((file) => file.endsWith(".png"))
    .sort((a, b) => {
      // Sort by image number
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });

  if (files.length === 0) {
    console.error("No images found in session directory");
    return;
  }

  // Define dimensions
  const imageWidth = 1024; // Each image is 1024px wide
  const imageHeight = 768; // Each image is 768px high
  const imagesPerRow = 3;
  const rows = Math.ceil(files.length / imagesPerRow);
  const labelHeight = 40; // Height for the number label
  const totalHeight = (imageHeight + labelHeight) * rows;

  // Create an array to hold all the image objects and labels
  const compositeArray = [];

  for (let i = 0; i < files.length; i++) {
    const row = Math.floor(i / imagesPerRow);
    const col = i % imagesPerRow;

    // Add the image
    compositeArray.push({
      input: path.join(sessionDir, files[i]),
      top: row * (imageHeight + labelHeight),
      left: col * imageWidth,
    });

    // Create label with number
    const labelSvg = Buffer.from(
      `<svg width="${imageWidth}" height="${labelHeight}">
        <text x="${imageWidth/2}" y="${labelHeight/2}" font-family="Arial" font-size="24" 
          text-anchor="middle" alignment-baseline="middle" fill="black">
          ${i + 1}
        </text>
      </svg>`
    );

    // Add the label
    compositeArray.push({
      input: labelSvg,
      top: row * (imageHeight + labelHeight) + imageHeight,
      left: col * imageWidth,
    });
  }

  // Create the collage
  try {
    await sharp({
      create: {
        width: imageWidth * imagesPerRow,
        height: totalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite(compositeArray)
      .toFile(path.join(sessionDir, 'collage.png'));

    console.log("Collage created successfully as collage.png");
  } catch (error) {
    console.error("Error creating collage:", error);
  }
}

module.exports = { createCollage };
