document.getElementById('resetForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const new_password = document.getElementById('new_password').value;
    const messageEl = document.getElementById('message');

    messageEl.textContent = '';
    messageEl.className = '';

    if (!username.endsWith('@gmail.com')) {
        messageEl.textContent = 'Username must be a valid @gmail.com address.';
        messageEl.classList.add('error');
        return;
    }

    if (new_password.length < 8) {
        messageEl.textContent = 'Password must be at least 8 characters long.';
        messageEl.classList.add('error');
        return;
    }

    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(new_password)) {
        messageEl.textContent = 'Password must contain at least one special character (e.g., !@#$%).';
        messageEl.classList.add('error');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                new_password
            })
        });

        const result = await response.json();

        if (response.ok) {
            messageEl.textContent = result.message;
            messageEl.classList.add('success');
            document.getElementById('resetForm').reset();
        } else {
            messageEl.textContent = result.message || 'An unknown error occurred.';
            messageEl.classList.add('error');
        }
    } catch (error) {
        messageEl.textContent = 'Could not connect to the server. Please try again later.';
        messageEl.classList.add('error');
    }
});