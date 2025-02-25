# Google Speech-to-Text Demo

A real-time speech-to-text transcription application using Google Cloud Speech-to-Text API.

## Prerequisites

- Node.js (v18 or higher)
- Google Cloud account with Speech-to-Text API enabled
- Google Cloud credentials JSON file
- SoX (for audio recording with the command-line demo) - see installation instructions below

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Place your Google Cloud credentials JSON file in the project root as `google-credentials.json`
4. Update the `.env` file with your Google Cloud Project ID
5. Install SoX (required for command-line demo):
   - **macOS**: `brew install sox`
   - **Ubuntu/Debian**: `sudo apt-get install sox libsox-fmt-all`
   - **Windows**: Download from [SoX website](https://sourceforge.net/projects/sox/files/sox/) and add to PATH

## Usage

### Command Line Demo (requires SoX)

Run the command line demo:

```
npm start
```

This will start recording from your microphone and display the transcription in the terminal.

### Web Interface

Start the web server:

```
npm run web
```

Then open your browser to `http://localhost:3000` to use the web interface.

### Web-Only Mode (No SoX Required)

If you're deploying to a server and don't want to install SoX, use the web-only mode:

```
npm run web-only
```

This runs only the web interface without the command-line demo dependencies.

## Server Deployment Options

### Option 1: Standard Deployment (with SoX)

1. Install SoX on your server:
   - **Ubuntu/Debian**: `sudo apt-get install sox libsox-fmt-all`
   - **CentOS/RHEL**: `sudo yum install sox sox-devel`
   - **Amazon Linux**: `sudo amazon-linux-extras install epel && sudo yum install sox`

2. Run the web server:
   ```
   npm run web
   ```

### Option 2: Web-Only Deployment (No SoX Required)

1. Run the web-only server:
   ```
   npm run web-only
   ```

### Option 3: Docker Deployment

1. Build the Docker image:
   ```
   docker build -t speech-to-text-app .
   ```

2. Run the Docker container:
   ```
   docker run -p 3000:3000 -v $(pwd)/.env:/usr/src/app/.env -v $(pwd)/google-credentials.json:/usr/src/app/google-credentials.json speech-to-text-app
   ```

## Features

- Real-time speech-to-text transcription
- Support for microphone input
- Support for audio file upload
- Language selection
- Speaker diarization (beta)
- Punctuation control

## Troubleshooting

If you encounter errors in the web interface:

1. Check browser console for error messages
2. Ensure your Google Cloud credentials are correctly set up
3. Make sure the Speech-to-Text API is enabled in your Google Cloud project
4. For microphone access issues, ensure your browser has permission to access the microphone

## License

MIT 