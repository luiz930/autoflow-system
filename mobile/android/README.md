# Wagen Estetica Android Nativo

APK Android nativo do sistema Wagen Estetica.

Este app nao usa WebView e nao depende do Flask. A base atual ainda conversa diretamente com o Supabase, e o Firebase ja esta conectado para a proxima camada de app/sincronizacao.

- PostgREST para `clientes`, `veiculos`, `servicos` e `fotos`.
- Supabase Storage para upload de fotos no bucket `fotos`.
- Firebase Auth anonimo para identificar o app no Firebase.
- Firebase Firestore para fila/testes de sincronizacao do app.
- Firebase Storage para a proxima etapa de fotos do app.

## Seguranca

Nao coloque `DATABASE_URL`, senha PostgreSQL, service role key ou senha do pooler dentro do APK. Um APK pode ser extraido por qualquer pessoa que o instalar.

O Firebase usa o arquivo:

```text
mobile/android/app/google-services.json
```

Esse arquivo fica fora do Git local. Para build no GitHub, cadastre o conteudo completo dele no secret:

```text
GOOGLE_SERVICES_JSON
```

A configuracao legada Supabase ainda usa:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

As permissoes reais devem ser controladas no Supabase por RLS.

## Configurar build no GitHub

Cadastre os secrets em:

```text
Settings > Secrets and variables > Actions
```

Secrets esperados:

```text
GOOGLE_SERVICES_JSON={conteudo completo do google-services.json}
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Depois rode o workflow `Build Android APK` ou faça push em `mobile/android/**`.

## Build local

Requisitos:

- Android SDK instalado
- Java 17
- Gradle

Com os requisitos instalados:

```powershell
cd mobile/android
gradle :app:assembleDebug -PsupabaseUrl=https://SEU-PROJETO.supabase.co -PsupabaseAnonKey=SUA_ANON_KEY
```

O APK sai em:

```text
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Login do app

O login do app usa a tabela `usuarios` do proprio sistema (`usuario` e `senha`), nao Supabase Auth. Isso permite entrar com os mesmos usuarios ja usados no site.

Como o app fala direto com Supabase usando `anon key`, o Supabase precisa permitir a leitura/autenticacao necessaria via RLS/policies ou uma funcao RPC propria. Nao use email principal do Supabase para operar o app.

## Firebase no app

A tela `Conexao` tem o botao `Testar Firestore`. Ele faz login anonimo no Firebase e grava um documento na colecao `sync_ping` para confirmar que o APK esta conectado ao Firebase. O banco principal do site nao e alterado por esse teste.

No Firebase Console, habilite:

- Authentication > Sign-in method > Anonymous.
- Firestore Database.
- Storage, quando formos mover as fotos para Firebase Storage.

## Telas nativas iniciais

- Login com usuario/senha do sistema.
- Painel com contagens.
- Cadastro e lista de clientes.
- Cadastro e lista de atendimentos.
- Captura de foto com camera nativa e upload para Supabase Storage.
- Tela de conexao/configuracao.
