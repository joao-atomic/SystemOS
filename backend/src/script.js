import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

document.addEventListener('DOMContentLoaded', async () => {
  // Autenticação
  await requireAuth();
  document.getElementById('logout-button')?.addEventListener('click', signOutAndRedirect);

  const form = document.getElementById('os-form');
  if (!form) return;

  // ---------- ELEMENTOS ----------
  const submitButton   = form.querySelector('button[type="submit"]');
  const osNumberInput  = document.getElementById('os-number');
  const entryDateInput = document.getElementById('entry-date');

  const observationContainer        = document.getElementById('observation-field-container');
  const accessoriesObsContainer     = document.getElementById('accessories-observation-container');

  // ---------- UI helpers ----------
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
  const popupModal         = document.getElementById('popup-modal');
  const popupIconContainer = document.getElementById('popup-icon-container');
  const popupTitleEl       = document.getElementById('popup-title');
  const popupMessageEl     = document.getElementById('popup-message');
  const popupCloseButton   = document.getElementById('popup-close-button');
  popupCloseButton?.addEventListener('click', () => popupModal?.classList.add('hidden'));

  function showPopup(title, message, type = 'success') {
    if (!popupModal || !popupIconContainer || !popupTitleEl || !popupMessageEl || !popupCloseButton) {
      alert(`${title}\n\n${message}`);
      return;
    }
    popupTitleEl.textContent   = title;
    popupMessageEl.textContent = message;

    if (type === 'success') {
      popupIconContainer.innerHTML = '<i class="fas fa-check text-green-600"></i>';
      popupIconContainer.className = 'mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10';
      popupCloseButton.className   = 'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto sm:text-sm';
    } else {
      popupIconContainer.innerHTML = '<i class="fas fa-times text-red-600"></i>';
      popupIconContainer.className = 'mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10';
      popupCloseButton.className   = 'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm';
    }
    popupModal.classList.remove('hidden');
  }

  // ---------- Helpers ----------
  const getValue = (id) => document.getElementById(id)?.value.trim() ?? '';
  const getRadioValue = (name) =>
    form.querySelector(`input[name="${name}"]:checked`)?.value ?? '';

  function gerarNumeroOS() {
    const prefix = getRadioValue('osType') === 'O.S.' ? 'OS' : 'OR';
    const d  = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${yy}${mm}${dd}-${rnd}`;
  }

  // ---------- Estado inicial ----------
  if (entryDateInput) entryDateInput.valueAsDate = new Date();
  if (osNumberInput)  osNumberInput.value = gerarNumeroOS();

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
    if (name === 'condition')   updateConditionObservation();
    if (name === 'accessories') updateAccessoriesObservation();
    if (name === 'osType' && osNumberInput) osNumberInput.value = gerarNumeroOS();
  });

  // ---------- Submit ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (osNumberInput && !osNumberInput.value) osNumberInput.value = gerarNumeroOS();

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
    };

    setSubmitButtonState('loading', 'Salvando...');
    try {
      const { error } = await supabase.from('ordens_de_servico').insert([payload]);
      if (error) {
        console.error(error);
        showPopup('Erro!', `Não foi possível salvar a O.S.: ${error.message}`, 'error');
      } else {
        showPopup('Sucesso!', 'Ordem de serviço salva com sucesso!');
        form.reset();
        if (entryDateInput) entryDateInput.valueAsDate = new Date();
        if (osNumberInput)  osNumberInput.value = gerarNumeroOS();
        updateConditionObservation();
        updateAccessoriesObservation();
      }
    } catch (err) {
      console.error(err);
      showPopup('Erro inesperado', 'Ocorreu um erro ao salvar.', 'error');
    } finally {
      setSubmitButtonState('ready', 'Salvar Ordem de Serviço');
    }
  });
});
