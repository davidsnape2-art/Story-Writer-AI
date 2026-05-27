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
  Sparkle
} from "lucide-react";

import { Story, Character, OutlineItem, SidebarTab, AiTab } from "./types";
import { INITIAL_STORY, GENRES, TONES } from "./data";

// Import custom sub-modules
import StoryStarterTab from "./components/StoryStarterTab";
import WorldBuilderTab from "./components/WorldBuilderTab";
import CharacterTab from "./components/CharacterTab";
import RefinementPanel from "./components/RefinementPanel";
import CoWriterChat from "./components/CoWriterChat";

export default function App() {
  // Primary app state
  const [story, setStory] = useState<Story>(INITIAL_STORY);
  const [selectedMainTab, setSelectedMainTab] = useState<"canvas" | "incubate" | "world" | "characters">("canvas");
  const [leftSidebarTab, setLeftSidebarTab] = useState<"structure" | "outline">("structure");
  const [rightPanelTab, setRightPanelTab] = useState<"refine" | "chat" | "brainstorm">("refine");

  // Selection states
  const [highlightedText, setHighlightedText] = useState("");
  const [expansionInstruction, setExpansionInstruction] = useState("");
  const [expandingActive, setExpandingActive] = useState(false);

  // Quick Brainstorm outputs in right sidebar
  const [brainstormType, setBrainstormType] = useState<"twist" | "title" | "outline">("twist");
  const [brainstormPrompt, setBrainstormPrompt] = useState("");
  const [brainstormResult, setBrainstormResult] = useState("");
  const [brainstormLoading, setBrainstormLoading] = useState(false);

  const [notifications, setNotifications] = useState<string[]>([]);

  // Focus mode & Collapsible sidebars state
  const [focusMode, setFocusMode] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

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
    setStory((prev) => {
      const selectedCh = prev.chapters.find((ch) => ch.id === chapterId);
      return {
        ...prev,
        activeChapterId: chapterId,
        manuscript: selectedCh ? selectedCh.content : prev.manuscript,
      };
    });
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

  // Highlight selection catcher from manuscript text area
  const checkSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const selection = target.value.substring(target.selectionStart, target.selectionEnd);
    if (selection && selection.trim().length > 3) {
      setHighlightedText(selection);
    }
  };

  return (
    <div id="ai-story-writer-app" className={`min-h-screen bg-[#f5f5f0] text-[#33332d] font-sans flex flex-col justify-between overflow-x-hidden transition-all ${focusMode ? "pt-0" : ""}`}>
      
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
                  {story.chapters.map((ch) => (
                    <li
                      key={ch.id}
                      onClick={() => handleSelectChapter(ch.id)}
                      className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-sans transition-all duration-150 ${
                        ch.id === activeChapterId
                          ? "bg-[#5A5A40] text-white shadow-sm font-medium"
                          : "text-[#555] hover:bg-[#efeee8] hover:text-[#111]"
                      }`}
                    >
                      <span className="truncate flex-1">📝 {ch.title}</span>
                      {story.chapters.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteChapter(ch.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 text-red-500 transition-opacity ml-1"
                          title="Delete Chapter"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </li>
                  ))}
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
              <div className="flex border-b border-[#e5e5df] mb-4">
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
                </div>

                {/* Main draft Area */}
                <div className="flex-1 flex flex-col min-h-[350px]">
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
                    id="chapter-textarea"
                    value={activeCh.content}
                    onChange={(e) => handleTextChange(e.target.value)}
                    onMouseUp={checkSelection}
                    onKeyUp={checkSelection}
                    placeholder="Inscribe your chapter prose here. Click anywhere to reset tool highlights..."
                    className="w-full flex-1 font-serif text-[15px] leading-relaxed text-[#33332d] bg-transparent border-none placeholder-[#a1a19a] focus:ring-0 focus:outline-none resize-none pt-2"
                  />
                </div>

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
                {/* Panel Selector tabs */}
                <div className="flex border-b border-[#e5e5df] mb-4 pb-px text-xs shrink-0">
                  <button
                    onClick={() => setRightPanelTab("refine")}
                    className={`flex-1 pb-2 font-sans font-semibold text-center uppercase tracking-wider cursor-pointer border-b ${
                      rightPanelTab === "refine" ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#a1a19a]"
                    }`}
                  >
                    ✨ Style Refiner
                  </button>
                  <button
                    onClick={() => setRightPanelTab("chat")}
                    className={`flex-1 pb-2 font-sans font-semibold text-center uppercase tracking-wider cursor-pointer border-b ${
                      rightPanelTab === "chat" ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#a1a19a]"
                    }`}
                  >
                    💬 Co-Writer Chat
                  </button>
                  <button
                    onClick={() => setRightPanelTab("brainstorm")}
                    className={`flex-1 pb-2 font-sans font-semibold text-center uppercase tracking-wider cursor-pointer border-b ${
                      rightPanelTab === "brainstorm" ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#a1a19a]"
                    }`}
                  >
                    🧠 Sparks
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
