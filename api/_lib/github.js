// api/_lib/github.js
//
// Клиент GitHub REST API для бота-накопителя баг-репортов
// (api/telegram-webhook.js). Умеет:
//   — читать список файлов репозитория (для контекста в /endpoint)
//   — читать содержимое одного файла
//   — ОБНОВЛЯТЬ (или создавать) файл прямо в ветке main — используется,
//     когда админ присылает боту документ в Telegram, и бот коммитит его
//     в репозиторий вместо старой версии.
//
// Нужны переменные окружения (Vercel → Settings → Environment Variables):
//   GITHUB_TOKEN  — Personal Access Token (fine-grained), права доступа:
//                   Repository permissions → Contents → Read and write.
//                   Создаётся на https://github.com/settings/tokens
//   GITHUB_REPO   — "владелец/репозиторий", например "ivanov/for-people-miniapp"
//   GITHUB_BRANCH — необязательно, по умолчанию "main"
//
// Если эти переменные не заданы — читающие функции просто возвращают null,
// а не бросают ошибку: GitHub-контекст опционален для /endpoint.
// Пишущая функция (updateRepoFile) при отсутствии переменных бросает
// понятную ошибку — её вызывают только там, где запись реально нужна.

const API_BASE = "https://api.github.com";

export function isGithubConfigured() {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

async function githubFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Список путей всех файлов в репозитории (рекурсивно, без содержимого) —
 * лёгкий контекст "что вообще есть в проекте" для промпта Gemini, а также
 * используется, чтобы понять, в какой файл коммитить присланный документ,
 * если сам админ не указал точный путь.
 * Возвращает null, если GITHUB_TOKEN/GITHUB_REPO не настроены.
 */
export async function getRepoFileList() {
  if (!isGithubConfigured()) return null;
  const [owner, repo] = process.env.GITHUB_REPO.split("/");
  const branch = process.env.GITHUB_BRANCH || "main";
  const data = await githubFetch(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  return (data.tree || [])
    .filter((item) => item.type === "blob")
    .map((item) => item.path);
}

/**
 * Содержимое одного файла целиком (декодировано из base64).
 */
export async function getRepoFileContent(path) {
  if (!isGithubConfigured()) return null;
  const [owner, repo] = process.env.GITHUB_REPO.split("/");
  const branch = process.env.GITHUB_BRANCH || "main";
  const data = await githubFetch(
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`
  );
  if (!data.content) return null;
  return Buffer.from(data.content, "base64").toString("utf-8");
}

/**
 * SHA текущей версии файла (нужен GitHub API, чтобы разрешить перезапись
 * существующего файла). Если файла ещё нет в репозитории — вернёт null,
 * и тогда updateRepoFile его просто создаст.
 */
async function getFileSha(path) {
  const [owner, repo] = process.env.GITHUB_REPO.split("/");
  const branch = process.env.GITHUB_BRANCH || "main";
  const res = await fetch(
    `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    { headers: authHeaders() }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.sha || null;
}

/**
 * Создаёт файл (если его ещё нет) или обновляет его новым содержимым —
 * коммитит напрямую в ветку GITHUB_BRANCH (по умолчанию main).
 *
 * @param {string} path — путь файла внутри репозитория, например "src/App.jsx"
 * @param {Buffer|string} content — новое содержимое. Buffer — для бинарных
 *   файлов (картинки и т.п.), string — для текстовых.
 * @param {string} commitMessage — сообщение коммита
 * @returns {{ commitUrl: string, path: string }}
 */
export async function updateRepoFile(path, content, commitMessage) {
  if (!isGithubConfigured()) {
    throw new Error("GITHUB_TOKEN/GITHUB_REPO не настроены на Vercel — запись невозможна.");
  }
  const [owner, repo] = process.env.GITHUB_REPO.split("/");
  const branch = process.env.GITHUB_BRANCH || "main";

  const sha = await getFileSha(path);
  const base64Content = Buffer.isBuffer(content)
    ? content.toString("base64")
    : Buffer.from(content, "utf-8").toString("base64");

  const body = {
    message: commitMessage || `Обновление ${path} через Telegram-бота`,
    content: base64Content,
    branch,
  };
  if (sha) body.sha = sha; // без sha GitHub решит, что мы создаём новый файл

  const res = await fetch(`${API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`GitHub write ${res.status}: ${errBody.slice(0, 300)}`);
  }
  const data = await res.json();
  return {
    commitUrl: data.commit?.html_url || null,
    path,
  };
}
