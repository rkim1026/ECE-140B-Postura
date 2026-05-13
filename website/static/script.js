// --- Tab Switching Logic ---
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        // Remove active class from all tabs and panels
        document.querySelectorAll('.tab, .panel').forEach(el => el.classList.remove('active'));
        // Add active class to clicked tab and corresponding panel
        tab.classList.add('active');
        document.getElementById('panel-' + target).classList.add('active');
    });
});

// --- Password Visibility Toggle ---
function togglePw(id, btn) {
    const input = document.getElementById(id);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    // Update the eye icon (optional: you can swap the SVG path here)
    btn.style.opacity = isPassword ? '1' : '0.5';
}

// --- Registration Logic ---
document.getElementById('btn-register').addEventListener('click', async () => {
    const fullName = document.getElementById('signup-fullname').value;
    const username = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!fullName || !username || !password) {
        alert("All fields are required.");
        return;
    }

    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, username: username, password: password })
    });

    if (response.ok) {
        alert("Account successfully created! Redirecting to Sign In...");
        // Automatically switch back to the Sign In tab
        document.getElementById('tab-signin').click();
    } else {
        const data = await response.json();
        alert(data.detail || "Registration failed. Try again.");
    }
});

// --- Login Logic ---
document.getElementById('btn-login').addEventListener('click', async () => {
    const username = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;

    if (!username || !password) {
        alert("Please enter both email and password.");
        return;
    }

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    });

    if (response.ok) {
        // Success: the cookie is set by the backend, move to dashboard
        window.location.href = "/dashboard";
    } else {
        const data = await response.json();
        // Display the specific error from the backend (e.g., "Incorrect credentials")
        alert(data.detail || "Login failed.");
    }
});