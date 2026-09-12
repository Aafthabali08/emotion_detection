const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');

// Monkey patch face-api to use node-canvas
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
// Increase JSON limit to handle base64 images for feedback
app.use(express.json({ limit: '50mb' }));

// Set up multer to receive image uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

// Setup Dataset directories for continuous learning
const datasetDir = path.join(__dirname, 'dataset');
const acceptedDir = path.join(datasetDir, 'accepted');
const rejectedDir = path.join(datasetDir, 'rejected');

if (!fs.existsSync(datasetDir)) fs.mkdirSync(datasetDir);
if (!fs.existsSync(acceptedDir)) fs.mkdirSync(acceptedDir);
if (!fs.existsSync(rejectedDir)) fs.mkdirSync(rejectedDir);

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

// Feedback endpoint for continuous learning
app.post('/api/feedback', (req, res) => {
  try {
    const { imageBase64, predictedEmotion, status } = req.body;
    
    if (!imageBase64 || !predictedEmotion || !status) {
      return res.status(400).json({ error: 'Missing feedback data' });
    }

    const timestamp = Date.now();
    const filename = `${predictedEmotion}_${timestamp}.jpg`;
    
    // Strip base64 prefix
    const base64Data = imageBase64.replace(/^data:image\/jpeg;base64,/, "");
    
    let targetDir = status === 'accepted' ? acceptedDir : rejectedDir;
    const filePath = path.join(targetDir, filename);

    // Save the image frame for future model retraining
    fs.writeFileSync(filePath, base64Data, 'base64');

    // Append metadata to insights log
    const insight = {
      timestamp,
      filename,
      predictedEmotion,
      status,
      action: status === 'accepted' ? 'Reinforced positive weight' : 'Flagged for penalty/correction'
    };
    
    fs.appendFileSync(
      path.join(datasetDir, 'insights.jsonl'), 
      JSON.stringify(insight) + '\n'
    );

    console.log(`[LEARNING] Feedback logged: ${status.toUpperCase()} for ${predictedEmotion}`);
    
    res.json({ success: true, message: 'Insight recorded for continuous learning' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
