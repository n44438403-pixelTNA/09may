import fs from 'fs';

const p = 'competition_syllabus.ts';
let content = fs.readFileSync(p, 'utf8');

// Function to add numbering to an array
function renumberArray(text: string, arrayName: string) {
    const regex = new RegExp(`const ${arrayName} = \\[\n([\\s\\S]*?)\\];`);
    const match = content.match(regex);
    if (match) {
        let items = match[1].split(',\n').map(item => item.trim()).filter(i => i.length > 0);
        let numberedItems = items.map((item, index) => {
            // Remove existing quotes and numbers if any, then re-add quotes and correct number
            let cleanItem = item.replace(/^"[\d\.\s]*/, '"').replace(/"$/, '"');
            if (cleanItem.startsWith('"')) {
                cleanItem = cleanItem.substring(1);
            }
            if (cleanItem.endsWith('"')) {
                cleanItem = cleanItem.substring(0, cleanItem.length - 1);
            }
            return `"${index + 1}. ${cleanItem}"`;
        });
        const newArrayText = `const ${arrayName} = [\n${numberedItems.join(',\n')}\n];`;
        content = content.replace(match[0], newArrayText);
    }
}

renumberArray(content, 'COMPETITION_POLITY');
renumberArray(content, 'COMPETITION_GEOGRAPHY');
renumberArray(content, 'COMPETITION_HISTORY');
renumberArray(content, 'COMPETITION_PHYSICS');
renumberArray(content, 'COMPETITION_CHEMISTRY');
renumberArray(content, 'COMPETITION_BIOLOGY');
renumberArray(content, 'COMPETITION_ECONOMICS');

fs.writeFileSync(p, content);
console.log("Renumbering complete!");
