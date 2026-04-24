# 🚀 Guia Rápido - PlanilhaPRO

Comece em 5 minutos!

## 1️⃣ Extrair o Projeto

```bash
unzip planilhapro-saas.zip
cd planilhapro-saas
```

## 2️⃣ Instalar Dependências

```bash
npm install
```

## 3️⃣ Configurar Firebase

### Obter Credenciais

1. Aceda a https://console.firebase.google.com
2. Crie um novo projeto (ou use um existente)
3. Vá para **Configurações do Projeto** → **Geral**
4. Copie as credenciais da seção "Seus aplicativos da web"

### Criar .env.local

```bash
cp .env.example .env.local
```

Edite `.env.local` e cole suas credenciais:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

## 4️⃣ Configurar Firestore

1. No Firebase Console, vá para **Firestore Database**
2. Clique em **Criar banco de dados**
3. Escolha **Modo de produção**
4. Selecione uma região
5. Vá para a aba **Regras** e adicione:

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

## 5️⃣ Executar Localmente

```bash
npm run dev
```

Abra http://localhost:3000 no seu navegador!

## 6️⃣ Fazer Deploy

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel
```

Siga as instruções e adicione as variáveis de ambiente.

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Primeiro faça `npm run build`

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## ✅ Pronto!

Sua aplicação está rodando! 🎉

### Próximos Passos

- [ ] Teste o login/registro
- [ ] Adicione alguns lançamentos
- [ ] Verifique se os dados estão sendo salvos
- [ ] Customize as categorias
- [ ] Faça deploy em produção

---

## 📚 Documentação Completa

- [README.md](./README.md) - Documentação completa
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guia de deploy detalhado

---

**Dúvidas? Consulte a [documentação do Firebase](https://firebase.google.com/docs)**
