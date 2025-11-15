# Ulpan Genie Assessor - React Web App

A fun, interactive React version of the Assessor the Level Magician Hebrew assessment tool, featuring an animated genie character and Akinator-style gameplay!

## Features

- **Animated Genie Character**: A friendly genie guides you through the assessment
- **Beautiful UI**: Built with Tailwind CSS and smooth animations
- **Complete Game Logic**: All features from the console version, including:
  - User profile survey
  - Adaptive question selection
  - Warmup questions
  - Boundary batch testing
  - Floor guards for extreme beginners
  - Smart level recommendations

## Getting Started

### Running the App

The development server is already running! Open your browser to:

**http://localhost:5174/**

### Development

```bash
# Install dependencies (with local cache to avoid npm issues)
npm install --cache ./.npm-cache

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
web/
├── src/
│   ├── components/       # React components
│   │   ├── Welcome.jsx   # Welcome screen
│   │   ├── Survey.jsx    # User survey
│   │   ├── GateFail.jsx  # Gate failure screen
│   │   ├── Game.jsx      # Main game logic
│   │   ├── Question.jsx  # Question display
│   │   ├── Results.jsx   # Final results
│   │   └── Genie.jsx     # Animated genie character
│   ├── hooks/           # Custom React hooks
│   │   ├── useSurvey.js     # Survey logic
│   │   ├── useQuestions.js  # CSV question loader
│   │   └── useGameEngine.js # Game engine logic
│   ├── engine/          # Core game logic (ported from console)
│   │   ├── levels.js    # Level definitions
│   │   ├── survey.js    # Survey helpers
│   │   ├── engine.js    # Question selection
│   │   └── utils.js     # Utility functions
│   └── App.jsx          # Main app component
└── public/
    └── data/
        └── questions.csv # Question database
```

## Customization

### Genie Character

The genie is currently emoji-based. To use a custom image:

1. Add your genie image to `src/assets/`
2. Update `src/components/Genie.jsx` to use the image instead of emoji

### Colors and Styling

The app uses Tailwind CSS with custom colors defined in `tailwind.config.js`:

- `genie-purple`: #6B46C1
- `genie-blue`: #4299E1
- `genie-gold`: #F6AD55

### Animations

Custom animations are defined in `tailwind.config.js`:
- `animate-float`: Genie floating effect
- `animate-glow`: Pulsing glow effect

## Tech Stack

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **PapaParse**: CSV parsing library

## Notes

- The app uses a local npm cache (`.npm-cache`) to avoid permission issues
- All game logic has been ported from the console version
- Question data is loaded from the CSV at runtime
- State management uses React hooks (no external state library needed)

## Version

Based on Assessor the Level Magician v0.3.7
