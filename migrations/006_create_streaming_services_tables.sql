-- Migration: Create streaming_services and content_streaming tables
-- Description: Creates streaming_services and content_streaming tables for availability tracking

-- Create enum type for streaming availability type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'streaming_type') THEN
    CREATE TYPE streaming_type AS ENUM ('subscription', 'rent', 'buy');
  END IF;
END$$;

-- Create streaming_services table
CREATE TABLE IF NOT EXISTS streaming_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  logo_url TEXT,
  deep_link_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create content_streaming table
CREATE TABLE IF NOT EXISTS content_streaming (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES streaming_services(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  region VARCHAR(10) NOT NULL,
  type streaming_type NOT NULL,
  price NUMERIC(10, 2),
  available_from DATE,
  available_until DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_id, content_id, region, type)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_streaming_services_name ON streaming_services(name);
CREATE INDEX IF NOT EXISTS idx_content_streaming_service_id ON content_streaming(service_id);
CREATE INDEX IF NOT EXISTS idx_content_streaming_content_id ON content_streaming(content_id);
CREATE INDEX IF NOT EXISTS idx_content_streaming_region ON content_streaming(region);
CREATE INDEX IF NOT EXISTS idx_content_streaming_type ON content_streaming(type);
CREATE INDEX IF NOT EXISTS idx_content_streaming_availability ON content_streaming(content_id, region);

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_streaming_services_updated_at
  BEFORE UPDATE ON streaming_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_streaming_updated_at
  BEFORE UPDATE ON content_streaming
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed common streaming services
INSERT INTO streaming_services (name, logo_url, deep_link_template) VALUES
  ('Netflix', 'https://logo.clearbit.com/netflix.com', 'https://www.netflix.com/title/{tmdb_id}'),
  ('Disney+', 'https://logo.clearbit.com/disneyplus.com', 'https://www.disneyplus.com/movies/{title}'),
  ('Amazon Prime Video', 'https://logo.clearbit.com/primevideo.com', 'https://www.amazon.co.uk/gp/video/detail/{tmdb_id}'),
  ('Apple TV+', 'https://logo.clearbit.com/tv.apple.com', 'https://tv.apple.com/movie/{title}'),
  ('HBO Max', 'https://logo.clearbit.com/hbomax.com', 'https://www.hbomax.com/feature/{tmdb_id}'),
  ('Hulu', 'https://logo.clearbit.com/hulu.com', 'https://www.hulu.com/movie/{tmdb_id}'),
  ('Paramount+', 'https://logo.clearbit.com/paramountplus.com', 'https://www.paramountplus.com/movies/{tmdb_id}'),
  ('Peacock', 'https://logo.clearbit.com/peacocktv.com', 'https://www.peacocktv.com/watch/movie/{tmdb_id}'),
  ('BBC iPlayer', 'https://logo.clearbit.com/bbc.co.uk', 'https://www.bbc.co.uk/iplayer/episode/{tmdb_id}'),
  ('ITV Hub', 'https://logo.clearbit.com/itv.com', 'https://www.itv.com/hub/{tmdb_id}')
ON CONFLICT (name) DO NOTHING;
