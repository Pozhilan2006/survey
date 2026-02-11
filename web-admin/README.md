# Web Admin Panel

React-based admin panel for faculty and administrators to manage surveys, approvals, and view analytics.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router
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

3. Start development server:
```bash
npm run dev
```

4. Open browser:
```
http://localhost:5173
```

## Project Structure

```
src/
├── pages/          # Page components
├── components/     # Reusable components
├── layouts/        # Layout components
├── hooks/          # Custom React hooks
├── api/            # API client and queries
├── utils/          # Utility functions
└── styles/         # Global styles
```

## Features

- Survey builder with visual rule editor
- Release management
- Approval queue
- Document verification
- Capacity monitoring
- Real-time analytics
- Allocation management

## Development

### Adding a New Page

1. Create page component in `src/pages/`
2. Add route in `src/App.jsx`
3. Connect to API via React Query hooks

### Styling

Use TailwindCSS utility classes:

```jsx
<div className="bg-white shadow-md rounded-lg p-6">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
</div>
```

## Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Deployment

Deploy to Vercel:
```bash
vercel deploy
```

See main README for detailed deployment instructions.
