// Task 2: Advanced JavaScript Methods — String, Array, and Object Manipulation

// --- String Methods ---
const str = 'Backend Development';
console.log('--- String Methods ---');
console.log('Original:', str);
console.log('Upper Case:', str.toUpperCase());
console.log('Lower Case:', str.toLowerCase());
const words = str.split(' ');
console.log('Split by space:', words);

// --- Array Methods (Add, Read, Update) ---
console.log('\n--- Array Methods ---');
const items = ['Node', 'Express'];

// Add: push() adds an element to the end of an array
items.push('MongoDB');
console.log('After Adding:', items);

// Read: Accessing an element by index
console.log('First Item (Read):', items[0]);

// Update: Changing an element by its index
items[0] = 'Node.js';
console.log('After Updating:', items);

// --- Object Methods (Add, Read, Update) ---
console.log('\n--- Object Methods ---');
const user = { name: 'John', role: 'Dev' };

// Add: Adding a new key-value pair to the object
user.age = 25;
console.log('After Adding Key:', user);

// Read: Accessing a value using dot notation
console.log('User Name (Read):', user.name);

// Update: Modifying an existing value
user.role = 'Senior Dev';
console.log('After Updating Role:', user);
