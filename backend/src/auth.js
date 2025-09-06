// /backend/src/auth.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://dolmskfxulciscwrpfes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbG1za2Z4dWxjaXNjd3JwZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzYxOTQsImV4cCI6MjA2OTY1MjE5NH0.QB9j1Whd6ljxbMptXoAYlLbCm0WgmsD5PaFdPfBFH_E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Exige sessão ativa. Se não houver, redireciona para a tela de login. */
export async function requireAuth(redirectTo = '/frontend/src/pages/login.html') {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      document.getElementById('app-container')?.classList.add('hidden');
      location.replace(redirectTo);
      return null;
    }
    document.getElementById('app-container')?.classList.remove('hidden');
    return session;
  } catch (e) {
    console.error('[requireAuth] erro:', e);
    location.replace(redirectTo);
    return null;
  }
}

/** Login com email/senha (lança erro se falhar) */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Logout e volta para login */
export async function signOutAndRedirect() {
  try { await supabase.auth.signOut(); } catch {}
  location.href = '/frontend/src/pages/login.html';
}

/* ===== Auto-wire quando estiver na página de login ===== */
const loginForm = document.getElementById('login-form');
if (loginForm) {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('error-message');

  // Se já estiver logado, pula o login
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) location.href = '/index.html';
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await signIn(emailInput.value, passwordInput.value);
      location.href = '/index.html';
    } catch (err) {
      console.error('[login] erro:', err);
      if (errorMessage) {
        errorMessage.textContent = 'Erro: login ou senha incorretos.';
        errorMessage.classList.remove('hidden');
      } else {
        alert('Erro: login ou senha incorretos.');
      }
    }
  });
}
