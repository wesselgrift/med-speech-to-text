// Connect to Socket.io server
const socket = io();

// DOM Elements
const startButton = document.getElementById('start-button');
const transcriptionDiv = document.getElementById('transcription');
const interimDiv = document.getElementById('interim');
const languageSelect = document.getElementById('language');

// State variables
let isRecording = false;
let mediaRecorder = null;
let audioContext = null;
let audioChunks = [];
let finalTranscript = '';
let streamActive = false;

// Initialize the application
function init() {
  // Set up event listeners
  startButton.addEventListener('click', toggleRecording);
  
  // Socket.io event listeners
  socket.on('connect', () => {
    console.log('Connected to server');
  });

  socket.on('transcription', (data) => {
    handleTranscription(data);
  });

  socket.on('error', (data) => {
    console.error('Error from server:', data.error);
    showError(data.error);
    // If we get an error, assume the stream is no longer active
    streamActive = false;
  });

  socket.on('streamStarted', () => {
    console.log('Stream started successfully');
    streamActive = true;
  });

  socket.on('streamEnded', () => {
    console.log('Stream ended');
    streamActive = false;
  });
}

// Toggle recording state
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

// Start recording from microphone
async function startRecording() {
  try {
    // Reset transcription
    finalTranscript = '';
    transcriptionDiv.textContent = '';
    interimDiv.textContent = '';
    
    // Get user media
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        channelCount: 1,
        sampleRate: 16000
      } 
    });
    
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });
    
    // Create media recorder with specific options
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 16000
    });
    
    audioChunks = [];
    
    // Start recording
    mediaRecorder.start(250); // Collect data every 250ms
    
    // Update UI
    startButton.textContent = 'STOP';
    startButton.classList.add('recording');
    isRecording = true;
    
    // Start Google Cloud Stream with default settings
    const config = {
      sampleRateHertz: 16000,
      languageCode: languageSelect.value,
      enableSpeakerDiarization: false, // Speaker diarization off by default
      enablePunctuation: true // Punctuation on by default
    };
    
    socket.emit('startGoogleCloudStream', config);
    
    // Handle audio data
    mediaRecorder.addEventListener('dataavailable', async (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        
        // Only process if stream is active
        if (streamActive) {
          try {
            // Convert blob to array buffer
            const arrayBuffer = await event.data.arrayBuffer();
            
            // Send the raw buffer directly to the server
            socket.emit('binaryAudioData', arrayBuffer);
          } catch (error) {
            console.error('Error processing audio chunk:', error);
          }
        }
      }
    });
    
    // Handle recording stop
    mediaRecorder.addEventListener('stop', () => {
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    });
    
  } catch (error) {
    console.error('Error starting recording:', error);
    showError('Could not access microphone. Please check permissions.');
  }
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    
    // End the stream if it's active
    if (streamActive) {
      socket.emit('endGoogleCloudStream');
      streamActive = false;
    }
    
    // Update UI
    startButton.textContent = 'START NOW';
    startButton.classList.remove('recording');
    isRecording = false;
  }
}

// Handle transcription data
function handleTranscription(data) {
  if (data.isFinal) {
    finalTranscript += data.transcript + ' ';
    transcriptionDiv.textContent = finalTranscript;
    interimDiv.textContent = '';
  } else {
    interimDiv.textContent = data.transcript;
  }
  
  // Auto-scroll to bottom
  const container = document.querySelector('.transcription-container');
  container.scrollTop = container.scrollHeight;
}

// Show error message
function showError(message) {
  interimDiv.textContent = `Error: ${message}`;
  interimDiv.style.color = 'red';
  
  // Reset after 5 seconds
  setTimeout(() => {
    interimDiv.textContent = '';
    interimDiv.style.color = '';
  }, 5000);
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init); 