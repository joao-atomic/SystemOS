import { supabase, requireAuth, signOutAndRedirect } from '/backend/src/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Autenticação
  await requireAuth();
  document.getElementById('logout-button')?.addEventListener('click', signOutAndRedirect);

  const form = document.getElementById('os-form');
  if (!form) return;

  // ---------- ELEMENTOS ----------
  const submitButton = form.querySelector('button[type="submit"]');
  const osNumberInput = document.getElementById('os-number');
  const entryDateInput = document.getElementById('entry-date');

  const observationContainer = document.getElementById('observation-field-container');
  const accessoriesObsContainer = document.getElementById('accessories-observation-container');
  const popupGeneratePdfButton = document.getElementById('popup-generate-pdf-button');

  // Armazena os dados da última OS criada para usar no PDF
  let lastCreatedOSData = null;

  // ---------- UI helpers ----------
  // ---- Calcula "Restante R$" = Total - Sinal ----
  const totalInput = document.getElementById('total-value');
  const downInput = document.getElementById('down-payment');
  const restInput = document.getElementById('remaining-value');

  function calcRemaining() {
    const total = Number(totalInput.value) || 0;
    const sinal = Number(downInput.value) || 0;
    const restante = Math.max(0, total - sinal);
    restInput.value = restante.toFixed(2);
  }

  totalInput.addEventListener('input', calcRemaining);
  downInput.addEventListener('input', calcRemaining);
  calcRemaining();

  function setSubmitButtonState(state, label) {
    if (!submitButton) return;
    if (state === 'loading') {
      submitButton.disabled = true;
      submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${label}`;
    } else {
      submitButton.disabled = false;
      submitButton.innerHTML = `<i class="fas fa-save mr-2"></i> ${label}`;
    }
  }

  // Popup resiliente (usa alert() se não existir modal no HTML)
  const popupModal = document.getElementById('popup-modal');
  const popupIconContainer = document.getElementById('popup-icon-container');
  const popupTitleEl = document.getElementById('popup-title');
  const popupMessageEl = document.getElementById('popup-message');
  const popupCloseButton = document.getElementById('popup-close-button');
  popupCloseButton?.addEventListener('click', () => popupModal?.classList.add('hidden'));

  function showPopup(title, message, type = 'success') {
    if (!popupModal || !popupIconContainer || !popupTitleEl || !popupMessageEl || !popupCloseButton) {
      alert(`${title}\n\n${message}`);
      return;
    }
    popupTitleEl.textContent = title;
    popupMessageEl.textContent = message;

    if (type === 'success') {
      popupIconContainer.innerHTML = '<i class="fas fa-check text-green-600"></i>';
      popupIconContainer.className = 'mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10';
      popupCloseButton.className = 'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto sm:text-sm';
      if (popupGeneratePdfButton) {
        popupGeneratePdfButton.classList.remove('hidden');
      }
    } else {
      popupIconContainer.innerHTML = '<i class="fas fa-times text-red-600"></i>';
      popupIconContainer.className = 'mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10';
      popupCloseButton.className = 'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm';
      if (popupGeneratePdfButton) {
        popupGeneratePdfButton.classList.add('hidden');
      }
    }
    popupModal.classList.remove('hidden');
  }

  // ---------- Helpers ----------
  const getValue = (id) => document.getElementById(id)?.value.trim() ?? '';
  const getRadioValue = (name) =>
    form.querySelector(`input[name="${name}"]:checked`)?.value ?? '';
  // Função para buscar o último número de OS do banco de dados

  const fetchLastOsNumber = async () => {
    const { data, error } = await supabase
      .from('ordens_de_servico')
      .select('numero_ordem')
      .order('data_criacao', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrou nenhum registro
      console.error('Erro ao buscar o último número de OS:', error.message);
      return null;
    }

    if (data) {
      // Extrai o número da OS do formato 'XX-YYMMDD-XXXX'
      const lastNumberPart = data.numero_ordem.split('-')[2];
      return parseInt(lastNumberPart, 10);
    }
    return 0; // Se não houver registros, retorna 0
  };

  async function gerarNumeroOS() {
    const lastNumber = await fetchLastOsNumber();
    const prefix = 'OS';
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const nextNumber = (lastNumber + 1).toString().padStart(4, '0');
    return `${prefix}-${yy}${mm}${dd}-${nextNumber}`;
  }
  // --- máscara e validação do telefone BR ---
  const phoneInput = document.getElementById('client-phone');

  function onlyDigits(s) {
    return s.replace(/\D/g, '');
  }

  // máscara progressiva (não força parênteses/hífen quando vazio)
  function formatBRPhone(v) {
    const d = onlyDigits(v).slice(0, 11); // até 11 dígitos

    if (!d) return '';                                   // nada -> vazio
    if (d.length <= 2) return `(${d}`;                   // (DD
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;          // (DD) 1234
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; // fixo
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;                // celular
  }

  function handlePhoneInput(e) {
    const beforeDigits = onlyDigits(e.target.value);

    // se deletou tudo (Ctrl+A + Del/Backspace, ou limpou), não recoloca máscara
    if (beforeDigits.length === 0) {
      e.target.value = '';
      return;
    }

    e.target.value = formatBRPhone(e.target.value);

    // simplificação: cursor vai pro fim (evita “pulos”)
    const end = e.target.value.length;
    e.target.setSelectionRange(end, end);
  }

  function validatePhone() {
    const ok = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/.test(phoneInput.value);
    phoneInput.setCustomValidity(ok ? '' : 'Informe um telefone válido no formato (11) 99999-9999');
  }

  // se selecionar tudo e apertar Backspace/Delete, limpa de uma vez
  function quickClearOnFullDelete(e) {
    const allSelected = phoneInput.selectionStart === 0 &&
      phoneInput.selectionEnd === phoneInput.value.length;
    if (allSelected && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      phoneInput.value = '';
    }
  }

  if (phoneInput) {
    phoneInput.addEventListener('input', handlePhoneInput);
    phoneInput.addEventListener('blur', validatePhone);
    phoneInput.addEventListener('keydown', quickClearOnFullDelete);
    phoneInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text') || '';
      phoneInput.value = formatBRPhone(text);
      validatePhone();
    });
  }


  // ---------- Estado inicial ----------
  if (entryDateInput) entryDateInput.valueAsDate = new Date();

  (async () => {
    if (osNumberInput) {
      osNumberInput.value = await gerarNumeroOS();
    }
  })();

  // Mostrar/ocultar campos condicionais
  function updateConditionObservation() {
    const val = getRadioValue('condition');
    if (observationContainer) observationContainer.classList.toggle('hidden', val === 'Bom');
  }
  function updateAccessoriesObservation() {
    const val = getRadioValue('accessories');
    if (accessoriesObsContainer) accessoriesObsContainer.classList.toggle('hidden', val !== 'Sim');
  }
  updateConditionObservation();
  updateAccessoriesObservation();

  // Mudanças no formulário
  form.addEventListener('change', (e) => {
    const name = e.target?.name;
    if (name === 'condition') updateConditionObservation();
    if (name === 'accessories') updateAccessoriesObservation();
    if (name === 'osType' && osNumberInput) osNumberInput.value = gerarNumeroOS();
  });

  // Função para gerar PDF com jsPDF
  function generatePdfFromData(osData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Ordem de Serviço: ${osData.numero_ordem}`, 14, 22);

    doc.setFontSize(12);
    doc.text(`Data de Entrada: ${osData.data_entrada}`, 14, 32);
    doc.text(`Status: ${osData.status}`, 14, 39);

    // Informações do Cliente
    doc.setFontSize(14);
    doc.text('Informações do Cliente', 14, 55);
    doc.setFontSize(12);
    doc.text(`Cliente: ${osData.cliente}`, 14, 65);
    doc.text(`Telefone: ${osData.telefone}`, 14, 72);
    doc.text(`Endereço: ${osData.endereco}`, 14, 79);
    doc.text(`Origem: ${osData.origem_cliente}`, 14, 86);

    // Informações do Aparelho
    doc.setFontSize(14);
    doc.text('Informações do Aparelho', 14, 102);
    doc.setFontSize(12);
    doc.text(`Marca: ${osData.marca_aparelho}`, 14, 112);
    doc.text(`Modelo: ${osData.modelo_aparelho}`, 14, 119);
    doc.text(`Nº de Série: ${osData.numero_serie}`, 14, 126);
    doc.text(`Defeito: ${osData.defeito_reclamado}`, 14, 133);
    doc.text(`Localização: ${osData.localizacao_aparelho}`, 14, 140);
    doc.text(`Acessórios: ${osData.acessorios}`, 14, 147);
    doc.text(`Estado: ${osData.estado_aparelho}`, 14, 154);
    doc.text(`Observações do Estado: ${osData.estado_aparelho_obs}`, 14, 161);

    // Valores
    doc.setFontSize(14);
    doc.text('Valores', 14, 177);
    doc.setFontSize(12);
    doc.text(`Valor Total: R$ ${osData.valor_total.toFixed(2)}`, 14, 187);
    doc.text(`Sinal: R$ ${osData.sinal.toFixed(2)}`, 14, 194);
    const remainingValue = osData.valor_total - osData.sinal;
    doc.text(`Restante: R$ ${remainingValue.toFixed(2)}`, 14, 201);

    doc.save(`OS_${osData.numero_ordem}.pdf`);
  }

  // ---------- Submit ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (osNumberInput && !osNumberInput.value) osNumberInput.value = gerarNumeroOS();
    const total = Number(getValue('total-value')) || 0;
    const sinal = Number(getValue('down-payment')) || 0;

    const payload = {
      tipo: getRadioValue('osType'),
      numero_ordem: getValue('os-number'),
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
      acessorios_obs: getValue('accessories-observation'),
      estado_aparelho: getRadioValue('condition'),
      estado_aparelho_obs: getValue('device-observation'),
      sinal: parseFloat(getValue('down-payment')) || 0,
      valor_total: parseFloat(getValue('total-value')) || 0,
      valor_restante: total > 0 ? Math.max(0, total - sinal) : 0,
    };

    setSubmitButtonState('loading', 'Salvando...');
    try {
      const { error, data } = await supabase.from('ordens_de_servico').insert([payload]).select();
      if (error) {
        console.error(error);
        showPopup('Erro!', `Não foi possível salvar a O.S.: ${error.message}`, 'error');
      } else if (data && data.length > 0) {
        lastCreatedOSData = data[0];
        showPopup('Sucesso!', 'Ordem de serviço salva com sucesso!');
        form.reset();
        if (entryDateInput) entryDateInput.valueAsDate = new Date();
        if (osNumberInput) osNumberInput.value = await gerarNumeroOS();
        updateConditionObservation();
        updateAccessoriesObservation();
      } else {
        showPopup('Erro!', 'A ordem de serviço foi salva, mas não foi possível recuperar os dados.', 'error');
      }
    } catch (err) {
      console.error(err);
      showPopup('Erro inesperado', 'Ocorreu um erro ao salvar.', 'error');
    } finally {
      setSubmitButtonState('ready', 'Salvar Ordem de Serviço');
    }
  });

  // Listener para o botão de gerar PDF no pop-up
  popupGeneratePdfButton?.addEventListener('click', () => {
    if (lastCreatedOSData) {
      generatePdfFromData(lastCreatedOSData);
    } else {
      showPopup('Erro', 'Nenhuma O.S. recente encontrada para gerar PDF.', 'error');
    }
  });
});
