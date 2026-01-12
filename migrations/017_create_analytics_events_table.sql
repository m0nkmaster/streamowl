-- Create analytics_events table for tracking user actions and page views
-- This table stores anonymised event data for basic analytics

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event type (e.g., 'page_view', 'search', 'add_to_watchlist', 'rate')
  event_type VARCHAR(100) NOT NULL,
  
  -- Optional user ID (NULL for anonymous events)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Event properties stored as JSONB for flexibility
  properties JSONB DEFAULT '{}',
  
  -- Page/route where event occurred
  page_path VARCHAR(500),
  
  -- Referrer URL (for page views)
  referrer VARCHAR(500),
  
  -- User agent (for device/browser analytics)
  user_agent VARCHAR(500),
  
  -- Session ID for grouping events (stored as cookie)
  session_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_page_path ON analytics_events(page_path);

-- Composite index for common queries (events by type and time)
CREATE INDEX idx_analytics_events_type_created ON analytics_events(event_type, created_at);

-- Comment on table
COMMENT ON TABLE analytics_events IS 'Stores analytics events for page views and user actions';
