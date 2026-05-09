import { MCQItem } from '../types';

/**
 * Parses a raw text containing MCQ questions formatted with specific emojis and headers
 * into an array of MCQItem objects.
 *
 * Expected Format:
 * **Question X**
 * 📖 Topic: ...
 * ❓ Question: ...
 * Options:
 * A) ...
 * B) ...
 * C) ...
 * D) ...
 * ✅ Correct Answer: X) ...
 * 💡 Concept: ...
 * 🔎 Explanation: ...
 * 🎯 Exam Tip: ...
 * ⚠ Common Mistake: ...
 * 🧠 Memory Trick: ...
 * 📊 Difficulty Level: ...
 */
function extractStatements(questionText: string): { statements: string[], cleanedQuestion: string } {
    const statements: string[] = [];
    let cleanedQuestion = "";

    // We split by <br/> since the current parser converts \n to <br/> before this step
    const lines = questionText.split('<br/>');
    let inStatementBlock = false;
    let currentStatement = "";
    const tempQuestionLines: string[] = [];
    const endingQuestionLines: string[] = [];

    // Match patterns like "1.", "1)", "Statement 1:", "कथन 1:" at the start of the line
    const statementStartRegex = /^(?:Statement\s*\d+|कथन\s*\d+|\d+[\)\.])\s*[:\-\.]?(.*)/i;

    // Match common ending question phrases after statements
    const endingQuestionRegex = /^(?:which of the|उपर्युक्त|उपरोक्त|choose the|select the|find the|निम्नलिखित में से|कूट का|उपर्युक्त कथनों)/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (statementStartRegex.test(line)) {
            if (currentStatement) {
                statements.push(currentStatement.trim());
            }
            currentStatement = line;
            inStatementBlock = true;
        } else if (inStatementBlock) {
            // Check if this line looks like an ending question
            if (endingQuestionRegex.test(line) || (line.includes("?") || line.includes("सही है") || line.includes("गलत है"))) {
                if (currentStatement) {
                    statements.push(currentStatement.trim());
                    currentStatement = "";
                }
                inStatementBlock = false;
                endingQuestionLines.push(line);
            } else {
                // Continuation of the current statement
                currentStatement += " " + line;
            }
        } else {
            // We are not in a statement block
            if (statements.length > 0) {
                // If we already have statements, this must be an ending question
                endingQuestionLines.push(line);
            } else {
                // Otherwise it's the main question preamble
                tempQuestionLines.push(line);
            }
        }
    }

    if (currentStatement) {
        statements.push(currentStatement.trim());
    }

    cleanedQuestion = tempQuestionLines.join('<br/>');
    if (endingQuestionLines.length > 0) {
        // Add a visual separator or just append to the preamble
        cleanedQuestion += (cleanedQuestion ? "<br/><br/>" : "") + endingQuestionLines.join('<br/>');
    }

    return { statements, cleanedQuestion: cleanedQuestion || questionText };
}

export function parseMCQText(text: string): { questions: MCQItem[], notes: {title: string, content: string}[] } {
  const questions: MCQItem[] = [];
  const notes: {title: string, content: string}[] = [];

  // 0. Pre-process to track Main Topics (e.g., ### <TOPIC: Main Topic Name>)
  // We will split the text by the Question markers as before, but we need to track the ACTIVE main topic.
  // We can do this by scanning the raw text, extracting the main topics and their indices,
  // or more simply, we can just look backwards in the raw text, but since we split, we lose the exact position.
  // Instead, let's split the whole text by a safer chunking, or just iterate through the blocks and see if they *contain* a main topic.
  // Actually, the <TOPIC> marker usually appears *before* the Question block or is prepended to the first block.
  // So as we iterate through the blocks, if we find a <TOPIC: ...> marker, we update our activeMainTopic state.
  let activeMainTopic: string | null = null;

  // Since <TOPIC> might be separated from the Question block by the split regex,
  // we first pass through the blocks to identify standalone topics or topics within blocks.
  // Wait, if a <TOPIC> is between two questions, it gets appended to the end of the previous question block!
  // This means the PREVIOUS question updates activeMainTopic before it applies to the NEXT question.
  // To fix this, let's pre-process the text to ensure <TOPIC> always starts a new block or is explicitly tracked.
  // Actually, split by BOTH Question OR TOPIC markers.

  const rawBlocks = text.split(/(?:(?:###\s*)?<TOPIC:\s*.*?>|\*\*Question \d+\*\*|Question \d+:?)/ig).filter(b => b.trim().length > 0);

  // Actually, we lost the topic name if we just split by it. We should use lookahead/lookbehind,
  // or just extract them before splitting.
  // The simplest way:
  // Split by Question markers. Then for each block, if it contains a <TOPIC>, extract it, then strip it.
  // Wait, if it's placed BEFORE the Question, it belongs to the PREVIOUS block in the split result!
  // E.g. Block 0: "### <TOPIC: A>"
  // Block 1: "📖 Topic... \n\n ### <TOPIC: B>"
  // Block 2: "📖 Topic..."
  // So Block 1 contains the topic for Block 2!

  const blocks = text.split(/(?:\*\*Question \d+\*\*|Question \d+:?)/ig).filter(b => b.trim().length > 0);

  // We need to keep a running active main topic. But since a split chunk might look like:
  // "Options... Correct Answer... \n\n ### <TOPIC: New Topic>\n"
  // The `<TOPIC: ...>` is at the END of the chunk, which means it applies to the NEXT chunk.
  // Unless it's the 0th chunk (the preamble), where it applies to the NEXT chunk (which is the first question).

  blocks.forEach((block, blockIndex) => {
    let q: Partial<MCQItem> = {};

    // If it's the first block, we extract the active main topic and skip parsing it as a question if it doesn't have options
    const allTopicMatches = [...block.matchAll(/<TOPIC:\s*(.*?)>/ig)];
    if (blockIndex === 0 && allTopicMatches.length > 0) {
        activeMainTopic = allTopicMatches[allTopicMatches.length - 1][1].trim();
    }

    // For later blocks, the activeMainTopic is carried over from the PREVIOUS block's parsing.
    // So `activeMainTopic` is CORRECT for the current question text in `block`.

    // Clean all topic tags from the block text so they don't appear in notes or UI
    const cleanedBlock = block.replace(/###\s*<TOPIC:\s*.*?>/ig, '').replace(/<TOPIC:\s*.*?>/ig, '').trim();

    // Extract PYQ Inspired
    const pyqMatch = cleanedBlock.match(/(?:🔥\s*)?PYQ Inspired:\s*(.+)/i);
    if (pyqMatch) q.pyqInspired = pyqMatch[1].trim();

    // Extract Topic (supports English/Hindi dual headings)
    const topicMatch = cleanedBlock.match(/(?:📖\s*)?(?:Topic|विषय).*?:\s*(.+)/i);

    // Ensure we always have a fallback to the micro-topic if there is NO activeMainTopic
    // The user's new test format doesn't have ### <TOPIC: ...> headers, so activeMainTopic will be null!
    if (activeMainTopic) {
        q.topic = activeMainTopic;
    } else if (topicMatch) {
        q.topic = topicMatch[1].trim();
    } else {
        q.topic = "General"; // Fallback to avoid 'undefined' topics in pure text formats
    }

    // Identify if the block has A, B, C, D style options
    const hasAlphabetOptions = /(?:\n\s*[A-D][\)\.])/.test(cleanedBlock);

    // Extract Question text (multiline support before Options)
    let questionMatch = cleanedBlock.match(/(?:❓\s*)?(?:\*\*)?Question(?:\s*\(प्रश्न\))?:?(?:\*\*)?(?:\s*❓\s*Question:?)?\s*([\s\S]*?)(?=(?:Options(?:\s*\(विकल्प\))?:|विकल्प:))/i);
    if (!questionMatch) {
        if (hasAlphabetOptions) {
            questionMatch = cleanedBlock.match(/(?:❓\s*)?(?:\*\*)?Question(?:\s*\(प्रश्न\))?:?(?:\*\*)?(?:\s*❓\s*Question:?)?\s*([\s\S]*?)(?=(?:\n\s*[A-D][\)\.]))/i);
        } else {
            questionMatch = cleanedBlock.match(/(?:❓\s*)?(?:\*\*)?Question(?:\s*\(प्रश्न\))?:?(?:\*\*)?(?:\s*❓\s*Question:?)?\s*([\s\S]*?)(?=(?:\n\s*[1-4][\)\.]))/i);
        }
    }

    // If the standard "Question:" block is missing because of how we split (**Question X** is gone),
    // and we only have the payload left starting right away or after Topic.
    // Let's create a fallback to grab text up to the Options block.
    if (!questionMatch) {
        // Find where Options start
        const optionsIdxMatch = cleanedBlock.match(/(?:Options(?:\s*\(विकल्प\))?:|विकल्प:|\n\s*[A-D1-4][\)\.])/i);
        if (optionsIdxMatch && optionsIdxMatch.index !== undefined) {
             // The question is everything before the options, MINUS the PYQ and Topic markers if present
             let potentialQuestion = cleanedBlock.substring(0, optionsIdxMatch.index);
             // Clean out known headers
             potentialQuestion = potentialQuestion.replace(/(?:🔥\s*)?PYQ Inspired:\s*(.+)/ig, '');
             potentialQuestion = potentialQuestion.replace(/(?:📖\s*)?(?:Topic|विषय).*?:\s*(.+)/ig, '');
             potentialQuestion = potentialQuestion.replace(/(?:❓\s*)?(?:\*\*)?Question(?:\s*\(प्रश्न\))?:?(?:\*\*)?/ig, '');

             // If there is no explicit question text left (e.g. only had Topic marker), maybe the Question marker wasn't stripped?
             // Actually, if potentialQuestion.trim() is empty, we must have lost the question text due to the split regex stripping **Question 1**!
             // Wait, the split strips "**Question 1**". But the text BELOW that should be the question!
             // E.g.
             // **Question 1**
             // 📖 Topic: ...
             // ❓ Question:
             // What is 2+2?
             // Since "❓ Question:" is stripped, "What is 2+2?" should remain.
             // If potentialQuestion is empty, it means there is NO question text between the Topic and Options.
             q.question = potentialQuestion.trim();
        }
    }

    // Fallback: If no question marker was used AT ALL, but there is text before options:
    if (!q.question && !questionMatch) {
         const optionsIdxMatch = cleanedBlock.match(/(?:Options(?:\s*\(विकल्प\))?:|विकल्प:|\n\s*[A-D1-4][\)\.])/i);
         if (optionsIdxMatch && optionsIdxMatch.index !== undefined) {
             let potentialQuestion = cleanedBlock.substring(0, optionsIdxMatch.index);
             potentialQuestion = potentialQuestion.replace(/(?:🔥\s*)?PYQ Inspired:\s*(.+)/ig, '');
             potentialQuestion = potentialQuestion.replace(/(?:📖\s*)?(?:Topic|विषय).*?:\s*(.+)/ig, '');
             q.question = potentialQuestion.trim();
         }
    }

    if (questionMatch || q.question) {
      if (questionMatch) {
          q.question = questionMatch[1].trim();
      } else {
          q.question = q.question!.trim();
      }
      // Remove any leading numbers like "1. " or "Q1. " just in case they slipped in
      q.question = q.question.replace(/^(?:Q?\d+[\.\)\-]\s*)/i, '');
      // Format multiline questions with <br/> for proper rendering
      q.question = q.question.replace(/\n/g, '<br/>');

      // Multi-statement Extraction
      const statementData = extractStatements(q.question);
      if (statementData.statements.length > 0) {
          q.statements = statementData.statements;
          q.question = statementData.cleanedQuestion;
      }
    }

    // Extract Options
    // We look for block starting with "Options:" or just the options directly, ending at Correct Answer
    let optionsMatch = cleanedBlock.match(/(?:(?:Options(?:\s*\(विकल्प\))?:|विकल्प:)\s*)([\s\S]*?)(?=✅|(?:Correct Answer(?:\s*\(सही उत्तर\))?:))/i);
    if (!optionsMatch) {
        if (hasAlphabetOptions) {
            optionsMatch = cleanedBlock.match(/(?:\n\s*[A-D][\)\.])([\s\S]*?)(?=✅|(?:Correct Answer(?:\s*\(सही उत्तर\))?:))/i);
            if (optionsMatch) {
                optionsMatch[1] = cleanedBlock.match(/(?:\n\s*[A-D][\)\.])/i)![0] + optionsMatch[1];
            }
        } else {
            optionsMatch = cleanedBlock.match(/(?:\n\s*[1-4][\)\.])([\s\S]*?)(?=✅|(?:Correct Answer(?:\s*\(सही उत्तर\))?:))/i);
            if (optionsMatch) {
                optionsMatch[1] = cleanedBlock.match(/(?:\n\s*[1-4][\)\.])/i)![0] + optionsMatch[1];
            }
        }
    }

    if (optionsMatch) {
      const optionsText = optionsMatch[1].trim();
      // Only keep lines that look like valid options to filter out noise
      // We explicitly look for lines that strictly start with A/B/C/D or 1/2/3/4 to avoid capturing question text
      const optionLines = optionsText.split(/\n/).map(line => line.trim()).filter(line => /^(?:[A-D]|[1-4])[\)\.](?:\s|$)/i.test(line));

      if (optionLines.length >= 2) {
          // If we find exactly 4 letters, prefer them. If there's 1-4 mixed, standard processing.
          // In case of multiple lists (e.g. 1. 2. 3. in question and A B C D in options),
          // the question fix above should prevent them from being in optionsText.
          q.options = optionLines.map(opt => opt.replace(/^(?:[A-D]|[1-4])[\)\.]\s*/i, '').trim());
      }
    }

    // Extract Correct Answer
    // Look for explicit letter A) or A. or just text.
    const answerMatch = cleanedBlock.match(/(?:✅\s*)?(?:\*\*)?Correct Answer(?:\s*\(सही उत्तर\))?:?(?:\*\*)?(?:\s*✅\s*Correct Answer:?)?\s*([\s\S]*?)(?=💡|🔎|🎯|⚠|🧠|📊|Concept|Explanation|Exam Tip|Common Mistake|Memory Trick|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (answerMatch) {
        const rawAns = answerMatch[1].trim();

        // 1. Try to extract a clean letter (A, B, C, D) from the start of the string
        const letterMatch = rawAns.match(/^([A-D])(?:[\)\.]|$)/i);
        if (letterMatch) {
            const letter = letterMatch[1].toUpperCase();
            q.correctAnswer = ['A', 'B', 'C', 'D'].indexOf(letter);
        } else if (q.options) {
            // 2. Fallback: try matching the text against options
            const ansTextClean = rawAns.replace(/^(?:[A-D])(?:[\)\.]|$)\s*/i, '').trim();
            const index = q.options.findIndex(opt => ansTextClean.includes(opt) || opt.includes(ansTextClean));
            if (index !== -1) {
                q.correctAnswer = index;
            }
        }
    }

    // Extract Concept
    const conceptMatch = block.match(/(?:💡\s*)?(?:\*\*)?Concept(?:\s*\(अवधारणा\))?:?(?:\*\*)?(?:\s*💡\s*Concept:?)?\s*([\s\S]*?)(?=🔎|🎯|⚠|🧠|📊|Explanation|Exam Tip|Common Mistake|Memory Trick|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (conceptMatch) q.concept = conceptMatch[1].trim();

    // Extract Explanation
    const explanationMatch = block.match(/(?:🔎\s*)?(?:\*\*)?Explanation(?:\s*\(व्याख्या\))?:?(?:\*\*)?(?:\s*🔎\s*Explanation:?)?\s*([\s\S]*?)(?=🎯|⚠|🧠|📊|Exam Tip|Common Mistake|Memory Trick|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (explanationMatch) q.explanation = explanationMatch[1].trim();

    // Extract Exam Tip
    const examTipMatch = block.match(/(?:🎯\s*)?(?:\*\*)?Exam Tip(?:\s*\(परीक्षा टिप\))?:?(?:\*\*)?(?:\s*🎯\s*Exam Tip:?)?\s*([\s\S]*?)(?=⚠|🧠|📊|Common Mistake|Memory Trick|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (examTipMatch) q.examTip = examTipMatch[1].trim();

    // Extract Common Mistake
    const commonMistakeMatch = block.match(/(?:⚠\s*)?(?:\*\*)?Common Mistake(?:\s*\(सामान्य गलती\))?:?(?:\*\*)?(?:\s*⚠\s*Common Mistake:?)?\s*([\s\S]*?)(?=🧠|📊|Memory Trick|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (commonMistakeMatch) q.commonMistake = commonMistakeMatch[1].trim();

    // Extract Memory Trick
    const memoryTrickMatch = block.match(/(?:🧠\s*)?(?:\*\*)?Memory Trick(?:\s*\(याद रखने का तरीका\))?:?(?:\*\*)?(?:\s*🧠\s*Memory Trick:?)?\s*([\s\S]*?)(?=📊|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (memoryTrickMatch) q.mnemonic = memoryTrickMatch[1].trim();

    // Extract Difficulty
    const difficultyMatch = block.match(/(?:📊\s*)?(?:\*\*)?Difficulty Level(?:\s*\(कठिनाई\))?:?(?:\*\*)?(?:\s*📊\s*Difficulty Level:?)?\s*([\s\S]*?)(?=\n\n|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (difficultyMatch) {
      const diffStr = difficultyMatch[1].trim().toLowerCase();
      if(diffStr.includes("easy")) q.difficultyLevel = "Easy";
      else if(diffStr.includes("medium")) q.difficultyLevel = "Medium";
      else if(diffStr.includes("hard")) q.difficultyLevel = "Hard";
      else q.difficultyLevel = diffStr; // fallback
    }

    // Add if valid
    if (q.question && q.options && q.options.length > 0 && q.correctAnswer !== undefined) {
      questions.push(q as MCQItem);

      // Try to extract notes that might be appended after the last known section
      // Often notes are appended after "Difficulty Level: ... \n\n"
      // We look for text that comes after difficulty or memory trick, separated by double newlines.
      // A more robust way is to find the end of the difficulty match (or the last matched property)
      // and see what remains.
      const lastMatch = difficultyMatch || memoryTrickMatch || commonMistakeMatch || examTipMatch || explanationMatch || conceptMatch || answerMatch;
      if (lastMatch && lastMatch.index !== undefined) {
          const textAfterLastMatch = cleanedBlock.substring(lastMatch.index + lastMatch[0].length).trim();
          if (textAfterLastMatch.length > 20 && !textAfterLastMatch.startsWith('Options') && !textAfterLastMatch.startsWith('Question')) {
              // Try to extract an HTML topic tag if it exists in the trailing text
              // The note belongs to the question it followed.
              // So its title should be exactly the question's topic so they match in analysis!
              const title = q.topic || "Note";

              // Do NOT update activeMainTopic based on the note's text, otherwise
              // subsequent questions will get assigned this random note text as their topic!

              notes.push({ title: title, content: textAfterLastMatch });
          }
      }
    } else if (cleanedBlock.length > 20 && !cleanedBlock.startsWith('Options')) {
      // If it doesn't look like a question at all, it might just be a note block

      // Try to extract an HTML topic tag if it exists: <h3>...</h3> or similar
      const topicMatch = cleanedBlock.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);

      let title = "Note";

      // If it's a large block of text with multiple paragraphs, we might want to split it by double newlines
      // and treat each chunk as a separate note, IF it looks like a new topic.
      // But a simpler approach is: if there are double newlines, split them and check if they look like separate notes.
      const paragraphs = cleanedBlock.split(/\n\n+/);

      for (const para of paragraphs) {
          if (para.trim().length === 0) continue;

          let title = "Note";
          const paraTopicMatch = para.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);

          if (paraTopicMatch) {
              title = paraTopicMatch[1].replace(/<[^>]+>/g, '').replace(/#|\*|_/g, '').trim().substring(0, 50);
          } else {
              const lines = para.split('\n').map(l => l.trim()).filter(l => l);
              if (lines.length > 0) {
                  // The title might be the first sentence up to "Definition:" or just the first line.
                  const firstLine = lines[0];
                  let rawTitle = firstLine;
                  if (firstLine.includes(' Definition:')) {
                      rawTitle = firstLine.split(' Definition:')[0];
                  }
                  rawTitle = rawTitle.replace(/<[^>]+>/g, '').replace(/#|\*|_/g, '').trim();
                  title = rawTitle.substring(0, 50) || "Note";
              }
          }

          // Don't modify activeMainTopic here as it could affect upcoming questions incorrectly
          notes.push({ title: title !== "Note" ? title : (activeMainTopic || "Note"), content: para.trim() });
      }
    }

    // UPDATE ACTIVE MAIN TOPIC FOR THE NEXT ITERATION
    // Any <TOPIC> inside this block was placed AFTER the current question, so it applies to the NEXT block.
    // Ensure we update it even if it's block 0 (though we already did, but it's safe).
    if (allTopicMatches.length > 0) {
        activeMainTopic = allTopicMatches[allTopicMatches.length - 1][1].trim();
    }
  });

  return { questions, notes };
}
