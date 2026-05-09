import katex from 'katex';

export const renderMathInHtml = (html: string): string => {
    if (!html) return '';

    // Replace $$...$$ (Display Mode)
    let processed = html.replace(/\$\$([^$]+)\$\$/g, (match, tex) => {
        try {
            return katex.renderToString(tex, { displayMode: true, throwOnError: false, strict: false });
        } catch (e) {
            return match;
        }
    });

    // Replace $...$ (Inline Mode)
    // Use a slightly stricter regex to prevent catastrophic matching across paragraphs if a dollar sign is missing.
    // We don't want a single $ to match all the way to a $ three paragraphs down.
    // We also disable strict mode so Hindi text inside math doesn't cause errors.

    processed = processed.replace(/\$([^$\n]+?)\$/g, (match, tex) => {
        try {
            return katex.renderToString(tex, { displayMode: false, throwOnError: false, strict: false });
        } catch (e) {
            return match;
        }
    });

    return processed;
};
