import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyB4HqOTaN3BJ54trXp08HZy5-kgRQ47iUE',
  authDomain: 'idenity-e7f29.firebaseapp.com',
  projectId: 'idenity-e7f29',
  storageBucket: 'idenity-e7f29.firebasestorage.app',
  messagingSenderId: '950682417474',
  appId: '1:950682417474:web:a37ac1c7da752d52d430db',
  measurementId: 'G-9K42LJ6Y4B',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
