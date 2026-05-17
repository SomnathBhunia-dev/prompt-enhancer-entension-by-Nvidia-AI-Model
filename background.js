// background.js
// Automated API key management and prompt enhancement

const DEFAULT_API_KEY = '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';

// Seed the API key on installation so the user is never prompted
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ apiKey: DEFAULT_API_KEY }, () => {
    console.log('API key automatically configured.');
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== 'enhancePrompt') return false;

  chrome.storage.local.get('apiKey', ({ apiKey }) => {
    // Fallback to default key if storage is somehow empty
    const keyToUse = apiKey || DEFAULT_API_KEY;

    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keyToUse}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/gemini-cli-extension',
        'X-OpenRouter-Title': 'AI Prompt Enhancer',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        messages: [
          { 
            role: 'system', 
            content: 'You are an Expert Prompt Engineer. Your goal is to transform simple or poorly worded user prompts into high-quality, professional, and descriptive instructions for an AI. \n\nTasks:\n1. Fix all grammatical errors and typos.\n2. Clarify ambiguous terms (e.g., "current year" -> "most recent season").\n3. Expand the prompt to request more detailed, structured, and informative responses.\n4. Maintain a professional and clear tone.\n\nReturn ONLY the final rewritten prompt text. Do not include any explanations or conversational filler.' 
          },
          { role: 'user', content: request.prompt }
        ],
        temperature: 0.5, // Lower temperature for more consistent, faster generation
        max_tokens: 1000,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const enhanced = data.choices?.[0]?.message?.content?.trim() ?? '';
        sendResponse({ enhanced });
      })
      .catch((err) => {
        console.error('Enhancement failed:', err);
        sendResponse({ error: err.message });
      });
  });

  return true; // Keep message channel open for async response
});
