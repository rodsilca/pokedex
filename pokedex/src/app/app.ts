import { Component, OnDestroy, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface ApiPokemon { id: string; name: string; imageUrl: string; types: string[]; }
export interface UserPokemon { codigo: string; nome: string; favorito: boolean; grupo_batalha: boolean; }
export interface Pokemon extends ApiPokemon { isFavorite: boolean; isInBattleTeam: boolean; }
export interface User { id: number; nome: string; login: string; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ CommonModule, HttpClientModule, FormsModule, NgClass ],
  template: `
    <div class="main-container">
      <header>
        <div class="top-bar">
          <div class="container header-content">
            <div class="logo-area">
              <svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="48px" height="48px"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-9h4v2h-4v-2zm-2-3h8v2h-8v-2z"/></svg>
              <h1>Pokédex Digital</h1>
            </div>
            <div *ngIf="isLoggedIn && user" class="user-info">
              <span>Olá, {{ user.nome }}</span>
              <button (click)="logout()" class="logout-btn">Sair</button>
            </div>
          </div>
        </div>
      </header>

      <main class="container">
        <div *ngIf="!isLoggedIn; else pokedexContent">
          <!-- Bloco de Autenticação -->
          <div class="auth-container">
            <div *ngIf="authMode === 'login'" class="auth-form">
              <h2>Acessar sua Pokédex</h2><p>Faça login para ver seus Pokémon.</p>
              <form (ngSubmit)="onLoginSubmit()">
                <div class="form-group"><label for="login-login">Login</label><input id="login-login" type="text" [(ngModel)]="loginData.login" name="login" required></div>
                <div class="form-group"><label for="login-senha">Senha</label><input id="login-senha" type="password" [(ngModel)]="loginData.senha" name="senha" required></div>
                <div *ngIf="authError" class="error-message">{{ authError }}</div>
                <button type="submit" class="auth-btn">Entrar</button>
              </form>
              <p class="switch-auth">Não tem uma conta? <a (click)="switchAuthMode('register')">Registre-se</a></p>
            </div>
            <div *ngIf="authMode === 'register'" class="auth-form">
              <h2>Crie sua Conta</h2><p>É rápido e fácil.</p>
              <form (ngSubmit)="onRegisterSubmit()">
                 <div class="form-group"><label for="reg-nome">Nome</label><input id="reg-nome" type="text" [(ngModel)]="registerData.nome" name="reg-nome" required></div>
                 <div class="form-group"><label for="reg-login">Login</label><input id="reg-login" type="text" [(ngModel)]="registerData.login" name="reg-login" required></div>
                 <div class="form-group"><label for="reg-email">Email</label><input id="reg-email" type="email" [(ngModel)]="registerData.email" name="reg-email" required></div>
                <div class="form-group"><label for="reg-senha">Senha</label><input id="reg-senha" type="password" [(ngModel)]="registerData.senha" name="reg-senha" required></div>
                <div *ngIf="authError" class="error-message">{{ authError }}</div><div *ngIf="authSuccess" class="success-message">{{ authSuccess }}</div>
                <button type="submit" class="auth-btn">Registrar</button>
              </form>
              <p class="switch-auth">Já tem uma conta? <a (click)="switchAuthMode('login')">Faça Login</a></p>
            </div>
          </div>
        </div>

        <ng-template #pokedexContent>
          <div class="pokedex-header">
            <div class="title-and-stats">
              <h2>{{ viewTitles[currentView] }}</h2>
              <div class="stats">
                  <div class="stat-item" title="Total de Pokémon favoritados"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span>{{ favoritesCount }} Favoritos</span></div>
                  <div class="stat-item" title="Pokémon no time de batalha"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 23.596L2.479 18.223c-1.295-.816-2.121-2.196-2.121-3.699V4.653c0-1.503.826-2.883 2.121-3.699L11 .579l.92.581.92-.581 8.521 5.375c1.295.816 2.121 2.196 2.121 3.699v9.871c0 1.503-.826-2.883-2.121 3.699L12.08 24l-.92-.581-.001.002zM12 2.716L4.5 7.42v9.16c0 .751.413 1.441 1.061 1.85l6.44 4.062 6.439-4.062c.648-.409 1.06-1.099 1.06-1.85V7.42L12 2.716zm-1 14.784V7.5h2v10h-2z"/></svg><span>{{ battleTeamCount }} / 6 no Time</span></div>
              </div>
            </div>
            <div class="filters-container">
              <div class="view-tabs">
                <button [class.active]="currentView === 'all'" (click)="setView('all')">Todos</button>
                <button [class.active]="currentView === 'favorites'" (click)="setView('favorites')">Favoritos</button>
                <button [class.active]="currentView === 'battleTeam'" (click)="setView('battleTeam')">Time de Batalha</button>
              </div>
              <div class="search-and-gen-filters">
                <div class="generation-filter">
                   <select [ngModel]="selectedGenerationId" (ngModelChange)="onGenerationChange($event)" [disabled]="isSearching || isSpecialView">
                     <option *ngFor="let gen of generations" [value]="gen.id">{{ gen.name }}</option>
                   </select>
                </div>
                <div class="search-box">
                  <input type="text" [ngModel]="searchTerm" (ngModelChange)="onSearchTermChange($event)" placeholder="Buscar por nome ou ID...">
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="!isLoadingInitialData; else loadingTemplate">
            <div *ngIf="pokemons.length > 0" class="pokemon-grid">
                <div *ngFor="let pokemon of pokemons" class="pokemon-card">
                  <div class="card-header">
                    <span class="pokemon-id">#{{ pokemon.id.padStart(4, '0') }}</span>
                    <div class="actions">
                        <button class="action-btn" [class.active]="pokemon.isInBattleTeam" (click)="toggleBattleTeam(pokemon)" [disabled]="!pokemon.isInBattleTeam && battleTeamCount >= 6" title="Adicionar ao Time de Batalha"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 23.596L2.479 18.223c-1.295-.816-2.121-2.196-2.121-3.699V4.653c0-1.503.826-2.883 2.121-3.699L11 .579l.92.581.92-.581 8.521 5.375c1.295.816 2.121 2.196 2.121 3.699v9.871c0 1.503-.826-2.883-2.121 3.699L12.08 24l-.92-.581-.001.002zM12 2.716L4.5 7.42v9.16c0 .751.413 1.441 1.061 1.85l6.44 4.062 6.439-4.062c.648-.409 1.06-1.099 1.06-1.85V7.42L12 2.716zm-1 14.784V7.5h2v10h-2z"/></svg></button>
                        <button class="action-btn" [class.active]="pokemon.isFavorite" (click)="toggleFavorite(pokemon)" title="Favoritar Pokémon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>
                    </div>
                  </div>
                  <div class="image-container"><div class="image-bg"></div><img [src]="pokemon.imageUrl" [alt]="'Imagem do ' + pokemon.name" (error)="onImageError($event)"></div>
                  <div class="card-footer">
                    <h3 class="pokemon-name">{{ capitalizeFirstLetter(pokemon.name) }}</h3>
                    <div class="types-container"><span *ngFor="let type of pokemon.types" class="type-badge" [ngClass]="'type-' + type">{{ type }}</span></div>
                  </div>
                </div>
            </div>
            <div *ngIf="pokemons.length === 0" class="empty-state">
              <p *ngIf="apiError">{{ apiError }}</p>
              <p *ngIf="!apiError && currentView === 'favorites'">Você ainda não favoritou nenhum Pokémon.</p>
              <p *ngIf="!apiError && currentView === 'battleTeam'">Seu time de batalha está vazio.</p>
            </div>
            <!-- Indicador de carregamento para o scroll infinito -->
            <div *ngIf="isLoadingMore" class="loading-more-indicator">
              <p>Carregando mais Pokémon...</p>
            </div>
          </div>
          <ng-template #loadingTemplate><div class="loading-message"><p>Carregando Pokémon...</p></div></ng-template>
        </ng-template>
      </main>
    </div>
  `,
  styles: [`
    :host { font-family: "Inter", sans-serif; }
    .main-container { background-color: #f9fafb; min-height: 100vh; }
    .container { max-width: 1280px; margin: 0 auto; padding: 1.5rem; }
    header .top-bar { background-color: #e74c3c; padding: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header-content { display: flex; justify-content: space-between; align-items: center; }
    .logo-area { display: flex; align-items: center; gap: 1rem; }
    header h1 { font-size: 1.75rem; font-weight: 700; color: white; }
    .user-info { display: flex; align-items: center; color: white; gap: 1rem; }
    .logout-btn { background-color: white; color: #e74c3c; border: none; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 700; transition: background-color 0.2s; }
    .logout-btn:hover { background-color: #f1f1f1; }
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
    .pokedex-header { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 1.5rem; }
    .title-and-stats { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 1rem; }
    .title-and-stats h2 { margin: 0; font-size: 2rem; font-weight: 800; color: #2d3748; }
    .stats { display: flex; gap: 1.5rem; }
    .stat-item { display: flex; align-items: center; font-weight: 600; color: #4a5568; }
    .stat-item svg { width: 1.25rem; height: 1.25rem; margin-right: 0.5rem; color: #a0aec0; }
    .stat-item:first-of-type svg { color: #e53e3e; }
    .stat-item:last-of-type svg { color: #3182ce; }
    .filters-container { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 1rem; }
    .view-tabs { display: flex; gap: 0.5rem; background-color: #e2e8f0; padding: 0.25rem; border-radius: 0.5rem; }
    .view-tabs button { background: none; border: none; padding: 0.5rem 1rem; font-weight: 600; border-radius: 0.375rem; cursor: pointer; transition: all 0.2s; color: #4a5568; }
    .view-tabs button.active { background-color: white; color: #2d3748; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); }
    .search-and-gen-filters { display: flex; gap: 1rem; }
    .search-box input, .generation-filter select { padding: 0.6rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; }
    .search-box input { width: 250px; }
    .generation-filter select { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
    .generation-filter select:disabled { background-color: #f1f5f9; cursor: not-allowed; color: #9ca3af; }
    .pokemon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.5rem; }
    .pokemon-card { background-color: white; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); overflow: hidden; transition: all 0.2s ease-in-out; border: 1px solid #e2e8f0; }
    .pokemon-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
    .card-header { padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; }
    .pokemon-id { font-size: 0.875rem; font-weight: 700; color: #718096; }
    .actions { display: flex; gap: 0.5rem; }
    .action-btn { background: none; border: none; padding: 0.25rem; cursor: pointer; color: #cbd5e0; transition: color 0.2s ease; }
    .action-btn:hover { color: #a0aec0; }
    .action-btn.active { color: #e53e3e; }
    .action-btn:nth-of-type(1).active { color: #3182ce; }
    .action-btn svg { width: 1.25rem; height: 1.25rem; }
    .action-btn:disabled { color: #e2e8f0; cursor: not-allowed; }
    .image-container { position: relative; height: 12rem; display: flex; justify-content: center; align-items: center; }
    .image-bg { position: absolute; inset: 0; background-color: #e2e8f0; border-radius: 50%; margin: 1.5rem 2.5rem; filter: blur(24px); opacity: 0.7; }
    img { width: 10rem; height: 10rem; object-fit: contain; position: relative; z-index: 10; }
    .card-footer { padding: 1rem; text-align: center; background-color: #f7fafc; border-top: 1px solid #e2e8f0; }
    .pokemon-name { font-size: 1.25rem; font-weight: 700; color: #2d3748; margin-bottom: 0.5rem; }
    .loading-message, .empty-state { text-align: center; padding: 4rem 1rem; color: #718096; font-size: 1.125rem; }
    .types-container { display: flex; justify-content: center; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
    .type-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; color: white; text-transform: capitalize; }
    .type-grass { background-color: #78C850; } .type-fire { background-color: #F08030; } .type-water { background-color: #6890F0; } .type-bug { background-color: #A8B820; } .type-normal { background-color: #A8A878; } .type-poison { background-color: #A040A0; } .type-electric { background-color: #F8D030; } .type-ground { background-color: #E0C068; } .type-fairy { background-color: #EE99AC; } .type-fighting { background-color: #C03028; } .type-psychic { background-color: #F85888; } .type-rock { background-color: #B8A038; } .type-ghost { background-color: #705898; } .type-ice { background-color: #98D8D8; } .type-dragon { background-color: #7038F8; } .type-flying { background-color: #A890F0; } .type-steel { background-color: #B8B8D0; } .type-dark { background-color: #705848; }
    .loading-more-indicator { text-align: center; padding: 2rem; color: #718096; font-weight: 600; }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:5000/api';
  private readonly POKEMON_PAGE_LIMIT = 20;
  private offset = 0;
  private userPokemonsMap = new Map<string, UserPokemon>();
  
  private searchSubject = new Subject<string>();
  private searchSubscription: Subscription | null = null;
  isSearching = false;
  
  isSpecialView = false;
  currentView: 'all' | 'favorites' | 'battleTeam' = 'all';
  searchTerm: string = '';
  viewTitles = { all: 'Pokémon Descobertos', favorites: 'Meus Favoritos', battleTeam: 'Meu Time de Batalha' };
  isLoadingInitialData = true;

  selectedGenerationId: number = 0;
  generations = [
    { id: 0, name: 'Todas as Gerações', limit: 1025, offset: 0 },
    { id: 1, name: 'Geração 1', limit: 151, offset: 0 }, 
    { id: 2, name: 'Geração 2', limit: 100, offset: 151 },
    { id: 3, name: 'Geração 3', limit: 135, offset: 251 }, 
    { id: 4, name: 'Geração 4', limit: 107, offset: 386 },
    { id: 5, name: 'Geração 5', limit: 156, offset: 493 },
    { id: 6, name: 'Geração 6', limit: 72, offset: 649 },
    { id: 7, name: 'Geração 7', limit: 88, offset: 721 },
    { id: 8, name: 'Geração 8', limit: 96, offset: 809 },
    { id: 9, name: 'Geração 9', limit: 120, offset: 905 }
  ];

  isLoggedIn = false; user: User | null = null; authMode: 'login' | 'register' = 'login';
  pokemons: Pokemon[] = []; isLoadingMore = false; allPokemonsLoaded = false;
  authError: string | null = null; authSuccess: string | null = null;
  apiError: string | null = null; loginData = { login: '', senha: '' };
  registerData = { nome: '', login: '', email: '', senha: '' };
  
  get favoritesCount(): number { return Array.from(this.userPokemonsMap.values()).filter(p => p.favorito).length; }
  get battleTeamCount(): number { return Array.from(this.userPokemonsMap.values()).filter(p => p.grupo_batalha).length; }
  
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (this.isSpecialView || this.isSearching || this.allPokemonsLoaded || this.isLoadingMore) {
      return;
    }
    const pos = (document.documentElement.scrollTop || document.body.scrollTop) + document.documentElement.offsetHeight;
    const max = document.documentElement.scrollHeight;
    if (pos >= max - 300) {
      this.loadMorePokemons();
    }
  }

  ngOnInit() {
    this.checkLoginStatus();
    this.searchSubscription = this.searchSubject.pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(searchTerm => this.performSearch(searchTerm));
  }
  
  ngOnDestroy() { this.searchSubscription?.unsubscribe(); }

  checkLoginStatus() {
    const token = localStorage.getItem('pokedex_token');
    const userData = localStorage.getItem('pokedex_user');
    if (token && userData) {
      this.isLoggedIn = true; this.user = JSON.parse(userData);
      this.loadInitialPokemons();
    } else {
      this.isLoadingInitialData = false;
    }
  }
  
  setView(view: 'all' | 'favorites' | 'battleTeam') {
    this.currentView = view;
    this.searchTerm = '';
    this.isSearching = false;
    this.apiError = null;
    
    if (view === 'all') {
      this.isSpecialView = false;
      this.onGenerationChange(this.selectedGenerationId.toString());
    } else {
      this.isSpecialView = true;
      this.loadSpecialList();
    }
  }

  loadSpecialList() {
    this.isLoadingInitialData = true;
    this.pokemons = [];

    const isFavorites = this.currentView === 'favorites';
    const codes = Array.from(this.userPokemonsMap.values())
        .filter(p => isFavorites ? p.favorito : p.grupo_batalha)
        .map(p => p.codigo);

    if (codes.length === 0) {
      this.isLoadingInitialData = false;
      return;
    }

    const token = localStorage.getItem('pokedex_token');
    if (!token) { this.isLoadingInitialData = false; return; }
    const headers = new HttpHeaders().set('x-access-token', token);

    this.http.post<ApiPokemon[]>(`${this.apiUrl}/pokemon/batch`, { codes }, { headers }).subscribe({
        next: (apiPokemons) => {
            this.pokemons = this.mapApiPokemons(apiPokemons);
            this.isLoadingInitialData = false;
        },
        error: (err) => this.handleApiError(err)
    });
  }

  onGenerationChange(newGenId: string) {
    this.selectedGenerationId = Number(newGenId);
    this.searchTerm = '';
    this.loadInitialPokemons();
  }
  
  onLoginSubmit() {
    this.authError = null;
    this.http.post<any>(`${this.apiUrl}/login`, this.loginData).subscribe({
      next: (res) => {
        localStorage.setItem('pokedex_token', res.token); localStorage.setItem('pokedex_user', JSON.stringify(res.user));
        this.isLoggedIn = true; this.user = res.user;
        this.selectedGenerationId = 0;
        this.loadInitialPokemons();
      },
      error: (err) => { this.authError = err.error.message || 'Falha no login.'; }
    });
  }

  logout() {
    localStorage.clear();
    this.isLoggedIn = false; this.user = null; this.pokemons = [];
    this.offset = 0; this.allPokemonsLoaded = false;
    this.userPokemonsMap.clear(); this.loginData = { login: '', senha: '' };
    this.currentView = 'all'; this.searchTerm = ''; this.selectedGenerationId = 0;
    this.isSpecialView = false;
  }

  loadInitialPokemons() {
    const token = localStorage.getItem('pokedex_token');
    if (!token) return;
    const headers = new HttpHeaders().set('x-access-token', token);
    
    const selectedGen = this.generations.find(g => g.id == this.selectedGenerationId) ?? this.generations[0];
    
    this.isLoadingInitialData = true; this.apiError = null; this.pokemons = []; 
    this.offset = selectedGen.offset;
    this.allPokemonsLoaded = false;

    // carga inicial e sempre de 20 pokemon
    const limit = this.POKEMON_PAGE_LIMIT;

    forkJoin({
      apiPokemons: this.http.get<ApiPokemon[]>(`${this.apiUrl}/pokemon?limit=${limit}&offset=${this.offset}`, { headers }),
      userPokemons: this.http.get<UserPokemon[]>(`${this.apiUrl}/user/pokemons`, { headers })
    }).subscribe({
      next: ({ apiPokemons, userPokemons }) => {
        this.userPokemonsMap = new Map(userPokemons.map(p => [p.codigo, p]));
        this.pokemons = this.mapApiPokemons(apiPokemons);
        this.offset += limit;
        this.isLoadingInitialData = false;
      },
      error: (err) => { this.handleApiError(err); }
    });
  }

  loadMorePokemons() {
    if (this.isLoadingMore) return;
    const token = localStorage.getItem('pokedex_token');
    if (!token) return;
    const headers = new HttpHeaders().set('x-access-token', token);

    this.isLoadingMore = true;

    // define o final do range da geracao atual para saber quando parar
    const selectedGen = this.generations.find(g => g.id === this.selectedGenerationId) ?? this.generations[0];
    const endOfGenerationOffset = selectedGen.offset + selectedGen.limit;
    
    // calcula quantos pokemons faltam para carregar
    const remaining = endOfGenerationOffset - this.offset;
    const limit = Math.min(this.POKEMON_PAGE_LIMIT, remaining);

    if (limit <= 0) {
      this.allPokemonsLoaded = true;
      this.isLoadingMore = false;
      return;
    }

    this.http.get<ApiPokemon[]>(`${this.apiUrl}/pokemon?limit=${limit}&offset=${this.offset}`, { headers })
      .subscribe({
        next: (newApiPokemons) => {
          if (newApiPokemons.length > 0) {
            this.pokemons.push(...this.mapApiPokemons(newApiPokemons));
            this.offset += newApiPokemons.length;
          }
          // se carregar menos que o limite, ou alcanca o final da geracao, para
          if (newApiPokemons.length < limit || this.offset >= endOfGenerationOffset) {
            this.allPokemonsLoaded = true;
          }
          this.isLoadingMore = false;
        },
        error: (err) => { this.isLoadingMore = false; this.handleApiError(err); }
      });
  }
  
  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  performSearch(term: string): void {
    this.apiError = null;
    if (!term.trim()) {
      this.isSearching = false;
      this.setView(this.currentView);
      return;
    }

    this.isSearching = true; this.isLoadingInitialData = true; this.pokemons = [];
    const token = localStorage.getItem('pokedex_token');
    if (!token) return;
    const headers = new HttpHeaders().set('x-access-token', token);

    this.http.get<ApiPokemon>(`${this.apiUrl}/pokemon/${term.toLowerCase()}`, { headers }).subscribe({
      next: (apiPokemon) => {
        this.pokemons = this.mapApiPokemons([apiPokemon]);
        this.isLoadingInitialData = false;
      },
      error: (err) => {
        this.apiError = (err.status === 404) ? `Pokémon "${term}" não encontrado.` : 'Erro ao buscar Pokémon.';
        this.isLoadingInitialData = false;
      }
    });
  }

  private mapApiPokemons(apiPokemons: ApiPokemon[]): Pokemon[] {
    return apiPokemons.map(apiPokemon => ({
      ...apiPokemon,
      isFavorite: this.userPokemonsMap.get(apiPokemon.id)?.favorito ?? false,
      isInBattleTeam: this.userPokemonsMap.get(apiPokemon.id)?.grupo_batalha ?? false
    }));
  }

  toggleFavorite(pokemon: Pokemon) {
    pokemon.isFavorite = !pokemon.isFavorite;
    this.updatePokemonOnServer(pokemon, { favorito: pokemon.isFavorite });
  }

  toggleBattleTeam(pokemon: Pokemon) {
    if (!pokemon.isInBattleTeam && this.battleTeamCount >= 6) {
      alert("O time de batalha já está cheio!"); return;
    }
    pokemon.isInBattleTeam = !pokemon.isInBattleTeam;
    this.updatePokemonOnServer(pokemon, { grupo_batalha: pokemon.isInBattleTeam });
  }

  private updatePokemonOnServer(pokemon: Pokemon, payload: { favorito?: boolean; grupo_batalha?: boolean; }) {
    const token = localStorage.getItem('pokedex_token');
    if (!token) return;
    const headers = new HttpHeaders().set('x-access-token', token);
    const body = { codigo: pokemon.id, nome: pokemon.name, imagem_url: pokemon.imageUrl, ...payload };

    this.http.post<any>(`${this.apiUrl}/user/pokemons`, body, { headers }).subscribe({
      next: (res) => {
        const updated = res.pokemon;
        this.userPokemonsMap.set(updated.codigo, { ...this.userPokemonsMap.get(updated.codigo), ...updated });
      },
      error: (err) => {
        alert('Erro ao salvar: ' + (err.error.message || 'Tente novamente.'));
        if (payload.favorito !== undefined) pokemon.isFavorite = !payload.favorito;
        if (payload.grupo_batalha !== undefined) pokemon.isInBattleTeam = !payload.grupo_batalha;
      }
    });
  }

  private handleApiError(err: any) {
    this.apiError = 'Não foi possível carregar os Pokémon.';
    this.isLoadingInitialData = false;
    if (err.status === 401) this.logout();
  }

  onRegisterSubmit() {
    this.authError = null;
    this.authSuccess = null;

    // validacao do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.registerData.email || !emailRegex.test(this.registerData.email)) {
      this.authError = 'Por favor, insira um e-mail válido.';
      return;
    }

    // validacao da senha
    if (this.registerData.senha.length < 6) {
      this.authError = 'A senha deve ter no mínimo 6 caracteres.';
      return;
    }
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharRegex.test(this.registerData.senha)) {
      this.authError = 'A senha deve conter pelo menos um caractere especial (ex: !@#$).';
      return;
    }

    this.http.post<any>(`${this.apiUrl}/register`, this.registerData).subscribe({
      next: (res) => { 
        this.authSuccess = `${res.message} Agora pode fazer o login.`; 
        this.switchAuthMode('login'); 
      },
      error: (err) => { 
        this.authError = err.error.message || 'Ocorreu um erro no registro.'; 
      }
    });
  }

  switchAuthMode(mode: 'login' | 'register') {
    this.authMode = mode; this.authError = null; this.authSuccess = null;
  }
  
  capitalizeFirstLetter(name: string): string { return name ? name.charAt(0).toUpperCase() + name.slice(1) : ''; }
  onImageError(event: Event) { (event.target as HTMLImageElement).src = 'https://placehold.co/160x160/f8f8f8/ccc?text=Pkm'; }
}

