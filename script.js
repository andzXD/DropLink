const state = {
  selectedFiles: [],
  activeTransfer: null,
};

const deviceList = document.getElementById('deviceList');
const fileInput = document.getElementById('fileInput');
const selectedFiles = document.getElementById('selectedFiles');
const transferStatus = document.getElementById('transferStatus');
const transferBar = document.getElementById('transferBar');
const receivedFiles = document.getElementById('receivedFiles');

const baseUrl = window.location.origin;

async function loadDevices() {
  try {
    const response = await fetch(`${baseUrl}/api/devices`);
    const payload = await response.json();
    const devices = payload.devices || [];
    deviceList.innerHTML = devices
      .map(
        (device) => `
      <div class="device">
        <div>
          <strong>${device.name}</strong><br />
          <small>${device.connected ? 'Conectado' : 'Sem conexão'}</small>
        </div>
        <span class="dot" style="opacity:${device.connected ? 1 : 0.35}"></span>
      </div>
    `
      )
      .join('');
  } catch (error) {
    deviceList.innerHTML =
      '<div class="device"><div><strong>PC não encontrado</strong><br /><small>Verifique a mesma rede Wi‑Fi.</small></div><span class="dot" style="opacity:0.35"></span></div>';
  }
}

async function loadReceivedFiles() {
  try {
    const response = await fetch(`${baseUrl}/api/files`);
    const payload = await response.json();
    const files = payload.files || [];
    if (files.length === 0) {
      receivedFiles.textContent = 'Nenhum arquivo recebido ainda.';
      return;
    }

    receivedFiles.innerHTML = files
      .map(
        (file) => `
      <div>
        <a href="${baseUrl}/api/download/${encodeURIComponent(
          file.name
        )}" target="_blank" style="color:#e5e7eb">${file.name}</a>
        <span style="color:#9ca3af"> (${formatBytes(file.size)})</span>
      </div>
    `
      )
      .join('');
  } catch (error) {
    receivedFiles.textContent = 'Não foi possível listar os arquivos recebidos.';
  }
}

fileInput.addEventListener('change', async (event) => {
  state.selectedFiles = Array.from(event.target.files || []);
  selectedFiles.textContent = state.selectedFiles.length
    ? state.selectedFiles.map((f) => f.name).join(', ')
    : 'Nenhum arquivo selecionado';

  if (state.selectedFiles.length) {
    const total = state.selectedFiles.reduce((sum, file) => sum + file.size, 0);
    transferStatus.textContent = `${state.selectedFiles.length} arquivo(s) • ${formatBytes(total)}`;
    await uploadFiles(state.selectedFiles);
  }
});

async function uploadFiles(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('file', file, file.name));
  transferStatus.textContent = 'Enviando...';
  transferBar.style.width = '0%';

  try {
    const response = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || 'Falha ao enviar arquivo');
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 12;
      transferBar.style.width = `${Math.min(progress, 100)}%`;
      if (progress >= 100) {
        clearInterval(interval);
        transferStatus.textContent = 'Transferência concluída';
      }
    }, 120);

    setTimeout(() => {
      loadReceivedFiles();
    }, 400);
  } catch (error) {
    transferStatus.textContent = `Erro: ${error.message}`;
  }
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  loadDevices();
  loadReceivedFiles();
});
