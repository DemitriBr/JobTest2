import { beforeEach, afterEach } from 'vitest';

// Mock IndexedDB for testing
global.indexedDB = {
  open: () => ({
    onsuccess: null,
    onerror: null,
    result: {
      createObjectStore: () => {},
      transaction: () => ({
        objectStore: () => ({
          add: () => {},
          get: () => {},
          put: () => {},
          delete: () => {},
          getAll: () => {}
        })
      })
    }
  })
};

// Mock crypto for testing
global.crypto = {
  getRandomValues: (arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: (key) => localStorageMock[key] || null,
  setItem: (key, value) => { localStorageMock[key] = value; },
  removeItem: (key) => { delete localStorageMock[key]; },
  clear: () => {
    Object.keys(localStorageMock).forEach(key => {
      if (key !== 'getItem' && key !== 'setItem' && key !== 'removeItem' && key !== 'clear') {
        delete localStorageMock[key];
      }
    });
  }
};

global.localStorage = localStorageMock;

// Clean up after each test
afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});