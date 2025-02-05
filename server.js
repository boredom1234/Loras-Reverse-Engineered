const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { generateImages, generateImage } = require('./imageGenerator');
const { createCollage } = require('./createCollage');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Create a base directory for all user sessions
const BASE_DIR = 'user_sessions';
if (!fs.existsSync(BASE_DIR)) {
    fs.mkdirSync(BASE_DIR);
}

// Serve user-specific generated images - Fix the static file serving
app.use('/generated_images', (req, res, next) => {
    const sessionId = req.query.session;
    console.log('Requested session:', sessionId);
    console.log('Requested path:', req.path);
    if (!sessionId) {
        return res.status(400).send('Session ID required');
    }
    const sessionDir = path.join(BASE_DIR, sessionId);
    const filePath = path.join(sessionDir, path.basename(req.path));
    console.log('Looking for file:', filePath);
    if (fs.existsSync(filePath)) {
        console.log('File found, sending...');
        res.sendFile(filePath, { root: '.' });
    } else {
        console.log('File not found');
        res.status(404).send('File not found');
    }
});

// Handle image generation and collage creation
app.post('/generate', async (req, res) => {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const sessionDir = path.join(BASE_DIR, sessionId);
    fs.mkdirSync(sessionDir);
    
    res.json({ success: true, sessionId });
});

// Add a new endpoint for SSE
app.get('/status', async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        if (!sessionId) {
            throw new Error('Session ID required');
        }

        const sessionDir = path.join(BASE_DIR, sessionId);
        if (!fs.existsSync(sessionDir)) {
            throw new Error('Invalid session');
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const prompts = JSON.parse(req.query.prompts);
        
        // Generate images one by one and send updates
        for (let i = 0; i < prompts.length; i++) {
            const { seed, imageUrl } = await generateImage(prompts[i].prompt, i, sessionDir);
            // Add delay between requests
            if (i < prompts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            // Send update for each generated image, including the seed
            res.write(`data: ${JSON.stringify({
                type: 'image',
                index: i,
                imageUrl: `/generated_images/image_${i + 1}.png?session=${sessionId}`,
                seed: seed
            })}\n\n`);
        }
        
        // Create and send collage after all images are done
        await createCollage(sessionDir);
        
        // Send completion message with collage URL
        res.write(`data: ${JSON.stringify({
            type: 'complete',
            collageUrl: `/generated_images/collage.png?session=${sessionId}`
        })}\n\n`);
        
        res.end();

        // Clean up session after 1 hour
        setTimeout(() => {
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true });
            }
        }, 3600000); // 1 hour in milliseconds

    } catch (error) {
        console.error('Error:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error.message
        })}\n\n`);
        res.end();
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 