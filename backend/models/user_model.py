from models import db,bcrypt
import datetime

class Usuario(db.Model):
    __tablename__ = 'usuario'

    id_usuario = db.Column(db.Integer, primary_key = True)
    nome = db.Column(db.String(100), nullable = True)
    login = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(200), nullable=False)
    dt_inclusao = db.Column(db.DateTime, default=datetime.utcnow)
    dt_alteracao = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    pokemons = db.relationship('PokemonUsuario', backref='usuario', lazy=True)

    def set_password(self, password):
        self.senha = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.senha,password)
