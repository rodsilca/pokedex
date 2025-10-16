from models import db

pokemon_tipo_association = db.Table('pokemon_tipo',
    db.Column('pokemon_id', db.Integer, db.ForeignKey('pokemon_usuario.id_pokemon_usuario'), primary_key=True),
    db.Column('tipo_id', db.Integer, db.ForeignKey('tipo_pokemon.id_tipo_pokemon'), primary_key=True)
)

class PokemonUsuario(db.Model):
    __tablename__ = 'pokemon_usuario'
    id_pokemon_usuario = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'), nullable=False)
    codigo = db.Column(db.String(50), nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    imagem_url = db.Column(db.String(255))
    grupo_batalha = db.Column(db.Boolean, default=False)
    favorito = db.Column(db.Boolean, default=False)
    tipos = db.relationship('TipoPokemon', secondary=pokemon_tipo_association, lazy='subquery', backref=db.backref('pokemons', lazy=True))