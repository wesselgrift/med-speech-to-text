# Google Speech-to-Text Web Application

A real-time speech-to-text transcription web application using Google Cloud Speech-to-Text API.

## Prerequisites

- Node.js (v18 or higher)
- Google Cloud account with Speech-to-Text API enabled
- Google Cloud credentials JSON file

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Place your Google Cloud credentials JSON file in the project root as `google-credentials.json`
4. Update the `.env` file with your Google Cloud Project ID:
   ```
   GOOGLE_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
   ```

## Usage

Start the web server:

```
npm start
```

Then open your browser to `http://localhost:3000` to use the web interface.

## Server Deployment Options

### Standard Deployment

Run the web server:
```
npm start
```

### Docker Deployment

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