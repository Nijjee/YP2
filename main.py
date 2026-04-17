from fastapi import FastAPI, Depends, HTTPException, Request, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from database import engine, SessionLocal, get_db, Base
from models import *
import uuid
from datetime import datetime, timedelta
from typing import Optional

app = FastAPI()
Base.metadata.create_all(bind=engine)
app.mount("/static", StaticFiles(directory="static"), name="static")

sessions = {}

def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("session_token")
    if not token or token not in sessions:
        return None
    user_data = sessions[token]
    if user_data["role"] == "client":
        client = db.query(Client).filter(Client.id == user_data["id"]).first()
        return {"type": "client", "data": client}
    return {"type": "admin", "data": db.query(Administrator).filter(Administrator.id == user_data["id"]).first()}

@app.get("/", response_class=HTMLResponse)
def root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/admin", response_class=HTMLResponse)
def admin_panel():
    with open("static/admin.html", "r", encoding="utf-8") as f:
        return f.read()

@app.post("/api/register")
def register(login: str = Form(...), password: str = Form(...), full_name: str = Form(...), phone: str = Form(...), db: Session = Depends(get_db)):
    if db.query(User).filter(User.login == login).first():
        raise HTTPException(status_code=400, detail="Логин занят")
    user = User(login=login, password=password, role="client")
    db.add(user)
    db.flush()
    client = Client(id=user.id, full_name=full_name, phone=phone)
    db.add(client)
    db.commit()
    return {"message": "Регистрация успешна"}

@app.post("/api/login")
def login(login: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.login == login, User.password == password).first()
    if not user:
        raise HTTPException(status_code=401, detail="Неверный логин/пароль")
    token = uuid.uuid4().hex
    sessions[token] = {"id": user.id, "role": user.role}
    response = JSONResponse(content={"role": user.role})
    response.set_cookie(key="session_token", value=token, httponly=True)
    return response

@app.get("/api/rooms")
def get_rooms(db: Session = Depends(get_db)):
    return db.query(Room).all()

@app.post("/api/bookings")
def create_booking(room_id: int = Form(...), date: str = Form(...), request: Request = None, db: Session = Depends(get_db)):
    user_info = get_current_user(request, db)
    if not user_info or user_info["type"] != "client":
        raise HTTPException(status_code=403, detail="Требуется авторизация")
    client = user_info["data"]
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room or not room.is_active:
        raise HTTPException(status_code=400, detail="Номер недоступен")
    booking = Booking(
        client_id=client.id,
        room_id=room_id,
        date=date,
        fixed_price=room.price,
        deadline=datetime.now() + timedelta(hours=24)
    )
    db.add(booking)
    db.flush()
    payment = Payment(booking_id=booking.id, amount=room.price)
    db.add(payment)
    db.commit()
    return {"id": booking.id, "deadline": booking.deadline.isoformat(), "fixed_price": booking.fixed_price}

@app.get("/api/admin/bookings")
def get_pending_bookings(db: Session = Depends(get_db)):
    return db.query(Booking).filter(Booking.status == "pending").all()

@app.post("/api/admin/bookings/{booking_id}/approve")
def approve_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    booking.status = "approved"
    db.commit()
    return {"message": "Одобрено"}

@app.post("/api/admin/bookings/{booking_id}/reject")
def reject_booking(booking_id: int, reason: str = Form(...), db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    booking.status = "rejected"
    booking.rejection_reason = reason
    db.commit()
    return {"message": "Отклонено"}

@app.patch("/api/admin/rooms/{room_id}")
def update_room(room_id: int, new_price: Optional[float] = None, is_active: Optional[bool] = None, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Номер не найден")
    if new_price is not None:
        room.price = new_price
    if is_active is not None:
        room.is_active = is_active
    db.commit()
    return {"message": "Обновлено"}

@app.post("/api/payments/{booking_id}")
def pay_booking(booking_id: int, request: Request = None, db: Session = Depends(get_db)):
    user_info = get_current_user(request, db)
    if not user_info or user_info["type"] != "client":
        raise HTTPException(status_code=403, detail="Требуется авторизация")
    payment = db.query(Payment).filter(Payment.booking_id == booking_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Оплата не найдена")
    if payment.status == "expired":
        raise HTTPException(status_code=400, detail="Срок оплаты истёк")
    payment.status = "paid"
    payment.date_pay = datetime.now()
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    booking.status = "paid"
    db.commit()
    return {"message": "Оплачено"}