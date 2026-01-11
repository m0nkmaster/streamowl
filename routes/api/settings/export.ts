import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { query } from "../../../lib/db.ts";
import {
  createBadRequestResponse,
  createForbiddenResponse,
  createInternalServerErrorResponse,
} from "../../../lib/api/errors.ts";

interface UserProfile {
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  created_at: Date;
}

interface UserContentRecord {
  tmdb_id: number;
  type: "movie" | "tv" | "documentary";
  title: string;
  status: "watched" | "to_watch" | "favourite";
  rating: number | null;
  notes: string | null;
  watched_at: Date | null;
  created_at: Date;
}

interface ListRecord {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: Date;
  items: {
    tmdb_id: number;
    type: "movie" | "tv" | "documentary";
    title: string;
    position: number;
  }[];
}

interface TagRecord {
  id: string;
  name: string;
  colour: string;
  created_at: Date;
  content: {
    tmdb_id: number;
    type: "movie" | "tv" | "documentary";
    title: string;
  }[];
}

interface ExportData {
  exportedAt: string;
  user: {
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
  content: {
    tmdbId: number;
    type: "movie" | "tv" | "documentary";
    title: string;
    status: "watched" | "to_watch" | "favourite";
    rating: number | null;
    notes: string | null;
    watchedAt: string | null;
    addedAt: string;
  }[];
  lists: {
    name: string;
    description: string | null;
    isPublic: boolean;
    createdAt: string;
    items: {
      tmdbId: number;
      type: "movie" | "tv" | "documentary";
      title: string;
      position: number;
    }[];
  }[];
  tags: {
    name: string;
    colour: string;
    createdAt: string;
    content: {
      tmdbId: number;
      type: "movie" | "tv" | "documentary";
      title: string;
    }[];
  }[];
}

/**
 * Convert export data to CSV format
 * Creates multiple sections for different data types
 */
function convertToCSV(data: ExportData): string {
  const lines: string[] = [];

  // User info section
  lines.push("# User Profile");
  lines.push("Email,Display Name,Avatar URL,Created At");
  lines.push(
    [
      escapeCSV(data.user.email),
      escapeCSV(data.user.displayName || ""),
      escapeCSV(data.user.avatarUrl || ""),
      data.user.createdAt,
    ].join(","),
  );
  lines.push("");

  // Content section
  lines.push("# Library Content");
  lines.push(
    "TMDB ID,Type,Title,Status,Rating,Notes,Watched At,Added At",
  );
  for (const item of data.content) {
    lines.push(
      [
        item.tmdbId,
        item.type,
        escapeCSV(item.title),
        item.status,
        item.rating ?? "",
        escapeCSV(item.notes || ""),
        item.watchedAt || "",
        item.addedAt,
      ].join(","),
    );
  }
  lines.push("");

  // Lists section
  lines.push("# Custom Lists");
  lines.push(
    "List Name,Description,Is Public,Created At,Item TMDB ID,Item Type,Item Title,Position",
  );
  for (const list of data.lists) {
    if (list.items.length === 0) {
      // Empty list
      lines.push(
        [
          escapeCSV(list.name),
          escapeCSV(list.description || ""),
          list.isPublic,
          list.createdAt,
          "",
          "",
          "",
          "",
        ].join(","),
      );
    } else {
      for (const item of list.items) {
        lines.push(
          [
            escapeCSV(list.name),
            escapeCSV(list.description || ""),
            list.isPublic,
            list.createdAt,
            item.tmdbId,
            item.type,
            escapeCSV(item.title),
            item.position,
          ].join(","),
        );
      }
    }
  }
  lines.push("");

  // Tags section
  lines.push("# Tags");
  lines.push(
    "Tag Name,Colour,Created At,Content TMDB ID,Content Type,Content Title",
  );
  for (const tag of data.tags) {
    if (tag.content.length === 0) {
      // Empty tag
      lines.push(
        [
          escapeCSV(tag.name),
          tag.colour,
          tag.createdAt,
          "",
          "",
          "",
        ].join(","),
      );
    } else {
      for (const item of tag.content) {
        lines.push(
          [
            escapeCSV(tag.name),
            tag.colour,
            tag.createdAt,
            item.tmdbId,
            item.type,
            escapeCSV(item.title),
          ].join(","),
        );
      }
    }
  }

  return lines.join("\n");
}

/**
 * Escape a value for CSV format
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * API endpoint for exporting user data
 * GET: Export user's data in JSON or CSV format
 *
 * Query parameters:
 * - format: "json" (default) or "csv"
 *
 * Premium only feature
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const session = await requireAuthForApi(req);

      // Check if user is premium
      const userResult = await query<{
        preferences: Record<string, unknown>;
      }>(
        "SELECT preferences FROM users WHERE id = $1",
        [session.userId],
      );

      if (userResult.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const preferences = userResult[0].preferences || {};
      const isPremium = preferences.premium === true;

      if (!isPremium) {
        return createForbiddenResponse(
          "Data export is a premium feature. Please upgrade to access this feature.",
        );
      }

      // Get format from query string
      const url = new URL(req.url);
      const format = url.searchParams.get("format") || "json";

      if (format !== "json" && format !== "csv") {
        return createBadRequestResponse(
          "Invalid format. Supported formats: json, csv",
          "format",
        );
      }

      // Fetch user profile
      const profileResult = await query<UserProfile>(
        `SELECT email, display_name, avatar_url, preferences, created_at 
         FROM users WHERE id = $1`,
        [session.userId],
      );

      if (profileResult.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const profile = profileResult[0];

      // Fetch all user content (watched, watchlist, favourites)
      const contentResult = await query<UserContentRecord>(
        `SELECT 
          c.tmdb_id,
          c.type,
          c.title,
          uc.status,
          uc.rating,
          uc.notes,
          uc.watched_at,
          uc.created_at
        FROM user_content uc
        INNER JOIN content c ON uc.content_id = c.id
        WHERE uc.user_id = $1
        ORDER BY uc.created_at DESC`,
        [session.userId],
      );

      // Fetch user's lists with items
      const listsResult = await query<{
        id: string;
        name: string;
        description: string | null;
        is_public: boolean;
        created_at: Date;
      }>(
        `SELECT id, name, description, is_public, created_at 
         FROM lists 
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [session.userId],
      );

      // Fetch list items for each list
      const lists: ListRecord[] = [];
      for (const list of listsResult) {
        const itemsResult = await query<{
          tmdb_id: number;
          type: "movie" | "tv" | "documentary";
          title: string;
          position: number;
        }>(
          `SELECT c.tmdb_id, c.type, c.title, li.position
           FROM list_items li
           INNER JOIN content c ON li.content_id = c.id
           WHERE li.list_id = $1
           ORDER BY li.position ASC`,
          [list.id],
        );

        lists.push({
          ...list,
          items: itemsResult,
        });
      }

      // Fetch user's tags with content
      const tagsResult = await query<{
        id: string;
        name: string;
        colour: string;
        created_at: Date;
      }>(
        `SELECT id, name, colour, created_at 
         FROM tags 
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [session.userId],
      );

      // Fetch tagged content for each tag
      const tags: TagRecord[] = [];
      for (const tag of tagsResult) {
        const contentResult = await query<{
          tmdb_id: number;
          type: "movie" | "tv" | "documentary";
          title: string;
        }>(
          `SELECT c.tmdb_id, c.type, c.title
           FROM content_tags ct
           INNER JOIN content c ON ct.content_id = c.id
           WHERE ct.tag_id = $1`,
          [tag.id],
        );

        tags.push({
          ...tag,
          content: contentResult,
        });
      }

      // Build export data structure
      const exportData: ExportData = {
        exportedAt: new Date().toISOString(),
        user: {
          email: profile.email,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          createdAt: profile.created_at.toISOString(),
        },
        content: contentResult.map((item) => ({
          tmdbId: item.tmdb_id,
          type: item.type,
          title: item.title,
          status: item.status,
          rating: item.rating,
          notes: item.notes,
          watchedAt: item.watched_at?.toISOString() || null,
          addedAt: item.created_at.toISOString(),
        })),
        lists: lists.map((list) => ({
          name: list.name,
          description: list.description,
          isPublic: list.is_public,
          createdAt: list.created_at.toISOString(),
          items: list.items.map((item) => ({
            tmdbId: item.tmdb_id,
            type: item.type,
            title: item.title,
            position: item.position,
          })),
        })),
        tags: tags.map((tag) => ({
          name: tag.name,
          colour: tag.colour,
          createdAt: tag.created_at.toISOString(),
          content: tag.content.map((item) => ({
            tmdbId: item.tmdb_id,
            type: item.type,
            title: item.title,
          })),
        })),
      };

      // Return in requested format
      if (format === "csv") {
        const csv = convertToCSV(exportData);
        const filename = `streamowl-export-${
          new Date().toISOString().split("T")[0]
        }.csv`;

        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      } else {
        const filename = `streamowl-export-${
          new Date().toISOString().split("T")[0]
        }.json`;

        return new Response(JSON.stringify(exportData, null, 2), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error exporting user data:", error);
      return createInternalServerErrorResponse("Failed to export user data");
    }
  },
};
