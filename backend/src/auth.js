// Importa a biblioteca do Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Substitua com a URL e a Chave Pública do seu projeto Supabase
const SUPABASE_URL = 'https://dolmskfxulciscwrpfes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbG1za2Z4dWxjaXNjd3JwZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzYxOTQsImV4cCI6MjA2OTY1MjE5NH0.QB9j1Whd6ljxbMptXoAYlLbCm0WgmsD5PaFdPfBFH_E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Adiciona um listener para o formulário de login
const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessageDiv = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o envio padrão do formulário

    const email = emailInput.value;
    const password = passwordInput.value;

    // Tenta fazer o login com o email e a senha
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        // Se houver um erro, exibe a mensagem para o usuário
        errorMessageDiv.textContent = `Erro: login ou senha incorretos.`;
        errorMessageDiv.classList.remove('hidden');
    } else {
        // Se o login for bem-sucedido
        console.log('Login bem-sucedido!', data);
        
        // Redireciona para a página principal (ou outra página após o login)
        window.location.href = '/index.html';
    }
});