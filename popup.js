const DB_NAME = "ai_prompt_enhancer_db";
const DB_VERSION = 2;
const STORE_TEMPLATES = "templates";
const STORE_HISTORY = "history";
const STORE_SETTINGS = "settings";
const KEY_API_CONFIG = "api_config";
const KEY_EXPORT_DIR_HANDLE = "export_dir_handle";
const KEY_PROMPT_SAVE_DIR_HANDLE = "prompt_save_dir_handle";
const KEY_THEME_MODE = "theme_mode";
const KEY_THEME_PRESET = "theme_preset";
const KEY_PROMPT_FAVORITES = "prompt_favorites";
const PROMPT_LIBRARY_META_FILE = "CubeTT.library.json";
const MAX_HISTORY = 200;
const ABOUT_INFO = {
  extensionDescription:
    "输入想法后自动优化为高质量提示词，支持模板复用、本地保存与导出，并可快捷存储和调用 AI 绘画提示词。",
  authorName: "公众号：是立方体啦",
  authorLink: "https://github.com/2797565800/CubeTT"
};

const THEME_PRESETS = {
  ocean: {
    primary: "#1363df",
    primaryHover: "#0f4fae",
    secondaryBg: "#eef4ff",
    secondaryHover: "#e2edff",
    secondaryText: "#1363df",
    secondaryBorder: "#c6d8ff"
  },
  leaf: {
    primary: "#0f9b6d",
    primaryHover: "#0b7e58",
    secondaryBg: "#e9faf3",
    secondaryHover: "#def5ea",
    secondaryText: "#0f9b6d",
    secondaryBorder: "#bfead7"
  },
  sun: {
    primary: "#f59e0b",
    primaryHover: "#d97706",
    secondaryBg: "#fff7e6",
    secondaryHover: "#ffefcf",
    secondaryText: "#b45309",
    secondaryBorder: "#f6d59c"
  },
  rose: {
    primary: "#e11d72",
    primaryHover: "#be185d",
    secondaryBg: "#fff0f7",
    secondaryHover: "#ffe2f0",
    secondaryText: "#be185d",
    secondaryBorder: "#f7b5d5"
  },
  royal: {
    primary: "#4f46e5",
    primaryHover: "#4338ca",
    secondaryBg: "#ede9fe",
    secondaryHover: "#ddd6fe",
    secondaryText: "#4338ca",
    secondaryBorder: "#c4b5fd"
  }
};

const SCENE_CONFIG = {
  writing: {
    label: "写作",
    role: "资深中文写作教练",
    focus: "结构完整、逻辑清晰、语言有感染力"
  },
  marketing: {
    label: "营销",
    role: "增长营销策略专家",
    focus: "聚焦目标人群痛点、价值表达和转化动作"
  },
  coding: {
    label: "编程",
    role: "高级软件工程师",
    focus: "给出可执行方案、关键代码和边界情况"
  },
  learning: {
    label: "学习",
    role: "学习方法教练",
    focus: "分步骤、可理解、可复习和可实践"
  },
  workplace: {
    label: "职场",
    role: "职场沟通与项目管理顾问",
    focus: "结果导向、表达专业、可落地执行"
  }
};

const SCENE_INPUT_PRESETS = {
  writing: "帮我写一篇关于[主题]的文章，面向[目标读者]，要求结构清晰、语言自然，并给出可执行建议。",
  marketing: "请为[产品/服务]生成营销文案，目标人群是[人群]，突出卖点、痛点和转化动作。",
  coding: "我在做[项目/功能]，请给出实现方案、关键代码示例、边界情况和测试建议。",
  learning: "我要学习[知识点]，请给出分阶段学习路径、练习安排和复盘方法。",
  workplace: "请帮我整理一份关于[事项]的职场沟通稿，包含目标、进展、风险和下一步计划。"
};

const DEFAULT_TEMPLATES = [
  {
    name: "写作：文章提纲",
    scene: "writing",
    content: "请帮我把主题拆成结构化提纲，包含标题建议、核心观点、每段要点和结尾行动建议。"
  },
  {
    name: "营销：爆款文案",
    scene: "marketing",
    content: "请基于目标用户痛点，产出3版营销文案，包含标题、卖点、行动号召和A/B测试建议。"
  },
  {
    name: "编程：问题排查",
    scene: "coding",
    content: "请先定位问题根因，再给修复思路、代码示例、测试建议与性能/安全注意事项。"
  },
  {
    name: "学习：知识拆解",
    scene: "learning",
    content: "请把复杂概念拆成新手可理解的分层解释，并给练习题与复盘清单。"
  },
  {
    name: "职场：汇报优化",
    scene: "workplace",
    content: "请把我提供的信息整理成清晰的汇报结构，突出目标、进展、风险和下一步计划。"
  }
];

function byId(id) {
  return document.getElementById(id);
}

function nowISO() {
  return new Date().toISOString();
}

function timeStampForFile(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

// IndexedDB 基础封装：统一数据库创建、读写和删除能力。
class IndexedDBService {
  constructor(dbName = DB_NAME, version = DB_VERSION) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
          const templateStore = db.createObjectStore(STORE_TEMPLATES, {
            keyPath: "id",
            autoIncrement: true
          });
          templateStore.createIndex("name", "name", { unique: true });
          templateStore.createIndex("scene", "scene", { unique: false });
          templateStore.createIndex("updatedAt", "updatedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_HISTORY)) {
          const historyStore = db.createObjectStore(STORE_HISTORY, {
            keyPath: "id",
            autoIncrement: true
          });
          historyStore.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async _withStore(storeName, mode, executor) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      let tx;
      let request;
      let requestResult;
      let settled = false;
      const resolveOnce = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const rejectOnce = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      try {
        tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        request = executor(store, tx);
      } catch (error) {
        reject(error);
        return;
      }

      tx.oncomplete = () => resolveOnce(request ? requestResult : undefined);
      tx.onabort = () =>
        rejectOnce(tx.error || request?.error || new Error("IndexedDB transaction aborted."));
      tx.onerror = () =>
        rejectOnce(tx.error || request?.error || new Error("IndexedDB transaction failed."));

      if (!request) return;

      request.onsuccess = () => {
        requestResult = request.result;
      };
      request.onerror = () =>
        rejectOnce(request.error || tx.error || new Error("IndexedDB request failed."));
    });
  }

  async getAll(storeName) {
    return this._withStore(storeName, "readonly", (store) => store.getAll());
  }

  async getById(storeName, id) {
    return this._withStore(storeName, "readonly", (store) => store.get(id));
  }

  async getByIndex(storeName, indexName, key) {
    return this._withStore(storeName, "readonly", (store) =>
      store.index(indexName).get(key)
    );
  }

  async put(storeName, value) {
    return this._withStore(storeName, "readwrite", (store) => store.put(value));
  }

  async delete(storeName, id) {
    return this._withStore(storeName, "readwrite", (store) => store.delete(id));
  }
}

// 模板管理：负责模板默认初始化、增删查和按名称覆盖更新。
class TemplateService {
  constructor(dbService) {
    this.db = dbService;
  }

  async ensureSeedData() {
    const existing = await this.listTemplates();
    if (existing.length > 0) return;

    const createdAt = nowISO();
    for (const item of DEFAULT_TEMPLATES) {
      await this.db.put(STORE_TEMPLATES, {
        ...item,
        createdAt,
        updatedAt: createdAt
      });
    }
  }

  async listTemplates() {
    const templates = (await this.db.getAll(STORE_TEMPLATES)) || [];
    return templates.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }

  async saveTemplate({ name, scene, content }) {
    const cleanName = name.trim();
    const cleanContent = content.trim();
    if (!cleanName || !cleanContent) {
      throw new Error("提示词名称和内容不能为空。");
    }

    const now = nowISO();
    const existing = await this.db.getByIndex(STORE_TEMPLATES, "name", cleanName);
    const payload = {
      ...(existing || {}),
      name: cleanName,
      scene,
      content: cleanContent,
      updatedAt: now,
      createdAt: existing?.createdAt || now
    };
    return this.db.put(STORE_TEMPLATES, payload);
  }

  async deleteTemplate(id) {
    return this.db.delete(STORE_TEMPLATES, id);
  }

  async getTemplate(id) {
    return this.db.getById(STORE_TEMPLATES, id);
  }
}

// 历史记录管理：保存每次优化结果，便于后续审计与扩展历史面板。
class HistoryService {
  constructor(dbService) {
    this.db = dbService;
  }

  async addHistory({ input, output, scene, templateId }) {
    const records = (await this.db.getAll(STORE_HISTORY)) || [];
    if (records.length >= MAX_HISTORY) {
      const sorted = records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const overflow = records.length - MAX_HISTORY + 1;
      for (let i = 0; i < overflow; i += 1) {
        await this.db.delete(STORE_HISTORY, sorted[i].id);
      }
    }

    return this.db.put(STORE_HISTORY, {
      input,
      output,
      scene,
      templateId: templateId || null,
      createdAt: nowISO()
    });
  }
}

// 设置管理：保存 API 配置与导出目录句柄，供后续复用。
class SettingsService {
  constructor(dbService) {
    this.db = dbService;
  }

  async setValue(key, value) {
    return this.db.put(STORE_SETTINGS, {
      key,
      value,
      updatedAt: nowISO()
    });
  }

  async getValue(key) {
    const record = await this.db.getById(STORE_SETTINGS, key);
    return record?.value;
  }

  async saveApiConfig(config) {
    const payload = {
      endpoint: config.endpoint?.trim() || "",
      apiKey: config.apiKey?.trim() || "",
      model: config.model?.trim() || "gpt-4"
    };
    return this.setValue(KEY_API_CONFIG, payload);
  }

  async getApiConfig() {
    const data = await this.getValue(KEY_API_CONFIG);
    return {
      endpoint: data?.endpoint || "",
      apiKey: data?.apiKey || "",
      model: data?.model || "gpt-4"
    };
  }

  async saveThemeMode(mode) {
    return this.setValue(KEY_THEME_MODE, mode || "light");
  }

  async getThemeMode() {
    return (await this.getValue(KEY_THEME_MODE)) || "light";
  }

  async saveThemePreset(preset) {
    return this.setValue(KEY_THEME_PRESET, preset || "ocean");
  }

  async getThemePreset() {
    return (await this.getValue(KEY_THEME_PRESET)) || "ocean";
  }

  async saveExportDirHandle(handle) {
    return this.setValue(KEY_EXPORT_DIR_HANDLE, handle || null);
  }

  async getExportDirHandle() {
    return this.getValue(KEY_EXPORT_DIR_HANDLE);
  }

  async savePromptSaveDirHandle(handle) {
    return this.setValue(KEY_PROMPT_SAVE_DIR_HANDLE, handle || null);
  }

  async getPromptSaveDirHandle() {
    return this.getValue(KEY_PROMPT_SAVE_DIR_HANDLE);
  }

  async savePromptFavorites(favoritesMap) {
    const payload =
      favoritesMap && typeof favoritesMap === "object" ? favoritesMap : {};
    return this.setValue(KEY_PROMPT_FAVORITES, payload);
  }

  async getPromptFavorites() {
    const data = await this.getValue(KEY_PROMPT_FAVORITES);
    if (!data || typeof data !== "object") return {};
    return data;
  }
}

// API 占位模块：未来可替换为 GPT-4/其他模型调用。
class PromptApiClient {
  constructor(config = {}) {
    this.config = {
      endpoint: "",
      apiKey: "",
      model: "gpt-4",
      ...config
    };
  }

  updateConfig(nextConfig = {}) {
    this.config = {
      ...this.config,
      ...nextConfig
    };
  }

  static isLocalDebugHost(hostname = "") {
    const host = String(hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  }

  static validateEndpointUrl(endpoint) {
    let parsed;
    try {
      parsed = new URL((endpoint || "").trim());
    } catch (_error) {
      throw new Error("API 接口地址格式无效。");
    }

    if (parsed.protocol === "https:") {
      return parsed;
    }

    if (parsed.protocol === "http:" && PromptApiClient.isLocalDebugHost(parsed.hostname)) {
      return parsed;
    }

    throw new Error(
      "为保护 API Key，远程接口必须使用 https://。仅允许 localhost、127.0.0.1、::1 使用 http:// 进行本地调试。"
    );
  }

  static resolveCompatibleEndpoint(endpoint) {
    const parsed = PromptApiClient.validateEndpointUrl(endpoint);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    const path = normalizedPath || "/";

    const setPath = (nextPath) => {
      parsed.pathname = nextPath;
      return parsed.href;
    };

    if (/\/responses$/i.test(path) || /\/chat\/completions$/i.test(path)) {
      return parsed.href;
    }

    // Auto-map common Anthropic-style paths to OpenAI-compatible chat completions.
    if (/^\/anthropic(?:\/|$)/i.test(path)) {
      let remapped = path.replace(/^\/anthropic/i, "");
      remapped = remapped.replace(/\/v(\d+(?:\.\d+)?)\/messages$/i, "/v$1");
      remapped = remapped.replace(/\/messages$/i, "");
      if (!remapped || remapped === "/") {
        remapped = "/v1";
      }
      return setPath(`${remapped}/chat/completions`);
    }

    // Generic Messages API path -> OpenAI chat completions.
    if (/\/v(\d+(?:\.\d+)?)\/messages$/i.test(path)) {
      const remapped = path.replace(/\/messages$/i, "");
      return setPath(`${remapped}/chat/completions`);
    }
    if (/\/messages$/i.test(path)) {
      const remapped = path.replace(/\/messages$/i, "") || "/v1";
      return setPath(`${remapped}/chat/completions`);
    }

    if (path === "/" || /\/v1$/i.test(path)) {
      const basePath = path === "/" ? "/v1" : path;
      return setPath(`${basePath}/chat/completions`);
    }

    // Generic OpenAI-compatible fallback: append chat/completions.
    return setPath(`${path}/chat/completions`);
  }

  static createTimeoutSignal(timeoutMs) {
    const ms = Number(timeoutMs);
    if (!Number.isFinite(ms) || ms <= 0) {
      return { signal: undefined, cleanup: () => {} };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timer)
    };
  }

  static extractTextFromResponse(data) {
    const textDirect = data?.output_text;
    if (typeof textDirect === "string" && textDirect.trim()) {
      return textDirect.trim();
    }

    const chatContent = data?.choices?.[0]?.message?.content;
    if (typeof chatContent === "string" && chatContent.trim()) {
      return chatContent.trim();
    }
    if (Array.isArray(chatContent)) {
      const joined = chatContent
        .map((item) => (typeof item?.text === "string" ? item.text : ""))
        .join("")
        .trim();
      if (joined) return joined;
    }

    const outputItems = data?.output;
    if (Array.isArray(outputItems)) {
      const texts = [];
      for (const item of outputItems) {
        if (typeof item?.text === "string") {
          texts.push(item.text);
        }
        if (Array.isArray(item?.content)) {
          for (const part of item.content) {
            if (typeof part?.text === "string") {
              texts.push(part.text);
            }
          }
        }
      }
      const merged = texts.join("\n").trim();
      if (merged) return merged;
    }

    return "";
  }

  async enhanceWithRemoteModel(payload, options = {}) {
    const {
      timeoutMs = 0,
      maxTokens = 0,
      skipSystemPrompt = false,
      temperature = 0.2,
      requireText = true
    } = options;
    if (!this.config.endpoint) {
      throw new Error("未配置远程 API endpoint。");
    }

    const headers = {
      "Content-Type": "application/json"
    };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const endpoint = PromptApiClient.resolveCompatibleEndpoint(this.config.endpoint);
    const isResponsesApi = /\/responses(?:\?|$)/i.test(endpoint);
    const requestBody = isResponsesApi
      ? {
          model: this.config.model,
          input: payload.prompt
        }
      : {
          model: this.config.model,
          messages: skipSystemPrompt
            ? [
                {
                  role: "user",
                  content: payload.prompt
                }
              ]
            : [
                {
                  role: "system",
                  content: "你是提示词优化专家。请仅输出优化后的中文提示词内容，不要解释。"
                },
                {
                  role: "user",
                  content: payload.prompt
                }
              ],
          temperature
        };

    if (!isResponsesApi && Number.isFinite(Number(maxTokens)) && Number(maxTokens) > 0) {
      requestBody.max_tokens = Math.max(1, Math.floor(Number(maxTokens)));
    }

    const timeout = PromptApiClient.createTimeoutSignal(timeoutMs);
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        ...(timeout.signal ? { signal: timeout.signal } : {})
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(`连接测试超时（${Math.round(Number(timeoutMs) / 1000)} 秒），请稍后重试。`);
      }
      throw error;
    } finally {
      timeout.cleanup();
    }

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 300);
      throw new Error(`远程接口请求失败（HTTP ${response.status}）：${errorText}`);
    }

    const data = await response.json();
    const text = PromptApiClient.extractTextFromResponse(data);
    if (!text && requireText) {
      throw new Error("远程接口返回成功，但未解析到文本结果。");
    }
    return text || "";
  }
}

// 本地增强模块：在未接入远程模型时，先按场景规则输出高质量提示词。
class PromptEnhancer {
  static build({ input, scene, templateContent }) {
    const sceneData = SCENE_CONFIG[scene] || SCENE_CONFIG.writing;
    const templateHint = templateContent
      ? `\n参考提示词（可按需融合）：\n${templateContent}\n`
      : "";

    return [
      `你是一名${sceneData.role}。请基于用户需求生成高质量回答。`,
      "",
      "【用户原始需求】",
      input,
      templateHint ? templateHint.trimEnd() : "",
      "",
      "【任务要求】",
      `1. 场景：${sceneData.label}`,
      `2. 重点：${sceneData.focus}`,
      "3. 先给简明结论，再给分步骤展开。",
      "4. 输出必须结构化，尽量使用小标题与要点列表。",
      "5. 给出可直接执行的示例，而不是空泛建议。",
      "",
      "【输出格式】",
      "请按以下结构回复：",
      "- 一句话结论",
      "- 分步骤方案",
      "- 可直接复制使用的示例内容",
      "- 常见错误与优化建议",
      "",
      "如果用户信息不完整，请先列出需要补充的关键问题。"
    ]
      .filter(Boolean)
      .join("\n");
  }
}

// 文件导出模块：保存单条提示词与导出全部提示词文件夹。
class ExportService {
  static sanitizeFileName(name) {
    const sanitized = name.replace(/[\\/:*?"<>|]/g, "_").trim();
    return sanitized || "未命名提示词";
  }

  static createEmptyPromptLibraryMeta() {
    return {
      version: 1,
      favorites: {}
    };
  }

  static normalizePromptLibraryMeta(data) {
    const fallback = ExportService.createEmptyPromptLibraryMeta();
    if (!data || typeof data !== "object") {
      return fallback;
    }
    const favorites = {};
    const rawFavorites =
      data.favorites && typeof data.favorites === "object" ? data.favorites : {};
    for (const [key, value] of Object.entries(rawFavorites)) {
      const normalizedKey = String(key || "").trim();
      const normalizedValue = String(value || "").trim();
      if (!normalizedKey || !normalizedValue) continue;
      favorites[normalizedKey] = normalizedValue;
    }
    return {
      version: 1,
      favorites
    };
  }

  static buildPromptLibraryMetaJson(data) {
    return JSON.stringify(ExportService.normalizePromptLibraryMeta(data), null, 2);
  }

  static isPromptLibraryMetaFile(fileName) {
    return (
      String(fileName || "").trim().toLowerCase() ===
      PROMPT_LIBRARY_META_FILE.toLowerCase()
    );
  }

  static async getPermissionState(handle, mode = "readwrite") {
    if (!handle?.queryPermission) return "granted";
    return handle.queryPermission({ mode });
  }

  static async ensurePermission(handle, mode = "readwrite", options = {}) {
    const { requestIfNeeded = true } = options;
    if (!handle) {
      throw new Error("目录句柄无效，请重新选择保存目录。");
    }
    if (!handle?.queryPermission || !handle?.requestPermission) return "granted";

    let queried = "prompt";
    try {
      queried = await ExportService.getPermissionState(handle, mode);
    } catch (error) {
      if (
        error?.name === "TypeError" ||
        error?.name === "NotFoundError" ||
        error?.name === "InvalidStateError"
      ) {
        throw new Error("目录句柄无效，请重新选择保存目录。");
      }
      throw error;
    }
    if (queried === "granted") return queried;
    if (!requestIfNeeded) return queried;

    let requested = queried;
    try {
      requested = await handle.requestPermission({ mode });
    } catch (error) {
      if (
        error?.name === "TypeError" ||
        error?.name === "NotFoundError" ||
        error?.name === "InvalidStateError"
      ) {
        throw new Error("目录句柄无效，请重新选择保存目录。");
      }
      if (error?.name === "SecurityError") {
        throw new Error("目录授权需要手动操作，请点击“保存该提示词”或“导出提示词”后重试。");
      }
      throw error;
    }

    if (requested !== "granted") {
      throw new Error("没有目录访问权限，请授权后重试。");
    }
    return requested;
  }

  static buildPromptJson({ promptName, promptText, scene }) {
    return JSON.stringify(
      {
        savedAt: nowISO(),
        name: promptName,
        scene,
        prompt: promptText
      },
      null,
      2
    );
  }

  static buildPromptFileName(promptName) {
    return `${ExportService.sanitizeFileName(promptName)}.json`;
  }

  static async readPromptLibraryMeta(dirHandle, options = {}) {
    await ExportService.ensurePermission(dirHandle, "read", options);
    try {
      const fileHandle = await dirHandle.getFileHandle(PROMPT_LIBRARY_META_FILE, {
        create: false
      });
      const file = await fileHandle.getFile();
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (_error) {
        throw new Error("词库收藏数据文件损坏，已按空收藏处理。");
      }
      return ExportService.normalizePromptLibraryMeta(parsed);
    } catch (error) {
      if (error?.name === "NotFoundError") {
        return null;
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("词库收藏数据读取失败，已按空收藏处理。");
    }
  }

  static async savePromptLibraryMeta(dirHandle, data) {
    await ExportService.ensurePermission(dirHandle, "readwrite");
    const fileHandle = await dirHandle.getFileHandle(PROMPT_LIBRARY_META_FILE, {
      create: true
    });
    const writable = await fileHandle.createWritable();
    await writable.write(ExportService.buildPromptLibraryMetaJson(data));
    await writable.close();
    return { fileName: PROMPT_LIBRARY_META_FILE };
  }

  static async promptFileExists({ dirHandle, promptName }) {
    await ExportService.ensurePermission(dirHandle, "read");
    const fileName = ExportService.buildPromptFileName(promptName);
    try {
      await dirHandle.getFileHandle(fileName, { create: false });
      return true;
    } catch (error) {
      if (error?.name === "NotFoundError") {
        return false;
      }
      throw error;
    }
  }

  static async savePromptToDirectory({ dirHandle, promptName, promptText, scene }) {
    await ExportService.ensurePermission(dirHandle, "readwrite");
    const fileName = ExportService.buildPromptFileName(promptName);
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(
      ExportService.buildPromptJson({
        promptName,
        promptText,
        scene
      })
    );
    await writable.close();
    return { fileName };
  }

  static async writePromptFileToDirectory({ dirHandle, fileName, text }) {
    await ExportService.ensurePermission(dirHandle, "readwrite");
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(String(text || ""));
    await writable.close();
    return { fileName };
  }

  static async listPromptJsonFiles(dirHandle, options = {}) {
    await ExportService.ensurePermission(dirHandle, "read", options);
    const files = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (
        handle.kind === "file" &&
        /\.json$/i.test(name) &&
        !ExportService.isPromptLibraryMetaFile(name)
      ) {
        files.push({ name, handle });
      }
    }
    return files;
  }

  static async exportAllPromptFiles({
    sourceDirHandle,
    targetParentDirHandle,
    packageFolderName
  }) {
    await ExportService.ensurePermission(sourceDirHandle, "read");
    await ExportService.ensurePermission(targetParentDirHandle, "readwrite");

    const files = await ExportService.listPromptJsonFiles(sourceDirHandle);
    const packageDirHandle = await targetParentDirHandle.getDirectoryHandle(
      packageFolderName,
      { create: true }
    );

    for (const item of files) {
      const file = await item.handle.getFile();
      const content = await file.text();
      const targetFileHandle = await packageDirHandle.getFileHandle(item.name, {
        create: true
      });
      const writable = await targetFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    }

    return { fileCount: files.length, folderName: packageFolderName };
  }
}

const LIGHT_NEUTRALS = {
  bg: "#eef1f6",
  panel: "#f8fafc",
  text: "#0f172a",
  muted: "#667085",
  placeholder: "#98a2b3",
  border: "#d8dee8",
  inputBg: "#ffffff",
  ghostBg: "#ffffff",
  ghostHover: "#f8faff",
  ghostText: "#0f172a",
  iconBg: "#f4f7ff",
  iconHover: "#ebeffa"
};

const DARK_NEUTRALS = {
  bg: "#03081a",
  panel: "#050f2b",
  text: "#e5ebff",
  muted: "#a6b1d1",
  placeholder: "#7783ab",
  border: "rgba(124, 140, 224, 0.4)",
  inputBg: "#0a173d",
  ghostBg: "#091a44",
  ghostHover: "#11265f",
  ghostText: "#e5ebff",
  iconBg: "#10275f",
  iconHover: "#1a3170"
};

function setCssVariable(name, value) {
  document.documentElement.style.setProperty(name, value);
}

class PopupController {
  constructor() {
    this.dbService = new IndexedDBService();
    this.templateService = new TemplateService(this.dbService);
    this.historyService = new HistoryService(this.dbService);
    this.settingsService = new SettingsService(this.dbService);
    this.apiClient = new PromptApiClient();
    this.templateCache = [];

    this.settingsToggleBtn = byId("settingsToggleBtn");
    this.modeToggleBtn = byId("modeToggleBtn");
    this.modeToggleIcon = byId("modeToggleIcon");
    this.helpToggleBtn = byId("helpToggleBtn");
    this.settingsPanel = byId("settingsPanel");
    this.appRoot = document.querySelector("main.app");
    this.aboutBackdrop = byId("aboutBackdrop");
    this.aboutModal = byId("aboutModal");
    this.libraryToggleBtn = byId("libraryToggleBtn");
    this.libraryBackdrop = byId("libraryBackdrop");
    this.libraryModal = byId("libraryModal");
    this.libraryCloseBtn = byId("libraryCloseBtn");
    this.aboutVersionText = byId("aboutVersionText");
    this.aboutDescriptionText = byId("aboutDescriptionText");
    this.aboutAuthorName = byId("aboutAuthorName");
    this.aboutAuthorLink = byId("aboutAuthorLink");
    this.cardToggles = Array.from(document.querySelectorAll(".card-toggle"));
    this.apiEndpointInput = byId("apiEndpointInput");
    this.apiKeyInput = byId("apiKeyInput");
    this.toggleApiKeyBtn = byId("toggleApiKeyBtn");
    this.toggleApiKeyIcon = byId("toggleApiKeyIcon");
    this.apiModelInput = byId("apiModelInput");
    this.saveSettingsBtn = byId("saveSettingsBtn");
    this.themeOptions = byId("themeOptions");
    this.themeSwatches = Array.from(document.querySelectorAll(".theme-swatch"));
    this.llmStatus = byId("llmStatus");
    this.llmStatusText = byId("llmStatusText");

    this.sceneSelect = byId("sceneSelect");
    this.sceneChips = Array.from(document.querySelectorAll(".scene-chip"));
    this.templateSelect = byId("templateSelect");
    this.selectPromptSaveDirBtn = byId("selectPromptSaveDirBtn");
    this.fixPromptSaveDirBtn = byId("fixPromptSaveDirBtn");
    this.promptSavePathText = byId("promptSavePathText");
    this.inputText = byId("inputText");
    this.inputWordCount = byId("inputWordCount");
    this.outputText = byId("outputText");
    this.savedPromptSearchInput = byId("savedPromptSearchInput");
    this.savedPromptSearchResults = byId("savedPromptSearchResults");
    this.clearSavedPromptSearchBtn = byId("clearSavedPromptSearchBtn");
    this.promptLibrary = document.querySelector(".prompt-library");
    this.libraryMount = byId("libraryMount");
    this.savedPromptFilterBtns = Array.from(
      document.querySelectorAll(".library-tab")
    );
    this.templateName = byId("templateName");
    this.status = byId("status");
    this.updatedAtText = byId("updatedAtText");
    this.optimizeBtn = byId("optimizeBtn");
    this.optimizeBtnIcon = byId("optimizeBtnIcon");
    this.optimizeBtnText = this.optimizeBtn?.querySelector("span:last-child") || null;
    this.copyBtn = byId("copyBtn");
    this.saveTemplateBtn = byId("saveTemplateBtn");
    this.deleteTemplateBtn = byId("deleteTemplateBtn");
    this.exportBtn = byId("exportBtn");
    this.mergePromptLibraryBtn = byId("mergePromptLibraryBtn");

    this.themeMode = "light";
    this.themePreset = "ocean";
    this.isDetachedWindow =
      new URLSearchParams(window.location.search).get("detached") === "1";
    this.isOptimizing = false;
    this.isAboutOpen = false;
    this.isLibraryOpen = false;
    this.savedPromptFilter = "all";
    this.savedPromptSearchCache = [];
    this.promptFavoritesMap = {};
    this.promptLibraryMetaError = "";
    this.lastPromptLibraryMetaError = "";
    this.promptSaveDirHandle = null;
    this.eventsBound = false;
  }

  setSvgUse(useElement, symbolId) {
    if (!useElement || !symbolId) return;
    useElement.setAttribute("href", symbolId);
    useElement.setAttribute("xlink:href", symbolId);
  }

  setLlmConnectionStatus(state, customText = "") {
    this.llmStatus.classList.remove(
      "llm-unconfigured",
      "llm-disconnected",
      "llm-connecting",
      "llm-connected"
    );

    if (state === "connected") {
      this.llmStatus.classList.add("llm-connected");
      this.llmStatusText.textContent =
        customText || `LLM 已连接（${this.apiClient.config.model || "模型"}）`;
      return;
    }

    if (state === "disconnected") {
      this.llmStatus.classList.add("llm-disconnected");
      this.llmStatusText.textContent = customText || "LLM 已配置，未连接";
      return;
    }

    if (state === "connecting") {
      this.llmStatus.classList.add("llm-connecting");
      this.llmStatusText.textContent = customText || "LLM 连接中...";
      return;
    }

    this.llmStatus.classList.add("llm-unconfigured");
    this.llmStatusText.textContent = customText || "LLM 未配置";
  }

  applyTheme(mode, presetId) {
    const preset = THEME_PRESETS[presetId] || THEME_PRESETS.ocean;
    const neutral = mode === "dark" ? DARK_NEUTRALS : LIGHT_NEUTRALS;
    this.themeMode = mode;
    this.themePreset = presetId in THEME_PRESETS ? presetId : "ocean";

    setCssVariable("--bg", neutral.bg);
    setCssVariable("--panel", neutral.panel);
    setCssVariable("--text", neutral.text);
    setCssVariable("--muted", neutral.muted);
    setCssVariable("--placeholder", neutral.placeholder);
    setCssVariable("--border", neutral.border);
    setCssVariable("--input-bg", neutral.inputBg);
    setCssVariable("--ghost-bg", neutral.ghostBg);
    setCssVariable("--ghost-hover", neutral.ghostHover);
    setCssVariable("--ghost-text", neutral.ghostText);
    setCssVariable("--icon-bg", neutral.iconBg);
    setCssVariable("--icon-hover", neutral.iconHover);

    setCssVariable("--primary", preset.primary);
    setCssVariable("--primary-hover", preset.primaryHover);
    setCssVariable("--secondary-bg", preset.secondaryBg);
    setCssVariable("--secondary-hover", preset.secondaryHover);
    setCssVariable("--secondary-text", preset.secondaryText);
    setCssVariable("--secondary-border", preset.secondaryBorder);

    document.body.classList.toggle("mode-dark", mode === "dark");
    document.body.classList.toggle("mode-light", mode !== "dark");

    this.setSvgUse(this.modeToggleIcon, mode === "dark" ? "#i-sun" : "#i-moon");
    this.modeToggleBtn.title = mode === "dark" ? "切换到亮色" : "切换到暗色";
    this.modeToggleBtn.setAttribute("aria-label", this.modeToggleBtn.title);

    this.themeSwatches.forEach((button) => {
      const active = button.dataset.theme === this.themePreset;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  async loadAppearanceSettings() {
    const [mode, preset] = await Promise.all([
      this.settingsService.getThemeMode(),
      this.settingsService.getThemePreset()
    ]);

    this.applyTheme(mode, preset);
  }

  async onThemeToggle() {
    const nextMode = this.themeMode === "dark" ? "light" : "dark";
    this.applyTheme(nextMode, this.themePreset);
    await this.settingsService.saveThemeMode(nextMode);
    this.setStatus(`已切换到${nextMode === "dark" ? "暗色" : "亮色"}模式。`);
  }

  async onThemePresetSelect(themeId) {
    if (!(themeId in THEME_PRESETS)) return;
    this.applyTheme(this.themeMode, themeId);
    await this.settingsService.saveThemePreset(themeId);
    this.setStatus("主题配色已切换。");
  }

  supportsWindowDetach() {
    return (
      window.location.protocol === "chrome-extension:" &&
      typeof chrome !== "undefined" &&
      !!chrome?.windows &&
      !!chrome?.runtime
    );
  }

  async findDetachedWindowId(targetUrl) {
    const allWindows = await chrome.windows.getAll({ populate: true });
    for (const win of allWindows) {
      const tabs = Array.isArray(win.tabs) ? win.tabs : [];
      const matched = tabs.some(
        (tab) => typeof tab.url === "string" && tab.url.startsWith(targetUrl)
      );
      if (matched && Number.isInteger(win.id)) {
        return win.id;
      }
    }
    return null;
  }

  async autoDetachFromActionPopupIfNeeded() {
    if (!this.supportsWindowDetach() || this.isDetachedWindow) {
      return false;
    }

    try {
      const detachedUrl = `${chrome.runtime.getURL("popup.html")}?detached=1`;
      const existingWindowId = await this.findDetachedWindowId(detachedUrl);
      if (existingWindowId !== null) {
        await chrome.windows.update(existingWindowId, { focused: true });
      } else {
        await chrome.windows.create({
          url: detachedUrl,
          type: "popup",
          width: 460,
          height: 760,
          focused: true
        });
      }
      window.close();
      return true;
    } catch (_error) {
      return false;
    }
  }

  mountPromptLibraryPanel() {
    if (!this.promptLibrary || !this.libraryMount) return;
    if (this.promptLibrary.parentElement === this.libraryMount) return;
    this.libraryMount.appendChild(this.promptLibrary);
  }

  async init() {
    if (await this.autoDetachFromActionPopupIfNeeded()) {
      return;
    }
    await this.dbService.open();
    this.mountPromptLibraryPanel();
    this.bindEvents();
    await this.templateService.ensureSeedData();
    await this.refreshTemplateOptions();
    await this.loadAppearanceSettings();
    await this.loadApiSettings();
    await this.refreshPromptSavePathView();
    this.renderAboutInfo();
    this.autoConnectOnStartup();
    this.syncSceneChips(this.sceneSelect.value || "writing");
    this.updateInputCount();
    this.updateSearchClearButtonVisibility();
    await this.refreshSavedPromptLibrary();
    this.updateUpdatedAtText();
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;
    this.modeToggleBtn.addEventListener("click", async () => this.onThemeToggle());
    if (this.helpToggleBtn) {
      this.helpToggleBtn.addEventListener("click", () => this.toggleAboutModal());
    }
    if (this.aboutBackdrop) {
      this.aboutBackdrop.addEventListener("click", (event) => this.onAboutBackdropClick(event));
    }
    if (this.libraryToggleBtn) {
      this.libraryToggleBtn.addEventListener("click", async () => this.toggleLibraryModal());
    }
    if (this.libraryBackdrop) {
      this.libraryBackdrop.addEventListener("click", (event) =>
        this.onLibraryBackdropClick(event)
      );
    }
    if (this.libraryCloseBtn) {
      this.libraryCloseBtn.addEventListener("click", () => this.closeLibraryModal());
    }
    document.addEventListener("keydown", (event) => this.onGlobalKeyDown(event));
    this.toggleApiKeyBtn.addEventListener("click", () => this.onToggleApiKeyVisibility());
    this.settingsToggleBtn.addEventListener("click", () => this.toggleSettingsPanel());
    this.cardToggles.forEach((toggleBtn) => {
      toggleBtn.addEventListener("click", () => this.toggleSettingsCard(toggleBtn));
    });
    this.saveSettingsBtn.addEventListener("click", async () => this.onSaveSettings());
    this.apiEndpointInput.addEventListener("input", (event) => this.onApiSettingsFieldInput(event));
    this.apiKeyInput.addEventListener("input", (event) => this.onApiSettingsFieldInput(event));
    this.apiModelInput.addEventListener("input", (event) => this.onApiSettingsFieldInput(event));
    this.themeSwatches.forEach((button) => {
      button.addEventListener("click", async () =>
        this.onThemePresetSelect(button.dataset.theme || "")
      );
    });
    this.sceneChips.forEach((button) => {
      button.addEventListener("click", () => {
        const scene = button.dataset.scene || "writing";
        this.sceneSelect.value = scene;
        this.syncSceneChips(scene);
        this.fillScenePreset(scene);
      });
    });
    this.sceneSelect.addEventListener("change", () => {
      const scene = this.sceneSelect.value || "writing";
      this.syncSceneChips(scene);
      this.fillScenePreset(scene);
    });
    this.inputText.addEventListener("input", () => this.updateInputCount());
    this.savedPromptSearchInput.addEventListener("input", async () =>
      this.onSavedPromptSearchInput()
    );
    this.savedPromptSearchInput.addEventListener("focus", async () =>
      this.refreshSavedPromptLibrary()
    );
    this.clearSavedPromptSearchBtn.addEventListener("click", () =>
      this.onClearSavedPromptSearch()
    );
    this.savedPromptFilterBtns.forEach((button) => {
      button.addEventListener("click", async () => {
        const filter = button.dataset.filter || "all";
        await this.onSavedPromptFilterChange(filter);
      });
    });
    if (this.templateSelect) {
      this.templateSelect.addEventListener("change", async () => this.onTemplateSelected());
    }
    this.optimizeBtn.addEventListener("click", async () => this.onOptimize());
    this.copyBtn.addEventListener("click", async () => this.onCopy());
    this.saveTemplateBtn.addEventListener("click", async () => this.onSaveTemplate());
    if (this.deleteTemplateBtn) {
      this.deleteTemplateBtn.addEventListener("click", async () => this.onDeleteTemplate());
    }
    if (this.selectPromptSaveDirBtn) {
      this.selectPromptSaveDirBtn.addEventListener("click", async () =>
        this.onSelectPromptSaveDir()
      );
    }
    if (this.fixPromptSaveDirBtn) {
      this.fixPromptSaveDirBtn.addEventListener("click", async () =>
        this.onFixPromptSaveDirPermission()
      );
    }
    this.exportBtn.addEventListener("click", async () => this.onExportTemplates());
    if (this.mergePromptLibraryBtn) {
      this.mergePromptLibraryBtn.addEventListener("click", async () =>
        this.onMergePromptLibrary()
      );
    }
  }

  getExtensionVersion() {
    try {
      if (typeof chrome === "undefined" || !chrome?.runtime?.getManifest) {
        return "";
      }
      const manifest = chrome.runtime.getManifest();
      const version =
        typeof manifest?.version === "string" ? manifest.version.trim() : "";
      return version;
    } catch (_error) {
      return "";
    }
  }

  renderAboutInfo() {
    if (this.aboutVersionText) {
      const version = this.getExtensionVersion();
      if (version) {
        this.aboutVersionText.textContent = `v${version}`;
        this.aboutVersionText.classList.remove("hidden");
      } else {
        this.aboutVersionText.textContent = "";
        this.aboutVersionText.classList.add("hidden");
      }
    }

    if (this.aboutDescriptionText) {
      this.aboutDescriptionText.textContent = ABOUT_INFO.extensionDescription || "";
    }

    if (this.aboutAuthorName) {
      this.aboutAuthorName.textContent = ABOUT_INFO.authorName || "未设置作者";
    }

    if (this.aboutAuthorLink) {
      const url = (ABOUT_INFO.authorLink || "").trim();
      if (url) {
        this.aboutAuthorLink.href = url;
        this.aboutAuthorLink.textContent = url;
        this.aboutAuthorLink.classList.remove("hidden");
      } else {
        this.aboutAuthorLink.textContent = "";
        this.aboutAuthorLink.classList.add("hidden");
      }
    }
  }

  toggleAboutModal(forceOpen) {
    const shouldOpen =
      typeof forceOpen === "boolean" ? forceOpen : !this.isAboutOpen;
    if (shouldOpen) {
      this.openAboutModal();
      return;
    }
    this.closeAboutModal();
  }

  openAboutModal() {
    if (!this.aboutBackdrop || !this.aboutModal) return;
    if (this.isLibraryOpen) {
      this.closeLibraryModal();
    }
    this.isAboutOpen = true;
    this.aboutBackdrop.classList.remove("hidden");
    this.aboutBackdrop.setAttribute("aria-hidden", "false");
    if (this.helpToggleBtn) {
      this.helpToggleBtn.setAttribute("aria-expanded", "true");
    }
    this.aboutModal.focus();
  }

  closeAboutModal() {
    if (!this.aboutBackdrop) return;
    this.isAboutOpen = false;
    this.aboutBackdrop.classList.add("hidden");
    this.aboutBackdrop.setAttribute("aria-hidden", "true");
    if (this.helpToggleBtn) {
      this.helpToggleBtn.setAttribute("aria-expanded", "false");
    }
  }

  async toggleLibraryModal(forceOpen) {
    const shouldOpen =
      typeof forceOpen === "boolean" ? forceOpen : !this.isLibraryOpen;
    if (shouldOpen) {
      await this.openLibraryModal();
      return;
    }
    this.closeLibraryModal();
  }

  async openLibraryModal() {
    if (!this.libraryBackdrop || !this.libraryModal) return;
    if (this.isAboutOpen) {
      this.closeAboutModal();
    }
    this.isLibraryOpen = true;
    this.libraryBackdrop.classList.remove("hidden");
    this.libraryBackdrop.setAttribute("aria-hidden", "false");
    if (this.libraryToggleBtn) {
      this.libraryToggleBtn.setAttribute("aria-expanded", "true");
    }
    await this.refreshSavedPromptLibrary();
    this.libraryModal.focus();
    this.savedPromptSearchInput?.focus();
  }

  closeLibraryModal() {
    if (!this.libraryBackdrop) return;
    this.isLibraryOpen = false;
    this.libraryBackdrop.classList.add("hidden");
    this.libraryBackdrop.setAttribute("aria-hidden", "true");
    if (this.libraryToggleBtn) {
      this.libraryToggleBtn.setAttribute("aria-expanded", "false");
    }
  }

  onAboutBackdropClick(event) {
    if (!this.isAboutOpen || !this.aboutBackdrop) return;
    if (event.target === this.aboutBackdrop) {
      this.closeAboutModal();
    }
  }

  onLibraryBackdropClick(event) {
    if (!this.isLibraryOpen || !this.libraryBackdrop) return;
    if (event.target === this.libraryBackdrop) {
      this.closeLibraryModal();
    }
  }

  onGlobalKeyDown(event) {
    if (event.key !== "Escape") return;
    if (this.isLibraryOpen) {
      this.closeLibraryModal();
      return;
    }
    if (this.isAboutOpen) {
      this.closeAboutModal();
    }
  }

  toggleSettingsPanel() {
    if (this.isAboutOpen) {
      this.closeAboutModal();
    }
    if (this.isLibraryOpen) {
      this.closeLibraryModal();
    }
    const willOpen = this.settingsPanel.classList.contains("hidden");
    this.settingsPanel.classList.toggle("hidden");
    this.settingsToggleBtn.setAttribute("aria-expanded", String(willOpen));
    if (this.appRoot) {
      this.appRoot.classList.toggle("settings-only", willOpen);
    }
  }

  toggleSettingsCard(toggleBtn) {
    const targetId = toggleBtn?.dataset?.target;
    if (!targetId) return;
    const body = byId(targetId);
    if (!body) return;
    const card = toggleBtn.closest(".settings-card");
    const collapsed = !card?.classList.contains("collapsed");
    if (card) {
      card.classList.toggle("collapsed", collapsed);
    }
    toggleBtn.setAttribute("aria-expanded", String(!collapsed));
  }

  async loadApiSettings() {
    const config = await this.settingsService.getApiConfig();
    this.apiEndpointInput.value = config.endpoint;
    this.apiKeyInput.value = config.apiKey;
    this.apiKeyInput.type = "password";
    this.toggleApiKeyBtn.setAttribute("aria-label", "显示 API Key");
    this.toggleApiKeyBtn.title = "显示 API Key";
    this.setSvgUse(this.toggleApiKeyIcon, "#i-eye");
    this.apiModelInput.value = config.model;
    this.apiClient.updateConfig(config);
    if (config.endpoint) {
      this.setLlmConnectionStatus("disconnected");
    } else {
      this.setLlmConnectionStatus("unconfigured");
    }
  }

  togglePromptSaveDirRepairButton(visible) {
    if (!this.fixPromptSaveDirBtn) return;
    this.fixPromptSaveDirBtn.classList.toggle("hidden", !visible);
  }

  async refreshPromptSavePathView(options = {}) {
    if (!this.promptSavePathText) return;
    const dirHandle =
      options.preferredHandle !== undefined
        ? options.preferredHandle
        : await this.settingsService.getPromptSaveDirHandle();
    this.promptSaveDirHandle = dirHandle || null;
    if (!dirHandle) {
      this.promptSavePathText.textContent = "未设置（请先选择保存目录）";
      this.togglePromptSaveDirRepairButton(false);
      return;
    }
    const dirName = dirHandle.name || "已授权目录";
    const pathLabel = `/${dirName}`;
    try {
      const readState = await ExportService.ensurePermission(dirHandle, "read", {
        requestIfNeeded: false
      });
      if (readState !== "granted") {
        this.promptSavePathText.textContent = `当前目录路径：${pathLabel} ｜ 目录权限已失效，请点击“一键修复目录权限”`;
        this.togglePromptSaveDirRepairButton(true);
        return;
      }

      const files = await ExportService.listPromptJsonFiles(dirHandle, {
        requestIfNeeded: false
      });
      let latestMs = 0;
      for (const item of files) {
        try {
          const file = await item.handle.getFile();
          latestMs = Math.max(latestMs, file.lastModified || 0);
        } catch (_error) {
          // 忽略读取失败文件，继续统计
        }
      }
      const latestText = latestMs ? this.formatLocalDateTime(latestMs) : "暂无";
      this.promptSavePathText.textContent = `当前目录路径：${pathLabel} ｜ 已保存：${files.length} ｜ 最近更新：${latestText}`;
      this.togglePromptSaveDirRepairButton(false);
    } catch (_error) {
      this.promptSavePathText.textContent = `当前目录路径：${pathLabel} ｜ 状态读取失败，请重新选择目录`;
      this.togglePromptSaveDirRepairButton(true);
    }
  }

  formatLocalDateTime(timestamp) {
    if (!timestamp) return "暂无";
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  }

  async pickPromptSaveDir(startInHandle = null) {
    if (!("showDirectoryPicker" in window)) {
      throw new Error("当前浏览器不支持目录选择，请升级 Chrome 后重试。");
    }
    const pickerOptions = { mode: "readwrite" };
    if (startInHandle) {
      pickerOptions.startIn = startInHandle;
    }
    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker(pickerOptions);
    } catch (error) {
      const canFallbackWithoutStartIn =
        !!startInHandle &&
        (error?.name === "SecurityError" ||
          error?.name === "TypeError" ||
          error?.name === "NotFoundError");
      if (!canFallbackWithoutStartIn) {
        throw error;
      }
      dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    }
    await ExportService.ensurePermission(dirHandle, "readwrite");
    this.promptSaveDirHandle = dirHandle;
    await this.settingsService.savePromptSaveDirHandle(dirHandle);
    await this.refreshPromptSavePathView({ preferredHandle: dirHandle });
    return dirHandle;
  }

  async onSelectPromptSaveDir() {
    try {
      await this.pickPromptSaveDir(this.promptSaveDirHandle);
      await this.refreshSavedPromptLibrary();
      this.setStatus("提示词保存目录已更新。");
    } catch (error) {
      if (error?.name === "AbortError") {
        this.setStatus("已取消选择保存目录。");
        return;
      }
      this.setStatus(`选择保存目录失败：${error.message}`, true);
    }
  }

  async onFixPromptSaveDirPermission() {
    try {
      await this.pickPromptSaveDir(null);
      await this.refreshSavedPromptLibrary();
      this.setStatus("目录权限已修复，保存目录已更新。");
    } catch (error) {
      if (error?.name === "AbortError") {
        this.setStatus("已取消修复目录权限。");
        return;
      }
      this.setStatus(`修复目录权限失败：${error.message}`, true);
    }
  }

  async autoConnectOnStartup() {
    const endpoint = this.apiClient?.config?.endpoint?.trim();
    if (!endpoint) {
      this.setLlmConnectionStatus("unconfigured");
      return;
    }

    if (window.location.protocol === "file:") {
      this.setLlmConnectionStatus("disconnected");
      this.setStatus("已读取接口配置；请在扩展环境中打开以自动连接 LLM。");
      return;
    }

    this.setLlmConnectionStatus("connecting", "LLM 自动连接中...");
    this.setStatus("检测到已保存接口，正在自动连接...");

    try {
      await this.verifyApiConnection();
      this.setLlmConnectionStatus("connected");
      this.setStatus("已自动连接 LLM。");
    } catch (error) {
      this.setLlmConnectionStatus("disconnected");
      this.setStatus(
        `已加载接口配置，但自动连接失败：${this.toShortErrorMessage(error)}`,
        true
      );
    }
  }

  clearApiFieldValidation() {
    const inputs = [this.apiEndpointInput, this.apiKeyInput, this.apiModelInput];
    for (const input of inputs) {
      if (!input?.setCustomValidity) continue;
      input.setCustomValidity("");
    }
  }

  clearSingleApiFieldValidation(input) {
    if (!input?.setCustomValidity) return;
    input.setCustomValidity("");
  }

  showApiValidationPopup({ input = null, message = "接口配置填写有误。", useNativeBubble = true }) {
    const tip = message || "接口配置填写有误。";
    this.setStatus(tip, true);

    if (input?.focus) {
      input.focus();
      if (typeof input.select === "function" && input.type !== "password") {
        input.select();
      }
    }

    if (useNativeBubble && input?.setCustomValidity && input?.reportValidity) {
      input.setCustomValidity(tip);
      input.reportValidity();
      return;
    }

    window.alert(`接口配置错误：\n${tip}`);
  }

  validateApiSettingsInputs({ endpoint, apiKey, model }) {
    if (apiKey && /\s/.test(apiKey)) {
      return {
        input: this.apiKeyInput,
        message: "API Key 中包含空格或换行，请重新粘贴纯净的 Key。"
      };
    }

    if (!endpoint) {
      return null;
    }

    try {
      PromptApiClient.resolveCompatibleEndpoint(endpoint);
    } catch (error) {
      return {
        input: this.apiEndpointInput,
        message: error?.message || "API 接口地址格式无效。"
      };
    }

    if (!model) {
      return {
        input: this.apiModelInput,
        message: "模型名称不能为空。"
      };
    }

    return null;
  }

  diagnoseApiConnectionError(error) {
    const raw = (error?.message || "").toLowerCase();
    if (/timeout|timed out|超时/.test(raw)) {
      return {
        input: this.apiEndpointInput,
        message: "连接测试超时（8 秒）。接口已保存，你可以直接使用，或稍后重试测试。"
      };
    }
    if (/401|403|unauthorized|authentication|invalid api key|api key/.test(raw)) {
      return {
        input: this.apiKeyInput,
        message: "连接失败：API Key 可能错误、过期或无权限。请检查 API Key。"
      };
    }
    if (/404|not found|endpoint/.test(raw)) {
      return {
        input: this.apiEndpointInput,
        message: "连接失败：API 接口地址可能填错（路径不存在）。请检查 endpoint。"
      };
    }
    if (/model|does not exist|not supported|unsupported/.test(raw)) {
      return {
        input: this.apiModelInput,
        message: "连接失败：模型名称可能填错或该接口不支持此模型。"
      };
    }
    return {
      input: null,
      message: `连接测试失败：${this.toShortErrorMessage(error)}`
    };
  }

  onApiSettingsFieldInput(event) {
    this.clearSingleApiFieldValidation(event?.target);
  }

  async onSaveSettings() {
    const endpoint = this.apiEndpointInput.value.trim();
    const apiKey = this.apiKeyInput.value.trim();
    const modelInput = this.apiModelInput.value.trim();
    const model = modelInput || "gpt-4";

    this.clearApiFieldValidation();
    const validationIssue = this.validateApiSettingsInputs({
      endpoint,
      apiKey,
      model: modelInput || model
    });
    if (validationIssue) {
      this.showApiValidationPopup({
        input: validationIssue.input,
        message: validationIssue.message,
        useNativeBubble: true
      });
      return;
    }

    const config = { endpoint, apiKey, model };
    await this.settingsService.saveApiConfig(config);
    this.apiClient.updateConfig(config);
    if (!endpoint) {
      this.setLlmConnectionStatus("unconfigured");
      this.setStatus("接口设置已保存（当前未配置 endpoint）。");
      return;
    }

    this.setLlmConnectionStatus("connecting", "LLM 连接测试中...");
    this.setStatus("接口设置已保存，正在检测连接...");

    try {
      await this.verifyApiConnection();
      this.setLlmConnectionStatus("connected");
      this.setStatus("接口设置已保存，连接测试通过。");
    } catch (error) {
      this.setLlmConnectionStatus("disconnected");
      const diagnostic = this.diagnoseApiConnectionError(error);
      this.showApiValidationPopup({
        input: diagnostic.input,
        message: diagnostic.message,
        useNativeBubble: !!diagnostic.input
      });
    }
  }

  async verifyApiConnection() {
    if (window.location.protocol === "file:") {
      throw new Error(
        "当前在 file:// 预览模式，浏览器会拦截跨域请求。请在 chrome://extensions 加载扩展后再测试。"
      );
    }

    const probePrompt = "ping";
    await this.apiClient.enhanceWithRemoteModel({
      input: probePrompt,
      scene: "workplace",
      prompt: probePrompt
    }, {
      timeoutMs: 8000,
      maxTokens: 8,
      skipSystemPrompt: true,
      temperature: 0,
      requireText: false
    });
  }

  toShortErrorMessage(error) {
    const raw = error?.message || String(error) || "未知错误";
    if (/Failed to fetch/i.test(raw)) {
      const endpoint = this.apiClient?.config?.endpoint || "";
      if (window.location.protocol === "file:") {
        return "当前是 file:// 页面，跨域请求会被拦截。请从 chrome://extensions 打开扩展再测。";
      }
      if (endpoint.startsWith("http://")) {
        try {
          const parsed = new URL(endpoint);
          if (PromptApiClient.isLocalDebugHost(parsed.hostname)) {
            return "本地调试地址请求失败。请确认本地服务已启动，并检查端口与 CORS 配置。";
          }
        } catch (_error) {
          // 忽略 URL 解析异常，走默认提示。
        }
        return "为保护 API Key，远程接口必须使用 https://。";
      }
      return "网络或 CORS 拦截。请确认接口允许浏览器跨域，必要时使用后端中转。";
    }
    return raw.length > 220 ? `${raw.slice(0, 220)}...` : raw;
  }

  onToggleApiKeyVisibility() {
    const isHidden = this.apiKeyInput.type === "password";
    this.apiKeyInput.type = isHidden ? "text" : "password";
    this.toggleApiKeyBtn.setAttribute(
      "aria-label",
      isHidden ? "隐藏 API Key" : "显示 API Key"
    );
    this.toggleApiKeyBtn.title = isHidden ? "隐藏 API Key" : "显示 API Key";
    this.setSvgUse(this.toggleApiKeyIcon, isHidden ? "#i-eye-off" : "#i-eye");
  }

  setStatus(message, isError = false) {
    this.status.textContent = message;
    this.status.style.color = isError ? "var(--status-error)" : "var(--muted)";
    this.updateUpdatedAtText();
  }

  updateUpdatedAtText() {
    if (!this.updatedAtText) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    this.updatedAtText.textContent = `更新于：${hh}:${mm}`;
  }

  setOptimizeLoading(isLoading) {
    this.isOptimizing = isLoading;
    this.optimizeBtn.disabled = isLoading;
    this.optimizeBtn.classList.toggle("is-loading", isLoading);
    if (this.optimizeBtnIcon) {
      this.setSvgUse(this.optimizeBtnIcon, isLoading ? "#i-loader" : "#i-sparkle");
    }
    if (this.optimizeBtnText) {
      this.optimizeBtnText.textContent = isLoading ? "优化中..." : "优化生成";
    }
  }

  syncSceneChips(scene) {
    this.sceneChips.forEach((button) => {
      const active = button.dataset.scene === scene;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  updateInputCount() {
    if (!this.inputWordCount || !this.inputText) return;
    this.inputWordCount.textContent = String(this.inputText.value.length);
  }

  clearSearchResults() {
    if (!this.savedPromptSearchResults) return;
    this.savedPromptSearchResults.innerHTML = "";
  }

  updateSearchClearButtonVisibility() {
    if (!this.savedPromptSearchInput || !this.clearSavedPromptSearchBtn) return;
    const hasText = !!this.savedPromptSearchInput.value.trim();
    this.clearSavedPromptSearchBtn.classList.toggle("hidden", !hasText);
  }

  normalizePromptName(name) {
    return String(name || "")
      .trim()
      .toLowerCase();
  }

  normalizeFileName(fileName) {
    return String(fileName || "")
      .trim()
      .toLowerCase();
  }

  getPromptDisplayNameFromFile(fileName) {
    return String(fileName || "")
      .replace(/\.json$/i, "")
      .trim();
  }

  hashText(value) {
    const text = String(value || "");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  buildPromptEntityId({ savedAt, prompt, fileName } = {}) {
    const normalizedSavedAt = String(savedAt || "").trim();
    const normalizedPrompt = String(prompt || "");
    if (normalizedSavedAt && normalizedPrompt) {
      return `sp:${this.hashText(`${normalizedSavedAt}\n${normalizedPrompt}`)}`;
    }
    if (normalizedSavedAt) {
      return `s:${normalizedSavedAt}`;
    }
    const normalizedFile = this.normalizeFileName(fileName);
    if (normalizedFile) {
      return `f:${normalizedFile}`;
    }
    return "unknown";
  }

  buildPromptFavoriteKey(item = {}) {
    const entityId = String(item.entityId || "").trim();
    if (entityId) {
      return `id:${entityId}`;
    }
    const normalizedFile = this.normalizeFileName(item.fileName);
    if (normalizedFile) {
      return `file:${normalizedFile}`;
    }
    return `name:${this.normalizePromptName(item.displayName || item.jsonName)}`;
  }

  buildLegacyPromptFavoriteKeys({ fileName, jsonName } = {}) {
    const keys = [];
    const normalizedFile = this.normalizeFileName(fileName);
    if (normalizedFile) {
      keys.push(`file:${normalizedFile}`);
    }
    const normalizedJsonName = this.normalizePromptName(jsonName);
    if (normalizedJsonName) {
      keys.push(`name:${normalizedJsonName}`);
      const sanitizedJsonFileName = `${ExportService.sanitizeFileName(
        String(jsonName).trim()
      )}.json`;
      const normalizedJsonFile = this.normalizeFileName(sanitizedJsonFileName);
      if (normalizedJsonFile) {
        keys.push(`file:${normalizedJsonFile}`);
      }
    }
    return [...new Set(keys)];
  }

  resolvePromptFavoriteState(primaryKey, legacyKeys, sourceMap = {}) {
    const keys = [primaryKey, ...legacyKeys].filter(Boolean);
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(sourceMap, key)) continue;
      const rawValue = sourceMap[key];
      if (typeof rawValue === "string" && rawValue.trim()) {
        return { key, favoriteAt: rawValue.trim() };
      }
      if (rawValue) {
        return { key, favoriteAt: nowISO() };
      }
    }
    return { key: "", favoriteAt: "" };
  }

  buildPromptLibraryMetaPayload(favoritesMap = {}) {
    return ExportService.normalizePromptLibraryMeta({
      version: 1,
      favorites: favoritesMap
    });
  }

  async savePromptFavoritesToLibrary(favoritesMap = {}) {
    if (!this.promptSaveDirHandle) {
      throw new Error("请先选择提示词保存目录。");
    }
    const meta = this.buildPromptLibraryMetaPayload(favoritesMap);
    await ExportService.savePromptLibraryMeta(this.promptSaveDirHandle, meta);
    this.promptFavoritesMap = meta.favorites;
  }

  buildPromptMergeFingerprint({ savedAt, updatedAt, prompt, fileName } = {}) {
    const normalizedTime = String(savedAt || updatedAt || "").trim();
    const normalizedPrompt = String(prompt || "");
    if (normalizedTime && normalizedPrompt) {
      return `sp:${this.hashText(`${normalizedTime}\n${normalizedPrompt}`)}`;
    }
    if (normalizedPrompt) {
      return `p:${this.hashText(normalizedPrompt)}`;
    }
    if (normalizedTime) {
      return `s:${normalizedTime}`;
    }
    const normalizedFile = this.normalizeFileName(fileName);
    if (normalizedFile) {
      return `f:${normalizedFile}`;
    }
    return "unknown";
  }

  buildImportedPromptFileName(baseName, attempt = 0) {
    const safeBase = ExportService.sanitizeFileName(
      String(baseName || "导入提示词").trim() || "导入提示词"
    );
    if (attempt <= 0) {
      return `${safeBase}-导入.json`;
    }
    return `${safeBase}-导入-${attempt + 1}.json`;
  }

  getUniquePromptImportFileName({
    desiredFileName,
    displayName,
    usedFileNames = new Set()
  } = {}) {
    const normalizedDesired = this.normalizeFileName(desiredFileName);
    if (normalizedDesired && !usedFileNames.has(normalizedDesired)) {
      return {
        fileName: desiredFileName,
        renamed: false
      };
    }

    const baseName =
      String(displayName || "").trim() ||
      this.getPromptDisplayNameFromFile(desiredFileName) ||
      "导入提示词";
    let attempt = 0;
    let candidate = this.buildImportedPromptFileName(baseName, attempt);
    while (usedFileNames.has(this.normalizeFileName(candidate))) {
      attempt += 1;
      candidate = this.buildImportedPromptFileName(baseName, attempt);
    }
    return {
      fileName: candidate,
      renamed: true
    };
  }

  async isSameDirectoryHandle(leftHandle, rightHandle) {
    if (!leftHandle || !rightHandle) return false;
    if (typeof leftHandle.isSameEntry === "function") {
      try {
        return await leftHandle.isSameEntry(rightHandle);
      } catch (_error) {
        return false;
      }
    }
    return false;
  }

  async readPromptItemsFromDirectory(dirHandle, options = {}) {
    const files = await ExportService.listPromptJsonFiles(dirHandle, options);
    const items = [];
    let invalidCount = 0;

    for (const item of files) {
      try {
        const file = await item.handle.getFile();
        const rawText = await file.text();
        const parsed = JSON.parse(rawText);
        const prompt =
          typeof parsed?.prompt === "string" ? parsed.prompt : "";
        const jsonName =
          typeof parsed?.name === "string" && parsed.name.trim()
            ? parsed.name.trim()
            : "";
        const savedAt =
          typeof parsed?.savedAt === "string" && parsed.savedAt.trim()
            ? parsed.savedAt.trim()
            : "";
        const scene =
          typeof parsed?.scene === "string" && SCENE_CONFIG[parsed.scene]
            ? parsed.scene
            : "writing";
        const updatedAt =
          savedAt ||
          (file?.lastModified
            ? new Date(file.lastModified).toISOString()
            : nowISO());
        const displayName =
          this.getPromptDisplayNameFromFile(item.name) ||
          jsonName ||
          item.name.replace(/\.json$/i, "");
        const entityId = this.buildPromptEntityId({
          savedAt,
          prompt,
          fileName: item.name
        });

        items.push({
          fileName: item.name,
          handle: item.handle,
          rawText,
          parsed,
          prompt,
          jsonName,
          displayName,
          savedAt,
          updatedAt,
          scene,
          entityId,
          mergeFingerprint: this.buildPromptMergeFingerprint({
            savedAt,
            updatedAt,
            prompt,
            fileName: item.name
          })
        });
      } catch (_error) {
        invalidCount += 1;
      }
    }

    return {
      items,
      invalidCount
    };
  }

  toTimeMs(value) {
    const ms = Date.parse(value || "");
    return Number.isFinite(ms) ? ms : 0;
  }

  getSceneLabel(scene) {
    return SCENE_CONFIG[scene]?.label || "通用";
  }

  formatPromptTime(value) {
    const ms = this.toTimeMs(value);
    if (!ms) return "未知时间";
    const date = new Date(ms);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${mm}-${dd} ${hh}:${mi}`;
  }

  getPromptPreview(prompt) {
    const normalized = String(prompt || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized) return "空内容";
    return normalized.slice(0, 140);
  }

  updateSavedPromptFilterButtons() {
    this.savedPromptFilterBtns.forEach((button) => {
      const active = button.dataset.filter === this.savedPromptFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  getFilteredSavedPromptItems(keyword) {
    const text = String(keyword || "").trim().toLowerCase();
    let items = [...this.savedPromptSearchCache];

    if (this.savedPromptFilter === "favorite") {
      items = items
        .filter((item) => item.isFavorite)
        .sort(
          (a, b) =>
            this.toTimeMs(b.favoriteAt || b.updatedAt) -
            this.toTimeMs(a.favoriteAt || a.updatedAt)
        );
    } else {
      items = items.sort(
        (a, b) => this.toTimeMs(b.updatedAt) - this.toTimeMs(a.updatedAt)
      );
      if (this.savedPromptFilter === "recent") {
        items = items.slice(0, 20);
      }
    }

    if (!text) return items;

    return items.filter((item) => {
      const name = String(item.displayName || "").toLowerCase();
      return name.includes(text);
    });
  }

  renderSearchResults(items) {
    if (!this.savedPromptSearchResults) return;
    this.savedPromptSearchResults.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "search-empty";
      const hasKeyword = !!this.savedPromptSearchInput?.value.trim();
      if (!this.promptSaveDirHandle) {
        empty.textContent = "请先通过“保存该提示词”设置保存目录";
      } else if (hasKeyword) {
        empty.textContent = "未找到匹配的提示词";
      } else if (this.savedPromptFilter === "favorite") {
        empty.textContent = "还没有收藏的提示词";
      } else {
        empty.textContent = "目录内暂无可显示的提示词";
      }
      this.savedPromptSearchResults.appendChild(empty);
      return;
    }

    for (const item of items) {
      const row = document.createElement("div");
      row.className = "search-item library-item";

      const main = document.createElement("div");
      main.className = "library-item-main";
      main.addEventListener("click", () => this.onSelectSavedPrompt(item));

      const titleRow = document.createElement("div");
      titleRow.className = "library-item-title-row";

      const title = document.createElement("span");
      title.className = "library-item-title";
      title.textContent = item.displayName || "未命名提示词";

      titleRow.appendChild(title);
      

      const meta = document.createElement("div");
      meta.className = "library-item-meta";
      meta.textContent = `更新于 ${this.formatPromptTime(item.updatedAt)}`;

      main.appendChild(titleRow);
      main.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "library-item-actions";

      const favoriteBtn = document.createElement("button");
      favoriteBtn.type = "button";
      favoriteBtn.className = `library-action-btn${
        item.isFavorite ? " is-favorite" : ""
      }`;
      favoriteBtn.title = item.isFavorite ? "取消收藏" : "收藏";
      favoriteBtn.setAttribute("aria-label", favoriteBtn.title);
      favoriteBtn.setAttribute("aria-pressed", String(item.isFavorite));
      favoriteBtn.innerHTML =
        '<svg class="ui-icon ui-icon-sm" aria-hidden="true"><use href="#i-bookmark"></use></svg>';
      favoriteBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        await this.onToggleSavedPromptFavorite(item);
      });

      const insertBtn = document.createElement("button");
      insertBtn.type = "button";
      insertBtn.className = "library-action-btn";
      insertBtn.title = "插入到输入框";
      insertBtn.setAttribute("aria-label", insertBtn.title);
      insertBtn.innerHTML =
        '<svg class="ui-icon ui-icon-sm" aria-hidden="true"><use href="#i-edit"></use></svg>';
      insertBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        this.onInsertSavedPromptToInput(item);
      });

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "library-action-btn";
      copyBtn.title = "复制提示词";
      copyBtn.setAttribute("aria-label", copyBtn.title);
      copyBtn.innerHTML =
        '<svg class="ui-icon ui-icon-sm" aria-hidden="true"><use href="#i-copy"></use></svg>';
      copyBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        await this.onCopySavedPrompt(item);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "library-action-btn danger";
      deleteBtn.title = "删除提示词";
      deleteBtn.setAttribute("aria-label", deleteBtn.title);
      deleteBtn.innerHTML =
        '<svg class="ui-icon ui-icon-sm" aria-hidden="true"><use href="#i-x"></use></svg>';
      deleteBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        await this.onDeleteSavedPrompt(item);
      });

      actions.appendChild(favoriteBtn);
      actions.appendChild(insertBtn);
      actions.appendChild(copyBtn);
      actions.appendChild(deleteBtn);

      row.appendChild(main);
      row.appendChild(actions);
      this.savedPromptSearchResults.appendChild(row);
    }
  }

  async loadSavedPromptSearchCache() {
    const legacyFavoritesMap = await this.settingsService.getPromptFavorites();
    const sourceDirHandle = await this.settingsService.getPromptSaveDirHandle();
    this.promptLibraryMetaError = "";
    if (!sourceDirHandle) {
      this.promptFavoritesMap = {};
      this.savedPromptSearchCache = [];
      this.promptSaveDirHandle = null;
      return;
    }
    this.promptSaveDirHandle = sourceDirHandle;

    let libraryMeta = ExportService.createEmptyPromptLibraryMeta();
    let hasLibraryMeta = false;
    let shouldUseLegacyFavorites = true;
    try {
      const loadedMeta = await ExportService.readPromptLibraryMeta(sourceDirHandle, {
        requestIfNeeded: false
      });
      if (loadedMeta) {
        libraryMeta = loadedMeta;
        hasLibraryMeta = true;
        shouldUseLegacyFavorites = false;
      }
    } catch (error) {
      shouldUseLegacyFavorites = false;
      this.promptLibraryMetaError =
        error?.message || "词库收藏数据读取失败，已按空收藏处理。";
    }

    const files = await ExportService.listPromptJsonFiles(sourceDirHandle);
    const cache = [];
    const favoriteSourceMap = hasLibraryMeta
      ? libraryMeta.favorites
      : shouldUseLegacyFavorites
      ? legacyFavoritesMap
      : {};
    const nextFavoritesMap = hasLibraryMeta ? { ...libraryMeta.favorites } : {};
    let shouldWriteLibraryMeta = false;

    for (const item of files) {
      try {
        const file = await item.handle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);
        const promptText = typeof parsed?.prompt === "string" ? parsed.prompt : "";
        const jsonName =
          typeof parsed?.name === "string" && parsed.name.trim()
            ? parsed.name.trim()
            : "";
        const displayName =
          this.getPromptDisplayNameFromFile(item.name) ||
          jsonName ||
          item.name.replace(/\.json$/i, "");
        const savedAt =
          typeof parsed?.savedAt === "string" && parsed.savedAt.trim()
            ? parsed.savedAt.trim()
            : "";
        const scene =
          typeof parsed?.scene === "string" && SCENE_CONFIG[parsed.scene]
            ? parsed.scene
            : "writing";
        const updatedAt =
          savedAt
            ? savedAt
            : file?.lastModified
            ? new Date(file.lastModified).toISOString()
            : nowISO();
        const entityId = this.buildPromptEntityId({
          savedAt,
          prompt: promptText,
          fileName: item.name
        });
        const favoriteKey = this.buildPromptFavoriteKey({ entityId });
        const legacyFavoriteKeys = this.buildLegacyPromptFavoriteKeys({
          fileName: item.name,
          jsonName
        });
        const favoriteState = this.resolvePromptFavoriteState(
          favoriteKey,
          legacyFavoriteKeys,
          favoriteSourceMap
        );
        if (favoriteState.key) {
          nextFavoritesMap[favoriteKey] = favoriteState.favoriteAt || nowISO();
          for (const legacyKey of legacyFavoriteKeys) {
            if (
              legacyKey !== favoriteKey &&
              Object.prototype.hasOwnProperty.call(nextFavoritesMap, legacyKey)
            ) {
              delete nextFavoritesMap[legacyKey];
            }
          }
          if (!hasLibraryMeta || favoriteState.key !== favoriteKey) {
            shouldWriteLibraryMeta = true;
          }
        }
        cache.push({
          fileName: item.name,
          jsonName,
          entityId,
          displayName,
          prompt: promptText,
          scene,
          savedAt,
          updatedAt,
          isFavorite: Boolean(favoriteState.key),
          favoriteAt: favoriteState.favoriteAt || ""
        });
      } catch (_error) {
        // 忽略格式异常文件，不中断搜索功能
      }
    }

    if (shouldWriteLibraryMeta) {
      try {
        await this.savePromptFavoritesToLibrary(nextFavoritesMap);
      } catch (error) {
        this.promptLibraryMetaError =
          error?.message || "词库收藏数据写入失败，请稍后重试。";
      }
    } else {
      this.promptFavoritesMap = nextFavoritesMap;
    }

    this.savedPromptSearchCache = cache;
  }

  async refreshSavedPromptLibrary() {
    try {
      await this.loadSavedPromptSearchCache();
      this.updateSavedPromptFilterButtons();
      const keyword = this.savedPromptSearchInput?.value || "";
      const items = this.getFilteredSavedPromptItems(keyword);
      this.renderSearchResults(items);
      if (this.promptLibraryMetaError) {
        if (this.lastPromptLibraryMetaError !== this.promptLibraryMetaError) {
          this.setStatus(this.promptLibraryMetaError, true);
          this.lastPromptLibraryMetaError = this.promptLibraryMetaError;
        }
      } else {
        this.lastPromptLibraryMetaError = "";
      }
    } catch (error) {
      if (!this.savedPromptSearchResults) return;
      this.savedPromptSearchResults.innerHTML = "";
      const fail = document.createElement("div");
      fail.className = "search-empty";
      fail.textContent = `提示词库加载失败：${error.message}`;
      this.savedPromptSearchResults.appendChild(fail);
    }
  }

  async onSavedPromptFilterChange(filter) {
    if (!["favorite", "recent", "all"].includes(filter)) return;
    this.savedPromptFilter = filter;
    this.updateSavedPromptFilterButtons();
    const keyword = this.savedPromptSearchInput?.value || "";
    const items = this.getFilteredSavedPromptItems(keyword);
    this.renderSearchResults(items);
  }

  async onSavedPromptSearchInput() {
    const keyword = this.savedPromptSearchInput.value.trim();
    this.updateSearchClearButtonVisibility();
    const items = this.getFilteredSavedPromptItems(keyword);
    this.renderSearchResults(items);
  }

  onSelectSavedPrompt(item) {
    if (!item?.prompt) {
      this.setStatus("该提示词文件内容为空。", true);
      return;
    }
    this.outputText.value = item.prompt;
    if (this.templateName) {
      this.templateName.value = item.displayName;
    }
    this.setStatus(`已预览提示词：${item.displayName}`);
  }

  onInsertSavedPromptToInput(item) {
    if (!item?.prompt) {
      this.setStatus("该提示词内容为空。", true);
      return;
    }
    this.inputText.value = item.prompt;
    this.updateInputCount();
    if (this.sceneSelect && item.scene) {
      this.sceneSelect.value = item.scene;
      this.syncSceneChips(item.scene);
    }
    this.setStatus(`已插入到输入框：${item.displayName}`);
  }

  async onCopySavedPrompt(item) {
    if (!item?.prompt) {
      this.setStatus("该提示词内容为空。", true);
      return;
    }
    try {
      await navigator.clipboard.writeText(item.prompt);
      this.setStatus(`已复制提示词：${item.displayName}`);
    } catch (_error) {
      this.outputText.value = item.prompt;
      this.outputText.select();
      document.execCommand("copy");
      this.setStatus(`已复制提示词（兼容模式）：${item.displayName}`);
    }
  }

  async onToggleSavedPromptFavorite(item) {
    if (!item) return;
    try {
      const key = this.buildPromptFavoriteKey(item);
      const legacyKeys = this.buildLegacyPromptFavoriteKeys({
        fileName: item.fileName,
        jsonName: item.jsonName
      });
      const nextMap = { ...this.promptFavoritesMap };
      if (item.isFavorite) {
        delete nextMap[key];
        for (const legacyKey of legacyKeys) {
          delete nextMap[legacyKey];
        }
      } else {
        nextMap[key] = nowISO();
      }
      await this.savePromptFavoritesToLibrary(nextMap);
      await this.refreshSavedPromptLibrary();
      this.setStatus(
        item.isFavorite
          ? `已取消收藏：${item.displayName}`
          : `已收藏提示词：${item.displayName}`
      );
    } catch (error) {
      this.setStatus(`收藏操作失败：${error.message}`, true);
    }
  }

  async onDeleteSavedPrompt(item) {
    if (!item) return;
    const canDeleteFile = !!(
      item.fileName &&
      this.promptSaveDirHandle &&
      typeof this.promptSaveDirHandle.removeEntry === "function"
    );
    const confirmText = canDeleteFile
      ? `确定删除提示词“${item.displayName}”吗？将同时删除保存目录里的 JSON 文件。`
      : `确定删除提示词“${item.displayName}”吗？`;
    const ok = window.confirm(confirmText);
    if (!ok) return;
    try {
      if (canDeleteFile) {
        await ExportService.ensurePermission(this.promptSaveDirHandle, "readwrite");
        await this.promptSaveDirHandle.removeEntry(item.fileName);
      }
      const key = this.buildPromptFavoriteKey(item);
      const legacyKeys = this.buildLegacyPromptFavoriteKeys({
        fileName: item.fileName,
        jsonName: item.jsonName
      });
      const keysToDelete = [key, ...legacyKeys];
      const shouldUpdateFavorites = keysToDelete.some((favoriteKey) =>
        Object.prototype.hasOwnProperty.call(this.promptFavoritesMap, favoriteKey)
      );
      if (shouldUpdateFavorites) {
        const nextMap = { ...this.promptFavoritesMap };
        for (const favoriteKey of keysToDelete) {
          delete nextMap[favoriteKey];
        }
        await this.savePromptFavoritesToLibrary(nextMap);
      }
      await this.refreshSavedPromptLibrary();
      await this.refreshPromptSavePathView({ preferredHandle: this.promptSaveDirHandle });
      this.setStatus(
        canDeleteFile
          ? `已删除提示词文件：${item.displayName}`
          : `当前环境不支持直接删除文件：${item.displayName}`
      );
    } catch (error) {
      this.setStatus(`删除提示词失败：${error.message}`, true);
    }
  }

  onClearSavedPromptSearch() {
    this.savedPromptSearchInput.value = "";
    this.updateSearchClearButtonVisibility();
    const items = this.getFilteredSavedPromptItems("");
    this.renderSearchResults(items);
    this.savedPromptSearchInput.focus();
  }

  fillScenePreset(scene) {
    const preset = SCENE_INPUT_PRESETS[scene];
    if (!preset) return;
    this.inputText.value = preset;
    this.updateInputCount();
  }

  async refreshTemplateOptions(selectedId = "") {
    const templates = await this.templateService.listTemplates();
    this.templateCache = templates;
    if (!this.templateSelect) {
      return;
    }

    this.templateSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "请选择提示词（可选）";
    this.templateSelect.appendChild(placeholder);

    for (const tpl of templates) {
      const option = document.createElement("option");
      option.value = String(tpl.id);
      option.textContent = `${SCENE_CONFIG[tpl.scene]?.label || "通用"} - ${tpl.name}`;
      this.templateSelect.appendChild(option);
    }

    if (selectedId) {
      this.templateSelect.value = String(selectedId);
    }
  }

  async onTemplateSelected() {
    if (!this.templateSelect) return;
    const id = Number(this.templateSelect.value);
    if (!id) return;
    const template = await this.templateService.getTemplate(id);
    if (!template) return;
    this.sceneSelect.value = template.scene;
    this.syncSceneChips(template.scene);
    this.inputText.value = template.content;
    this.updateInputCount();
    if (this.templateName) {
      this.templateName.value = template.name;
    }
    this.setStatus("已填充提示词内容。");
  }

  async onOptimize() {
    if (this.isOptimizing) {
      this.setStatus("正在优化中，请稍候...");
      return;
    }

    const input = this.inputText.value.trim();
    if (!input) {
      this.setStatus("请先输入想法或问题。", true);
      return;
    }

    this.setOptimizeLoading(true);
    this.setStatus(
      this.apiClient.config.endpoint ? "正在调用远程 LLM..." : "正在本地优化提示词..."
    );

    const scene = this.sceneSelect.value;
    const selectedTemplateId = this.templateSelect ? Number(this.templateSelect.value) || null : null;
    const template = selectedTemplateId
      ? this.templateCache.find((item) => item.id === selectedTemplateId)
      : null;

    const localPrompt = PromptEnhancer.build({
      input,
      scene,
      templateContent: template?.content || ""
    });

    let enhancedPrompt = localPrompt;
    let remoteUsed = false;

    try {
      if (this.apiClient.config.endpoint) {
        this.setLlmConnectionStatus("connecting", "LLM 处理中...");
        enhancedPrompt = await this.apiClient.enhanceWithRemoteModel({
          input,
          scene,
          prompt: localPrompt
        });
        remoteUsed = true;
        this.setLlmConnectionStatus("connected");
      } else {
        this.setLlmConnectionStatus("unconfigured");
      }
    } catch (error) {
      this.setLlmConnectionStatus("disconnected");
      enhancedPrompt = localPrompt;
      this.setStatus(`远程调用失败，已回退本地增强：${error.message}`, true);
    }

    try {
      this.outputText.value = enhancedPrompt;
      await this.historyService.addHistory({
        input,
        output: enhancedPrompt,
        scene,
        templateId: selectedTemplateId
      });
      if (remoteUsed) {
        this.setStatus("优化完成（远程 LLM），结果已保存到历史记录。");
      } else if (!this.apiClient.config.endpoint) {
        this.setStatus("优化完成（本地增强），结果已保存到历史记录。");
      }
    } finally {
      this.setOptimizeLoading(false);
    }
  }

  async onCopy() {
    const output = this.outputText.value.trim();
    if (!output) {
      this.setStatus("当前没有可复制内容。", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      this.setStatus("已复制到剪贴板。");
    } catch (_error) {
      // 兼容少数环境下 clipboard API 不可用的情况。
      this.outputText.select();
      document.execCommand("copy");
      this.setStatus("已复制到剪贴板（兼容模式）。");
    }
  }

  async onSaveTemplate() {
    const sourceText = this.outputText.value.trim() || this.inputText.value.trim();
    if (!sourceText) {
      this.setStatus("请先输入内容或先生成优化结果。", true);
      return;
    }

    try {
      let dirHandle = this.promptSaveDirHandle;
      if (!dirHandle) {
        this.setStatus("首次保存需要先选择保存目录...");
        dirHandle = await this.pickPromptSaveDir(this.promptSaveDirHandle);
      }
      await ExportService.ensurePermission(dirHandle, "readwrite");

      const defaultName = this.templateName
        ? this.templateName.value.trim() || this.buildAutoTemplateName()
        : this.buildAutoTemplateName();
      const typedName = window.prompt("请输入要保存的提示词名称", defaultName);
      if (typedName === null) {
        this.setStatus("已取消保存。");
        return;
      }
      let chosenName = typedName.trim();
      if (!chosenName) {
        this.setStatus("提示词名称不能为空。", true);
        return;
      }

      while (true) {
        const existed = await ExportService.promptFileExists({
          dirHandle,
          promptName: chosenName
        });
        if (!existed) {
          break;
        }

        const fileName = ExportService.buildPromptFileName(chosenName);
        const shouldOverwrite = window.confirm(
          `已存在同名提示词文件：${fileName}
点击“确定”覆盖，点击“取消”改名保存。`
        );
        if (shouldOverwrite) {
          break;
        }

        const renamed = window.prompt(
          "请输入新的提示词名称（将保存为新文件）",
          `${chosenName}-副本`
        );
        if (renamed === null) {
          this.setStatus("已取消保存。");
          return;
        }

        const nextName = renamed.trim();
        if (!nextName) {
          this.setStatus("提示词名称不能为空。", true);
          continue;
        }

        chosenName = nextName;
      }

      const saveResult = await ExportService.savePromptToDirectory({
        dirHandle,
        promptName: chosenName,
        promptText: sourceText,
        scene: this.sceneSelect.value
      });

      await this.refreshPromptSavePathView({ preferredHandle: dirHandle });

      const key = await this.templateService.saveTemplate({
        name: chosenName,
        scene: this.sceneSelect.value,
        content: sourceText
      });
      if (this.templateName) {
        this.templateName.value = chosenName;
      }
      await this.refreshTemplateOptions(key);
      if (this.templateSelect) {
        this.templateSelect.value = String(key);
      }
      await this.refreshSavedPromptLibrary();
      this.setStatus(`提示词已保存：${saveResult.fileName}`);
    } catch (error) {
      if (error?.name === "AbortError") {
        this.setStatus("已取消保存。");
        return;
      }
      this.setStatus(`保存提示词失败：${error.message}`, true);
    }
  }

  buildAutoTemplateName() {
    const sceneLabel = SCENE_CONFIG[this.sceneSelect.value]?.label || "通用";
    const shortInput = this.inputText.value.trim().replace(/\s+/g, " ").slice(0, 12);
    const clock = new Date();
    const hh = String(clock.getHours()).padStart(2, "0");
    const mm = String(clock.getMinutes()).padStart(2, "0");
    const suffix = `${hh}${mm}`;
    if (shortInput) {
      return `${sceneLabel} - ${shortInput} - ${suffix}`;
    }
    return `${sceneLabel}提示词 - ${suffix}`;
  }

  async onDeleteTemplate() {
    if (!this.templateSelect) {
      this.setStatus("当前界面已隐藏删除功能。");
      return;
    }
    const id = Number(this.templateSelect.value);
    if (!id) {
      this.setStatus("请先选择要删除的提示词。", true);
      return;
    }

    try {
      await this.templateService.deleteTemplate(id);
      await this.refreshTemplateOptions();
      if (this.templateName) {
        this.templateName.value = "";
      }
      this.setStatus("提示词已删除。");
    } catch (error) {
      this.setStatus(`删除提示词失败：${error.message}`, true);
    }
  }

  async onMergePromptLibrary() {
    try {
      if (!("showDirectoryPicker" in window)) {
        this.setStatus("当前浏览器不支持目录选择，请升级 Chrome 后重试。", true);
        return;
      }

      let targetDirHandle =
        this.promptSaveDirHandle ||
        (await this.settingsService.getPromptSaveDirHandle());
      if (!targetDirHandle) {
        this.setStatus("请先选择当前提示词保存目录，再导入另一份词库。", true);
        return;
      }

      await ExportService.ensurePermission(targetDirHandle, "readwrite");
      this.promptSaveDirHandle = targetDirHandle;

      let sourceDirHandle;
      try {
        sourceDirHandle = await window.showDirectoryPicker({ mode: "read" });
      } catch (error) {
        const canFallback =
          error?.name === "TypeError" || error?.name === "SecurityError";
        if (!canFallback) {
          throw error;
        }
        sourceDirHandle = await window.showDirectoryPicker();
      }

      if (await this.isSameDirectoryHandle(sourceDirHandle, targetDirHandle)) {
        this.setStatus("来源词库和当前词库是同一个目录，无需合并。", true);
        return;
      }

      this.setStatus("正在导入并合并词库，请稍候...");

      await this.loadSavedPromptSearchCache();

      const { items: sourceItems, invalidCount } =
        await this.readPromptItemsFromDirectory(sourceDirHandle, {
          requestIfNeeded: false
        });
      if (!sourceItems.length) {
        this.setStatus("来源词库没有可导入的提示词文件。", true);
        return;
      }

      let sourceMeta = null;
      let sourceMetaError = "";
      try {
        sourceMeta = await ExportService.readPromptLibraryMeta(sourceDirHandle, {
          requestIfNeeded: false
        });
      } catch (error) {
        sourceMetaError =
          error?.message || "来源词库收藏文件读取失败，已按空收藏处理。";
      }

      const sourceFavoritesMap = sourceMeta?.favorites || {};
      const nextFavoritesMap = { ...this.promptFavoritesMap };
      const usedFileNames = new Set(
        this.savedPromptSearchCache.map((item) =>
          this.normalizeFileName(item.fileName)
        )
      );
      const targetFingerprintMap = new Map();
      for (const item of this.savedPromptSearchCache) {
        const fingerprint = this.buildPromptMergeFingerprint({
          savedAt: item.savedAt,
          updatedAt: item.updatedAt,
          prompt: item.prompt,
          fileName: item.fileName
        });
        if (!fingerprint || fingerprint === "unknown") continue;
        if (!targetFingerprintMap.has(fingerprint)) {
          targetFingerprintMap.set(fingerprint, item);
        }
      }

      let importedCount = 0;
      let skippedDuplicateCount = 0;
      let renamedCount = 0;
      let mergedFavoriteCount = 0;

      for (const sourceItem of sourceItems) {
        let targetItemRef =
          targetFingerprintMap.get(sourceItem.mergeFingerprint) || null;

        if (targetItemRef) {
          skippedDuplicateCount += 1;
        } else {
          const uniqueFileResult = this.getUniquePromptImportFileName({
            desiredFileName: sourceItem.fileName,
            displayName: sourceItem.displayName,
            usedFileNames
          });

          await ExportService.writePromptFileToDirectory({
            dirHandle: targetDirHandle,
            fileName: uniqueFileResult.fileName,
            text: sourceItem.rawText
          });

          if (uniqueFileResult.renamed) {
            renamedCount += 1;
          }
          importedCount += 1;

          usedFileNames.add(this.normalizeFileName(uniqueFileResult.fileName));

          targetItemRef = {
            fileName: uniqueFileResult.fileName,
            displayName:
              this.getPromptDisplayNameFromFile(uniqueFileResult.fileName) ||
              sourceItem.displayName,
            jsonName: sourceItem.jsonName,
            prompt: sourceItem.prompt,
            savedAt: sourceItem.savedAt,
            updatedAt: sourceItem.updatedAt,
            entityId: this.buildPromptEntityId({
              savedAt: sourceItem.savedAt,
              prompt: sourceItem.prompt,
              fileName: uniqueFileResult.fileName
            })
          };

          if (
            sourceItem.mergeFingerprint &&
            sourceItem.mergeFingerprint !== "unknown" &&
            !targetFingerprintMap.has(sourceItem.mergeFingerprint)
          ) {
            targetFingerprintMap.set(sourceItem.mergeFingerprint, targetItemRef);
          }
        }

        const sourceFavoriteState = this.resolvePromptFavoriteState(
          this.buildPromptFavoriteKey({ entityId: sourceItem.entityId }),
          this.buildLegacyPromptFavoriteKeys({
            fileName: sourceItem.fileName,
            jsonName: sourceItem.jsonName
          }),
          sourceFavoritesMap
        );

        if (sourceFavoriteState.key) {
          const targetFavoriteKey = this.buildPromptFavoriteKey({
            entityId: targetItemRef.entityId
          });
          if (
            targetFavoriteKey &&
            !Object.prototype.hasOwnProperty.call(
              nextFavoritesMap,
              targetFavoriteKey
            )
          ) {
            nextFavoritesMap[targetFavoriteKey] =
              sourceFavoriteState.favoriteAt || nowISO();
            mergedFavoriteCount += 1;
          }
        }
      }

      if (mergedFavoriteCount > 0) {
        await this.savePromptFavoritesToLibrary(nextFavoritesMap);
      }

      await this.refreshSavedPromptLibrary();
      await this.refreshPromptSavePathView({
        preferredHandle: targetDirHandle
      });

      let summary = `词库已合并：新增 ${importedCount} 条，跳过重复 ${skippedDuplicateCount} 条，合并收藏 ${mergedFavoriteCount} 条`;
      if (renamedCount > 0) {
        summary += `，重命名 ${renamedCount} 条`;
      }
      if (invalidCount > 0) {
        summary += `，跳过异常文件 ${invalidCount} 条`;
      }
      if (sourceMetaError) {
        summary += `。${sourceMetaError}`;
      }
      this.setStatus(summary);
    } catch (error) {
      if (error?.name === "AbortError") {
        this.setStatus("已取消导入词库。");
        return;
      }
      this.setStatus(`导入并合并词库失败：${error.message}`, true);
    }
  }

  async onExportTemplates() {
    try {
      if (!("showDirectoryPicker" in window)) {
        this.setStatus("当前浏览器不支持目录选择，请升级 Chrome 后重试。", true);
        return;
      }

      const sourceDirHandle = await this.settingsService.getPromptSaveDirHandle();
      if (!sourceDirHandle) {
        this.setStatus("尚未设置提示词保存目录，请先点击“保存该提示词”。", true);
        return;
      }

      const sourceFiles = await ExportService.listPromptJsonFiles(sourceDirHandle);
      if (!sourceFiles.length) {
        this.setStatus("保存目录中没有可导出的提示词文件。", true);
        return;
      }

      const lastExportDirHandle = await this.settingsService.getExportDirHandle();
      const pickerOptions = {};
      if (lastExportDirHandle) {
        pickerOptions.startIn = lastExportDirHandle;
      }
      const targetParentDirHandle = await window.showDirectoryPicker(pickerOptions);
      const packageFolderName = `${timeStampForFile()}-立方体智库`;
      const exportResult = await ExportService.exportAllPromptFiles({
        sourceDirHandle,
        targetParentDirHandle,
        packageFolderName
      });

      await this.settingsService.saveExportDirHandle(targetParentDirHandle);
      this.setStatus(
        `已导出 ${exportResult.fileCount} 个提示词到文件夹：${exportResult.folderName}`
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        this.setStatus("已取消导出。");
        return;
      }
      this.setStatus(`导出提示词失败：${error.message}`, true);
    }
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const controller = new PopupController();
  try {
    await controller.init();
  } catch (error) {
    byId("status").textContent = `初始化失败：${error.message}`;
    byId("status").style.color = "#c0392b";
  }
});
