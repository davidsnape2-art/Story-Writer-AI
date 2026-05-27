/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Globe, MapPin, Landmark, Sparkles, RefreshCw, Compass, Users } from "lucide-react";
import { GENRES } from "../data";

interface WorldLocation {
  name: string;
  sensoryDetail: string;
  secretHistory: string;
}

interface CulturalElement {
  name: string;
  description: string;
}

interface SocietalStructure {
  title: string;
  description: string;
}

interface FictionalWorld {
  worldName: string;
  overview: string;
  locations: WorldLocation[];
  culturalElements: CulturalElement[];
  societalStructures: SocietalStructure[];
}

export default function WorldBuilderTab() {
  const [genre, setGenre] = useState(GENRES[2] || "Fantasy"); // high fantasy
  const [keywords, setKeywords] = useState("");
  const [atmosphere, setAtmosphere] = useState("Vibrant, dangerous, mist-shrouded, forgotten tech");
  const [loading, setLoading] = useState(false);
  const [world, setWorld] = useState<FictionalWorld | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [savedWorlds, setSavedWorlds] = useState<FictionalWorld[]>([
    {
      worldName: "Eldoria’s Shrouded Rift",
      overview: "A massive, light-reverent canyon world suspended between two colossal grinding tectonic plates, where pure glass storms sweep the dry floor and inhabitants live in houses carved inside porous, fossilized wood tunnels.",
      locations: [
        {
          name: "The Sunken Spires of Eldoria",
          sensoryDetail: "Smells of mossy stone and ozone. Cold, damp air that vibrates with a low mechanical hum. Sunlight is broken into amber strips.",
          secretHistory: "Built before the Great Sealing, these towers were locked by the High Sages to contain the sentient wind. A forgotten copper coin is said to unlock the seals."
        }
      ],
      culturalElements: [
        {
          name: "The Ritual of Lantern-Weaving",
          description: "Every twilight, the citizens weave tiny light-trapping vines into wicker lanterns, letting them drift over the plates to ward off tectonic tremors."
        }
      ],
      societalStructures: [
        {
          title: "The Glass Castes",
          description: "Governed by the Glassblowers Guild, where your societal standing is determined by the size and transparency of your lineage's focal lens."
        }
      ]
    }
  ]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/gemini/world-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre,
          keywords: keywords || "Ancient roots, humming bronze tubes, obsidian mirrors",
          atmosphere: atmosphere || "Eerie, eco-feudal, quiet decay",
        }),
      });

      if (!resp.ok) {
        throw new Error("The world weaver encountered an epoch boundary error.");
      }

      const data = await resp.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setWorld(data);
      // Append to saved list
      setSavedWorlds((prev) => [data, ...prev]);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full max-h-[80vh] overflow-y-auto pr-2">
      {/* Parameter inputs */}
      <div className="lg:col-span-5 bg-[#fcfcf9] p-6 rounded-2xl border border-[#e5e5df] shadow-sm flex flex-col justify-between h-fit">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-[#5A5A40]/10 rounded-lg text-[#5A5A40]">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="font-display font-semibold text-lg text-[#33332d]">World Forge</h3>
          </div>
          <p className="text-xs text-[#88887e] mb-5 leading-relaxed">
            Inscribe core thematic tags, atmospheres, or mystical motifs to cultivate a cohesive physical environment, localized cultures, and legal institutions.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-[#88887e] mb-1.5">
                World Bracket / Genre
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

            <div>
              <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-[#88887e] mb-1.5">
                Atmosphere & Mood
              </label>
              <input
                type="text"
                value={atmosphere}
                onChange={(e) => setAtmosphere(e.target.value)}
                placeholder="E.g., Melancholy, metallic, dry, glowing, forgotten"
                className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] focus:outline-none focus:border-[#5A5A40] transition-all"
              />
            </div>

            <div>
              <label className="block font-sans text-[10px] font-bold uppercase tracking-wider text-[#88887e] mb-1.5">
                Seeding Seeds & Keywords
              </label>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="E.g., Cold copper gears, high-altitude rust, hollow bell towers, non-combustive gases..."
                rows={4}
                className="w-full text-xs font-sans rounded-lg border border-[#d5d5cd] bg-white p-2 text-[#33332d] placeholder-[#a1a19a] focus:outline-none focus:border-[#5A5A40] transition-all resize-none"
              />
              <span className="text-[10px] text-[#a1a19a] italic block mt-1">
                Tip: Separate keywords by commas for richer spatial division.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[#e5e5df]">
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#4a4a35] disabled:bg-[#a1a19a] text-white font-sans text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Weaving World Fabric...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Forge World Foundations
              </>
            )}
          </button>
        </div>
      </div>

      {/* World Details Display */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {loading && (
          <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center gap-3 bg-[#fcfcf9] rounded-2xl border border-[#e5e5df] p-8 text-center animate-pulse">
            <Compass className="w-10 h-10 text-[#5A5A40] animate-spin mb-2" />
            <p className="font-display italic text-sm text-[#44443d]">Expanding geographic boundaries, carving topography...</p>
            <p className="text-[11px] font-sans text-[#88887e] max-w-sm">
              Gemini is weaving structured locations, localized dialects, beliefs, and governance models directly from your seed keywords.
            </p>
          </div>
        )}

        {!loading && !world && savedWorlds.length > 0 && (
          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#a1a19a]">
                Existing World Index
              </h4>
              <span className="text-[10px] text-[#88887e] italic">{savedWorlds.length} realm(s) archived</span>
            </div>

            {savedWorlds.map((w, idx) => (
              <div
                key={idx}
                className="bg-[#fcfcf9] rounded-xl border border-[#e5e5df] p-6 hover:border-[#5A5A40]/40 transition-all shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-display font-semibold text-lg text-[#1a1a15]">
                    {w.worldName}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#efeee8] text-[#5A5A40] font-sans text-[9px] uppercase font-bold tracking-wider">
                    Realm Archetype
                  </span>
                </div>

                <p className="font-serif text-[13px] leading-relaxed text-[#44443d] mb-4 border-l-2 border-[#dcdcd4] pl-3 italic">
                  {w.overview}
                </p>

                <div className="space-y-4">
                  {/* Locations */}
                  <div>
                    <h5 className="font-sans text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Iconic Landmarks
                    </h5>
                    <div className="space-y-3 pl-1">
                      {w.locations.map((loc, lIdx) => (
                        <div key={lIdx} className="bg-white p-3 rounded-lg border border-[#efeee8]">
                          <p className="font-sans text-xs font-semibold text-[#33332d]">{loc.name}</p>
                          <p className="font-sans text-[11px] text-[#88887e] mt-0.5"><b>Sensory:</b> {loc.sensoryDetail}</p>
                          <p className="font-serif text-[11px] text-[#44443d] mt-1 italic bg-[#fcfcf9] p-2 rounded">
                            {loc.secretHistory}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cultural Elements */}
                  <div>
                    <h5 className="font-sans text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Cultural Customs & Rituals
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {w.culturalElements.map((cult, cIdx) => (
                        <div key={cIdx} className="bg-white p-3 rounded-lg border border-[#efeee8]">
                          <p className="font-sans text-xs font-semibold text-[#33332d]">{cult.name}</p>
                          <p className="font-sans text-[11px] text-[#44443d] mt-1 leading-normal">
                            {cult.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Societal Structures */}
                  <div>
                    <h5 className="font-sans text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" /> Social Institutions
                    </h5>
                    <div className="space-y-2">
                      {w.societalStructures.map((soc, sIdx) => (
                        <div key={sIdx} className="bg-[#f5f5f0]/40 p-3 rounded-lg border border-[#efeee8] flex justify-between gap-4">
                          <span className="font-sans text-xs font-semibold text-[#5A5A40] shrink-0 w-1/4">
                            {soc.title}
                          </span>
                          <p className="font-sans text-[11px] text-[#44443d] flex-1 leading-normal">
                            {soc.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && world && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#a1a19a]">
                Forging Result
              </h4>
              <button
                onClick={() => setWorld(null)}
                className="text-[10px] font-sans text-[#5A5A40] hover:underline"
              >
                Clear to View All Realm Libraries
              </button>
            </div>

            {/* Render the core forged world */}
            <div className="bg-[#fcfcf9] rounded-xl border border-[#5A5A40]/30 p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#5A5A40]/5 rounded-bl-full flex items-center justify-center text-[#5A5A40] pt-2 pr-2">
                <Globe className="w-6 h-6 rotate-12" />
              </div>

              <span className="text-[10px] font-sans font-bold text-[#5A5A40] uppercase tracking-wider block mb-1">
                New Reality Manifested
              </span>
              <h3 className="font-display font-semibold text-2xl text-[#1a1a15] mb-2">
                {world.worldName}
              </h3>

              <p className="font-serif text-sm leading-relaxed text-[#44443d] mb-6 border-l-2 border-[#5A5A40] pl-4 italic bg-white/40 p-3 rounded-r-lg">
                {world.overview}
              </p>

              <div className="space-y-6">
                {/* Locations */}
                <div>
                  <h4 className="font-sans text-[10.5px] font-bold text-[#5A5A40] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> Three Unique Key Locations
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {world.locations.map((loc, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-[#efeee8] hover:border-[#5A5A40]/20 transition-all">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
                          <h5 className="font-sans text-xs font-semibold text-[#1a1a15]">{loc.name}</h5>
                        </div>
                        <p className="font-sans text-[11px] text-[#88887e] mb-2 leading-relaxed">
                          <b>Sensory Aura:</b> {loc.sensoryDetail}
                        </p>
                        <p className="font-serif text-[12px] text-[#44443d] leading-relaxed italic bg-[#fcfcf9] p-3 rounded-lg border border-[#f5f5f0]">
                          "{loc.secretHistory}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Culture */}
                <div>
                  <h4 className="font-sans text-[10.5px] font-bold text-[#5A5A40] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Cultural Elements & Local Customary Laws
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {world.culturalElements.map((cult, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-[#efeee8] flex flex-col justify-between">
                        <div>
                          <h5 className="font-sans text-xs font-semibold text-[#33332d] mb-1.5">{cult.name}</h5>
                          <p className="font-sans text-[11px] text-[#55554f] leading-relaxed">
                            {cult.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Societal Structure */}
                <div>
                  <h4 className="font-sans text-[10.5px] font-bold text-[#5A5A40] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4" /> Societal Structure & Rules
                  </h4>
                  <div className="space-y-3">
                    {world.societalStructures.map((soc, idx) => (
                      <div key={idx} className="bg-[#f5f5f0]/50 p-4 rounded-xl border border-[#ecece4] flex flex-col sm:flex-row gap-2 sm:gap-6">
                        <span className="font-sans text-xs font-bold text-[#5A5A40] uppercase tracking-wider sm:w-1/4 shrink-0">
                          {soc.title}
                        </span>
                        <p className="font-sans text-xs text-[#44443d] leading-relaxed flex-1">
                          {soc.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
