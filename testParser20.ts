import { parseMCQText } from './utils/mcqParser';

const text = `Question 11
🔥 PYQ Inspired: BSEB 2023
📖 Topic: रासायनिक समीकरणों का संतुलन
❓ Question:
निम्नलिखित कथनों पर विचार करें और सही विकल्प चुनें:
कथन 1: रासायनिक समीकरण को द्रव्यमान संरक्षण के नियम को संतुष्ट करने के लिए संतुलित किया जाता है।
कथन 2: संतुलित समीकरण में अभिकारकों और उत्पादों के परमाणुओं की संख्या असमान हो सकती है।
Options:
A) केवल कथन 1 सत्य है।
B) केवल कथन 2 सत्य है।
C) कथन 1 और 2 दोनों सत्य हैं।
D) दोनों कथन असत्य हैं।
✅ Correct Answer:
A) केवल कथन 1 सत्य है।`;

const res = parseMCQText(text);
console.dir(res, {depth: null});
