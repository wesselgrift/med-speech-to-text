// Command-line Google Speech-to-Text demo
import recorder from 'node-record-lpcm16';
import { SpeechClient } from '@google-cloud/speech';
import dotenv from 'dotenv';

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

// Create a client
const speechClient = new SpeechClient();
const projectId = process.env.GOOGLE_PROJECT_ID;

// Configuration for the recognition
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US';

// Create the streaming recognition config
const recognitionConfig = {
  autoDecodingConfig: {},
  explicitDecodingConfig: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    audioChannelCount: 1,
  },
  languageCodes: [languageCode],
  model: 'long'
};

const streamingRecognitionConfig = {
  config: recognitionConfig,
  streamingFeatures: {
    interimResults: true,
  }
};

const streamingRecognizeRequest = {
  recognizer: `projects/${projectId}/locations/global/recognizers/_`,
  streamingConfig: streamingRecognitionConfig,
};

// Create a recognize stream
const recognizeStream = speechClient
  ._streamingRecognize()
  .on('error', (error) => {
    console.error('Error in streaming recognition:', error);
  })
  .on('data', (data) => {
    const result = data.results[0];
    if (result && result.alternatives[0]) {
      process.stdout.write(
        `\r${result.alternatives[0].transcript}`
      );
      
      // If this is a final result, add a new line
      if (result.isFinal) {
        process.stdout.write('\n');
      }
    }
  });

// Send the initial configuration
recognizeStream.write(streamingRecognizeRequest);

// Start recording and send the microphone input to the Speech API
console.log('Listening, press Ctrl+C to stop.');
recorder
  .record({
    sampleRateHertz: sampleRateHertz,
    threshold: 0,
    verbose: false,
    recordProgram: 'rec', // Try also "arecord" or "sox"
    silence: '1.0',
  })
  .stream()
  .on('error', (error) => {
    console.error('Error in recording:', error);
  })
  .on('data', (data) => {
    // Send audio chunks to the recognizeStream
    recognizeStream.write({ audio: data });
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nStopping...');
  recognizeStream.end();
  process.exit();
}); 