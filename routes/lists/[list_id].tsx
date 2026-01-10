import { type Handlers } from "$fresh/server.ts";
import { getSessionFromRequest } from "../../lib/auth/middleware.ts";
import { query } from "../../lib/db.ts";
import ReorderableList from "../../islands/ReorderableList.tsx";

/**
 * Route for viewing a custom list
 *
 * GET /lists/[list_id]
 * - Displays a custom list with its items
 * - Public lists can be viewed by anyone
 * - Private lists can only be viewed by the owner
 */
export const handler: Handlers = {
  async GET(req, ctx) {
    const listId = ctx.params.list_id;

    try {
      // Fetch list details
      const listResult = await query<{
        id: string;
        user_id: string;
        name: string;
        description: string | null;
        is_public: boolean;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT id, user_id, name, description, is_public, created_at, updated_at
         FROM lists
         WHERE id = $1`,
        [listId],
      );

      if (listResult.length === 0) {
        return new Response("List not found", { status: 404 });
      }

      const list = listResult[0];

      // Check if user can view this list
      const session = await getSessionFromRequest(req);
      const isOwner = session?.userId === list.user_id;

      if (!list.is_public && !isOwner) {
        // Private list, require authentication and ownership
        if (!session) {
          const url = new URL(req.url);
          const returnTo = encodeURIComponent(url.pathname);
          const loginUrl = `/login?returnTo=${returnTo}`;

          return new Response(null, {
            status: 302,
            headers: { Location: loginUrl },
          });
        }

        // Not the owner
        return new Response("Access denied", { status: 403 });
      }

      // Fetch list items
      const itemsResult = await query<{
        tmdb_id: number;
        type: "movie" | "tv" | "documentary";
        title: string;
        poster_path: string | null;
        release_date: string | null;
        position: number;
      }>(
        `SELECT 
          c.tmdb_id,
          c.type,
          c.title,
          c.poster_path,
          c.release_date,
          li.position
        FROM list_items li
        INNER JOIN content c ON li.content_id = c.id
        WHERE li.list_id = $1
        ORDER BY li.position ASC, li.created_at ASC`,
        [listId],
      );

      return ctx.render({
        list: {
          id: list.id,
          name: list.name,
          description: list.description,
          is_public: list.is_public,
          created_at: list.created_at.toISOString(),
          updated_at: list.updated_at.toISOString(),
        },
        items: itemsResult.map((item) => ({
          tmdb_id: item.tmdb_id,
          type: item.type,
          title: item.title,
          poster_path: item.poster_path,
          release_date: item.release_date,
          position: item.position,
        })),
        isOwner,
      });
    } catch (error) {
      console.error("Error fetching list:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
};

interface ListPageProps {
  list: {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
  };
  items: Array<{
    tmdb_id: number;
    type: "movie" | "tv" | "documentary";
    title: string;
    poster_path: string | null;
    release_date: string | null;
    position: number;
  }>;
  isOwner: boolean;
}

export default function ListPage({ data }: { data: ListPageProps }) {
  const { list, items, isOwner } = data;

  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">{list.name}</h1>
          {list.description && (
            <p class="text-gray-600 mb-2">{list.description}</p>
          )}
          <div class="flex items-center gap-4 text-sm text-gray-500">
            <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
            {list.is_public && (
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Public
              </span>
            )}
            {!list.is_public && (
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Private
              </span>
            )}
          </div>
        </div>

        <ReorderableList
          listId={list.id}
          items={items}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
