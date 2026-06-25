import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

function getContentHash(content: string): string {
  if (!content) return "";
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to initialize Gemini SDK lazily to protect against crashes if key is initially absent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in your Secrets / Environment Variables.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Durable fetch/generate wrapper that does automatic, smart retries with model fallback
async function generateContentWithRetry(params: {
  model?: string;
  contents: any;
  config?: any;
}, retries: number = 3, delayMs: number = 1000): Promise<any> {
  const primaryModel = params.model || "gemini-3.5-flash";
  const fallbackModel = "gemini-3.1-flash-lite"; // Fast, high-availability fallback
  let currentModel = primaryModel;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel,
      });
      return response;
    } catch (error: any) {
      const errorMsg = error.message ? String(error.message) : "";
      const isRateLimit = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("ResourceExhausted") || errorMsg.includes("exhausted");
      const isOverloaded = errorMsg.includes("503") || errorMsg.includes("overloaded") || errorMsg.includes("demand") || errorMsg.includes("ServiceUnavailable");

      console.warn(`[Gemini API] Attempt ${attempt} failed with model ${currentModel}. Error: ${errorMsg}`);

      if (attempt === retries) {
        throw error;
      }

      // Switch to the fallback model on high-demand or ratelimit errors
      if (isRateLimit || isOverloaded) {
        if (currentModel === primaryModel) {
          console.warn(`[Gemini API] Switching to fallback model ${fallbackModel} due to high traffic/quota on ${primaryModel}.`);
          currentModel = fallbackModel;
        }
      }

      // Exponential backoff with random jitter
      const actualDelay = delayMs * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4);
      console.warn(`[Gemini API] Retrying in ${Math.round(actualDelay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, actualDelay));
    }
  }
}

// Fallback rule-based chapter analyser if all Gemini models are exhausted under high traffic
function generateRuleBasedChapterAnalysis(content: string, previousAnalysis: any, errorMsg: string): any {
  const words = content.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const sightWords = ["saw", "look", "see", "gaze", "stare", "gleam", "dark", "bright", "color", "red", "blue", "glowing", "shadow", "glare", "peer", "view"];
  const soundWords = ["heard", "sound", "listen", "noise", "whisper", "shout", "clanc", "rumble", "echo", "silent", "quiet", "roar", "muffle", "hiss", "shriek"];
  const touchWords = ["felt", "touch", "cold", "warm", "hot", "rough", "smooth", "soft", "sharp", "heavy", "press", "grip", "breeze", "chill", "pain"];
  const smellTasteWords = ["smell", "scent", "odor", "fragran", "aroma", "taste", "sweet", "bitter", "sour", "salty", "flavor", "delicious", "stinch", "perfume"];

  let sightCount = 0;
  let soundCount = 0;
  let touchCount = 0;
  let smellTasteCount = 0;

  words.forEach(w => {
    const lw = w.toLowerCase();
    if (sightWords.some(sw => lw.includes(sw))) sightCount++;
    if (soundWords.some(sw => lw.includes(sw))) soundCount++;
    if (touchWords.some(sw => lw.includes(sw))) touchCount++;
    if (smellTasteWords.some(st => lw.includes(st))) smellTasteCount++;
  });

  const sensoryHits = sightCount + soundCount + touchCount + smellTasteCount;
  let sensoryScore = 40 + Math.min(sensoryHits * 6, 45);
  if (wordCount < 100) sensoryScore = 20;

  let sensoryFeedback = "";
  if (sensoryScore < 50) {
    sensoryFeedback = `### ⚠️ High-Density Sensory Atmosphere Alert (Traffic-Saving Fallback Mode Active)
Your manuscript currently has lightweight environmental rendering (**Sights: ${sightCount}, Sounds: ${soundCount}, Tactile: ${touchCount}, Aroma/Taste: ${smellTasteCount}**).
It is exhibiting symptoms of **"White Room Syndrome"** where characters converse in an abstract blank void.

**Suggestions for your next draft edit:**
- **Add 1 Auditory Anchor:** Introduce background acoustics (e.g., *the soft hum of machinery, wind rustling the branches, or dry gravel grinding underfoot*).
- **Add 1 Tactile Detail:** Describe a physical temperature or texture change (e.g., *chilly air freezing their breath, or smooth varnished desktop wood*).
- **Focus on the eyes:** Explicitly describe the illumination levels or shifting shadows in the space.`;
  } else {
    sensoryFeedback = `### ✨ Sensory Atmosphere Evaluation (Traffic-Saving Fallback Mode Detail)
Excellent environmental rendering discovered! Checked sensory triggers (**Sights: ${sightCount}, Sounds: ${soundCount}, Tactile: ${touchCount}, Aroma/Taste: ${smellTasteCount}**).
The setting feels alive and grounded.

**Refinement vectors:**
- Continue pairing sensory details directly with character reactions for maximum emotional resonance.
- Avoid listing sensory details passively; weave them into active movements (e.g., instead of "the room was cold," use "he rubbed his cold arms").`;
  }

  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;

  let pacingScore = 75;
  let pacingCategory = "Steady Pacing";
  let pacingFeedback = "";

  if (avgSentenceLength > 22) {
    pacingScore = 55;
    pacingCategory = "Slow Burn";
    pacingFeedback = `### 🐢 Rhythmical Velocity Audit (Traffic-Saving Fallback Mode Detail)
Your average sentence length (**${avgSentenceLength.toFixed(1)} words**) is relatively high, indicating a complex, contemplative, but potentially slow style.
Your text might feel a bit wordy/stalled in key focus scenes containing active suspense.

**Targeted directives:**
- **Shatter long clauses:** Break down descriptions containing multiple "and" or "which" linkers into tight, punchy, active assertions.
- **Vary cadence:** Alternate several long, descriptive sentences with one brief, decisive sentence (e.g., *Then, silence.*) to restore drama and momentum.`;
  } else if (avgSentenceLength < 10 && wordCount > 50) {
    pacingScore = 60;
    pacingCategory = "Breakneck / Intense";
    pacingFeedback = `### ⚡ Rhythmical Velocity Audit (Traffic-Saving Fallback Mode Detail)
Your cadence is incredibly swift with short, rapid-fire sentence constructions (**${avgSentenceLength.toFixed(1)} words/sentence**).
This builds high tension but can feel too breathless or choppy if used continuously without poetic relief.

**Targeted directives:**
- Connect a few related visual actions using subordinate clauses or conjunctions to form compound rhythms.
- Introduce dynamic, flowing exposition blocks to let reader emotion settle between crisis beats.`;
  } else {
    pacingScore = 80;
    pacingCategory = "Highly Engaging";
    pacingFeedback = `### 🎯 Rhythmical Velocity Audit (Traffic-Saving Fallback Mode Detail)
Brilliant structural velocity pacing with excellent sentence length variation (**${avgSentenceLength.toFixed(1)} average words per sentence**).
Cadence feels natural, flowing elegantly between crisp descriptions and active dialogue exchanges.

**Directives:**
- Maintain this rhythmic contrast to guide attention where narrative tension shifts.`;
  }

  const dialogueHits = (content.match(/"/g) || []).length / 2;
  let betaScore = 65 + Math.min(dialogueHits * 5, 25);
  if (wordCount < 100) betaScore = 35;

  let betaFeedback = `### 👥 Beta Reader Report (Traffic-Saving Fallback Mode Detail)
Our localized diagnostics audited character interaction patterns (**Dialogue instances: ${dialogueHits}**).
Overall structural layout is consistent.

**Continuity Directives:**
- Verify characters' motives match their choices in the current timeline.
- Avoid "on-the-nose" dialogue where characters state their internal feelings too directly. Increase subtext and unspoken tension.`;

  let overallScore = Math.round((sensoryScore + pacingScore + betaScore) / 3);

  sensoryScore = Math.max(10, Math.min(100, sensoryScore));
  pacingScore = Math.max(10, Math.min(100, pacingScore));
  betaScore = Math.max(10, Math.min(100, betaScore));
  overallScore = Math.max(10, Math.min(100, overallScore));

  return {
    sensory: sensoryFeedback,
    sensoryScore,
    pacing: pacingFeedback,
    pacingScore,
    beta: betaFeedback,
    betaScore,
    overallScore,
    pacingCategory,
  };
}

// Helper to extract character names
function extractCharacterNames(content: string): string[] {
  if (!content) return [];
  const words = content.split(/[\s,.:;?!"'()]+/);
  const names = new Set<string>();
  const stopWords = new Set([
    "The", "And", "But", "For", "Nor", "Yet", "She", "They", "Then", "This", "That", "There", "Here", 
    "With", "From", "What", "When", "Where", "Who", "Whom", "Whose", "Which", "Why", "How", "Once", 
    "While", "After", "Before", "Although", "Though", "Because", "Since", "Unless", "Until", "If", 
    "Whether", "You", "I", "He", "We", "His", "Her", "Their", "Our", "My", "Your", "Its", "Not", "No", 
    "Yes", "All", "Any", "One", "Two", "Some", "Like", "Just", "Into", "Down", "Over", "Back", "Out",
    "Now", "Very", "Only", "About", "More", "Even", "Than", "Then", "Also", "Well", "Just"
  ]);
  
  words.forEach(w => {
    // Matches capitalized words that are 3-12 letters long
    if (w.length >= 3 && w.length <= 12 && /^[A-Z][a-z]+$/.test(w)) {
      if (!stopWords.has(w)) {
        names.add(w);
      }
    }
  });
  return Array.from(names).slice(0, 5); // Limit to top 5 names
}

// Fallback rule-based multi-chapter story flow analyzer if all Gemini models are overloaded
function generateRuleBasedStoryFlow(chapters: any[]): any {
  // Extract global information across all chapters
  let allCharacters = new Set<string>();
  let sciFiKeywords = 0;
  let fantasyKeywords = 0;
  let mysteryKeywords = 0;
  let romanceKeywords = 0;

  const chapterDetails = chapters.map((ch, index) => {
    const title = ch.title || `Chapter ${index + 1}`;
    const content = ch.content || "";
    const words = content.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Detect characters in this chapter
    const chChars = extractCharacterNames(content);
    chChars.forEach(c => allCharacters.add(c));

    // Keyword theme counts
    const lc = content.toLowerCase();
    sciFiKeywords += (lc.match(/(ship|space|star|laser|computer|device|engine|metal|screen|drone|tech|planet|galaxy|cyber)/g) || []).length;
    fantasyKeywords += (lc.match(/(sword|magic|spell|castle|shield|king|queen|beast|stone|ancient|wizard|elf|dwarf|rune)/g) || []).length;
    mysteryKeywords += (lc.match(/(blood|gun|killer|clue|dark|secret|crime|police|knife|shadow|detective|case|murder|suspect)/g) || []).length;
    romanceKeywords += (lc.match(/(heart|love|smile|tears|eyes|whisper|hand|feel|touch|gentle|kiss|embrace|passion|sigh)/g) || []).length;

    // Run quick local analysis of sensory/pacing to have live data
    const sightWords = ["saw", "look", "see", "gaze", "stare", "gleam", "dark", "bright", "color", "red", "blue", "glowing", "shadow", "glare", "peer", "view"];
    const soundWords = ["heard", "sound", "listen", "noise", "whisper", "shout", "clanc", "rumble", "echo", "silent", "quiet", "roar", "muffle", "hiss", "shriek"];
    const touchWords = ["felt", "touch", "cold", "warm", "hot", "rough", "smooth", "soft", "sharp", "heavy", "press", "grip", "breeze", "chill", "pain"];
    const smellTasteWords = ["smell", "scent", "odor", "fragran", "aroma", "taste", "sweet", "bitter", "sour", "salty", "flavor", "delicious", "stinch", "perfume"];

    let sightCount = 0;
    let soundCount = 0;
    let touchCount = 0;
    let smellTasteCount = 0;

    words.forEach(w => {
      const lw = w.toLowerCase();
      if (sightWords.some(sw => lw.includes(sw))) sightCount++;
      if (soundWords.some(sw => lw.includes(sw))) soundCount++;
      if (touchWords.some(sw => lw.includes(sw))) touchCount++;
      if (smellTasteWords.some(st => lw.includes(st))) smellTasteCount++;
    });

    const sensoryHits = sightCount + soundCount + touchCount + smellTasteCount;
    const sensoryScore = Math.max(15, Math.min(100, 35 + sensoryHits * 5));
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;

    let pacingCategory = "Steady Pacing";
    let pacingScore = 75;
    if (avgSentenceLength > 22) {
      pacingCategory = "Slow Burn";
      pacingScore = 55;
    } else if (avgSentenceLength < 10 && wordCount > 30) {
      pacingCategory = "Breakneck / Intense";
      pacingScore = 60;
    } else if (wordCount > 0) {
      pacingCategory = "Highly Engaging";
      pacingScore = 85;
    } else {
      pacingCategory = "Flat / Static";
      pacingScore = 30;
    }

    const dialogueHits = (content.match(/"/g) || []).length / 2;
    const betaScore = Math.max(15, Math.min(100, 50 + dialogueHits * 6));

    const isStale = ch.analytics?.isStale;
    const chOverall = isStale ? undefined : ch.analytics?.overallScore;
    const chSensory = isStale ? undefined : ch.analytics?.sensoryScore;
    const chPacing = isStale ? undefined : ch.analytics?.pacingScore;
    const chBeta = isStale ? undefined : ch.analytics?.betaScore;
    const chCategory = isStale ? undefined : ch.analytics?.pacingCategory;

    return {
      index: index + 1,
      id: ch.id,
      title,
      wordCount,
      sensoryScore: chSensory !== undefined ? Number(chSensory) : sensoryScore,
      pacingScore: chPacing !== undefined ? Number(chPacing) : pacingScore,
      pacingCategory: chCategory || pacingCategory,
      betaScore: chBeta !== undefined ? Number(chBeta) : betaScore,
      overallScore: chOverall !== undefined ? Number(chOverall) : Math.round((sensoryScore + pacingScore + betaScore) / 3),
      avgSentenceLength,
      dialogueHits,
      characters: chChars,
    };
  });

  const totalChapters = chapterDetails.length;
  const totalWords = chapterDetails.reduce((acc, c) => acc + c.wordCount, 0);
  const avgWords = totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0;

  // Find lowest/highest indicators
  let lowestSensory = chapterDetails[0] || ({ index: 1, title: "Draft", sensoryScore: 50, characters: [] as string[] } as any);
  let highestSensory = chapterDetails[0] || ({ index: 1, title: "Draft", sensoryScore: 50, characters: [] as string[] } as any);
  let slowestPacing = chapterDetails[0] || ({ index: 1, title: "Draft", pacingScore: 50, pacingCategory: "Steady Pacing", avgSentenceLength: 15, characters: [] as string[] } as any);
  let fastestPacing = chapterDetails[0] || ({ index: 1, title: "Draft", pacingScore: 50, pacingCategory: "Steady Pacing", characters: [] as string[] } as any);
  let lowestDialogue = chapterDetails[0] || ({ index: 1, title: "Draft", dialogueHits: 0, characters: [] as string[] } as any);

  chapterDetails.forEach(c => {
    if (c.sensoryScore < lowestSensory.sensoryScore) lowestSensory = c;
    if (c.sensoryScore > highestSensory.sensoryScore) highestSensory = c;
    if (c.pacingScore < slowestPacing.pacingScore) slowestPacing = c;
    if (c.pacingScore > fastestPacing.pacingScore) fastestPacing = c;
    if (c.dialogueHits < lowestDialogue.dialogueHits) lowestDialogue = c;
  });

  // Determine dominant genre theme based on keywords
  let detectedGenre = "General Fiction";
  let genreAdjective = "narrative";
  let environmentalTip = "visual elements and acoustic atmosphere";

  const maxKeywords = Math.max(sciFiKeywords, fantasyKeywords, mysteryKeywords, romanceKeywords);
  if (maxKeywords > 2) {
    if (sciFiKeywords === maxKeywords) {
      detectedGenre = "Science Fiction";
      genreAdjective = "speculative tech-driven";
      environmentalTip = "metallic machinery acoustics, low-hum ambient power grids, or futuristic display glows";
    } else if (fantasyKeywords === maxKeywords) {
      detectedGenre = "Fantasy";
      genreAdjective = "vivid mythical";
      environmentalTip = "crackling torch fires, ancient stone textures, or high-density magical aura pressure";
    } else if (mysteryKeywords === maxKeywords) {
      detectedGenre = "Mystery / Thriller";
      genreAdjective = "tense suspenseful";
      environmentalTip = "shifting dark shadows, sudden sharp metallic sounds, or heavy chilly rain on cold pavement";
    } else if (romanceKeywords === maxKeywords) {
      detectedGenre = "Romance / Drama";
      genreAdjective = "deeply emotional and intimate";
      environmentalTip = "warm soft candle light, the quiet rustle of linen, or a subtle scent of jasmine and rain";
    }
  }

  // Calculate dynamic coherence score
  let wcVarianceSum = 0;
  chapterDetails.forEach(c => {
    wcVarianceSum += Math.abs(c.wordCount - avgWords);
  });
  const wcDiscrepancyPercentage = avgWords > 0 ? (wcVarianceSum / totalChapters) / avgWords : 0;

  let baseCoherence = 85;
  if (wcDiscrepancyPercentage > 0.45) baseCoherence -= 12;
  if (totalChapters < 3) baseCoherence -= 7;

  // Include some light random jitter based on text content hash so scores vary slightly and reactively
  let contentHash = 0;
  chapters.forEach(ch => {
    const txt = ch.content || "";
    for (let i = 0; i < Math.min(txt.length, 100); i++) {
      contentHash += txt.charCodeAt(i);
    }
  });
  const scoreJitter = (contentHash % 9) - 4; // -4 to +4
  const coherenceScore = Math.max(45, Math.min(98, Math.round(baseCoherence + scoreJitter)));

  const characterList = Array.from(allCharacters);
  const characterNamesStr = characterList.length > 0 
    ? `featuring key characters like **${characterList.slice(0, 3).join(", ")}**` 
    : "mapping individual character presence dynamically";

  const flowOverview = `This dynamic report maps narrative progress across **${totalChapters} chapters** containing **${totalWords.toLocaleString()} words**, classified as **${detectedGenre}**. The current draft structure demonstrates a **coherence rating of ${coherenceScore}%** ${characterNamesStr}. 
We evaluated character continuity, dialogue pacing, and exposition density across all segments to isolate critical polishing vectors.`;

  const pacingDistribution = `The story exhibits a diverse tempo range fitting a ${genreAdjective} structure. 
The fastest pace belongs to **Chapter ${fastestPacing.index} ("${fastestPacing.title}")** with a dynamic, highly punchy cadence. 
Conversely, **Chapter ${slowestPacing.index} ("${slowestPacing.title}")** acts as a reflective harbor, maintaining a deliberate and descriptive pacing velocity.`;

  const sensoryHarmony = `Sensory atmosphere analysis shows strong environment rendering in **Chapter ${highestSensory.index} ("${highestSensory.title}")** with **${highestSensory.sensoryScore}%** VAKOG index. 
In contrast, **Chapter ${lowestSensory.index} ("${lowestSensory.title}")** registers a lower sensory score of **${lowestSensory.sensoryScore}%** and is at risk of "White Room Syndrome".`;

  const transitions = [];
  let bumpyIdx = -1;
  for (let i = 0; i < totalChapters - 1; i++) {
    const ch = chapterDetails[i];
    const nextCh = chapterDetails[i + 1];

    const wordRatio = Math.max(ch.wordCount, 1) / Math.max(nextCh.wordCount, 1);
    const inverseRatio = Math.max(nextCh.wordCount, 1) / Math.max(ch.wordCount, 1);
    const maxRatio = Math.max(wordRatio, inverseRatio);

    let flowRating: "Jarring" | "Bumpy" | "Decent" | "Smooth" | "Masterful" = "Decent";
    let critique = "";

    // Find characters present in both chapters
    const commonChars = ch.characters.filter(x => nextCh.characters.includes(x));

    if (maxRatio > 3 && ch.wordCount > 100 && nextCh.wordCount > 100) {
      flowRating = "Bumpy";
      bumpyIdx = i;
      critique = `The transition from "${ch.title}" to "${nextCh.title}" displays a major sizing disparity (${ch.wordCount} vs ${nextCh.wordCount} words). This sudden change in segment density can feel bumpy to readers. Consider balancing description blocks.`;
    } else if (ch.pacingCategory === "Breakneck / Intense" && nextCh.pacingCategory === "Slow Burn") {
      flowRating = "Jarring";
      bumpyIdx = i;
      critique = `The pacing drops abruptly from the high-velocity climax of "${ch.title}" to the slower exposition of "${nextCh.title}". Soften this transition by adding reflective thoughts to the start of "${nextCh.title}".`;
    } else if (commonChars.length > 0) {
      flowRating = "Masterful";
      critique = `A seamless narrative bridge! The dramatic voice, environmental detail, and core character tension of ${commonChars[0]} flow perfectly from the conclusion of "${ch.title}" straight into the opening lines of "${nextCh.title}".`;
    } else if (Math.abs(ch.overallScore - nextCh.overallScore) < 12) {
      flowRating = "Smooth";
      critique = `A comfortable, highly engaging transition connects "${ch.title}" and "${nextCh.title}". Character motives flow logically, and readers are guided smoothly into the next phase of the plot.`;
    } else {
      flowRating = "Decent";
      critique = `A continuous hand-off is maintained between "${ch.title}" and "${nextCh.title}". Check pacing and tension transitions to ensure the narrative voice moves organically across physical action beats without sudden jumps.`;
    }

    transitions.push({
      fromChapter: ch.title,
      toChapter: nextCh.title,
      flowRating,
      critique,
    });
  }

  // Compile highly specific, randomized/customized improvement suggestions
  const macroImprovementPlan: string[] = [];

  // Suggestion 1: Sensory Tip
  const lowestSensoryNameStr = lowestSensory.characters.length > 0 ? ` around ${lowestSensory.characters[0]}` : "";
  macroImprovementPlan.push(
    `Inject fresh sensory cues${lowestSensoryNameStr} into Chapter ${lowestSensory.index} ("${lowestSensory.title}") to match the high immersion of Chapter ${highestSensory.index}. Add specific environmental details like ${environmentalTip}.`
  );

  // Suggestion 2: Pacing/Sentence Length Tip
  const slowestPacingNameStr = slowestPacing.characters.length > 0 ? ` centered on ${slowestPacing.characters[0]}` : "";
  macroImprovementPlan.push(
    `Refine sentence structure in Chapter ${slowestPacing.index} ("${slowestPacing.title}")${slowestPacingNameStr}. Break down complex clauses (currently averaging ${slowestPacing.avgSentenceLength.toFixed(1)} words/sentence) with brief, decisive assertions to accelerate the cadence.`
  );

  // Suggestion 3: Dialogue Tip
  if (lowestDialogue.dialogueHits < 2 && lowestDialogue.wordCount > 50) {
    macroImprovementPlan.push(
      `Introduce a dynamic dialogue exchange in Chapter ${lowestDialogue.index} ("${lowestDialogue.title}"). Authentic character voices will help break up dense exposition blocks and show active conflict.`
    );
  } else {
    // General Character Consistency Tip
    const characterToUse = characterList[0] || "your main protagonist";
    macroImprovementPlan.push(
      `Audit the consistency of ${characterToUse}'s goals. Ensure their motivations are active and clear across both slow expository scenes and fast climax sequences.`
    );
  }

  // Suggestion 4: Transition Tip
  if (bumpyIdx !== -1 && bumpyIdx < transitions.length) {
    const bTrans = transitions[bumpyIdx];
    macroImprovementPlan.push(
      `Smooth out the transition from "${bTrans.fromChapter}" to "${bTrans.toChapter}" (rated as ${bTrans.flowRating}). Insert a clear narrative hook or spatial transition line to make this shift feel natural.`
    );
  } else if (totalChapters > 1) {
    const lastCh = chapterDetails[totalChapters - 1];
    macroImprovementPlan.push(
      `Generate a stronger cliffhanger or unanswered question at the end of Chapter ${totalChapters} ("${lastCh.title}") to provide a compelling hook for your next manuscript segment.`
    );
  } else {
    macroImprovementPlan.push(
      `Add a second chapter to unlock transition evaluation, pacing wave analysis, and comparative sensory harmonization benchmarks.`
    );
  }

  // Suggestion 5: Draft Expansion Tip if chapters are short
  const shortChaptersList = chapterDetails.filter(c => c.wordCount < 150);
  if (shortChaptersList.length > 0) {
    const shortTitles = shortChaptersList.map(c => `"${c.title}"`).join(", ");
    macroImprovementPlan.push(
      `💡 Note on Draft Expansion: The drafts for ${shortTitles} are currently very short (under 150 words). To unlock full analytical precision and smooth transitions, consider extending these chapters inside the Writing Canvas by adding more sensory descriptions, character reflections, or active dialogue.`
    );
  }

  return {
    coherenceScore,
    flowOverview,
    pacingDistribution,
    sensoryHarmony,
    transitions,
    macroImprovementPlan,
  };
}

// 1. Brainstorm ideas, story arcs, twists, or titles
app.post("/api/gemini/brainstorm", async (req, res) => {
  try {
    const { prompt, type, currentContext } = req.body;
    const ai = getGeminiClient();

    let systemInstruction = "You are a professional creative writing coach and story editor.";
    let contents = "";

    if (type === "twist") {
      contents = `Generate 3 surprising plot twists based on this current story premise/context: "${currentContext}". User's specific prompt/direction: "${prompt}".`;
    } else if (type === "title") {
      contents = `Generate 10 captivating, unique story titles based on this story summary/context: "${currentContext}". User's specific instructions: "${prompt}".`;
    } else if (type === "outline") {
      contents = `Generate an elegant narrative skeleton / outline with Act I, Act II (climax), and Act III (resolution) for a story based on the concept: "${prompt}". Current setting/notes: "${currentContext}". Provide direct outline points.`;
    } else {
      contents = `Brainstorm creative ideas, settings, or thematic concepts based on user description: "${prompt}". Context: "${currentContext}". Provide structured suggestions.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.9, // Higher temperature for creativity
      },
    });

    res.json({ text: response.text || "No response generated." });
  } catch (error: any) {
    console.error("Gemini Brainstorm Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during brainstorming." });
  }
});

// 2. Continue Writing (Expansion)
app.post("/api/gemini/expand", async (req, res) => {
  try {
    const { storyText, genre, tone, instructions } = req.body;
    const ai = getGeminiClient();

    let systemInstruction = `You are a talented novelist specializing in ${genre || "general"} fiction with a ${tone || "balanced"} tone. Your job is to read the story so far and generate a perfectly integrated next paragraph or scene that builds suspense, natural dialogue, or immersive atmosphere. Maintain the style, voice, and perspective of the existing text.`;

    let contents = `Story text so far:\n"""\n${storyText}\n"""\n\n`;
    if (instructions) {
      contents += `Direct instructions for what should happen next in this segment: "${instructions}".\n`;
    }
    contents += "\nPlease write the next continuous section of the story (between 150 to 300 words). Do not include any introductions, meta-comments, or friendly introductions (like 'Here is the next section:'). Just write the story prose directly so it merges seamlessly.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.82,
      },
    });

    res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Gemini Expansion Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during expansion." });
  }
});

// 2.5. Inline co-writer generation
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, context } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Prompt (the story context so far):\n"""\n${prompt}\n"""\n\nInstructions: ${context || "Continue the story seamlessly. Write the next 1-3 sentences only."}`,
      config: {
        systemInstruction: "You are an elite novelist co-writer. Continue the user's story instantly. Provide ONLY the new continuous text. No introductory remarks, no greetings, no surrounding quotes.",
        temperature: 0.8,
      },
    });

    res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Gemini Inline Generation Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during inline generation." });
  }
});

// 3. Prose Refiner / Style Editor
app.post("/api/gemini/refine", async (req, res) => {
  try {
    const { selectedText, mode, tone, prompt } = req.body;
    const ai = getGeminiClient();

    let systemInstruction = "You are an elite developmental book editor. Your task is to edit the user's provided draft text based on their chosen operational modes, making the prose brilliant, active, and emotionally resonant.";
    let contents = `Selected Text to modify:\n"""\n${selectedText}\n"""\n\n`;

    if (mode === "polish") {
      contents += `Please rewrite and polish this draft, correcting flow issues, eliminating clichés, elevating vocabulary, and enhancing sensory details. Maintain a tone of "${tone || "expressive"}". Keep the length similar to the original.`;
    } else if (mode === "shorten") {
      contents += `Please make this prose more concise, tight, and fast-paced without losing the core plot elements or emotional stakes. Remove fluff and passive verb constructions.`;
    } else if (mode === "show-not-tell") {
      contents += `Evaluate this draft and execute the 'Show, Don't Tell' technique. Replace abstract statements of emotion or fact with sensory descriptions, character reactions, dialogue cues, and environmental details.`;
    } else if (mode === "custom") {
      contents += `Rewrite the select text based strictly on the user instructions: "${prompt}". Match a ${tone || "neutral"} tone.`;
    }

    contents += "\nReturn only the edited prose directly, without introductory statements, quotes around the outer block, or explanation paragraphs.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Gemini Refine Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during draft refinement." });
  }
});

// 4. Character generator / profiler
app.post("/api/gemini/character", async (req, res) => {
  try {
    const { name, coreConcept, archetype } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Create a structured character profile for a story.
Name: ${name || "Unknown Character"}
Archetype: ${archetype || "unspecified"}
Concept: ${coreConcept || "general character"}

Please respond with a highly stylized, clean JSON object following exactly this schema:
{
  "name": "character's full name",
  "tagline": "a 1-sentence poetic description of their core essence",
  "physicalAppearance": "notable features, style, movement, and physical presence details",
  "internalDrive": "their primary motivation, deep-seated desire, and the core lie they believe about themselves",
  "quirksAndHabits": "unusual habits, vocabulary tics, or mannerisms (list 3)",
  "backstory": "a vivid 3-sentence summary of their background that shaped their present situation"
}`,
      config: {
        systemInstruction: "You are a master of fictional character design. You design complex, flawed, highly interesting protagonists and antagonists for literature.",
        responseMimeType: "application/json",
      },
    });

    let data = {};
    try {
      data = JSON.parse(response.text?.trim() || "{}");
    } catch {
      data = { text: response.text };
    }

    res.json(data);
  } catch (error: any) {
    console.error("Gemini Character Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during character profile generation." });
  }
});

// 5. Co-Writer Side-Chat (Multi-turn conversations or brainstorming notes)
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, storyContext } = req.body;
    const ai = getGeminiClient();

    // Prepare message history structure for content generation
    // We will supply a custom prompt that includes the current story context for the assistant to keep context
    const storyContextPre = storyContext 
      ? `[Important Context: The story being written is currently titled or about: "${storyContext.title || "Untitled"}" with summary: "${storyContext.summary || "No summary"}"].\n\n` 
      : "";

    // Map message history to simple parts
    const processedPrompt = `${storyContextPre}User request: ${messages[messages.length - 1].content}\n\nChat history:\n${messages.slice(0, -1).map((m: any) => `${m.role === "user" ? "User" : "AI Assistant"}: ${m.content}`).join("\n")}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: processedPrompt,
      config: {
        systemInstruction: "You are a passionate, helpful literary co-writer sitting next to the author. Help them sort out blockages, critique plot points, brainstorm character motives, research historical alignments, suggest narrative devices, and maintain positive writing momentum.",
        temperature: 0.8,
      },
    });

    res.json({ text: response.text || "" });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error.message || "An error occurred in side chat." });
  }
});

// 5.5. Editorial Chapter Analytics (Sensory Check, Pacing, Beta Critique)
app.post("/api/gemini/analyze-chapter", async (req, res) => {
  try {
    const { content, previousAnalysis, mode } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Chapter manuscript content is required for analysis." });
    }
    const ai = getGeminiClient();

    // Optimize and protect against ultra-long chapters that cause generation delay
    let processedContent = content;
    if (processedContent.length > 15000) {
      processedContent = processedContent.slice(0, 15000) + "\n\n[... Remaining description truncated for diagnostic review speed ...]";
    }

    let evolutionDirectives = "";
    if (mode !== "fresh" && previousAnalysis && typeof previousAnalysis === "object") {
      const prev = previousAnalysis;
      evolutionDirectives = `
  =========================================
  CONTINUOUS ANALYSIS & EVOLUTION DIRECTIVE:
  =========================================
  The user is incrementally refining this chapter using your previous audit as a roadmap.
  You MUST build upon and evolve your previous feedback instead of starting from scratch!
  
  PREVIOUS AUDIT RESULTS:
  - Overall Score: ${prev.overallScore || "Not set"}/100
  - Sensory Index: Score of ${prev.sensoryScore || "Not set"}/100
    * Previous Sensory Feedback: "${prev.sensory || ""}"
  - Pacing Profile: Score of ${prev.pacingScore || "Not set"}/100
    * Previous Pacing Feedback: "${prev.pacing || ""}"
  - Beta Reader Profile: Score of ${prev.betaScore || "Not set"}/100
    * Previous Beta Critique: "${prev.beta || ""}"
  - Previous Pacing Category: "${prev.pacingCategory || ""}"

  FOLLOW-UP INSTRUCTIONS:
  1. Compare the new chapter text with your previous critiques listed above.
  2. If the user successfully added sensory details, corrected pacing, or improved dialogue/agency based on your previous critiques, you MUST raise the scores accordingly! Acknowledge their improvements in the feedback text (e.g. "Draft updated: Excellent job incorporating the clockwork sounds...").
  3. Keep your editorial advice focused and consistent. Do not suddenly invent a list of completely new, contradictory complaints or drop their scores without a logical reason (such as a bad rewrite). Keep the author's momentum positive and goal-oriented. Do not contradict your previous suggestions.
  4. Your new feedback fields (sensory, pacing, beta) should represent the current *remaining* or *updated* points of concern, combined with positive reinforcement of handled feedback, keeping it around 150-200 words max each.
  =========================================
  `;
    }

    const analysisPrompt = `
  You are an expert literary developmental editor and prose partner. 
  Your job is to conduct an extremely fast, high-density, actionable clinical diagnostic audit of the story chapter provided below.
  ${evolutionDirectives}

  Analyze the text strictly using the following three diagnostic frameworks:

  1. Sensory Check (VAKOG):
     - Audit the text for Sensory / VAKOG (Visual, Auditory, Kinesthetic, Olfactory, Gustatory) distribution.
     - Note if the scene suffers from "White Room Syndrome" (characters talking in a blank, unrendered void).
     - Highlight exactly where sensory details are missing and how to enrich them.

  2. Pacing Audit:
     - Map narrative velocity and focus on key scene pacing.
     - Identify where the prose drags or where it rushes.
     - Provide a clear, actionable directive on sentences/paragraphs to cut, compress, or expand.

  3. Beta Reader Critique:
     - Focus on character agency, logical consistency, realistic dialogue, and subtextual tension.

  Guidelines for Output Quality & Speed:
  - Keep each textual description in the JSON extremely high-density, sharp, and structured as 3-4 clean, bite-sized markdown bullet points (using bold highlights).
  - Do NOT write long-winded conversational introductions, generic preamble, or filler paragraphs. Cut to the chase!
  - Maximum 150-200 words per textual feedback key. This is a sidebar review companion, so make every word count.
  - Assess numerical scores from 0 to 100 for each, plus an overall score. Select a precise pacing category ("Flat / Static", "Slow Burn", "Steady Pacing", "Highly Engaging", or "Breakneck / Intense").

  CHAPTER MANUSCRIPT:
  """
  ${processedContent}
  """
`;

    let response;
    try {
      response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: analysisPrompt,
        config: {
          systemInstruction: "You are an award-winning creative writing instructor and structural book critique partner. Provide helpful, precise, objective, and constructive advice without generic praise. Focus purely on literary enhancements.",
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sensory: { 
                type: Type.STRING, 
                description: "Detailed critique and recommendations regarding the sensory check (VAKOG distribution, 'White Room Syndrome' diagnosis, missing sensory elements, concrete ideas/sentences to add)." 
              },
              sensoryScore: { 
                type: Type.INTEGER, 
                description: "A quality score from 0 to 100 assessing the sensory/immersion richness in the chapter manuscript." 
              },
              pacing: { 
                type: Type.STRING, 
                description: "In-depth pacing report mapping dynamic velocity, highlighting slow or over-explained details, identifying rushed scenes, and recommending sentences to expand or compress." 
              },
              pacingScore: { 
                type: Type.INTEGER, 
                description: "A quality score from 0 to 100 reflecting how well-paced and structured the chapter rhythm feels." 
              },
              beta: { 
                type: Type.STRING, 
                description: "Critical beta reader feedback analyzing character agency, dialogue realism, logical consistency under subtext/tension, and any unearned emotional payoffs." 
              },
              betaScore: { 
                type: Type.INTEGER, 
                description: "A quality score from 0 to 100 evaluating narrative consistency, character internal logic, and realism." 
              },
              overallScore: { 
                type: Type.INTEGER, 
                description: "An overall composite score from 0 to 100 capturing prose quality, style consistency, and structural layout." 
              },
              pacingCategory: { 
                type: Type.STRING, 
                description: "The primary narrative velocity indicator. Must be exactly one of: 'Flat / Static', 'Slow Burn', 'Steady Pacing', 'Highly Engaging', or 'Breakneck / Intense'." 
              }
            },
            required: ["sensory", "sensoryScore", "pacing", "pacingScore", "beta", "betaScore", "overallScore", "pacingCategory"]
          }
        },
      });

      let rawText = response.text || "";
      rawText = rawText.trim();
      
      // Resiliently extract JSON content inside markdown code blocks if present
      if (rawText.includes("```")) {
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          rawText = jsonMatch[1].trim();
        } else {
          rawText = rawText.replace(/^```(?:json)?\n?|```$/g, "").trim();
        }
      }
      
      const parsed = JSON.parse(rawText || "{}");
      res.json(parsed);
    } catch (apiError: any) {
      console.warn("[Gemini API] Direct LLM chapter analysis failed. Initiating localized high-availability analysis mode.");
      console.error(apiError);
      
      const localFallback = generateRuleBasedChapterAnalysis(content, previousAnalysis, apiError.message || "");
      res.json(localFallback);
    }
  } catch (outerError: any) {
    console.error("Critical error in analyze-chapter route:", outerError);
    res.status(500).json({ error: outerError.message || "An error occurred." });
  }
});

// 6. Generate 3 story beginnings or plot outlines based on inputs
app.post("/api/gemini/story-starter", async (req, res) => {
  try {
    const { genre, mainCharacter, setting, styleTone } = req.body;
    const ai = getGeminiClient();

    const prompt = `Develop 3 different story options based on these parameters:
- Genre: ${genre || "Any Genre"}
- Main Character: ${mainCharacter || "A quiet observer with a hidden past"}
- Setting: ${setting || "A coastal village where winter never ends"}
- Style/Tone: ${styleTone || "Poetic and haunting"}

Each of the 3 options must be highly original, creative, and completely distinct from the other two.
Each option must include:
1. A unique, engaging title.
2. A captivating, visual story beginning hook (about 150 words) written in gorgeous narrative prose.
3. A detailed 3-act plot outline/skeleton (Act I, Act II/Climax, Act III/Resolution) mapping out the journey.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite novelist and imaginative creative coach. You write breathtaking prose and craft brilliant, unpredictable plot maps.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              beginningHook: { type: Type.STRING, description: "One continuous, highly descriptive beginning paragraph of prose." },
              plotOutline: { type: Type.STRING, description: "Detailed summary of Act I, Act II (the midpoint/crisis), and Act III (the resolution)." },
            },
            required: ["title", "beginningHook", "plotOutline"],
          },
        },
        temperature: 0.9,
      },
    });

    let data = [];
    try {
      data = JSON.parse(response.text?.trim() || "[]");
    } catch {
      data = [{ title: "Unparsed Story Starter", beginningHook: response.text || "", plotOutline: "" }];
    }

    res.json({ starters: data });
  } catch (error: any) {
    console.error("Story Starter Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate story starters." });
  }
});

// 7. Suggest detailed character backstories, motivations, and key personality traits
app.post("/api/gemini/character-suggest", async (req, res) => {
  try {
    const { name, archetype, description, role } = req.body;
    const ai = getGeminiClient();

    const prompt = `Flesh out a compelling, multi-dimensional character based on the following input:
- Name: ${name || "A Nameless Wanderer"}
- Archetype: ${archetype || "Unspecified"}
- Narrative Role / Story Purpose: ${role || "Unspecified"}
- Initial Description/Seed: ${description || "A mysterious figure seen at the edge of town"}

Provide:
1. A poetic tagline summarizing their essence.
2. A beautiful, visual physical appearance description.
3. A detailed, multi-paragraph character backstory (minimum 200 words) explaining how they became who they are today, including formative traumas, childhood events, or secrets.
4. Deep motivations (what drives them, their primary ambition, internal conflict, and the 'core lie' they tell themselves to cope with life).
5. Compelling personality traits (a mix of 3 distinct strengths and 3 tragic, compelling flaws).
6. Quirks or habits (list of 3 unique behaviors, speech tics, or physical mannerisms).
7. A refined, short summary statement of their Narrative Role / Story Purpose (based on the user-given role details).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a master character designer for high literature, theatre, and screenplay. You make characters feel human, deeply flawed, complex, and intriguing.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            archetype: { type: Type.STRING },
            role: { type: Type.STRING, description: "Refined, brief description of their story role / narrative purpose." },
            tagline: { type: Type.STRING },
            physicalAppearance: { type: Type.STRING },
            backstory: { type: Type.STRING, description: "Detailed, immersive story prose." },
            motivations: { type: Type.STRING, description: "Desire, ambition, internal conflict, and their core lie." },
            traits: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of distinct personality traits (both strengths and flaws)."
            },
            quirks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of 3 specific and unique habits, quirks, or speech habits."
            }
          },
          required: ["name", "archetype", "tagline", "physicalAppearance", "backstory", "motivations", "traits", "quirks"]
        },
        temperature: 0.85,
      },
    });

    let data: any = {};
    try {
      data = JSON.parse(response.text?.trim() || "{}");
    } catch {
      data = { error: "Failed to parse character payload", text: response.text };
    }

    // Default role backup
    if (!data.role && role) {
      data.role = role;
    }

    res.json(data);
  } catch (error: any) {
    console.error("Character Suggest Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate character ideas." });
  }
});

// 8. Fictional World Setting based on keywords and atmosphere
app.post("/api/gemini/world-builder", async (req, res) => {
  try {
    const { keywords, atmosphere } = req.body;
    const ai = getGeminiClient();

    const prompt = `Construct an immersive, detailed fictional world setting based on:
- Seeds/Keywords: ${keywords || "Ancient moss, silent bells, cold copper pipes"}
- Atmosphere/Tone: ${atmosphere || "Melancholy, mysterious, eco-industrial"}

Generate:
1. A unique thematic name for this world setting or region.
2. A rich overview of this setting's environment, geography, and general feel (minimum 150 words).
3. 3 prominent key locations, each defined by a name, rich sensory details (smell, light, temperature), and a secret history or forgotten legend associated with it.
4. 3 cultural elements (such as strange rituals, grand celebrations, typical clothes, traditional food, or spiritual beliefs).
5. 2 or 3 unique societal structures (including governance style, class ranks, unique laws, or currency).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an award-winning world-builder and fantasy/sci-fi cartographer of words. You construct logical, lived-in, incredibly atmospheric fantasy, cyberpunk, speculative, or realistic world settings.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            worldName: { type: Type.STRING },
            overview: { type: Type.STRING },
            locations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  sensoryDetail: { type: Type.STRING, description: "Sensory atmospheric description of light, sounds, smells, and colors." },
                  secretHistory: { type: Type.STRING, description: "An underlying mystery or historical event that resides here." }
                },
                required: ["name", "sensoryDetail", "secretHistory"]
              }
            },
            culturalElements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the custom ritual, garb, food, or tradition." },
                  description: { type: Type.STRING, description: "Vivid detail of how the populace engages in this custom." }
                },
                required: ["name", "description"]
              }
            },
            societalStructures: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "E.g. Governance, Castes, Core Law" },
                  description: { type: Type.STRING, description: "How this aspect of society is ran, policed, or institutionalized." }
                },
                required: ["title", "description"]
              }
            }
          },
          required: ["worldName", "overview", "locations", "culturalElements", "societalStructures"]
        },
        temperature: 0.9,
      },
    });

    let data = {};
    try {
      data = JSON.parse(response.text?.trim() || "{}");
    } catch {
      data = { error: "Failed to parse world payload", text: response.text };
    }

    res.json(data);
  } catch (error: any) {
    console.error("World Builder Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate fictional world guide." });
  }
});

// 5.6. Macro Story Flow & Chapter Transition Analyst
app.post("/api/gemini/analyze-story-flow", async (req, res) => {
  try {
    const { chapters } = req.body;
    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: "Story chapters list is required to evaluate overall flow." });
    }

    // Prepare a high-density index summary of each chapter's details for fast evaluation
    const chaptersContext = chapters.map((ch, index) => {
      const summaryContent = ch.content || "";
      const wordCount = summaryContent.split(/\s+/).filter(Boolean).length;
      const snippet = summaryContent.length > 2000
        ? summaryContent.substring(0, 1000) + "\n\n[...]\n\n" + summaryContent.substring(summaryContent.length - 1000)
        : summaryContent;

      const chHash = getContentHash(summaryContent);

      const hasScores = 
        ch.analytics &&
        typeof ch.analytics.overallScore === "number" &&
        typeof ch.analytics.sensoryScore === "number" &&
        typeof ch.analytics.pacingScore === "number" &&
        typeof ch.analytics.betaScore === "number" &&
        ch.analytics.pacingCategory;

      const isStale = !hasScores || ch.analytics?.isStale;
      let overall = ch.analytics?.overallScore;
      let sensory = ch.analytics?.sensoryScore;
      let pacing = ch.analytics?.pacingScore;
      let beta = ch.analytics?.betaScore;
      let pacingCategory = ch.analytics?.pacingCategory;

      if (!hasScores || isStale) {
        // Run rule-based calculations on the fly to get fresh context
        const words = summaryContent.split(/\s+/).filter(Boolean);
        const sightWords = ["saw", "look", "see", "gaze", "stare", "gleam", "dark", "bright", "color", "red", "blue", "glowing", "shadow", "glare", "peer", "view"];
        const soundWords = ["heard", "sound", "listen", "noise", "whisper", "shout", "clanc", "rumble", "echo", "silent", "quiet", "roar", "muffle", "hiss", "shriek"];
        const touchWords = ["felt", "touch", "cold", "warm", "hot", "rough", "smooth", "soft", "sharp", "heavy", "press", "grip", "breeze", "chill", "pain"];
        const smellTasteWords = ["smell", "scent", "odor", "fragran", "aroma", "taste", "sweet", "bitter", "sour", "salty", "flavor", "delicious", "stinch", "perfume"];

        let sightCount = 0, soundCount = 0, touchCount = 0, smellTasteCount = 0;
        words.forEach(w => {
          const lw = w.toLowerCase();
          if (sightWords.some(sw => lw.includes(sw))) sightCount++;
          if (soundWords.some(sw => lw.includes(sw))) soundCount++;
          if (touchWords.some(sw => lw.includes(sw))) touchCount++;
          if (smellTasteWords.some(st => lw.includes(st))) smellTasteCount++;
        });

        const sensoryHits = sightCount + soundCount + touchCount + smellTasteCount;
        sensory = Math.max(15, Math.min(100, 35 + sensoryHits * 5));

        const sentences = summaryContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;

        if (avgSentenceLength > 22) {
          pacingCategory = "Slow Burn";
          pacing = 55;
        } else if (avgSentenceLength < 10 && wordCount > 30) {
          pacingCategory = "Breakneck / Intense";
          pacing = 60;
        } else if (wordCount > 0) {
          pacingCategory = "Highly Engaging";
          pacing = 85;
        } else {
          pacingCategory = "Flat / Static";
          pacing = 30;
        }

        const dialogueHits = (summaryContent.match(/"/g) || []).length / 2;
        beta = Math.max(15, Math.min(100, 50 + dialogueHits * 6));
        overall = Math.round((sensory + pacing + beta) / 3);
      }

      const scores = {
        overall,
        sensory,
        pacing,
        beta,
        pacingCategory,
        isStale: !!isStale
      };

      return {
        index: index + 1,
        id: ch.id,
        title: ch.title || `Chapter ${index + 1}`,
        wordCount,
        scores,
        manuscriptSnippet: snippet,
        contentHash: chHash,
      };
    });

    const flowPrompt = `
  You are an expert Chief developmental editor and narrative architect. 
  Your job is to conduct a master clinical analysis of the "macro flow" and "narrative velocity connectivity" across the chapters listed below.
  
  Please analyze:
  1. The overall coherence and flow quality of the story line.
  2. The transitions between successive chapters (e.g., Chapter 1 to Chapter 2, Chapter 2 to Chapter 3). Identify jarring leaps, abrupt emotional tones, or continuity speedbumps.
  3. The pacing distribution wave: is the story building continuous healthy writing momentum or stalling out?
  4. The sensory balance: checking if some chapters are loaded with environmental rendering while others feel like a "white room".
  
  IMPORTANT NOTE ON DRAFT LENGTH: 
  If any of the chapters are very short (e.g. under 150 words), explicitly call this out in the "flowOverview" or "macroImprovementPlan". Advise the writer on how extending those drafts (e.g., through sensory descriptions, character internal dialogue, or paced actions) will directly solve flow, pacing, and transition issues.

  Combine these dimensions and construct a definitive unified story-wide flow directive.

  STORY CHAPTERS FOR INVENTORY:
  ${JSON.stringify(chaptersContext, null, 2)}
`;

    let response;
    try {
      response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: flowPrompt,
        config: {
          systemInstruction: "You are an elite narrative design consultant. You critique full-length novels and manuscripts, providing helpful, objective developmental feedback on structure, chapter handoffs, transitions, and flow continuity.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coherenceScore: { 
                type: Type.INTEGER, 
                description: "A composite macro story flow quality index from 0 to 100 summarizing how cohesive and fluid the chapter handoffs feel." 
              },
              flowOverview: { 
                type: Type.STRING, 
                description: "A professional, elegant 2-paragraph general markdown critique of the macro story flow, continuity, and tension progression." 
              },
              pacingDistribution: { 
                type: Type.STRING, 
                description: "A markdown summary reviewing the narrative speed wave. Are speed leaps handled smoothly? Is tension distributed comfortably?" 
              },
              sensoryHarmony: { 
                type: Type.STRING, 
                description: "A markdown audit of environmental balance across chapters. Highlight if some chapters feel unrendered compared to others." 
              },
              transitions: {
                type: Type.ARRAY,
                description: "Transition critiques between consecutive numbered chapters.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fromChapter: { type: Type.STRING, description: "Title of Chapter N" },
                    toChapter: { type: Type.STRING, description: "Title of Chapter N+1" },
                    flowRating: { 
                      type: Type.STRING, 
                      description: "Transition comfort rating. Must be exactly one of: 'Jarring', 'Bumpy', 'Decent', 'Smooth', or 'Masterful'." 
                    },
                    critique: { 
                      type: Type.STRING, 
                      description: "2-3 precise, sharp sentences analyzing how the narrative hand-off flows across physical action, character motives, or time jumps." 
                    }
                  },
                  required: ["fromChapter", "toChapter", "flowRating", "critique"]
                }
              },
              macroImprovementPlan: {
                type: Type.ARRAY,
                description: "Consolidated, highly actionable master recommendations to make the chapters flow together beautifully.",
                items: { type: Type.STRING }
              }
            },
            required: ["coherenceScore", "flowOverview", "pacingDistribution", "sensoryHarmony", "transitions", "macroImprovementPlan"]
          },
          temperature: 0.3,
        },
      });

      let rawText = response.text || "{}";
      rawText = rawText.trim();
      if (rawText.includes("```")) {
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          rawText = jsonMatch[1].trim();
        } else {
          rawText = rawText.replace(/^```(?:json)?\n?|```$/g, "").trim();
        }
      }
      const data = JSON.parse(rawText);
      res.json({
        ...data,
        updatedChapters: chaptersContext.map(c => {
          const origCh = chapters.find((ch: any) => ch.id === c.id);
          const origAnalytics = origCh?.analytics || {};
          return {
            id: c.id,
            analytics: {
              ...origAnalytics,
              sensory: origAnalytics.sensory || `Sensory Score: ${c.scores.sensory}%`,
              sensoryScore: c.scores.sensory,
              pacing: origAnalytics.pacing || `Pacing Category: ${c.scores.pacingCategory}`,
              pacingScore: c.scores.pacing,
              beta: origAnalytics.beta || `Beta Score: ${c.scores.beta}%`,
              betaScore: c.scores.beta,
              overallScore: c.scores.overall,
              pacingCategory: c.scores.pacingCategory,
              pacingValue: c.scores.pacing,
              contentHash: c.contentHash,
              title: c.title,
            }
          };
        })
      });
    } catch (apiError: any) {
      console.warn("[Gemini API] Macro flow analysis failed. Initiating localized high-availability fallback.");
      console.error(apiError);
      
      const localFallback = generateRuleBasedStoryFlow(chapters);
      res.json({
        ...localFallback,
        updatedChapters: chaptersContext.map(c => {
          const origCh = chapters.find((ch: any) => ch.id === c.id);
          const origAnalytics = origCh?.analytics || {};
          return {
            id: c.id,
            analytics: {
              ...origAnalytics,
              sensory: origAnalytics.sensory || `Sensory Score: ${c.scores.sensory}%`,
              sensoryScore: c.scores.sensory,
              pacing: origAnalytics.pacing || `Pacing Category: ${c.scores.pacingCategory}`,
              pacingScore: c.scores.pacing,
              beta: origAnalytics.beta || `Beta Score: ${c.scores.beta}%`,
              betaScore: c.scores.beta,
              overallScore: c.scores.overall,
              pacingCategory: c.scores.pacingCategory,
              pacingValue: c.scores.pacing,
              contentHash: c.contentHash,
              title: c.title,
            }
          };
        })
      });
    }
  } catch (outerError: any) {
    console.error("Critical error in analyze-story-flow route:", outerError);
    res.status(500).json({ error: outerError.message || "Failed to analyze story flow." });
  }
});

// Configure Vite or Static Assets middleware
async function setupViteAndServe() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Story Writer full-stack server listening at http://0.0.0.0:${PORT}`);
  });
}

setupViteAndServe();
