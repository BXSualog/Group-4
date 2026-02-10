// ===================================
// LOGIN FUNCTIONALITY
// ===================================

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const regPasswordInput = document.getElementById("reg-password");
  const rememberMe = document.getElementById("rememberMe");

  // Toggle Buttons
  const togglePassword = document.getElementById("togglePassword");
  const toggleRegPassword = document.getElementById("toggleRegPassword");
  const showRegisterLink = document.getElementById("showRegister");
  const showLoginLink = document.getElementById("showLogin");

  // Restore remembered email
  const rememberedEmail = localStorage.getItem("pm_remember_email");
  if (rememberedEmail) {
    emailInput.value = rememberedEmail;
    rememberMe.checked = true;
  }

  // Handle Login form submission
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin();
  });

  // Handle Register form submission
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleRegister();
  });

  // Toggle Password Visibility (Login)
  togglePassword.addEventListener("click", () => {
    togglePasswordVisibility(passwordInput, togglePassword);
  });

  // Toggle Password Visibility (Register)
  if (toggleRegPassword) {
    toggleRegPassword.addEventListener("click", () => {
      togglePasswordVisibility(regPasswordInput, toggleRegPassword);
    });
  }

  // Show Register Form
  showRegisterLink.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    // Update title
    document.title = "Register - JuanTreePH";
    document.querySelector(".login-header h1").textContent = "Create Account";
  });

  // Show Login Form
  showLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    // Update title
    document.title = "Login - JuanTreePH";
    document.querySelector(".login-header h1").textContent = "JuanTreePH";
  });

  // Focus email input on load
  emailInput.focus();
});

function handleLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("rememberMe");

  // Basic validation
  if (!email || !password) {
    showError("Please fill in all fields");
    return;
  }

  // Validate email format
  if (!isValidEmail(email)) {
    showError("Please enter a valid email address");
    return;
  }

  // Show loading state
  showLoading();

  // NUCLEAR: Clear session before login to prevent stale data glitches
  localStorage.removeItem("pm_user_email");
  localStorage.removeItem("pm_user_role");

  const payloadEmail = email.toLowerCase();

  fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: payloadEmail, password })
  })
    .then(response => response.json())
    .then(data => {
      hideLoading();
      if (data.error) {
        showError(data.error);
      } else {
        // Store user email, token and role
        localStorage.setItem("pm_user_email", email);
        localStorage.setItem("pm_token", data.token);
        localStorage.setItem("pm_user_role", data.role || 'user');
        if (data.username) localStorage.setItem("pm_user_name", data.username);
        if (data.avatar) localStorage.setItem("pm_user_avatar", data.avatar);

        if (rememberMe && rememberMe.checked) {
          localStorage.setItem("pm_remember_email", email);
        } else {
          localStorage.removeItem("pm_remember_email");
        }

        // Success - redirect based on role
        const lowerEmail = email.toLowerCase();
        const role = data.role || 'user';

        console.log(`Login successful for ${lowerEmail}. Role reported: ${role}`);

        if (role === 'admin') {
          console.log("AUTHORIZED ADMIN: Redirecting to Admin Panel...");
          window.location.href = "admin.html";
        } else {
          console.log("User detected: Redirecting to Dashboard...");
          window.location.href = "dashboard.html";
        }
      }
    })
    .catch(error => {
      hideLoading();
      showError("Server error. Please try again later.");
      console.error('Error:', error);
    });
}

function isValidEmail(email) {
  // Simple email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showLoading() {
  const loginBtn = document.querySelector(".login-btn");
  loginBtn.textContent = "Logging in...";
  loginBtn.disabled = true;
  loginBtn.style.opacity = "0.7";
  loginBtn.style.cursor = "not-allowed";
}

function hideLoading() {
  const loginBtn = document.querySelector(".login-btn");
  loginBtn.textContent = "Login";
  loginBtn.disabled = false;
  loginBtn.style.opacity = "1";
  loginBtn.style.cursor = "pointer";
}

// ===================================
// DEMO CREDENTIALS HELPER
// ===================================

window.addEventListener("load", () => {
  // Demo instructions
  console.log("Demo Login:");
  console.log("Email: any valid email (e.g., demo@example.com)");
  console.log("Password: any password with 6+ characters");
});

function handleRegister() {
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  // Basic validation
  if (!email || !password || !confirmPassword) {
    showError("Please fill in all fields");
    return;
  }

  // Validate email format
  if (!isValidEmail(email)) {
    showError("Please enter a valid Gmail address");
    return;
  }

  // Password matching
  if (password !== confirmPassword) {
    showError("Passwords do not match");
    return;
  }

  // Password length
  if (password.length < 6) {
    showError("Password must be at least 6 characters");
    return;
  }

  // Show loading state
  const registerBtn = document.querySelector("#registerForm .login-btn");
  const originalText = registerBtn.textContent;
  registerBtn.textContent = "Creating Account...";
  registerBtn.disabled = true;

  // Debug logging
  console.log('[REGISTER] API_BASE_URL:', window.API_BASE_URL);
  console.log('[REGISTER] Payload:', { email, password: '***' });

  const apiUrl = window.API_BASE_URL || 'http://localhost:3001';

  fetch(`${apiUrl}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
    .then(response => {
      console.log('[REGISTER] Response status:', response.status);
      return response.json();
    })
    .then(data => {
      registerBtn.textContent = originalText;
      registerBtn.disabled = false;

      console.log('[REGISTER] Response data:', data);

      if (data.error) {
        showError(data.error);
      } else {
        // Store email and token for auto-login
        localStorage.setItem("pm_user_email", email);
        localStorage.setItem("pm_token", data.token);

        // Switch to login view
        document.getElementById("showLogin").click();
        // Fill login email
        document.getElementById("email").value = email;
        // Show success message
        showSuccess("Account created successfully! Please login.");
      }
    })
    .catch(error => {
      registerBtn.textContent = originalText;
      registerBtn.disabled = false;
      console.error('[REGISTER] Error:', error);
      showError("Server error. Please try again later.");
    });
}

function togglePasswordVisibility(inputElement, toggleButton) {
  const isHidden = inputElement.type === "password";
  inputElement.type = isHidden ? "text" : "password";
  toggleButton.textContent = isHidden ? "Hide" : "Show";
  toggleButton.setAttribute(
    "aria-label",
    isHidden ? "Hide password" : "Show password"
  );
}

function showSuccess(message) {
  showError(message, true);
}

function showError(message, isSuccess = false) {
  // Remove existing error if any
  const existingError = document.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }

  // Determine active form
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const activeForm = loginForm.classList.contains("hidden") ? registerForm : loginForm;

  // Create message element
  const msgDiv = document.createElement("div");
  msgDiv.className = "error-message";
  msgDiv.textContent = message;

  const bgColor = isSuccess ? "#E8F5E9" : "#FFEBEE";
  const textColor = isSuccess ? "#2E7D32" : "#C62828";
  const borderColor = isSuccess ? "#2E7D32" : "#C62828";

  msgDiv.style.cssText = `
        background: ${bgColor};
        color: ${textColor};
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 14px;
        border-left: 4px solid ${borderColor};
        animation: slideDown 0.3s ease;
    `;

  // Add keyframe animation if not exists
  if (!document.querySelector("#errorAnimation")) {
    const style = document.createElement("style");
    style.id = "errorAnimation";
    style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
    document.head.appendChild(style);
  }

  // Insert message before active form
  activeForm.parentNode.insertBefore(msgDiv, activeForm);

  // Remove message after 5 seconds
  setTimeout(() => {
    if (msgDiv && msgDiv.parentNode) {
      msgDiv.style.animation = "slideDown 0.3s ease reverse";
      setTimeout(() => msgDiv.remove(), 300);
    }
  }, 5000);
}
