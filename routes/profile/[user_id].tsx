import { type Handlers, type PageProps } from "$fresh/server.ts";
import { query } from "../../lib/db.ts";
import PublicProfilePage from "../../islands/PublicProfilePage.tsx";

interface PublicProfilePageProps {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  stats: {
    watchedCount: number;
    favouritesCount: number;
    watchlistCount: number;
    averageRating: number | null;
  };
  favourites: Array<{
    tmdb_id: number;
    type: "movie" | "tv" | "documentary";
    title: string;
    poster_path: string | null;
    release_date: string | null;
  }>;
}

/**
 * Public profile route handler
 * Displays user's public profile with stats and favourites
 * Only accessible if user has public_profile_enabled set to true
 */
export const handler: Handlers<PublicProfilePageProps> = {
  async GET(req, ctx) {
    const userId = ctx.params.user_id;

    try {
      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return new Response("Invalid user ID", { status: 400 });
      }

      // Fetch user and check if public profile is enabled
      const userResult = await query<{
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        preferences: Record<string, unknown>;
      }>(
        `SELECT id, display_name, avatar_url, preferences 
         FROM users 
         WHERE id = $1`,
        [userId],
      );

      if (userResult.length === 0) {
        return new Response("User not found", { status: 404 });
      }

      const user = userResult[0];
      const preferences = user.preferences || {};
      const publicProfileEnabled = preferences.public_profile_enabled === true;

      if (!publicProfileEnabled) {
        return new Response("Profile is not public", { status: 403 });
      }

      // Fetch user stats
      const statsResult = await query<{
        watched_count: number;
        favourites_count: number;
        watchlist_count: number;
        avg_rating: number | null;
      }>(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'watched')::int AS watched_count,
          COUNT(*) FILTER (WHERE status = 'favourite')::int AS favourites_count,
          COUNT(*) FILTER (WHERE status = 'to_watch')::int AS watchlist_count,
          AVG(rating) FILTER (WHERE rating IS NOT NULL) AS avg_rating
         FROM user_content
         WHERE user_id = $1`,
        [userId],
      );

      const stats = {
        watchedCount: statsResult[0]?.watched_count || 0,
        favouritesCount: statsResult[0]?.favourites_count || 0,
        watchlistCount: statsResult[0]?.watchlist_count || 0,
        averageRating: statsResult[0]?.avg_rating
          ? Math.round(statsResult[0].avg_rating * 10) / 10
          : null,
      };

      // Fetch favourites (limit to 20 for public profile)
      const favouritesResult = await query<{
        tmdb_id: number;
        type: "movie" | "tv" | "documentary";
        title: string;
        poster_path: string | null;
        release_date: string | null;
      }>(
        `SELECT 
          c.tmdb_id,
          c.type,
          c.title,
          c.poster_path,
          c.release_date
         FROM user_content uc
         INNER JOIN content c ON uc.content_id = c.id
         WHERE uc.user_id = $1 AND uc.status = 'favourite'
         ORDER BY uc.created_at DESC
         LIMIT 20`,
        [userId],
      );

      return ctx.render({
        userId: user.id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        stats,
        favourites: favouritesResult,
      });
    } catch (error) {
      console.error("Error fetching public profile:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};

export default function PublicProfile({ data }: PageProps<PublicProfilePageProps>) {
  return <PublicProfilePage {...data} />;
}
