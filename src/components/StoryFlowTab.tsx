import React, { useState } from "react";
import { Story, Document } from "../types";
import { 
  Activity, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  ArrowRight, 
  BookOpen, 
  CheckCircle2, 
  Compass, 
  Eye, 
  Zap, 
  AlertCircle 
} from "lucide-react";

interface TransitionFlow {
  fromChapter: string;
  toChapter: string;
  flowRating: "Jarring" | "Bumpy" | "Decent" | "Smooth" | "Masterful";
  critique: string;
}

interface StoryFlowAnalysis {
  coherenceScore: number;
  flowOverview: string;
  pacingDistribution: string;
  sensoryHarmony: string;
  transitions: TransitionFlow[];
  macroImprovementPlan: string[];
}

interface StoryFlowTabProps {
  story: Story;
  onSelectChapter: (id: string) => void;
  onRunChapterAnalysis: (id: string) => Promise<void>;
}

export default function StoryFlowTab({ 
  story, 
  onSelectChapter, 
  onRunChapterAnalysis 
}: StoryFlowTabProps) {
  const [activeMetric, setActiveMetric] = useState<"overallScore" | "sensoryScore" | "pacingScore" | "betaScore">("overallScore");
  const [hoveredChapter, setHoveredChapter] = useState<Document | null>(null);
  const [isFlowLoading, setIsFlowLoading] = useState(false);
  const [flowReport, setFlowReport] = useState<StoryFlowAnalysis | null>(() => {
    try {
      const saved = localStorage.getItem(`ai_story_flow_report_${story.id}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [analyzingChapterId, setAnalyzingChapterId] = useState<string | null>(null);

  // Compute stats across chapters
  const ratedChapters = story.chapters.filter(ch => ch.analytics?.[activeMetric] !== undefined);
  const totalChaptersCount = story.chapters.length;
  const analyzedCount = story.chapters.filter(ch => ch.analytics?.overallScore !== undefined).length;

  const averageOverallScore = story.chapters.reduce((acc, ch) => acc + (ch.analytics?.overallScore || 0), 0) / (analyzedCount || 1);
  const averageSensoryScore = story.chapters.reduce((acc, ch) => acc + (ch.analytics?.sensoryScore || 0), 0) / (analyzedCount || 1);
  const averagePacingScore = story.chapters.reduce((acc, ch) => acc + (ch.analytics?.pacingScore || 0), 0) / (analyzedCount || 1);
  const averageBetaScore = story.chapters.reduce((acc, ch) => acc + (ch.analytics?.betaScore || 0), 0) / (analyzedCount || 1);

  // Trigger individual chapter analysis inline from Flow screen
  const executeChapterAnalysis = async (chapterId: string) => {
    setAnalyzingChapterId(chapterId);
    try {
      await onRunChapterAnalysis(chapterId);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingChapterId(null);
    }
  };

  // Trigger the master collaborative flow analysis
  const handleAnalyzeStoryFlow = async () => {
    if (isFlowLoading || story.chapters.length === 0) return;
    setIsFlowLoading(true);
    try {
      const response = await fetch("/api/gemini/analyze-story-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters: story.chapters }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate story-wide flow audit: ${response.statusText}`);
      }

      const data = await response.json();
      setFlowReport(data);
      localStorage.setItem(`ai_story_flow_report_${story.id}`, JSON.stringify(data));
    } catch (error) {
      console.error("Story flow analysis critical error:", error);
    } finally {
      setIsFlowLoading(false);
    }
  };

  // Custom visual settings for metrics
  const metricMeta = {
    overallScore: { label: "Quality Index", color: "#5A5A40", gradStart: "#808060", desc: "Overall structural blueprint, narrative voice execution, and grammar balance." },
    sensoryScore: { label: "Sensory Atmosphere (VAKOG)", color: "#c2410c", gradStart: "#ea580c", desc: "Immersion richness across sights, tactile textures, smells, sounds, and active tastes." },
    pacingScore: { label: "Velocity & Rhythmical Pacing", color: "#0369a1", gradStart: "#0284c7", desc: "Speed and narrative acceleration - pinpointing expositions that stall or moments that rush." },
    betaScore: { label: "Beta Reader Continuity", color: "#0f766e", gradStart: "#0d9488", desc: "Fictional consistency, logical character choices, subtext density, and character agency." }
  };

  // Build the SVG chart path with precision lines
  const chartWidth = 700;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  // Render SVG elements dynamically
  const getCoordinates = () => {
    if (story.chapters.length === 0) return [];
    const stepX = story.chapters.length > 1 ? (chartWidth - paddingX * 2) / (story.chapters.length - 1) : 0;
    
    return story.chapters.map((ch, index) => {
      const x = paddingX + index * stepX;
      const score = ch.analytics?.[activeMetric];
      
      // Plot missing scores nicely at midpoint 50 with a special "pending" flag
      const value = score !== undefined ? score : 50;
      const y = chartHeight - paddingY - (value / 100) * (chartHeight - paddingY * 2);
      
      return { x, y, value, isPending: score === undefined, chapter: ch };
    });
  };

  const coords = getCoordinates();

  // Create path strings
  let pathD = "";
  let areaD = "";
  if (coords.length > 0) {
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    areaD = `M ${coords[0].x} ${chartHeight - paddingY}`;
    coords.forEach((pt, index) => {
      if (index === 0) {
        areaD += ` L ${pt.x} ${pt.y}`;
      } else {
        pathD += ` L ${pt.x} ${pt.y}`;
        areaD += ` L ${pt.x} ${pt.y}`;
      }
    });
    areaD += ` L ${coords[coords.length - 1].x} ${chartHeight - paddingY} Z`;
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* HEADER HERO */}
      <div className="bg-gradient-to-r from-[#5A5A40]/10 via-transparent to-transparent p-6 rounded-2xl border border-[#e5e5df] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-[#5A5A40] text-white text-[9.5px] uppercase font-mono font-bold tracking-widest rounded-md">
              Narrative Blueprint
            </span>
            <span className="text-xs text-[#88887e]">
              {analyzedCount}/{totalChaptersCount} Analysed Drafts
            </span>
          </div>
          <h2 className="font-display font-medium text-2xl text-[#1a1a15] italic">
            Macro Story Flow & Pacing Dashboard
          </h2>
          <p className="text-[11.5px] text-[#88887e] leading-relaxed max-w-2xl">
            Evaluate continuous transitions, sensory levels, and pacing velocity across all chapters together. Prevent jarring transitions and build unified literary coherence easily.
          </p>
        </div>

        <button
          onClick={handleAnalyzeStoryFlow}
          disabled={isFlowLoading || totalChaptersCount === 0}
          className="px-5 py-3 bg-[#5A5A40] hover:bg-[#4a4a35] text-white disabled:bg-[#a1a19a] font-sans font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-2"
        >
          {isFlowLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Conducing Macro Story Review...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-200" /> Diagnose Complete Story Flow
            </>
          )}
        </button>
      </div>

      {/* METRIC CARD STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(metricMeta).map(([key, meta]) => {
          let scoreVal = 0;
          if (key === "overallScore") scoreVal = averageOverallScore;
          else if (key === "sensoryScore") scoreVal = averageSensoryScore;
          else if (key === "pacingScore") scoreVal = averagePacingScore;
          else if (key === "betaScore") scoreVal = averageBetaScore;

          const percentage = Math.round(scoreVal);
          const isSelected = activeMetric === key;

          return (
            <button
              key={key}
              onClick={() => setActiveMetric(key as any)}
              className={`p-4 text-left rounded-xl border transition-all cursor-pointer ${
                isSelected 
                  ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-sm transform -translate-y-0.5" 
                  : "bg-white text-[#555] border-[#e5e5df] hover:border-[#5A5A40]"
              }`}
            >
              <span className={`text-[10px] uppercase font-bold tracking-widest ${isSelected ? "text-white/80" : "text-[#88887e]"}`}>
                {meta.label.split(" (")[0]}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-semibold font-display">
                  {analyzedCount > 0 ? `${percentage}%` : "—"}
                </span>
                <span className={`text-[9.5px] font-mono ${isSelected ? "text-white/60" : "text-gray-400"}`}>
                  Avg
                </span>
              </div>
              <p className={`text-[10px] leading-relaxed mt-2 ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                {meta.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* MAIN PLOT AND CHART COMPONENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* INTERACTIVE STORY ARC CHART (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e5e5df] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase bg-[#efeee8] text-[#5A5A40] px-2 py-0.5 rounded-md font-bold">
                Narrative Wave Blueprint
              </span>
              <h3 className="font-display font-medium text-sm text-[#33332d]">
                Story Progression Curve: <span className="italic font-normal">{metricMeta[activeMetric].label}</span>
              </h3>
            </div>
            {hoveredChapter && (
              <div className="text-right text-[10px] font-mono animate-fadeIn">
                <span className="text-[#88887e]">Hovering:</span>{" "}
                <strong className="text-[#33332d]">{hoveredChapter.title}</strong>
                {" "}
                <span className="px-1.5 py-0.5 bg-[#efeee8] text-[#5A5A40] rounded ml-1 font-bold">
                  {hoveredChapter.analytics?.[activeMetric] !== undefined ? `${hoveredChapter.analytics?.[activeMetric]}%` : "Pending Review"}
                </span>
              </div>
            )}
          </div>

          {totalChaptersCount === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center text-[#88887e] bg-[#fafaf8] rounded-xl border border-dashed border-[#e5e5df]">
              <BookOpen className="w-8 h-8 opacity-40 mb-2 text-[#5A5A40]" />
              <span className="text-xs">No chapters available in the story.</span>
              <span className="text-[10px] text-gray-400 mt-1">Create chapters under the Writing Canvas first.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[650px] relative">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto select-none">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map((level) => {
                    const y = chartHeight - paddingY - (level / 100) * (chartHeight - paddingY * 2);
                    return (
                      <g key={level} className="opacity-40">
                        <line 
                          x1={paddingX} 
                          y1={y} 
                          x2={chartWidth - paddingX} 
                          y2={y} 
                          stroke="#e5e5df" 
                          strokeWidth="1" 
                          strokeDasharray="4 4" 
                        />
                        <text 
                          x={paddingX - 10} 
                          y={y + 3} 
                          className="font-mono text-[9px] text-[#88887e]" 
                          textAnchor="end"
                        >
                          {level}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Shaded Area */}
                  {coords.length > 0 && (
                    <path
                      d={areaD}
                      fill={`url(#gradient-${activeMetric})`}
                      className="transition-all duration-500"
                    />
                  )}

                  {/* Line Path */}
                  {coords.length > 0 && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={metricMeta[activeMetric].color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-500"
                    />
                  )}

                  {/* Coordinates Nodes */}
                  {coords.map((pt, i) => (
                    <g 
                      key={pt.chapter.id}
                      onMouseEnter={() => setHoveredChapter(pt.chapter)}
                      onMouseLeave={() => setHoveredChapter(null)}
                      onClick={() => onSelectChapter(pt.chapter.id)}
                      className="cursor-pointer group"
                    >
                      {/* Interactive hover circle aura */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="12"
                        className="fill-transparent hover:fill-[#5A5A40]/10 transition-colors"
                      />
                      {/* Active score node */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={pt.isPending ? "4.5" : "6.5"}
                        fill={pt.isPending ? "#fff" : metricMeta[activeMetric].color}
                        stroke={pt.isPending ? "#88887e" : "#fff"}
                        strokeWidth="2"
                        className="transition-all duration-300 transform group-hover:scale-125"
                      />
                      {/* Pending outline */}
                      {pt.isPending && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="7"
                          fill="none"
                          stroke={metricMeta[activeMetric].color}
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                      )}
                    </g>
                  ))}

                  {/* X Axis Labels */}
                  {coords.map((pt, i) => (
                    <text
                      key={pt.chapter.id}
                      x={pt.x}
                      y={chartHeight - 10}
                      className={`font-sans text-[10px] text-center font-semibold cursor-pointer transition-colors ${
                        pt.chapter.analytics ? "text-[#33332d]" : "text-[#a1a19a]"
                      }`}
                      textAnchor="middle"
                      onClick={() => onSelectChapter(pt.chapter.id)}
                    >
                      Ch {i + 1}
                    </text>
                  ))}

                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={metricMeta[activeMetric].color} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={metricMeta[activeMetric].gradStart} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          )}

          <div className="bg-[#fafaf8] p-3 rounded-xl border border-[#e5e5df] flex items-center gap-2 text-[10.5px] text-[#88887e] leading-relaxed">
            <TrendingUp className="w-4 h-4 text-[#5A5A40] shrink-0" />
            <span>
              <strong>How to interpret:</strong> Consecutive data peaks indicate narrative milestones or sensory crescendos. Abrupt valleys can mean a flat "white room" scene transition or static momentum. Aim for a healthy rhythm wave.
            </span>
          </div>
        </div>

        {/* NARRATIVE FLOW CONTINUITY BLUEPRINT (1/3 width) */}
        <div className="bg-white rounded-2xl border border-[#e5e5df] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 font-semibold">
              Continuity Engine
            </span>
            <h3 className="font-display font-medium text-sm text-[#33332d]">
              Coherence Index
            </h3>
            <p className="text-[10.5px] text-[#88887e] leading-snug">
              Calculated when you generate a complete story analysis. High coherence (80%+) guarantees clean chapter hand-offs.
            </p>
          </div>

          {flowReport ? (
            <div className="space-y-4 flex-1 flex flex-col justify-center py-2 animate-fadeIn">
              {/* Dial design */}
              <div className="text-center space-y-1.5 py-4">
                <div className="inline-flex relative items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="stroke-gray-100 fill-none"
                      strokeWidth="8"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className={`stroke-current fill-none transition-all duration-1000 ${
                        flowReport.coherenceScore >= 80 ? "text-emerald-600" : flowReport.coherenceScore >= 60 ? "text-amber-500" : "text-rose-500"
                      }`}
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * flowReport.coherenceScore) / 100}
                    />
                  </svg>
                  <span className="absolute text-xl font-display font-bold text-[#33332d]">
                    {flowReport.coherenceScore}%
                  </span>
                </div>
                <div className="font-sans font-extrabold text-[10px] tracking-widest uppercase block text-[#33332d]">
                  {flowReport.coherenceScore >= 80 ? "Unified Flow Excellent" : flowReport.coherenceScore >= 60 ? "Average Flow Continuity" : "Fragmented Arc Warning"}
                </div>
              </div>

              <div className="bg-[#fafaf8] border border-[#e5e5df] p-3 rounded-lg text-center text-[10px] text-[#88887e]">
                Continuous diagnosis binds dialogue nodes and prevents narrative drift across {story.outline.length} outline points!
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 py-8 bg-[#fafaf8] border border-dashed border-[#e5e5df] rounded-xl flex-1 flex flex-col justify-center">
              <span className="text-3xl block filter grayscale-30 animate-pulse">⚓</span>
              <div className="space-y-1">
                <h4 className="font-sans text-[10.5px] font-bold text-[#1a1a15] uppercase tracking-wider">
                  No Coherence Report Generated
                </h4>
                <p className="text-[10px] text-[#88887e] leading-relaxed max-w-[200px] mx-auto">
                  Click 'Diagnose Complete Story Flow' above to review chapter continuity together.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleAnalyzeStoryFlow}
            disabled={isFlowLoading}
            className="w-full py-2.5 bg-[#efeee8] hover:bg-[#ecece4] text-[#1a1a15] disabled:opacity-50 text-[10px] font-mono tracking-wider font-extrabold uppercase rounded-lg border border-[#d6d6ce] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isFlowLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Refresh Continuity Grid"}
          </button>
        </div>
      </div>

      {/* DETAILED SEGMENTS (TRANSITION PLAN AND MAPS) */}
      {flowReport && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slideDown">
          {/* MULTI_CHAPTER FLOW ANALYSIS */}
          <div className="bg-white rounded-2xl border border-[#e5e5df] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#fafaf8] pb-3">
              <Activity className="w-4 h-4 text-[#5A5A40]" />
              <h3 className="font-display font-medium text-xs text-[#1a1a15] uppercase tracking-widest">
                Narrative Wave Blueprint Overview
              </h3>
            </div>

            <div className="space-y-4 text-xs text-[#555] leading-relaxed">
              <div className="bg-[#fafaf8] border-l-4 border-[#5A5A40] p-4 rounded-r-xl space-y-2">
                <span className="font-sans font-bold text-[10px] uppercase text-[#5a5a40]">
                  Macro Flow Overview & Dynamics:
                </span>
                <p>{flowReport.flowOverview}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1 bg-[#fafaf8] p-3 rounded-lg border border-[#e5e5df]">
                  <span className="font-sans text-[10px] font-extrabold text-sky-800 uppercase block tracking-wider">
                    Pacing Distribution:
                  </span>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {flowReport.pacingDistribution}
                  </p>
                </div>
                <div className="space-y-1 bg-[#fafaf8] p-3 rounded-lg border border-[#e5e5df]">
                  <span className="font-sans text-[10px] font-extrabold text-orange-800 uppercase block tracking-wider">
                    Sensory Balance:
                  </span>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {flowReport.sensoryHarmony}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* MASTER POLISHING ROADMAP */}
          <div className="bg-white rounded-2xl border border-[#e5e5df] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#fafaf8] pb-3">
              <CheckCircle2 className="w-4 h-4 text-[#5A5A40]" />
              <h3 className="font-display font-medium text-xs text-[#1a1a15] uppercase tracking-widest">
                Actionable Flow Roadmap
              </h3>
            </div>
            
            <p className="text-[11px] text-[#88887e]">
              A continuous, sequential checklist prescribed by your narrative partner to elevate flow cohesion across chapters:
            </p>

            <ul className="space-y-3">
              {flowReport.macroImprovementPlan.map((item, idx) => (
                <li 
                  key={idx} 
                  className="p-3 bg-gradient-to-r from-emerald-50/40 to-transparent border border-emerald-100/50 rounded-xl flex items-start gap-3 text-[11px] text-[#555] leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* RE-ARCHITECT TRANSITION MATRIX */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#efeee8] pb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#5A5A40]" />
            <h3 className="font-display font-medium text-xs text-[#1a1a15] uppercase tracking-widest">
              Sequential Chapter Transitions Matrix
            </h3>
          </div>
          <span className="text-[10px] text-[#88887e]">
            Review sequentially linking points
          </span>
        </div>

        {/* LIST OF SEQUENTIAL TRANSITIONS */}
        {story.chapters.length <= 1 ? (
          <div className="bg-white rounded-2xl border border-[#e5e5df] p-6 text-center text-[#88887e] max-w-md mx-auto space-y-2">
            <span className="text-xl block">📄</span>
            <span className="font-sans font-bold text-[10.5px] text-[#1a1a15] uppercase tracking-wider block">
              Transitions require at least 2 chapters
            </span>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Add some additional chapters using your sidebar structure tool inside the Writing Canvas to analyze chapter-to-chapter hand-offs!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {story.chapters.slice(0, -1).map((ch, idx) => {
              const nextCh = story.chapters[idx + 1];
              
              // Find matching transition from generated report
              const transitionRecord = flowReport?.transitions?.find(
                t => t.fromChapter.toLowerCase().includes(ch.title?.toLowerCase().trim()) ||
                     ch.title?.toLowerCase().trim().includes(t.fromChapter.toLowerCase().trim())
              );

              return (
                <div 
                  key={`${ch.id}-${nextCh.id}`} 
                  className="bg-white rounded-xl border border-[#e5e5df] p-4 flex flex-col justify-between space-y-3 hover:border-[#5A5A40] transition-all"
                >
                  <div className="flex items-center justify-between text-xs bg-[#fafaf8] p-2.5 rounded-lg border border-[#f0efe9]">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-mono font-extrabold uppercase text-[#5a5a40] block">From Chapter {idx + 1}:</span>
                      <span className="text-[11px] font-semibold text-[#1a1a15] block truncate">
                        {ch.title}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#88887e] shrink-0 mx-2" />
                    <div className="min-w-0 flex-1 text-right">
                      <span className="text-[9px] font-mono font-extrabold uppercase text-[#5a5a40] block">To Chapter {idx + 2}:</span>
                      <span className="text-[11px] font-semibold text-[#1a1a15] block truncate">
                        {nextCh.title}
                      </span>
                    </div>
                  </div>

                  {transitionRecord ? (
                    <div className="space-y-2 flex-1 flex flex-col justify-between">
                      <p className="text-[11px] text-gray-600 leading-relaxed italic">
                        "{transitionRecord.critique}"
                      </p>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-[#fbfbf9]">
                        <span className="text-[9px] text-[#88887e] uppercase font-bold">
                          Transition Flow Rating:
                        </span>
                        <span className={`text-[9.5px] font-mono font-extrabold px-2 py-0.5 rounded ${
                          transitionRecord.flowRating === "Masterful" || transitionRecord.flowRating === "Smooth"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                            : transitionRecord.flowRating === "Decent"
                            ? "bg-blue-50 text-blue-800 border border-blue-100"
                            : "bg-rose-50 text-rose-800 border border-rose-100 animate-pulse"
                        }`}>
                          {transitionRecord.flowRating}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10.5px] text-[#88887e] py-3 leading-relaxed flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#5A5A40] shrink-0" />
                      <span>
                        Run global story flow analysis to critique the hand-offs between these chapters.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#fbfbf9]/40">
                    <button
                      onClick={() => onSelectChapter(ch.id)}
                      className="py-1.5 border border-[#efeee8] hover:bg-[#efeee8] text-[9.5px] text-gray-700 font-mono font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Edit Chapter {idx + 1}
                    </button>
                    <button
                      onClick={() => onSelectChapter(nextCh.id)}
                      className="py-1.5 border border-[#efeee8] hover:bg-[#efeee8] text-[9.5px] text-gray-700 font-mono font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Edit Chapter {idx + 2}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK INLINE LIST OF INDIVIDUAL ASSESSMENTS */}
      <div className="space-y-3">
        <h3 className="font-display font-medium text-xs text-[#1a1a15] uppercase tracking-widest border-b border-[#efeee8] pb-1">
          Individual Chapter Analytics Inventory
        </h3>
        <p className="text-[10px] text-[#88887e]">
          Review score metrics of each chapter. Click 'Run Analytics' to fill out missing reviews directly.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {story.chapters.map((ch, idx) => {
            const sensoryScore = ch.analytics?.sensoryScore;
            const pacingScore = ch.analytics?.pacingScore;
            const betaScore = ch.analytics?.betaScore;
            const overallScore = ch.analytics?.overallScore;
            const hasAnalysis = overallScore !== undefined;

            return (
              <div 
                key={ch.id} 
                className="bg-white border border-[#e5e5df] hover:border-[#5A5A40] rounded-xl p-4 space-y-3 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] font-extrabold uppercase text-[#88887e]">
                      Chapter {idx + 1}
                    </span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                      hasAnalysis 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {hasAnalysis ? "Review Loaded" : "Pending Review"}
                    </span>
                  </div>
                  <h4 className="font-sans text-xs font-bold text-[#1a1a15] truncate">
                    {ch.title}
                  </h4>
                </div>

                {hasAnalysis ? (
                  <div className="grid grid-cols-4 gap-1 text-center py-2.5 border-y border-[#fafaf8]">
                    <div className="space-y-0.5">
                      <span className="text-[8px] uppercase text-[#88887e] block font-mono">Sensory</span>
                      <span className="text-[10px] font-mono font-extrabold block text-[#33332d]">{sensoryScore}%</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] uppercase text-[#88887e] block font-mono">Pacing</span>
                      <span className="text-[10px] font-mono font-extrabold block text-[#33332d]">{pacingScore}%</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8px] uppercase text-[#88887e] block font-mono">Beta</span>
                      <span className="text-[10px] font-mono font-extrabold block text-[#33332d]">{betaScore}%</span>
                    </div>
                    <div className="space-y-0.5 bg-[#efeee8] rounded p-0.5">
                      <span className="text-[8px] uppercase text-[#5a5a40] block font-mono font-extrabold">Overall</span>
                      <span className="text-[10px] font-mono font-extrabold block text-[#5A5A40]">{overallScore}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-[10px] text-gray-400 font-mono italic">
                    Score variables unrendered.
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectChapter(ch.id)}
                    className="flex-1 py-1.5 bg-[#efeee8] hover:bg-[#ecece4] text-[#33332d] text-[10px] font-mono font-extrabold uppercase rounded-lg transition-colors cursor-pointer text-center block"
                  >
                    Open Canvas
                  </button>
                  <button
                    onClick={() => executeChapterAnalysis(ch.id)}
                    disabled={analyzingChapterId !== null || !ch.content.trim()}
                    className={`flex-1 py-1.5 text-[10px] font-mono font-extrabold uppercase rounded-lg transition-colors cursor-pointer text-center block ${
                      hasAnalysis 
                        ? "border border-dashed border-[#e5e5df] text-[#88887e] hover:bg-gray-50" 
                        : "bg-[#5A5A40] text-white hover:bg-[#4a4a35]"
                    }`}
                  >
                    {analyzingChapterId === ch.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
                    ) : hasAnalysis ? (
                      "Re-Analyze"
                    ) : (
                      "Analyze"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
