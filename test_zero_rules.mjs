import { validateEquation } from './src/lib/math_validator.js';

const tests = [
  { eq: '0+6=6', expected: true },
  { eq: '00+6=6', expected: false },
  { eq: '06+6=12', expected: false },
  { eq: '100=100', expected: true },
  { eq: '0=0', expected: true },
  { eq: '5-06=-1', expected: false },
  { eq: '-06=-6', expected: false }
];

tests.forEach(({ eq, expected }) => {
  const result = validateEquation(eq);
  console.log(`${eq}: ${result} ${result === expected ? '✅' : '❌'}`);
});
