# pad-practice

Practice projects for timed pair-programming sessions in a browser pad. Each branch is a small React and TypeScript app called Sendwell, with a mock API that runs inside the Vite dev server.

## Load a project into a pad

Open a React pad, then run this in its terminal. Change `round-1` to the round you want.

```
cd ~/app && rm -f src/App.css src/index.css src/global.d.ts && curl -sL https://codeload.github.com/cameronscottgibson/pad-practice/tar.gz/refs/heads/round-1 | tar xz --strip-components=1 && npm install
```

If the preview does not refresh, press Restart in Dev Tools.

| Branch | Project |
|---|---|
| `round-1` | Sendwell, project 1 |
| `round-2` | Sendwell, project 2 |
| `round-3` | Sendwell, project 3 |

## Run locally

```
npm install
npm run dev
npm test
```
