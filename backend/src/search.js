import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Lógica de Proteção de Página ---
function checkAuth() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'frontend/src/pages/login.html';
    }
}
checkAuth();

// --- ATENÇÃO ---
// Conexão com Supabase
const SUPABASE_URL = 'xxxxxxxxxxxxxxxxxxx'; 
const SUPABASE_ANON_KEY = 'xxxxxxxxxxxxxxxxxx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos do DOM
const brandInput = document.getElementById('filter-brand');
const modelInput = document.getElementById('filter-model');
const defectInput = document.getElementById('filter-defect');
const generalInput = document.getElementById('filter-general');
const resultsBody = document.getElementById('results-table-body');
const noResultsMessage = document.getElementById('no-results-message');

// Executa busca sempre que algum campo muda
[brandInput, modelInput, defectInput, generalInput].forEach(input => {
  input.addEventListener('input', buscarOS);
});

async function buscarOS() {
  const marca = brandInput.value.trim();
  const modelo = modelInput.value.trim();
  const defeito = defectInput.value.trim();
  const geral = generalInput.value.trim();

  // Construindo filtros dinâmicos
  const filtros = [];

  if (marca) filtros.push(`marca_aparelho.ilike.%${marca}%`);
  if (modelo) filtros.push(`modelo_aparelho.ilike.%${modelo}%`);
  if (defeito) filtros.push(`defeito_reclamado.ilike.%${defeito}%`);
  if (geral) {
    filtros.push(`numero_ordem.ilike.%${geral}%`);
    filtros.push(`cliente.ilike.%${geral}%`);
  }

  // Executa consulta com os filtros aplicados
  const { data, error } = await supabase
    .from('ordens_de_servico')
    .select('*')
    .or(filtros.join(','))
    .order('data_entrada', { ascending: false });

  if (error) {
    resultsBody.innerHTML = `<tr><td colspan="7" class="text-red-500 px-6 py-4">Erro ao buscar: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    resultsBody.innerHTML = '';
    noResultsMessage.classList.remove('hidden');
    return;
  }

  noResultsMessage.classList.add('hidden');
  resultsBody.innerHTML = data.map(os => `
    <tr>
      <td class="px-6 py-4 whitespace-nowrap">${os.numero_ordem}</td>
      <td class="px-6 py-4 whitespace-nowrap">${new Date(os.data_entrada).toLocaleDateString()}</td>
      <td class="px-6 py-4 whitespace-nowrap">${os.status}</td>
      <td class="px-6 py-4 whitespace-nowrap">${os.cliente}</td>
      <td class="px-6 py-4 whitespace-nowrap">${os.marca_aparelho}</td>
      <td class="px-6 py-4 whitespace-nowrap">${os.modelo_aparelho}</td>
      <td class="px-6 py-4 whitespace-nowrap">${os.defeito_reclamado}</td>
    </tr>
  `).join('');
}