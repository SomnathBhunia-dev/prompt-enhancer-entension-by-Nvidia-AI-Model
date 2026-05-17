// content/content.js

// Create and style the floating button
const btn = document.createElement('button');
btn.id = 'enhancePromptBtn';
btn.textContent = '✨';
Object.assign(btn.style, {
  position: 'absolute',
  zIndex: 10000,
  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
  border: 'none',
  borderRadius: '50%',
  width: '36px',
  height: '36px',
  color: '#fff',
  fontSize: '18px',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  display: 'none',
  transition: 'transform 0.2s, opacity 0.2s, background 0.3s',
  padding: '0',
  lineHeight: '1',
  alignItems: 'center',
  justifyContent: 'center'
});

document.body.appendChild(btn);

let activeElement = null;
let lastEnhancedElement = null; // Track the last element that was enhanced

const STYLES = {
  default: 'linear-gradient(135deg, #6366f1, #a855f7)',
  success: 'linear-gradient(135deg, #22c55e, #16a34a)', // Green gradient
  loading: 'linear-gradient(135deg, #64748b, #475569)' // Slate gradient for loading
};

function positionButton(target) {
  if (!target) return;
  const rect = target.getBoundingClientRect();
  btn.style.top = `${rect.top + window.scrollY - 15}px`;
  btn.style.left = `${rect.right + window.scrollX - 20}px`;
  
  // Update state based on whether this element was recently enhanced
  if (target === lastEnhancedElement) {
    btn.style.background = STYLES.success;
    btn.textContent = '✅';
  } else {
    btn.style.background = STYLES.default;
    btn.textContent = '✨';
  }
  
  btn.style.display = 'flex';
}

function hideButton() {
  btn.style.display = 'none';
}

function getPrompt() {
  if (!activeElement) return '';
  return activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' 
    ? activeElement.value 
    : activeElement.innerText;
}

/**
 * ChatGPT-style typing animation
 */
async function setPromptAnimated(text) {
  if (!activeElement) return;
  
  const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
  
  if (isInput) activeElement.value = '';
  else activeElement.innerText = '';

  for (let i = 0; i < text.length; i++) {
    if (isInput) {
      activeElement.value += text[i];
    } else {
      activeElement.innerText += text[i];
    }
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 15));
  }

  activeElement.dispatchEvent(new Event('change', { bubbles: true }));
  activeElement.dispatchEvent(new Event('blur', { bubbles: true }));
}

// Global listeners
document.addEventListener('focusin', (e) => {
  const el = e.target;
  if (el.matches('input, textarea, [contenteditable="true"]')) {
    activeElement = el;
    positionButton(el);
  }
});

document.addEventListener('mousedown', (e) => {
  if (e.target !== btn) {
    setTimeout(() => {
      if (document.activeElement !== activeElement && document.activeElement !== btn) {
        hideButton();
      }
    }, 150);
  }
});

window.addEventListener('scroll', () => {
  if (activeElement && btn.style.display !== 'none') positionButton(activeElement);
}, { passive: true });

window.addEventListener('resize', () => {
  if (activeElement && btn.style.display !== 'none') positionButton(activeElement);
}, { passive: true });

// Enhancement logic
btn.addEventListener('click', async (e) => {
  e.preventDefault();
  e.stopPropagation();

  // If already successful on this element, don't re-run immediately unless text changed
  if (activeElement === lastEnhancedElement) {
    lastEnhancedElement = null; // Allow re-enhancement
    positionButton(activeElement);
    return;
  }

  const prompt = getPrompt().trim();
  if (!prompt) return;

  btn.disabled = true;
  btn.textContent = '⏳';
  btn.style.background = STYLES.loading;

  try {
    const response = await chrome.runtime.sendMessage({ type: 'enhancePrompt', prompt });
    if (response && response.error) {
      console.error('Enhancement error:', response.error);
      alert('AI Error: ' + response.error);
      btn.style.background = STYLES.default;
      btn.textContent = '✨';
    } else if (response && response.enhanced) {
      // Mark as enhanced before animation
      lastEnhancedElement = activeElement;
      
      // Keep button visible but in success state during/after animation
      btn.style.background = STYLES.success;
      btn.textContent = '✅';
      
      await setPromptAnimated(response.enhanced);
    }
  } catch (err) {
    console.error('Runtime error:', err);
    btn.style.background = STYLES.default;
    btn.textContent = '✨';
  } finally {
    btn.disabled = false;
    if (activeElement) activeElement.focus();
  }
});
