// PBL Activity: In-Memory Library Book Management Utility

const library = [];

/**
 * Adds a book object to the library array.
 * @param {string} title - Book title.
 * @param {string} author - Book author.
 * @returns {{ title: string, author: string }} Newly added book object.
 */
function addBook(title, author) {
  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('Book title must be a non-empty string.');
  }
  if (typeof author !== 'string' || !author.trim()) {
    throw new Error('Book author must be a non-empty string.');
  }

  const book = {
    title: title.trim(),
    author: author.trim()
  };
  library.push(book);
  return book;
}

/**
 * Finds a book in the library by its title (case-insensitive).
 * @param {string} title - Title to search for.
 * @returns {{ title: string, author: string } | undefined} Matching book or undefined.
 */
function findBook(title) {
  if (typeof title !== 'string' || !title.trim()) {
    return undefined;
  }
  const target = title.trim().toLowerCase();
  return library.find((book) => book.title.toLowerCase() === target);
}

// Run demonstration when executed directly in Node.js (or loaded in a browser)
const isNodeMain = typeof require !== 'undefined' && require.main === module;
const isBrowser = typeof window !== 'undefined';

if (isNodeMain || isBrowser) {
  console.log('--- PBL Activity: Library Book Management ---');
  addBook('Clean Code', 'Robert C. Martin');
  addBook('Eloquent JavaScript', 'Marijn Haverbeke');
  addBook('You Don\'t Know JS', 'Kyle Simpson');

  console.log('Library collection:', library);
  console.log('Find "Eloquent JavaScript":', findBook('Eloquent JavaScript'));
  console.log('Find "clean code" (case-insensitive):', findBook('clean code'));
  console.log('Find "Missing Book":', findBook('Missing Book'));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { library, addBook, findBook };
}
