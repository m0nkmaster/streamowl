/**
 * Unit tests for image URL utilities
 */

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  getBackdropSrcSet,
  getBackdropUrl,
  getDetailPosterSize,
  getGridPosterSize,
  getPosterSrcSet,
  getPosterUrl,
} from "./images.ts";

Deno.test("getPosterUrl should return TMDB URL with correct size", () => {
  const posterPath = "/test-poster.jpg";
  const url = getPosterUrl(posterPath, "w500");

  assertEquals(url, "https://image.tmdb.org/t/p/w500/test-poster.jpg");
});

Deno.test("getPosterUrl should use default size when not specified", () => {
  const posterPath = "/test-poster.jpg";
  const url = getPosterUrl(posterPath);

  assertEquals(url, "https://image.tmdb.org/t/p/w500/test-poster.jpg");
});

Deno.test("getPosterUrl should return placeholder for null poster path", () => {
  const url = getPosterUrl(null);

  assertEquals(url, "https://via.placeholder.com/300x450?text=No+Poster");
});

Deno.test("getPosterUrl should return placeholder for empty poster path", () => {
  const url = getPosterUrl("");

  assertEquals(url, "https://via.placeholder.com/300x450?text=No+Poster");
});

Deno.test("getPosterSrcSet should return srcset string", () => {
  const posterPath = "/test-poster.jpg";
  const srcset = getPosterSrcSet(posterPath);

  assert(srcset.includes("w185"));
  assert(srcset.includes("w300"));
  assert(srcset.includes("w500"));
  assert(srcset.includes("185w"));
  assert(srcset.includes("300w"));
  assert(srcset.includes("500w"));
});

Deno.test("getPosterSrcSet should return empty string for null poster path", () => {
  const srcset = getPosterSrcSet(null);

  assertEquals(srcset, "");
});

Deno.test("getBackdropUrl should return TMDB URL with correct size", () => {
  const backdropPath = "/test-backdrop.jpg";
  const url = getBackdropUrl(backdropPath, "w1280");

  assertEquals(url, "https://image.tmdb.org/t/p/w1280/test-backdrop.jpg");
});

Deno.test("getBackdropUrl should use default size when not specified", () => {
  const backdropPath = "/test-backdrop.jpg";
  const url = getBackdropUrl(backdropPath);

  assertEquals(url, "https://image.tmdb.org/t/p/w1280/test-backdrop.jpg");
});

Deno.test("getBackdropUrl should return empty string for null backdrop path", () => {
  const url = getBackdropUrl(null);

  assertEquals(url, "");
});

Deno.test("getBackdropSrcSet should return srcset string", () => {
  const backdropPath = "/test-backdrop.jpg";
  const srcset = getBackdropSrcSet(backdropPath);

  assert(srcset.includes("w780"));
  assert(srcset.includes("w1280"));
  assert(srcset.includes("780w"));
  assert(srcset.includes("1280w"));
});

Deno.test("getBackdropSrcSet should return empty string for null backdrop path", () => {
  const srcset = getBackdropSrcSet(null);

  assertEquals(srcset, "");
});

Deno.test("getGridPosterSize should return w300", () => {
  const size = getGridPosterSize();

  assertEquals(size, "w300");
});

Deno.test("getDetailPosterSize should return w500", () => {
  const size = getDetailPosterSize();

  assertEquals(size, "w500");
});
