// Add actual questions and answers here later
const QUESTION_BANK = [
    {
        id: 1,
        question: "What is the capital of France?",
        options: ["Berlin", "Madrid", "Paris", "Rome"],
        correctAnswer: 2
    },
    {
        id: 2,
        question: "Which planet is known as the Red Planet?",
        options: ["Earth", "Mars", "Jupiter", "Saturn"],
        correctAnswer: 1
    },
];


// Add prioritisation algorithm here later
export function getRandomQuestion() {
  const randomIndex = Math.floor(Math.random() * QUESTION_BANK.length);
  return QUESTION_BANK[randomIndex];
}