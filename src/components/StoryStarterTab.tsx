/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, ArrowRight, BookOpen, Layers, Check, RefreshCw } from "lucide-react";
import { GENRES, TONES } from "../data";

interface StoryStarter {
  title: string;
  beginningHook: string;
  plotOutline: string;
}

interface StoryStarterTabProps {
  onUseStarter: (title: string, beginning: string, outlineText: string) => void;
}

export default function StoryStarterTab({ onUseStarter }: StoryStarterTabProps) {
  const [genre, setGenre] = useState(GENRES[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [mainCharacter, setMainCharacter] = useState("");
  const [setting, setSetting] = useState("");
  const [loading, setLoading] = useState(false);
  const [starters, setStarters] = useState<StoryStarter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successIndex, setSuccessIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccessIndex(null);
    try {
      const response = await fetch("/api/gemini/story-starter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre,
          mainCharacter: mainCharacter || "A quiet clockmaker with grey eyes",
          setting: setting || "A fog-bound metropolis that never sees sunlight",
          styleTone: tone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to conjure story starters from the muse.");
      }

      const data = await response.json();
      setStarters(data.starters || []);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full max-h-[80vh] overflow-y-auto pr-2">
      {/* Parameter Form */}
      <div className="lg:col-span-5 bg-[#fcfcf9] p-6 rounded-2xl border border-[#e5e5df] shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-[#5A5A40]/10 rounded-lg text-[#5A5A40]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-display font-semibold text-lg text-[#33332d]">Incubate Story Premise</h3>
          </div>
          <p className="text-xs text-[#88887e] mb-6 leading-relaxed">
            Feed the canvas with essential ingredients, and Gemini will conjure three unique story blueprints, acts, and rich prose opening chapters.
          </p>

          <div className="space-y-4">
            {/* Genre */}
            <div>
              <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-[#88887e] mb-1.5">
                Genre Theme
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] focus:outline-none focus:border-[#5A5A40] transition-all"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-[#88887e] mb-1.5">
                Aesthetic Aura (Tone)
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] focus:outline-none focus:border-[#5A5A40] transition-all"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Protagonist */}
            <div>
              <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-[#88887e] mb-1.5">
                The Protagonist Core (Protagonist / Hero)
              </label>
              <textarea
                value={mainCharacter}
                onChange={(e) => setMainCharacter(e.target.value)}
                placeholder="E.g., An exiled botanist who talks to dying ferns, harboring a memory she wants wiped..."
                rows={3}
                className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] placeholder-[#a1a19a] focus:outline-none focus:border-[#5A5A40] transition-all resize-none"
              />
            </div>

            {/* Setting */}
            <div>
              <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-[#88887e] mb-1.5">
                The Fabric of the World (Setting / Background)
              </label>
              <textarea
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                placeholder="E.g., A sprawling bio-dome oasis suspended inside a frozen hydrogen gas giant..."
                rows={3}
                className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] placeholder-[#a1a19a] focus:outline-none focus:border-[#5A5A40] transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#e5e5df]">
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4a4a35] disabled:bg-[#a1a19a] text-white font-sans text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Inscribing Starters...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Conjure Story Starters
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Container */}
      <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-6">
        {loading && (
          <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center gap-3 bg-[#fcfcf9] rounded-2xl border border-[#e5e5df]/60 p-8 text-center animate-pulse">
            <div className="w-10 h-10 rounded-full bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] mb-2 spin-slow">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="font-display italic text-sm text-[#44443d]">Aligning timelines, crafting high-stakes choices...</p>
            <p className="text-[11px] font-sans text-[#88887e] max-w-sm">
              Gemini is invoking three distinct narrative entry points and plot arcs. This may take about ten seconds.
            </p>
          </div>
        )}

        {!loading && starters.length === 0 && (
          <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center gap-3 bg-[#fcfcf9]/40 rounded-2xl border border-dashed border-[#d5d5cd] p-12 text-center">
            <BookOpen className="w-12 h-12 text-[#a1a19a] stroke-[1.2] mb-1" />
            <h4 className="font-display text-base font-semibold text-[#33332d]">No Starters Conjured Yet</h4>
            <p className="text-xs text-[#88887e] max-w-md mx-auto leading-relaxed">
              Input your desired character elements and setting coordinates on the left, then click <b>Conjure Story Starters</b>. You will be rewarded with styled beginning hooks and complete story arcs.
            </p>
          </div>
        )}

        {!loading && starters.length > 0 && (
          <div className="space-y-6">
            <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#a1a19a] px-1">
              Three Paths are Open to You:
            </h4>
            <div className="space-y-6">
              {starters.map((starter, i) => (
                <div
                  key={i}
                  className="bg-[#fcfcf9] rounded-xl border border-[#e5e5df] p-6 hover:border-[#5A5A40]/60 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-[#f5f5f0] pb-2">
                      <span className="text-[10px] font-sans font-bold text-[#5A5A40] uppercase tracking-wider">
                        Concept {i + 1}
                      </span>
                      <span className="text-xs font-serif italic text-[#88887e]">"{starter.title}"</span>
                    </div>

                    <h3 className="font-display font-semibold text-base text-[#1a1a15] mb-2">
                      {starter.title}
                    </h3>

                    {/* Beginning Hook */}
                    <div className="mb-4 bg-white/60 p-4 rounded-lg border border-[#efeee8]">
                      <h5 className="font-sans text-[9px] font-bold uppercase tracking-wider text-[#a1a19a] mb-2">
                        Opening Chapter Hook (Prose Preview)
                      </h5>
                      <p className="font-serif text-[13px] leading-relaxed text-[#44443d] italic">
                        {starter.beginningHook}
                      </p>
                    </div>

                    {/* Plot Outline */}
                    <div className="mb-4">
                      <h5 className="font-sans text-[9px] font-bold uppercase tracking-wider text-[#a1a19a] mb-1.5 flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-[#5A5A40]" /> Narrative Blueprint
                      </h5>
                      <p className="font-sans text-xs leading-relaxed text-[#33332d] whitespace-pre-line bg-[#f5f5f0]/60 p-3 rounded border border-[#efeee8]">
                        {starter.plotOutline}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#f5f5f0] flex justify-end">
                    <button
                      onClick={() => {
                        onUseStarter(starter.title, starter.beginningHook, starter.plotOutline);
                        setSuccessIndex(i);
                      }}
                      className={`px-4 py-2 text-xs font-sans font-medium rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                        successIndex === i
                          ? "bg-[#a3b18a] text-white cursor-default"
                          : "bg-[#5A5A40] text-white hover:bg-[#4a4a35]"
                      }`}
                    >
                      {successIndex === i ? (
                        <>
                          <Check className="w-4 h-4" /> Transferred to Canvas!
                        </>
                      ) : (
                        <>
                          Adopt Template <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
