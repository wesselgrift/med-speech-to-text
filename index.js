import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { SpeechClient } from '@google-cloud/speech';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Check for required environment variables
if (!process.env.GOOGLE_PROJECT_ID) {
  console.error('Error: GOOGLE_PROJECT_ID environment variable is not set');
  console.error('Please set it in the .env file');
  process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  console.error('Please set it in the .env file');
  process.exit(1);
}

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Create a speech client
const speechClient = new SpeechClient();
const projectId = process.env.GOOGLE_PROJECT_ID;

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected');
  let recognizeStream = null;
  let streamHasConfig = false;
  let isFirstRequest = true;

  socket.on('startGoogleCloudStream', (config) => {
    try {
      // Close any existing stream first
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
      }

      console.log('Starting Google Cloud Stream with config:', config);
      isFirstRequest = true;
      
      // Create the streaming recognition request
      const request = {
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: parseInt(config.sampleRateHertz) || 16000,
          languageCode: config.languageCode || 'en-US',
          enableAutomaticPunctuation: config.enablePunctuation !== false,
          enableSpeakerDiarization: config.enableSpeakerDiarization === true,
          diarizationSpeakerCount: config.enableSpeakerDiarization ? (config.speakerCount || 2) : undefined,
          model: 'latest_long',
        },
        interimResults: true,
      };

      // Create a recognize stream
      recognizeStream = speechClient
        .streamingRecognize(request)
        .on('error', (error) => {
          console.error('Error in streaming recognition:', error);
          socket.emit('error', { error: error.message });
          recognizeStream = null;
          streamHasConfig = false;
        })
        .on('data', (data) => {
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            if (result && result.alternatives && result.alternatives.length > 0) {
              socket.emit('transcription', {
                transcript: result.alternatives[0].transcript,
                isFinal: result.isFinal,
                confidence: result.alternatives[0].confidence
              });
            }
          }
        })
        .on('end', () => {
          console.log('Stream ended by Google');
          socket.emit('streamEnded');
          recognizeStream = null;
          streamHasConfig = false;
        });

      streamHasConfig = true;
      console.log('Google Cloud Stream started');
      
      // Notify client that stream is ready
      socket.emit('streamStarted');
    } catch (error) {
      console.error('Error starting stream:', error);
      socket.emit('error', { error: error.message });
      streamHasConfig = false;
    }
  });

  socket.on('binaryAudioData', (data) => {
    try {
      if (recognizeStream && streamHasConfig) {
        // Convert ArrayBuffer to Buffer
        const buffer = Buffer.from(data);
        
        // Send audio content
        recognizeStream.write(buffer);
      } else if (recognizeStream && !streamHasConfig) {
        console.error('Tried to send audio before config was acknowledged');
        socket.emit('error', { error: 'Stream not properly configured yet' });
      } else {
        console.error('No active stream to send audio data to');
        socket.emit('error', { error: 'No active stream' });
      }
    } catch (error) {
      console.error('Error processing audio data:', error);
      socket.emit('error', { error: 'Error processing audio data: ' + error.message });
    }
  });

  socket.on('endGoogleCloudStream', () => {
    try {
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
        streamHasConfig = false;
        console.log('Google Cloud Stream ended by client');
        socket.emit('streamEnded');
      }
    } catch (error) {
      console.error('Error ending stream:', error);
    }
  });

  socket.on('disconnect', () => {
    try {
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
        streamHasConfig = false;
      }
      console.log('Client disconnected');
    } catch (error) {
      console.error('Error on disconnect:', error);
    }
  });
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Web-only server running on http://localhost:${PORT}`);
}); 