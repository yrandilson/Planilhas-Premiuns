# Guia de Deploy - PlanilhaPRO

Este documento fornece instruções passo a passo para fazer deploy da aplicação PlanilhaPRO em diferentes plataformas.

## 🚀 Opção 1: Vercel (Recomendado)

Vercel é a plataforma ideal para aplicações Vite + React com deploy automático.

### Passo 1: Preparar o Repositório

```bash
git init
git add .
git commit -m "Initial commit: PlanilhaPRO SaaS"
git branch -M main
```

### Passo 2: Fazer Push para GitHub

```bash
git remote add origin https://github.com/seu-usuario/planilhapro-saas.git
git push -u origin main
```

### Passo 3: Conectar ao Vercel

1. Aceda a [vercel.com](https://vercel.com)
2. Clique em **Sign Up** e autentique com GitHub
3. Clique em **New Project**
4. Selecione o repositório `planilhapro-saas`
5. Configure as variáveis de ambiente:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_APP_NAME`
   - `VITE_APP_ID`

6. Clique em **Deploy**

### Passo 4: Configurar Domínio (Opcional)

1. Vá para **Settings** → **Domains**
2. Adicione seu domínio personalizado
3. Configure os registos DNS conforme instruído

---

## 🚀 Opção 2: Netlify

### Passo 1: Conectar Repositório

1. Aceda a [netlify.com](https://netlify.com)
2. Clique em **Sign up** e autentique com GitHub
3. Clique em **New site from Git**
4. Selecione seu repositório

### Passo 2: Configurar Build

- **Build command**: `npm run build`
- **Publish directory**: `dist`

### Passo 3: Adicionar Variáveis de Ambiente

1. Vá para **Site settings** → **Build & deploy** → **Environment**
2. Clique em **Edit variables**
3. Adicione todas as variáveis do `.env.local`

### Passo 4: Deploy

Clique em **Deploy site**

---

## 🚀 Opção 3: Firebase Hosting

### Passo 1: Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### Passo 2: Autenticar

```bash
firebase login
```

### Passo 3: Inicializar Firebase

```bash
firebase init hosting
```

Respostas recomendadas:
- **What do you want to use as your public directory?** → `dist`
- **Configure as a single-page app?** → `Yes`

### Passo 4: Build e Deploy

```bash
npm run build
firebase deploy
```

---

## 🚀 Opção 4: Docker + Qualquer Servidor

### Passo 1: Criar Dockerfile

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Passo 2: Criar nginx.conf

```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Passo 3: Build e Deploy

```bash
docker build -t planilhapro-saas .
docker run -p 80:80 -e VITE_FIREBASE_API_KEY=xxx ... planilhapro-saas
```

---

## ✅ Checklist Pré-Deploy

- [ ] Arquivo `.env.local` criado com todas as variáveis
- [ ] Firebase Firestore configurado e ativo
- [ ] Regras de Firestore atualizadas
- [ ] Build local testado: `npm run build`
- [ ] Sem erros de console
- [ ] Autenticação Firebase funcionando
- [ ] Dados sendo salvos no Firestore
- [ ] Responsividade testada em mobile

---

## 🔐 Variáveis de Ambiente Necessárias

```env
VITE_FIREBASE_API_KEY=<sua_api_key>
VITE_FIREBASE_AUTH_DOMAIN=<seu_projeto>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<seu_projeto>
VITE_FIREBASE_STORAGE_BUCKET=<seu_projeto>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<seu_sender_id>
VITE_FIREBASE_APP_ID=<seu_app_id>
VITE_APP_NAME=PlanilhaPRO
VITE_APP_ID=planilhapro-saas
```

---

## 🔍 Verificar Deploy

Após o deploy, verifique:

1. **Acesso à aplicação**: Abra a URL do seu site
2. **Login funciona**: Tente criar uma conta
3. **Dados salvam**: Adicione um lançamento e recarregue
4. **Console sem erros**: Abra DevTools (F12) e verifique

---

## 🆘 Troubleshooting

### "CORS Error"
- Verifique se o domínio está autorizado no Firebase
- Vá para Firebase Console → Authentication → Settings

### "Build fails"
```bash
rm -rf node_modules dist
npm install
npm run build
```

### "Firestore permission denied"
- Verifique as regras de segurança
- Certifique-se de que está autenticado

### "Variáveis de ambiente não funcionam"
- Reinicie o servidor de build
- Verifique se os nomes estão corretos (começam com `VITE_`)

---

## 📊 Monitoramento

### Vercel
- Dashboard automático em vercel.com
- Logs em real-time
- Alertas de erro

### Netlify
- Analytics em netlify.com
- Logs de build
- Integração com Slack

### Firebase
- Firebase Console → Analytics
- Performance Monitoring
- Crash Reporting

---

## 🚀 CI/CD Automático

### GitHub Actions

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

---

## 📞 Suporte

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Netlify](https://docs.netlify.com)
- [Documentação Firebase](https://firebase.google.com/docs)
- [Documentação Vite](https://vitejs.dev)

---

**Sucesso no seu deploy! 🎉**
