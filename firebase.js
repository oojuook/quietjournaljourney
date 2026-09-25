import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBnP_TuWAq0eE3hpCOdSgMv1FmzAdZhExA',
  authDomain: 'quiet-journal-journey-f3905.firebaseapp.com',
  projectId: 'quiet-journal-journey-f3905',
  storageBucket: 'quiet-journal-journey-f3905.firebasestorage.app',
  messagingSenderId: '810907134717',
  appId: '1:810907134717:web:f250e38ed9d17640cf2c94'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
