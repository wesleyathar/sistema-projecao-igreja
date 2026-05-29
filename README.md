# Sistema de Projeção - Igreja Canaã

Sistema profissional de projeção de letras de músicas para igrejas, com sincronização em tempo real entre dispositivos.

## 🚀 Deploy na Web (Render)

### Pré-requisitos
- Conta no GitHub (gratuita)
- Conta no Render (gratuita)

### Passo a Passo

#### 1. Criar Repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em "New repository"
3. Nome: `sistema-projecao-igreja`
4. Deixe como **Público** (necessário para plano gratuito do Render)
5. Clique em "Create repository"

#### 2. Enviar Código para o GitHub

Abra o PowerShell na pasta `c:\Sistema` e execute:

```powershell
# Inicializar Git
git init

# Adicionar todos os arquivos
git add .

# Fazer primeiro commit
git commit -m "Deploy inicial do sistema de projeção"

# Conectar ao GitHub (substitua SEU-USUARIO pelo seu usuário do GitHub)
git remote add origin https://github.com/SEU-USUARIO/sistema-projecao-igreja.git

# Enviar código
git branch -M main
git push -u origin main
```

> **Nota:** Se for a primeira vez usando Git, você precisará configurar:
> ```powershell
> git config --global user.name "Seu Nome"
> git config --global user.email "seu@email.com"
> ```

#### 3. Deploy no Render

1. Acesse [render.com](https://render.com) e faça login (pode usar conta do GitHub)
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Selecione `sistema-projecao-igreja`
5. Configure:
   - **Name:** `sistema-projecao-igreja` (ou qualquer nome)
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
6. Clique em "Create Web Service"

#### 4. Aguardar Deploy

- O Render vai instalar as dependências e iniciar o servidor
- Isso leva cerca de 2-5 minutos
- Você verá os logs em tempo real
- Quando aparecer "Your service is live 🎉", está pronto!

#### 5. Acessar o Sistema

Seu sistema estará disponível em:
```
https://sistema-projecao-igreja.onrender.com
```

**URLs importantes:**
- Menu Principal: `https://SEU-APP.onrender.com`
- Tela de Projeção: `https://SEU-APP.onrender.com/#display`
- Controle: `https://SEU-APP.onrender.com/#control`
- Bíblia: `https://SEU-APP.onrender.com/#bible`

---

## 💻 Desenvolvimento Local

### Instalar Dependências
```bash
npm install
```

### Iniciar Servidor
```bash
npm start
```

Ou use o arquivo `INICIAR_SISTEMA.bat`

### Acessar Localmente
- http://localhost:3000

---

## 📱 Funcionalidades

- ✅ Busca de letras de músicas online (LRCLIB API)
- ✅ Biblioteca de músicas salvas
- ✅ Sincronização em tempo real entre dispositivos
- ✅ Controle remoto via celular/tablet
- ✅ Projeção em tela cheia
- ✅ Suporte a vídeos e anúncios
- ✅ Bíblia integrada (NVI)
- ✅ Progressive Web App (instalável)

---

## ⚙️ Tecnologias

- **Backend:** Node.js + WebSocket
- **Frontend:** HTML5 + CSS3 + JavaScript Vanilla
- **APIs:** LRCLIB (letras de músicas)
- **Hospedagem:** Render

---

## 📝 Notas Importantes

### Limitações do Plano Gratuito do Render

- ⏰ Servidor "dorme" após 15 minutos sem uso
- 🐌 Primeiro acesso após inatividade demora ~30 segundos
- 💾 Dados persistem (arquivo `lyrics.json` é mantido)

### Para Uso em Cultos

Se você vai usar durante um culto:
1. Acesse o sistema 5 minutos antes para "acordá-lo"
2. Mantenha uma aba aberta durante todo o culto
3. Ou considere upgrade para plano pago ($7/mês) para evitar "sleep"

---

## 🔒 Segurança

O sistema está publicamente acessível. Para adicionar proteção:

1. Anote o URL exato e compartilhe apenas com pessoas autorizadas
2. Considere adicionar autenticação básica (posso ajudar com isso)
3. Use URLs longas e difíceis de adivinhar

---

## 🆘 Suporte

Se tiver problemas:
1. Verifique os logs no painel do Render
2. Teste localmente primeiro com `npm start`
3. Certifique-se de que todas as dependências foram instaladas

---

## 📄 Licença

Sistema desenvolvido para Igreja Caminhando para Canaã.
