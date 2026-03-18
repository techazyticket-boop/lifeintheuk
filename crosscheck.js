import { questionBank } from './src/data/questionBank.js';

const test17Questions = [
  "Which hill fort from the Iron Age can be seen in the county of Dorset?",
  "On which of the following issues the Northern Ireland Assembly CANNOT make decisions?",
  "Who was the first person to sail single-handed around the world in 1966/67?",
  "In 1837, Queen Victoria became queen of the UK at the age of 20.",
  "Who led the group of Catholics who tried to kill the Protestant king with a bomb in the Houses of the Parliament in 1605?",
  "What was the biggest source of employment in Britain before the 18th century?",
  "In which city is the Scottish Parliament building, also known as Holyrood, located?",
  "The UK continues to be a world leader in the development and manufacture of motor-sport technology:",
  "Why was the ‘Habeas Corpus Act’ of 1679 an important piece of legislation?",
  "What British artist was awarded the Turner Prize?",
  "How many members has the Council of Europe?",
  "In the UK, Members of the Parliament (MPs) are elected on the basis of:",
  "Which of the following statements regarding television in Northern Ireland is TRUE?",
  "In the second half of the 19th century there was an important group of artists who painted detailed pictures on religious or literary themes in bright colours. These were known as:",
  "The Muslim festival known as Eid ul Adha reminds Muslims of their own commitment to God:",
  "What was the population of the UK in 1901?",
  "People in the UK do NOT have to pay tax on:",
  "Which British scientist co-invented the MRI (magnetic resonance imaging) scanner?",
  "Which political party called a referendum on the UK’s membership of the European Union?",
  "Which of the following is a UNESCO World Heritage Site and a popular area for walkers?",
  "When did hereditary peers lose the automatic right to attend the House of Lords?",
  "Which charity works for the preservation of buildings in England?",
  "What name is given to the new social classes that appeared after the Black Death plague and who owned large areas of land?",
  "Which of the following is a traditional Welsh food?"
];

// Normalize a string for fuzzy matching (lowercase, alphanumeric only)
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const missing = [];
const ourQuestionsNorm = questionBank.map(q => normalize(q.q));

for (let i = 0; i < test17Questions.length; i++) {
  const norm17 = normalize(test17Questions[i]);
  // check if any of our questions start with this, or are a substring, or vice versa
  const match = ourQuestionsNorm.find(oq => oq.includes(norm17) || norm17.includes(oq));
  
  if (!match) {
    missing.push(test17Questions[i]);
  }
}

console.log("TOTAL EXAM 17 QUESTIONS:", test17Questions.length);
console.log("MISSING IN OUR BANK:", missing.length);
if (missing.length > 0) {
  missing.forEach(m => console.log("- " + m));
}
