// Connect to Socket.io server
const socket = io();

// DOM Elements
const startButton = document.getElementById('start-button');
const uploadButton = document.getElementById('upload-button');
const audioFileInput = document.getElementById('audio-file');
const fileName = document.getElementById('file-name');
const transcriptionDiv = document.getElementById('transcription');
const interimDiv = document.getElementById('interim');
const jsonButton = document.getElementById('show-json');
const jsonOutput = document.getElementById('json-output');
const jsonContent = document.getElementById('json-content');
const inputTypeRadios = document.querySelectorAll('input[name="input-type"]');
const microphoneSection = document.getElementById('microphone-section');
const fileUploadSection = document.getElementById('file-upload-section');
const languageSelect = document.getElementById('language');
const diarizationSlider = document.getElementById('diarization');
const speakersContainer = document.getElementById('speakers-container');
const speakersSlider = document.getElementById('speakers');
const punctuationSlider = document.getElementById('punctuation');

// State variables
let isRecording = false;
let mediaRecorder = null;
let audioContext = null;
let audioChunks = [];
let finalTranscript = '';
let lastTranscriptionData = null;
let streamActive = false;

// Initialize the application
function init() {
  // Set up event listeners
  startButton.addEventListener('click', toggleRecording);
  uploadButton.addEventListener('click', handleFileUpload);
  audioFileInput.addEventListener('change', updateFileName);
  jsonButton.addEventListener('click', toggleJsonDisplay);
  diarizationSlider.addEventListener('change', toggleSpeakersDisplay);
  
  // Input type change
  inputTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'microphone') {
        microphoneSection.style.display = 'flex';
        fileUploadSection.style.display = 'none';
      } else {
        microphoneSection.style.display = 'none';
        fileUploadSection.style.display = 'flex';
      }
    });
  });

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
    
    // Start Google Cloud Stream
    const config = {
      sampleRateHertz: 16000,
      languageCode: languageSelect.value,
      enableSpeakerDiarization: diarizationSlider.value === '1',
      speakerCount: parseInt(speakersSlider.value),
      enablePunctuation: punctuationSlider.value === '1'
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

// Handle file upload
function handleFileUpload() {
  const file = audioFileInput.files[0];
  if (!file) {
    showError('Please select an audio file first.');
    return;
  }
  
  // Reset transcription
  finalTranscript = '';
  transcriptionDiv.textContent = '';
  interimDiv.textContent = '';
  
  // Create a message to show the user we're processing
  interimDiv.textContent = 'Processing audio file...';
  
  // Start Google Cloud Stream
  const config = {
    sampleRateHertz: 16000,
    languageCode: languageSelect.value,
    enableSpeakerDiarization: diarizationSlider.value === '1',
    speakerCount: parseInt(speakersSlider.value),
    enablePunctuation: punctuationSlider.value === '1'
  };
  
  socket.emit('startGoogleCloudStream', config);
  
  // Read the file
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      // Get the file data
      const arrayBuffer = e.target.result;
      
      // Wait for stream to be established
      setTimeout(() => {
        if (!streamActive) {
          showError('Failed to establish stream connection. Please try again.');
          return;
        }
        
        // Send in chunks
        const buffer = new Uint8Array(arrayBuffer);
        const chunkSize = 8192; // Send 8KB chunks
        
        for (let i = 0; i < buffer.length; i += chunkSize) {
          if (!streamActive) break;
          
          const chunk = buffer.slice(i, i + chunkSize);
          socket.emit('binaryAudioData', chunk.buffer);
          
          // Small delay to avoid overwhelming the server
          if (i + chunkSize < buffer.length) {
            setTimeout(() => {}, 100);
          }
        }
        
        // End the stream
        setTimeout(() => {
          if (streamActive) {
            socket.emit('endGoogleCloudStream');
            streamActive = false;
          }
          interimDiv.textContent = '';
        }, 1000);
      }, 1000);
      
    } catch (error) {
      console.error('Error processing file:', error);
      showError('Error processing audio file.');
      
      if (streamActive) {
        socket.emit('endGoogleCloudStream');
        streamActive = false;
      }
    }
  };
  
  reader.onerror = (error) => {
    console.error('Error reading file:', error);
    showError('Error reading audio file.');
  };
  
  reader.readAsArrayBuffer(file);
}

// Update file name display
function updateFileName() {
  const file = audioFileInput.files[0];
  if (file) {
    fileName.textContent = file.name;
  } else {
    fileName.textContent = 'No file chosen';
  }
}

// Toggle JSON display
function toggleJsonDisplay() {
  const isVisible = jsonOutput.style.display !== 'none';
  jsonOutput.style.display = isVisible ? 'none' : 'block';
  jsonButton.classList.toggle('active');
  
  if (!isVisible && lastTranscriptionData) {
    jsonContent.textContent = JSON.stringify(lastTranscriptionData, null, 2);
  }
}

// Toggle speakers display based on diarization setting
function toggleSpeakersDisplay() {
  speakersContainer.style.display = diarizationSlider.value === '1' ? 'block' : 'none';
}

// Handle transcription data
function handleTranscription(data) {
  lastTranscriptionData = data;
  
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