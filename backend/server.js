const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Enable CORS so your Vercel frontend can call this Render backend
app.use(cors());
app.use(express.json());

// A simple test route
app.get('/api/hello', (req, res) => {
    res.json({
        message: "Hello from the always-on Render Backend!",
        status: "Running perfectly"
    });
});

// Example route for a heavy face detection process
app.post('/api/detect-faces', async (req, res) => {
    // You can safely use heavy libraries like OpenCV, Canvas, or TensorFlow here
    // because Render does not have the 50MB size limit that Vercel has.
    
    res.json({
        success: true,
        message: "Face detection would run here without serverless limits."
    });
});

app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
