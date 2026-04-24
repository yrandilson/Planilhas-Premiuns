# 📖 Guia Completo de Instalação - PlanilhaPRO

Instruções detalhadas para configurar e executar o PlanilhaPRO em sua máquina.

## 📋 Pré-requisitos

Antes de começar, certifique-se de que tem instalado:

- **Node.js 16+** - [Descarregar](https://nodejs.org/)
- **npm** ou **pnpm** - Vem com Node.js
- **Git** (opcional) - [Descarregar](https://git-scm.com/)
- **Conta Firebase** - [Criar gratuitamente](https://firebase.google.com)

### Verificar Instalação

```bash
node --version    # Deve ser v16 ou superior
npm --version     # Deve ser v8 ou superior
```

---

## 🔧 Passo 1: Extrair o Projeto

### Se recebeu um arquivo ZIP:

```bash
# Windows (PowerShell)
Expand-Archive -Path planilhapro-saas.zip -DestinationPath .
cd planilhapro-saas

# macOS / Linux
unzip planilhapro-saas.zip
cd planilhapro-saas
```

### Ou clonar do GitHub:

```bash
git clone https://github.com/seu-usuario/planilhapro-saas.git
cd planilhapro-saas
```

---

## 📦 Passo 2: Instalar Dependências

```bash
npm install
```

Ou com pnpm (mais rápido):

```bash
pnpm install
```

Isso vai instalar:
- React 18.2
- Vite 5
- Firebase 10.7
- Tailwind CSS 3.4
- Lucide Icons

⏱️ Tempo estimado: 2-5 minutos

---

## 🔑 Passo 3: Configurar Firebase

### 3.1 Criar Projeto Firebase

1. Aceda a [Firebase Console](https://console.firebase.google.com)
2. Clique em **Criar projeto**
3. Digite um nome (ex: `planilhapro`)
4. Aceite os termos e clique em **Continuar**
5. Desative o Google Analytics (opcional)
6. Clique em **Criar projeto**

### 3.2 Obter Credenciais

1. No Firebase Console, clique no ícone **⚙️ Configurações** (canto superior)
2. Selecione **Configurações do Projeto**
3. Vá para a aba **Geral**
4. Procure a seção **"Seus aplicativos da web"**
5. Se não houver nenhum, clique em **</> Web**
6. Copie o objeto de configuração que aparece

Deve parecer assim:

```javascript
{
  apiKey: "AIzaSyDxxx...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxx"
}
```

### 3.3 Criar Arquivo .env.local

Na raiz do projeto, crie um arquivo chamado `.env.local`:

```bash
# Windows (PowerShell)
New-Item -Path ".env.local" -ItemType File

# macOS / Linux
touch .env.local
```

Abra o arquivo em um editor de texto (VS Code, Notepad, etc.) e adicione:

```env
VITE_FIREBASE_API_KEY=AIzaSyDxxx...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:xxx

VITE_APP_NAME=PlanilhaPRO
VITE_APP_ID=planilhapro-saas
```

**Importante:** Substitua os valores pelos seus dados do Firebase!

---

## 🗄️ Passo 4: Configurar Firestore

### 4.1 Criar Banco de Dados

1. No Firebase Console, vá para **Firestore Database** (no menu esquerdo)
2. Clique em **Criar banco de dados**
3. Escolha **Modo de produção** (mais seguro)
4. Selecione a região mais próxima:
   - Portugal: `europe-west1` (Bélgica)
   - Brasil: `southamerica-east1` (São Paulo)
   - EUA: `us-central1`
5. Clique em **Criar**

### 4.2 Configurar Regras de Segurança

1. No Firestore, vá para a aba **Regras**
2. Substitua todo o conteúdo por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura e escrita apenas para o utilizador autenticado
    match /artifacts/{appId}/users/{userId}/entries/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

3. Clique em **Publicar**

### 4.3 Ativar Autenticação

1. No Firebase, vá para **Authentication** (no menu esquerdo)
2. Clique na aba **Configuração de inscrição**
3. Ative **Email/Palavra-passe**
4. Salve as alterações

---

## ✅ Passo 5: Testar Localmente

### Iniciar Servidor de Desenvolvimento

```bash
npm run dev
```

Deve ver algo como:

```
  VITE v5.0.8  ready in 234 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

### Abrir no Navegador

1. Abra http://localhost:3000 no seu navegador
2. Deve ver a tela de login do PlanilhaPRO

### Testar Funcionalidades

1. **Criar Conta**: Clique em "Adquirir Acesso"
2. **Fazer Login**: Use o email que criou
3. **Adicionar Lançamento**: Vá para "Lançamentos" e adicione um registo
4. **Verificar Dados**: Recarregue a página - os dados devem persistir

---

## 🚀 Passo 6: Build para Produção

Quando estiver pronto para deploy:

```bash
npm run build
```

Isso cria uma pasta `dist/` com os arquivos otimizados para produção.

---

## 🐛 Troubleshooting

### "Cannot find module 'react'"

```bash
rm -rf node_modules package-lock.json
npm install
```

### "VITE_FIREBASE_API_KEY is not defined"

- Verifique se `.env.local` existe na raiz do projeto
- Verifique se os nomes das variáveis começam com `VITE_`
- Reinicie o servidor: `Ctrl+C` e `npm run dev`

### "Firebase config not found"

- Certifique-se de que copiou corretamente as credenciais
- Verifique se não há espaços extras no `.env.local`

### "Permission denied" no Firestore

- Verifique as regras de segurança
- Certifique-se de que está autenticado
- Tente fazer logout e login novamente

### "Blank page" no navegador

1. Abra DevTools: `F12` ou `Ctrl+Shift+I`
2. Vá para a aba **Console**
3. Procure por mensagens de erro
4. Copie o erro e procure na [documentação do Firebase](https://firebase.google.com/docs)

---

## 📁 Estrutura do Projeto

```
planilhapro-saas/
├── src/
│   ├── App.jsx              # Componente principal
│   ├── main.jsx             # Ponto de entrada
│   └── index.css            # Estilos globais
├── index.html               # HTML raiz
├── package.json             # Dependências
├── vite.config.js           # Configuração Vite
├── tailwind.config.js       # Configuração Tailwind
├── .env.local               # Variáveis de ambiente (não commitar!)
├── .env.example             # Template de variáveis
├── README.md                # Documentação
├── QUICK_START.md           # Guia rápido
└── DEPLOYMENT.md            # Guia de deploy
```

---

## 🔐 Segurança

### ⚠️ IMPORTANTE

- **Nunca** comita o arquivo `.env.local` no Git
- **Nunca** compartilhe suas credenciais Firebase
- O arquivo `.gitignore` já protege `.env.local`

### Verificar se está protegido:

```bash
git status
```

Não deve listar `.env.local`

---

## 🎯 Próximos Passos

Após a instalação bem-sucedida:

1. ✅ Explore a interface
2. ✅ Teste todas as funcionalidades
3. ✅ Customize as categorias
4. ✅ Leia [DEPLOYMENT.md](./DEPLOYMENT.md) para fazer deploy
5. ✅ Configure seu domínio personalizado

---

## 📞 Suporte

Se tiver problemas:

1. Consulte [README.md](./README.md)
2. Consulte [QUICK_START.md](./QUICK_START.md)
3. Verifique a [documentação do Firebase](https://firebase.google.com/docs)
4. Verifique a [documentação do Vite](https://vitejs.dev)

---

## 🎉 Parabéns!

Sua aplicação PlanilhaPRO está pronta! 

Agora você pode:
- Usar localmente para desenvolvimento
- Fazer deploy em produção
- Compartilhar com clientes
- Customizar conforme necessário

**Sucesso! 🚀**
