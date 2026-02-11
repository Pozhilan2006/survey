# Mobile App

React Native mobile application for students and teachers to participate in surveys.

## Tech Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **State Management**: React Query
- **HTTP Client**: Axios

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API URL
```

3. Start Expo:
```bash
npm start
```

4. Run on device:
- Scan QR code with Expo Go app (iOS/Android)
- Or press `a` for Android emulator
- Or press `i` for iOS simulator

## Project Structure

```
src/
├── screens/        # Screen components
├── components/     # Reusable components
├── navigation/     # Navigation configuration
├── hooks/          # Custom React hooks
├── api/            # API client and queries
├── utils/          # Utility functions
└── constants/      # App constants
```

## Features

- Survey browsing and participation
- Real-time capacity updates
- Seat hold mechanism
- Document upload
- Push notifications
- Offline support

## Development

### Adding a New Screen

1. Create screen component in `src/screens/`
2. Add route in `src/navigation/`
3. Connect to API via React Query hooks

### API Integration

Use React Query hooks for data fetching:

```javascript
import { useSurvey } from '../hooks/useSurvey';

function SurveyScreen({ releaseId }) {
  const { data, loading, error } = useSurvey(releaseId);
  // ...
}
```

## Build

### Android
```bash
expo build:android
```

### iOS
```bash
expo build:ios
```

## Deployment

See main README for deployment instructions.
