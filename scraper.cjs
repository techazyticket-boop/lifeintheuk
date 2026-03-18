const fs = require('fs');

async function scrapeAll() {
  const allQuestions = [];
  const existingQuestions = new Set(); // to avoid duplicates
  
  for (let testId = 1; testId <= 40; testId++) {
    console.log(`Fetching Test ${testId}...`);
    try {
      const res = await fetch(`https://lifeintheuktestweb.co.uk/test-${testId}/`);
      if (!res.ok) {
        console.log(`Test ${testId} not found, skipping...`);
        continue;
      }
      const html = await res.text();
      
      // Extract solution object
      const solMatch = html.match(/const solution = (\{.*?\})/);
      if (!solMatch) {
         console.log(`Could not find solution for Test ${testId}`);
         continue;
      }
      let solutionObj = JSON.parse(solMatch[1]);
      
      // We will parse questions sequentially by "container_question"
      const parts = html.split('class="container_question"');
      parts.shift(); // remove everything before first question
      
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        
        // Extract Question Text
        let qTextMatch = p.match(/<div class="question">\s*([^\n<]+(?:<[^>]+>\s*)*[^<]*)\s*<\/div>/);
        let qText = "";
        if (qTextMatch) {
            // strip tags and clean
            qText = qTextMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        } else {
            console.log(`Failed to extract question ${i} in Test ${testId}`);
            continue;
        }

        if(existingQuestions.has(qText)) continue;
        
        // Extract Options
        let optionRegex = /<label for="[^"]+">\s*<input[^>]+data-id_answer="([r\d]+)"[^>]*>\s*([^\n<]+(?:<[^>]+>)*[^<]*)\s*<\/label>/g;
        let optMatch;
        const optionsMap = {};
        const optionsArr = [];
        
        // Also capture the correct answer string from solutionObj based on p{i}
        // Actually, the HTML container has data-id_question="p0" etc.
        let idQuestionMatch = p.match(/data-id_question="(p\d+)"/);
        let idQuestion = idQuestionMatch ? idQuestionMatch[1] : `p${i}`;
        
        while ((optMatch = optionRegex.exec(p)) !== null) {
            let rId = optMatch[1]; // e.g. "r0"
            let rText = optMatch[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            optionsArr.push(rText);
            optionsMap[rId] = optionsArr.length - 1; // 0-indexed
        }
        
        let correctIds = solutionObj[idQuestion] ? solutionObj[idQuestion].split(',') : [];
        let correctAnswerIndices = correctIds.map(id => optionsMap[id]).filter(idx => idx !== undefined);
        
        if (correctAnswerIndices.length === 0) {
            console.log(`WARNING: Missing correct answer for Q: ${qText}`);
            continue;
        }

        // Handle multiple correct answers as discussed
        let finalOptions = [...optionsArr];
        let finalCorrectIndex = correctAnswerIndices[0];
        
        if (correctAnswerIndices.length > 1) {
            // Combine correct texts
            let combinedCorrectText = correctAnswerIndices.map(idx => optionsArr[idx]).join(' AND ');
            // We'll replace the first correct index with this combined option
            finalOptions[correctAnswerIndices[0]] = combinedCorrectText;
            
            // Remove other correct options
            let toRemove = correctAnswerIndices.slice(1).sort((a,b) => b-a);
            for(let rm of toRemove) {
                finalOptions.splice(rm, 1);
            }
        }
        
        allQuestions.push({
            id: `scraped_t${testId}_q${i}`,
            q: qText,
            options: finalOptions,
            correctIndex: finalCorrectIndex
        });
        existingQuestions.add(qText);
      }
    } catch(err) {
      console.error(`Error on Test ${testId}:`, err);
    }
  }
  
  fs.writeFileSync('scraped_questions.json', JSON.stringify(allQuestions, null, 2));
  console.log(`Successfully scraped ${allQuestions.length} unique questions.`);
}

scrapeAll();
