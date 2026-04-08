// =========================
// FLUJO DE LOGIN / REGISTRO
// =========================

// Espera a que el DOM exista para enlazar toda la interfaz.
document.addEventListener("DOMContentLoaded", () => {
  // Sección visual de login.
  const loginSection = document.getElementById('login-section');
  // Sección visual de registro.
  const registerSection = document.getElementById('register-section');
  
  // Enlace que lleva de login a registro.
  const linkToRegister = document.getElementById('link-to-register');
  // Enlace que lleva de registro a login.
  const linkToLogin = document.getElementById('link-to-login');

  // Cambia entre vista de inicio de sesión y registro.
  linkToRegister.addEventListener('click', (e) => {
    // Evita navegación de enlace.
    e.preventDefault();
    // Oculta login.
    loginSection.style.display = 'none';
    // Muestra registro.
    registerSection.style.display = 'block';
  });

  linkToLogin.addEventListener('click', (e) => {
    // Evita navegación de enlace.
    e.preventDefault();
    // Oculta registro.
    registerSection.style.display = 'none';
    // Muestra login.
    loginSection.style.display = 'block';
  });

  // Referencias de formularios y mensajes de error/éxito.
  // Formulario de login.
  const loginForm = document.getElementById('login-form');
  // Formulario de registro.
  const registerForm = document.getElementById('register-form');

  // Input de nombre en registro.
  const regUsernameInput = document.getElementById("reg-username");
  // Input de contraseña en registro.
  const regPasswordInput = document.getElementById("reg-password");
  // Contenedor de error en registro.
  const regErrorMsg = document.getElementById("reg-error-msg");
  // Contenedor de éxito en registro.
  const regSuccessMsg = document.getElementById("reg-success-msg");

  // Input de nombre en login.
  const logUsernameInput = document.getElementById("log-username");
  // Input de contraseña en login.
  const logPasswordInput = document.getElementById("log-password");
  // Contenedor de error en login.
  const logErrorMsg = document.getElementById("log-error-msg");

  // Flujo de registro: valida, llama a API y guarda sesión local.
  registerForm.addEventListener('submit', async (e) => {
    // Evita recarga del formulario.
    e.preventDefault();
    // Nombre saneado de espacios.
    const username = regUsernameInput.value.trim();
    // Contraseña en crudo (validación servidor).
    const password = regPasswordInput.value;
    
    // Validación mínima local.
    if (username.length < 2) {
      regErrorMsg.textContent = "El nombre debe tener al menos 2 caracteres";
      return;
    }

    try {
      const respuesta = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Payload de registro.
        body: JSON.stringify({ username, password })
      });
      // Respuesta parseada.
      const datos = await respuesta.json();
      
      // Manejo de error de backend.
      if (!respuesta.ok) {
        regErrorMsg.textContent = datos.error || "Error al registrar";
        regSuccessMsg.textContent = "";
      } else {
        // Limpia errores.
        regErrorMsg.textContent = "";
        // Mensaje visual de ok.
        regSuccessMsg.textContent = "Cuenta creada. Redirigiendo...";
        // Persistimos usuario en localStorage.
        localStorage.setItem("user", JSON.stringify(datos.user));
        // Persistimos username para sesión.
        localStorage.setItem("username", datos.user.username);
        // Redirección con pequeño delay.
        setTimeout(() => {
           window.location.href = "/pantalla.html";
        }, 1000);
      }
    } catch (err) {
      // Error de conectividad.
      regErrorMsg.textContent = "Error de red";
    }
  });

  // Flujo de login: autentica y redirige a pantalla principal.
  loginForm.addEventListener('submit', async (e) => {
    // Evita recarga del formulario.
    e.preventDefault();
    // Nombre saneado de espacios.
    const username = logUsernameInput.value.trim();
    // Contraseña en crudo (validación servidor).
    const password = logPasswordInput.value;
    
    try {
      // Petición de login.
      const respuesta = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Payload de login.
        body: JSON.stringify({ username, password })
      });
      // Respuesta parseada.
      const datos = await respuesta.json();
      
      // Manejo de error de backend.
      if (!respuesta.ok) {
        logErrorMsg.textContent = datos.error || "Error al iniciar sesión";
      } else {
        // Limpia mensaje de error.
        logErrorMsg.textContent = "";
        // Persistimos usuario en localStorage.
        localStorage.setItem("user", JSON.stringify(datos.user));
        // Persistimos username para sesión.
        localStorage.setItem("username", datos.user.username);
        // Redirección directa a pantalla principal.
        window.location.href = "/pantalla.html";
      }
    } catch (err) {
      // Error de conectividad.
      logErrorMsg.textContent = "Error de red";
    }
  });
});
