// --- Lógica de Proteção de Página ---
function checkAuth() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
    } else {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.remove('hidden');
        }
    }
}
checkAuth();

// --- Lógica do Menu Mobile ---
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

// --- Lógica da Página de Produtos com localStorage ---
document.addEventListener('DOMContentLoaded', () => {

    // Elementos do DOM
    const productForm = document.getElementById('product-form');
    const productsTableBody = document.getElementById('products-table-body');
    const noProductsMessage = document.getElementById('no-products-message');
    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('submit-product-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const productIdInput = document.getElementById('product-id');
    const logoutButton = document.getElementById('logout-button');

    // Função de Logout
    if(logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'login.html';
        });
    }
    
    // Carrega os produtos do localStorage
    let products = JSON.parse(localStorage.getItem('products')) || [];

    // Função para renderizar a tabela de produtos
    const renderProducts = () => {
        productsTableBody.innerHTML = '';

        if (products.length === 0) {
            noProductsMessage.classList.remove('hidden');
        } else {
            noProductsMessage.classList.add('hidden');
            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-medium text-gray-800">${product.name}</td>
                    <td>${product.sku || 'N/A'}</td>
                    <td>${product.quantity}</td>
                    <td>R$ ${parseFloat(product.salePrice || 0).toFixed(2)}</td>
                    <td class="space-x-4">
                        <button data-id="${product.id}" class="edit-btn text-blue-600 hover:text-blue-800"><i class="fas fa-edit"></i></button>
                        <button data-id="${product.id}" class="delete-btn text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                productsTableBody.appendChild(row);
            });
        }
    };

    // Função para salvar os produtos no localStorage
    const saveProducts = () => {
        localStorage.setItem('products', JSON.stringify(products));
    };

    // Função para limpar o formulário e resetar para o modo de adição
    const resetForm = () => {
        productForm.reset();
        productIdInput.value = '';
        formTitle.textContent = 'Adicionar Novo Produto';
        submitButton.innerHTML = '<i class="fas fa-plus mr-2"></i> Adicionar Produto';
        cancelEditButton.classList.add('hidden');
    };

    // Evento de submit do formulário (Adicionar ou Editar)
    productForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const productId = productIdInput.value;
        const productData = {
            name: document.getElementById('product-name').value,
            sku: document.getElementById('product-sku').value,
            quantity: parseInt(document.getElementById('product-quantity').value),
            costPrice: parseFloat(document.getElementById('product-cost-price').value),
            salePrice: parseFloat(document.getElementById('product-sale-price').value),
            supplier: document.getElementById('product-supplier').value,
            location: document.getElementById('product-location').value,
        };

        if (productId) {
            // Editando um produto existente
            const index = products.findIndex(p => p.id == productId);
            products[index] = { ...products[index], ...productData };
            alert('Produto atualizado com sucesso!');
        } else {
            // Adicionando um novo produto
            productData.id = Date.now(); // ID único
            products.unshift(productData);
            alert('Produto adicionado com sucesso!');
        }

        saveProducts();
        renderProducts();
        resetForm();
    });

    // Eventos na tabela (Editar e Deletar)
    productsTableBody.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const productId = target.dataset.id;

        if (target.classList.contains('delete-btn')) {
            if (confirm('Tem certeza que deseja excluir este produto?')) {
                products = products.filter(p => p.id != productId);
                saveProducts();
                renderProducts();
            }
        }

        if (target.classList.contains('edit-btn')) {
            const product = products.find(p => p.id == productId);
            if (product) {
                // Preenche o formulário com os dados do produto
                productIdInput.value = product.id;
                document.getElementById('product-name').value = product.name;
                document.getElementById('product-sku').value = product.sku;
                document.getElementById('product-quantity').value = product.quantity;
                document.getElementById('product-cost-price').value = product.costPrice;
                document.getElementById('product-sale-price').value = product.salePrice;
                document.getElementById('product-supplier').value = product.supplier;
                document.getElementById('product-location').value = product.location;

                // Altera o formulário para o modo de edição
                formTitle.textContent = 'Editar Produto';
                submitButton.innerHTML = '<i class="fas fa-save mr-2"></i> Salvar Alterações';
                cancelEditButton.classList.remove('hidden');
                window.scrollTo(0, 0); // Rola a página para o topo
            }
        }
    });
    
    // Evento para o botão de cancelar edição
    cancelEditButton.addEventListener('click', resetForm);

    // Renderização inicial e ativação do menu mobile
    renderProducts();
    handleMobileMenu();
});
