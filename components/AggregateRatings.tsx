/**
 * Aggregate Ratings Component
 *
 * Displays ratings from multiple sources: TMDB, IMDb, and Rotten Tomatoes.
 * Shows each rating with its respective branding and visual style.
 */

interface AggregateRatingsProps {
  tmdb: {
    rating: number;
    voteCount: number;
  };
  imdb?: {
    rating: number | null;
    votes: string | null;
  } | null;
  rottenTomatoes?: {
    score: number | null;
  } | null;
  metacritic?: {
    score: number | null;
  } | null;
}

/**
 * Get colour class for Rotten Tomatoes score
 * Fresh: 60%+, Rotten: <60%
 */
function getRottenTomatoesColour(score: number): string {
  if (score >= 60) {
    return "text-red-600"; // Fresh (tomato red)
  }
  return "text-green-700"; // Rotten (green splat)
}

/**
 * Get Rotten Tomatoes icon based on score
 */
function getRottenTomatoesIcon(score: number): string {
  return score >= 60 ? "🍅" : "🤢";
}

/**
 * Get colour class for Metacritic score
 * Green: 61+, Yellow: 40-60, Red: 0-39
 */
function getMetacriticColour(score: number): string {
  if (score >= 61) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Format vote count for display
 */
function formatVotes(votes: string | null): string {
  if (!votes) return "";
  // Remove commas and parse
  const numVotes = parseInt(votes.replace(/,/g, ""), 10);
  if (isNaN(numVotes)) return votes;

  if (numVotes >= 1000000) {
    return `${(numVotes / 1000000).toFixed(1)}M`;
  }
  if (numVotes >= 1000) {
    return `${(numVotes / 1000).toFixed(0)}K`;
  }
  return numVotes.toString();
}

export default function AggregateRatings(props: AggregateRatingsProps) {
  const { tmdb, imdb, rottenTomatoes, metacritic } = props;

  const hasExternalRatings =
    (imdb?.rating !== null && imdb?.rating !== undefined) ||
    (rottenTomatoes?.score !== null && rottenTomatoes?.score !== undefined) ||
    (metacritic?.score !== null && metacritic?.score !== undefined);

  return (
    <div class="mb-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">Ratings</h3>
      <div class="flex flex-wrap gap-4">
        {/* TMDB Rating */}
        <div
          class="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg px-4 py-3 shadow-md"
          title="TMDB Rating"
        >
          <div class="flex flex-col items-center">
            <span class="text-2xl font-bold">{tmdb.rating.toFixed(1)}</span>
            <span class="text-xs opacity-90">TMDB</span>
          </div>
          <div class="border-l border-white/30 pl-2 ml-1">
            <span class="text-xs opacity-75">
              {tmdb.voteCount.toLocaleString()} votes
            </span>
          </div>
        </div>

        {/* IMDb Rating */}
        {imdb?.rating !== null && imdb?.rating !== undefined && (
          <div
            class="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg px-4 py-3 shadow-md"
            title="IMDb Rating"
          >
            <div class="flex flex-col items-center">
              <span class="text-2xl font-bold">{imdb.rating.toFixed(1)}</span>
              <span class="text-xs font-semibold">IMDb</span>
            </div>
            {imdb.votes && (
              <div class="border-l border-gray-900/30 pl-2 ml-1">
                <span class="text-xs opacity-75">
                  {formatVotes(imdb.votes)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Rotten Tomatoes Score */}
        {rottenTomatoes?.score !== null &&
          rottenTomatoes?.score !== undefined && (
          <div
            class="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-lg px-4 py-3 shadow-md"
            title={`Rotten Tomatoes ${
              rottenTomatoes.score >= 60 ? "Fresh" : "Rotten"
            }`}
          >
            <span class="text-2xl" role="img" aria-label="tomato">
              {getRottenTomatoesIcon(rottenTomatoes.score)}
            </span>
            <div class="flex flex-col items-center">
              <span
                class={`text-2xl font-bold ${
                  getRottenTomatoesColour(
                    rottenTomatoes.score,
                  )
                }`}
              >
                {rottenTomatoes.score}%
              </span>
              <span class="text-xs text-gray-600">Rotten Tomatoes</span>
            </div>
          </div>
        )}

        {/* Metacritic Score */}
        {metacritic?.score !== null && metacritic?.score !== undefined && (
          <div
            class="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-lg px-4 py-3 shadow-md"
            title="Metacritic Score"
          >
            <div
              class={`w-10 h-10 ${
                getMetacriticColour(
                  metacritic.score,
                )
              } rounded flex items-center justify-center`}
            >
              <span class="text-white font-bold text-lg">
                {metacritic.score}
              </span>
            </div>
            <span class="text-xs text-gray-600">Metacritic</span>
          </div>
        )}

        {/* Message if no external ratings available */}
        {!hasExternalRatings && (
          <div class="text-sm text-gray-500 italic self-center">
            External ratings not available
          </div>
        )}
      </div>
    </div>
  );
}
