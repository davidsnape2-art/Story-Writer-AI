/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Check, RotateCcw, HelpCircle, Flame, Scissors, Eye, MessageSquareCode } from "lucide-react";
import { TONES } from "../data";
import { RefineMode } from "../types";

interface RefinementPanelProps {
  selectedText: string;
  onApplyRefinedText: (newText: string) => void;
  activeGenre: string;
}

export default function RefinementPanel({ selectedText, onApplyRefinedText, activeGenre }: RefinementPanelProps) {
  const [inputText, setInputText] = useState("");
  const [refinedText, setRefinedText] = useState("");
  const [mode, setMode] = useState<RefineMode>("polish");
  const [tone, setTone] = useState(TONES[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with selectedText from parent canvas
  useEffect(() => {
    if (selectedText) {
      setInputText(selectedText);
    }
  }, [selectedText]);

  const handleRefine = async () => {
    if (!inputText.trim()) {
      setError("Please input or highlight some text in the chapter to refine first.");
      return;
    }
    setLoading(true);
    setError(null);
    setRefinedText("");

    try {
      const resp = await fetch("/api/gemini/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText: inputText,
          mode,
          tone,
          prompt: mode === "custom" ? customPrompt : "",
        }),
      });

      if (!resp.ok) {
        throw new Error("The editorial assistant encountered an error.");
      }

      const data = await resp.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setRefinedText(data.text || "Failed to refine prose.");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!refinedText) return;
    onApplyRefinedText(refinedText);
    setRefinedText("");
  };

  const handleClear = () => {
    setInputText("");
    setRefinedText("");
    setCustomPrompt("");
    setError(null);
  };

  return (
    <div className="bg-[#fcfcf9] rounded-2xl border border-[#e5e5df] p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-[#f5f5f0] pb-3">
        <div className="flex items-center gap-1.5 text-[#5A5A40]">
          <Sparkles className="w-4 h-4" />
          <h4 className="font-display font-semibold text-xs uppercase tracking-wider">Style & Prose Enhancer</h4>
        </div>
        <button
          onClick={handleClear}
          className="text-[10px] font-sans text-[#88887e] hover:text-[#33332d] underline uppercase tracking-wider"
        >
          Reset View
        </button>
      </div>

      <p className="text-[11px] text-[#88887e] leading-relaxed">
        Highlight any phrase or paragraph in the active chapter to load it below, choose an improvement mode, and compare before/after.
      </p>

      <div className="space-y-3.5">
        {/* Input area */}
        <div>
          <label className="block font-sans text-[8px] font-bold uppercase tracking-widest text-[#a1a19a] mb-1">
            Target Text to Improve
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Select/highlight prose in the chapter box, or paste directly here to begin drafting enhancements..."
            rows={4}
            className="w-full text-xs font-serif leading-relaxed border border-[#d5d5cd] bg-white rounded-lg p-3 text-[#33332d] placeholder-[#a1a19a] focus:outline-none focus:border-[#5A5A40] transition-colors resize-none"
          />
        </div>

        {/* Editing Modes Grid */}
        <div>
          <label className="block font-sans text-[8px] font-bold uppercase tracking-widest text-[#a1a19a] mb-2">
            Suggested Improvement Vector
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "polish", label: "✨ Polish & Sensory", desc: "Elaborates vocabulary & details" },
              { id: "show-not-tell", label: "👁️ Show, Don't Tell", desc: "Replaces dry facts with reactions" },
              { id: "shorten", label: "✂️ Tighten (Shorten)", desc: "Trims passive fluff, fast pacing" },
              { id: "custom", label: "✍️ Custom Prompt", desc: "Direct editorial feedback" }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as RefineMode)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  mode === m.id
                    ? "bg-[#5A5A40] text-white border-transparent"
                    : "bg-white text-[#33332d] border-[#e5e5df] hover:bg-[#efeee8]"
                }`}
              >
                <div className="font-sans text-[11px] font-bold leading-none mb-1">{m.label}</div>
                <div className={`text-[9px] font-sans leading-tight ${mode === m.id ? "text-white/85" : "text-[#88887e]"}`}>
                  {m.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom prompt if chosen */}
        {mode === "custom" && (
          <div>
            <label className="block font-sans text-[8px] font-bold uppercase tracking-widest text-[#a1a19a] mb-1">
              Custom Editor Instructions
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., 'Make Arthur sound more winded', 'Add smell of wet rust'"
              className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] focus:outline-none focus:border-[#5A5A40]"
            />
          </div>
        )}

        {/* Tone picker */}
        <div>
          <label className="block font-sans text-[8px] font-bold uppercase tracking-widest text-[#a1a19a] mb-1">
            Target Prose Aesthetic (Tone Alignment)
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] focus:outline-none focus:border-[#5A5A40]"
          >
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-[11px] font-sans text-red-600 leading-normal">{error}</p>}

        <button
          onClick={handleRefine}
          disabled={loading || !inputText}
          className="w-full py-2 bg-[#5A5A40] hover:bg-[#4a4a35] disabled:bg-[#a1a19a] text-white font-sans text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          {loading ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Analyzing Composition...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" /> Optimize Chapter Segment
            </>
          )}
        </button>
      </div>

      {/* Side-by-Side Review panel if refined */}
      {refinedText && (
        <div className="pt-4 border-t border-[#e5e5df] space-y-3.5">
          <div className="bg-[#ecece4] p-1.5 rounded-lg text-center">
            <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-[#5A5A40]">
              Review Suggested Improvement
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Before */}
            <div className="p-3 bg-red-50/50 rounded-lg border border-red-100/60">
              <span className="font-sans text-[8px] font-bold text-red-700 uppercase tracking-widest block mb-1">Current Draft</span>
              <p className="font-serif text-[11.5px] leading-relaxed text-[#555] line-through">
                {inputText}
              </p>
            </div>

            {/* After */}
            <div className="p-3.5 bg-green-50/80 rounded-lg border border-green-100 border-l-4 border-l-[#5A5A40]">
              <span className="font-sans text-[8px] font-bold text-[#5A5A40] uppercase tracking-widest block mb-1">Improved Literary Option</span>
              <p className="font-serif text-[12.5px] leading-relaxed text-[#33332d] italic">
                {refinedText}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setRefinedText("")}
              className="flex-1 py-1.5 rounded-lg border border-[#d5d5cd] font-sans text-[11px] text-[#88887e] hover:bg-[#efeee8] transition-colors cursor-pointer"
            >
              Decline
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-1.5 bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm"
            >
              <Check className="w-3.5 h-3.5" /> Accept Revision
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
