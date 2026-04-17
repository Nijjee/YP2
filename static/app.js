async function api(url, options = {}) {
    const res = await fetch(url, {
        headers: {"Content-Type": "application/json"},
        ...options
    });
    return res.json();
}

function toggleRegister() {
    const fullName = document.getElementById("full_name");
    const phone = document.getElementById("phone");
    fullName.style.display = fullName.style.display === "none" ? "block" : "none";
    phone.style.display = phone.style.display === "none" ? "block" : "none";
}

async function login() {
    const login = document.getElementById("login").value;
    const password = document.getElementById("password").value;
    const formData = new FormData();
    formData.append("login", login);
    formData.append("password", password);
    
    const res = await fetch("/api/login", { method: "POST", body: formData });
    const data = await res.json();
    
    if (res.ok) {
        if (data.role === "admin") {
            window.location.href = "/admin";
        } else {
            document.getElementById("auth").style.display = "none";
            document.getElementById("client").style.display = "block";
            loadRooms();
            loadMyBookings();
        }
    } else {
        alert("Ошибка входа: " + (data.detail || "Неверный логин/пароль"));
    }
}

async function register() {
    const login = document.getElementById("login").value;
    const password = document.getElementById("password").value;
    const full_name = document.getElementById("full_name").value;
    const phone = document.getElementById("phone").value;
    
    const formData = new FormData();
    formData.append("login", login);
    formData.append("password", password);
    formData.append("full_name", full_name);
    formData.append("phone", phone);
    
    const res = await fetch("/api/register", { method: "POST", body: formData });
    if (res.ok) {
        alert("Регистрация успешна, войдите");
    } else {
        const data = await res.json();
        alert("Ошибка: " + data.detail);
    }
}

async function loadRooms() {
    const rooms = await api("/api/rooms");
    const div = document.getElementById("rooms");
    div.innerHTML = rooms.map(r => `
        <div class="room-card">
            <h3>${r.title} - ${r.price}₽</h3>
            <p>${r.description}</p>
            <p>Статус: ${r.is_active ? 'Доступен' : 'Недоступен'}</p>
            ${r.is_active ? `<button onclick="book(${r.id})">Забронировать</button>` : ''}
        </div>
    `).join("");
}

async function book(roomId) {
    const date = prompt("Введите дату (ГГГГ-ММ-ДД):", "2026-05-01");
    if (!date) return;
    
    const formData = new FormData();
    formData.append("room_id", roomId);
    formData.append("date", date);
    
    const res = await fetch("/api/bookings", { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) {
        alert(`Бронь создана! ID: ${data.id}\nЦена: ${data.fixed_price}₽\nОплатить до: ${new Date(data.deadline).toLocaleString()}`);
        loadMyBookings();
    } else {
        alert("Ошибка: " + data.detail);
    }
}

async function loadMyBookings() {
    // Упрощённая версия - покажи сообщение
    const div = document.getElementById("my_bookings");
    div.innerHTML = "<p>Заявки отображаются после одобрения администратором</p>";
}

async function loadPendingBookings() {
    const bookings = await api("/api/admin/bookings");
    const div = document.getElementById("pending_bookings");
    if (bookings.length === 0) {
        div.innerHTML = "<p>Нет заявок</p>";
        return;
    }
    div.innerHTML = bookings.map(b => `
        <div class="booking-item status-${b.status}">
            <p><strong>Заявка #${b.id}</strong></p>
            <p>Комната ID: ${b.room_id}, Дата: ${b.date}</p>
            <p>Цена: ${b.fixed_price}₽</p>
            <p>Дедлайн: ${new Date(b.deadline).toLocaleString()}</p>
            <button onclick="approveBooking(${b.id})">Одобрить</button>
            <button onclick="rejectBooking(${b.id})">Отклонить</button>
        </div>
    `).join("");
}

async function approveBooking(bookingId) {
    const formData = new FormData();
    const res = await fetch(`/api/admin/bookings/${bookingId}/approve`, { method: "POST", body: formData });
    if (res.ok) {
        alert("Одобрено");
        loadPendingBookings();
    } else {
        alert("Ошибка");
    }
}

async function rejectBooking(bookingId) {
    const reason = prompt("Укажите причину отказа:");
    if (!reason) return;
    
    const formData = new FormData();
    formData.append("reason", reason);
    
    const res = await fetch(`/api/admin/bookings/${bookingId}/reject`, { method: "POST", body: formData });
    if (res.ok) {
        alert("Отклонено");
        loadPendingBookings();
    } else {
        alert("Ошибка: " + (await res.json()).detail);
    }
}

async function loadAdminRooms() {
    const rooms = await api("/api/rooms");
    const div = document.getElementById("admin_rooms");
    div.innerHTML = rooms.map(r => `
        <div class="room-card">
            <h3>${r.title} - ${r.price}₽</h3>
            <p>${r.description}</p>
            <p>Активен: ${r.is_active ? 'Да' : 'Нет'}</p>
            <button onclick="toggleRoom(${r.id}, ${!r.is_active})">${r.is_active ? 'Деактивировать' : 'Активировать'}</button>
            <button onclick="updatePrice(${r.id})">Изменить цену</button>
        </div>
    `).join("");
}

async function toggleRoom(roomId, isActive) {
    const res = await fetch(`/api/admin/rooms/${roomId}?is_active=${isActive}`, { method: "PATCH" });
    if (res.ok) {
        loadAdminRooms();
    }
}

async function updatePrice(roomId) {
    const newPrice = prompt("Введите новую цену:");
    if (!newPrice) return;
    
    const res = await fetch(`/api/admin/rooms/${roomId}?new_price=${newPrice}`, { method: "PATCH" });
    if (res.ok) {
        loadAdminRooms();
    }
}

function logout() {
    document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
}