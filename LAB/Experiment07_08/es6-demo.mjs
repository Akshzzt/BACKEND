// Part A: ES6 Features Demonstration (Sections 3.1 – 3.10)
import multiply, { PI, add } from './math.mjs';

// 3.1 let & const (block scope)
const course = 'Backend Development';
let status = 'In Progress';
if (true) {
  const blockScoped = 'inside block';
  status = `${course} (${blockScoped})`;
}
console.log('3.1 let/const:', status);

// 3.2 Arrow functions & 3.6 Default parameters
const square = (x) => x * x;
const greet = (name = 'Guest', greeting = 'Hello') => `${greeting}, ${name}!`;
console.log('3.2 & 3.6 Arrow + Default:', square(5), '|', greet(), '|', greet('Alice', 'Hi'));

// 3.3 Template literals & 3.10 Enhanced object literals
const userName = 'Bob';
const age = 30;
const dynamicKey = 'city';
const person = {
  userName,
  age,
  [dynamicKey]: 'Mumbai',
  summary() {
    return `${this.userName} (${this.age}) from ${this.city}`;
  }
};
console.log('3.3 & 3.10 Template + Enhanced Object:', person.summary());

// 3.4 Destructuring
const colors = ['red', 'green', 'blue'];
const [firstColor, , thirdColor] = colors;
const { userName: fullName, country = 'India' } = person;
console.log('3.4 Destructuring:', firstColor, thirdColor, '|', fullName, country);

// 3.5 Spread and Rest operators
const combined = [...[1, 2, 3], ...[4, 5, 6]];
const sum = (...numbers) => numbers.reduce((total, n) => total + n, 0);
console.log('3.5 Spread & Rest:', combined, '| sum =', sum(1, 2, 3, 4));

// 3.7 Classes & Inheritance
class Animal {
  constructor(name, sound) {
    this.name = name;
    this.sound = sound;
  }
  speak() {
    return `${this.name} says ${this.sound}`;
  }
  static info() {
    return 'Animals are living beings.';
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name, 'Woof');
  }
  fetch() {
    return `${this.name} is fetching the ball.`;
  }
}

const dog = new Dog('Rex');
console.log('3.7 Classes:', dog.speak(), '|', dog.fetch(), '|', Animal.info());

// 3.8 ES6 Modules
console.log('3.8 Modules:', { PI, sum2_3: add(2, 3), prod4_5: multiply(4, 5) });

// 3.9 Promises and Async/Await
const fetchData = () =>
  new Promise((resolve) => {
    setTimeout(() => resolve('Data loaded via Promise/Async-Await'), 20);
  });

async function loadData() {
  const data = await fetchData();
  console.log('3.9 Async/Await:', data);
}

await loadData();
