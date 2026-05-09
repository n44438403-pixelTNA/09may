export const findRelevantNote = (topicNotes: any[], subTopicName: string): any => {
    if (!topicNotes || !Array.isArray(topicNotes) || topicNotes.length === 0) return null;

    const normSearch = subTopicName.toLowerCase().trim();

    // Handle both `topic` and `title` keys for legacy/current format compatibility
    const getTopicName = (n: any) => (n.topic || n.title || "").toLowerCase().trim();

    // 1. Exact Match
    let match = topicNotes.find((n: any) => getTopicName(n) === normSearch);
    if (match) return match;

    // 2. Substring Match (Search in Note Topic)
    match = topicNotes.find((n: any) => getTopicName(n) && getTopicName(n).includes(normSearch));
    if (match) return match;

    // 3. Substring Match Reverse (Note Topic in Search)
    match = topicNotes.find((n: any) => getTopicName(n) && normSearch.includes(getTopicName(n)));
    if (match) return match;

    // Helper for Hindi-aware token normalization
    const normalizeTokens = (str: string) => {
        // Strip punctuation and numbers
        const cleanStr = str.replace(/[^\p{L}\p{M}\s]/gu, ' ').replace(/\d+/g, ' ');
        // Stop words in Hindi and English that are common in topics
        const stopWords = ['भाग', 'एवं', 'और', 'के', 'तथा', 'part', 'and', 'the', 'of', 'in', 'on', 'for', 'to'];
        return cleanStr.split(/\s+/)
            .filter(t => t.length > 0 && !stopWords.includes(t) && t.length > 1); // length > 1 to ignore single characters
    };

    // 4. Token Overlap (Best Effort)
    const searchTokens = normalizeTokens(normSearch);

    if (searchTokens.length > 0) {
        for (const note of topicNotes) {
            const topicName = getTopicName(note);
            if (!topicName) continue;

            const noteTokens = normalizeTokens(topicName);
            const matches = searchTokens.filter(t => noteTokens.includes(t));

            // If more than 50% of significant words match
            if (matches.length > 0 && matches.length >= Math.floor(searchTokens.length / 2)) {
                return note;
            }
        }
    }

    return null;
};

export const formatMcqNotes = (text: string): string => {
    if (!text) return "";

    // If it already contains typical HTML block tags, assume it's formatted HTML
    // But we might still want to parse our specific MCQ blocks if they were pasted raw inside HTML
    let formatted = text;

    // We only want to escape if it's purely raw text, but users might mix.
    // Let's assume if it contains </p> or </div> it's HTML, else it's raw text.
    const isHtml = text.includes('</div>') || text.includes('</p>');

    if (!isHtml) {
        // Escape basic HTML to avoid injection if it's raw text
        formatted = formatted.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // --- MCQ PARSING ---
    // 1. Question Header (e.g. Question 1)
    formatted = formatted.replace(/(Question\s+\d+)/gi, '<div class="bg-indigo-50 border border-indigo-100 p-3 rounded-lg mt-6 mb-3"><h3 class="text-indigo-800 font-black text-lg m-0">$1</h3></div>');

    // 2. Metadata (PYQ, Topic)
    formatted = formatted.replace(/🔥 (PYQ Inspired:.*?)(?=<br|\n|$)/g, '<div class="text-xs font-bold text-orange-600 mb-1 flex items-center gap-1"><span class="text-lg">🔥</span> $1</div>');
    formatted = formatted.replace(/📖 (Topic:.*?)(?=<br|\n|$)/g, '<div class="text-xs font-bold text-blue-600 mb-3 flex items-center gap-1"><span class="text-lg">📖</span> $1</div>');

    // 3. Question Text
    formatted = formatted.replace(/❓ Question:\s*([\s\S]*?)(?=Options:|✅ Correct Answer:|$)/g, (match, qText) => {
        return `<div class="font-bold text-slate-800 text-base mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200"><span class="text-lg">❓</span> ${qText.trim().replace(/\n/g, '<br/>')}</div>`;
    });

    // 4. Options (A, B, C, D) - making them look like non-clickable buttons
    formatted = formatted.replace(/Options:\s*([\s\S]*?)(?=✅ Correct Answer:|$)/g, (match, optionsText) => {
        let opts = optionsText.split(/\n|<br\/>|<br>/).filter((o: string) => o.trim() !== '');
        let optsHtml = opts.map((o: string) => {
            const isSelected = false; // Static view, no selection
            return `<div class="bg-white border-2 border-slate-100 p-3 rounded-xl mb-2 text-sm text-slate-700 font-bold shadow-sm flex items-start gap-2">
                <div class="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0"></div>
                <div>${o.trim()}</div>
            </div>`;
        }).join('');
        return `<div class="mb-5"><h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Options (Read-Only)</h4>${optsHtml}</div>`;
    });

    // 5. Correct Answer
    formatted = formatted.replace(/✅ Correct Answer:\s*([\s\S]*?)(?=💡 Concept:|🔎 Explanation:|🎯 Exam Tip:|⚠ Common Mistake:|🧠 Memory Trick:|📊 Difficulty Level:|Question \d+|$)/g, (match, ansText) => {
        return `<div class="bg-green-50 border border-green-200 p-4 rounded-xl mb-4 text-green-800 text-sm font-bold flex gap-3 items-start shadow-sm">
            <span class="text-xl leading-none">✅</span>
            <div>
                <span class="block text-[10px] font-black uppercase tracking-wider text-green-600 mb-1">Correct Answer</span>
                ${ansText.trim().replace(/\n/g, '<br/>')}
            </div>
        </div>`;
    });

    // 6. Detailed Blocks
    const sections = [
        { regex: /💡 Concept:\s*([\s\S]*?)(?=(🔎|🎯|⚠|🧠|📊|Question \d+|$))/g, icon: '💡', title: 'Concept', color: 'blue' },
        { regex: /🔎 Explanation:\s*([\s\S]*?)(?=(🎯|⚠|🧠|📊|Question \d+|$))/g, icon: '🔎', title: 'Explanation', color: 'slate' },
        { regex: /🎯 Exam Tip:\s*([\s\S]*?)(?=(⚠|🧠|📊|Question \d+|$))/g, icon: '🎯', title: 'Exam Tip', color: 'purple' },
        { regex: /⚠ Common Mistake:\s*([\s\S]*?)(?=(🧠|📊|Question \d+|$))/g, icon: '⚠', title: 'Common Mistake', color: 'red' },
        { regex: /🧠 Memory Trick:\s*([\s\S]*?)(?=(📊|Question \d+|$))/g, icon: '🧠', title: 'Memory Trick', color: 'pink' },
        { regex: /📊 Difficulty Level:\s*([\s\S]*?)(?=(Question \d+|$))/g, icon: '📊', title: 'Difficulty Level', color: 'orange' },
    ];

    sections.forEach(sec => {
        formatted = formatted.replace(sec.regex, (match, contentText) => {
            let innerText = contentText.trim().replace(/\n/g, '<br/>');
            return `<div class="bg-${sec.color}-50 border border-${sec.color}-100 p-4 rounded-xl mb-3 text-${sec.color}-800 text-sm">
                <div class="font-black mb-2 flex items-center gap-2 text-${sec.color}-700 uppercase tracking-wide text-xs">
                    <span class="text-base">${sec.icon}</span> ${sec.title}
                </div>
                <div class="leading-relaxed opacity-90">${innerText}</div>
            </div>`;
        });
    });

    // 7. General Headers (Definition, Key Concepts)
    formatted = formatted.replace(/Definition:(.*?)(?=<br|\n|$)/g, '<div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-4 shadow-sm"><strong class="text-yellow-800 uppercase text-xs tracking-wider mb-1 block">Definition</strong><span class="text-yellow-900 text-sm">$1</span></div>');

    formatted = formatted.replace(/Key Concepts:\s*([\s\S]*?)(?=Question \d+|$)/g, (match, p1) => {
        let lines = p1.trim().split(/\n|<br\/>|<br>/).filter((l: string) => l.trim() !== '');
        let listHtml = lines.map((l: string) => `<li class="mb-2 pl-1">${l.trim()}</li>`).join('');
        return `<div class="bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
            <h4 class="font-black text-slate-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2"><div class="w-2 h-4 bg-indigo-500 rounded-full"></div> Key Concepts</h4>
            <ul class="list-disc list-inside text-sm text-slate-600 leading-relaxed marker:text-indigo-400">${listHtml}</ul>
        </div>`;
    });

    // 8. Convert remaining newlines to <br/> if not HTML
    if (!isHtml) {
        // We only replace newlines that aren't inside our newly generated div tags.
        // Actually, it's safer to just replace all \n with <br/> before parsing or handle it gracefully.
        // Since we already parsed the known blocks, remaining text might just need <br/>
        // Let's replace \n with <br/> but ensure we don't double <br/> inside our generated HTML.
        // A simple trick: since we generated valid HTML without \n (we used \n in our template literals? no, we used inline).
        formatted = formatted.replace(/\n/g, '<br/>');
        // Clean up excessive <br/> tags
        formatted = formatted.replace(/(<br\/>\s*){3,}/g, '<br/><br/>');
    }

    return formatted;
};
