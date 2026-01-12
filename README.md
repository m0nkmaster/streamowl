# Stream Owl

A movie recommendations and finder application built with Deno Fresh. Stream Owl
helps users discover where movies, TV shows, and documentaries are available
across streaming services, track their viewing history, and receive intelligent
AI-powered recommendations.

## Project Overview

Stream Owl solves the fragmented streaming landscape problem by providing:

- **Unified Search**: One place to search across all streaming services
- **Smart Tracking**: Effortless logging with rich metadata (watched, watchlist,
  favourites, ratings, notes)
- **Intelligent Recommendations**: AI-powered recommendations that explain why
  content suits your taste
- **Personal Library**: Organise content with custom lists, tags, and notes
- **Streaming Availability**: See where content is available to watch in your
  region

### Key Features

- **Content Discovery**: Search movies and TV shows, browse trending content,
  and discover new releases
- **User Library**: Track watched content, maintain watchlists, mark favourites,
  and create custom lists
- **AI Recommendations**: Daily personalised recommendations with explanations
  powered by OpenAI
- **Streaming Integration**: View where content is available across streaming
  services (Netflix, Disney+, Amazon Prime, etc.)
- **Social Features**: Share public profiles and lists with others
- **Premium Tier**: Unlimited lists, unlimited AI recommendations, and data
  export for premium subscribers

## Getting Started

### Prerequisites

- [Deno](https://deno.com/) (v1.x or later)
- PostgreSQL database (v12 or later)
- [TMDB API Key](https://www.themoviedb.org/settings/api) (free)
- [OpenAI API Key](https://platform.openai.com/api-keys) (for AI
  recommendations)
- [Google OAuth Credentials](https://console.cloud.google.com/apis/credentials)
  (optional, for Google sign-in)
- [Stripe API Keys](https://dashboard.stripe.com/apikeys) (optional, for premium
  subscriptions)
- Redis/Upstash (optional, for caching)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd demo
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your configuration:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL`: PostgreSQL connection string (pre-filled for local Docker)
   - `JWT_SECRET`: Secret key for JWT tokens (generate with
     `openssl rand -hex 32`)
   - `TMDB_API_KEY`: Your TMDB API key
   - `OPENAI_API_KEY`: Your OpenAI API key (required for AI recommendations)
   - `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`: For Google OAuth
     (optional)
   - `STRIPE_SECRET_KEY` and related: For premium subscriptions (optional)
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: For caching
     (optional)

3. **Set up the database**

   Start the local PostgreSQL database (requires Docker):

   ```bash
   docker compose up -d
   ```

   This starts a PostgreSQL 16 instance with the pgvector extension on port
   5432. The database credentials are pre-configured in `.env.example`.

   Run migrations to create the database schema:

   ```bash
   deno task migrate
   ```

   Verify the database connection:

   ```bash
   deno task test:db
   ```

4. **Start the development server**

   ```bash
   deno task start
   ```

   The application will be available at `http://localhost:8000`

### Development Tasks

- `deno task start` - Start development server
- `deno task build` - Build for production
- `deno task preview` - Preview production build
- `deno task migrate` - Run database migrations
- `deno task migrate:rollback` - Rollback last migration
- `deno task check` - Run formatting, linting, and type checking
- `deno task test:unit` - Run unit tests
- `deno task test:integration` - Run integration tests
- `deno task test:coverage` - Generate test coverage report

## Project Structure

```
├── routes/              # Fresh route handlers (pages and API endpoints)
│   ├── api/            # API endpoints
│   └── [pages].tsx     # Page components
├── islands/            # Interactive Preact components (client-side)
├── components/         # Shared Preact components (server-side)
├── lib/                # Core library modules
│   ├── auth/           # Authentication utilities
│   ├── api/            # API utilities
│   ├── db.ts           # Database connection
│   ├── tmdb/           # TMDB API client
│   ├── ai/             # AI recommendation engine
│   └── security/       # Security utilities (CSRF, XSS, rate limiting)
├── migrations/         # Database migration files
├── static/             # Static assets
├── scripts/            # Utility scripts
└── docs/               # Documentation
```

## Documentation

- **[Developer Documentation](documentation/developers.md)** - API
  documentation, database schema, and configuration
- **[User Documentation](documentation/users.md)** - How to use Stream Owl,
  features, and troubleshooting
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Instructions for deploying to
  Deno Deploy

## Technology Stack

- **Framework**: [Deno Fresh](https://fresh.deno.dev/) - Modern web framework
  for Deno
- **Database**: PostgreSQL with pgvector extension (for vector similarity
  search)
- **Authentication**: JWT-based sessions with secure cookies
- **AI**: OpenAI GPT-4 for recommendation explanations, text-embedding-3-small
  for embeddings
- **External APIs**: TMDB (The Movie Database) for content data
- **Payments**: Stripe for premium subscriptions
- **Caching**: Redis/Upstash (optional)
- **Styling**: Tailwind CSS

## Contributing

This project follows standard development practices:

- Use conventional commit messages
- Run `deno task check` before committing
- Write tests for new features
- Update documentation for API changes

## License

See [LICENSE](LICENSE) file for details.

## Attribution

This project uses data from
[The Movie Database (TMDB)](https://www.themoviedb.org/). Stream Owl is not
endorsed or certified by TMDB.
