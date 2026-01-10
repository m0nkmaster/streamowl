# Developer Documentation

This document provides technical documentation for developers working on Stream
Owl, including API documentation, database schema, and configuration details.

## Table of Contents

- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Development Workflow](#development-workflow)

## API Documentation

### Authentication Endpoints

#### POST `/api/login`

Authenticate a user with email and password.

**Request Body:**

- `email` (string, required): User email address
- `password` (string, required): User password
- `csrfToken` (string, required): CSRF token

**Response:**

- `303 See Other`: Redirects to dashboard on success
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded

**Example:**

```bash
curl -X POST http://localhost:8000/api/login \
  -F "email=user@example.com" \
  -F "password=password123" \
  -F "csrfToken=token"
```

#### POST `/api/signup`

Create a new user account.

**Request Body:**

- `email` (string, required): User email address
- `password` (string, required): Password (min 8 characters)
- `displayName` (string, optional): Display name
- `csrfToken` (string, required): CSRF token

**Response:**

- `303 See Other`: Redirects to dashboard on success
- `400 Bad Request`: Invalid input or email already exists

#### POST `/api/logout`

Log out the current user.

**Request Body:**

- `csrfToken` (string, required): CSRF token

**Response:**

- `303 See Other`: Redirects to home page

### Content Endpoints

#### GET `/api/search?q={query}&page={page}`

Search for movies and TV shows.

**Query Parameters:**

- `q` (string, required): Search query
- `page` (number, optional): Page number (default: 1)

**Response:**

```json
{
  "results": [
    {
      "id": "uuid",
      "tmdb_id": 12345,
      "type": "movie",
      "title": "Movie Title",
      "overview": "Movie description",
      "release_date": "2023-01-01",
      "poster_path": "/path/to/poster.jpg",
      "backdrop_path": "/path/to/backdrop.jpg",
      "metadata": {
        "vote_average": 8.5,
        "vote_count": 1000
      }
    }
  ],
  "total_results": 100,
  "page": 1,
  "total_pages": 10
}
```

#### GET `/api/trending`

Get trending content.

**Response:**

```json
{
  "results": [...],
  "total_results": 20
}
```

#### GET `/api/new-releases`

Get new releases.

**Response:**

```json
{
  "results": [...],
  "total_results": 20
}
```

### User Content Endpoints

#### POST `/api/content/{tmdb_id}/watched`

Mark content as watched.

**Request Body:**

- `csrfToken` (string, required): CSRF token

**Response:**

- `200 OK`: Success
- `401 Unauthorized`: Not authenticated

#### POST `/api/content/{tmdb_id}/watchlist`

Add content to watchlist.

**Request Body:**

- `csrfToken` (string, required): CSRF token

**Response:**

- `200 OK`: Success
- `401 Unauthorized`: Not authenticated

#### POST `/api/content/{tmdb_id}/favourite`

Mark content as favourite.

**Request Body:**

- `csrfToken` (string, required): CSRF token

**Response:**

- `200 OK`: Success
- `401 Unauthorized`: Not authenticated

#### POST `/api/content/{tmdb_id}/rating`

Rate content (1-10 scale with half-point precision).

**Request Body:**

- `rating` (number, required): Rating value (0-10)
- `csrfToken` (string, required): CSRF token

**Response:**

- `200 OK`: Success
- `400 Bad Request`: Invalid rating value

#### POST `/api/content/{tmdb_id}/notes`

Add or update notes for content.

**Request Body:**

- `notes` (string, optional): Note text
- `csrfToken` (string, required): CSRF token

**Response:**

- `200 OK`: Success

### Library Endpoints

#### GET `/api/library/watched`

Get user's watched content.

**Response:**

```json
{
  "results": [
    {
      "content": {...},
      "watched_at": "2023-01-01T00:00:00Z",
      "rating": 8.5,
      "notes": "Great movie!"
    }
  ]
}
```

#### GET `/api/library/watchlist`

Get user's watchlist.

**Response:**

```json
{
  "results": [
    {
      "content": {...},
      "added_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

#### GET `/api/library/favourites`

Get user's favourites.

**Response:**

```json
{
  "results": [
    {
      "content": {...},
      "favourited_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### Lists Endpoints

#### GET `/api/lists`

Get user's custom lists.

**Response:**

```json
{
  "lists": [
    {
      "id": "uuid",
      "name": "80s Horror",
      "description": "My favourite 80s horror movies",
      "is_public": false,
      "item_count": 10
    }
  ]
}
```

#### POST `/api/lists`

Create a new custom list.

**Request Body:**

- `name` (string, required): List name
- `description` (string, optional): List description
- `is_public` (boolean, optional): Whether list is public
- `csrfToken` (string, required): CSRF token

**Response:**

- `201 Created`: List created
- `400 Bad Request`: Invalid input or limit reached (free tier: 3 lists)

#### GET `/api/lists/{list_id}`

Get list details.

**Response:**

```json
{
  "id": "uuid",
  "name": "80s Horror",
  "description": "My favourite 80s horror movies",
  "is_public": false,
  "items": [
    {
      "content": {...},
      "position": 1
    }
  ]
}
```

#### POST `/api/lists/{list_id}/items`

Add content to list.

**Request Body:**

- `tmdb_id` (number, required): TMDB ID of content
- `csrfToken` (string, required): CSRF token

**Response:**

- `200 OK`: Success

### Recommendations Endpoints

#### GET `/api/recommendations`

Get personalised recommendations for the user.

**Response:**

```json
{
  "recommendations": [
    {
      "content": {...},
      "explanation": "Based on your viewing history...",
      "similarity_score": 0.85
    }
  ]
}
```

#### POST `/api/recommendations/{tmdb_id}/dismiss`

Dismiss a recommendation.

**Request Body:**

- `csrfToken` (string, required): CSRF token

**Response:**

- `200 OK`: Success

### Tags Endpoints

#### GET `/api/tags`

Get user's tags.

**Response:**

```json
{
  "tags": [
    {
      "id": "uuid",
      "name": "Comfort Watch",
      "colour": "#FF5733"
    }
  ]
}
```

#### POST `/api/content/{tmdb_id}/tags`

Apply tag to content.

**Request Body:**

- `tag_id` (string, required): Tag ID
- `csrfToken` (string, required): CSRF token

**Response:**

- `200 OK`: Success

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  avatar_url TEXT,
  password_hash TEXT,
  google_id VARCHAR(255) UNIQUE,
  preferences JSONB DEFAULT '{}'::jsonb,
  taste_embedding vector(1536), -- OpenAI embedding dimension
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Content Table

```sql
CREATE TYPE content_type AS ENUM ('movie', 'tv', 'documentary');

CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER NOT NULL UNIQUE,
  type content_type NOT NULL,
  title VARCHAR(500) NOT NULL,
  overview TEXT,
  release_date DATE,
  poster_path TEXT,
  backdrop_path TEXT,
  content_embedding vector(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### User Content Table

```sql
CREATE TYPE user_content_status AS ENUM ('watched', 'to_watch', 'favourite');

CREATE TABLE user_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  status user_content_status NOT NULL,
  rating NUMERIC(3, 1) CHECK (rating >= 0 AND rating <= 10),
  notes TEXT,
  watched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, content_id)
);
```

### Lists Tables

```sql
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(list_id, content_id)
);
```

### Tags Tables

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  colour VARCHAR(7) NOT NULL, -- Hex colour code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE TABLE content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(content_id, tag_id, user_id)
);
```

### Streaming Services Tables

```sql
CREATE TABLE streaming_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  deep_link_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE content_streaming (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES streaming_services(id) ON DELETE CASCADE,
  region VARCHAR(10) NOT NULL, -- ISO country code
  type VARCHAR(20) NOT NULL, -- 'subscription', 'rent', 'buy'
  price NUMERIC(10, 2),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### Environment Variables

#### Required

- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://username:password@host:port/database`
- `JWT_SECRET`: Secret key for signing JWT tokens
  - Generate with: `openssl rand -hex 32`
- `TMDB_API_KEY`: API key from The Movie Database
- `OPENAI_API_KEY`: API key from OpenAI (for AI recommendations)

#### Optional

- `GOOGLE_OAUTH_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_OAUTH_CLIENT_SECRET`: Google OAuth client secret
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL (for caching)
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST token
- `STRIPE_SECRET_KEY`: Stripe secret key (for premium subscriptions)
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
- `STRIPE_PRICE_ID_MONTHLY`: Stripe monthly subscription price ID
- `STRIPE_PRICE_ID_YEARLY`: Stripe yearly subscription price ID
- `APP_BASE_URL`: Base URL of the application (for webhooks)

### Database Configuration

The application uses PostgreSQL with the following extensions:

- `pgvector`: For vector similarity search (AI recommendations)
- Standard PostgreSQL features: JSONB, UUID, triggers

Connection pooling is configured with:

- Minimum connections: 2
- Maximum connections: 10
- Idle timeout: 30 seconds

## Architecture

### Framework

Stream Owl is built with [Deno Fresh](https://fresh.deno.dev/), a modern web
framework for Deno that provides:

- Server-side rendering (SSR)
- Islands architecture for interactive components
- File-based routing
- Built-in TypeScript support

### Authentication

Authentication uses JWT tokens stored in secure HTTP-only cookies:

1. User logs in with email/password or Google OAuth
2. Server creates JWT token with user ID and email
3. Token stored in HTTP-only cookie
4. Middleware validates token on protected routes
5. Session expires after configured time (default: 7 days)

### AI Recommendations

The recommendation system uses:

1. **Content Embeddings**: OpenAI text-embedding-3-small generates embeddings
   for content (title, synopsis, genres)
2. **User Taste Profile**: Weighted average of user's watched content embeddings
   (weighted by rating)
3. **Vector Similarity**: PostgreSQL pgvector extension finds similar content
4. **Explanation Generation**: OpenAI GPT-4 generates natural language
   explanations

### Caching

- **Redis/Upstash**: Caches TMDB API responses (1 hour TTL)
- **HTTP Caching**: Conditional requests with ETags for API responses
- **Database**: Content data cached in PostgreSQL

### Security

- **CSRF Protection**: All state-changing requests require CSRF tokens
- **XSS Prevention**: User input sanitised with `escapeHtml()` utility
- **SQL Injection Prevention**: All queries use parameterised statements
- **Rate Limiting**: Authentication endpoints rate-limited (10 attempts per 15
  minutes)
- **Password Hashing**: bcrypt with salt rounds

## Development Workflow

### Running Migrations

```bash
# Run pending migrations
deno task migrate

# Rollback last migration
deno task migrate:rollback
```

### Running Tests

```bash
# Unit tests
deno task test:unit

# Integration tests
deno task test:integration

# Test coverage
deno task test:coverage
```

### Code Quality

```bash
# Format, lint, and type check
deno task check

# Format code
deno fmt

# Lint code
deno lint

# Type check
deno task typecheck
```

### Processing Embeddings

Content embeddings are generated in the background:

```bash
# Process embedding queue
deno task process:embeddings
```

This should be run as a scheduled job (e.g., cron) to process new content.

## API Error Responses

All API endpoints return consistent error responses:

```json
{
  "error": {
    "message": "Error message",
    "field": "field_name", // Optional, for validation errors
    "code": "ERROR_CODE" // Optional error code
  }
}
```

Common HTTP status codes:

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
