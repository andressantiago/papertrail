# <img src="client/src/assets/papertrail-icon.png" alt="" width="40" height="40" align="top"> Papertrail - [![CI](https://github.com/andressantiago/papertrail/actions/workflows/ci.yml/badge.svg)](https://github.com/andressantiago/papertrail/actions/workflows/ci.yml)

A Dead Simple RAG client.

## Setup

Clone the repository:

```sh
git clone https://github.com/andressantiago/papertrail.git
cd papertrail
```

Install dependencies:

```sh
npm install
```

Create your local environment file:

```sh
cp .env.example .env
```

Then edit `.env` and set your OpenAI API key:

```sh
OPENAI_API_KEY=your_openai_api_key_here
```

You can also configure the model and server settings in `.env`:

```sh
OPENAI_MODEL=gpt-5.5
HOST=127.0.0.1
PORT=3000
PAPERTRAIL_UPLOAD_DIR=uploads/files
PAPERTRAIL_DB_PATH=data/papertrail.sqlite
```

`PAPERTRAIL_UPLOAD_DIR` controls where uploaded files are stored. `PAPERTRAIL_DB_PATH`
controls where local SQLite app metadata is stored.

## Development

Run the Express API and Vite client together:

```sh
npm run dev
```

The client runs through Vite, and API requests are proxied to the Express server.

## Production Build

Build the server and client:

```sh
npm run build
```

Start the built Express server:

```sh
npm start
```

In production, Express serves the built client from `client/dist`.

## Checks

Run the main project checks:

```sh
npm run lint
npm run typecheck
npm run format:check
```

Run the unit tests:

```sh
npm test
npm run test:watch
npm run test:coverage
```
