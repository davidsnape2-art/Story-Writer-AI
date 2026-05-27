/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Story } from "./types";

export const GENRES = [
  "Mystery & Noir",
  "Sci-Fi & Cyberpunk",
  "High Fantasy",
  "Psychological Thriller",
  "Romance",
  "Historical Drama",
  "Poetic / Literary",
  "Gothic Horror"
];

export const TONES = [
  "Suspenseful & Tense",
  "Whimsical & Magical",
  "Gritty & Realistic",
  "Poetic & Melancholic",
  "Witty & Humorous",
  "Epic & Cinematic",
  "Dark & Atmospheric"
];

export const INITIAL_STORY: Story = {
  id: "demo-story",
  title: "The Five-Second Gear",
  genre: "Sci-Fi & Cyberpunk",
  tone: "Suspenseful & Tense",
  summary: "An old clockmaker in a rain-slicked city discovers a brass pocketwatch whose winding gear freezes time for exactly five seconds, but each activation drains five minutes from his own remaining life force.",
  manuscript: `The rain in Sector 8 never really fell; it hovered in the air like a damp neon fog. 

Arthur Vance sat at his scarred cedar desk, a brass magnifying loupe pinched into the orbit of his right eye. Before him lay the carcass of a watch no larger than a plum, its back casing etched with constellations no astronomer had ever cataloged.

He worked by the amber hum of a sodium lamp. Arthur had repaired chronometers for four decades, yet this mechanisms defied logic. Its gears were cut in primes—seventeen teeth, thirteen teeth, eleven teeth. They folded into one another with a whisper like dry autumn leaves.

"Almost," Arthur muttered to himself. His fingers, spotted with liver stains and engine grease, coaxed the mainspring tension screw.

He turned the winding stem. One click. Two. On the third click, the universe stopped.

The constant drip of the ceiling leak froze. A fat water droplet held suspended in mid-air, a pearled tear reflecting the bright green light of the noodle shop opposite his window. Outside on the neon-washed street, a stray cat remained caught mid-leap over a puddle, its paws rigid in the misty air.

Arthur drew a ragged breath. The air felt heavy, like cold syrup in his lungs. He walked to the window, watching the absolute stillness. 

Five seconds later, a sharp chime rang. The feline completed its fall, splashing into the murky rainwater, and the water droplet hit the wooden floorboards with a soft tap. Arthur gasped, collapsing into his chair. He glanced at his reflection in the watch's polished back. In his mirror image, the grey at his temples had marched a centimeter deeper, and a deep tiredness settled in his knees. He had gained a miracle, but his bones knew the terrible tariff he had just paid.`,
  chapters: [
    {
      id: "chapter-1",
      title: "Chapter 1: The Five-Second Gear",
      content: `The rain in Sector 8 never really fell; it hovered in the air like a damp neon fog. \n\nArthur Vance sat at his scarred cedar desk, a brass magnifying loupe pinched into the orbit of his right eye. Before him lay the carcass of a watch no larger than a plum, its back casing etched with constellations no astronomer had ever cataloged.\n\nHe worked by the amber hum of a sodium lamp. Arthur had repaired chronometers for four decades, yet this mechanisms defied logic. Its gears were cut in primes—seventeen teeth, thirteen teeth, eleven teeth. They folded into one another with a whisper like dry autumn leaves.\n\n"Almost," Arthur muttered to himself. His fingers, spotted with liver stains and engine grease, coaxed the mainspring tension screw.\n\nHe turned the winding stem. One click. Two. On the third click, the universe stopped.\n\nThe constant drip of the ceiling leak froze. A fat water droplet held suspended in mid-air, a pearled tear reflecting the bright green light of the noodle shop opposite his window. Outside on the neon-washed street, a stray cat remained caught mid-leap over a puddle, its paws rigid in the misty air.\n\nArthur drew a ragged breath. The air felt heavy, like cold syrup in his lungs. He walked to the window, watching the absolute stillness. \n\nFive seconds later, a sharp chime rang. The feline completed its fall, splashing into the murky rainwater, and the water droplet hit the wooden floorboards with a soft tap. Arthur gasped, collapsing into his chair. He glanced at his reflection in the watch's polished back. In his mirror image, the grey at his temples had marched a centimeter deeper, and a deep tiredness settled in his knees. He had gained a miracle, but his bones knew the terrible tariff he had just paid.`
    },
    {
      id: "chapter-2",
      title: "Chapter 2: The Underbelly Bargain",
      content: `The hum of Sector 8's trade tracks vibrated through Arthur's workshop long before the heavy security latch clicked open. \n\nValerie Chen didn't knock. She stepped inside with a fluid, predator-soft grace, her obsidian coat shimmering with rain and pink neon highlights from the street-level signs.\n\n"You're late, old man," Valerie said, flipping a polished brass screw into the air and catching it. Her pink cybernetic eye whirred softly, scanning the shelves. "The Boss wants his tribute, and he has little patience for ticking metal."`
    }
  ],
  activeChapterId: "chapter-1",
  characters: [
    {
      id: "char-1",
      name: "Arthur Vance",
      archetype: "The Chronophilic Martyr",
      tagline: "A dying clockmaker who values minutes on gold scales.",
      physicalAppearance: "Thin, stooped with liver spots on grease-stained hands, thin grey hair, and a metal double magnifier permanently resting on his brow.",
      internalDrive: "He wants to repair his broken past—specifically a family heirloom he lost to a corrupt street boss—even if it costs him his remaining heartbeats.",
      quirksAndHabits: "Constantly tapping his fingers in 4/4 time; talking to non-living mechanisms; chewing cardamom seeds to mask the smell of brass oil.",
      backstory: "Once a premier clockwork engineer for the High District spire, he was banished to the low Sector 8 when a grand chronos tower project failed. He hoards secrets to survive."
    },
    {
      id: "char-2",
      name: "Valerie Chen",
      archetype: "The Underbelly Fence",
      tagline: "A fast-talking tech broker with chrome knuckles and eyes like street glass.",
      physicalAppearance: "Sleek obsidian coat, short shaved hair on one side, a neon-pink cybernetic tracking optical lens, and quick cat-like reflex movements.",
      internalDrive: "To escape Sector 8's debt lords at any cost. She sees Arthur's watch as a ticket out—or a glorious weapon.",
      quirksAndHabits: "Flips rare copper coins across her fingers when nervous; checks watch every three minutes; speaks in shorthand cyber slang.",
      backstory: "Abandoned by deep city corporate miners at age ten, she built a network of informants on Sector 8's trade tracks. She protects Arthur secretly because he once fixed her mother’s cybernetic hand."
    }
  ],
  outline: [
    {
      id: "out-1",
      title: "Act I: Winding the Gears",
      notes: "Arthur Vance discovers the watch freezes time. He notices the graying of his hair and realizes the pocketwatch eats away his life span. Valerie visits to collect a debt and spots the watch.",
      isCompleted: true
    },
    {
      id: "out-2",
      title: "Act II: The Great Barter",
      notes: "Valerie convinces him to use the freeze to steal back Arthur's stolen mechanical heirloom from Boss Kaelen's vault. Arthur has to freeze time three times, losing years of his life.",
      isCompleted: false
    },
    {
      id: "out-3",
      title: "Act III: The Timeless Choice",
      notes: "Inside the vault, Kaelen's security traps Valerie. Arthur must decide whether to use his final seconds of time-freeze to save her, knowing it will wind his own biological lock to zero.",
      isCompleted: false
    }
  ],
  lastSavedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};
