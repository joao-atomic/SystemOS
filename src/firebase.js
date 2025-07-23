// Inicialização do Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'SUA_API_KEY',
    authDomain: 'SEU_AUTH_DOMAIN',
    projectId: 'SEU_PROJECT_ID',
    storageBucket: 'SEU_STORAGE_BUCKET',
    messagingSenderId: 'SEU_SENDER_ID',
    appId: 'SEU_APP_ID'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
