/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Sparkles,
  Award,
  Plus,
  Compass,
  FileText,
  HelpCircle,
  FolderOpen,
  ChevronRight,
  RefreshCw,
  Clock,
  ExternalLink,
  Save,
  Trash2,
  ListTodo,
  AlignLeft,
  ChevronDown,
  Info,
  Maximize,
  Sliders,
  Sparkle,
  BarChart2
} from "lucide-react";

import { Story, Character, OutlineItem, SidebarTab, AiTab, LoreBookItem } from "./types";
import { INITIAL_STORY, GENRES, TONES } from "./data";

// Import custom sub-modules
import StoryStarterTab from "./components/StoryStarterTab";
import WorldBuilderTab from "./components/WorldBuilderTab";
import CharacterTab from "./components/CharacterTab";
import RefinementPanel from "./components/RefinementPanel";
import CoWriterChat from "./components/CoWriterChat";

export default function App() {
  // Primary app state - lazy initialization from LocalStorage
  const [story, setStory] = useState<Story>(() => {
    try {
      const saved = localStorage.getItem("ai_story_state");
      return saved ? JSON.parse(saved) : INITIAL_STORY;
    } catch (e) {
      console.error("Failed to parse saved story state", e);
      return INITIAL_STORY;
    }
  });

  const [selectedMainTab, setSelectedMainTab] = useState<"canvas" | "incubate" | "world" | "characters">("canvas");
  const [leftSidebarTab, setLeftSidebarTab] = useState<"structure" | "outline" | "lore">("structure");
  const [rightPanelTab, setRightPanelTab] = useState<AiTab>("refine");

  // World Lore Codex state - lazy initialization from LocalStorage
  const [loreBook, setLoreBook] = useState<LoreBookItem[]>(() => {
    try {
      const savedLore = localStorage.getItem("ai_story_lore");
      return savedLore ? JSON.parse(savedLore) : [
        { id: "l1", keyword: "Arthur", description: "An old clockmaker in a rain-slicked city who discovered a brass pocketwatch that freezes time." },
        { id: "l2", keyword: "Valerie", description: "A sharp, cybernetic-eyed courier who works for Sector 8's underworld Boss." }
      ];
    } catch (e) {
      return [
        { id: "l1", keyword: "Arthur", description: "An old clockmaker in a rain-slicked city who discovered a brass pocketwatch that freezes time." },
        { id: "l2", keyword: "Valerie", description: "A sharp, cybernetic-eyed courier who works for Sector 8's underworld Boss." }
      ];
    }
  });

  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Selection states & floating contextual menu
  const [highlightedText, setHighlightedText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyticsResult, setAnalyticsResult] = useState<{
    sensory: string;
    sensoryScore?: number;
    pacing: string;
    pacingScore?: number;
    beta: string;
    betaScore?: number;
    overallScore?: number;
  } | null>(() => {
    try {
      const saved = localStorage.getItem("ai_story_analytics");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [expansionInstruction, setExpansionInstruction] = useState("");
  const [expandingActive, setExpandingActive] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ x: 0, y: 0 });
  const [selectionData, setSelectionData] = useState({ start: 0, end: 0, text: "" });

  // --- AI Time Machine Snapshot State (Option 4) ---
  const [lastSnapshot, setLastSnapshot] = useState<{ chapterId: string | null; content: string | null }>(() => {
    try {
      const saved = localStorage.getItem("ai_story_last_snapshot");
      return saved ? JSON.parse(saved) : { chapterId: null, content: null };
    } catch {
      return { chapterId: null, content: null };
    }
  });

  useEffect(() => {
    try {
      if (lastSnapshot && lastSnapshot.content) {
        localStorage.setItem("ai_story_last_snapshot", JSON.stringify(lastSnapshot));
      } else {
        localStorage.removeItem("ai_story_last_snapshot");
      }
    } catch (e) {
      console.error("Failed to save snapshot to localStorage", e);
    }
  }, [lastSnapshot]);

  const handleUndoAiAction = () => {
    if (!lastSnapshot.content || lastSnapshot.chapterId !== activeChapterId) return;

    setStory((prev) => {
      const nextChapters = prev.chapters.map((ch) =>
        ch.id === activeChapterId ? { ...ch, content: lastSnapshot.content! } : ch
      );
      return {
        ...prev,
        manuscript: lastSnapshot.content!,
        chapters: nextChapters,
        lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    });

    setLastSnapshot({ chapterId: null, content: null });
    showNotification("Reverted back to your exact human draft.");
  };

  // New: Inline complete co-writer state & refs
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Quick Brainstorm outputs in right sidebar
  const [brainstormType, setBrainstormType] = useState<"twist" | "title" | "outline">("twist");
  const [brainstormPrompt, setBrainstormPrompt] = useState("");
  const [brainstormResult, setBrainstormResult] = useState("");
  const [brainstormLoading, setBrainstormLoading] = useState(false);

  const [notifications, setNotifications] = useState<string[]>([]);

  // Focus mode & Collapsible sidebars state - lazy initialization from LocalStorage
  const [focusMode, setFocusMode] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("ai_story_left_open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });
  const [isRightOpen, setIsRightOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("ai_story_right_open");
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  // Auto-Save effects for local storage persistence
  useEffect(() => {
    try {
      localStorage.setItem("ai_story_state", JSON.stringify(story));
    } catch (e) {
      console.error("Failed to save story state to localStorage", e);
    }
  }, [story]);

  useEffect(() => {
    try {
      localStorage.setItem("ai_story_left_open", JSON.stringify(isLeftOpen));
    } catch (e) {
      console.error("Failed to save isLeftOpen to localStorage", e);
    }
  }, [isLeftOpen]);

  useEffect(() => {
    try {
      localStorage.setItem("ai_story_right_open", JSON.stringify(isRightOpen));
    } catch (e) {
      console.error("Failed to save isRightOpen to localStorage", e);
    }
  }, [isRightOpen]);

  useEffect(() => {
    try {
      localStorage.setItem("ai_story_lore", JSON.stringify(loreBook));
    } catch (e) {
      console.error("Failed to save lore book to localStorage", e);
    }
  }, [loreBook]);

  useEffect(() => {
    try {
      if (analyticsResult) {
        localStorage.setItem("ai_story_analytics", JSON.stringify(analyticsResult));
      } else {
        localStorage.removeItem("ai_story_analytics");
      }
    } catch (e) {
      console.error("Failed to save analytics result to localStorage", e);
    }
  }, [analyticsResult]);

  // Active Chapter resolution
  const activeChapterId = story.activeChapterId || (story.chapters[0]?.id) || "chapter-1";
  const activeCh = story.chapters.find((c) => c.id === activeChapterId) || story.chapters[0] || { id: "chapter-1", title: "Chapter 1", content: "" };

  // Sync state stats based directly on the active chapter content
  const wordCount = activeCh.content ? activeCh.content.split(/\s+/).filter(Boolean).length : 0;
  const charCount = activeCh.content ? activeCh.content.length : 0;
  const readingTime = Math.ceil(wordCount / 220); // 220 words per minute average

  const showNotification = (message: string) => {
    setNotifications((prev) => [message, ...prev]);
    setTimeout(() => {
      setNotifications((prev) => prev.slice(0, -1));
    }, 4000);
  };

  // Compile matching lore context for Gemini's prompt inclusion
  const compileLoreContext = (textToScan: string) => {
    if (!textToScan) return "";
    
    const matchedLore = loreBook.filter(item => {
      // Case-insensitive word boundary regex exact match
      const regex = new RegExp(`\\b${item.keyword}\\b`, "i");
      return regex.test(textToScan);
    });

    if (matchedLore.length === 0) return "";

    return `\n\n[CRITICAL STORY CONTEXT/LORE]:\nUse the following continuity rules for any characters or elements mentioned:\n` + 
      matchedLore.map(item => `- ${item.keyword}: ${item.description}`).join("\n");
  };

  // Lore Book events
  const handleAddLore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newDesc.trim()) return;

    const newItem: LoreBookItem = {
      id: "lore-" + Date.now().toString(),
      keyword: newKey.trim(),
      description: newDesc.trim()
    };

    setLoreBook((prev) => [...prev, newItem]);
    setNewKey("");
    setNewDesc("");
    showNotification(`Added "${newItem.keyword}" to World Lore Codex.`);
  };

  const handleRemoveLore = (id: string) => {
    const item = loreBook.find(l => l.id === id);
    setLoreBook((prev) => prev.filter(l => l.id !== id));
    if (item) {
      showNotification(`Removed "${item.keyword}" from World Lore Codex.`);
    }
  };

  const handleAnalyzeChapter = async () => {
    if (isAnalyzing || !activeCh.content.trim()) return;
    setIsAnalyzing(true);
    showNotification("Reviewing chapter manuscript with Editorial Desk...");

    try {
      const response = await fetch("/api/gemini/analyze-chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: activeCh.content,
        }),
      });

      if (!response.ok) {
        let serverError = `API error: ${response.status} ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            serverError = errData.error;
          }
        } catch (_) {}
        throw new Error(serverError);
      }

      const data = await response.json();
      const rawText = data.text || "";

      // Precise extracting considering score tags so they don't pollute the textual summaries
      const sensoryMatch = rawText.match(/\[SENSORY CHECK\]\s*([\s\S]*?)(?=\[PACING|\[SENSORY SCORE|\[PACING SCORE|\[BETA SCORE|\[OVERALL SCORE|\[PACING CATEGORY|$)/i);
      const pacingMatch = rawText.match(/\[PACING REPORT\]\s*([\s\S]*?)(?=\[BETA|\[SENSORY SCORE|\[PACING SCORE|\[BETA SCORE|\[OVERALL SCORE|\[PACING CATEGORY|$)/i);
      // Clean parsing for BETA block so the score tags at the very bottom are not included in the beta block
      const betaMatch = rawText.match(/\[BETA READER CRITIQUE\]\s*([\s\S]*?)(?=\[SENSORY SCORE|\[PACING SCORE|\[BETA SCORE|\[OVERALL SCORE|\[PACING CATEGORY|$)/i);

      // Regex matches to pull numerical scores
      const sensoryScoreMatch = rawText.match(/\[SENSORY SCORE\]\s*(\d+)/i);
      const pacingScoreMatch = rawText.match(/\[PACING SCORE\]\s*(\d+)/i);
      const betaScoreMatch = rawText.match(/\[BETA SCORE\]\s*(\d+)/i);
      const overallScoreMatch = rawText.match(/\[OVERALL SCORE\]\s*(\d+)/i);
      const pacingCategoryMatch = rawText.match(/\[PACING CATEGORY\]\s*([^\[\n\r]+)/i);

      const rawCategory = pacingCategoryMatch ? pacingCategoryMatch[1].trim() : "Steady Pacing";
      const scoreMapping: Record<string, number> = {
        "Flat / Static": 1,
        "Slow Burn": 2,
        "Steady Pacing": 3,
        "Highly Engaging": 4,
        "Breakneck / Intense": 5
      };

      const matchedKey = Object.keys(scoreMapping).find(
        key => key.toLowerCase() === rawCategory.replace(/['"“”]/g, "").trim().toLowerCase()
      ) || "Steady Pacing";

      const pacingValue = scoreMapping[matchedKey];

      const newAnalyticsResult = {
        sensory: sensoryMatch ? sensoryMatch[1].trim() : "Analysis parsing failed for this segment.",
        sensoryScore: sensoryScoreMatch ? parseInt(sensoryScoreMatch[1], 10) : undefined,
        pacing: pacingMatch ? pacingMatch[1].trim() : "Analysis parsing failed for this segment.",
        pacingScore: pacingScoreMatch ? parseInt(pacingScoreMatch[1], 10) : undefined,
        beta: betaMatch ? betaMatch[1].trim() : (rawText.split(/\[BETA READER CRITIQUE\]/i)[1] || rawText).trim(),
        betaScore: betaScoreMatch ? parseInt(betaScoreMatch[1], 10) : undefined,
        overallScore: overallScoreMatch ? parseInt(overallScoreMatch[1], 10) : undefined,
        pacingCategory: matchedKey,
        pacingValue: pacingValue,
      };

      setAnalyticsResult(newAnalyticsResult);

      setStory((prev) => {
        const nextChapters = prev.chapters.map((ch) =>
          ch.id === activeChapterId ? { ...ch, analytics: newAnalyticsResult } : ch
        );
        return {
          ...prev,
          chapters: nextChapters,
        };
      });

      showNotification("Chapter analysis loaded successfully!");
    } catch (error: any) {
      console.error("Analytics extraction failed:", error);
      showNotification("Analytics failed: " + (error.message || "Unknown error"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInlineComplete = async () => {
    const textarea = textareaRef.current;
    if (!textarea || isGenerating) return;

    // 1. Find exactly where the user is typing
    const cursorPosition = textarea.selectionStart;
    const currentVal = textarea.value;
    const textBeforeCursor = currentVal.substring(0, cursorPosition);
    const textAfterCursor = currentVal.substring(cursorPosition);

    if (!textBeforeCursor.trim()) return; // Don't invoke if there's no context

    // TIME MACHINE: Snapshot current draft before inline autocomplete
    setLastSnapshot({ chapterId: activeChapterId, content: activeCh.content });

    setIsGenerating(true);
    showNotification("Gemini is composing continuous prose...");

    try {
      const structuralInstructions = "You are a creative co-writer. Continue the story seamlessly based on the text provided. Do not repeat the prompt. Provide only the next 1-3 sentences.";
      const activeLoreContext = compileLoreContext(textBeforeCursor);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textBeforeCursor,
          context: structuralInstructions + activeLoreContext,
        }),
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();
      const generatedText = data.text || "...the story stalled.";

      // 3. Inject Gemini's text right at the cursor position
      const updatedContent = textBeforeCursor + generatedText + textAfterCursor;
      
      setStory((prev) => {
        const nextChapters = prev.chapters.map((ch) =>
          ch.id === activeChapterId ? { ...ch, content: updatedContent } : ch
        );
        return {
          ...prev,
          manuscript: updatedContent,
          chapters: nextChapters,
          lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      });

      showNotification("Surgically fused improved prose.");

      // 4. UX Polish: Return focus to the textarea and snap the cursor to the end of the new text
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = cursorPosition + generatedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 10);

    } catch (error) {
      console.error("Gemini context pipeline failed:", error);
      showNotification("Inline completion stalled. Please verify credentials.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInlineCompleteRef = useRef(handleInlineComplete);
  useEffect(() => {
    handleInlineCompleteRef.current = handleInlineComplete;
  });

  // Keyboard short-cuts listener for sidebar drawer toggles & escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is pressing Ctrl (or Cmd on Mac)
      const isMeta = e.ctrlKey || e.metaKey;

      if (isMeta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsLeftOpen((prev) => !prev);
      }
      
      if (isMeta && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsRightOpen((prev) => !prev);
      }

      // NEW: Ctrl + Space triggers the Gemini co-writer
      if (isMeta && (e.code === "Space" || e.key === " ")) {
        e.preventDefault();
        handleInlineCompleteRef.current?.();
      }

      if (e.key === "Escape") {
        setIsLeftOpen(false);
        setIsRightOpen(false);
        setFocusMode(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleTextChange = (newContent: string) => {
    setStory((prev) => {
      const nextChapters = prev.chapters.map((ch) =>
        ch.id === activeChapterId ? { ...ch, content: newContent } : ch
      );
      return {
        ...prev,
        manuscript: newContent,
        chapters: nextChapters,
        lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    });
  };

  const handleSelectChapter = (chapterId: string) => {
    const selectedCh = story.chapters.find((ch) => ch.id === chapterId);
    setStory((prev) => {
      return {
        ...prev,
        activeChapterId: chapterId,
        manuscript: selectedCh ? selectedCh.content : prev.manuscript,
      };
    });
    setAnalyticsResult(selectedCh?.analytics || null);
    setLastSnapshot({ chapterId: null, content: null });
  };

  const handleAddNewChapter = () => {
    const nextIndex = story.chapters.length + 1;
    const newCh = {
      id: "chapter-" + Date.now(),
      title: `Chapter ${nextIndex}: Untitled Chapter`,
      content: "",
    };
    setStory((prev) => ({
      ...prev,
      chapters: [...prev.chapters, newCh],
      activeChapterId: newCh.id,
      manuscript: "",
      lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));
    showNotification(`Created Chapter ${nextIndex}`);
  };

  const handleDeleteChapter = (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (story.chapters.length <= 1) {
      showNotification("You must keep at least one chapter.");
      return;
    }
    setStory((prev) => {
      const nextChapters = prev.chapters.filter((ch) => ch.id !== chapterId);
      const nextActiveId = prev.activeChapterId === chapterId ? nextChapters[0].id : prev.activeChapterId;
      const nextActiveCh = nextChapters.find(ch => ch.id === nextActiveId);
      return {
        ...prev,
        chapters: nextChapters,
        activeChapterId: nextActiveId,
        manuscript: nextActiveCh ? nextActiveCh.content : "",
        lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    });
    showNotification("Chapter deleted.");
  };

  // 1. Core integration: Adopt generated Story Starter
  const handleUseStarter = (title: string, beginning: string, outlineText: string) => {
    // Parse the generated structural guidelines into active outline items
    const outlineLines = outlineText
      .split("\n")
      .filter((line) => line.trim())
      .slice(0, 3); // Grab up to three items
    
    const parsedOutline: OutlineItem[] = outlineLines.map((line, idx) => ({
      id: "out-start-" + idx,
      title: line.replace(/^\d+[\.\-\s]*/, "").substring(0, 60),
      notes: line,
      isCompleted: false,
    }));

    const firstChapter = {
      id: "chapter-1",
      title: "Chapter 1: The Beginning",
      content: beginning,
    };

    setStory({
      ...story,
      title,
      manuscript: beginning,
      chapters: [firstChapter],
      activeChapterId: "chapter-1",
      summary: `A story generated about "${title}". Outline guide: ${outlineText.substring(0, 100)}...`,
      outline: parsedOutline.length > 0 ? parsedOutline : [
        { id: "out-start-1", title: "Act I: Overcoming the threshold", notes: outlineText, isCompleted: false }
      ],
      lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    showNotification(`Imported blueprint for "${title}"!`);
    setSelectedMainTab("canvas");
  };

  // 2. Core integration: Continue Writing (Predicate text generation)
  const handleContinuousWrite = async () => {
    if (expandingActive) return;

    // TIME MACHINE: Snapshot current draft before continuous expand write
    setLastSnapshot({ chapterId: activeChapterId, content: activeCh.content });

    setExpandingActive(true);
    try {
      const resp = await fetch("/api/gemini/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyText: activeCh.content,
          genre: story.genre,
          tone: story.tone,
          instructions: expansionInstruction,
        }),
      });

      if (!resp.ok) {
        throw new Error("Expanding narrative threads stalled.");
      }

      const data = await resp.json();
      if (data.text) {
        const nextContent = activeCh.content + "\n\n" + data.text;
        setStory((prev) => {
          const nextChapters = prev.chapters.map((ch) =>
            ch.id === activeChapterId ? { ...ch, content: nextContent } : ch
          );
          return {
            ...prev,
            manuscript: nextContent,
            chapters: nextChapters,
            lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
        });
        showNotification("Writings expanded successfully!");
        setExpansionInstruction("");
      }
    } catch (e: any) {
      alert(e.message || "Failed to continue writing.");
    } finally {
      setExpandingActive(false);
    }
  };

  // 3. Core integration: Apply prose improvement
  const handleApplyRefine = (newProse: string) => {
    // TIME MACHINE: Snapshot current draft before applying refine improvement
    setLastSnapshot({ chapterId: activeChapterId, content: activeCh.content });

    let nextContent = "";
    if (highlightedText && activeCh.content.includes(highlightedText)) {
      // Replace only the specific subset highlighted
      nextContent = activeCh.content.replace(highlightedText, newProse);
      showNotification("Surgically inserted improved prose.");
    } else {
      // Append it if selected highlights are cleared or not matching
      nextContent = activeCh.content + "\n\n" + newProse;
      showNotification("Appended polished prose to the end.");
    }

    setStory((prev) => {
      const nextChapters = prev.chapters.map((ch) =>
        ch.id === activeChapterId ? { ...ch, content: nextContent } : ch
      );
      return {
        ...prev,
        manuscript: nextContent,
        chapters: nextChapters,
        lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    });
    setHighlightedText("");
  };

  // 4. Core integration: Brainstorm generator
  const triggerBrainstorm = async () => {
    if (brainstormLoading) return;
    setBrainstormLoading(true);
    setBrainstormResult("");
    try {
      const resp = await fetch("/api/gemini/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: brainstormPrompt || "Develop an interesting aesthetic detail.",
          type: brainstormType,
          currentContext: `Title: ${story.title}. Genre: ${story.genre}. Summary: ${story.summary}`,
        }),
      });

      if (!resp.ok) {
        throw new Error("Gemini brainwave blocked.");
      }

      const data = await resp.json();
      setBrainstormResult(data.text || "No insights found.");
    } catch (e: any) {
      setBrainstormResult(`Trouble calling Gemini: ${e.message}`);
    } finally {
      setBrainstormLoading(false);
    }
  };

  // Helper action: Insert character snippet
  const handleInsertCharacterSnippet = (char: Character) => {
    const snippet = `\n\n[Character Introduction: ${char.name}, the ${char.archetype}. Physical features: ${char.physicalAppearance}. Quirk: ${char.quirksAndHabits}.]`;
    const nextContent = activeCh.content + snippet;
    setStory((prev) => {
      const nextChapters = prev.chapters.map((ch) =>
        ch.id === activeChapterId ? { ...ch, content: nextContent } : ch
      );
      return {
        ...prev,
        manuscript: nextContent,
        chapters: nextChapters,
      };
    });
    showNotification(`Introduced ${char.name} timeline.`);
    setSelectedMainTab("canvas");
  };

  // Add character to Bible
  const handleAddCharacter = (newChar: Character) => {
    setStory((prev) => ({
      ...prev,
      characters: [newChar, ...prev.characters],
    }));
    showNotification(`${newChar.name} added!`);
  };

  // Delete character from Bible
  const handleDeleteCharacter = (charId: string) => {
    setStory((prev) => {
      const charToDelete = prev.characters.find(c => c.id === charId);
      const name = charToDelete ? charToDelete.name : "Character";
      const updated = prev.characters.filter((c) => c.id !== charId);
      setTimeout(() => showNotification(`${name} removed.`), 50);
      return {
        ...prev,
        characters: updated,
      };
    });
  };

  // Active state handlers for story data
  const handleAddOutlineItem = () => {
    const newItem: OutlineItem = {
      id: "out-self-" + Date.now(),
      title: "New Narrative Beat",
      notes: "Edit this beat info in the sidebar.",
      isCompleted: false,
    };
    setStory((prev) => ({
      ...prev,
      outline: [...prev.outline, newItem],
    }));
  };

  const toggleOutlineItem = (itemId: string) => {
    setStory((prev) => ({
      ...prev,
      outline: prev.outline.map((item) =>
        item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
      ),
    }));
  };

  const removeOutlineItem = (itemId: string) => {
    setStory((prev) => ({
      ...prev,
      outline: prev.outline.filter((item) => item.id !== itemId),
    }));
  };

  const handleUpdateOutlineNotes = (itemId: string, newNotes: string) => {
    setStory((prev) => ({
      ...prev,
      outline: prev.outline.map((item) =>
        item.id === itemId ? { ...item, notes: newNotes } : item
      ),
    }));
  };

  const handleUpdateOutlineTitle = (itemId: string, newTitle: string) => {
    setStory((prev) => ({
      ...prev,
      outline: prev.outline.map((item) =>
        item.id === itemId ? { ...item, title: newTitle } : item
      ),
    }));
  };

  // Capture Text Highlight & Mouse Coordinates
  const handleTextareaMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end).trim();

    // Only reveal the floating menu if the user actually highlighted real text
    if (selectedText.length > 0) {
      setSelectionData({ start, end, text: selectedText });
      setHighlightedText(selectedText);
      
      // Position the menu slightly above where the user released their mouse click
      setMenuCoords({
        x: e.clientX,
        y: e.clientY - 55 // Offset upward to float neatly above selection
      });
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  };

  // Close the menu if the user clicks anywhere else
  useEffect(() => {
    const closeMenu = () => setShowMenu(false);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // Highlight selection catcher from manuscript text area
  const checkSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const selection = target.value.substring(target.selectionStart, target.selectionEnd);
    if (selection && selection.trim().length > 3) {
      setHighlightedText(selection);
      setSelectionData({
        start: target.selectionStart,
        end: target.selectionEnd,
        text: selection
      });
    } else {
      setShowMenu(false);
    }
  };

  // --- Trigger Selection Transform ---
  const handleTransform = async (mode: 'show' | 'dialogue' | 'action') => {
    if (isGenerating || !selectionData.text) return;

    // TIME MACHINE: Snapshot current draft before inline selection style transforms
    setLastSnapshot({ chapterId: activeChapterId, content: activeCh.content });

    setShowMenu(false);
    setIsGenerating(true);
    showNotification(`Gemini is transforming prose with target style: "${mode}"...`);

    // Map button choice to specific, specialized AI editing personas
    let contextInstructions = "";
    if (mode === 'show') {
      contextInstructions = "Rewrite this scene using visceral sensory details (sight, sound, physical feelings). Show, don't tell. Keep the length roughly equivalent.";
    } else if (mode === 'dialogue') {
      contextInstructions = "Polish this dialogue to make it sound incredibly natural, sharp, and full of subtext or personality. Retain the core meaning.";
    } else if (mode === 'action') {
      contextInstructions = "Hype up the pacing. Rewrite this text using shorter sentences, punchy verbs, and rapid progression to maximize tension.";
    }

    try {
      const activeLoreContext = compileLoreContext(selectionData.text);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: selectionData.text,
          context: contextInstructions + activeLoreContext
        }),
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();
      const transformedText = data.text || selectionData.text;

      // Splice the transformed text right into the middle of the document
      const updatedContent = 
        activeCh.content.substring(0, selectionData.start) + 
        transformedText + 
        activeCh.content.substring(selectionData.end);

      setStory((prev) => {
        const nextChapters = prev.chapters.map((ch) =>
          ch.id === activeChapterId ? { ...ch, content: updatedContent } : ch
        );
        return {
          ...prev,
          manuscript: updatedContent,
          chapters: nextChapters,
          lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      });

      showNotification("Surgically fused improved prose.");

      // Return focus to textarea and reset
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          setSelectionData({ start: 0, end: 0, text: "" });
          setHighlightedText("");
        }
      }, 50);

    } catch (error) {
      console.error("Transformation pipeline failed:", error);
      showNotification("Transformation failed. Please verify credentials.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="ai-story-writer-app" className={`min-h-screen bg-[#f5f5f0] text-[#33332d] font-sans flex flex-col justify-between overflow-x-hidden transition-all ${focusMode ? "pt-0" : ""}`}>
      
      {/* Global CSS Overrides for Scrollbars and Animations */}
      <style>{`
        /* Custom Minimalist Scrollbars */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #141414;
        }
        ::-webkit-scrollbar-thumb {
          background: #3a3a3c;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #48484a;
        }

        /* Prevent sidebar text from awkwardly wrapping or snapping during collapse animation */
        .sidebar-content-wrapper {
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.15s ease-in-out;
        }
        aside:not(.w-0) .sidebar-content-wrapper {
          opacity: 1;
          white-space: normal;
        }
      `}</style>

      {/* ⚠️ Notifications Toast Panel */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map((note, idx) => (
          <div
            key={idx}
            className="bg-[#5A5A40] text-white px-4 py-2.5 rounded-xl border border-[#ecece4] text-xs font-sans shadow-lg flex items-center gap-2 animate-fade-in-down"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#a3b18a]" />
            <span>{note}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      {!focusMode && (
        <header className="flex items-center justify-between h-16 px-4 md:px-8 border-b border-[#e5e5df] bg-[#fcfcf9]">
          <div className="flex items-center gap-3">
            <div className="w-8.5 h-8.5 bg-[#5A5A40] rounded-xl flex items-center justify-center text-white shadow-inner">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-display font-bold text-sm tracking-wider uppercase text-[#5A5A40]">
                Gemini Muse
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] bg-[#efeee8] text-[#5A5A40] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest">
                Literary Studio
              </span>
            </div>
          </div>

          {/* NavigationTabs */}
          <nav className="flex gap-1 bg-[#ecece4] p-1 rounded-xl">
            <button
              onClick={() => setSelectedMainTab("canvas")}
              className={`px-4 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors cursor-pointer ${
                selectedMainTab === "canvas" ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#88887e] hover:text-[#33332d]"
              }`}
            >
              Writing Canvas
            </button>
            <button
              onClick={() => setSelectedMainTab("incubate")}
              className={`px-4 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors cursor-pointer ${
                selectedMainTab === "incubate" ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#88887e] hover:text-[#33332d]"
              }`}
            >
              Incubate Ideas
            </button>
            <button
              onClick={() => setSelectedMainTab("world")}
              className={`px-4 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors cursor-pointer ${
                selectedMainTab === "world" ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#88887e] hover:text-[#33332d]"
              }`}
            >
              World Forge
            </button>
            <button
              onClick={() => setSelectedMainTab("characters")}
              className={`px-4 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors cursor-pointer ${
                selectedMainTab === "characters" ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#88887e] hover:text-[#33332d]"
              }`}
            >
              Character Bible
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-[11px] font-sans text-[#88887e] italic hidden md:inline">
              Saved at {story.lastSavedAt || "now"}
            </span>
            <button
              onClick={() => showNotification("Chapter persisted locally!")}
              className="px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-sans text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Work
            </button>
          </div>
        </header>
      )}

      {/* Main Container */}
      <div className={`flex flex-col lg:flex-row flex-1 overflow-hidden h-[calc(100vh-6rem)] ${focusMode ? "h-screen" : ""}`}>
        
        {/* VIEW 1: ACTIVE WRITING CANVAS */}
        {selectedMainTab === "canvas" && (
          <>
            {/* Left Sidebar: Chapters list, Settings, Outlines, Beats */}
            <aside className={`h-full border-r border-[#e5e5df] bg-[#f9f9f5] flex flex-col shrink-0 overflow-y-auto transition-all duration-300 ease-in-out ${isLeftOpen ? 'w-full lg:w-64 p-4' : 'w-0 opacity-0 pointer-events-none p-0 overflow-hidden border-none'}`}>
              <div className="sidebar-content-wrapper flex-1 flex flex-col h-full min-w-[224px]">
              
              {/* Chapters List (Multi-Chapter Navigation) */}
              <div className="mb-6 bg-white p-4 rounded-xl border border-[#efeee8] shadow-sm">
                <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-[#e5e5df]">
                  <h3 className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">
                    Chapters
                  </h3>
                  <button
                    onClick={handleAddNewChapter}
                    className="p-1 text-[#5A5A40] hover:bg-[#efeee8] rounded transition-colors flex items-center justify-center cursor-pointer"
                    title="Create New Chapter"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                   {story.chapters.map((ch) => {
                    const chPacingVal = ch.analytics?.pacingValue;
                    const chOverallScore = ch.analytics?.overallScore;
                    return (
                      <li
                        key={ch.id}
                        onClick={() => handleSelectChapter(ch.id)}
                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-sans transition-all duration-150 ${
                          ch.id === activeChapterId
                            ? "bg-[#5A5A40] text-white shadow-sm font-medium"
                            : "text-[#555] hover:bg-[#efeee8] hover:text-[#111]"
                        }`}
                      >
                        <div className="flex-1 truncate pr-1 flex flex-col min-w-0">
                          <span className="truncate">📝 {ch.title}</span>
                          {(chOverallScore !== undefined || chPacingVal !== undefined) && (
                            <span className={`text-[9px] font-mono leading-tight mt-0.5 ${ch.id === activeChapterId ? "text-white/80" : "text-[#88887e]"}`}>
                              {chOverallScore !== undefined ? `Score: ${chOverallScore}%` : ""}
                              {chPacingVal !== undefined ? ` • Pacing: ${chPacingVal}/5` : ""}
                            </span>
                          )}
                        </div>
                        {story.chapters.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteChapter(ch.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 text-red-500 transition-opacity ml-1 shrink-0"
                            title="Delete Chapter"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="text-[9px] text-[#88887e] italic text-center mt-2 font-mono">
                  Ctrl + B to collapse
                </div>
              </div>

              {/* Story properties */}
              <div className="mb-5 bg-white p-4 rounded-xl border border-[#efeee8] shadow-sm">
                <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#a1a19a] mb-3">
                  Chronicle Meta
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[8px] font-sans font-bold uppercase tracking-wider text-[#88887e] mb-1">Title</label>
                    <input
                      type="text"
                      value={story.title}
                      onChange={(e) => setStory({ ...story, title: e.target.value })}
                      className="w-full text-xs font-sans p-1.5 bg-[#fcfcf9] border border-[#d5d5cd] rounded text-[#33332d] focus:outline-none focus:border-[#5A5A40]"
                    />
                  </div>

                  <div>
                    <label className="block text-[8px] font-sans font-bold uppercase tracking-wider text-[#88887e] mb-1">Synopsis</label>
                    <textarea
                      value={story.summary}
                      onChange={(e) => setStory({ ...story, summary: e.target.value })}
                      rows={2}
                      className="w-full text-xs font-sans p-1.5 bg-[#fcfcf9] border border-[#d5d5cd] rounded text-[#33332d] focus:outline-none focus:border-[#5A5A40] leading-relaxed resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-sans font-bold uppercase tracking-wider text-[#88887e] mb-1">Genre</label>
                      <select
                        value={story.genre}
                        onChange={(e) => setStory({ ...story, genre: e.target.value })}
                        className="w-full text-[10px] font-sans p-1 bg-[#fcfcf9] border border-[#d5d5cd] rounded text-[#33332d] focus:outline-none"
                      >
                        {GENRES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-sans font-bold uppercase tracking-wider text-[#88887e] mb-1">Tone</label>
                      <select
                        value={story.tone}
                        onChange={(e) => setStory({ ...story, tone: e.target.value })}
                        className="w-full text-[10px] font-sans p-1 bg-[#fcfcf9] border border-[#d5d5cd] rounded text-[#33332d] focus:outline-none"
                      >
                        {TONES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Left tab selectors */}
              <div className="flex border-b border-[#e5e5df] mb-4 gap-1">
                <button
                  onClick={() => setLeftSidebarTab("structure")}
                  className={`flex-1 pb-1.5 text-center font-sans text-[10px] uppercase font-bold tracking-wider cursor-pointer border-b ${
                    leftSidebarTab === "structure" ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#a1a19a]"
                  }`}
                >
                  Beats & Cast
                </button>
                <button
                  onClick={() => setLeftSidebarTab("outline")}
                  className={`flex-1 pb-1.5 text-center font-sans text-[10px] uppercase font-bold tracking-wider cursor-pointer border-b ${
                    leftSidebarTab === "outline" ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#a1a19a]"
                  }`}
                >
                  Acts ({story.outline.filter(o => !o.isCompleted).length})
                </button>
                <button
                  onClick={() => setLeftSidebarTab("lore")}
                  className={`flex-1 pb-1.5 text-center font-sans text-[10px] uppercase font-bold tracking-wider cursor-pointer border-b ${
                    leftSidebarTab === "lore" ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#a1a19a]"
                  }`}
                >
                  Codex ({loreBook.length})
                </button>
              </div>

              {/* Left sidebar widgets */}
              {leftSidebarTab === "structure" && (
                <div className="space-y-4">
                  {/* Character Bible mini index */}
                  <div className="bg-[#ecece4]/60 p-3.5 rounded-xl border border-[#dcdcd4]">
                    <h4 className="font-sans text-[9px] font-bold uppercase tracking-wider mb-2.5 text-[#5A5A40]">
                      Cast references ({story.characters.length})
                    </h4>
                    {story.characters.length > 0 ? (
                      <div className="space-y-2">
                        {story.characters.map((char) => (
                          <div
                            key={char.id}
                            onClick={() => handleInsertCharacterSnippet(char)}
                            className="group flex items-center justify-between p-1 px-2 rounded bg-white hover:bg-[#5A5A40]/10 border border-[#efeee8] cursor-pointer transition-colors"
                            title="Click to place character description into draft"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#a3b18a]" />
                              <span className="text-xs text-[#33332d] group-hover:text-[#5A5A40] font-sans font-medium truncate max-w-[140px]">
                                {char.name}
                              </span>
                            </div>
                            <span className="text-[8px] font-mono text-[#a1a19a] opacity-0 group-hover:opacity-100 transition-opacity">
                              Introduces
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#88887e] italic leading-relaxed">
                        No actors generated yet. Go to Character Bible tab to summon them.
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-[#fcfcf9] rounded-xl border border-[#efeee8]">
                    <h4 className="font-sans text-[9px] font-bold uppercase tracking-wider text-[#a1a19a] mb-1">
                      How to revise
                    </h4>
                    <p className="text-[10px] text-[#88887e] leading-relaxed">
                      Input or write your chapter in the center, highlight any text, and choose a refinement vector inside the Assistant tab.
                    </p>
                  </div>
                </div>
              )}

              {leftSidebarTab === "outline" && (
                <div className="space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    {story.outline.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border text-xs flex flex-col justify-between gap-1.5 transition-all ${
                          item.isCompleted
                            ? "bg-[#ecece4]/50 border-[#dcdcd4]/60 opacity-60"
                            : "bg-white border-[#e5e5df] shadow-xs"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={() => toggleOutlineItem(item.id)}
                            className="mt-0.5 rounded accent-[#5A5A40]"
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateOutlineTitle(item.id, e.target.value)}
                              className="font-sans font-semibold text-xs text-[#33332d] w-full bg-transparent border-b border-transparent hover:border-[#ecece4] focus:outline-none focus:border-[#5A5A40]"
                            />
                            <textarea
                              value={item.notes}
                              onChange={(e) => handleUpdateOutlineNotes(item.id, e.target.value)}
                              rows={2}
                              className="text-[11px] text-[#88887e] w-full bg-transparent border-none focus:outline-none leading-relaxed mt-1 resize-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pr-0.5">
                          <button
                            onClick={() => removeOutlineItem(item.id)}
                            className="text-red-500 hover:text-red-700 opacity-60 hover:opacity-100 transition-opacity"
                            title="Delete Beat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={handleAddOutlineItem}
                      className="w-full py-2 border border-dashed border-[#d5d5cd] rounded-lg text-xs font-sans text-[#5A5A40] hover:bg-[#efeee8] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Append Outline Beat
                    </button>
                  </div>

                  <div className="p-3 bg-white border border-[#efeee8] rounded-xl">
                    <h4 className="font-sans text-[8px] font-bold text-[#5A5A40] uppercase tracking-wider mb-1">
                      Timeline Progress
                    </h4>
                    <div className="w-full bg-[#ecece4] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#5A5A40] h-full transition-all duration-500"
                        style={{
                          width: `${
                            story.outline.length > 0
                              ? (story.outline.filter((o) => o.isCompleted).length / story.outline.length) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {leftSidebarTab === "lore" && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider mb-2.5 text-[#5A5A40]">
                      World Lore Codex ({loreBook.length})
                    </h4>
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {loreBook.length > 0 ? (
                        loreBook.map((item) => (
                          <div key={item.id} className="p-2.5 rounded-lg bg-white border border-[#e5e5df] relative group shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleRemoveLore(item.id)}
                              className="absolute top-1 right-2 w-4 h-4 rounded-full bg-[#f3f4f6] text-[#cc3333] hover:bg-red-100 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
                              title="Delete Entry"
                            >
                              &times;
                            </button>
                            <span className="font-bold text-xs text-[#33332d] block">{item.keyword}</span>
                            <p className="text-[10px] text-[#88887e] mt-1 leading-relaxed">{item.description}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-[#88887e] italic leading-relaxed">
                          Your Lore Codex is currently empty. Define characters, artifacts, or rules below to inject context automatically.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Add Lore Entry Form */}
                  <form onSubmit={handleAddLore} className="bg-[#ecece4]/40 p-3.5 rounded-xl border border-[#dcdcd4]/60 space-y-2.5 mt-2 flex-shrink-0">
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#5A5A40] block">
                      Add New Codex Entry
                    </span>
                    <div>
                      <input
                        type="text"
                        placeholder="Keyword (e.g. Arthur, timepiece)"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        className="w-full text-xs font-sans p-2 bg-[#fcfcf9] border border-[#d5d5cd] rounded-lg text-[#33332d] focus:outline-none focus:border-[#5A5A40] placeholder-[#a1a19a]"
                        required
                      />
                    </div>
                    <div>
                      <textarea
                        placeholder="Lore rules, traits, or characteristics..."
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="w-full text-xs font-sans p-2 h-16 bg-[#fcfcf9] border border-[#d5d5cd] rounded-lg text-[#33332d] focus:outline-none focus:border-[#5A5A40] placeholder-[#a1a19a] resize-none"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[#5A5A40] hover:bg-[#4a4a33] text-white text-[10px] uppercase font-bold tracking-wider py-2 px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Save to Codex
                    </button>
                  </form>
                </div>
              )}
              </div>
            </aside>

            {/* Middle Module: Story writing sheet */}
            <main className="flex-1 bg-white p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
              <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-4 mb-4 border-b border-[#efeee8] pb-4">
                  <button
                    onClick={() => setIsLeftOpen(!isLeftOpen)}
                    className="p-1 md:p-1.5 px-3 bg-white hover:bg-[#efeee8] border border-[#d5d5cd] rounded-lg text-xs font-sans text-[#5A5A40] flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Toggle chapters on/off (Ctrl + B)"
                  >
                    {isLeftOpen ? "📂 Close" : "📁 Chapters"}
                  </button>

                  <div className="flex-1">
                    <span className="font-sans text-[10px] text-[#88887e] tracking-widest uppercase block mb-1">
                      Manuscript Drafting Box
                    </span>
                    <input
                      type="text"
                      value={activeCh.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setStory((prev) => ({
                          ...prev,
                          chapters: prev.chapters.map((ch) =>
                            ch.id === activeChapterId ? { ...ch, title: newTitle } : ch
                          ),
                        }));
                      }}
                      className="text-xl sm:text-2xl font-display font-medium text-[#1a1a15] bg-transparent border-b border-transparent hover:border-[#e5e5df] focus:outline-none focus:border-[#5A5A40] w-full font-semibold max-w-lg italic"
                      placeholder="Chapter Title"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setFocusMode(!focusMode)}
                      className="p-1 px-2.5 border border-[#ecece4] text-[#88887e] hover:bg-[#efeee8] hover:text-[#33332d] text-xs font-sans flex items-center gap-1 transition-all"
                      title="Toggle distraction-free writing"
                    >
                      <Maximize className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                      onClick={() => setIsRightOpen(!isRightOpen)}
                      className="p-1 md:p-1.5 px-3 bg-white hover:bg-[#efeee8] border border-[#d5d5cd] rounded-lg text-xs font-sans text-[#5A5A40] flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Toggle Gemini helper (Ctrl + J)"
                    >
                      {isRightOpen ? "🤖 Close AI" : "🤖 Ask Gemini"}
                    </button>
                  </div>
                     {/* Main draft Area */}
                <div className="flex-1 flex flex-col min-h-[350px] relative">
                  {/* TIME MACHINE BANNER NOTIFICATION (Option 4) */}
                  {lastSnapshot.content && lastSnapshot.chapterId === activeChapterId && (
                    <div className="bg-[#FFFDF4] border border-[#F5E1A4] rounded-xl p-3.5 mb-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs animate-fadeIn shadow-sm gap-3">
                      <div className="flex items-center gap-2 text-[#855D15]">
                        <Sparkle className="w-4 h-4 text-[#C19A2E] animate-pulse shrink-0" />
                        <span>
                          <strong>AI Time Machine:</strong> An AI co-writing update was applied. If it shifted your style or tone, you can instantly roll back, keeping your voice pristine.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={handleUndoAiAction}
                          className="px-3 py-1.5 bg-[#855D15] hover:bg-[#6D4B10] text-[#FFFDF4] font-semibold rounded-lg shadow-xs hover:shadow-sm cursor-pointer transition-colors"
                        >
                          ↩️ Revert to Human Draft
                        </button>
                        <button
                          onClick={() => setLastSnapshot({ chapterId: null, content: null })}
                          className="px-2.5 py-1.5 hover:bg-[#EFECE3] border border-[#DCDAD2] text-[#88887e] hover:text-[#33332d] font-medium rounded-lg cursor-pointer transition-colors"
                        >
                          Keep
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Quick select highlights banner */}
                  {highlightedText && (
                    <div className="bg-[#ecece4] px-4 py-2.5 rounded-xl border border-[#dcdcd4] flex items-center justify-between text-xs mb-3 animate-pulse">
                      <div className="flex items-center gap-1.5 text-[#5A5A40]">
                        <Sparkle className="w-4 h-4" />
                        <span>Highlighted Segment Ready for Style Enhancements!</span>
                      </div>
                      <button
                        onClick={() => {
                          setHighlightedText("");
                          showNotification("Highlight cleared.");
                        }}
                        className="text-[10px] text-[#88887e] hover:text-[#33332d] underline uppercase"
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
 
                  <label htmlFor="chapter-textarea" className="sr-only">Manuscript Story Text</label>
                  <textarea
                    ref={textareaRef}
                    id="chapter-textarea"
                    value={activeCh.content}
                    onChange={(e) => handleTextChange(e.target.value)}
                    onMouseUp={handleTextareaMouseUp}
                    onKeyUp={checkSelection}
                    disabled={isGenerating}
                    placeholder="Inscribe your chapter prose here. Press Ctrl + Space to let Gemini co-write..."
                    className="w-full flex-1 font-serif text-[15px] leading-relaxed text-[#33332d] bg-transparent border-none placeholder-[#a1a19a] focus:ring-0 focus:outline-none resize-none pt-2 transition-opacity duration-200"
                    style={{ opacity: isGenerating ? 0.65 : 1 }}
                  />

                  {/* FLOATING TRANSFORMATION CONTEXT MENU */}
                  {showMenu && (
                    <div 
                      className="fixed flex bg-[#2c2c2e]/95 backdrop-blur-sm border border-[#48484a] rounded-full p-1 shadow-2xl z-50 transform -translate-x-1/2 gap-1 items-center"
                      style={{ left: `${menuCoords.x}px`, top: `${menuCoords.y}px` }}
                      onMouseDown={(e) => e.stopPropagation()} // Prevents text defocus when clicking buttons
                    >
                      <button 
                        onClick={() => handleTransform('show')}
                        className="bg-transparent border-none text-white hover:bg-[#3a3a3c] transition-colors rounded-full px-3 py-1 text-[11px] font-sans font-medium cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        ⚡ Show, Don't Tell
                      </button>
                      <div className="w-px h-3 bg-[#48484a]" />
                      <button 
                        onClick={() => handleTransform('dialogue')}
                        className="bg-transparent border-none text-white hover:bg-[#3a3a3c] transition-colors rounded-full px-3 py-1 text-[11px] font-sans font-medium cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        💬 Polish Dialogue
                      </button>
                      <div className="w-px h-3 bg-[#48484a]" />
                      <button 
                        onClick={() => handleTransform('action')}
                        className="bg-transparent border-none text-white hover:bg-[#3a3a3c] transition-colors rounded-full px-3 py-1 text-[11px] font-sans font-medium cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        🏃‍♂️ Speed Up Pace
                      </button>
                    </div>
                  )}

                  {/* Subtle Floating Status Indicator */}
                  {isGenerating && (
                    <div className="absolute bottom-4 right-4 bg-[#5A5A40] text-white px-4 py-2 rounded-full text-xs font-sans shadow-lg flex items-center gap-2 animate-pulse border border-[#ecece4]">
                      <Sparkles className="w-3.5 h-3.5 text-[#a3b18a] animate-spin" />
                      <span>Gemini is composing...</span>
                    </div>
                  )}
                </div>             </div>

                {/* Continue/Expand continuous interface */}
                <div className="mt-8 pt-6 border-t border-[#efeee8]">
                  <div className="bg-[#fcfcf9] p-4 rounded-xl border border-[#e5e5df]">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Sparkles className="w-4 h-4 text-[#5A5A40]" />
                      <span className="font-sans font-bold text-[10px] uppercase tracking-wider text-[#5A5A40]">
                        Co-Write Future Threads
                      </span>
                    </div>
                    <p className="text-[11px] text-[#88887e] leading-relaxed mb-3">
                      Provide instructions for what happens next in the timeline. Gemini reads the active manuscript, matching tone, pacing, and vocabulary to seamlessly construct the next prose paragraphs.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={expansionInstruction}
                        onChange={(e) => setExpansionInstruction(e.target.value)}
                        placeholder="E.g. Valerie flips her copper coin and warns Arthur about Kaelen's secret forces..."
                        className="flex-1 text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] focus:outline-none focus:border-[#5A5A40]"
                      />
                      <button
                        onClick={handleContinuousWrite}
                        disabled={expandingActive}
                        className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] disabled:bg-[#a1a19a] text-white font-sans text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {expandingActive ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Weaving...
                          </>
                        ) : (
                          <>
                            Write Next Passage <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </main>

            {/* Right Sidebar: Side Editorial & Co-writer Panel */}
            <aside className={`h-full border-l border-[#e5e5df] bg-[#f9f9f5] flex flex-col shrink-0 overflow-y-auto transition-all duration-300 ease-in-out ${isRightOpen ? 'w-full lg:w-80 p-4' : 'w-0 opacity-0 pointer-events-none p-0 overflow-hidden border-none'}`}>
              <div className="sidebar-content-wrapper flex-1 flex flex-col h-full min-w-[288px]">
                {/* Lore Engine Status Info */}
                <div className="bg-[#ecece4]/60 p-3 rounded-xl border border-[#dcdcd4] text-xs mb-4 shrink-0">
                  <div className="flex items-center gap-1.5 font-sans font-bold text-[#5A5A40] mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
                    <span>Lore Engine Active</span>
                  </div>
                  <p className="text-[10px] text-[#88887e] leading-relaxed">
                    Type a matching keyword from your <strong>Codex</strong> (such as <strong>Arthur</strong> or <strong>Valerie</strong>) in the draft, then press <kbd className="bg-white px-1 border border-gray-300 rounded font-mono text-[9px] text-[#33332d]">Ctrl + Space</kbd> to co-write or highlight prose. The matching profiles will automatically be appended as critical constraints to protect character and world continuity!
                  </p>
                </div>

                {/* Panel Selector tabs */}
                <div className="flex border-b border-[#e5e5df] mb-4 pb-px text-[10px] shrink-0 gap-1">
                  <button
                    onClick={() => setRightPanelTab("refine")}
                    className={`flex-1 pb-2 font-sans font-semibold text-center uppercase tracking-wider cursor-pointer border-b ${
                      rightPanelTab === "refine" ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#a1a19a]"
                    }`}
                  >
                    ✨ Style
                  </button>
                  <button
                    onClick={() => setRightPanelTab("chat")}
                    className={`flex-1 pb-2 font-sans font-semibold text-center uppercase tracking-wider cursor-pointer border-b ${
                      rightPanelTab === "chat" ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#a1a19a]"
                    }`}
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => setRightPanelTab("brainstorm")}
                    className={`flex-1 pb-2 font-sans font-semibold text-center uppercase tracking-wider cursor-pointer border-b ${
                      rightPanelTab === "brainstorm" ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#a1a19a]"
                    }`}
                  >
                    🧠 Sparks
                  </button>
                  <button
                    onClick={() => setRightPanelTab("analytics")}
                    className={`flex-1 pb-2 font-sans font-semibold text-center uppercase tracking-wider cursor-pointer border-b ${
                      rightPanelTab === "analytics" ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#a1a19a]"
                    }`}
                  >
                    📊 Editorial
                  </button>
                </div>

                <div className="flex-1 space-y-4">
                  {rightPanelTab === "refine" && (
                    <RefinementPanel
                      selectedText={highlightedText}
                      onApplyRefinedText={handleApplyRefine}
                      activeGenre={story.genre}
                    />
                  )}

                  {rightPanelTab === "chat" && (
                    <CoWriterChat
                      storyTitle={story.title}
                      storySummary={story.summary}
                    />
                  )}

                  {rightPanelTab === "brainstorm" && (
                    <div className="bg-[#fcfcf9] p-5 rounded-xl border border-[#e5e5df] space-y-3.5">
                      <h4 className="font-display font-semibold text-xs text-[#33332d] uppercase tracking-wider">
                        Brainstorm Studio
                      </h4>
                      <p className="text-[11px] text-[#88887e]">
                        Let Gemini brainstorm titles, surprise twists, or narrative outlines based on your story variables.
                      </p>

                      <div className="space-y-4">
                        <div className="flex gap-2 bg-[#ecece4] p-1 rounded-lg">
                          {[
                            { id: "twist", label: "Twists" },
                            { id: "title", label: "Titles" },
                            { id: "outline", label: "Skeleton" },
                          ].map((b) => (
                            <button
                              key={b.id}
                              onClick={() => {
                                setBrainstormType(b.id as any);
                                setBrainstormResult("");
                              }}
                              className={`flex-1 text-[10px] font-sans font-semibold py-1 rounded cursor-pointer text-center ${
                                brainstormType === b.id ? "bg-white text-[#5A5A40]" : "text-[#88887e]"
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>

                        <div>
                          <label className="block text-[8px] font-sans font-bold uppercase tracking-widest text-[#a1a19a] mb-1">
                            Focus Direction (Optional)
                          </label>
                          <input
                            type="text"
                            value={brainstormPrompt}
                            onChange={(e) => setBrainstormPrompt(e.target.value)}
                            placeholder={
                              brainstormType === "twist"
                                ? "E.g. Valerie reveals a dark lineage..."
                                : "E.g. Relentless, poetic focus..."
                            }
                            className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d]"
                          />
                        </div>

                        <button
                          onClick={triggerBrainstorm}
                          disabled={brainstormLoading}
                          className="w-full py-2 bg-[#5A5A40] text-white hover:bg-[#4a4a35] disabled:bg-[#a1a19a] rounded-lg font-sans text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          {brainstormLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Divining Sparks...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Ignite Brainstorm
                            </>
                          )}
                        </button>
                      </div>

                      {brainstormResult && (
                        <div className="mt-4 pt-3 border-t border-[#efeee8]">
                          <span className="text-[8px] font-sans font-bold text-[#5A5A40] uppercase tracking-widest block mb-1">
                            Gemini Spark Suggestions:
                          </span>
                          <div className="bg-white p-3.5 rounded-lg border border-[#efeee8] text-xs leading-relaxed text-[#44443d] whitespace-pre-line max-h-48 overflow-y-auto">
                            {brainstormResult}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {rightPanelTab === "analytics" && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="bg-[#fcfcf9] p-5 rounded-xl border border-[#e5e5df] space-y-4 shadow-sm animate-slideDown">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#5A5A40]" />
                          <h4 className="font-display font-medium text-xs text-[#33332d] uppercase tracking-wider">
                            Editorial Desk
                          </h4>
                        </div>
                        <p className="text-[11px] text-[#88887e] leading-relaxed">
                          Submit this chapter manuscript for a professional development edit. Gemini acts as an expert developmental editor to rate sensory ratios, pacing drag, and plot logic.
                        </p>

                        <button
                          onClick={handleAnalyzeChapter}
                          disabled={isAnalyzing || !activeCh.content.trim()}
                          className="w-full py-2.5 bg-[#5A5A40] text-white hover:bg-[#4a4a35] disabled:bg-[#a1a19a] rounded-lg font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {isAnalyzing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Reviewing Manuscript...
                            </>
                          ) : (
                            <>
                              <BarChart2 className="w-3.5 h-3.5" /> Run Chapter Analytics
                            </>
                          )}
                        </button>
                      </div>

                      <div className="space-y-3">
                        {analyticsResult ? (
                          <>
                            {analyticsResult.overallScore !== undefined && (
                              <div className="bg-[#fbfbf9] border border-[#e5e5df] rounded-xl p-4 shadow-xs text-center space-y-3 animate-fade-in">
                                <div className="font-sans font-bold text-[9px] text-[#5A5A40] uppercase tracking-widest block">
                                  ✒️ Overall Quality Grade
                                </div>
                                <div className="flex justify-center items-center gap-4">
                                  <div className="relative flex items-center justify-center shrink-0">
                                    <svg className="w-14 h-14 transform -rotate-90">
                                      <circle
                                        cx="28"
                                        cy="28"
                                        r="24"
                                        className="stroke-current text-gray-200 fill-none"
                                        strokeWidth="4.5"
                                      />
                                      <circle
                                        cx="28"
                                        cy="28"
                                        r="24"
                                        className={`stroke-current ${analyticsResult.overallScore >= 80 ? "text-emerald-600" : analyticsResult.overallScore >= 60 ? "text-amber-500" : "text-rose-500"} fill-none`}
                                        strokeWidth="4.5"
                                        strokeDasharray={150.8}
                                        strokeDashoffset={150.8 - (150.8 * analyticsResult.overallScore) / 100}
                                        strokeLinecap="round"
                                        style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                                      />
                                    </svg>
                                    <div className="absolute text-center flex flex-col items-center justify-center">
                                      <span className="font-display font-black text-xs text-[#1a1a15]">
                                        {(analyticsResult.overallScore / 10).toFixed(1)}
                                      </span>
                                      <span className="text-[8px] text-[#7c7c72] leading-none">/10</span>
                                    </div>
                                  </div>
                                  <div className="text-left space-y-0.5">
                                    <div className="text-sm font-display font-extrabold text-[#1a1a15]">
                                      {analyticsResult.overallScore}% Quality Index
                                    </div>
                                    <p className="text-[9.5px] text-[#7c7c72] leading-snug">
                                      Expert score based on sensory depth, pacing velocity, and alignment.
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#f0efe9]">
                                  <div className="text-center">
                                    <span className="text-[8px] text-[#7c7c72] uppercase font-bold block tracking-tight">Sensory</span>
                                    <span className="text-[11px] font-mono font-bold text-[#33332d]">
                                      {analyticsResult.sensoryScore !== undefined ? `${analyticsResult.sensoryScore}%` : "—"}
                                    </span>
                                  </div>
                                  <div className="border-x border-[#f0efe9] text-center">
                                    <span className="text-[8px] text-[#7c7c72] uppercase font-bold block tracking-tight">Pacing</span>
                                    <span className="text-[11px] font-mono font-bold text-[#33332d]">
                                      {analyticsResult.pacingScore !== undefined ? `${analyticsResult.pacingScore}%` : "—"}
                                    </span>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-[8px] text-[#7c7c72] uppercase font-bold block tracking-tight">Beta</span>
                                    <span className="text-[11px] font-mono font-bold text-[#33332d]">
                                      {analyticsResult.betaScore !== undefined ? `${analyticsResult.betaScore}%` : "—"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="bg-[#fcfcf9] border border-[#e5e5df] rounded-xl p-4 shadow-xs">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <h5 className="flex items-center gap-1.5 font-sans font-bold text-[10px] text-[#5A5A40] uppercase tracking-wider">
                                  👃 Sensory Balance Check
                                </h5>
                                {analyticsResult.sensoryScore !== undefined && (
                                  <div className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-extrabold ${analyticsResult.sensoryScore >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-100" : analyticsResult.sensoryScore >= 60 ? "text-amber-700 bg-amber-50 border-amber-100" : "text-rose-700 bg-rose-50 border-rose-100"}`}>
                                    {(analyticsResult.sensoryScore / 10).toFixed(1)}/10 ({analyticsResult.sensoryScore}%)
                                  </div>
                                )}
                              </div>
                              {analyticsResult.sensoryScore !== undefined && (
                                <div className="w-full bg-[#f0efe9] h-1 rounded-full overflow-hidden mb-3">
                                  <div className={`h-full ${analyticsResult.sensoryScore >= 80 ? "bg-emerald-600" : analyticsResult.sensoryScore >= 60 ? "bg-amber-500" : "bg-rose-500"} transition-all duration-500`} style={{ width: `${analyticsResult.sensoryScore}%` }}></div>
                                </div>
                              )}
                              <p className="text-xs text-[#44443d] leading-relaxed whitespace-pre-line bg-white p-3 rounded-lg border border-[#efeee8]">
                                {analyticsResult.sensory}
                              </p>
                            </div>

                            <div className="bg-[#fcfcf9] border border-[#e5e5df] rounded-xl p-4 shadow-xs space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <h5 className="flex items-center gap-1.5 font-sans font-bold text-[10px] text-[#5A5A40] uppercase tracking-wider">
                                  ⏱️ Pacing Report
                                </h5>
                                {analyticsResult.pacingScore !== undefined && (
                                  <div className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-extrabold ${analyticsResult.pacingScore >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-100" : analyticsResult.pacingScore >= 60 ? "text-amber-700 bg-amber-50 border-amber-100" : "text-rose-700 bg-rose-50 border-rose-100"}`}>
                                    {(analyticsResult.pacingScore / 10).toFixed(1)}/10 ({analyticsResult.pacingScore}%)
                                  </div>
                                )}
                              </div>
                              {analyticsResult.pacingScore !== undefined && (
                                <div className="w-full bg-[#f0efe9] h-1 rounded-full overflow-hidden">
                                  <div className={`h-full ${analyticsResult.pacingScore >= 80 ? "bg-emerald-600" : analyticsResult.pacingScore >= 60 ? "bg-amber-500" : "bg-rose-500"} transition-all duration-500`} style={{ width: `${analyticsResult.pacingScore}%` }}></div>
                                </div>
                              )}

                              {analyticsResult.pacingCategory && (
                                <div className="bg-white p-3 rounded-lg border border-[#efeee8] flex flex-col gap-2">
                                  <div className="flex items-center justify-between text-xs font-sans">
                                    <span className="text-[#88887e] font-medium">Narrative Velocity:</span>
                                    <span className="font-mono font-bold text-[#5A5A40] flex items-center gap-1">
                                      ⚡ {analyticsResult.pacingCategory} ({analyticsResult.pacingValue}/5)
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-5 gap-1 pt-1">
                                    {[1, 2, 3, 4, 5].map((val) => {
                                      const labelMap: Record<number, string> = {
                                        1: "Static",
                                        2: "Slow",
                                        3: "Steady",
                                        4: "Engaging",
                                        5: "Intense"
                                      };
                                      const isActive = analyticsResult.pacingValue === val;
                                      return (
                                        <div key={val} className="text-center space-y-1">
                                          <div className={`h-1.5 rounded-full ${isActive ? "bg-[#5A5A40]" : "bg-gray-200"}`}></div>
                                          <span className={`text-[8px] block truncate tracking-tight font-sans ${isActive ? "font-bold text-[#5A5A40]" : "text-[#a1a19a]"}`}>{labelMap[val]}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              <p className="text-xs text-[#44443d] leading-relaxed whitespace-pre-line bg-white p-3 rounded-lg border border-[#efeee8]">
                                {analyticsResult.pacing}
                              </p>
                            </div>

                            <div className="bg-[#fcfcf9] border border-[#e5e5df] rounded-xl p-4 shadow-xs">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <h5 className="flex items-center gap-1.5 font-sans font-bold text-[10px] text-[#5A5A40] uppercase tracking-wider">
                                  🕵️ Beta Reader Critique
                                </h5>
                                {analyticsResult.betaScore !== undefined && (
                                  <div className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-extrabold ${analyticsResult.betaScore >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-100" : analyticsResult.betaScore >= 60 ? "text-amber-700 bg-amber-50 border-amber-100" : "text-rose-700 bg-rose-50 border-rose-100"}`}>
                                    {(analyticsResult.betaScore / 10).toFixed(1)}/10 ({analyticsResult.betaScore}%)
                                  </div>
                                )}
                              </div>
                              {analyticsResult.betaScore !== undefined && (
                                <div className="w-full bg-[#f0efe9] h-1 rounded-full overflow-hidden mb-3">
                                  <div className={`h-full ${analyticsResult.betaScore >= 80 ? "bg-emerald-600" : analyticsResult.betaScore >= 60 ? "bg-amber-500" : "bg-rose-500"} transition-all duration-500`} style={{ width: `${analyticsResult.betaScore}%` }}></div>
                                </div>
                              )}
                              <p className="text-xs text-[#44443d] leading-relaxed whitespace-pre-line bg-white p-3 rounded-lg border border-[#efeee8]">
                                {analyticsResult.beta}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="bg-white p-6 rounded-xl border border-[#e5e5df] text-center space-y-2">
                            <span className="text-2xl block">📊</span>
                            <span className="font-sans font-bold text-[10px] text-[#33332d] uppercase tracking-wider block">
                              Manuscript Analysis Staged
                            </span>
                            <p className="text-[10px] text-[#88887e] leading-relaxed">
                              Click the button above to have Gemini critique language layers, plot consistency, and pacing delivery.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </>
        )}

        {/* VIEW 2: STORY INCUBATION */}
        {selectedMainTab === "incubate" && (
          <div className="flex-1 bg-white p-6 md:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="border-b border-[#efeee8] pb-4 mb-4">
                <span className="font-sans text-[11px] text-[#88887e] tracking-widest uppercase block mb-1">
                  Idea Generation Suite
                </span>
                <h2 className="font-display font-medium text-2xl text-[#1a1a15] italic">
                  Cultivate Story Starters
                </h2>
              </div>
              <StoryStarterTab onUseStarter={handleUseStarter} />
            </div>
          </div>
        )}

        {/* VIEW 3: FICTIONAL WORLD FORGE */}
        {selectedMainTab === "world" && (
          <div className="flex-1 bg-white p-6 md:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="border-b border-[#efeee8] pb-4 mb-4">
                <span className="font-sans text-[11px] text-[#88887e] tracking-widest uppercase block mb-1">
                  Geography & Lore Forge
                </span>
                <h2 className="font-display font-medium text-2xl text-[#1a1a15] italic">
                  Generate Fictional Realms
                </h2>
              </div>
              <WorldBuilderTab />
            </div>
          </div>
        )}

        {/* VIEW 4: CHARACTER BIBLE */}
        {selectedMainTab === "characters" && (
          <div className="flex-1 bg-white p-6 md:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="border-b border-[#efeee8] pb-4 mb-4">
                <span className="font-sans text-[11px] text-[#88887e] tracking-widest uppercase block mb-1">
                  Cast & Protagonists
                </span>
                <h2 className="font-display font-medium text-2xl text-[#1a1a15] italic">
                  The Character Bible
                </h2>
              </div>
              <CharacterTab
                characters={story.characters}
                onAddCharacter={handleAddCharacter}
                onDeleteCharacter={handleDeleteCharacter}
                onSelectCharacterForCanvas={handleInsertCharacterSnippet}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <footer className="h-8 px-4 md:px-8 bg-[#fcfcf9] border-t border-[#e5e5df] flex items-center justify-between font-sans text-[10px] text-[#a1a19a] shrink-0">
        <div className="flex gap-4">
          <span>Words: <b>{wordCount.toLocaleString()}</b></span>
          <span>Characters: <b>{charCount.toLocaleString()}</b></span>
          <span>Read time: <b>{readingTime} min</b></span>
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Local Workspace Synced
          </span>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="font-bold text-[#5A5A40] hover:underline"
          >
            {focusMode ? "Quit Focus [Esc]" : "Focus Mode"}
          </button>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  // Triple-Tonal Workspace Palette
  workspaceContainer: { 
    display: 'flex', 
    width: '100vw', 
    height: '100vh', 
    backgroundColor: '#0a0a0a', // True pitch background drop
    color: '#e5e5ea', 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
    overflow: 'hidden' 
  },
  
  // Premium Cubic-Bezier Timing Sidebar
  sidebar: { 
    height: '100%', 
    // This cubic-bezier profile gives an elegant, accelerating snap outward
    transition: 'width 0.3s cubic-bezier(0.25, 1, 0.5, 1)', 
    overflow: 'hidden', 
    backgroundColor: '#141414', // Slightly elevated sidebar dark
    display: 'flex', 
    flexDirection: 'column' 
  },
  leftSidebar: { borderRight: '1px solid #222224' },
  rightSidebar: { borderLeft: '1px solid #222224' },
  
  sidebarContent: { 
    width: '100%', 
    height: '100%', 
    padding: '24px 20px', 
    boxSizing: 'border-box', 
    display: 'flex', 
    flexDirection: 'column', 
    minWidth: '240px' 
  },
  sidebarTitle: { margin: '0 0 16px 0', fontSize: '11px', fontWeight: '700', color: '#636366', textTransform: 'uppercase', letterSpacing: '1.5px' },
  
  docList: { listStyleType: 'none', padding: 0, margin: '0 0 15px 0', flexShrink: 0 },
  docItem: { padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', marginBottom: '6px', fontSize: '13px', fontWeight: '500', transition: 'background-color 0.15s, color 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  divider: { border: 'none', borderTop: '1px solid #222224', margin: '5px 0 20px 0' },
  
  // Lore Ledger Cards
  loreContainer: { flexGrow: 1, overflowY: 'auto', marginBottom: '15px', paddingRight: '4px' },
  loreCard: { backgroundColor: '#1c1c1e', borderRadius: '8px', padding: '12px', marginBottom: '10px', border: '1px solid #2c2c2e', transition: 'border-color 0.2s' },
  loreCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#fff', fontWeight: '600' },
  deleteLoreBtn: { background: 'transparent', border: 'none', color: '#48484a', cursor: 'pointer', fontSize: '16px', transition: 'color 0.2s' },
  loreCardDesc: { margin: 0, fontSize: '12px', color: '#9a9a9f', lineHeight: '1.5', marginTop: '6px' },
  
  loreForm: { display: 'flex', flexDirection: 'column', gap: '8px' },
  loreInput: { backgroundColor: '#0a0a0a', border: '1px solid #2c2c2e', borderRadius: '6px', color: '#fff', padding: '8px 12px', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s' },
  addLoreBtn: { backgroundColor: '#2c2c2e', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', transition: 'background-color 0.2s' },
  
  // Center Stage Focus Canvas
  mainCanvas: { flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0e0e10' },
  canvasHeader: { display: 'flex', alignItems: 'center', justify: 'space-between', padding: '14px 24px', borderBottom: '1px solid #1c1c1e', backgroundColor: '#0e0e10' },
  titleInput: { background: 'transparent', border: 'none', color: '#fff', fontSize: '16px', fontWeight: '600', textAlign: 'center', outline: 'none', flexGrow: 1, letterSpacing: '-0.5px' },
  toggleBtn: { background: '#1c1c1e', border: 'none', color: '#aeaeae', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'background-color 0.2s, color 0.2s' },
  
  editorWrapper: { flexGrow: 1, padding: '40px 80px', display: 'flex', justifyContent: 'center', position: 'relative', overflowY: 'auto' },
  textarea: { width: '100%', maxWidth: '720px', height: '100%', background: 'transparent', border: 'none', resize: 'none', outline: 'none', color: '#e5e5ea', fontSize: '18px', lineHeight: '1.65', fontFamily: '"Georgia", serif', caretColor: '#007aff' },
  
  // Context Overlays
  floatingMenu: { position: 'fixed', display: 'flex', backgroundColor: '#1c1c1e', border: '1px solid #3a3a3c', borderRadius: '12px', padding: '6px', zIndex: 1000, transform: 'translateX(-50%)', gap: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' },
  menuBtn: { background: 'transparent', border: 'none', color: '#fff', padding: '6px 12px', fontSize: '12px', fontWeight: '500', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.15s' },
  aiStatusBubble: { position: 'absolute', bottom: '40px', right: '40px', backgroundColor: '#007aff', color: '#fff', padding: '10px 20px', borderRadius: '30px', fontSize: '13px', fontWeight: '600', boxShadow: '0 4px 16px rgba(0,122,255,0.4)' },

  // Editorial Metrics Analytics Layout
  analyzeBtn: { backgroundColor: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', width: '100%', marginBottom: '20px', transition: 'background-color 0.2s, opacity 0.2s' },
  dashboardResults: { flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' },
  dashboardPlaceholder: { flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#48484a', fontSize: '13px', padding: '0 20px', lineHeight: '1.6' },
  metricSection: { backgroundColor: '#1c1c1e', border: '1px solid #2c2c2e', borderRadius: '8px', padding: '16px' },
  metricTitle: { margin: '0 0 10px 0', fontSize: '13px', color: '#fff', fontWeight: '600', letterSpacing: '-0.2px' },
  metricBody: { margin: 0, fontSize: '13px', color: '#aeaeb2', lineHeight: '1.6', whiteSpace: 'pre-wrap' },

  // Time Machine Revision Control Alert Banner
  timeMachineBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1c1c1e', borderBottom: '1px solid #ff9500', padding: '12px 24px', transition: 'all 0.3s ease' },
  bannerText: { fontSize: '13px', color: '#ff9500', fontWeight: '600', letterSpacing: '-0.1px' },
  bannerActions: { display: 'flex', gap: '12px' },
  undoBtn: { backgroundColor: '#ff9500', color: '#000', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.15s' },
  dismissBtn: { backgroundColor: 'transparent', border: '1px solid #3a3a3c', color: '#aeaeb2', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', transition: 'background-color 0.15s, color 0.15s' }
};
