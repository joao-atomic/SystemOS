// --- Lógica de Autenticação ---

// Definição do usuário administrador
const ADMIN_USER = {
    email: 'admin@admin.com',
    password: 'admin'
};

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (email === ADMIN_USER.email && password === ADMIN_USER.password) {
        // Login bem-sucedido
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'index.html';
    } else {
        // Credenciais inválidas
        errorMessage.textContent = 'Email ou senha inválidos.';
        errorMessage.classList.remove('hidden');
    }
});
