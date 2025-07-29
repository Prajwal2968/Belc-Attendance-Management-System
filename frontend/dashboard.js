document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return; 
    }
    
    document.getElementById('clockInBtn').addEventListener('click', () => handleClock('in'));
    document.getElementById('clockOutBtn').addEventListener('click', () => handleClock('out'));
    document.getElementById('logoutBtn').addEventListener('click', logout);

    fetchUserProfile();
    fetchAttendance();
    setupReportModal();
});

async function fetchUserProfile() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('http://localhost:3000/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const user = await response.json();
            document.getElementById('username-display').textContent = user.username;
            document.getElementById('user-greeting').textContent = `Welcome, ${user.username}!`;
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
    }
}

async function handleClock(type) {
    const endpoint = type === 'in' ? 'clockin' : 'clockout';
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`http://localhost:3000/${endpoint}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        alert(result.message);
        if (response.ok) {
            fetchAttendance();
        }
    } catch (error) {
        console.error(`Error clocking ${type}:`, error);
        alert(`An error occurred while trying to clock ${type}.`);
    }
}

async function fetchAttendance() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('http://localhost:3000/attendance', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const tableBody = document.getElementById('attendanceTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';
        
        updateStatus(data);

        if (data.length > 0) {
            data.forEach(rec => {
                let row = tableBody.insertRow();
                row.insertCell(0).textContent = new Date(rec.clock_in).toLocaleString();
                row.insertCell(1).textContent = rec.clock_out ? new Date(rec.clock_out).toLocaleString() : 'In Progress';
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="2">No attendance records found.</td></tr>';
        }
    } catch (error) {
        console.error("Error fetching attendance:", error);
    }
}

function updateStatus(attendanceData) {
    const statusMessage = document.getElementById('status-message');
    const clockInBtn = document.getElementById('clockInBtn');
    const clockOutBtn = document.getElementById('clockOutBtn');
    const latestRecord = attendanceData.length > 0 ? attendanceData[0] : null;

    if (latestRecord && latestRecord.clock_out === null) {
        const clockInTime = new Date(latestRecord.clock_in).toLocaleTimeString();
        statusMessage.textContent = `You are currently clocked in since ${clockInTime}.`;
        clockInBtn.disabled = true;
        clockOutBtn.disabled = false;
    } else {
        statusMessage.textContent = 'You are currently clocked out.';
        clockInBtn.disabled = false;
        clockOutBtn.disabled = true;
    }
}

function setupReportModal() {
    const modal = document.getElementById('report-modal');
    const openBtn = document.getElementById('reportIssueBtn');
    const closeBtn = document.getElementById('report-modal-close-btn');
    const form = document.getElementById('report-form');

    if (!modal || !openBtn || !closeBtn || !form) {
        console.error("One or more elements for the report modal were not found.");
        return;
    }

    openBtn.onclick = () => {
        modal.style.display = 'block';
    };

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const token = localStorage.getItem('token');
        const issue_type = document.getElementById('issue-type').value;
        const details = document.getElementById('issue-details').value;

        if (!issue_type) {
            alert('Please select an issue type.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/report-issue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ issue_type, details })
            });
            
            const result = await response.json();
            alert(result.message);

            if (response.ok) {
                modal.style.display = 'none';
                form.reset();
            }
        } catch (error) {
            console.error("Fetch failed for report submission:", error);
            alert("An error occurred. Could not submit report.");
        }
    });
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}