document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  
  const linkToRegister = document.getElementById('link-to-register');
  const linkToLogin = document.getElementById('link-to-login');

  // Toggle views
  linkToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
  });

  linkToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
  });

  // Forms
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  const regUsernameInput = document.getElementById("reg-username");
  const regPasswordInput = document.getElementById("reg-password");
  const regErrorMsg = document.getElementById("reg-error-msg");
  const regSuccessMsg = document.getElementById("reg-success-msg");

  const logUsernameInput = document.getElementById("log-username");
  const logPasswordInput = document.getElementById("log-password");
  const logErrorMsg = document.getElementById("log-error-msg");

  // Registration Flow
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = regUsernameInput.value.trim();
    const password = regPasswordInput.value;
    
    if (username.length < 2) {
      regErrorMsg.textContent = "El nombre debe tener al menos 2 caracteres";
      return;
    }

    try {
      const respuesta = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const datos = await respuesta.json();
      
      if (!respuesta.ok) {
        regErrorMsg.textContent = data.error || "Error al registrar";
        regSuccessMsg.textContent = "";
      } else {
        regErrorMsg.textContent = "";
        regSuccessMsg.textContent = "Cuenta creada. Redirigiendo...";
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("username", data.user.username);
        setTimeout(() => {
           window.location.href = "/pantalla.html";
        }, 1000);
      }
    } catch (err) {
      regErrorMsg.textContent = "Error de red";
    }
  });

  // Login Flow
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = logUsernameInput.value.trim();
    const password = logPasswordInput.value;
    
    try {
      const respuesta = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const datos = await respuesta.json();
      
      if (!respuesta.ok) {
        logErrorMsg.textContent = data.error || "Error al iniciar sesión";
      } else {
        logErrorMsg.textContent = "";
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("username", data.user.username);
        window.location.href = "/pantalla.html";
      }
    } catch (err) {
      logErrorMsg.textContent = "Error de red";
    }
  });
});
