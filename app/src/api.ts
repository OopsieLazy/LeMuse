// Typed wrappers over Tauri commands. The UI imports only from here, so
// command names/types live in one place (mirror of app/src-tauri/src/lib.rs).
import { invoke } from "@tauri-apps/api/core";

export interface LibraryStatus {
  root: string;
  blocks: number;
  schema_version: number;
}

export interface TopicInfo {
  name: string;
  slide_seconds: number;
  shuffle: boolean;
  sources: number;
}

/** One slideshow frame; `display_url` streams from the source CDN. */
export interface Slide {
  block_id: number;
  title: string | null;
  display_url: string;
  width: number | null;
  height: number | null;
  page_url: string | null;
  creator: string | null;
  attribution: string | null;
  saved: boolean;
}

export const api = {
  libraryStatus: () => invoke<LibraryStatus>("library_status"),
  topics: () => invoke<TopicInfo[]>("topics"),
  slides: (topic: string, limit = 100, offset = 0) =>
    invoke<Slide[]>("slides", { topic, limit, offset }),
  search: (query: string) => invoke<number[]>("search", { query }),
  refreshNow: () => invoke<void>("refresh_now"),
};
