// products.js funcional com filtro
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'xxxxxxxxxxxxxxxxxxx',
  'xxxxxxxxxxxxxxxxxxx'
);

function checkAuth() {
  if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
  } else {
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.classList.remove('hidden');
  }
}
checkAuth();

function handleMobileMenu() {
  const hamburgerButton = document.querySelector('.hamburger-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.overlay');

  if (hamburgerButton && sidebar && overlay) {
    hamburgerButton.addEventListener('click', () => {
      sidebar.classList.add('open');
      overlay.classList.add('active');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const productForm = document.getElementById('product-form');
  const productsTableBody = document.getElementById('products-table-body');
  const noProductsMessage = document.getElementById('no-products-message');
  const formTitle = document.getElementById('form-title');
  const submitButton = document.getElementById('submit-product-button');
  const cancelEditButton = document.getElementById('cancel-edit-button');
  const productIdInput = document.getElementById('product-id');
  const logoutButton = document.getElementById('logout-button');
  const tipoComponenteField = document.getElementById('componente-fields');
  const tipoRadioButtons = document.querySelectorAll('input[name="product-type"]');

  const filterName = document.getElementById('filter-name');
  const filterSku = document.getElementById('filter-sku');
  const filterType = document.getElementById('filter-type');
  const filterSupplier = document.getElementById('filter-supplier');

  tipoRadioButtons.forEach(radio => {
    radio.addEventListener('change', () => {
      tipoComponenteField.classList.toggle('hidden', radio.value !== 'componente');
    });
  });

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('isLoggedIn');
      window.location.href = 'login.html';
    });
  }

  let products = [];

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('estoque').select('*').order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar produtos:', error.message);
      return;
    }

    products = data;
    renderProducts();
  };

  const renderProducts = () => {
    productsTableBody.innerHTML = '';

    const nome = filterName.value.trim().toLowerCase();
    const sku = filterSku.value.trim().toLowerCase();
    const tipo = filterType.value;
    const fornecedor = filterSupplier.value.trim().toLowerCase();

    const filtrados = products.filter(p => {
      return (!nome || p.nome.toLowerCase().includes(nome)) &&
        (!sku || (p.sku || '').toLowerCase().includes(sku)) &&
        (!tipo || p.tipo === tipo) &&
        (!fornecedor || (p.fornecedor || '').toLowerCase().includes(fornecedor));
    });

    if (filtrados.length === 0) {
      noProductsMessage.classList.remove('hidden');
      return;
    }

    noProductsMessage.classList.add('hidden');

    filtrados.forEach(product => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${product.nome} ${product.tipo === 'componente' ? `<span class="text-xs text-gray-500">(${product.tipo_componente})</span>` : ''}</td>
        <td>${product.sku || 'N/A'}</td>
        <td>${product.quantidade}</td>
        <td>R$ ${parseFloat(product.preco_venda || 0).toFixed(2)}</td>
        <td class="space-x-2">
          <button data-id="${product.id}" class="edit-btn text-blue-600 hover:text-blue-800"><i class="fas fa-edit"></i></button>
          <button data-id="${product.id}" class="delete-btn text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>
        </td>
      `;
      productsTableBody.appendChild(row);
    });
  };

  const resetForm = () => {
    productForm.reset();
    productIdInput.value = '';
    formTitle.textContent = 'Adicionar Novo Produto';
    submitButton.innerHTML = '<i class="fas fa-plus mr-2"></i> Adicionar Produto';
    cancelEditButton.classList.add('hidden');
    tipoComponenteField.classList.add('hidden');
  };

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipo = document.querySelector('input[name="product-type"]:checked').value;
    const productData = {
      tipo,
      nome: document.getElementById('product-name').value,
      sku: document.getElementById('product-sku').value,
      quantidade: parseInt(document.getElementById('product-quantity').value),
      preco_custo: parseFloat(document.getElementById('product-cost-price').value),
      preco_venda: parseFloat(document.getElementById('product-sale-price').value),
      fornecedor: document.getElementById('product-supplier').value,
      localizacao: document.getElementById('product-location').value,
      tipo_componente: tipo === 'componente' ? document.getElementById('tipo-componente').value : null
    };

    const editing = !!productIdInput.value;
    let result;

    if (editing) {
      result = await supabase.from('estoque').update(productData).eq('id', productIdInput.value);
    } else {
      result = await supabase.from('estoque').insert([productData]);
    }

    if (result.error) {
      alert(`Erro ao salvar produto: ${result.error.message}`);
      return;
    }

    alert(editing ? 'Produto atualizado com sucesso!' : 'Produto adicionado com sucesso!');
    await fetchProducts();
    resetForm();
  });

  productsTableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.classList.contains('delete-btn')) {
      if (confirm('Tem certeza que deseja excluir este produto?')) {
        const { error } = await supabase.from('estoque').delete().eq('id', id);
        if (error) alert('Erro ao excluir produto: ' + error.message);
        else await fetchProducts();
      }
    }

    if (btn.classList.contains('edit-btn')) {
      const product = products.find(p => p.id == id);
      if (product) {
        productIdInput.value = product.id;
        document.getElementById('product-name').value = product.nome;
        document.getElementById('product-sku').value = product.sku;
        document.getElementById('product-quantity').value = product.quantidade;
        document.getElementById('product-cost-price').value = product.preco_custo;
        document.getElementById('product-sale-price').value = product.preco_venda;
        document.getElementById('product-supplier').value = product.fornecedor;
        document.getElementById('product-location').value = product.localizacao;
        document.querySelector(`input[name="product-type"][value="${product.tipo}"]`).checked = true;
        if (product.tipo === 'componente') {
          document.getElementById('tipo-componente').value = product.tipo_componente;
          tipoComponenteField.classList.remove('hidden');
        }
        formTitle.textContent = 'Editar Produto';
        submitButton.innerHTML = '<i class="fas fa-save mr-2"></i> Salvar Alterações';
        cancelEditButton.classList.remove('hidden');
        window.scrollTo(0, 0);
      }
    }
  });

  cancelEditButton.addEventListener('click', resetForm);
  [filterName, filterSku, filterType, filterSupplier].forEach(el => el.addEventListener('input', renderProducts));

  await fetchProducts();
  handleMobileMenu();
});
