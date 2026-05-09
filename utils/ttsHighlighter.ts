
interface TokenMap {
    start: number;
    end: number;
    span: HTMLElement;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentMap: TokenMap[] = [];

export const stopSpeaking = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    clearHighlights();
    currentUtterance = null;
};

const clearHighlights = () => {
    currentMap.forEach(item => {
        item.span.classList.remove('bg-yellow-300', 'text-black', 'scale-110');
        item.span.style.backgroundColor = '';
        item.span.style.color = '';
    });
};

const shouldSkipNode = (node: Node) => {
    const tag = (node as Element).tagName;
    return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'svg' || (node as Element).classList?.contains('tts-ignore');
};

// Remove existing tokens to prevent nesting
const unwrapTokens = (root: HTMLElement) => {
    const tokens = root.querySelectorAll('.tts-token');
    tokens.forEach(token => {
        const text = token.textContent || "";
        const textNode = document.createTextNode(text);
        if (token.parentNode) {
            token.parentNode.replaceChild(textNode, token);
        }
    });
    root.normalize(); // Merge adjacent text nodes
};

const tokenizeAndWrap = (root: HTMLElement): { text: string, map: TokenMap[] } => {
    // Clean first
    unwrapTokens(root);

    const map: TokenMap[] = [];
    let fullText = "";

    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || "";
            if (!text) return;

            // Split by whitespace to identify words
            // Regex: split by whitespace but keep delimiters to preserve exact text reconstruction
            const parts = text.split(/(\s+)/);

            const fragment = document.createDocumentFragment();

            parts.forEach(part => {
                if (!part) return;

                // Check if part is purely whitespace
                if (/^\s+$/.test(part)) {
                    fragment.appendChild(document.createTextNode(part));
                    fullText += part;
                } else {
                    // It's a word/token
                    const span = document.createElement('span');
                    span.textContent = part;
                    // Add standard classes for smooth highlight
                    span.className = 'tts-token inline-block rounded-sm transition-colors duration-100';

                    const start = fullText.length;
                    fullText += part;
                    const end = fullText.length;

                    map.push({ start, end, span });
                    fragment.appendChild(span);
                }
            });

            if (node.parentNode) {
                node.parentNode.replaceChild(fragment, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (shouldSkipNode(node)) return;

            // Convert to array to avoid live collection issues during replacement
            const children = Array.from(node.childNodes);
            children.forEach(child => walk(child));

            // Handle block elements adding implicit newlines/spaces
            const tag = (node as Element).tagName;
            const style = window.getComputedStyle(node as Element);
            const isBlock = style.display === 'block' || ['P', 'DIV', 'BR', 'LI', 'H1', 'H2', 'H3', 'TR', 'UL', 'OL'].includes(tag);

            if (isBlock) {
                fullText += "\n";
            }
        }
    };

    // If already tokenized (re-run scenario), we might want to strip?
    // For now, assume fresh container or React unmounts/remounts content.
    // If not, we might wrap existing spans. To prevent this, check class.
    if (root.querySelector('.tts-token')) {
       unwrapTokens(root);
    }

    walk(root);
    return { text: fullText, map };
};

export const speakWithHighlight = (
    container: HTMLElement,
    rate: number = 1.0,
    lang: string = 'en-US',
    onEnd?: () => void
) => {
    stopSpeaking();

    const { text, map } = tokenizeAndWrap(container);
    currentMap = map;

    if (!text.trim()) {
        if (onEnd) onEnd();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.lang = lang;

    // Smart Language Detection
    if (/[\u0900-\u097F]/.test(text)) {
        utterance.lang = 'hi-IN';
    }

    utterance.onboundary = (event) => {
        if (event.name === 'word') {
            const charIndex = event.charIndex;

            // Find mapping that covers this charIndex
            // Since map is sorted by start, we can optimize, but find is fast enough for page-level text
            // We look for a token that *contains* the charIndex or is *nearest* after it.
            // onboundary often points to the start of the word.

            const token = map.find(m => charIndex >= m.start && charIndex < m.end);

            if (token) {
                // Clear previous
                clearHighlights();

                // Highlight current
                token.span.classList.add('bg-yellow-300', 'text-black');
                token.span.style.backgroundColor = '#fde047'; // yellow-300
                token.span.style.color = 'black';

                // Scroll into view if needed (throttled)
                token.span.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        }
    };

    utterance.onend = () => {
        clearHighlights();
        currentUtterance = null;
        if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        stopSpeaking();
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
};
