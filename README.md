# Fix Docker backend - npm ci / Prisma

Questo pacchetto corregge il build Docker backend quando `npm ci` fallisce perché il `package-lock.json` contiene URL del registry interno OpenAI/CaaS o quando Prisma non viene trovato nello stage builder.

Modifiche incluse:

- `package-lock.json` riscritto per usare solo `https://registry.npmjs.org/`.
- `.npmrc` di progetto con registry pubblico npm.
- `.dockerignore` in allow-list, così Docker invia davvero `src`, `prisma`, `package-lock.json`, `tsconfig.json` e non invia `.env` o file generati.
- `Dockerfile` multi-stage:
  - install/build su `node:20-bookworm`;
  - runtime su immagine Playwright;
  - Prisma generato tramite binario locale `./node_modules/.bin/prisma`;
  - dev dependencies mantenute nel runtime per permettere al container one-shot di eseguire `prisma migrate deploy` con la stessa immagine.

Comandi consigliati:

```bash
docker builder prune -f
docker build --no-cache --progress=plain -t movemgmt-core-ms:local .
```

Se vuoi verificare che il lock non contenga più registry interni:

```bash
findstr /I "applied-caas openai artifactory" package-lock.json
```

Non deve stampare risultati.
