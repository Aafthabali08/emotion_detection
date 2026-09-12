const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');

// Monkey patch face-api to use node-canvas
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Set up multer to receive image uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// Load models
async function loadModels() {
  const modelsPath = path.join(__dirname, 'models');
  console.log('Loading face-api models from:', modelsPath);
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
  await faceapi.nets.faceExpressionNet.loadFromDisk(modelsPath);
  console.log('Models loaded successfully');
}

loadModels().catch(console.error);

app.get('/api/hello', (req, res) => {
    res.json({
        message: "Hello from the Emotion Detection Backend!",
        status: "Running perfectly"
    });
});

app.post('/api/detect', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Convert the buffer to a canvas image
    const img = new Image();
    img.src = req.file.buffer;

    // Detect faces and emotions
    const detections = await faceapi
      .detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceExpressions();

    // Format the response
    const results = detections.map(d => {
      // Find the dominant emotion
      const emotions = d.expressions;
      const dominantEmotion = Object.keys(emotions).reduce((a, b) => 
        emotions[a] > emotions[b] ? a : b
      );

      return {
        box: d.detection.box, // x, y, width, height
        dominantEmotion: dominantEmotion,
        allEmotions: emotions
      };
    });

    res.json({ faces: results });
  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
