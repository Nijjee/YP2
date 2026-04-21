//ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
async function api(url, method = "GET", formData = null) {
    try {
        const options = { method: method };
        if (formData) options.body = formData;
        
        const res = await fetch(url, options);
        const contentType = res.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (!res.ok) {
                alert("Ошибка: " + (data.detail || "Неизвестная ошибка"));
            }
            return data;
        }
        return null;
    } catch (error) {
        alert("Ошибка соединения: " + error.message);
        return null;
    }
}

//АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ
function toggleRegister() {
    const fields = document.getElementById("register-fields");
    const btn = document.getElementById("register-btn");
    const toggleBtn = document.querySelector('button[onclick="toggleRegister()"]');
    
    if (!fields || !btn || !toggleBtn) return;
    
    if (fields.style.display === "none") {
        fields.style.display = "block";
        btn.style.display = "inline-block";
        toggleBtn.textContent = "Скрыть регистрацию";
    } else {
        fields.style.display = "none";
        btn.style.display = "none";
        toggleBtn.textContent = "Показать регистрацию";
    }
}

async function login() {
    const loginVal = document.getElementById("login").value;
    const passVal = document.getElementById("password").value;

    if (!loginVal || !passVal) {
        alert("Введите логин и пароль");
        return;
    }

    const formData = new FormData();
    formData.append("login", loginVal);
    formData.append("password", passVal);

    const data = await api("/api/login", "POST", formData);
    
    if (data) {
        if (data.role === "admin") {
            window.location.href = "/admin";
        } else {
            alert("Вход выполнен успешно!");
            document.getElementById("auth").style.display = "none";
            document.getElementById("client").style.display = "block";
            loadRooms();
            loadMyBookings();
            loadMyPayments();
        }
    }
}

async function register() {
    const loginVal = document.getElementById("login").value;
    const passVal = document.getElementById("password").value;
    const nameVal = document.getElementById("full_name").value;
    const phoneVal = document.getElementById("phone").value;

    if (!loginVal || !passVal || !nameVal || !phoneVal) {
        alert("Заполните ВСЕ поля!");
        return;
    }

    const formData = new FormData();
    formData.append("login", loginVal);
    formData.append("password", passVal);
    formData.append("full_name", nameVal);
    formData.append("phone", phoneVal);

    const data = await api("/api/register", "POST", formData);
    
    if (data) {
        alert("Регистрация успешна! Теперь войдите.");
        document.getElementById("login").value = "";
        document.getElementById("password").value = "";
        document.getElementById("full_name").value = "";
        document.getElementById("phone").value = "";
        toggleRegister();
    }
}

function logout() {
    document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
}

//КЛИЕНТСКАЯ ЧАСТЬ
async function loadRooms() {
    const rooms = await api("/api/rooms");
    const div = document.getElementById("rooms");
    
    if (!div) return;
    
    if (!rooms || rooms.length === 0) {
        div.innerHTML = "<p>Номеров пока нет</p>";
        return;
    }
    
    div.innerHTML = rooms.map(r => `
        <div class="room-card">
            ${r.image ? `<img src="${r.image}" alt="${r.title}" onerror="this.style.display='none'">` : ''}
            <h3>${r.title} - ${r.price}₽</h3>
            <p>${r.description}</p>
            <p>Статус: ${r.is_active ? 'Доступен' : 'Недоступен'}</p>
            ${r.is_active ? `<button onclick="book(${r.id})">Забронировать</button>` : ''}
        </div>
    `).join("");
}

async function book(roomId) {
    const date = prompt("Введите дату заезда (ГГГГ-ММ-ДД):", "2026-05-01");
    if (!date) return;
    
    const formData = new FormData();
    formData.append("room_id", roomId);
    formData.append("date", date);
    
    const data = await api("/api/bookings", "POST", formData);
    
    if (data) {
        alert(`Бронь создана!\nID заявки: ${data.id}\nЦена: ${data.fixed_price}₽\nОплатить до: ${new Date(data.deadline).toLocaleString()}`);
    }
}

// Загрузка моих заявок
async function loadMyBookings() {
    try {
        const bookings = await api("/api/client/bookings");
        const div = document.getElementById("my_bookings");
        
        if (!div) return;
        
        if (!bookings || bookings.length === 0) {
            div.innerHTML = "<p>У вас пока нет заявок</p>";
            return;
        }
        
        div.innerHTML = bookings.map(b => `
            <div class="booking-item status-${b.status}">
                <h3>Заявка #${b.id}</h3>
                <p><strong>Номер ID:</strong> ${b.room_id}</p>
                <p><strong>Дата заезда:</strong> ${b.date}</p>
                <p><strong>Цена:</strong> ${b.fixed_price}₽</p>
                <p><strong>Статус:</strong> ${getStatusText(b.status)}</p>
                ${b.rejection_reason ? `<p style="color:red"><strong>Причина отказа:</strong> ${b.rejection_reason}</p>` : ''}
                <p><strong>Дедлайн оплаты:</strong> ${new Date(b.deadline).toLocaleString()}</p>
                ${b.status === 'pending' ? `<p style="color:orange">Ожидает подтверждения администратором</p>` : ''}
                ${b.status === 'approved' ? `<p style="color:green">Одобрено! Не забудьте оплатить до дедлайна.</p>` : ''}
            </div>
        `).join("");
    } catch (error) {
        console.error("Ошибка загрузки заявок:", error);
        const div = document.getElementById("my_bookings");
        if (div) {
            div.innerHTML = "<p style='color:red'>Ошибка загрузки заявок</p>";
        }
    }
}

// Вспомогательная функция для перевода статусов
function getStatusText(status) {
    const statuses = {
        'pending': 'Ожидает подтверждения',
        'approved': 'Одобрено',
        'rejected': 'Отклонено',
        'paid': 'Оплачено',
        'expired': 'Срок истёк'
    };
    return statuses[status] || status;
}

//АДМИНСКАЯ ЧАСТЬ
async function loadPendingBookings() {
    const bookings = await api("/api/admin/bookings");
    const div = document.getElementById("pending_bookings");
    
    if (!div) return;
    
    if (!bookings || bookings.length === 0) {
        div.innerHTML = "<p>Нет заявок на рассмотрение</p>";
        return;
    }
    
    div.innerHTML = bookings.map(b => `
        <div class="booking-item status-${b.status}">
            <h3>Заявка #${b.id}</h3>
            <p><strong>Клиент ID:</strong> ${b.client_id}</p>
            <p><strong>Номер ID:</strong> ${b.room_id}</p>
            <p><strong>Дата:</strong> ${b.date}</p>
            <p><strong>Цена:</strong> ${b.fixed_price}₽</p>
            <p><strong>Статус:</strong> ${b.status}</p>
            <p><strong>Дедлайн:</strong> ${new Date(b.deadline).toLocaleString()}</p>
            ${b.rejection_reason ? `<p><strong>Причина отказа:</strong> ${b.rejection_reason}</p>` : ''}
            ${b.status === 'pending' ? `
                <button onclick="approveBooking(${b.id})">Одобрить</button>
                <button onclick="rejectBooking(${b.id})">Отклонить</button>
            ` : ''}
        </div>
    `).join("");
}

async function loadAdminRooms() {
    const rooms = await api("/api/rooms");
    const div = document.getElementById("admin_rooms");
    
    if (!div) return;
    
    if (!rooms || rooms.length === 0) {
        div.innerHTML = "<p>Нет номеров</p>";
        return;
    }
    
    div.innerHTML = rooms.map(r => `
        <div class="room-card">
            ${r.image ? `<img src="${r.image}" alt="${r.title}" onerror="this.style.display='none'">` : ''}
            <h3>${r.title} - ${r.price}₽</h3>
            <p>${r.description}</p>
            <p><strong>Статус:</strong> ${r.is_active ? 'Активен' : 'Неактивен'}</p>
            <button onclick="toggleRoom(${r.id}, ${!r.is_active})">
                ${r.is_active ? 'Деактивировать' : 'Активировать'}
            </button>
            <button onclick="updateRoomPrice(${r.id})">Изменить цену</button>
        </div>
    `).join("");
}

async function approveBooking(bookingId) {
    const formData = new FormData();
    const res = await fetch(`/api/admin/bookings/${bookingId}/approve`, {
        method: "POST",
        body: formData
    });
    
    if (res.ok) {
        alert("Заявка одобрена!");
        loadPendingBookings();
    } else {
        const data = await res.json();
        alert("Ошибка: " + data.detail);
    }
}

async function rejectBooking(bookingId) {
    const reason = prompt("Укажите причину отказа:");
    if (!reason) return;
    
    const formData = new FormData();
    formData.append("reason", reason);
    
    const res = await fetch(`/api/admin/bookings/${bookingId}/reject`, {
        method: "POST",
        body: formData
    });
    
    if (res.ok) {
        alert("Заявка отклонена");
        loadPendingBookings();
    } else {
        const data = await res.json();
        alert("Ошибка: " + data.detail);
    }
}

async function toggleRoom(roomId, isActive) {
    const res = await fetch(`/api/admin/rooms/${roomId}?is_active=${isActive}`, {
        method: "PATCH"
    });
    
    if (res.ok) {
        loadAdminRooms();
    } else {
        alert("Ошибка при изменении статуса");
    }
}

async function updateRoomPrice(roomId) {
    const newPrice = prompt("Введите новую цену:");
    if (!newPrice) return;
    
    const res = await fetch(`/api/admin/rooms/${roomId}?new_price=${newPrice}`, {
        method: "PATCH"
    });
    
    if (res.ok) {
        loadAdminRooms();
    } else {
        alert("Ошибка при изменении цены");
    }
}

// Загрузка моих оплат
async function loadMyPayments() {
    try {
        const payments = await api("/api/client/payments");
        const div = document.getElementById("my_payments");
        
        if (!div) return;
        
        if (!payments || payments.length === 0) {
            div.innerHTML = "<p>У вас пока нет оплат</p>";
            return;
        }
        
        div.innerHTML = payments.map(p => `
            <div class="booking-item status-${p.status}">
                <h3>Оплата #${p.id}</h3>
                <p><strong>Заявка #:</strong> ${p.booking_id}</p>
                <p><strong>Сумма:</strong> ${p.amount}₽</p>
                <p><strong>Статус:</strong> ${getPaymentStatusText(p.status)}</p>
                ${p.date_pay ? `<p><strong>Дата оплаты:</strong> ${new Date(p.date_pay).toLocaleString()}</p>` : ''}
                ${p.status === 'unpaid' ? `
                    <button class="btn-approve" onclick="payBooking(${p.booking_id})">Оплатить</button>
                ` : ''}
            </div>
        `).join("");
    } catch (error) {
        console.error("Ошибка загрузки оплат:", error);
        const div = document.getElementById("my_payments");
        if (div) {
            div.innerHTML = "<p style='color:red'>Ошибка загрузки оплат</p>";
        }
    }
}

// Оплата заявки (заглушка)
async function payBooking(bookingId) {
    if (!confirm("Подтвердить оплату? (это заглушка — деньги не списываются)")) {
        return;
    }
    
    try {
        const formData = new FormData();
        const res = await fetch(`/api/payments/${bookingId}/pay`, {
            method: "POST",
            body: formData
        });
        
        const data = await res.json();
        
        if (res.ok) {
            alert("Готово" + data.message);
            loadMyBookings();   // Обновить заявки
            loadMyPayments();   // Обновить оплаты
        } else {
            alert("Ошибка: " + data.detail);
        }
    } catch (error) {
        alert("Ошибка соединения: " + error.message);
    }
}

// Перевод статусов оплаты
function getPaymentStatusText(status) {
    const statuses = {
        'unpaid': 'Не оплачено',
        'paid': 'Оплачено',
        'expired': 'Срок истёк',
        'pending': 'В обработке...'
    };
    return statuses[status] || status;
}