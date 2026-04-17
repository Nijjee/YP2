from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timedelta

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    login = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    full_name = Column(String)
    phone = Column(String)

class Administrator(Base):
    __tablename__ = "administrators"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    price = Column(Float)
    description = Column(String)
    image = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    room_id = Column(Integer, ForeignKey("rooms.id"))
    date = Column(String)
    fixed_price = Column(Float)
    status = Column(String, default="pending")
    rejection_reason = Column(String, nullable=True)
    deadline = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True)
    amount = Column(Float)
    date_pay = Column(DateTime, nullable=True)
    status = Column(String, default="unpaid")