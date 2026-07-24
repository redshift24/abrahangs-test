# Abrahangs Web

A web-based sub-max hangboard workout timer for climbers. This is the web version of the Abrahangs Android app.

## Features

- **6 Hang Exercises**: 4 Finger Chisel/Open, Open 3, Front Two Open, Middle Two Open, Front Two Half Crimp, Middle Two Half Crimp
- **Timed Workouts**: 5s preparation → 7s hang → 20s rest between reps
- **Workout History**: Tracks completed workouts with localStorage persistence
- **PWA Support**: Install on mobile devices for app-like experience
- **Offline Support**: Works without internet connection via service worker
- **Keyboard Shortcuts**: Space (play/pause), Arrow keys (navigate), R (next rep), Escape (stop)

## Getting Started

### Option 1: Open Directly
Simply open `index.html` in a modern web browser.

### Option 2: Serve with a Local Server
For full PWA support, serve the files with a local HTTP server:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8080
```

Then visit `http://localhost:8080` in your browser.

## Usage

1. Open the app in your browser
2. Tap the **Play** button or press **Space** to start the workout
3. Follow the timer: Get ready (5s) → Hang (7s) → Rest (20s)
4. Use **Next Rep** or press **R** to skip to the next rep
5. Navigate between exercises with the arrow buttons
6. View your workout history by tapping the history icon

## Installing as PWA

### On Mobile (iOS/Android)
1. Open the app in Safari (iOS) or Chrome (Android)
2. Tap the Share button
3. Select "Add to Home Screen"

### On Desktop (Chrome/Edge)
1. Look for the install icon in the address bar
2. Click "Install" to add as a desktop app

## Project Structure

```
Abrahangs web/
├── index.html              # Entry point with PWA setup
├── hang-workout.html       # Main workout timer page
├── history.html            # Workout history page
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline caching
├── css/
│   ├── hang-workout.css    # Workout page styles
│   └── history.css         # History page styles
├── js/
│   ├── hang-workout.js     # Workout timer logic
│   └── history.js          # History management
├── pictures/               # Exercise demonstration images
└── icons/                  # App icons for PWA
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| ← | Previous exercise |
| → | Next exercise |
| R | Next rep |
| Escape | Stop workout |

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## License

MIT
