export interface VideoScene {
  index: number;
  narration: string;
  caption: string;
  imagePrompt: string;
}

const MAX_SCENES = 6;
const MIN_SCENES = 3;
const MAX_CAPTION_LEN = 60;

function cleanLine(line: string): string {
  return line
    .replace(/^(hook|intro|outro|scene\s*\d*|slide\s*\d*)\s*[:\-—]\s*/i, "")
    .replace(/^[-*•\d\.\)\s]+/, "")
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function chunkSentences(sentences: string[], target: number): string[] {
  if (sentences.length === 0) return [];
  if (sentences.length <= target) return sentences;
  const size = Math.ceil(sentences.length / target);
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += size) {
    out.push(sentences.slice(i, i + size).join(" "));
  }
  return out;
}

function shortenForCaption(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= MAX_CAPTION_LEN) return cleaned;
  const cut = cleaned.slice(0, MAX_CAPTION_LEN);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:]$/, "");
}

export function buildScenes(input: {
  hook?: string | null;
  script: string;
  visualSuggestions?: string[];
  basePrompt?: string | null;
}): VideoScene[] {
  const hook = (input.hook ?? "").trim();
  const cleanedScript = input.script
    .replace(/^hook\s*:\s*.+$/im, "")
    .trim();

  const visuals = (input.visualSuggestions ?? [])
    .map(cleanLine)
    .filter((s) => s.length > 0);

  const sentences = splitSentences(cleanedScript);
  const desired = Math.min(
    MAX_SCENES,
    Math.max(MIN_SCENES, visuals.length > 0 ? visuals.length : sentences.length)
  );
  const narrationChunks = chunkSentences(sentences, desired);

  const scenes: VideoScene[] = [];
  const count = Math.max(narrationChunks.length, visuals.length, MIN_SCENES);

  for (let i = 0; i < count; i++) {
    const narration =
      narrationChunks[i] ??
      narrationChunks[narrationChunks.length - 1] ??
      hook ??
      "";
    if (!narration) continue;

    const visual = visuals[i] ?? visuals[visuals.length - 1] ?? "";
    const imagePromptParts = [
      input.basePrompt?.trim() ||
        "Cinematic vertical 9:16 visual for a crypto AI news short. Modern, dark, neon accents, professional, no fake logos or price claims, no text.",
      visual ? `Scene focus: ${visual}` : "",
      i === 0 && hook ? `Hook tone: ${hook}` : "",
    ].filter(Boolean);

    scenes.push({
      index: i,
      narration,
      caption: shortenForCaption(i === 0 && hook ? hook : narration),
      imagePrompt: imagePromptParts.join(". "),
    });
  }

  return scenes.slice(0, MAX_SCENES);
}
