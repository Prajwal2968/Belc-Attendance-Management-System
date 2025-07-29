document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('message');

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const { token, role } = await response.json();
            localStorage.setItem('token', token);
            if (role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            message.textContent = 'Invalid credentials';
        }
    } catch (error) {
        message.textContent = 'Error logging in.';
    }
});

document.getElementById('forgot-password').addEventListener('click', () => {
    alert("Please contact your administrator to reset your password.");
});