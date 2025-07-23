export function showToast(message, type = 'success') {
    // Exemplo simples (pode substituir por Toastify ou SweetAlert)
    alert(`${type.toUpperCase()}: ${message}`);
}

export function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

export function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

export function showLoading(button) {
    button.disabled = true;
    button.innerHTML = 'Carregando...';
}

export function hideLoading(button, originalText) {
    button.disabled = false;
    button.innerHTML = originalText;
}
