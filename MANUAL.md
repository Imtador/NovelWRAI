# OpenWritter — User Manual

A simple AI writing assistant inspired by NovelAI. You write a story (or any text), and the AI continues it for you, one click at a time. No subscription, no lorebook, no complex setup — just you, your text, and an OpenRouter API key.

---

## 1. What is OpenWritter?

OpenWritter is a local web application that connects to [OpenRouter](https://openrouter.ai) — a service that gives you access to hundreds of AI models (GPT, Claude, Gemini, Llama, Mistral and more) through a single API key.

You write the beginning of a story, press **Continue**, and the AI writes what happens next, streaming the text live into your editor. You stay in control: you can edit anything the AI writes, undo it, or regenerate it.

### Key ideas (compared to NovelAI)

| NovelAI | OpenWritter |
|---|---|
| Monthly subscription with fixed credits | Pay-per-use through your own OpenRouter account |
| Limited to their models | Any model on OpenRouter (400+ available) |
| Lorebook / memory system (complex) | Not used — a simple "Style instructions" box instead |
| Runs in their cloud | Runs entirely on your computer; your text stays in your browser |

---

## 2. What you need before starting

1. **Node.js** (version 18 or newer). Download from https://nodejs.org — install the LTS version. Check it works by opening a terminal and running `node -v`.
2. **An OpenRouter account and API key:**
   - Go to https://openrouter.ai and sign up (free).
   - Go to https://openrouter.ai/keys and create a key. It looks like `sk-or-v1-...`.
   - Add credits at https://openrouter.ai/credits (a few dollars is plenty — typical story continuation costs a fraction of a cent).
   - Some models (marked "free" on OpenRouter, e.g. ones ending in `:free`) cost nothing at all.

> Your API key is like a password. Anyone who has it can spend your credits. OpenWritter stores it only in your browser's local storage on your own machine and sends it only to OpenRouter through the local server.

---

## 3. Starting the app

**Easy way (Windows):** double-click **`OpenWritter.bat`** in the OpenWritter folder. It installs dependencies on first run, starts the server, and opens http://localhost:3000 in your browser automatically. Keep the black console window open while writing; closing it stops the app.

**Manual way:** open a terminal in the OpenWritter folder and run:

```
npm install    (only the first time)
npm start
```

Then open **http://localhost:3000** in your browser.

You should see a dark two-panel interface: settings on the left, the writing editor on the right.

---

## 4. The interface

### Left sidebar (settings)

| Setting | What it does |
|---|---|
| **OpenRouter API Key** | Your personal key. Required for generation. Saved automatically in your browser. |
| **Model** | Which AI model writes the story. Default: `openai/gpt-4o-mini` (cheap and good). Click **Load model list** to see all available models, then type or pick one from the dropdown. |
| **AI instructions** | Free-text directions for the AI — your replacement for a lorebook. Examples below. These are sent as the AI's system prompt with every Continue request. |
| **Max tokens** | How long each continuation can be. 1 token ≈ ¾ of a word. 300 is a good paragraph or two. |
| **Temperature** | Creativity dial. Low (0.2–0.5) = predictable, safe. Medium (0.7–0.9) = balanced, recommended for fiction. High (1.0–1.5) = wild and surprising, sometimes incoherent. |
| **Stories** | Name and save your texts, load them later, or delete them. |

### Advanced AI settings (collapsible section)

These map directly to OpenRouter's API parameters. Defaults work fine — open the section only if you want fine control.

| Setting | What it does |
|---|---|
| **Thinking mode** | Enables reasoning for models that support it (e.g. Claude with thinking, o-series, DeepSeek R1). The model "thinks" before writing, which can improve plot coherence but is slower and costs more. |
| **Depth of thinking** | Reasoning effort: Low / Medium / High. Higher = more (and more expensive) thinking. |
| **Max reasoning tokens** | Hard cap on thinking length. Leave empty for the model's default. |
| **Hide reasoning from output** | Keeps the model's internal thinking out of your story (recommended on). |
| **Provider order** | Comma-separated list of providers to try first, e.g. `Anthropic, OpenAI`. Useful if you prefer a specific provider's hosting for a model. |
| **Allow provider fallbacks** | If your chosen provider is down, OpenRouter can route to another one. Turn off to force your exact provider. |
| **Top P** | Alternative creativity dial (nucleus sampling). Leave at 1 and use Temperature instead, unless you know you need it. |
| **Frequency penalty** | Positive values discourage repeating the same words/phrases. 0.3–0.7 can reduce repetition in long stories. |
| **Presence penalty** | Positive values push the model toward new topics. Keep near 0 for fiction. |
| **Seed** | A number that makes generation (nearly) reproducible with the same settings. Empty = random. |
| **Stop sequences** | Up to 4 comma-separated strings; generation stops when the AI writes one, e.g. `THE END` or `###`. |

### Right side (the editor)

A large writing area with a toolbar on top:

- **Continue ▶** — asks the AI to continue your text. Shortcut: **Ctrl+Enter**.
- **Stop ■** — halts generation mid-stream. Anything already written stays.
- **Retry last** — throws away the last AI continuation and generates a fresh one (a "reroll", like NovelAI).
- **Undo** — restores the editor to how it was before the last generation or edit. Keeps up to 50 steps.
- **Clear** — empties the editor (asks for confirmation, and Undo still works).
- **Word count** — bottom right of the toolbar.

### Usage bar (bottom of the editor)

Below the editor is a bar that shows, updated live as you type:

- **Context tokens** — roughly how many tokens your text plus the Max tokens setting will use per Continue, and what fraction that is of the selected model's context window (e.g. `1,240 / 128,000 context tokens (1.0%)`). The colored meter turns yellow above 60% and red above 85% of the context window — when it's full, the model can't fit your story and will start forgetting or erroring.
- **Cost estimate** — approximate cost in dollars of one Continue press, and of one Continue when your story fills the whole context window. Prices come from OpenRouter's model data.

Notes:
- Token counts are computed with a GPT-style tokenizer, so they are accurate for OpenAI models and good approximations for others (different models tokenize slightly differently).
- If the model's context size or pricing isn't known (e.g. you never pressed "Load model list"), the bar shows an estimate and a hint instead.
- Counts update about half a second after you stop typing.

A purple line on the left edge of the editor appears while the AI is generating.

---

## 5. How to write with it (typical workflow)

1. Paste your API key into the sidebar.
2. Optionally click **Load model list** and pick a model.
3. Write your opening. Even one sentence is enough — but the more you write, the better the AI matches your style, tense and point of view.
4. Press **Continue** (or Ctrl+Enter). Watch the text appear live.
5. Read what it wrote. Then either:
   - Keep it and press **Continue** again for the next part, or
   - Edit it yourself, or
   - Press **Retry last** to get a different version, or
   - Press **Undo** to remove it entirely.
6. When you're happy, type a title and press **Save** to keep the story.

Repeat Continue → read → retry/edit as many times as you like. Each Continue only sends your text to the AI; nothing else leaves your machine.

### About "Retry last"

Generation is random — the same text will produce a different continuation every time. If you don't like what the AI wrote, just reroll it. This is the core loop of AI-assisted writing.

---

## 6. AI instructions (your "lorebook replacement")

The **AI instructions** box tells the AI how to write. It's sent as the system prompt with every Continue request. Examples:

```
Dark fantasy, first person, past tense. Grim, atmospheric prose.
```
```
Cozy mystery in the style of Agatha Christie. Third person limited, witty dialogue.
```
```
Continue as a sci-fi space opera. Keep paragraphs short. End each continuation on a hook.
```
```
Write in French.
```
```
You are continuing my journal. Casual, reflective tone.
```

Tips:
- Mention **person** (first/third), **tense** (past/present), **genre** and **mood**.
- You can also give plot directions: "Introduce a mysterious stranger soon."
- It doesn't persist characters or facts automatically — if consistency matters, mention key details here, or just keep them in your story text (the AI reads the whole editor content every time).
- Note: if you enable **Thinking mode**, the instructions also shape how the model reasons, which often improves consistency across long continuations.

---

## 7. Models: how to choose and what they cost

Press **Load model list** to fetch all models from OpenRouter. Popular choices:

| Model | Best for | Cost |
|---|---|---|
| `openai/gpt-4o-mini` | Default. Fast, cheap, good prose. | Very low |
| `anthropic/claude-3.5-sonnet` (or newer) | Best prose quality | Medium |
| `google/gemini-flash-*` | Fast, cheap | Very low |
| `meta-llama/llama-3.*` (incl. `:free` variants) | Free options | Free / very low |
| `mistralai/mistral-*` | Cheap European models | Low |

- The model ID must be typed exactly as OpenRouter names it — the dropdown autocompletes for you.
- Prices are per million tokens; check https://openrouter.ai/models for current pricing.
- Longer **Max tokens** = higher cost per Continue, and the size of your text also counts toward cost.

---

## 8. Where your data lives

- **Story text, API key and settings** → your browser's `localStorage` (this computer, this browser only). Clearing browser data deletes them — save important stories.
- **Saved stories** → same, in localStorage. There is no cloud backup.
- **During generation** → your text is sent from the local server to OpenRouter's API. OpenRouter then forwards it to the model provider. Their privacy policy applies: https://openrouter.ai/privacy
- Nothing is sent anywhere when you're just typing.

---

## 9. Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| "Please enter your OpenRouter API key" | Fill the key field in the sidebar. |
| Error mentioning `401` / `No auth credentials` | Key is wrong or was deleted. Create a new one at openrouter.ai/keys. |
| Error mentioning `402` / `credit` | Your OpenRouter account has no credits. Top up, or switch to a `:free` model. |
| Error mentioning `404` / `not found` on generation | Model ID is misspelled. Re-check it in the model list. |
| "Load model list" fails | The app couldn't reach OpenRouter — check your internet connection. |
| Generation output is cut off mid-sentence | Raise **Max tokens**. |
| Output is boring/repetitive | Raise **Temperature** to ~0.9–1.0. |
| Output is chaotic nonsense | Lower **Temperature** to ~0.7. |
| Output summarizes instead of continuing | Add to AI instructions: "Do not summarize. Continue the story in the same style." |
| "Thinking mode" option has no effect | The selected model doesn't support reasoning. Try a reasoning-capable model (e.g. `anthropic/claude-3.7-sonnet`, `deepseek/deepseek-r1`, OpenAI o-series). |
| Error mentioning `provider` after setting provider order | The provider name is misspelled or doesn't host that model. Clear the Provider order field or re-enable fallbacks. |
| Server won't start ("port in use") | Another app uses port 3000. Run `set PORT=3001 && npm start` (Windows) and use port 3001. |
| Everything disappeared | You cleared browser data. Stories are stored only in the browser — nothing to recover. |

---

## 10. Tips for good results

- **Your text and the AI's text look different.** Everything the AI generates appears in a soft blue color; everything you type is normal white. This makes it easy to see at a glance what came from where. Edits you make inside AI-written text keep that color.
- **Write a solid opening** (a paragraph is ideal). The AI imitates what you give it.
- **Reroll freely.** Generating two or three continuations and keeping the best is normal and cheap.
- **Edit in between.** The AI reads the whole editor content, so small fixes you make steer the next continuation.
- **End your text mid-scene** (even mid-sentence) to get seamless continuation rather than a neat "ending".
- **Keep the Max tokens moderate** (200–400) — several short continuations give you more control than one long one.
- **Ctrl+Enter** is your friend; keep your hands on the keyboard.

---

## 11. Quick reference

- Start: double-click `OpenWritter.bat` (or `npm start`) → http://localhost:3000
- Generate: **Ctrl+Enter**
- Reroll: **Retry last** · Revert: **Undo** · Halt: **Stop**
- Save story: type title → **Save** (sidebar)
- Token usage & price estimate: bar under the editor
- Get a key: https://openrouter.ai/keys
- Model list & prices: https://openrouter.ai/models
