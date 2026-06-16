import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

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

    const response = await ai.models.generateContent({
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

    try {
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
    } catch (parseErr) {
      console.error("Failed to parse JSON response from Gemini, sending raw text:", response.text, parseErr);
      res.json({ text: response.text || "" });
    }
  } catch (error: any) {
    console.error("Gemini Chapter Analyze Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during chapter analysis." });
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

    const ai = getGeminiClient();

    // Prepare a high-density index summary of each chapter's details for fast evaluation
    const chaptersContext = chapters.map((ch, index) => {
      const summaryContent = ch.content || "";
      const wordCount = summaryContent.split(/\s+/).filter(Boolean).length;
      const snippet = summaryContent.length > 2000
        ? summaryContent.substring(0, 1000) + "\n\n[...]\n\n" + summaryContent.substring(summaryContent.length - 1000)
        : summaryContent;

      const scores = ch.analytics ? {
        overall: ch.analytics.overallScore,
        sensory: ch.analytics.sensoryScore,
        pacing: ch.analytics.pacingScore,
        beta: ch.analytics.betaScore,
        pacingCategory: ch.analytics.pacingCategory,
      } : "No individual chapter analysis run yet.";

      return {
        index: index + 1,
        id: ch.id,
        title: ch.title || `Chapter ${index + 1}`,
        wordCount,
        scores,
        manuscriptSnippet: snippet,
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
  
  Combine these dimensions and construct a definitive unified story-wide flow directive.

  STORY CHAPTERS FOR INVENTORY:
  ${JSON.stringify(chaptersContext, null, 2)}
`;

    const response = await ai.models.generateContent({
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

    try {
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
      res.json(data);
    } catch (parseErr) {
      console.error("Failed to parse story flow JSON response from Gemini, raw payload:", response.text, parseErr);
      res.json({ error: "Failed to parse narrative flow analysis payloads.", text: response.text });
    }
  } catch (error: any) {
    console.error("Story Flow Analysis Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze whole story flow." });
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
