document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userForm').addEventListener('submit', addUser);
    document.getElementById('logoutBtn').addEventListener('click', logout);

    fetchUsers(); 
    displayEmployeesForAttendance();
    fetchReports();
    fetchPasswordResets();
    
    setupSidebarNavigation();
    setupAttendanceModal();
    setupEditUserModal();
    setupEditAttendanceModal();
});

async function displayEmployeesForAttendance() {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3000/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
    const users = await response.json();
    const listContainer = document.getElementById('employee-list');
    listContainer.innerHTML = '';

    users.forEach(user => {
        if (user.role === 'regular') {
            const userItem = document.createElement('div');
            userItem.className = 'employee-item';
            userItem.textContent = user.username;
            userItem.onclick = () => showEmployeeAttendanceModal(user.id, user.username);
            listContainer.appendChild(userItem);
        }
    });
}

async function showEmployeeAttendanceModal(userId, username) {
    const token = localStorage.getItem('token');
    const modal = document.getElementById('attendance-modal');
    const modalTitle = document.getElementById('modal-employee-name');
    const tableBody = document.getElementById('modal-attendance-table').getElementsByTagName('tbody')[0];
    
    modalTitle.textContent = `Attendance for ${username}`;
    tableBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    modal.style.display = 'block';
    
    const response = await fetch(`http://localhost:3000/admin/attendance/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const records = await response.json();
    tableBody.innerHTML = '';

    if (records.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3">No records found.</td></tr>';
        return;
    }

    records.forEach(rec => {
        let row = tableBody.insertRow();
        row.insertCell(0).textContent = new Date(rec.clock_in).toLocaleString();
        row.insertCell(1).textContent = rec.clock_out ? new Date(rec.clock_out).toLocaleString() : 'In Progress';
        
        let cell = row.insertCell(2);
        cell.className = 'action-buttons';
        let editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'btn-edit';
        editBtn.onclick = () => showEditAttendanceModal(rec, () => showEmployeeAttendanceModal(userId, username));
        cell.appendChild(editBtn);
    });
}

function setupAttendanceModal() {
    const modal = document.getElementById('attendance-modal');
    const closeBtn = document.getElementById('attendance-modal-close-btn');
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.addEventListener('click', (event) => { 
        if (event.target == modal) {
            modal.style.display = 'none';
        } 
    });
}

function showEditAttendanceModal(record, refreshCallback) {
    const modal = document.getElementById('edit-attendance-modal');
    document.getElementById('edit-attendance-id').value = record.id;
    
    const toLocalISOString = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const tzoffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d - tzoffset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    document.getElementById('edit-clock_in').value = toLocalISOString(record.clock_in);
    document.getElementById('edit-clock_out').value = toLocalISOString(record.clock_out);
    
    document.getElementById('editAttendanceForm').onsubmit = (event) => updateAttendanceRecord(event, refreshCallback);
    modal.style.display = 'block';
}

async function updateAttendanceRecord(event, refreshCallback) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    const id = document.getElementById('edit-attendance-id').value;
    const clock_in = document.getElementById('edit-clock_in').value;
    const clock_out = document.getElementById('edit-clock_out').value || null;
    
    await fetch(`http://localhost:3000/admin/attendance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ clock_in, clock_out })
    });
    
    document.getElementById('edit-attendance-modal').style.display = 'none';
    if (refreshCallback) {
        refreshCallback();
    }
}

function setupEditAttendanceModal() {
    const modal = document.getElementById('edit-attendance-modal');
    const closeBtn = document.getElementById('edit-attendance-modal-close-btn');
    closeBtn.onclick = () => { modal.style.display = 'none'; };
}

function showUpdateUserModal(user) {
    const modal = document.getElementById('edit-user-modal');
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-role').value = user.role;
    modal.style.display = 'block';
}

async function updateUser(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    const userId = document.getElementById('edit-user-id').value;
    const username = document.getElementById('edit-username').value;
    const role = document.getElementById('edit-role').value;
    
    const response = await fetch(`http://localhost:3000/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username, role })
    });
    
    if (response.ok) {
        document.getElementById('edit-user-modal').style.display = 'none';
        fetchUsers();
        displayEmployeesForAttendance();
    } else {
        alert('Failed to update user.');
    }
}

function setupEditUserModal() {
    const modal = document.getElementById('edit-user-modal');
    const closeBtn = document.getElementById('edit-user-modal-close-btn');
    const editForm = document.getElementById('editUserForm');
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    editForm.addEventListener('submit', updateUser);
    window.addEventListener('click', (event) => { 
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });
}

async function fetchUsers() {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3000/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
    const users = await response.json();
    const tableBody = document.getElementById('usersTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    users.forEach(user => {
        let row = tableBody.insertRow();
        row.insertCell(0).textContent = user.username;
        row.insertCell(1).textContent = user.role;
        
        let cell = row.insertCell(2);
        cell.className = 'action-buttons';
        
        let editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'btn-edit';
        editBtn.onclick = () => showUpdateUserModal(user);
        cell.appendChild(editBtn);
        
        let deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'btn-delete';
        deleteBtn.onclick = () => deleteUser(user.id);
        cell.appendChild(deleteBtn);
    });
}

async function addUser(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;

    await fetch('http://localhost:3000/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username, password, role })
    });

    fetchUsers();
    displayEmployeesForAttendance();
    document.getElementById('userForm').reset();
}

async function deleteUser(id) {
    const token = localStorage.getItem('token');
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        await fetch(`http://localhost:3000/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchUsers();
        displayEmployeesForAttendance();
    }
}

async function fetchReports() {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3000/admin/reports', { headers: { 'Authorization': `Bearer ${token}` } });
    const reports = await response.json();
    const tableBody = document.getElementById('reportsTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    if (reports.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No pending reports.</td></tr>';
        return;
    }

    reports.forEach(report => {
        let row = tableBody.insertRow();
        row.insertCell(0).textContent = report.username;
        row.insertCell(1).textContent = report.issue_type;
        row.insertCell(2).textContent = report.details || 'N/A';
        row.insertCell(3).textContent = new Date(report.reported_at).toLocaleString();
        
        let cell = row.insertCell(4);
        cell.className = 'action-buttons';
        let resolveBtn = document.createElement('button');
        resolveBtn.textContent = 'Resolve';
        resolveBtn.className = 'btn-resolve';
        resolveBtn.onclick = () => resolveReport(report.id);
        cell.appendChild(resolveBtn);
    });
}

async function resolveReport(reportId) {
    if (!confirm('Are you sure you want to mark this report as resolved?')) return;
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:3000/admin/reports/${reportId}`, { 
        method: 'PUT', 
        headers: { 'Authorization': `Bearer ${token}` } 
    });
    fetchReports();
}

async function fetchPasswordResets() {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3000/admin/password-resets', { headers: { 'Authorization': `Bearer ${token}` } });
    const resets = await response.json();
    const tableBody = document.getElementById('passwordResetsTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    if (resets.length === 0) { 
        tableBody.innerHTML = '<tr><td colspan="4">No pending password resets.</td></tr>';
        return;
    }

    resets.forEach(reset => {
        let row = tableBody.insertRow();
        row.insertCell(0).textContent = reset.username;
        row.insertCell(1).textContent = reset.new_password;
        row.insertCell(2).textContent = new Date(reset.requested_at).toLocaleString();
        
        let cell = row.insertCell(3);
        let approveBtn = document.createElement('button');
        approveBtn.textContent = 'Approve';
        approveBtn.className = 'btn-resolve';
        approveBtn.onclick = () => approvePasswordReset(reset);
        cell.appendChild(approveBtn);
    });
}

async function approvePasswordReset(reset) {
    if (!confirm(`Are you sure you want to change the password for ${reset.username}?`)) return;
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:3000/admin/password-reset/${reset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ new_password: reset.new_password, user_id: reset.user_id })
    });
    fetchPasswordResets();
}

function setupSidebarNavigation() {
    const navItems = {
        dashboard: document.getElementById('nav-dashboard'),
        reports: document.getElementById('nav-reports'),
        passwordResets: document.getElementById('nav-password-resets'),
        employees: document.getElementById('nav-employees'),
        users: document.getElementById('nav-users')
    };
    const sections = {
        dashboard: document.getElementById('dashboard-header'),
        reports: document.getElementById('reports-section'),
        passwordResets: document.getElementById('password-resets-section'),
        employees: document.getElementById('employees-section'),
        users: document.getElementById('users-section')
    };
    const mainContent = document.querySelector('.main-content');

    Object.keys(navItems).forEach(key => {
        const navItem = navItems[key];
        const section = sections[key];
        if (navItem && section) {
            navItem.addEventListener('click', (event) => {
                event.preventDefault();
                for (const item of Object.values(navItems)) { 
                    if(item) item.classList.remove('active');
                }
                navItem.classList.add('active');
                
                const sectionTop = section.offsetTop - mainContent.offsetTop;
                mainContent.scrollTo({ 
                    top: sectionTop, 
                    behavior: 'smooth' 
                });
            });
        }
    });
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}