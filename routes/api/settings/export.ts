import { type Handlers } from "$fresh/server.ts";
import { requireAuthForApi } from "../../../lib/auth/middleware.ts";
import { isPremiumUser } from "../../../lib/auth/premium.ts";
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
  created_at: Date;
}

interface UserContentItem {
  tmdb_id: number;
  content_type: string;
  title: string;
  status: string;
  rating: number | null;
  notes: string | null;
  watched_at: Date | null;
  added_at: Date;
}

interface ListItem {
  list_name: string;
  list_description: string | null;
  is_public: boolean;
  tmdb_id: number;
  content_type: string;
  title: string;
  position: number;
  added_at: Date;
}

interface Tag {
  name: string;
  colour: string;
}

interface ContentTag {
  tag_name: string;
  tmdb_id: number;
  content_type: string;
  title: string;
}

interface ExportData {
  exportedAt: string;
  profile: {
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
  library: {
    tmdbId: number;
    contentType: string;
    title: string;
    status: string;
    rating: number | null;
    notes: string | null;
    watchedAt: string | null;
    addedAt: string;
  }[];
  lists: {
    name: string;
    description: string | null;
    isPublic: boolean;
    items: {
      tmdbId: number;
      contentType: string;
      title: string;
      position: number;
      addedAt: string;
    }[];
  }[];
  tags: {
    name: string;
    colour: string;
    content: {
      tmdbId: number;
      contentType: string;
      title: string;
    }[];
  }[];
}

/**
 * Convert export data to CSV format
 * Creates multiple sections for different data types
 */
function toCSV(data: ExportData): string {
  const lines: string[] = [];

  // Helper to escape CSV values
  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Profile section
  lines.push("# Profile");
  lines.push("Email,Display Name,Avatar URL,Created At");
  lines.push(
    [
      escapeCSV(data.profile.email),
      escapeCSV(data.profile.displayName),
      escapeCSV(data.profile.avatarUrl),
      escapeCSV(data.profile.createdAt),
    ].join(","),
  );
  lines.push("");

  // Library section
  lines.push("# Library");
  lines.push(
    "TMDB ID,Content Type,Title,Status,Rating,Notes,Watched At,Added At",
  );
  for (const item of data.library) {
    lines.push(
      [
        escapeCSV(item.tmdbId),
        escapeCSV(item.contentType),
        escapeCSV(item.title),
        escapeCSV(item.status),
        escapeCSV(item.rating),
        escapeCSV(item.notes),
        escapeCSV(item.watchedAt),
        escapeCSV(item.addedAt),
      ].join(","),
    );
  }
  lines.push("");

  // Lists section
  lines.push("# Lists");
  lines.push(
    "List Name,List Description,Is Public,TMDB ID,Content Type,Title,Position,Added At",
  );
  for (const list of data.lists) {
    for (const item of list.items) {
      lines.push(
        [
          escapeCSV(list.name),
          escapeCSV(list.description),
          escapeCSV(list.isPublic),
          escapeCSV(item.tmdbId),
          escapeCSV(item.contentType),
          escapeCSV(item.title),
          escapeCSV(item.position),
          escapeCSV(item.addedAt),
        ].join(","),
      );
    }
  }
  lines.push("");

  // Tags section
  lines.push("# Tags");
  lines.push("Tag Name,Tag Colour,TMDB ID,Content Type,Title");
  for (const tag of data.tags) {
    for (const item of tag.content) {
      lines.push(
        [
          escapeCSV(tag.name),
          escapeCSV(tag.colour),
          escapeCSV(item.tmdbId),
          escapeCSV(item.contentType),
          escapeCSV(item.title),
        ].join(","),
      );
    }
  }

  return lines.join("\n");
}

/**
 * API endpoint for exporting user data
 *
 * GET /api/settings/export?format=json|csv
 * - Premium users only
 * - Returns all user data in the specified format
 */
export const handler: Handlers = {
  async GET(req) {
    try {
      const session = await requireAuthForApi(req);
      const userId = session.userId;

      // Check premium status
      const isPremium = await isPremiumUser(userId);
      if (!isPremium) {
        return createForbiddenResponse(
          "Data export is a premium feature. Please upgrade to export your data.",
          "PREMIUM_REQUIRED",
        );
      }

      // Get format from query string
      const url = new URL(req.url);
      const format = url.searchParams.get("format") || "json";

      if (format !== "json" && format !== "csv") {
        return createBadRequestResponse(
          "Invalid format. Use 'json' or 'csv'.",
          "format",
        );
      }

      // Fetch user profile
      const profileResult = await query<UserProfile>(
        `SELECT email, display_name, avatar_url, created_at
         FROM users WHERE id = $1`,
        [userId],
      );

      if (profileResult.length === 0) {
        return createInternalServerErrorResponse("User not found");
      }

      const profile = profileResult[0];

      // Fetch user library (user_content with content details)
      const libraryResult = await query<UserContentItem>(
        `SELECT 
          c.tmdb_id,
          c.type AS content_type,
          c.title,
          uc.status,
          uc.rating,
          uc.notes,
          uc.watched_at,
          uc.created_at AS added_at
        FROM user_content uc
        INNER JOIN content c ON uc.content_id = c.id
        WHERE uc.user_id = $1
        ORDER BY uc.created_at DESC`,
        [userId],
      );

      // Fetch custom lists with their items
      const listItemsResult = await query<ListItem>(
        `SELECT 
          l.name AS list_name,
          l.description AS list_description,
          l.is_public,
          c.tmdb_id,
          c.type AS content_type,
          c.title,
          li.position,
          li.created_at AS added_at
        FROM lists l
        LEFT JOIN list_items li ON li.list_id = l.id
        LEFT JOIN content c ON li.content_id = c.id
        WHERE l.user_id = $1
        ORDER BY l.name, li.position`,
        [userId],
      );

      // Fetch tags
      const tagsResult = await query<Tag>(
        `SELECT name, colour FROM tags WHERE user_id = $1 ORDER BY name`,
        [userId],
      );

      // Fetch content tagged by user
      const contentTagsResult = await query<ContentTag>(
        `SELECT 
          t.name AS tag_name,
          c.tmdb_id,
          c.type AS content_type,
          c.title
        FROM content_tags ct
        INNER JOIN tags t ON ct.tag_id = t.id
        INNER JOIN content c ON ct.content_id = c.id
        WHERE t.user_id = $1
        ORDER BY t.name, c.title`,
        [userId],
      );

      // Build lists structure
      const listsMap = new Map<
        string,
        {
          name: string;
          description: string | null;
          isPublic: boolean;
          items: {
            tmdbId: number;
            contentType: string;
            title: string;
            position: number;
            addedAt: string;
          }[];
        }
      >();

      for (const item of listItemsResult) {
        if (!listsMap.has(item.list_name)) {
          listsMap.set(item.list_name, {
            name: item.list_name,
            description: item.list_description,
            isPublic: item.is_public,
            items: [],
          });
        }

        // Only add item if it has content (not an empty list)
        if (item.tmdb_id !== null) {
          listsMap.get(item.list_name)!.items.push({
            tmdbId: item.tmdb_id,
            contentType: item.content_type,
            title: item.title,
            position: item.position,
            addedAt: item.added_at.toISOString(),
          });
        }
      }

      // Build tags structure with their content
      const tagsMap = new Map<
        string,
        {
          name: string;
          colour: string;
          content: {
            tmdbId: number;
            contentType: string;
            title: string;
          }[];
        }
      >();

      for (const tag of tagsResult) {
        tagsMap.set(tag.name, {
          name: tag.name,
          colour: tag.colour,
          content: [],
        });
      }

      for (const item of contentTagsResult) {
        if (tagsMap.has(item.tag_name)) {
          tagsMap.get(item.tag_name)!.content.push({
            tmdbId: item.tmdb_id,
            contentType: item.content_type,
            title: item.title,
          });
        }
      }

      // Build export data
      const exportData: ExportData = {
        exportedAt: new Date().toISOString(),
        profile: {
          email: profile.email,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          createdAt: profile.created_at.toISOString(),
        },
        library: libraryResult.map((item) => ({
          tmdbId: item.tmdb_id,
          contentType: item.content_type,
          title: item.title,
          status: item.status,
          rating: item.rating,
          notes: item.notes,
          watchedAt: item.watched_at?.toISOString() || null,
          addedAt: item.added_at.toISOString(),
        })),
        lists: Array.from(listsMap.values()),
        tags: Array.from(tagsMap.values()),
      };

      // Return in requested format
      if (format === "csv") {
        const csv = toCSV(exportData);
        const filename = `streamowl-export-${
          new Date().toISOString().split("T")[0]
        }.csv`;

        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }

      // JSON format
      const filename = `streamowl-export-${
        new Date().toISOString().split("T")[0]
      }.json`;

      return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      console.error("Error exporting user data:", error);
      return createInternalServerErrorResponse("Failed to export user data");
    }
  },
};
