/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Character {
  id: string;
  name: string;
  archetype: string;
  tagline: string;
  physicalAppearance: string;
  internalDrive: string;
  quirksAndHabits: string;
  backstory: string;
}

export interface OutlineItem {
  id: string;
  title: string;
  notes: string;
  isCompleted: boolean;
}

export interface Story {
  id: string;
  title: string;
  genre: string;
  tone: string;
  summary: string;
  manuscript: string;
  chapters: Document[];
  activeChapterId: string;
  characters: Character[];
  outline: OutlineItem[];
  lastSavedAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export type SidebarTab = "details" | "characters" | "outline" | "lore";
export type AiTab = "continue" | "refine" | "brainstorm" | "chat" | "analytics";
export type RefineMode = "polish" | "shorten" | "show-not-tell" | "custom";

export interface LoreBookItem {
  id: string;
  keyword: string;
  description: string;
}

