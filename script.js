const PWA_VERSION = '2.0.0';
const CACHE_NAME = `hacienda-hansen-v${PWA_VERSION}`;
const LOGO_URL = 'https://i.ibb.co/mCDdH6wt/logo.jpg';

// Generar iconos de diferentes tamaños
async function generateIcon(size) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      
      // Crear fondo circular
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2, 0, 2 * Math.PI);
      ctx.fillStyle = '#2E8B57';
      ctx.fill();
      
      // Dibujar imagen centrada
      const scale = Math.min(size / img.width, size / img.height) * 0.8;
      const x = (size - img.width * scale) / 2;
      const y = (size - img.height * scale) / 2;
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/2 * 0.8, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      ctx.restore();
      
      canvas.toBlob(resolve, 'image/png');
    };
    
    img.src = LOGO_URL;
  });
}

// Configurar iconos
async function setupIcons() {
  try {
    const sizes = [16, 32, 57, 60, 72, 76, 114, 120, 144, 152, 180, 192, 512];
    const iconPromises = sizes.map(size => generateIcon(size));
    const icons = await Promise.all(iconPromises);
    
    const iconUrls = {};
    icons.forEach((blob, index) => {
      const size = sizes[index];
      iconUrls[size] = URL.createObjectURL(blob);
    });

    // Configurar favicon
    document.getElementById('favicon').href = iconUrls[32];
    
    // Configurar Apple Touch Icons
    document.getElementById('apple-touch-icon').href = iconUrls[180];
    document.getElementById('apple-touch-icon-57').href = iconUrls[57];
    document.getElementById('apple-touch-icon-60').href = iconUrls[60];
    document.getElementById('apple-touch-icon-72').href = iconUrls[72];
    document.getElementById('apple-touch-icon-76').href = iconUrls[76];
    document.getElementById('apple-touch-icon-114').href = iconUrls[114];
    document.getElementById('apple-touch-icon-120').href = iconUrls[120];
    document.getElementById('apple-touch-icon-144').href = iconUrls[144];
    document.getElementById('apple-touch-icon-152').href = iconUrls[152];
    document.getElementById('apple-touch-icon-180').href = iconUrls[180];

    return iconUrls;
  } catch (error) {
    console.error('Error generando iconos:', error);
    return {};
  }
}

// Configurar manifest
async function setupManifest(iconUrls) {
  const manifestData = {
    "name": "Registro de Horas - Hacienda Hansen",
    "short_name": "Hacienda Hansen",
    "description": "Sistema de registro de horas de empleados para Hacienda Hansen",
    "start_url": "/index.html",
    "display": "standalone",
    "background_color": "#667eea",
    "theme_color": "#2E8B57",
    "icons": [
      {
        "src": iconUrls[192] || '/logo-192.png',
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "any maskable"
      },
      {
        "src": iconUrls[512] || '/logo-512.png',
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
      }
    ],
    "lang": "es-ES",
    "scope": "/"
  };

  const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
  const manifestURL = URL.createObjectURL(manifestBlob);
  document.querySelector('link[rel="manifest"]').setAttribute('href', manifestURL);
}

// Registrar Service Worker
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('service-worker.js');
      console.log('Service Worker registrado:', registration);
      
      if ('sync' in navigator.serviceWorker.registration) {
        registration.sync.register('sync-hours');
      }
      return registration;
    } catch (error) {
      console.error('Error registrando Service Worker:', error);
    }
  }
}

// Configuración de la aplicación
const BIN_ID = "6859f6548a456b7966b466c6";
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const MASTER_KEY = "$2a$10$CJN48O6SvqnObn0Z0zy0j.Vronnf/8J5ntOTNT5f4ZMhCsRguKcNe";

const perfilContainer = document.getElementById("perfil-container");
const formHoras = document.getElementById("form-horas");
const perfilActual = document.getElementById("perfil-actual");
const inputNombre = document.getElementById("input-nombre");
const errorActualizar = document.getElementById("error-actualizar");
const btnActualizarDatos = document.getElementById("btn-actualizar-datos");
const overlay = document.getElementById("overlay");
const confirmacion = document.getElementById("confirmacion");
const textoConfirmacion = document.getElementById("texto-confirmacion");
const btnConfirmar = document.getElementById("btn-confirmar");
const btnCancelar = document.getElementById("btn-cancelar");
const successMessage = document.getElementById("success-message");
const tablaSemanal = document.getElementById("tabla-semanal");
const tablaCuerpo = document.getElementById("tabla-cuerpo");
const offlineIndicator = document.getElementById("offline-indicator");

let registroPendiente = null;

// Manejo de conexión
function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  offlineIndicator.style.display = 'block';
  offlineIndicator.classList.toggle('online', isOnline);
  offlineIndicator.innerHTML = isOnline
    ? '<i class="fas fa-wifi"></i> Conectado'
    : '<i class="fas fa-wifi"></i> Sin conexión';
  if (isOnline) {
    sincronizarAccionesPendientes();
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
window.addEventListener('load', updateOnlineStatus);

// Mostrar perfil guardado
function mostrarPerfilGuardado() {
  const perfilGuardado = localStorage.getItem("nombreTrabajador");
  if (perfilGuardado) {
    perfilContainer.style.display = "none";
    formHoras.style.display = "block";
    perfilActual.textContent = perfilGuardado;
    errorActualizar.style.display = "none";
    tablaSemanal.style.display = "block";
    document.getElementById("horaIngreso").disabled = false;
    document.getElementById("horaSalida").disabled = false;
    formHoras.querySelector("button[type='submit']").disabled = false;

  } else {
    perfilContainer.style.display = "block";
    formHoras.style.display = "none";
    errorActualizar.style.display = "none";
    tablaSemanal.style.display = "none";
    document.getElementById("horaIngreso").disabled = true;
    document.getElementById("horaSalida").disabled = true;
    formHoras.querySelector("button[type='submit']").disabled = true;
  }
  successMessage.style.display = "none";
}

// Guardar perfil
function guardarPerfil() {
  const nombre = inputNombre.value.trim();
  if (!nombre) {
    showError("Por favor, ingresa un nombre válido");
    return;
  }
  localStorage.setItem("nombreTrabajador", nombre);
  mostrarPerfilGuardado();
  if (formHoras && formHoras instanceof HTMLFormElement) {
    formHoras.reset();
  } else {
    document.getElementById("horaIngreso").value = "";
    document.getElementById("horaSalida").value = "";
  }
}

// Mostrar error
function showError(message) {
  errorActualizar.querySelector('p').textContent = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
  errorActualizar.style.display = 'block';
  setTimeout(() => {
    errorActualizar.style.display = 'none';
  }, 3000);
}

// Calcular horas trabajadas
function calcularHoras(inicio, fin) {
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fin.split(":").map(Number);
  let totalHoras = (h2 + m2 / 60) - (h1 + m1 / 60);
  if (totalHoras < 0) {
    totalHoras += 24;
  }
  return totalHoras.toFixed(2);
}

// Formatear horas para mostrar en la tabla
function formatHours(hours) {
  if (hours === 0 || isNaN(hours)) return "-";
  const rounded = Math.round(hours * 10) / 10; // Redondea a un decimal
  return rounded.toFixed(1).replace(/\.0$/, '') + "hs"; // Elimina .0 si es entero
}

// Obtener fechas de la semana actual
function getWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const week = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    week.push({
      date: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('es-ES', { weekday: 'long' }),
      formattedDate: date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')
    });
  }
  return week;
}

// Cargar tabla de horas
async function cargarTablaYActualizar(nombre = localStorage.getItem("nombreTrabajador")) {
  console.log("Cargando tabla para usuario:", nombre); // Depuración

  try {
    let registros = [];
    if (!navigator.onLine) {
      const cachedData = localStorage.getItem('cachedRegistros');
      if (cachedData) {
        registros = JSON.parse(cachedData);
      } else {
        tablaCuerpo.innerHTML = `
          <tr>
            <td colspan="3" style="color: #e74c3c; padding: 20px;">
              <i class="fas fa-exclamation-triangle"></i> No hay datos disponibles sin conexión
            </td>
          </tr>
        `;
        tablaSemanal.style.display = "block";
        return;
      }
    } else {
      const res = await fetch(`${API_URL}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      if (!res.ok) throw new Error(`Error al obtener datos: ${res.status} - ${res.statusText}`);
      const data = await res.json();
      registros = data.record || [];
      localStorage.setItem('cachedRegistros', JSON.stringify(registros));
    }

    // Filtrar solo el usuario actual desde localStorage
    const delUsuario = registros.filter(r => r.nombre === nombre);
    console.log("Registros filtrados para", nombre, ":", delUsuario); // Depuración
    const week = getWeekDates();
    let totalHorasAcumuladas = 0;

    tablaCuerpo.innerHTML = "";
    if (delUsuario.length === 0) {
      tablaCuerpo.innerHTML = `
        <tr>
          <td colspan="3" style="color: #e74c3c; padding: 20px;">
            <i class="fas fa-exclamation-triangle"></i> No hay registros para ${nombre}.
          </td>
        </tr>
      `;
    } else {
      week.forEach(({ date, day, formattedDate }) => {
        const registrosDelDia = delUsuario.filter(r => r.fecha === date);
        let totalHorasDia = 0;
        if (registrosDelDia.length > 0) {
          totalHorasDia = registrosDelDia.reduce((acc, curr) => acc + curr.totalHoras, 0);
          totalHorasAcumuladas += totalHorasDia;
        }

        tablaCuerpo.innerHTML += `
          <tr>
            <td class="day-name">${day.charAt(0).toUpperCase() + day.slice(1)}</td>
            <td class="date-cell">${formattedDate}</td>
            <td>${registrosDelDia.length > 0 ? `<span class="hours-badge">${formatHours(totalHorasDia)}</span>` : '<span class="no-hours">-</span>'}</td>
          </tr>
        `;
      });

      tablaCuerpo.innerHTML += `
        <tr class="total-row">
          <td colspan="2"><strong>Total Semanal</strong></td>
          <td><span class="hours-badge">${formatHours(totalHorasAcumuladas)}</span></td>
        </tr>
      `;
    }
    tablaSemanal.style.display = "block";
  } catch (error) {
    console.error("Error cargando la tabla:", error);
    tablaCuerpo.innerHTML = `
      <tr>
        <td colspan="3" style="color: #e74c3c; padding: 20px;">
          <i class="fas fa-exclamation-triangle"></i> Error cargando los datos
        </td>
      </tr>
    `;
    tablaSemanal.style.display = "block";
  }
}

// Sincronizar acciones pendientes
async function sincronizarAccionesPendientes() {
  if (!navigator.onLine) return;
  const pendingActions = JSON.parse(localStorage.getItem('pendingActions') || '[]');
  if (pendingActions.length === 0) return;

  try {
    const res = await fetch(`${API_URL}/latest`, {
      headers: { "X-Master-Key": MASTER_KEY }
    });
    if (!res.ok) throw new Error(`Error al obtener datos: ${res.status} - ${res.statusText}`);
    const data = await res.json();
    let actuales = data.record || [];

    for (const action of pendingActions) {
      if (action.action === 'save') {
        actuales.push(action.data);
      }
    }

    const putRes = await fetch(API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": MASTER_KEY
      },
      body: JSON.stringify(actuales)
    });

    if (!putRes.ok) throw new Error(`Error al sincronizar: ${putRes.status} - ${putRes.statusText}`);
    localStorage.setItem('cachedRegistros', JSON.stringify(actuales));
    localStorage.removeItem('pendingActions');
    if (localStorage.getItem("nombreTrabajador")) {
      cargarTablaYActualizar();
    }
  } catch (error) {
    console.error("Error sincronizando acciones:", error);
    showError("Error al sincronizar datos");
  }
}

// Manejar formulario de horas
formHoras.addEventListener("submit", function(e) {
  e.preventDefault();

  const nombre = localStorage.getItem("nombreTrabajador");
  if (!nombre) {
    showError("No se encontró perfil. Por favor ingresa tu nombre.");
    return;
  }

  const horaIngreso = document.getElementById("horaIngreso").value;
  const horaSalida = document.getElementById("horaSalida").value;

  if (!horaIngreso || !horaSalida) {
    showError("Por favor, completa todos los campos de hora");
    return;
  }

  const totalHoras = calcularHoras(horaIngreso, horaSalida);
  if (parseFloat(totalHoras) <= 0) {
    showError("La hora de salida debe ser posterior a la hora de ingreso");
    return;
  }

  registroPendiente = {
    nombre,
    fecha: new Date().toISOString().slice(0, 10),
    horaIngreso,
    horaSalida,
    totalHoras: parseFloat(totalHoras)
  };

  textoConfirmacion.innerHTML = `
    ¿Confirmar registro de horas?<br><br>
    <strong>📅 Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}<br>
    <strong>⏰ Ingreso:</strong> ${horaIngreso}<br>
    <strong>⏰ Salida:</strong> ${horaSalida}<br>
    <strong>🕐 Total:</strong> ${totalHoras} horas
  `;
  overlay.style.display = "block";
  confirmacion.style.display = "block";
  errorActualizar.style.display = "none";
});

// Confirmar registro
btnConfirmar.addEventListener("click", async () => {
  if (!registroPendiente) return;

  btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
  btnConfirmar.disabled = true;

  try {
    if (!navigator.onLine) {
      const pendingActions = JSON.parse(localStorage.getItem('pendingActions') || '[]');
      pendingActions.push({ action: 'save', data: registroPendiente });
      localStorage.setItem('pendingActions', JSON.stringify(pendingActions));

      const cachedData = JSON.parse(localStorage.getItem('cachedRegistros') || '[]');
      cachedData.push(registroPendiente);
      localStorage.setItem('cachedRegistros', JSON.stringify(cachedData));

      registroPendiente = null;
      confirmacion.style.display = "none";
      overlay.style.display = "none";
      if (formHoras && formHoras instanceof HTMLFormElement) {
        formHoras.reset();
      } else {
        document.getElementById("horaIngreso").value = "";
        document.getElementById("horaSalida").value = "";
      }
      successMessage.style.display = "block";
      setTimeout(() => {
        successMessage.style.display = "none";
      }, 3000);
      cargarTablaYActualizar();
    } else {
      const res = await fetch(`${API_URL}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      if (!res.ok) throw new Error(`Error en la solicitud: ${res.status} - ${res.statusText}`);
      const data = await res.json();
      let actuales = data.record || [];
      actuales.push(registroPendiente);

      const putRes = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": MASTER_KEY
        },
        body: JSON.stringify(actuales)
      });
      if (!putRes.ok) throw new Error(`Error al guardar: ${putRes.status} - ${putRes.statusText}`);
      localStorage.setItem('cachedRegistros', JSON.stringify(actuales));

      registroPendiente = null;
      confirmacion.style.display = "none";
      overlay.style.display = "none";
      if (formHoras && formHoras instanceof HTMLFormElement) {
        formHoras.reset();
      } else {
        document.getElementById("horaIngreso").value = "";
        document.getElementById("horaSalida").value = "";
      }
      successMessage.style.display = "block";
      setTimeout(() => {
        successMessage.style.display = "none";
      }, 3000);
      cargarTablaYActualizar();
    }
  } catch (error) {
    console.error("Error detallado:", error);
    showError("Error al enviar horas: " + error.message);
  } finally {
    btnConfirmar.innerHTML = '<i class="fas fa-check"></i> Confirmar';
    btnConfirmar.disabled = false;
  }
});

// Cancelar registro
btnCancelar.addEventListener("click", () => {
  registroPendiente = null;
  confirmacion.style.display = "none";
  overlay.style.display = "none";
  errorActualizar.style.display = "none";
});

// Actualizar datos (reset perfil)
btnActualizarDatos.addEventListener("click", () => {
  localStorage.removeItem("nombreTrabajador");
  mostrarPerfilGuardado();
  inputNombre.value = "";
  document.getElementById("horaIngreso").value = "";
  document.getElementById("horaSalida").value = "";
  document.getElementById("horaIngreso").disabled = true;
  document.getElementById("horaSalida").disabled = true;
  formHoras.querySelector("button[type='submit']").disabled = true;
  tablaSemanal.style.display = "none";
});

// Inicializar
async function init() {
  const iconUrls = await setupIcons();
  await setupManifest(iconUrls);
  await registerServiceWorker();
  mostrarPerfilGuardado();
}

init();