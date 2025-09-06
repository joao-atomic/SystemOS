// /backend/src/search.js
import { supabase, requireAuth, signOutAndRedirect } from '/backend/src/auth.js';

/* ========= 0) Proteção ========= */
document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();
  document.getElementById('logout-button')?.addEventListener('click', signOutAndRedirect);
});

/* ========= 1) Menu (hambúrguer + overlay) ========= */
function initMenu() {
  try {
    const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay') || document.querySelector('.overlay');
    const buttons = Array.from(document.querySelectorAll('#menu-toggle, .hamburger-btn'));
    if (!sidebar || !overlay || buttons.length === 0) return;

    const setSidebar = (open) => {
      sidebar.classList.toggle('-translate-x-full', !open);
      sidebar.classList.toggle('translate-x-0', open);
      sidebar.classList.toggle('open', open);
      overlay.classList.toggle('active', open);
      buttons.forEach(b => b.setAttribute('aria-expanded', String(open)));
    };

    const toggleSidebar = () => setSidebar(sidebar.classList.contains('-translate-x-full'));
    const closeSidebar  = () => setSidebar(false);

    setSidebar(false);
    buttons.forEach(btn => btn.addEventListener('click', toggleSidebar));
    overlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });
  } catch (e) {
    console.error('Erro no initMenu:', e);
  }
}

/* ========= 2) Utilidades ========= */
const norm = (v) => (v ?? '').toString().trim().toLowerCase();

/* ========= 3) Página de Busca (com paginação) ========= */
document.addEventListener('DOMContentLoaded', () => {
  initMenu();

  // DOM
  const resultsTableBody = document.getElementById('results-table-body');
  const noResultsMessage = document.getElementById('no-results-message');

  // filtros
  const form        = document.getElementById('search-form');
  const btnSearch   = document.getElementById('search-button');

  const fBrandText  = document.getElementById('filter-brand');
  const fModel      = document.getElementById('filter-model');
  const fDefect     = document.getElementById('filter-defect');
  const fGeneral    = document.getElementById('filter-general');
  const fOs         = document.getElementById('filter-os');
  const fClient     = document.getElementById('filter-client');
  const fPhone      = document.getElementById('filter-phone');
  const fStatus     = document.getElementById('filter-status');
  const fDateFrom   = document.getElementById('filter-date-from');
  const fDateTo     = document.getElementById('filter-date-to');
  const fBrandList  = document.getElementById('filter-brand2');

  // modal
  const editModal          = document.getElementById('edit-status-modal');
  const modalOsNumber      = document.getElementById('modal-os-number');
  const modalCurrentStatus = document.getElementById('modal-current-status');
  const modalStatusSelect  = document.getElementById('modal-status-select');
  const modalSaveButton    = document.getElementById('modal-save-button');
  const modalCancelButton  = document.getElementById('modal-cancel-button');

  // estado
  const PAGE_SIZE = 15;
  let allServiceOrders = [];
  let filteredOrders   = [];
  let currentPage      = 1;

  // cria (ou pega) o contêiner do paginador logo após a tabela
  let pagination = document.getElementById('pagination');
  if (!pagination) {
    pagination = document.createElement('div');
    pagination.id = 'pagination';
    pagination.className = 'flex items-center justify-between mt-4';
    // insere no mesmo wrapper da tabela
    const wrapper = noResultsMessage?.parentElement; // .overflow-x-auto
    wrapper?.appendChild(pagination);
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Aberta': return 'bg-green-100 text-green-800';
      case 'Aguardando Aprovação': return 'bg-yellow-100 text-yellow-800';
      case 'Aprovado': return 'bg-blue-100 text-blue-800';
      case 'Em Andamento': return 'bg-indigo-100 text-indigo-800';
      case 'Concluído': return 'bg-purple-100 text-purple-800';
      case 'Entregue': return 'bg-gray-100 text-gray-800';
      case 'Cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-200 text-gray-900';
    }
  };

  const statusOrder   = ['Aberta', 'Aguardando Aprovação', 'Aprovado', 'Em Andamento', 'Concluído', 'Entregue'];
  const finalStatuses = ['Entregue', 'Cancelado'];

  function openEditModal(order) {
    if (!editModal) return;
    modalOsNumber.textContent      = order.numero_ordem ?? '—';
    modalCurrentStatus.textContent = order.status ?? '—';
    editModal.classList.remove('hidden');

    // popular opções
    modalStatusSelect.innerHTML = '';
    if (finalStatuses.includes(order.status)) {
      modalStatusSelect.innerHTML = '<option>Status finalizado, não pode ser alterado.</option>';
      modalSaveButton.disabled = true;
    } else {
      const start = Math.max(0, statusOrder.indexOf(order.status) + 1);
      for (let i = start; i < statusOrder.length; i++) {
        const opt = document.createElement('option');
        opt.value = statusOrder[i];
        opt.textContent = statusOrder[i];
        modalStatusSelect.appendChild(opt);
      }
      const cancelOpt = document.createElement('option');
      cancelOpt.value = 'Cancelado';
      cancelOpt.textContent = 'Cancelado';
      modalStatusSelect.appendChild(cancelOpt);
      modalSaveButton.disabled = false;
    }

    // salvar
    modalSaveButton.onclick = async () => {
      const newStatus = modalStatusSelect.value;
      modalSaveButton.disabled = true;
      modalSaveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
      const { error } = await supabase
        .from('ordens_de_servico')
        .update({ status: newStatus })
        .eq('id', order.id);
      modalSaveButton.disabled = false;
      modalSaveButton.innerHTML = 'Salvar Alterações';
      editModal.classList.add('hidden');
      if (error) return alert(`Erro ao atualizar: ${error.message}`);
      await fetchOrders();          // recarrega
      applyFiltersAndRender();      // reaplica filtros e volta pra pág. 1
    };
  }
  modalCancelButton?.addEventListener('click', () => editModal.classList.add('hidden'));

  resultsTableBody?.addEventListener('click', (e) => {
    const btn = e.target.closest('.edit-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const order = allServiceOrders.find(o => String(o.id) === String(id));
    if (order) openEditModal(order);
  });

  /* ---------- renderização ---------- */
  function renderResults(orders) {
    if (!resultsTableBody || !noResultsMessage) return;

    resultsTableBody.innerHTML = '';
    if (!orders.length) {
      noResultsMessage.textContent = 'Nenhuma ordem de serviço encontrada.';
      noResultsMessage.classList.remove('hidden');
      return;
    }
    noResultsMessage.classList.add('hidden');

    orders.forEach(order => {
      const tr = document.createElement('tr');
      const statusColor = getStatusColor(order.status);
      const entrada = order.data_entrada
        ? new Date(order.data_entrada).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        : '—';

      tr.innerHTML = `
        <td>${order.numero_ordem ?? '—'}</td>
        <td>${entrada}</td>
        <td><span class="status-badge ${statusColor}">${order.status ?? '—'}</span></td>
        <td>${order.cliente ?? '—'}</td>
        <td>${order.marca_aparelho ?? '—'}</td>
        <td>${order.modelo_aparelho ?? '—'}</td>
        <td>
          <button data-id="${order.id}" class="edit-btn text-blue-600 hover:text-blue-800" title="Editar Status">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      `;
      resultsTableBody.appendChild(tr);
    });
  }

  /* ---------- paginação ---------- */
  const totalPages = () => Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const clampPage  = (n) => Math.min(Math.max(n, 1), totalPages());

  function renderPagination() {
    if (!pagination) return;
    pagination.innerHTML = '';
    if (!filteredOrders.length) return;

    const tp = totalPages();
    currentPage = clampPage(currentPage);
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end   = Math.min(currentPage * PAGE_SIZE, filteredOrders.length);

    // resumo
    const summary = document.createElement('div');
    summary.className = 'text-sm text-gray-600';
    summary.textContent = `Mostrando ${start}–${end} de ${filteredOrders.length}`;

    // controles
    const controls = document.createElement('div');
    controls.className = 'flex items-center gap-2';

    const btn = (label, disabled, onClick, isActive=false) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.className =
        `px-3 py-1 rounded border text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'} ` +
        (isActive ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-300');
      b.disabled = disabled;
      if (!disabled) b.addEventListener('click', onClick);
      return b;
    };

    // Prev
    controls.appendChild(btn('‹', currentPage === 1, () => { currentPage--; renderPage(); }));

    // páginas (janela de 5)
    const startPage = Math.max(1, currentPage - 2);
    const endPage   = Math.min(tp, currentPage + 2);
    for (let p = startPage; p <= endPage; p++) {
      controls.appendChild(btn(String(p), false, () => { currentPage = p; renderPage(); }, p === currentPage));
    }

    // Next
    controls.appendChild(btn('›', currentPage === tp, () => { currentPage++; renderPage(); }));

    pagination.appendChild(summary);
    pagination.appendChild(controls);
  }

  function renderPage() {
    const start = (clampPage(currentPage) - 1) * PAGE_SIZE;
    const pageItems = filteredOrders.slice(start, start + PAGE_SIZE);
    renderResults(pageItems);
    renderPagination();
  }

  /* ---------- filtros ---------- */
  function getFilteredOrders() {
    const brandText = norm(fBrandText?.value);
    const model     = norm(fModel?.value);
    const defect    = norm(fDefect?.value);
    const general   = norm(fGeneral?.value);
    const osNumber  = norm(fOs?.value);
    const client    = norm(fClient?.value);
    const phone     = norm(fPhone?.value);
    const status    = norm(fStatus?.value);
    const brandList = norm(fBrandList?.value);

    const fromStr   = (fDateFrom?.value || '').trim();
    const toStr     = (fDateTo  ?.value || '').trim();
    const fromDate  = fromStr ? new Date(fromStr) : null;
    const toDate    = toStr   ? new Date(toStr)   : null;

    return allServiceOrders.filter(order => {
      const oBrand   = norm(order.marca_aparelho);
      const oModel   = norm(order.modelo_aparelho);
      const oDefect  = norm(order.defeito_reclamado);
      const oOs      = norm(order.numero_ordem);
      const oClient  = norm(order.cliente);
      const oPhone   = norm(order.telefone);
      const oStatus  = norm(order.status);

      const okBrandText = brandText ? oBrand.includes(brandText) : true;
      const okModel     = model     ? oModel.includes(model)     : true;
      const okDefect    = defect    ? oDefect.includes(defect)   : true;
      const okGeneral   = general   ? (oOs.includes(general) || oClient.includes(general)) : true;
      const okOs        = osNumber  ? oOs.includes(osNumber)     : true;
      const okClient    = client    ? oClient.includes(client)   : true;
      const okPhone     = phone     ? oPhone.includes(phone)     : true;

      const okStatus    = status    ? oStatus === status         : true;
      const okBrandList = brandList ? oBrand  === brandList      : true;

      // datas
      let okDates = true;
      if (fromDate || toDate) {
        if (!order.data_entrada) okDates = false;
        else {
          const d = new Date(order.data_entrada);
          d.setHours(0,0,0,0);
          if (fromDate) {
            const f = new Date(fromDate); f.setHours(0,0,0,0);
            if (d < f) okDates = false;
          }
          if (toDate) {
            const t = new Date(toDate); t.setHours(0,0,0,0);
            if (d > t) okDates = false;
          }
        }
      }

      return okBrandText && okModel && okDefect && okGeneral &&
             okOs && okClient && okPhone && okStatus && okBrandList && okDates;
    });
  }

  function applyFiltersAndRender() {
    filteredOrders = getFilteredOrders();
    currentPage = 1;
    renderPage();
  }

  // Só filtra ao clicar em "Buscar" (submit)
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    applyFiltersAndRender();
  });
  btnSearch?.addEventListener('click', (e) => {
    e.preventDefault();
    form?.dispatchEvent(new Event('submit', { cancelable: true }));
  });

  /* ---------- carga inicial ---------- */
  async function fetchOrders() {
    if (noResultsMessage) {
      noResultsMessage.textContent = 'Buscando dados...';
      noResultsMessage.classList.remove('hidden');
    }
    const { data, error } = await supabase
      .from('ordens_de_servico')
      .select('*')
      .order('data_entrada', { ascending: false });

    if (error) {
      console.error(error);
      if (noResultsMessage) noResultsMessage.textContent = `Erro ao buscar dados: ${error.message}`;
      return;
    }

    allServiceOrders = data || [];
    // sem filtros inicialmente
    filteredOrders = [...allServiceOrders];
    currentPage = 1;
    renderPage();
  }

  fetchOrders();
});
