
import { ClassLevel, Subject, Chapter, LessonContent, Language, Board, Stream, ContentType, MCQItem, SystemSettings } from "../types";
import { STATIC_SYLLABUS, DEFAULT_SUBJECTS } from "../constants";
import { getChapterData, getCustomSyllabus, incrementApiUsage, getApiUsage, rtdb, getSystemSettings, getSecureKeys } from "../firebase";
import { ref, get } from "firebase/database";
import { storage } from "../utils/storage";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Helper to get a random valid Groq API key
const getGroqApiKey = async () => {
    const keys = await getSecureKeys();
    if (!keys || keys.length === 0) {
        console.warn("No Groq API keys found in Firebase Secure Store.");
        return null;
    }
    return keys[Math.floor(Math.random() * keys.length)];
};

// GROQ API CALL HELPER
export const callGroqApi = async (messages: any[], model: string = "llama-3.1-8b-instant") => {
    // Validate model
    let modelToUse = model;

    try {
        const settings = await getSystemSettings();
        if (settings?.aiModel) {
            modelToUse = settings.aiModel;
        }
    } catch (e) {
        console.warn("Failed to fetch settings, using default/provided model", e);
    }

    const ALLOWED_MODELS = [
        "llama-3.1-8b-instant",
        "llama-3.1-70b-versatile",
        "mixtral-8x7b-32768",
        "llama-3.3-70b-versatile"
    ];

    if (!ALLOWED_MODELS.includes(modelToUse)) {
        modelToUse = "llama-3.1-8b-instant";
    }

    const apiKey = await getGroqApiKey();
    if (!apiKey) {
        return "⚠️ AI Service Error: Admin has not configured Groq API Keys in the dashboard yet.";
    }

    // Direct call to Groq API
    try {
        const response = await fetch(GROQ_ENDPOINT, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Groq API Error: ${response.status} - ${errorText}`);
            return "⚠️ AI Service is currently unavailable. Please check API keys or quota.";
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "No response generated.";
    } catch (error) {
        console.error("Groq API Call Failed:", error);
        return "⚠️ AI Service Error: Unable to connect.";
    }
};

// NEW: Tool Support
export const callGroqApiWithTools = async (messages: any[], tools: any[], model: string = "llama-3.3-70b-versatile") => {
    const apiKey = await getGroqApiKey();
    if (!apiKey) {
        return { content: "⚠️ AI Service Error: Admin has not configured Groq API Keys." };
    }

    try {
        const response = await fetch(GROQ_ENDPOINT, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                messages,
                tools,
                tool_choice: "auto"
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Groq API Error: ${response.status} - ${errorText}`);
            return { content: "⚠️ AI Error." };
        }

        const data = await response.json();
        return data.choices?.[0]?.message || { content: "No response." };
    } catch (error) {
        return { content: "⚠️ AI Connection Error." };
    }
};

// STREAMING API CALL
export const callGroqApiStream = async (messages: any[], onChunk: (text: string) => void, model: string = "llama-3.1-8b-instant") => {
    let safeModel = model;
    if (!safeModel || safeModel.includes("gemini")) safeModel = "llama-3.1-8b-instant";

    const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: safeModel, messages, stream: true })
    });

    if (!response.ok) throw new Error("Groq API Stream Error");
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6);
                if (jsonStr.trim() === '[DONE]') return accumulated;
                try {
                    const json = JSON.parse(jsonStr);
                    const content = json.choices?.[0]?.delta?.content || "";
                    if (content) {
                        accumulated += content;
                        onChunk(accumulated);
                    }
                } catch (e) {}
            }
        }
    }
    return accumulated;
};

export const executeWithRotation = async <T>(
    operation: () => Promise<T>,
    usageType: 'PILOT' | 'STUDENT' = 'STUDENT'
): Promise<T> => {
    
    // QUOTA CHECK
    try {
        const usage = await getApiUsage();
        if (usage) {
            const settingsStr = localStorage.getItem('nst_system_settings');
            const settings = settingsStr ? JSON.parse(settingsStr) : {};
            const pilotRatio = settings.aiPilotRatio || 80;
            const dailyLimit = settings.aiDailyLimitPerKey || 1500;
            
            // Assume capacity of 5000 since keys are managed on server
            const totalCapacity = Math.max(10 * dailyLimit, 5000);

            const pilotLimit = Math.floor(totalCapacity * (pilotRatio / 100));
            const studentLimit = totalCapacity - pilotLimit;

            if (usageType === 'PILOT') {
                if ((usage.pilotCount || 0) >= pilotLimit) throw new Error(`AI Pilot Quota Exceeded (${usage.pilotCount}/${pilotLimit})`);
            } else {
                 if ((usage.studentCount || 0) >= studentLimit) throw new Error(`Student AI Quota Exceeded. Try again later.`);
            }
        }
    } catch(e: any) {
        if (e.message && e.message.includes("Quota Exceeded")) throw e;
    }

    // RETRY LOGIC
    const MAX_RETRIES = 2;
    for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
            const result = await operation();

            // TRACK USAGE (Global, using index 0)
            incrementApiUsage(0, usageType);

            return result;
        } catch (error: any) {
            const msg = error?.message || "";
            
            console.warn(`Attempt ${i + 1} failed: ${msg}`);
            
            if (i === MAX_RETRIES) {
                // If 429 or server error, the server might be busy or keys exhausted
                if (msg.includes("429") || msg.includes("500") || msg.includes("503")) {
                     throw new Error("AI services are currently busy. Please try again later.");
                }
                throw error;
            }
            // Wait a bit before retry
            await new Promise(res => setTimeout(res, 1000 * (i + 1)));
        }
    }
    
    throw new Error("Unexpected error in AI service.");
};

// --- PARALLEL BULK EXECUTION ENGINE ---
const executeBulkParallel = async <T>(
    tasks: (() => Promise<T>)[],
    concurrency: number = 20, // Default to 20 parallel requests
    usageType: 'PILOT' | 'STUDENT' = 'STUDENT'
): Promise<T[]> => {

    console.log(`🚀 Starting Bulk Engine (Groq): ${tasks.length} tasks (Parallelism: ${concurrency})`);

    const results: T[] = new Array(tasks.length);
    let taskIndex = 0;
    
    // Worker function: Grabs next task
    const worker = async (workerId: number) => {
        while (taskIndex < tasks.length) {
            const currentTaskIndex = taskIndex++; // Atomic grab
            if (currentTaskIndex >= tasks.length) break;

            const task = tasks[currentTaskIndex];
            
            try {
                // We use executeWithRotation for individual task retry/usage tracking
                // But wait, executeWithRotation does usage tracking.
                // If we wrap task in executeWithRotation, it works.
                // Or we can just call task() if task already includes tracking?
                // The task definition below (in fetchLessonContent) calls callGroqApi directly usually.
                // So we should manually handle usage or just run task.
                
                // Let's assume task() is just the API call wrapper
                const result = await task();
                results[currentTaskIndex] = result;

                // TRACK USAGE
                incrementApiUsage(0, usageType);

            } catch (error) {
                console.error(`Task ${currentTaskIndex} failed:`, error);
            }
        }
    };

    const activeWorkers = Math.min(concurrency, tasks.length); 
    const workers = Array.from({ length: activeWorkers }, (_, i) => worker(i));
    
    await Promise.all(workers);
    return results.filter(r => r !== undefined && r !== null);
};

const chapterCache: Record<string, Chapter[]> = {};
const cleanJson = (text: string) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// NEW TRANSLATION HELPER
export const translateToHindi = async (content: string, isJson: boolean = false, usageType: 'PILOT' | 'STUDENT' = 'STUDENT'): Promise<string> => {
    const prompt = `
    You are an expert translator for Bihar Board students.
    Translate the following ${isJson ? 'JSON Data' : 'Educational Content'} into Hindi (Devanagari).
    
    Style Guide:
    - Use "Hinglish" for technical terms (e.g., "Force" -> "Force (बल)").
    - Keep tone simple and student-friendly.
    - ${isJson ? 'Maintain strict JSON structure. Only translate values (question, options, explanation, etc). Do NOT translate keys.' : 'Keep Markdown formatting intact.'}

    CONTENT:
    ${content}
    `;

    return await executeWithRotation(async () => {
        return await callGroqApi([{ role: "user", content: prompt }]);
    }, usageType);
};

// --- UPDATED CONTENT LOOKUP (ASYNC) ---
const getAdminContent = async (
    board: Board, 
    classLevel: ClassLevel, 
    stream: Stream | null, 
    subject: Subject, 
    chapterId: string,
    type: ContentType,
    syllabusMode: 'SCHOOL' | 'COMPETITION' = 'SCHOOL'
): Promise<LessonContent | null> => {
    // STRICT KEY MATCHING WITH ADMIN
    const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
    // Key format used in AdminDashboard to save content
    const key = `nst_content_${board}_${classLevel}${streamKey}_${subject.name}_${chapterId}`;
    
    try {
        // FETCH FROM FIREBASE FIRST
        let parsed = await getChapterData(key);
        
        if (!parsed) {
            // Fallback to Storage (for Admin's offline view)
            parsed = await storage.getItem(key);
        }

        if (parsed) {
            // ... (Logic copied from gemini.ts mostly unchanged as it deals with data retrieval)
            
            // 1. FREE NOTES (PDF_FREE or NOTES_SIMPLE)
            if (type === 'PDF_FREE' || type === 'NOTES_SIMPLE') {
                const linkKey = syllabusMode === 'SCHOOL' ? 'schoolPdfLink' : 'competitionPdfLink';
                const htmlKey = syllabusMode === 'SCHOOL' ? 'schoolFreeNotesHtml' : 'competitionFreeNotesHtml';
                
                const link = parsed[linkKey] || parsed.freeLink;
                const html = parsed[htmlKey] || parsed.freeNotesHtml;

                if (link && type === 'PDF_FREE') {
                    return {
                        id: Date.now().toString(),
                        title: "Free Study Material",
                        subtitle: "Provided by Admin",
                        content: link,
                        type: 'PDF_FREE',
                        dateCreated: new Date().toISOString(),
                        subjectName: subject.name,
                        isComingSoon: false
                    };
                }
                
                if (html && (type === 'NOTES_SIMPLE' || type === 'PDF_FREE')) {
                     return {
                        id: Date.now().toString(),
                        title: "Study Notes",
                        subtitle: "Detailed Notes (Admin)",
                        content: html,
                        type: 'NOTES_SIMPLE',
                        dateCreated: new Date().toISOString(),
                        subjectName: subject.name,
                        isComingSoon: false
                    };
                }
            }

            // 2. PREMIUM NOTES (PDF_PREMIUM or NOTES_PREMIUM)
            if (type === 'PDF_PREMIUM' || type === 'NOTES_PREMIUM') {
                const linkKey = syllabusMode === 'SCHOOL' ? 'schoolPdfPremiumLink' : 'competitionPdfPremiumLink';
                const htmlKey = syllabusMode === 'SCHOOL' ? 'schoolPremiumNotesHtml' : 'competitionPremiumNotesHtml';
                
                const link = parsed[linkKey] || parsed.premiumLink;
                const html = parsed[htmlKey] || parsed.premiumNotesHtml;

                if (link && type === 'PDF_PREMIUM') {
                    return {
                        id: Date.now().toString(),
                        title: "Premium Notes",
                        subtitle: "High Quality Content",
                        content: link,
                        type: 'PDF_PREMIUM',
                        dateCreated: new Date().toISOString(),
                        subjectName: subject.name,
                        isComingSoon: false
                    };
                }

                if (html && (type === 'NOTES_PREMIUM' || type === 'PDF_PREMIUM')) {
                    const htmlKeyHI = syllabusMode === 'SCHOOL' ? 'schoolPremiumNotesHtml_HI' : 'competitionPremiumNotesHtml_HI';
                    const htmlHI = parsed[htmlKeyHI];

                    return {
                        id: Date.now().toString(),
                        title: "Premium Notes",
                        subtitle: "Exclusive Content (Admin)",
                        content: html,
                        type: 'NOTES_PREMIUM',
                        dateCreated: new Date().toISOString(),
                        subjectName: subject.name,
                        isComingSoon: false,
                        schoolPremiumNotesHtml_HI: syllabusMode === 'SCHOOL' ? htmlHI : undefined,
                        competitionPremiumNotesHtml_HI: syllabusMode === 'COMPETITION' ? htmlHI : undefined
                    };
                }
            }

            // Video Lecture
            if (type === 'VIDEO_LECTURE' && (parsed.premiumVideoLink || parsed.freeVideoLink)) {
                return {
                    id: Date.now().toString(),
                    title: "Video Lecture",
                    subtitle: "Watch Class",
                    content: parsed.premiumVideoLink || parsed.freeVideoLink,
                    type: 'PDF_VIEWER',
                    dateCreated: new Date().toISOString(),
                    subjectName: subject.name,
                    isComingSoon: false
                };
            }

            // Legacy Fallback
            if (type === 'PDF_VIEWER' && parsed.link) {
                return {
                    id: Date.now().toString(),
                    title: "Class Notes", 
                    subtitle: "Provided by Teacher",
                    content: parsed.link, 
                    type: 'PDF_VIEWER',
                    dateCreated: new Date().toISOString(),
                    subjectName: subject.name,
                    isComingSoon: false
                };
            }
            
            // Check for Manual MCQs
            if ((type === 'MCQ_SIMPLE' || type === 'MCQ_ANALYSIS') && parsed.manualMcqData) {
                return {
                    id: Date.now().toString(),
                    title: "Class Test (Admin)",
                    subtitle: `${parsed.manualMcqData.length} Questions`,
                    content: '',
                    type: type,
                    dateCreated: new Date().toISOString(),
                    subjectName: subject.name,
                    mcqData: parsed.manualMcqData,
                    manualMcqData_HI: parsed.manualMcqData_HI
                }
            }
        }
    } catch (e) {
        console.error("Content Lookup Error", e);
    }
    return null;
};

export const fetchChapters = async (
  board: Board,
  classLevel: ClassLevel, 
  stream: Stream | null,
  subject: Subject,
  language: Language
): Promise<Chapter[]> => {
  const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
  const cacheKey = `${board}-${classLevel}${streamKey}-${subject.name}-${language}`;
  
  const firebaseChapters = await getCustomSyllabus(cacheKey);
  if (firebaseChapters && firebaseChapters.length > 0) {
      return firebaseChapters;
  }

  const customChapters = await storage.getItem<Chapter[]>(`nst_custom_chapters_${cacheKey}`);
  if (customChapters && customChapters.length > 0) return customChapters;

  if (chapterCache[cacheKey]) return chapterCache[cacheKey];

  const staticKey = `${board}-${classLevel}-${subject.name}`;
  let staticList = STATIC_SYLLABUS[staticKey];

  // FALLBACK: If direct lookup fails (e.g. Hindi subject name), try English lookup via ID
  if (!staticList) {
      const defaultSub = Object.values(DEFAULT_SUBJECTS).find(s => s.id === subject.id);
      if (defaultSub) {
          const fallbackKey = `${board}-${classLevel}-${defaultSub.name}`;
          staticList = STATIC_SYLLABUS[fallbackKey];
      }
  }

  if (staticList && staticList.length > 0) {
      const chapters: Chapter[] = staticList.map((title, idx) => ({
          id: `static-${idx + 1}`,
          title: title,
          description: `Chapter ${idx + 1}`
      }));
      chapterCache[cacheKey] = chapters;
      return chapters;
  }

  let modelName = "llama-3.1-8b-instant";
  try {
      const s = localStorage.getItem('nst_system_settings');
      if (s) { const p = JSON.parse(s); if(p.aiModel) modelName = p.aiModel; }
  } catch(e){}

  const prompt = `List 15 standard chapters for ${classLevel === 'COMPETITION' ? 'Competitive Exam' : `Class ${classLevel}`} ${stream ? stream : ''} Subject: ${subject.name} (${board}). Language: ${language}. Return JSON array: [{"title": "...", "description": "..."}].`;
  try {
    const data = await executeWithRotation(async () => {
        const content = await callGroqApi([
             { role: "system", content: "You are a helpful educational assistant. You MUST return strictly valid JSON array. Do not wrap in markdown block." },
             { role: "user", content: prompt }
        ], modelName);
        return JSON.parse(cleanJson(content || '[]'));
    }, 'STUDENT');
    const chapters: Chapter[] = data.map((item: any, index: number) => ({
      id: `ch-${index + 1}`,
      title: item.title,
      description: item.description || ''
    }));
    chapterCache[cacheKey] = chapters;
    return chapters;
  } catch (error) {
    console.error("Chapter Fetch Error:", error);
    const data = [{id:'1', title: 'Chapter 1'}, {id:'2', title: 'Chapter 2'}];
    chapterCache[cacheKey] = data;
    return data;
  }
};

const processTemplate = (template: string, replacements: Record<string, string>) => {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`{${key}}`, 'gi'), value);
    }
    return result;
};

// --- MAIN CONTENT FUNCTION (UPDATED FOR GROQ) ---
export const fetchLessonContent = async (
  board: Board,
  classLevel: ClassLevel,
  stream: Stream | null,
  subject: Subject,
  chapter: Chapter,
  language: Language,
  type: ContentType,
  existingMCQCount: number = 0,
  isPremium: boolean = false,
  targetQuestions: number = 15,
  adminPromptOverride: string = "",
  allowAiGeneration: boolean = false,
  syllabusMode: 'SCHOOL' | 'COMPETITION' = 'SCHOOL',
  forceRegenerate: boolean = false,
  dualGeneration: boolean = false,
  usageType: 'PILOT' | 'STUDENT' = 'STUDENT',
  onStream?: (text: string) => void
): Promise<LessonContent> => {
  
  let customInstruction = "";
  let modelName = "llama-3.1-8b-instant";
  let promptNotes = "";
  let promptNotesPremium = "";
  let promptMCQ = "";

  try {
      const stored = localStorage.getItem('nst_system_settings');
      if (stored) {
          const s = JSON.parse(stored) as SystemSettings;
          if (s.aiInstruction) customInstruction = `IMPORTANT INSTRUCTION: ${s.aiInstruction}`;
          if (s.aiModel) modelName = s.aiModel; // Allow override, but default is Llama3
          
          // ... (Prompt loading logic same as Gemini) ...
           if (syllabusMode === 'COMPETITION') {
              if (board === 'CBSE') {
                  if (s.aiPromptNotesCompetitionCBSE) promptNotes = s.aiPromptNotesCompetitionCBSE;
                  if (s.aiPromptNotesPremiumCompetitionCBSE) promptNotesPremium = s.aiPromptNotesPremiumCompetitionCBSE;
                  if (s.aiPromptMCQCompetitionCBSE) promptMCQ = s.aiPromptMCQCompetitionCBSE;
              }
              if (!promptNotes && s.aiPromptNotesCompetition) promptNotes = s.aiPromptNotesCompetition;
              if (!promptNotesPremium && s.aiPromptNotesPremiumCompetition) promptNotesPremium = s.aiPromptNotesPremiumCompetition;
              if (!promptMCQ && s.aiPromptMCQCompetition) promptMCQ = s.aiPromptMCQCompetition;

          } else {
              if (board === 'CBSE') {
                  if (s.aiPromptNotesCBSE) promptNotes = s.aiPromptNotesCBSE;
                  if (s.aiPromptNotesPremiumCBSE) promptNotesPremium = s.aiPromptNotesPremiumCBSE;
                  if (s.aiPromptMCQCBSE) promptMCQ = s.aiPromptMCQCBSE;
              }
              if (!promptNotes && s.aiPromptNotes) promptNotes = s.aiPromptNotes;
              if (!promptNotesPremium && s.aiPromptNotesPremium) promptNotesPremium = s.aiPromptNotesPremium;
              if (!promptMCQ && s.aiPromptMCQ) promptMCQ = s.aiPromptMCQ;
          }
      }
  } catch(e) {}

  if (!forceRegenerate) {
      const adminContent = await getAdminContent(board, classLevel, stream, subject, chapter.id, type, syllabusMode);
      if (adminContent) {
          return {
              ...adminContent,
              title: chapter.title, 
          };
      }
  }

  if (type === 'PDF_FREE' || type === 'PDF_PREMIUM' || type === 'PDF_VIEWER') {
      return {
          id: Date.now().toString(),
          title: chapter.title,
          subtitle: "Content Unavailable",
          content: "",
          type: type,
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          isComingSoon: true 
      };
  }

  if (!allowAiGeneration) {
      return {
          id: Date.now().toString(),
          title: chapter.title,
          subtitle: "Content Unavailable",
          content: "",
          type: type,
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          isComingSoon: true
      };
  }
  
  // MCQ Mode
  if (type === 'MCQ_ANALYSIS' || type === 'MCQ_SIMPLE') {
      const effectiveCount = Math.max(targetQuestions, 20); 

      let prompt = "";
      if (promptMCQ) {
           prompt = processTemplate(promptMCQ, {
               board: board || '',
               class: classLevel,
               stream: stream || '',
               subject: subject.name,
               chapter: chapter.title,
               language: language,
               count: effectiveCount.toString(),
               instruction: customInstruction
           });
           if (adminPromptOverride) prompt += `\nINSTRUCTION: ${adminPromptOverride}`;
      } else {
          const competitionConstraints = syllabusMode === 'COMPETITION' 
              ? "STYLE: Fact-Heavy, Direct. HIGHLIGHT PYQs (Previous Year Questions) if relevant." 
              : "STYLE: Strict NCERT Pattern.";

          prompt = `${customInstruction}
          ${adminPromptOverride ? `INSTRUCTION: ${adminPromptOverride}` : ''}
          Create ${effectiveCount} MCQs for ${board} Class ${classLevel} ${subject.name}, Chapter: "${chapter.title}". 
          Language: ${language}.
          ${competitionConstraints}
          
          STRICT FORMAT RULE:
          Return ONLY a valid JSON array. No markdown blocks, no extra text.
          The output must use exactly these JSON keys to map to the user's requested format:
          [
            {
              "question": "Question text (Question (प्रश्न): ❓)",
              "options": ["A", "B", "C", "D"] (Options (विकल्प): A), B), C), D)),
              "correctAnswer": 0, // Index 0-3 (Correct Answer (सही उत्तर): ✅)
              "explanation": "Logical explanation here (Explanation (व्याख्या): 🔎)",
              "mnemonic": "Short memory trick (Memory Trick (याद रखने का तरीका): 🧠)",
              "concept": "Core concept (Concept (अवधारणा): 💡)",
              "examTip": "Useful tip for exams (Exam Tip (परीक्षा टिप): 🎯)",
              "commonMistake": "A common mistake students make (Common Mistake (सामान्य गलती): ⚠)",
              "difficulty": "EASY, MEDIUM, or HARD (Difficulty Level (कठिनाई): 📊)",
              "topic": "Topic Name (Topic (विषय): 📖)"
            }
          ]
          
          CRITICAL: You MUST return EXACTLY ${effectiveCount} questions. 
          Provide a very diverse set of questions covering every small detail of the chapter.`;
      }

      let data: any[] = [];

      // SYSTEM PROMPT FOR MCQ
      const mcqSystemPrompt = "You are an exam generator. You MUST return strict valid JSON array only. No introduction, no markdown formatting (like ```json), no ending notes. Just the raw JSON array.";

      if (effectiveCount > 30) {
          const batchSize = 20; 
          const batches = Math.ceil(effectiveCount / batchSize);
          const tasks: (() => Promise<any[]>)[] = [];

          for (let i = 0; i < batches; i++) {
              tasks.push(async () => {
                  const batchPrompt = processTemplate(prompt, {
                      board: board || '',
                      class: classLevel,
                      stream: stream || '',
                      subject: subject.name,
                      chapter: chapter.title,
                      language: language,
                      count: batchSize.toString(),
                      instruction: `${customInstruction}\nBATCH ${i+1}/${batches}. Ensure diversity. Avoid duplicates from previous batches if possible.`
                  });

                  const content = await callGroqApi([
                      { role: "system", content: mcqSystemPrompt },
                      { role: "user", content: batchPrompt }
                  ], modelName);
                  return JSON.parse(cleanJson(content || '[]'));
              });
          }

          const allResults = await executeBulkParallel(tasks, 50, usageType);
          data = allResults.flat();
          
          const seen = new Set();
          data = data.filter(q => {
              const duplicate = seen.has(q.question);
              seen.add(q.question);
              return !duplicate;
          });
          
          if (data.length > effectiveCount) data = data.slice(0, effectiveCount);

      } else {
          data = await executeWithRotation(async () => {
              const content = await callGroqApi([
                  { role: "system", content: mcqSystemPrompt },
                  { role: "user", content: prompt }
              ], modelName);
              return JSON.parse(cleanJson(content || '[]'));
          }, usageType);
      }

      let hindiMcqData = undefined;
      if (language === 'English') {
          try {
             const translatedJson = await translateToHindi(JSON.stringify(data), true, usageType);
             hindiMcqData = JSON.parse(translatedJson);
          } catch(e) { console.error("Translation Failed", e); }
      }

      return {
          id: Date.now().toString(),
          title: `MCQ Test: ${chapter.title}`,
          subtitle: `${data.length} Questions`,
          content: '',
          type: type,
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          mcqData: data,
          manualMcqData_HI: hindiMcqData 
      };
  }

  // NOTES Mode
  const generateNotes = async (detailed: boolean): Promise<{text: string, hindiText?: string}> => {
      let prompt = "";
      const template = detailed ? promptNotesPremium : promptNotes;
      
      if (template) {
           prompt = processTemplate(template, {
               board: board || '',
               class: classLevel,
               stream: stream || '',
               subject: subject.name,
               chapter: chapter.title,
               language: language,
               instruction: customInstruction
           });
      } else {
          const competitionConstraints = syllabusMode === 'COMPETITION' 
              ? "STYLE: Fact-Heavy, Direct. HIGHLIGHT PYQs (Previous Year Questions) if relevant." 
              : "STYLE: Strict NCERT Pattern.";

          if (detailed) {
              // PREMIUM PROMPT (1000-1500 Words)
              prompt = `${customInstruction}
              ${adminPromptOverride || ""}
              
              Write PREMIUM DEEP DIVE NOTES for ${board} Class ${classLevel} ${subject.name}, Chapter: "${chapter.title}".
              Language: ${language}.
              ${competitionConstraints}
              
              STRICT TARGET: 1000-1500 Words.
              
              STYLE: "Gemini Style" - Detailed, Conversational (speak directly to the student), Analytical. Use analogies and real-world examples.
              IMPORTANT WRITING RULES:
              - Paragraphs MUST NOT exceed 4-5 lines.
              - Use bullet points every 3-4 paragraphs.
              - Always bold the keywords.
              - Use real-world examples that connect with the student.
              - Use very simple language (no decorative language, no poetry).
              - TTS Friendly Format: Keep sentences short. Do not overload with commas. Avoid complex English.
              - Do NOT just copy-paste NCERT. Do NOT use unnecessary theory. Provide pure clarity.
              - Use the Icon System where appropriate: 📈 (Green = Growth), 🟡 (Yellow = Unstable), 🔴 (Red = Drop), 🔵 (Blue = Plateau).
              
              STRUCTURE EXACTLY AS FOLLOWS (Generate strict semantic HTML using these specific CSS classes for premium app-like UI styling):

              <div class="quick-revision">
                 <h2>🚀 Quick Revision</h2>
                 <!-- 8-12 bullet points of the most crucial concepts -->
                 <ul><li>...</li></ul>
              </div>

              <div class="topic-card">
                 <h2 class="font-black">📘 Topic 1 (Sub-topic name)</h2>

                 <div class="definition">
                    <h3>📌 Definition</h3>
                    <p>... (Simple language)</p>
                 </div>

                 <div class="explanation">
                    <h3>🔍 Explanation</h3>
                    <p>... (Step-by-step)</p>
                 </div>

                 <div class="example">
                    <h3>🌍 Real Life Example</h3>
                    <p>... (Connect with student)</p>
                 </div>

                 <div class="visual-facts">
                    <!-- Text-based ASCII diagram or described diagram -->
                 </div>

                 <div class="exam">
                    <h3>🎯 Exam Point</h3>
                    <p>...</p>
                 </div>

                 <div class="mistake">
                    <h3>⚠️ Common Mistake</h3>
                    <p>...</p>
                 </div>

                 <div class="memory">
                    <h3>💡 Memory Trick</h3>
                    <p>...</p>
                 </div>

                 <div class="recap">
                    <h3>🔁 Topic Quick Recap</h3>
                    <ul><li>...</li></ul>
                 </div>
              </div>

              <!-- Repeat .topic-card for all key topics -->
              <div class="topic-card">...</div>

              <div class="memory-anchors">
                 <h2>🟡 Memory Anchors</h2>
                 <!-- 🧠 Trick, 🔗 Link to previous concept, and 📊 Table comparison -->
              </div>

              <div class="brain-map">
                 <h2>🔴 Final Chapter Brain Map</h2>
                 <!-- "Chapter in 60 Seconds" 10 bullet chain flow / small flow diagram -->
              </div>
              
              Ensure you follow this strict Topic Wise Deep Dive HTML structure. Do NOT wrap output in markdown code blocks like \`\`\`html. Return pure HTML.`;
          } else {
              // FREE PROMPT (200-300 Words)
              prompt = `${customInstruction}
              ${adminPromptOverride || ""}
              
              Write SHORT SUMMARY NOTES for ${board} Class ${classLevel} ${subject.name}, Chapter: "${chapter.title}".
              Language: ${language}.
              
              STRICT TARGET: 200-300 Words.
              
              OUTPUT FORMAT:
              You MUST return pure semantic HTML using these specific CSS classes:

              <div class="quick-revision">
                 <h2>📌 Basic Definition</h2>
                 <p>...</p>
              </div>

              <div class="topic-card">
                 <h2>🔑 Key Points</h2>
                 <ul><li>...</li></ul>
              </div>
              
              Do NOT wrap output in markdown code blocks like \`\`\`html. Return pure HTML.`;
          }
      }

      const text = await executeWithRotation(async () => {
          if (onStream) {
               return await callGroqApiStream([
                  { role: "system", content: "You are an expert teacher. Provide high quality, well-formatted markdown content." },
                  { role: "user", content: prompt }
               ], onStream, modelName);
          }
          return await callGroqApi([
              { role: "system", content: "You are an expert teacher. Provide high quality, well-formatted markdown content." },
              { role: "user", content: prompt }
          ], modelName);
      }, usageType);

      let hindiText = undefined;
      if (language === 'English') {
          try {
              hindiText = await translateToHindi(text, false, usageType);
          } catch(e) { console.error("Translation Failed", e); }
      }
      return { text, hindiText };
  };

  if (dualGeneration && (type === 'NOTES_PREMIUM' || type === 'NOTES_SIMPLE')) {
       // ... (Copied logic) ...
       const competitionConstraints = syllabusMode === 'COMPETITION' 
          ? "STYLE: Fact-Heavy, Direct. HIGHLIGHT PYQs (Previous Year Questions) if relevant." 
          : "STYLE: Strict NCERT Pattern.";

       const prompt = `${customInstruction}
       ${adminPromptOverride || ""}
       
       TASK:
       1. Generate Premium Detailed Analysis Notes for ${board} Class ${classLevel} ${subject.name}, Chapter: "${chapter.title}".
       2. Generate a 200-300 word Summary for Free Notes.
       
       Language: ${language}.
       ${competitionConstraints}
       
       OUTPUT FORMAT STRICTLY:
       <<<PREMIUM>>>
       [Detailed Content Here including Introduction, Key Concepts, Tables, Flowcharts, Formulas, Exam Alerts etc.]
       <<<SUMMARY>>>
       [Short 200-300 word Summary Here]
       `;
       
       const rawText = await executeWithRotation(async () => {
          return await callGroqApi([{ role: "user", content: prompt }], modelName);
       }, usageType);
       
       let premiumText = "";
       let freeText = "";
       
       if (rawText.includes("<<<PREMIUM>>>")) {
           const parts = rawText.split("<<<PREMIUM>>>");
           if (parts[1]) {
               const subParts = parts[1].split("<<<SUMMARY>>>");
               premiumText = subParts[0].trim();
               if (subParts[1]) freeText = subParts[1].trim();
           }
       } else {
           premiumText = rawText;
           freeText = "Summary not generated.";
       }

       let premiumTextHI = undefined;
       let freeTextHI = undefined;
       
       if (language === 'English') {
          try {
              const [p, f] = await Promise.all([
                  translateToHindi(premiumText, false, usageType),
                  translateToHindi(freeText, false, usageType)
              ]);
              premiumTextHI = p;
              freeTextHI = f;
          } catch(e) { console.error("Translation Failed", e); }
       }

      return {
          id: Date.now().toString(),
          title: chapter.title,
          subtitle: "Premium & Free Notes (Dual)",
          content: premiumText, // Default to Premium
          type: 'NOTES_PREMIUM',
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          
          schoolPremiumNotesHtml: syllabusMode === 'SCHOOL' ? premiumText : undefined,
          competitionPremiumNotesHtml: syllabusMode === 'COMPETITION' ? premiumText : undefined,
          schoolPremiumNotesHtml_HI: syllabusMode === 'SCHOOL' ? premiumTextHI : undefined,
          competitionPremiumNotesHtml_HI: syllabusMode === 'COMPETITION' ? premiumTextHI : undefined,

          schoolFreeNotesHtml: syllabusMode === 'SCHOOL' ? freeText : undefined,
          competitionFreeNotesHtml: syllabusMode === 'COMPETITION' ? freeText : undefined,
          
          isComingSoon: false
      };
  }

  const isDetailed = type === 'NOTES_PREMIUM' || type === 'NOTES_HTML_PREMIUM';
  const result = await generateNotes(isDetailed);

  return {
      id: Date.now().toString(),
      title: chapter.title,
      subtitle: isDetailed ? "Premium Study Notes" : "Quick Revision Notes",
      content: result.text,
      type: type,
      dateCreated: new Date().toISOString(),
      subjectName: subject.name,
      schoolPremiumNotesHtml_HI: syllabusMode === 'SCHOOL' && isDetailed ? result.hindiText : undefined,
      competitionPremiumNotesHtml_HI: syllabusMode === 'COMPETITION' && isDetailed ? result.hindiText : undefined,
      isComingSoon: false
  };
};

export const generateTestPaper = async (topics: any, count: number, language: Language): Promise<MCQItem[]> => {
    return []; // Placeholder
};
export const generateDevCode = async (userPrompt: string): Promise<string> => { return "// Dev Console Disabled"; };

export const generateCustomNotes = async (userTopic: string, adminPrompt: string, modelName: string = "llama-3.1-8b-instant"): Promise<string> => {
    const prompt = `${adminPrompt || 'Generate detailed notes for the following topic:'}
    
    TOPIC: ${userTopic}
    
    Ensure the content is well-structured with headings and bullet points.`;

    return await executeWithRotation(async () => {
        return await callGroqApi([{ role: "user", content: prompt }], modelName);
    }, 'STUDENT');
};

export const generateUltraAnalysis = async (
    data: {
        questions: any[], 
        userAnswers: Record<number, number>, 
        score: number, 
        total: number, 
        subject: string, 
        chapter: string, 
        classLevel: string
    },
    settings?: SystemSettings
): Promise<string> => {
    let modelName = "llama-3.1-8b-instant";
    let customInstruction = "";
    
    if (settings) {
        if (settings.aiModel) modelName = settings.aiModel;
        if (settings.aiInstruction) customInstruction = settings.aiInstruction;
    }

    const attemptedQuestions = data.questions.map((q, idx) => {
        const selected = data.userAnswers[idx];
        const isCorrect = selected === q.correctAnswer;
        
        return {
            question: q.question,
            correctAnswer: q.options[q.correctAnswer],
            userSelected: (selected !== undefined && selected !== -1 && q.options[selected]) ? q.options[selected] : "Skipped",
            isCorrect: isCorrect,
            concept: q.concept || q.explanation || "General Concept"
        };
    });

    const prompt = `
    ${customInstruction}
    
    ROLE: Expert Educational Mentor & Analyst.
    
    CONTEXT:
    Student Class: ${data.classLevel}
    Subject: ${data.subject}
    Chapter: ${data.chapter}
    Score: ${data.score}/${data.total}

    TASK:
    Analyze the student's performance and provide a structured JSON analysis grouped by topics.
    
    DATA:
    ${JSON.stringify(attemptedQuestions, null, 2)}

    OUTPUT FORMAT (STRICT JSON ONLY, NO MARKDOWN):
    {
      "topics": [
        {
          "name": "Topic Name",
          "status": "WEAK" | "AVERAGE" | "STRONG",
          "questions": [
            {
              "text": "Question text...",
              "status": "CORRECT" | "WRONG", 
              "correctAnswer": "Option text (if wrong)"
            }
          ],
          "actionPlan": "Specific advice on how to work on this topic...",
          "studyMode": "REVISION" | "DEEP_STUDY"
        }
      ],
      "motivation": "One short punchy motivational line",
      "nextSteps": {
        "duration": "2 Days",
        "focusTopics": ["Topic A", "Topic B"],
        "action": "Brief instructions on what to study immediately."
      },
      "weakToStrongPath": [
        { "step": 1, "action": "Step-by-step action to improve weak areas..." },
        { "step": 2, "action": "..." }
      ]
    }
    
    Ensure the response is valid JSON. Do not wrap in markdown code blocks.
    `;

    return await executeWithRotation(async () => {
        const content = await callGroqApi([
            { role: "system", content: "You are a data analyst. Return only valid JSON." },
            { role: "user", content: prompt }
        ], modelName);
        return cleanJson(content || "{}");
    }, 'STUDENT');
};

export const generateStudyRoutine = async (
    userContext: {
        name: string,
        classLevel: string,
        history: { subject: string, chapter: string, score: number, total: number }[]
    },
    settings?: SystemSettings
): Promise<string> => {
    // Force use of a stronger model for analysis if available, otherwise fallback
    let modelName = "llama-3.3-70b-versatile";

    const prompt = `
    ROLE: Expert Academic Mentor & Data Analyst.

    CONTEXT:
    Student: ${userContext.name} (Class ${userContext.classLevel})
    Full Test History: ${JSON.stringify(userContext.history)}

    GOAL:
    Analyze the ENTIRE history to find EVERY topic where the score is below 50%.
    Create a specific, high-impact study routine for **TODAY ONLY** to fix these weak areas.

    CRITICAL INSTRUCTIONS:
    1. **Analyze Deeply**: Look at all tests. Identify ALL chapters with < 50% score.
    2. **Sub-Topic Breakdown**: For each weak chapter, identify specific SUB-TOPICS that usually cause confusion (e.g., if weak in "Light", assign "Mirror Formula Sign Convention" not just "Light").
    3. **Volume**: If there are many weak topics, prioritize the top 3-4 most critical ones for today. Do NOT list just 1 or 2 if there are many.
    4. **Today Only**: Do not plan for 3 days. Focus on maximizing TODAY.

    OUTPUT FORMAT (STRICT JSON ONLY):
    {
      "title": "Today's Power Plan",
      "summary": "You have X weak topics (<50%). Focusing on the most critical ones today.",
      "weakAreas": ["Chapter A - Subtopic 1", "Chapter B - Subtopic 2"], // List all identified weak sub-topics
      "routine": [
        {
          "time": "Morning / Session 1",
          "subject": "Subject Name",
          "topic": "Specific Sub-Topic (e.g., Ohm's Law Graph)",
          "activity": "Watch Video & Solve 10 MCQs",
          "duration": "45 mins"
        },
        {
          "time": "Afternoon / Session 2",
          "subject": "Subject Name",
          "topic": "Specific Sub-Topic",
          "activity": "Deep Dive Notes Reading",
          "duration": "45 mins"
        },
        {
          "time": "Evening / Session 3",
          "subject": "Subject Name",
          "topic": "Specific Sub-Topic",
          "activity": "Revision & Mock Test",
          "duration": "30 mins"
        }
      ],
      "motivation": "One line specific advice based on their weak areas."
    }

    Ensure strict JSON response. No markdown.
    `;

    return await executeWithRotation(async () => {
        const content = await callGroqApi([
            { role: "system", content: "You are a strict JSON generator. Analyze all data provided." },
            { role: "user", content: prompt }
        ], modelName);
        return cleanJson(content || "{}");
    }, 'STUDENT');
};
