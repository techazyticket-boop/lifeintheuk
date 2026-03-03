// Quick Node.js validation script — checks question counts and overlap between exams

// Paste the question bank and generateTest logic inline
const questionBank = [
    "Democracy", "Citizenship Pledge", "Freedom of speech", "Treating others fairly", "24 questions",
    "18 out of 24", "Online booking", "Extremism or intolerance", "Official UK name", "Great Britain countries",
    "Crown Dependencies", "Wales/Union Flag", "4 countries", "Falkland Islands", "Westminster Parliament",
    "Edinburgh capital", "Cardiff capital", "Belfast capital", "6000 years farmers", "Stonehenge location",
    "Emperor Claudius", "Boudicca", "Hadrian's Wall", "400 years Romans", "Jutes Angles Saxons",
    "St Augustine", "Vikings AD 789", "King Alfred", "Norman Conquest 1066", "Battle of Hastings",
    "Domesday Book", "Bayeux Tapestry", "Magna Carta 1215", "Magna Carta meaning", "Black Death",
    "Wars of the Roses", "Bosworth Field", "Henry VIII Church", "Henry VIII wives", "Spanish Armada",
    "Shakespeare dates", "Glorious Revolution", "Bill of Rights 1689", "Charles I execution", "Oliver Cromwell",
    "Monarchy restored 1660", "James I 1603", "James Watt steam", "Slave trade 1807", "Slavery abolished 1833",
    "Victoria reign", "Women vote 1918", "Women vote 1928", "Emmeline Pankhurst", "WWI end date",
    "Churchill 1940", "D-Day", "NHS founder", "Alexander Fleming", "Tim Berners-Lee",
    "John Logie Baird", "Alan Turing", "Robert Watson-Watt", "Battle of Britain", "Post-WWII immigration",
    "Mousetrap Agatha Christie", "Jane Austen", "Lord of the Rings", "Sherlock Holmes", "Charles Dickens",
    "The Proms", "Handel", "Christopher Wren", "Turner Prize", "The Beatles",
    "Bonfire Night", "Remembrance Day poppy", "Remembrance Day date", "Hogmanay", "Shrove Tuesday",
    "St George 23 Apr", "St David 1 Mar", "St Patrick 17 Mar", "St Andrew 30 Nov", "Diwali",
    "Vaisakhi", "Eid al-Fitr", "Olympics 1908 1948 2012", "2012 Olympics location", "Roger Bannister",
    "Steve Redgrave", "Andy Murray", "World Cup 1966", "Elizabeth Tower", "Giant's Causeway",
    "Tower of London Crown Jewels", "Eden Project", "650 MPs", "Robert Walpole first PM", "First Past the Post",
    "5-year elections", "House of Lords members", "Voting age 18", "Margaret Thatcher", "Emergency 999",
    "Non-emergency 101", "Scottish Parliament Edinburgh", "Welsh Senedd Cardiff", "NI Assembly Belfast", "UN Security Council",
    "Good Friday Agreement", "Habeas Corpus 1679", "Commonwealth", "Adam Smith Scotland", "Wilfred Owen",
    "Christopher Cockerell hovercraft", "King John Magna Carta", "Haggis Scotland", "18 correct to pass", "Seeded question 120"
];

// seededShuffle
const seededShuffle = (array, seed) => {
    const arr = [...array];
    let s = seed;
    const rand = () => { const x = Math.sin(s++) * 10000; return x - Math.floor(x); };
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

console.log(`\nTotal questions in bank: ${questionBank.length}`);
console.log("=".repeat(55));

const exams = [];
for (let id = 1; id <= 10; id++) {
    const shuffled = seededShuffle(questionBank, id * 1000 + 42);
    const selected = shuffled.slice(0, 24);
    exams.push(selected);
    console.log(`Exam ${id}: ${selected.length} questions ✓`);
}

console.log("\n── Overlap between exams (shared questions) ──────────");
let maxOverlap = 0;
for (let i = 0; i < exams.length; i++) {
    for (let j = i + 1; j < exams.length; j++) {
        const setI = new Set(exams[i]);
        const shared = exams[j].filter(q => setI.has(q));
        if (shared.length > maxOverlap) maxOverlap = shared.length;
        if (shared.length > 5) {
            console.log(`  Exam ${i + 1} vs Exam ${j + 1}: ${shared.length} shared questions ⚠️`);
        } else {
            console.log(`  Exam ${i + 1} vs Exam ${j + 1}: ${shared.length} shared questions ✓`);
        }
    }
}
console.log(`\nMax overlap across any pair: ${maxOverlap}/24`);
console.log("=".repeat(55));
