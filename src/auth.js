// --- Lógica de Autenticação ---

// Definição do usuário administrador
// const ADMIN_USER = {
//     email: 'admin@admin.com',
//     password: 'admin'
// };

// const loginForm = document.getElementById('login-form');
// const errorMessage = document.getElementById('error-message');

// loginForm.addEventListener('submit', (e) => {
//     e.preventDefault();
    
//     const email = document.getElementById('email').value;
//     const password = document.getElementById('password').value;

//     if (email === ADMIN_USER.email && password === ADMIN_USER.password) {
//         // Login bem-sucedido
//         localStorage.setItem('isLoggedIn', 'true');
//         window.location.href = 'index.html';
//     } else {
//         // Credenciais inválidas
//         errorMessage.textContent = 'Email ou senha inválidos.';
//         errorMessage.classList.remove('hidden');
//     }
// });

// src/auth.js
// import { auth } from './firebase.js';
// import { signInWithEmailAndPassword } from 'firebase/auth';

// export async function login(email, password) {
//     return signInWithEmailAndPassword(auth, email, password);
// }

// Lógica de login, logout, proteção de página
import { auth } from './firebase.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';

export async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
    return signOut(auth);
}

export function checkAuth(onUser, onNoUser) {
    onAuthStateChanged(auth, (user) => {
        if (user) onUser(user);
        else onNoUser();
    });
}
