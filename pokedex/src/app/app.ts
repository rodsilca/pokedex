import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // Import para usar ngModel nos formulários

// --- INTERFACES ---
export interface Pokemon {
  id: string;
  name: string;
  imageUrl: string;
}
export interface User {
  id: number;
  nome: string;
  login: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule // Adiciona o módulo de formulários
  ],
  template: `
    <div class="main-container">
      <!-- CABEÇALHO -->
      <header>
        <div class="top-bar">
          <div class="container header-content">
            <div class="logo-area">
              <svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="48px" height="48px"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-9h4v2h-4v-2zm-2-3h8v2h-8v-2z"/></svg>
              <h1>Pokédex Digital</h1>
            </div>
            <!-- Exibe informações do usuário e botão de logout se estiver logado -->
            <div *ngIf="isLoggedIn && user" class="user-info">
              <span>Olá, {{ user.nome }}</span>
              <button (click)="logout()" class="logout-btn">Sair</button>
            </div>
          </div>
        </div>
      </header>

      <!-- CONTEÚDO PRINCIPAL -->
      <main class="container">
        <!-- TELA DE LOGIN/REGISTRO -->
        <div *ngIf="!isLoggedIn; else pokedexContent">
          <div class="auth-container">
            <!-- Formulário de Login -->
            <div *ngIf="authMode === 'login'" class="auth-form">
              <h2>Acessar sua Pokédex</h2>
              <p>Faça login para ver seus Pokémon.</p>
              <form (ngSubmit)="onLoginSubmit()">
                <div class="form-group">
                  <label for="login-login">Login</label>
                  <input id="login-login" type="text" [(ngModel)]="loginData.login" name="login" required>
                </div>
                <div class="form-group">
                  <label for="login-senha">Senha</label>
                  <input id="login-senha" type="password" [(ngModel)]="loginData.senha" name="senha" required>
                </div>
                <div *ngIf="authError" class="error-message">{{ authError }}</div>
                <button type="submit" class="auth-btn">Entrar</button>
              </form>
              <p class="switch-auth">Não tem uma conta? <a (click)="switchAuthMode('register')">Registre-se</a></p>
            </div>

            <!-- Formulário de Registro -->
            <div *ngIf="authMode === 'register'" class="auth-form">
              <h2>Crie sua Conta</h2>
              <p>É rápido e fácil.</p>
              <form (ngSubmit)="onRegisterSubmit()">
                 <div class="form-group">
                  <label for="reg-nome">Nome</label>
                  <input id="reg-nome" type="text" [(ngModel)]="registerData.nome" name="reg-nome" required>
                </div>
                 <div class="form-group">
                  <label for="reg-login">Login</label>
                  <input id="reg-login" type="text" [(ngModel)]="registerData.login" name="reg-login" required>
                </div>
                 <div class="form-group">
                  <label for="reg-email">Email</label>
                  <input id="reg-email" type="email" [(ngModel)]="registerData.email" name="reg-email" required>
                </div>
                <div class="form-group">
                  <label for="reg-senha">Senha</label>
                  <input id="reg-senha" type="password" [(ngModel)]="registerData.senha" name="reg-senha" required>
                </div>
                <div *ngIf="authError" class="error-message">{{ authError }}</div>
                <div *ngIf="authSuccess" class="success-message">{{ authSuccess }}</div>
                <button type="submit" class="auth-btn">Registrar</button>
              </form>
              <p class="switch-auth">Já tem uma conta? <a (click)="switchAuthMode('login')">Faça Login</a></p>
            </div>
          </div>
        </div>

        <!-- CONTEÚDO DA POKÉDEX (visível apenas após login) -->
        <ng-template #pokedexContent>
          <h2>Pokémon Descobertos</h2>
          <div *ngIf="pokemons.length > 0; else loadingTemplate" class="pokemon-grid">
            <div *ngFor="let pokemon of pokemons" class="pokemon-card">
               <div class="card-header"><span class="pokemon-id">#{{ pokemon.id.padStart(4, '0') }}</span></div>
               <div class="image-container">
                <div class="image-bg"></div>
                <img [src]="pokemon.imageUrl" [alt]="'Imagem do ' + pokemon.name" (error)="onImageError($event)">
               </div>
               <div class="card-footer"><h3 class="pokemon-name">{{ capitalizeFirstLetter(pokemon.name) }}</h3></div>
            </div>
          </div>
          <ng-template #loadingTemplate>
            <div class="loading-message"><p>{{ apiError || 'Carregando Pokémon...' }}</p></div>
          </ng-template>
        </ng-template>
      </main>
    </div>
  `,
  styles: [`
    /* ESTILOS GLOBAIS E DE LAYOUT (semelhante ao anterior) */
    :host { font-family: "Inter", sans-serif; }
    .main-container { background-color: #f9fafb; min-height: 100vh; }
    .container { max-width: 1280px; margin: 0 auto; padding: 1.5rem; }
    
    /* CABEÇALHO */
    header .top-bar { background-color: #e74c3c; padding: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header-content { display: flex; justify-content: space-between; align-items: center; }
    .logo-area { display: flex; align-items: center; }
    header .logo { width: 2.5rem; height: 2.5rem; margin-right: 1rem; }
    header h1 { font-size: 1.75rem; font-weight: 700; color: white; }
    
    /* ÁREA DO USUÁRIO */
    .user-info { display: flex; align-items: center; color: white; }
    .user-info span { margin-right: 1rem; font-weight: 700; }
    .logout-btn { background-color: white; color: #e74c3c; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 700; transition: background-color 0.2s; }
    .logout-btn:hover { background-color: #f1f1f1; }
    
    /* ESTILOS DOS FORMULÁRIOS DE AUTENTICAÇÃO */
    .auth-container { max-width: 450px; margin: 4rem auto; background: white; padding: 2.5rem; border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
    .auth-form h2 { font-size: 1.75rem; font-weight: 800; text-align: center; color: #2d3748; }
    .auth-form p { text-align: center; color: #718096; margin-bottom: 2rem; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 0.5rem; color: #4a5568; }
    .form-group input { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; }
    .auth-btn { width: 100%; background-color: #e74c3c; color: white; padding: 0.85rem; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 700; cursor: pointer; transition: background-color 0.2s; }
    .auth-btn:hover { background-color: #c0392b; }
    .switch-auth { margin-top: 1.5rem; font-size: 0.9rem; }
    .switch-auth a { color: #e74c3c; font-weight: 700; cursor: pointer; }
    .error-message { color: #e74c3c; background-color: #fdd; padding: 0.75rem; border-radius: 0.5rem; text-align: center; margin-bottom: 1rem; }
    .success-message { color: #27ae60; background-color: #d6f5e0; padding: 0.75rem; border-radius: 0.5rem; text-align: center; margin-bottom: 1rem; }

    /* ESTILOS DA POKÉDEX (semelhante ao anterior) */
    main h2 { font-size: 2rem; font-weight: 800; color: #2d3748; margin-bottom: 1.5rem; }
    .pokemon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.5rem; }
    .pokemon-card { background-color: white; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); overflow: hidden; transition: all 0.2s ease-in-out; border: 1px solid #e2e8f0; }
    .pokemon-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
    .card-header { padding: 0.75rem 1rem; }
    .pokemon-id { font-size: 0.875rem; font-weight: 700; color: #718096; }
    .image-container { position: relative; height: 12rem; display: flex; justify-content: center; align-items: center; }
    .image-bg { position: absolute; inset: 0; background-color: #e2e8f0; border-radius: 50%; margin: 1.5rem 2.5rem; filter: blur(24px); opacity: 0.7; }
    img { width: 10rem; height: 10rem; object-fit: contain; position: relative; z-index: 10; }
    .card-footer { padding: 1rem; text-align: center; background-color: #f7fafc; border-top: 1px solid #e2e8f0; }
    .pokemon-name { font-size: 1.25rem; font-weight: 700; color: #2d3748; }
    .loading-message { text-align: center; padding: 3rem 0; color: #4a5568; font-size: 1.125rem; }
  `]
})
export class AppComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:5000/api';

  // Estado da aplicação
  isLoggedIn = false;
  user: User | null = null;
  authMode: 'login' | 'register' = 'login';
  pokemons: Pokemon[] = [];
  
  // Mensagens de erro/sucesso
  authError: string | null = null;
  authSuccess: string | null = null;
  apiError: string | null = null;
  
  // Dados dos formulários
  loginData = { login: '', senha: '' };
  registerData = { nome: '', login: '', email: '', senha: '' };

  ngOnInit() {
    this.checkLoginStatus();
  }

  checkLoginStatus() {
    const token = localStorage.getItem('pokedex_token');
    const userData = localStorage.getItem('pokedex_user');
    if (token && userData) {
      this.isLoggedIn = true;
      this.user = JSON.parse(userData);
      this.loadPokemons();
    }
  }

  switchAuthMode(mode: 'login' | 'register') {
    this.authMode = mode;
    this.authError = null; // Limpa erros ao trocar de formulário
    this.authSuccess = null;
  }

  onRegisterSubmit() {
    this.authError = null;
    this.authSuccess = null;
    this.http.post<any>(`${this.apiUrl}/register`, this.registerData).subscribe({
      next: (response) => {
        this.authSuccess = `${response.message} Agora você pode fazer o login.`;
        this.switchAuthMode('login');
      },
      error: (err) => {
        this.authError = err.error.message || 'Ocorreu um erro durante o registro.';
      }
    });
  }

  onLoginSubmit() {
    this.authError = null;
    this.http.post<any>(`${this.apiUrl}/login`, this.loginData).subscribe({
      next: (response) => {
        // Salva o token e os dados do usuário no localStorage
        localStorage.setItem('pokedex_token', response.token);
        localStorage.setItem('pokedex_user', JSON.stringify(response.user));
        this.isLoggedIn = true;
        this.user = response.user;
        this.loadPokemons();
      },
      error: (err) => {
        this.authError = err.error.message || 'Falha no login.';
      }
    });
  }

  logout() {
    localStorage.removeItem('pokedex_token');
    localStorage.removeItem('pokedex_user');
    this.isLoggedIn = false;
    this.user = null;
    this.pokemons = [];
    this.loginData = { login: '', senha: '' }; // Limpa campos
  }

  loadPokemons() {
    const token = localStorage.getItem('pokedex_token');
    if (!token) {
      this.apiError = "Você não está autenticado.";
      return;
    }
    
    const headers = new HttpHeaders().set('x-access-token', token);
    
    this.http.get<Pokemon[]>(`${this.apiUrl}/pokemon`, { headers }).subscribe({
      next: (data) => { this.pokemons = data; },
      error: (err) => {
        this.apiError = 'Não foi possível carregar os Pokémon. Sua sessão pode ter expirado.';
        if (err.status === 401) {
            this.logout(); // Desloga o usuário se o token for inválido
        }
      }
    });
  }
  
  // Funções utilitárias
  capitalizeFirstLetter(name: string): string { return name ? name.charAt(0).toUpperCase() + name.slice(1) : ''; }
  onImageError(event: Event) { (event.target as HTMLImageElement).src = 'https://placehold.co/160x160/f8f8f8/ccc?text=Pkm'; }
}