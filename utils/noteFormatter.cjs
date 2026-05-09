"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMcqNotes = void 0;
var formatMcqNotes = function (text) {
    if (!text)
        return "";
    // If it already contains typical HTML block tags, assume it's formatted HTML
    // But we might still want to parse our specific MCQ blocks if they were pasted raw inside HTML
    var formatted = text;
    // We only want to escape if it's purely raw text, but users might mix.
    // Let's assume if it contains </p> or </div> it's HTML, else it's raw text.
    var isHtml = text.includes('</div>') || text.includes('</p>');
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
    formatted = formatted.replace(/❓ Question:\s*([\s\S]*?)(?=Options:|✅ Correct Answer:|$)/g, function (match, qText) {
        return "<div class=\"font-bold text-slate-800 text-base mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200\"><span class=\"text-lg\">\u2753</span> ".concat(qText.trim().replace(/\n/g, '<br/>'), "</div>");
    });
    // 4. Options (A, B, C, D) - making them look like non-clickable buttons
    formatted = formatted.replace(/Options:\s*([\s\S]*?)(?=✅ Correct Answer:|$)/g, function (match, optionsText) {
        var opts = optionsText.split(/\n|<br\/>|<br>/).filter(function (o) { return o.trim() !== ''; });
        var optsHtml = opts.map(function (o) {
            var isSelected = false; // Static view, no selection
            return "<div class=\"bg-white border-2 border-slate-100 p-3 rounded-xl mb-2 text-sm text-slate-700 font-bold shadow-sm flex items-start gap-2\">\n                <div class=\"w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0\"></div>\n                <div>".concat(o.trim(), "</div>\n            </div>");
        }).join('');
        return "<div class=\"mb-5\"><h4 class=\"text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1\">Options (Read-Only)</h4>".concat(optsHtml, "</div>");
    });
    // 5. Correct Answer
    formatted = formatted.replace(/✅ Correct Answer:\s*([\s\S]*?)(?=💡 Concept:|🔎 Explanation:|🎯 Exam Tip:|⚠ Common Mistake:|🧠 Memory Trick:|📊 Difficulty Level:|Question \d+|$)/g, function (match, ansText) {
        return "<div class=\"bg-green-50 border border-green-200 p-4 rounded-xl mb-4 text-green-800 text-sm font-bold flex gap-3 items-start shadow-sm\">\n            <span class=\"text-xl leading-none\">\u2705</span> \n            <div>\n                <span class=\"block text-[10px] font-black uppercase tracking-wider text-green-600 mb-1\">Correct Answer</span>\n                ".concat(ansText.trim().replace(/\n/g, '<br/>'), "\n            </div>\n        </div>");
    });
    // 6. Detailed Blocks
    var sections = [
        { regex: /💡 Concept:\s*([\s\S]*?)(?=(🔎|🎯|⚠|🧠|📊|Question \d+|$))/g, icon: '💡', title: 'Concept', color: 'blue' },
        { regex: /🔎 Explanation:\s*([\s\S]*?)(?=(🎯|⚠|🧠|📊|Question \d+|$))/g, icon: '🔎', title: 'Explanation', color: 'slate' },
        { regex: /🎯 Exam Tip:\s*([\s\S]*?)(?=(⚠|🧠|📊|Question \d+|$))/g, icon: '🎯', title: 'Exam Tip', color: 'purple' },
        { regex: /⚠ Common Mistake:\s*([\s\S]*?)(?=(🧠|📊|Question \d+|$))/g, icon: '⚠', title: 'Common Mistake', color: 'red' },
        { regex: /🧠 Memory Trick:\s*([\s\S]*?)(?=(📊|Question \d+|$))/g, icon: '🧠', title: 'Memory Trick', color: 'pink' },
        { regex: /📊 Difficulty Level:\s*([\s\S]*?)(?=(Question \d+|$))/g, icon: '📊', title: 'Difficulty Level', color: 'orange' },
    ];
    sections.forEach(function (sec) {
        formatted = formatted.replace(sec.regex, function (match, contentText) {
            var innerText = contentText.trim().replace(/\n/g, '<br/>');
            return "<div class=\"bg-".concat(sec.color, "-50 border border-").concat(sec.color, "-100 p-4 rounded-xl mb-3 text-").concat(sec.color, "-800 text-sm\">\n                <div class=\"font-black mb-2 flex items-center gap-2 text-").concat(sec.color, "-700 uppercase tracking-wide text-xs\">\n                    <span class=\"text-base\">").concat(sec.icon, "</span> ").concat(sec.title, "\n                </div>\n                <div class=\"leading-relaxed opacity-90\">").concat(innerText, "</div>\n            </div>");
        });
    });
    // 7. General Headers (Definition, Key Concepts)
    formatted = formatted.replace(/Definition:(.*?)(?=<br|\n|$)/g, '<div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-4 shadow-sm"><strong class="text-yellow-800 uppercase text-xs tracking-wider mb-1 block">Definition</strong><span class="text-yellow-900 text-sm">$1</span></div>');
    formatted = formatted.replace(/Key Concepts:\s*([\s\S]*?)(?=Question \d+|$)/g, function (match, p1) {
        var lines = p1.trim().split(/\n|<br\/>|<br>/).filter(function (l) { return l.trim() !== ''; });
        var listHtml = lines.map(function (l) { return "<li class=\"mb-2 pl-1\">".concat(l.trim(), "</li>"); }).join('');
        return "<div class=\"bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm\">\n            <h4 class=\"font-black text-slate-800 text-sm uppercase tracking-wider mb-3 flex items-center gap-2\"><div class=\"w-2 h-4 bg-indigo-500 rounded-full\"></div> Key Concepts</h4>\n            <ul class=\"list-disc list-inside text-sm text-slate-600 leading-relaxed marker:text-indigo-400\">".concat(listHtml, "</ul>\n        </div>");
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
exports.formatMcqNotes = formatMcqNotes;
