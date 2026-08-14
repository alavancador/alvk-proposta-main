# ALVK Proposta Main

Ambiente estático de propostas comerciais da ALVK, publicado pela Vercel a
partir da branch `main`:

- Produção: https://alvk-proposta-main.vercel.app/
- JK Concept: https://alvk-proposta-main.vercel.app/jkconcept

A página inicial é neutra e cada proposta possui uma rota exclusiva. Não há
listagem pública de clientes.

## Arquitetura

- HTML, CSS e JavaScript sem framework ou dependências
- build estático em Node.js
- GitHub integrado à Vercel
- URLs limpas, como `/jkconcept`
- `noindex`, `nofollow`, `noarchive` e `robots.txt`
- cache desabilitado para reduzir persistência de conteúdo comercial

## Estrutura

```text
app/
├── home.html
└── proposals/
    └── jkconcept.html
public/
├── favicon.svg
└── alvk/
    ├── tokens/
    ├── styles/
    └── assets/
scripts/
└── build.mjs
tests/
└── project.test.mjs
vercel.json
```

## Pacote visual ALVK

`public/alvk/` é o pacote de produção compartilhado por todas as propostas.
Ele é publicado pelo build como `/alvk/`, sem depender de Google Fonts ou de
outro repositório em tempo de execução. A cópia atual corresponde ao ALVK
Design System v1.0.0.

- `tokens/tokens.css`: tokens canônicos e carregamento local da Urbanist;
- `tokens/*.css` e `tokens/tokens.json`: tokens modulares e interoperáveis;
- `styles/components.css`: contratos dos componentes com prefixo `alvk-`;
- `assets/fonts/urbanist/`: fonte, versão itálica e licença OFL;
- `assets/logo/` e `assets/patterns/`: logos, marca, noise, linha gradiente e
  padrão de pontos para uso interno. Os SVGs de logo são reconstruções
  internas; valide o vetor-mestre antes de distribuição externa ou impressão.

Em uma proposta, carregue os tokens antes dos componentes:

```html
<link rel="stylesheet" href="/alvk/tokens/tokens.css">
<link rel="stylesheet" href="/alvk/styles/components.css">
```

Use `components.css` somente quando a proposta adotar os contratos
`.alvk-*`, dentro de `.alvk-scope`. A hierarquia de `public/alvk/` deve ser
preservada: `tokens.css` encontra a fonte por caminho relativo.

Documentação, previews e a camada React do repositório original do Design
System permanecem fora da publicação: não são dependências do site estático.

## Adicionar uma proposta

1. Salve o HTML em `app/proposals/<slug>.html`.
2. Use no slug apenas letras minúsculas, números e hífens.
3. Inclua `lang="pt-BR"`, título, viewport e:

```html
<meta name="robots" content="noindex,nofollow,noarchive">
```

4. Execute:

```bash
npm test
```

5. Abra um PR. Após o merge na `main`, a Vercel publica a nova rota
   automaticamente em `https://alvk-proposta-main.vercel.app/<slug>`.

Não é necessário registrar o slug em outro arquivo: o build encontra
automaticamente todos os arquivos `.html` em `app/proposals/`.

## Desenvolvimento

Requisito: Node.js 24.

```bash
npm ci
npm test
```

O build gera `vercel-dist/`, que pode ser servido por qualquer servidor
estático.

## Privacidade

As propostas não entram em sitemap ou navegação pública. `noindex` reduz a
exposição em mecanismos de busca, mas não restringe acesso direto. Documentos
que exijam confidencialidade real devem utilizar proteção por senha ou controle
de acesso na Vercel.
