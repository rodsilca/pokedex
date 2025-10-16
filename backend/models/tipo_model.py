from models import db

class TipoPokemon(db.Model):
    __tablename__ = 'tipo_pokemon'
    id_tipo_pokemon = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(50), unique=True, nullable=False)