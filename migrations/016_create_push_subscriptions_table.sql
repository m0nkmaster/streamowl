-- Migration: Create push subscriptions table for web push notifications
-- This table stores push subscription data for each user/device combination

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Push API subscription endpoint URL
    endpoint TEXT NOT NULL,
    -- Push API keys (p256dh and auth)
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    -- User agent for device identification
    user_agent TEXT,
    -- Subscription created timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Last successful push timestamp
    last_push_at TIMESTAMP WITH TIME ZONE,
    -- Is subscription still valid
    is_active BOOLEAN DEFAULT true,
    -- Unique constraint on endpoint to prevent duplicate subscriptions
    CONSTRAINT unique_endpoint UNIQUE (endpoint)
);

-- Index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Index for finding active subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Comment on table
COMMENT ON TABLE push_subscriptions IS 'Web push notification subscriptions for users';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL from PushSubscription';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Public key from PushSubscription.getKey("p256dh")';
COMMENT ON COLUMN push_subscriptions.auth IS 'Auth secret from PushSubscription.getKey("auth")';
