# PlanilhaPRO - SaaS de Gestão Financeira

Um aplicativo web moderno de gestão financeira construído com **React**, **Vite**, **Firebase** e **Tailwind CSS**. Perfeito para pequenas empresas e freelancers gerenciarem suas receitas e despesas na nuvem.

## 🚀 Características Principais

- **Dashboard Intuitivo**: Visualize receitas, despesas e saldo em tempo real
- **Gestão de Lançamentos**: Adicione, categorize e delete registros financeiros
- **Autenticação Firebase**: Sistema seguro de login e registro
- **Sincronização em Nuvem**: Todos os dados salvos no Firestore
- **Categorias Personalizáveis**: Crie suas próprias categorias de receita/despesa
- **Exportação de Relatórios**: Imprima seus dados financeiros
- **Interface Responsiva**: Funciona perfeitamente em desktop, tablet e mobile
- **Modo Escuro**: Design moderno com Tailwind CSS

## 📋 Pré-requisitos

- Node.js 16+ e npm/pnpm
- Conta Firebase (gratuita em https://firebase.google.com)
- Git (opcional)

## 🔧 Instalação

### 1. Clonar ou Extrair o Projeto

```bash
# Se estiver em um arquivo ZIP
unzip planilhapro-saas.zip
cd planilhapro-saas

# Ou clonar do repositório
git clone <seu-repositorio>
cd planilhapro-saas
```

### 2. Instalar Dependências

```bash
npm install
# ou
pnpm install
```

### 3. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Edite `.env.local` e adicione suas credenciais do Firebase:

```env
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id

VITE_APP_NAME=PlanilhaPRO
VITE_APP_ID=planilhapro-saas
```

### 4. Obter Credenciais do Firebase

1. Aceda a [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto ou selecione um existente
3. Vá para **Configurações do Projeto** → **Geral**
4. Copie as credenciais da seção "Seus aplicativos da web"
5. Cole em `.env.local`

### 5. Configurar Firestore

1. No Firebase Console, vá para **Firestore Database**
2. Clique em **Criar banco de dados**
3. Escolha **Modo de produção**
4. Selecione a região mais próxima
5. Clique em **Criar**

### 6. Configurar Regras de Segurança (Importante!)

No Firestore, vá para a aba **Regras** e substitua pelo seguinte:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/entries/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

## 🏃 Executar o Projeto

### Desenvolvimento

```bash
npm run dev
# ou
pnpm dev
```

A aplicação abrirá automaticamente em `http://localhost:3000`

### Build para Produção

```bash
npm run build
# ou
pnpm build
```

Os arquivos compilados estarão em `dist/`

### Pré-visualizar Build

```bash
npm run preview
# ou
pnpm preview
```

## 📦 Estrutura do Projeto

```
planilhapro-saas/
├── src/
│   ├── App.jsx           # Componente principal da aplicação
│   ├── main.jsx          # Ponto de entrada
│   └── index.css         # Estilos globais
├── index.html            # HTML raiz
├── vite.config.js        # Configuração do Vite
├── tailwind.config.js    # Configuração do Tailwind
├── postcss.config.js     # Configuração do PostCSS
├── .eslintrc.cjs         # Configuração do ESLint
├── .env.example          # Variáveis de ambiente (exemplo)
├── .gitignore            # Arquivos ignorados pelo Git
├── package.json          # Dependências do projeto
└── README.md             # Este arquivo
```

## 🚀 Deploy

### Vercel (Recomendado)

1. Faça push do seu código para GitHub
2. Aceda a [Vercel](https://vercel.com)
3. Clique em **New Project** e selecione seu repositório
4. Adicione as variáveis de ambiente em **Settings** → **Environment Variables**
5. Clique em **Deploy**

### Netlify

1. Conecte seu repositório GitHub
2. Configure o comando de build: `npm run build`
3. Configure o diretório de publicação: `dist`
4. Adicione variáveis de ambiente em **Site settings** → **Build & deploy** → **Environment**
5. Deploy automático após cada push

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 🔐 Segurança

- **Nunca** comita o arquivo `.env.local` com credenciais reais
- Use variáveis de ambiente em produção
- Mantenha as regras de Firestore atualizadas
- Revise regularmente as permissões de acesso

## 📚 Dependências Principais

| Pacote | Versão | Descrição |
|--------|--------|-----------|
| React | ^18.2.0 | Biblioteca UI |
| Vite | ^5.0.8 | Build tool |
| Firebase | ^10.7.0 | Backend e autenticação |
| Tailwind CSS | ^3.4.1 | Framework CSS |
| Lucide React | ^0.344.0 | Ícones |

## 🐛 Troubleshooting

### "Firebase config not found"
- Verifique se `.env.local` existe e tem as variáveis corretas
- Reinicie o servidor de desenvolvimento

### "Permission denied" no Firestore
- Verifique as regras de segurança do Firestore
- Certifique-se de que está autenticado

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Consulte a [documentação do Firebase](https://firebase.google.com/docs)
2. Verifique o [guia do Vite](https://vitejs.dev)
3. Consulte a [documentação do Tailwind](https://tailwindcss.com)

## 📄 Licença

Este projeto é fornecido como está. Sinta-se livre para usar, modificar e distribuir conforme necessário.

## 🎯 Roadmap Futuro

- [ ] Gráficos e análises avançadas
- [ ] Exportação em PDF e Excel
- [ ] Integração com APIs de banco
- [ ] Suporte a múltiplas moedas
- [ ] Aplicativo mobile (React Native)
- [ ] Sistema de notificações

---

**Desenvolvido com ❤️ para pequenas empresas e freelancers**
