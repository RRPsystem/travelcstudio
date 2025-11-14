# Multi-Brand Website Platform

A comprehensive platform for managing multiple brands with AI-powered content generation, website building, and role-based access control.

## Features

- Multi-brand management system
- Role-based access (Admin, Brand, Operator)
- AI-powered content generation
- Visual website builder
- Menu and footer management
- Page builder with templates
- Supabase backend with Row Level Security

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase (Database + Auth + Edge Functions)
- Lucide React Icons

## Installation

### Prerequisites

- Node.js 18+ and npm
- Git
- Supabase account

### Setup Instructions

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <project-name>
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

4. Run database migrations:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run all migration files from `supabase/migrations/` in chronological order

5. Deploy Edge Functions (optional):
   - Use the Supabase dashboard to deploy functions from `supabase/functions/`

6. Start the development server:
```bash
npm run dev
```

## Project Structure

```
├── src/
│   ├── components/        # React components
│   │   ├── Admin/        # Admin dashboard components
│   │   ├── Brand/        # Brand management components
│   │   ├── Builder/      # Website builder components
│   │   ├── Operator/     # Operator dashboard components
│   │   └── Auth/         # Authentication components
│   ├── contexts/         # React contexts (Auth, App)
│   ├── lib/             # Utility functions and API services
│   └── types/           # TypeScript type definitions
├── supabase/
│   ├── migrations/      # Database migrations
│   └── functions/       # Edge Functions
└── public/             # Static assets
```

## Demo Users

The system includes demo users with different roles:
- Admin: `admin@example.com` / `password123`
- Brand: `brand@example.com` / `password123`
- Operator: `operator@example.com` / `password123`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## License

All rights reserved.
