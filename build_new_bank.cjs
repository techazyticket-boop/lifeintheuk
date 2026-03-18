const fs = require('fs');

async function build() {
    // Dynamic import since questionBank.js is an ES module
    const { questionBank } = await import('./src/data/questionBank.js');
    
    const scrapedArr = JSON.parse(fs.readFileSync('scraped_questions.json', 'utf8'));

    function normalize(str) {
        return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    const ourNorms = questionBank.map(q => normalize(q.q));
    
    let addedCount = 0;
    
    // Some basic formatting cleanup
    function cleanHTMLAndDecode(str) {
        // remove weird html entities, extra spaces etc
        return str.replace(/&#8211;/g, '-')
                  .replace(/&#8216;/g, "'")
                  .replace(/&#8217;/g, "'")
                  .replace(/&#038;/g, "&")
                  .replace(/&amp;/g, "&")
                  .replace(/&nbsp;/g, " ")
                  .replace(/&#8220;/g, '"')
                  .replace(/&#8221;/g, '"');
    }

    const topicsArray = ["values", "geography", "history_early", "history_modern", "government", "culture", "traditions", "sport", "science"];

    for (let sq of scrapedArr) {
        let normSq = normalize(sq.q);
        
        // Exact substring check
        const match = ourNorms.find(oq => oq.includes(normSq) || normSq.includes(oq));
        if (!match) {
            sq.id = 'added_t' + addedCount;
            // random or round-robin topic
            sq.topic = topicsArray[addedCount % topicsArray.length];
            // clean strings
            sq.q = cleanHTMLAndDecode(sq.q);
            sq.options = sq.options.map(o => cleanHTMLAndDecode(o));
            
            questionBank.push(sq);
            ourNorms.push(normSq);
            addedCount++;
        }
    }
    
    console.log(`Added ${addedCount} new questions. Total is now ${questionBank.length}.`);
    
    let output = "// ============================================================\n// QUESTION BANK – Generated with scraped questions\n// ============================================================\n\nexport const TOPIC_LABELS = {\n    values: 'Values & Principles',\n    geography: 'UK Geography',\n    history_early: 'Early History',\n    history_modern: 'Modern History',\n    government: 'Government & Law',\n    culture: 'Arts & Culture',\n    traditions: 'Traditions & Festivals',\n    sport: 'Sport',\n    science: 'Science & Invention',\n};\n\nexport const TOPICS = Object.keys(TOPIC_LABELS);\n\nexport const questionBank = [\n";
    for(let q of questionBank) {
        output += `  {\n`;
        if (q.id) output += `    id: ${JSON.stringify(q.id)},\n`;
        if (q.topic) output += `    topic: ${JSON.stringify(q.topic)},\n`;
        output += `    q: ${JSON.stringify(q.q)},\n`;
        output += `    opts: [\n`;
        let optsArray = q.opts || q.options;
        for(let o of optsArray) {
            output += `      ${JSON.stringify(o)},\n`;
        }
        output += `    ],\n`;
        output += `    correctIndex: ${q.correctIndex}\n`;
        if (q.e) output += `    ,e: ${JSON.stringify(q.e)}\n`;
        output += `  },\n`;
    }
    output += "];\n";
    
    fs.writeFileSync('src/data/questionBank.js', output);
    console.log('Saved back to src/data/questionBank.js!');
}

build();
