# PartyHub Frontend 🕹️✨

Interface web moderna, responsiva e de alta imersão para a plataforma de jogos de festa em tempo real **PartyHub**. Desenvolvido com **React 19**, **TypeScript**, **TailwindCSS**, **Framer Motion**, **Zustand** e **@dnd-kit**.

---

## 🎮 Jogos Disponíveis

1. **ITTO:**
   - Jogo cooperativo de dedução intuitiva com cartas numeradas de 1 a 100.
   - Ordenação fluida via drag-and-drop (`rectSortingStrategy`) sem saltos visuais.
   - Acompanhamento em tempo real dos jogadores digitando suas pistas.
   - Revelação gradual dramática com suspensão e avanço manual de nível.
2. **Hanabi:**
   - Jogo cooperativo de fogos de artifício com informações ocultas (você não vê suas cartas).
   - Suporte aos modos de jogo: Clássico, 6ª Cor, Arco-Íris Completo e Show Perfeito.
   - Animações pirotécnicas otimizadas via canvas, banners destacados de turno e realces reativos de dicas.
3. **Cartas Contra a Humanidade (CAH):**
   - Jogo de cartas politicamente incorreto para até 12 jogadores.
   - Suporte dinâmico a cartas pretas com 1, 2, 3 ou mais lacunas.
   - Revelação interativa 3D das cartas viradas pelo Czar.
   - Modal sincronizado de comemoração do vencedor com frases preenchidas e pontuação no placar.

---

## 🛠️ Tecnologias Utilizadas

- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [TailwindCSS](https://tailwindcss.com/) com overlays CRT retro e glassmorphism
- **Gerenciamento de Estado:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Animações:** [Framer Motion](https://www.framer.com/motion/)
- **Drag and Drop:** [@dnd-kit](https://dndkit.com/)
- **Partículas & Confetes:** [canvas-confetti](https://www.npmjs.com/package/canvas-confetti)
- **Servidor Web em Produção:** Nginx com compressão Gzip e roteamento SPA

---

## 🏗️ Estrutura de Diretórios

```
partyhub-front/
├── devops/               # Dockerfile multi-stage, docker-compose.yml e nginx.conf
├── public/               # Assets estáticos públicos
├── src/
│   ├── components/       # Componentes visuais reutilizáveis
│   ├── lib/              # Cliente HTTP nativo da API Go (api.ts)
│   ├── pages/            # Telas da aplicação:
│   │   ├── Auth.tsx      # Login e Registro de contas
│   │   ├── Hub.tsx       # Seleção de jogos e criação de salas
│   │   ├── Profile.tsx   # Dashboard de perfil e estatísticas
│   │   ├── IttoGameRoom.tsx   # Mesa do jogo ITTO
│   │   ├── HanabiGameRoom.tsx # Mesa do jogo Hanabi
│   │   └── CahGameRoom.tsx    # Mesa de Cartas Contra a Humanidade
│   ├── store/            # Stores do Zustand para WebSocket e Auth
│   ├── App.tsx           # Configuração de rotas
│   └── main.tsx          # Ponto de montagem da aplicação
├── .env.example          # Modelo das variáveis de ambiente do frontend
├── package.json          # Dependências e scripts
└── vite.config.ts        # Configuração do Vite
```

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do frontend baseado no `.env.example`:

| Variável | Descrição | Padrão / Exemplo |
| :--- | :--- | :--- |
| `VITE_API_URL` | URL base da API REST do backend Go | `http://localhost:3333` |
| `VITE_WS_URL` | URL base do WebSocket do backend Go | `ws://localhost:3333/ws` |

> **Nota de Segurança:** O frontend não se comunica diretamente com serviços externos de banco de dados ou Supabase. Todas as requisições passam exclusivamente pelo backend seguro em Go.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js 20+** e **npm** instalados
- Backend do PartyHub em execução na porta `3333`

### Passos
1. Clone o repositório:
   ```bash
   git clone https://github.com/Gravery/partyhub-frontend.git
   cd partyhub-frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie as variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:5173`.

5. Para validar a compilação de produção:
   ```bash
   npm run build
   ```

---

## 🐳 Executando com Docker

### Build e Execução Manual
```bash
# Build da imagem de produção com Vite e Nginx
docker build -t partyhub-frontend -f devops/Dockerfile .

# Execução do container servindo na porta 80
docker run -d -p 80:80 --name partyhub-frontend partyhub-frontend
```

### Com Docker Compose
```bash
docker compose -f devops/docker-compose.yml up -d
```
Acesse `http://localhost` no navegador.
