const fs = require('fs');
let code = fs.readFileSync('./components/RevisionHub.tsx', 'utf8');
code = code.replace(
`<button
                        onClick={() => setActiveFilter('WEAK_NOTES')}`,
`{hubMode !== 'FREE' && (
                    <button
                        onClick={() => setActiveFilter('WEAK_NOTES')}`
);

code = code.replace(
`<BookOpen size={18} /> Recommended Notes
                    </button>
                </div>`,
`<BookOpen size={18} /> Recommended Notes
                    </button>
                    )}
                </div>`
);
fs.writeFileSync('./components/RevisionHub.tsx', code);
