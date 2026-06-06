/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Users, UserPlus, Sparkles, RefreshCw, Eye, Award, Link, History, ShieldAlert, Trash2 } from "lucide-react";
import { Character } from "../types";

interface CharacterTabProps {
  characters: Character[];
  onAddCharacter: (char: Character) => void;
  onDeleteCharacter?: (charId: string) => void;
  onSelectCharacterForCanvas?: (char: Character) => void;
}

export default function CharacterTab({ characters, onAddCharacter, onDeleteCharacter, onSelectCharacterForCanvas }: CharacterTabProps) {
  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState("Profound Martyr");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"index" | "suggest">("index");
  const [previewChar, setPreviewChar] = useState<Partial<Character> | null>(null);

  const archetypes = [
    "The Reluctant Catalyst",
    "The Cynical Mentor",
    "The Blind Visionary",
    "The Penitent Outlaw",
    "The Obsessive Curator",
    "The Cosmic Stray",
    "The Gentle Saboteur"
  ];

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/gemini/character-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Lyra Woodsen",
          archetype: archetype || "The Outcast Healer",
          role: role || "",
          description: description || "A quiet woman traveling alone through dangerous borders, seeking a key that doesn't fit any known locks.",
        }),
      });

      if (!resp.ok) {
        throw new Error("Unable to weave character traits from the celestial fabric.");
      }

      const data = await resp.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Convert server format if arrays came down
      const characterPayload: Partial<Character> = {
        name: data.name || "Lyra Woodsen",
        archetype: data.archetype || archetype,
        role: data.role || role || "",
        tagline: data.tagline || "Walking in silence between forgotten border gates.",
        physicalAppearance: data.physicalAppearance || "Slender build, dark linen hood, calloused hands smelling of wild juniper.",
        internalDrive: data.motivations || "Driven to unlock her sister's clockwork consciousness.",
        quirksAndHabits: Array.isArray(data.quirks) 
          ? data.quirks.join(", ") 
          : (data.quirks || "Locks fingers repeatedly when tense, avoids eye contact with mechanical guardians."),
        backstory: data.backstory || "Abandoned as a toddler, raised in a botanical crypt where copper clocks kept rhythm instead of birds.",
      };

      setPreviewChar(characterPayload);
    } catch (err: any) {
      setError(err.message || "An exception occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCharacter = () => {
    if (!previewChar) return;
    const finalChar: Character = {
      id: "char-" + Date.now(),
      name: previewChar.name || "Unnamed Figure",
      archetype: previewChar.archetype || "Unknown",
      role: previewChar.role || "",
      tagline: previewChar.tagline || "",
      physicalAppearance: previewChar.physicalAppearance || "",
      internalDrive: previewChar.internalDrive || "",
      quirksAndHabits: previewChar.quirksAndHabits || "",
      backstory: previewChar.backstory || "",
    };

    onAddCharacter(finalChar);
    setPreviewChar(null);
    setName("");
    setRole("");
    setDescription("");
    setActiveTab("index");
  };

  // Helper colors for character avatar icons using Natural Tones theme
  const avatarColors = [
    "bg-[#5A5A40]",
    "bg-[#a3b18a]",
    "bg-[#d2b48c]",
    "bg-[#a1a19a]",
    "bg-[#ecece4]"
  ];

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Tab Selectors */}
      <div className="flex border-b border-[#e5e5df] pb-px">
        <button
          onClick={() => {
            setActiveTab("index");
            setPreviewChar(null);
          }}
          className={`px-5 py-2.5 font-sans text-xs font-semibold tracking-wider uppercase border-b-2 cursor-pointer transition-all ${
            activeTab === 'index'
              ? 'border-[#5A5A40] text-[#5A5A40]'
              : 'border-transparent text-[#88887e] hover:text-[#33332d]'
          }`}
        >
          Character Bible ({characters.length})
        </button>
        <button
          onClick={() => setActiveTab("suggest")}
          className={`px-5 py-2.5 font-sans text-xs font-semibold tracking-wider uppercase border-b-2 cursor-pointer transition-all ${
            activeTab === 'suggest'
              ? 'border-[#5A5A40] text-[#5A5A40]'
              : 'border-transparent text-[#88887e] hover:text-[#33332d]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" /> Divine a New Figure
          </span>
        </button>
      </div>

      {activeTab === "index" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 max-h-[70vh]">
          {characters.map((char, index) => {
            const colorClass = avatarColors[index % avatarColors.length];
            return (
              <div
                key={char.id}
                className="bg-[#fcfcf9] rounded-xl border border-[#e5e5df] p-6 hover:border-[#5A5A40]/40 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full ${colorClass} text-white flex items-center justify-center font-display font-semibold text-sm shadow-inner shrink-0`}>
                        {char.name?.split(" ").map(w => w[0]).join("") || "?"}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-[#1a1a15] flex items-center gap-1.5">
                          {char.name}
                        </h4>
                        <div className="flex flex-col gap-0.5">
                          <p className="font-sans text-[10px] uppercase font-bold text-[#5A5A40] tracking-wider">
                            {char.archetype || "Archetype Unspecified"}
                          </p>
                          {char.role && (
                            <p className="font-sans text-[10.5px] font-semibold text-[#666657]">
                              Role: {char.role}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {onDeleteCharacter && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${char.name} from the Character Bible?`)) {
                            onDeleteCharacter(char.id);
                          }
                        }}
                        className="p-1.5 text-[#a1a19a] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title={`Delete ${char.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="font-serif text-[12.5px] italic text-[#5A5A40] leading-snug mb-4 border-l-2 border-[#5A5A40]/20 pl-3">
                    "{char.tagline}"
                  </p>

                  <div className="space-y-3.5 text-xs">
                    {char.role && (
                      <div>
                        <h5 className="font-sans text-[9px] font-bold text-[#a1a19a] uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#5A5A40]" /> Narrative Role / Story Purpose
                        </h5>
                        <p className="font-sans text-[11.5px] leading-relaxed text-[#5A5A40] font-medium bg-[#5A5A40]/5 px-2.5 py-1.5 rounded-lg border border-[#5A5A40]/10">
                          {char.role}
                        </p>
                      </div>
                    )}

                    <div>
                      <h5 className="font-sans text-[9px] font-bold text-[#a1a19a] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Award className="w-3 h-3 text-[#5A5A40]" /> Dynamic Drive & Motivations
                      </h5>
                      <p className="font-sans text-[11.5px] leading-relaxed text-[#33332d]">
                        {char.internalDrive}
                      </p>
                    </div>

                    <div>
                      <h5 className="font-sans text-[9px] font-bold text-[#a1a19a] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <History className="w-3 h-3 text-[#5A5A40]" /> Layered Backstory
                      </h5>
                      <p className="font-serif text-[11.5px] leading-relaxed text-[#44443d] bg-[#f5f5f0]/50 p-2.5 rounded border border-[#efeee8]">
                        {char.backstory}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#f5f5f0]">
                      <div>
                        <h5 className="font-sans text-[9px] font-bold text-[#a1a19a] uppercase tracking-wider mb-0.5">
                          Physical Presence
                        </h5>
                        <p className="font-sans text-[10.5px] leading-tight text-[#44443d]">
                          {char.physicalAppearance}
                        </p>
                      </div>
                      <div>
                        <h5 className="font-sans text-[9px] font-bold text-[#a1a19a] uppercase tracking-wider mb-0.5">
                          Quirks & Mannerisms
                        </h5>
                        <p className="font-sans text-[10.5px] leading-tight text-[#44443d]">
                          {char.quirksAndHabits}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {onSelectCharacterForCanvas && (
                  <div className="mt-5 pt-3 border-t border-[#f5f5f0] flex justify-end">
                    <button
                      onClick={() => onSelectCharacterForCanvas(char)}
                      className="px-3 py-1.5 bg-[#efeee8] hover:bg-[#5A5A40] hover:text-white rounded-lg font-sans text-[10px] tracking-wider uppercase font-bold text-[#5A5A40] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Link className="w-3 h-3" /> Insert reference to chapter
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {characters.length === 0 && (
            <div className="col-span-2 min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-[#fcfcf9]/40 rounded-xl border border-dashed border-[#d5d5cd]">
              <Users className="w-10 h-10 text-[#a1a19a] stroke-[1.2] mb-1" />
              <h5 className="font-display font-semibold text-sm text-[#33332d]">Unpopulated Bible</h5>
              <p className="text-[11px] text-[#88887e] max-w-xs leading-relaxed mt-1">
                Every story breathes through its characters. Click "Divine a New Figure" to conjure flawed and compelling actors for your script.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "suggest" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto pr-2 max-h-[75vh]">
          {/* Form Side */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#fcfcf9] p-5 rounded-xl border border-[#e5e5df]">
              <h4 className="font-display font-semibold text-sm text-[#33332d] mb-4">Initial Portrait Seed</h4>
              <div className="space-y-3.5">
                <div>
                  <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-[#88887e] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g., Dr. Elijah Stone"
                    className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] focus:outline-none focus:border-[#5A5A40] transition-all"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-[#88887e] mb-1">
                    Core Role / Archetype
                  </label>
                  <select
                    value={archetype}
                    onChange={(e) => setArchetype(e.target.value)}
                    className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] focus:outline-none focus:border-[#5A5A40] transition-all"
                  >
                    {archetypes.map((arch) => (
                      <option key={arch} value={arch}>
                        {arch}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-[#88887e] mb-1">
                    Story Role & Narrative Purpose
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="E.g., Protagonist's secret informant, double agent, or cynical companion"
                    className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] focus:outline-none focus:border-[#5A5A40] transition-all"
                  />
                  <p className="text-[9px] text-[#88887e] mt-1 italic">
                    Specify the character's active story role to steer the AI's descriptive and backstory generation.
                  </p>
                </div>

                <div>
                  <label className="block font-sans text-[9px] font-bold uppercase tracking-wider text-[#88887e] mb-1">
                    Describe what you know so far
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="E.g., An older military surgeon whose left ear hums like a tuning fork. He is smuggling banned seeds out of the garrison..."
                    rows={4}
                    className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] placeholder-[#a1a19a] focus:outline-none focus:border-[#5A5A40] transition-all resize-none"
                  />
                </div>

                {error && <p className="text-[11px] text-red-600 font-sans">{error}</p>}

                <button
                  onClick={handleSuggest}
                  disabled={loading}
                  className="w-full mt-2 py-2 bg-[#5A5A40] hover:bg-[#4a4a35] disabled:bg-[#a1a19a] text-white font-sans text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Divining Deep Bio...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Flesh Out Character Bio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results preview */}
          <div className="lg:col-span-7 flex flex-col justify-start">
            {loading && (
              <div className="bg-[#fcfcf9] rounded-xl border border-[#e5e5df] p-8 text-center flex flex-col items-center justify-center h-[380px] animate-pulse">
                <div className="w-12 h-12 rounded-full bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] mb-3 animate-spin duration-1000">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h5 className="font-display italic text-[#33332d] text-sm">Drafting psychological file...</h5>
                <p className="text-[11px] text-[#88887e] max-w-sm mt-1 leading-normal">
                  Inscribing secrets, childhood anchors, core lies, and tragic flaws that trigger high tension points when interacting with others.
                </p>
              </div>
            )}

            {!loading && !previewChar && (
              <div className="bg-dashed border-2 border-[#d5d5cd] rounded-xl p-8 text-center flex flex-col items-center justify-center h-[380px] text-[#a1a19a]">
                <Users className="w-12 h-12 stroke-[1.2] mb-2" />
                <h5 className="font-display font-semibold text-[#33332d]">Your Devised Persona Appears Here</h5>
                <p className="text-xs text-[#88887e] max-w-xs mt-1 leading-relaxed">
                  Provide a small seed prompt on the left, then trigger Gemini's character deviser module. You will be able to review, tweak, and save it to your book.
                </p>
              </div>
            )}

            {!loading && previewChar && (
              <div className="bg-[#fcfcf9] rounded-xl border-2 border-[#5A5A40]/30 p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between border-b border-[#f5f5f0] pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#5A5A40] text-white font-display font-semibold flex items-center justify-center text-xs shadow-inner">
                        {previewChar.name?.split(" ").map(w => w[0]).join("") || "?"}
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-[#1a1a15]">{previewChar.name}</h4>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-sans text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider">{previewChar.archetype}</span>
                          {previewChar.role && (
                            <span className="font-sans text-[10.5px] font-semibold text-[#666657]">Role: {previewChar.role}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#5A5A40]/10 text-[#5A5A40] font-sans text-[9px] uppercase font-bold">Preview Portrait</span>
                  </div>

                  <p className="font-serif text-[13px] italic text-[#5A5A40] leading-snug mb-5 border-l-2 border-[#5A5A40]/30 pl-3">
                    "{previewChar.tagline}"
                  </p>

                  <div className="space-y-4 text-xs pr-1">
                    {previewChar.role && (
                      <div>
                        <h5 className="font-sans text-[9px] font-bold uppercase tracking-wider text-[#a1a19a] mb-1">
                          Narrative Role / Story Purpose
                        </h5>
                        <p className="font-sans text-[11.5px] leading-relaxed text-[#5A5A40] font-medium bg-[#5A5A40]/5 px-2.5 py-1.5 rounded-lg border border-[#5A5A40]/10">
                          {previewChar.role}
                        </p>
                      </div>
                    )}

                    <div>
                      <h5 className="font-sans text-[9px] font-bold uppercase tracking-wider text-[#a1a19a] mb-1">
                        Motivation & Core Lie (Internal Battle)
                      </h5>
                      <p className="font-sans text-[11.5px] leading-relaxed text-[#33332d]">
                        {previewChar.internalDrive}
                      </p>
                    </div>

                    <div>
                      <h5 className="font-sans text-[9px] font-bold uppercase tracking-wider text-[#a1a19a] mb-1">
                        Formative Story Background
                      </h5>
                      <p className="font-serif text-[12px] leading-relaxed text-[#44443d] bg-white p-3 rounded-lg border border-[#efeee8]">
                        {previewChar.backstory}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-[#f5f5f0] pt-3">
                      <div>
                        <h5 className="font-sans text-[9px] font-bold uppercase tracking-wider text-[#a1a19a] mb-0.5">Physical Presence</h5>
                        <p className="font-sans text-[11px] leading-relaxed text-[#44443d]">
                          {previewChar.physicalAppearance}
                        </p>
                      </div>
                      <div>
                        <h5 className="font-sans text-[9px] font-bold uppercase tracking-wider text-[#a1a19a] mb-0.5">Slight Quirks & Dialects</h5>
                        <p className="font-sans text-[11px] leading-relaxed text-[#44443d]">
                          {previewChar.quirksAndHabits}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#f5f5f0] flex justify-end gap-2">
                  <button
                    onClick={() => setPreviewChar(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-[#d5d5cd] font-sans text-[11px] font-medium text-[#88887e] hover:bg-[#efeee8] transition-colors cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveCharacter}
                    className="px-4 py-1.5 bg-[#5A5A40] hover:bg-[#4a4a35] text-white font-sans text-[11px] font-medium rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                  >
                    Inscribe to Bible
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
