# Lançar pelo WhatsApp — guia de configuração (Twilio Sandbox)

Protótipo que permite registrar lançamentos pelo WhatsApp por **texto** ("gastei 45 no uber")
ou **foto** de comprovante. Usa o **Twilio WhatsApp Sandbox** (grátis para testar) + um
webhook na Vercel (`api/whatsapp.js`) + Firebase Admin para gravar no Firestore.

> O código já está pronto. Falta você criar as contas externas e configurar 4 variáveis de
> ambiente na Vercel. Leva ~15 minutos.

## 1. Twilio Sandbox

1. Crie uma conta em [twilio.com/try-twilio](https://www.twilio.com/try-twilio) (ganha crédito de teste).
2. No console: **Messaging → Try it out → Send a WhatsApp message**.
3. Anote o **número do sandbox** (padrão `+1 415 523 8886`) e o **join code** (ex.: `join blue-tiger`).
4. Ainda nessa página, aba **Sandbox settings**: em **"When a message comes in"** cole a URL do webhook:
   ```
   https://SEU-APP.vercel.app/api/whatsapp
   ```
   Método **HTTP POST**. Salve.
5. No painel da conta, copie **Account SID** e **Auth Token**.

## 2. Firebase — conta de serviço (para o servidor gravar sem login)

1. [Firebase Console](https://console.firebase.google.com) → seu projeto (`finance-826f6`) →
   **Configurações do projeto → Contas de serviço → Gerar nova chave privada**.
2. Baixa um `.json`. Abra e copie **todo o conteúdo** (é o valor da env var abaixo).

## 3. Anthropic (para a foto de comprovante)

Já é a mesma chave usada pela IA de foto do app. Se ainda não tiver, pegue em
[console.anthropic.com](https://console.anthropic.com) → API Keys.

## 4. Variáveis de ambiente na Vercel

No projeto na Vercel → **Settings → Environment Variables**, adicione (Production + Preview):

| Nome | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | o JSON inteiro da conta de serviço (passo 2) |
| `TWILIO_ACCOUNT_SID` | Account SID da Twilio |
| `TWILIO_AUTH_TOKEN` | Auth Token da Twilio |
| `ANTHROPIC_KEY` | sua chave da Anthropic |

Depois **faça um redeploy** para as variáveis valerem.

## 5. Conectar seu número e testar

1. No app: **Mais → WhatsApp**. Copie o **código de 6 dígitos**.
2. No WhatsApp, mande `join <join-code-do-sandbox>` para o número do sandbox.
3. Mande o **código de 6 dígitos** — deve responder "✅ WhatsApp vinculado!".
4. Teste:
   - Texto: `gastei 45 no uber` → "✅ Despesa de R$ 45,00 em Transporte registrada."
   - Foto: mande a foto de um recibo → ele lê valor/categoria e registra.
5. Abra o app: os lançamentos aparecem na aba **Transações** (marcados com origem `whatsapp`).

## Notas

- **Segurança:** o webhook valida a assinatura da Twilio (`X-Twilio-Signature`). Se a validação
  falhar por causa da URL, você pode setar `WHATSAPP_VALIDATE=off` temporariamente na Vercel
  para depurar — **religue depois**.
- **Sandbox:** só conversa com números que entraram pelo `join`. Para abrir ao público, peça um
  número de produção na Twilio (ou migre para a Meta Cloud API).
- **Áudio:** ainda não; fica para a próxima iteração (precisa de transcrição, ex. Whisper).
- **Fuso:** a data do lançamento é gravada no fuso `America/Sao_Paulo`.
