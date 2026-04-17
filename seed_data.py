from database import SessionLocal, engine, Base
from models import User, Client, Administrator, Room

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Создаём админа
if not db.query(User).filter(User.login == "admin").first():
    admin_user = User(login="admin", password="admin", role="admin")
    db.add(admin_user)
    db.flush()
    admin = Administrator(id=admin_user.id)
    db.add(admin)
    print("Админ создан: login=admin, password=admin")

# Создаём тестовые номера
if db.query(Room).count() == 0:
    rooms = [
        Room(title="Стандарт", price=3500, description="Одноместный номер с душем и Wi-Fi", is_active=True),
        Room(title="Комфорт", price=5200, description="Двухместный номер с балконом и видом на море", is_active=True),
        Room(title="Люкс", price=9000, description="Номер с кухней, джакузи и отдельной гостиной", is_active=True),
    ]
    db.add_all(rooms)
    print("Создано 3 номера")

db.commit()
db.close()
print("Готово!")