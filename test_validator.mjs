import { validateEquation } from './src/lib/math_validator.js';

const testCases = [
  { eq: "7+9=6+10=18+/-2", expected: true },
  { eq: "10+/-5=15", expected: true },
  { eq: "10+/-5=5", expected: true },
  { eq: "20×/÷2=10", expected: true },
  { eq: "20×/÷2=40", expected: true },
  { eq: "5+5=10", expected: true },
  { eq: "5+5=11", expected: false },
];

console.log("Running Validator Tests...");
testCases.forEach(({ eq, expected }) => {
  const result = validateEquation(eq);
  console.log(`[${result === expected ? "PASS" : "FAIL"}] "${eq}" (Expected: ${expected}, Got: ${result})`);
});
