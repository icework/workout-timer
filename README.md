# Workout Timer

A local-first interval training timer web app built with React, TypeScript, and Vite.

## Features

- Create custom workout templates with multiple intervals
- Run workouts with audio cues and visual countdown
- Track workout history and statistics
- All data stored locally in browser (localStorage)
- Works offline as a static SPA

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Type check
npm run typecheck
```

## Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

The build output is in the `dist/` directory - static files ready for deployment.

## Deployment

This is a static SPA that can be deployed to any static hosting service.

### VPS with Nginx

1. Build the project: `npm run build`
2. Copy `dist/` contents to your server (e.g., `/var/www/workout-timer/dist`)
3. Use the nginx config in `deploy/nginx.conf` as a reference
4. Update `server_name` to your domain

### Other Hosting Options

- Vercel: Connect repo, it auto-detects Vite
- Netlify: Connect repo, build command `npm run build`, publish directory `dist`
- GitHub Pages: Use `gh-pages` package or GitHub Actions

## Tech Stack

- React 19
- TypeScript
- Vite
- TailwindCSS
- React Router
- localStorage for data persistence
