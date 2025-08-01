import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Lógica de Proteção de Página ---
function checkAuth() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = '/frontend/src/pages/login.html';
    } else {
        // Apenas mostra o container se o elemento existir na página
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.remove('hidden');
        }
    }
}
checkAuth();

// Conexão com Supabase
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// --- FORMULÁRIO ---
document.addEventListener('DOMContentLoaded', () => {
  const osNumberInput = document.getElementById('os-number'); // Campo de número de OS
  const form = document.getElementById('os-form');

  // Se o campo de número de OS estiver vazio, gera automaticamente um número
  if (!osNumberInput.value.trim()) {
    osNumberInput.value = gerarNumeroOS(); // Gera e preenche o número da OS
  }

  // Ao enviar o formulário, o número da OS será validado e gerado, se necessário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Se o campo estiver vazio, gera um número
    if (!osNumberInput.value.trim()) {
      osNumberInput.value = gerarNumeroOS();
    }

    const dados = {
      tipo: getValue('os-type'),
      numero_ordem: osNumberInput.value,
      data_entrada: getValue('entry-date'),
      status: getValue('order-status'),
      cliente: getValue('client-name'),
      telefone: getValue('client-phone'),
      endereco: getValue('client-address'),
      origem_cliente: getRadioValue('customer-origin'),
      marca_aparelho: getRadioValue('object'),
      modelo_aparelho: getValue('device-model'),
      numero_serie: getValue('device-serial'),
      defeito_reclamado: getValue('device-defect'),
      localizacao_aparelho: getValue('device-location'),
      acessorios: getRadioValue('accessories'),
      estado_aparelho: getRadioValue('condition'),
      sinal: parseFloat(getValue('down-payment')) || 0,
      valor_total: parseFloat(getValue('total-value')) || 0,
    };

    // Envia os dados para o Supabase
    const { data, error } = await supabase.from('ordens_de_servico').insert([dados]);

    console.log("Dados enviados:", dados);
    console.log("Resposta do Supabase:", data, error);

    // Verifica se houve erro ao salvar
    if (error) {
    alert('Erro ao salvar OS: ' + error.message);
    console.error(error);
    } else if (data) {
    alert('Ordem de serviço salva com sucesso!');
    form.reset();
    osNumberInput.value = gerarNumeroOS(); // Gera um novo número após salvar
    } else {
    alert('Erro desconhecido ao salvar OS');
    }
   });
});

// Função para gerar número único de OS
function gerarNumeroOS() {
  const agora = new Date();
  const ano = agora.getFullYear().toString().slice(-2);     // dois últimos dígitos do ano
  const mes = String(agora.getMonth() + 1).padStart(2, '0'); // mês com 2 dígitos
  const dia = String(agora.getDate()).padStart(2, '0');      // dia com 2 dígitos
  const aleatorio = Math.floor(1000 + Math.random() * 9000); // número aleatório de 4 dígitos

  return `OS-${ano}${mes}${dia}-${aleatorio}`;
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getRadioValue(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : '';
}

