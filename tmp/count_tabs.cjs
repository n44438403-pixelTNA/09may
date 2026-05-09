const fs = require('fs');
const content = fs.readFileSync('components/AdminDashboard.tsx', 'utf8');
const matches = content.match(/activeTab === 'SYLLABUS_MANAGER'/g);
console.log(matches ? matches.length : 0);
