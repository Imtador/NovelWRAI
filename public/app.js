const $ = (id) => document.getElementById(id);

const story = $("story");
const statusEl = $("status");
let controller = null;
let undoStack = [];

// AI text is wrapped in <span class="ai-part"> so it looks different from user text.
const getStoryText = () => story.innerText;
function markAiSpan(el) {
  el.classList.add("ai-part");
}
function appendAiToken(token) {
  const cursor = story.querySelector(".ai-cursor");
  let span = cursor ? cursor.previousSibling : story.lastChild;
  if (!(span && span.nodeType === 1 && span.classList.contains("ai-part"))) {
    span = document.createElement("span");
    markAiSpan(span);
    cursor ? story.insertBefore(span, cursor) : story.appendChild(span);
  }
  span.appendChild(document.createTextNode(token));
  story.scrollTop = story.scrollHeight;
}
function clearAiStyling() {
  story.querySelectorAll(".ai-cursor").forEach((c) => c.remove());
}

// ---------- persistence ----------
const settings = { key: "ow_settings", stories: "ow_stories" };

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(settings.key)) || {};
    $("apiKey").value = s.apiKey || "";
    $("model").value = s.model || "openai/gpt-4o-mini";
    $("instructions").value = s.instructions || "";
    $("maxTokens").value = s.maxTokens ?? 300;
    $("temperature").value = s.temperature ?? 0.8;
    $("thinkingMode").checked = !!s.thinkingMode;
    $("thinkingDepth").value = s.thinkingDepth || "medium";
    $("thinkingTokens").value = s.thinkingTokens || "";
    $("hideReasoning").checked = s.hideReasoning !== false;
    $("providerOrder").value = s.providerOrder || "";
    $("allowFallbacks").checked = s.allowFallbacks !== false;
    $("topP").value = s.topP ?? 1;
    $("freqPenalty").value = s.freqPenalty ?? 0;
    $("presPenalty").value = s.presPenalty ?? 0;
    $("seed").value = s.seed ?? "";
    $("stopSeq").value = s.stopSeq || "";
    if (s.textHtml) story.innerHTML = s.textHtml;
    else if (s.text) story.textContent = s.text;
  } catch {}
}
function saveSettings() {
  localStorage.setItem(
    settings.key,
    JSON.stringify({
      apiKey: $("apiKey").value,
      model: $("model").value,
      instructions: $("instructions").value,
      maxTokens: $("maxTokens").value,
      temperature: $("temperature").value,
      thinkingMode: $("thinkingMode").checked,
      thinkingDepth: $("thinkingDepth").value,
      thinkingTokens: $("thinkingTokens").value,
      hideReasoning: $("hideReasoning").checked,
      providerOrder: $("providerOrder").value,
      allowFallbacks: $("allowFallbacks").checked,
      topP: $("topP").value,
      freqPenalty: $("freqPenalty").value,
      presPenalty: $("presPenalty").value,
      seed: $("seed").value,
      stopSeq: $("stopSeq").value,
      textHtml: story.innerHTML,
      text: story.innerText,
    })
  );
}
document.querySelectorAll(".sidebar input, .sidebar textarea").forEach((el) =>
  el.addEventListener("change", saveSettings)
);
story.addEventListener("input", () => { saveSettings(); updateCount(); updateUsage(); });

// ---------- word count ----------
function updateCount() {
  const text = getStoryText();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  $("wordCount").textContent = `${words} words`;
}

// ---------- sliders ----------
$("maxTokens").addEventListener("input", (e) => ($("maxTokensVal").textContent = e.target.value));
$("temperature").addEventListener("input", (e) => ($("tempVal").textContent = e.target.value));
$("topP").addEventListener("input", (e) => ($("topPVal").textContent = e.target.value));
$("freqPenalty").addEventListener("input", (e) => ($("freqPenVal").textContent = e.target.value));
$("presPenalty").addEventListener("input", (e) => ($("presPenVal").textContent = e.target.value));

// ---------- token usage & cost ----------
let modelInfo = null; // { contextLength, promptPrice, completionPrice } per model id
let tokenCache = { text: "", tokens: 0 };

async function fetchModelInfo() {
  const modelId = $("model").value.trim();
  if (!modelId) return;
  try {
    if (!modelInfo) {
      const r = await fetch("/api/models");
      if (!r.ok) return;
      const models = await r.json();
      modelInfo = {};
      for (const m of models) {
        modelInfo[m.id] = {
          contextLength: m.contextLength,
          prompt: m.pricing ? parseFloat(m.pricing.prompt) : null,
          completion: m.pricing ? parseFloat(m.pricing.completion) : null,
        };
      }
    }
  } catch {}
  updateUsage();
}

function updateUsage() {
  const text = getStoryText();
  // gpt-tokenizer is fast enough to run client-side? No, it's server-side; use local approximation between requests.
  // We request exact counts debounced from the server.
  scheduleTokenCount(text);
}

let tokenTimer = null;
function scheduleTokenCount(text) {
  clearTimeout(tokenTimer);
  tokenTimer = setTimeout(async () => {
    try {
      const r = await fetch("/api/tokenize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const { tokens } = await r.json();
      tokenCache = { text, tokens };
      renderUsage(tokens);
    } catch {}
  }, 400);
}

function renderUsage(tokens) {
  const maxTokens = parseInt($("maxTokens").value) || 300;
  const thinkingTokens = parseInt($("thinkingTokens").value) || 0;
  const total = tokens + maxTokens + thinkingTokens;

  const info = (modelInfo || {})[$("model").value.trim()];
  const ctx = info?.contextLength;

  let ctxText = `~${total.toLocaleString()} tokens used per Continue (text + max tokens)`;
  let pct = 0;
  if (ctx) {
    pct = Math.min(100, (total / ctx) * 100);
    ctxText = `${total.toLocaleString()} / ${ctx.toLocaleString()} context tokens (${pct.toFixed(1)}%)`;
  }
  $("usageText").textContent = ctxText;

  const fill = $("usageFill");
  fill.style.width = `${ctx ? pct : 0}%`;
  fill.className = "meter-fill" + (pct > 85 ? " danger" : pct > 60 ? " warn" : "");

  // OpenRouter pricing is per token (prompt/completion fields are per-token prices)
  if (info && info.prompt != null && info.completion != null) {
    const costPerContinue = tokens * info.prompt + maxTokens * info.completion;
    const fullCtxCost = ctx ? ctx * info.prompt + maxTokens * info.completion : costPerContinue;
    $("costText").textContent =
      `≈ $${costPerContinue.toFixed(5)} per Continue · ` +
      `≈ $${fullCtxCost.toFixed(4)} at full context`;
  } else {
    $("costText").textContent = "Load model list or check pricing: cost unknown";
  }
}

["maxTokens", "thinkingTokens", "model"].forEach((id) => {
  $(id).addEventListener("input", () => {
    if (id === "model") modelInfo && fetchModelInfo();
    renderUsage(tokenCache.tokens);
  });
});
$("loadModels").addEventListener("click", () => setTimeout(fetchModelInfo, 800));

// ---------- model list ----------
$("loadModels").addEventListener("click", async () => {
  setStatus("Loading models...");
  try {
    const r = await fetch("/api/models");
    const models = await r.json();
    if (!Array.isArray(models)) throw new Error(models.error || "Failed");
    $("modelList").innerHTML = models.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
    setStatus(`Loaded ${models.length} models`);
  } catch (e) {
    setStatus(e.message, true);
  }
});

// ---------- generation ----------
function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = "status" + (isError ? " error" : "");
}

function pushUndo() {
  undoStack.push(story.value);
  if (undoStack.length > 50) undoStack.shift();
}

async function generate() {
  const apiKey = $("apiKey").value.trim();
  if (!apiKey) return setStatus("Please enter your OpenRouter API key.", true);
  if (!getStoryText().trim()) return setStatus("Write something first, then press Continue.", true);

  pushUndo();
  controller = new AbortController();
  $("generate").disabled = true;
  $("stop").disabled = false;
  document.body.classList.add("generating");
  setStatus("Generating...");

  let firstToken = true;
  const cursor = document.createElement("span");
  cursor.className = "ai-cursor";
  story.appendChild(cursor);
  try {
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        apiKey,
        model: $("model").value.trim(),
        text: getStoryText(),
        instructions: $("instructions").value,
        maxTokens: $("maxTokens").value,
        temperature: $("temperature").value,
        thinking: {
          enabled: $("thinkingMode").checked,
          depth: $("thinkingDepth").value,
          maxTokens: $("thinkingTokens").value,
          exclude: $("hideReasoning").checked,
        },
        provider: {
          order: $("providerOrder").value.split(",").map((s) => s.trim()).filter(Boolean),
          allow_fallbacks: $("allowFallbacks").checked,
        },
        topP: $("topP").value,
        freqPenalty: $("freqPenalty").value,
        presPenalty: $("presPenalty").value,
        seed: $("seed").value,
        stop: $("stopSeq").value.split(",").map((s) => s.trim()).filter(Boolean),
        history: [],
      }),
    });

    if (!r.ok || !r.body) {
      const err = await r.json().catch(() => ({ error: r.statusText }));
      throw new Error(err.error || "Request failed");
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          if (json.error) throw new Error(json.error);
          if (json.reasoning) setStatus("Thinking...");
          if (json.token) {
            if (firstToken) {
              firstToken = false;
              const cursor = story.querySelector(".ai-cursor");
              const prev = cursor ? cursor.previousSibling : story.lastChild;
              if (!(prev && prev.nodeType === 3 && prev.textContent.endsWith("\n"))) {
                const nl = document.createTextNode("\n");
                cursor ? story.insertBefore(nl, cursor) : story.appendChild(nl);
              }
            }
            appendAiToken(json.token);
            updateCount();
          }
        } catch {}
      }
    }
    setStatus(firstToken ? "No text was generated." : "Done");
  } catch (e) {
    if (e.name === "AbortError") setStatus("Stopped");
    else setStatus(e.message, true);
  } finally {
    cursor.remove();
    controller = null;
    $("generate").disabled = false;
    $("stop").disabled = true;
    document.body.classList.remove("generating");
    saveSettings();
  }
}

$("generate").addEventListener("click", generate);
$("stop").addEventListener("click", () => controller?.abort());

$("undo").addEventListener("click", () => {
  if (undoStack.length) {
    story.textContent = undoStack.pop();
    updateCount();
    saveSettings();
    setStatus("Undone");
  }
});

$("retry").addEventListener("click", () => {
  if (undoStack.length) {
    story.textContent = undoStack[undoStack.length - 1];
    updateCount();
    generate();
  } else generate();
});

$("clear").addEventListener("click", () => {
  if (getStoryText() && confirm("Clear the editor?")) {
    pushUndo();
    story.textContent = "";
    updateCount();
    saveSettings();
  }
});

// Ctrl+Enter to generate
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); if (!$("generate").disabled) generate(); }
});

// ---------- stories ----------
function getStories() { return JSON.parse(localStorage.getItem(settings.stories)) || {}; }

function renderStories() {
  const stories = getStories();
  $("storyList").innerHTML = Object.keys(stories)
    .map(
      (name) =>
        `<li data-name="${name.replace(/"/g, "&quot;")}"><span>${name}</span><span class="del" title="Delete">✕</span></li>`
    )
    .join("");
}

$("saveStory").addEventListener("click", () => {
  const name = $("storyName").value.trim();
  if (!name) return setStatus("Enter a story title to save.", true);
  const stories = getStories();
  stories[name] = getStoryText();
  localStorage.setItem(settings.stories, JSON.stringify(stories));
  renderStories();
  setStatus(`Saved "${name}"`);
});

$("storyList").addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  const name = li.dataset.name;
  if (e.target.classList.contains("del")) {
    const stories = getStories();
    delete stories[name];
    localStorage.setItem(settings.stories, JSON.stringify(stories));
    renderStories();
    return;
  }
  pushUndo();
  story.textContent = getStories()[name] || "";
  updateCount();
  saveSettings();
  setStatus(`Loaded "${name}"`);
});

loadSettings();
updateCount();
updateUsage();
fetchModelInfo();
renderStories();