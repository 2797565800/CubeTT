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
const MAX_HISTORY = 200;
const ABOUT_INFO = {
  extensionDescription:
    "输入想法后自动优化为高质量提示词，支持模板复用、本地保存与导出，并可快捷存储和调用 AI 绘画提示词。",
  authorName: "CubeTT",
  authorLink: "https://github.com/"
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
      let request;
      try {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        request = executor(store, tx);
      } catch (error) {
        reject(error);
        return;
      }
      if (!request) {
        resolve(undefined);
        return;
      }
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
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

  async enhanceWithRemoteModel(payload) {
    if (!this.config.endpoint) {
      throw new Error("未配置远程 API endpoint。");
    }

    const headers = {
      "Content-Type": "application/json"
    };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const endpoint = this.config.endpoint.trim();
    const isResponsesApi = /\/responses(?:\?|$)/i.test(endpoint);
    const requestBody = isResponsesApi
      ? {
          model: this.config.model,
          input: payload.prompt
        }
      : {
          model: this.config.model,
          messages: [
            {
              role: "system",
              content: "你是提示词优化专家。请仅输出优化后的中文提示词内容，不要解释。"
            },
            {
              role: "user",
              content: payload.prompt
            }
          ],
          temperature: 0.2
        };

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 300);
      throw new Error(`远程接口请求失败（HTTP ${response.status}）：${errorText}`);
    }

    const data = await response.json();
    const text = PromptApiClient.extractTextFromResponse(data);
    if (!text) {
      throw new Error("远程接口返回成功，但未解析到文本结果。");
    }
    return text;
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

  static async ensurePermission(handle, mode = "readwrite") {
    if (!handle?.queryPermission || !handle?.requestPermission) return;
    const queried = await handle.queryPermission({ mode });
    if (queried === "granted") return;
    const requested = await handle.requestPermission({ mode });
    if (requested !== "granted") {
      throw new Error("没有目录访问权限，请授权后重试。");
    }
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

  static async savePromptToDirectory({ dirHandle, promptName, promptText, scene }) {
    await ExportService.ensurePermission(dirHandle, "readwrite");
    const fileName = `${ExportService.sanitizeFileName(promptName)}.json`;
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

  static async listPromptJsonFiles(dirHandle) {
    await ExportService.ensurePermission(dirHandle, "read");
    const files = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === "file" && /\.json$/i.test(name)) {
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
    this.promptSavePathText = byId("promptSavePathText");
    this.inputText = byId("inputText");
    this.inputWordCount = byId("inputWordCount");
    this.outputText = byId("outputText");
    this.savedPromptSearchInput = byId("savedPromptSearchInput");
    this.savedPromptSearchResults = byId("savedPromptSearchResults");
    this.clearSavedPromptSearchBtn = byId("clearSavedPromptSearchBtn");
    this.templateName = byId("templateName");
    this.status = byId("status");
    this.updatedAtText = byId("updatedAtText");
    this.optimizeBtn = byId("optimizeBtn");
    this.optimizeBtnIcon = byId("optimizeBtnIcon");
    this.optimizeBtnText = this.optimizeBtn.querySelector("span:last-child");
    this.copyBtn = byId("copyBtn");
    this.saveTemplateBtn = byId("saveTemplateBtn");
    this.deleteTemplateBtn = byId("deleteTemplateBtn");
    this.exportBtn = byId("exportBtn");

    this.themeMode = "light";
    this.themePreset = "ocean";
    this.isDetachedWindow =
      new URLSearchParams(window.location.search).get("detached") === "1";
    this.isOptimizing = false;
    this.isAboutOpen = false;
    this.savedPromptSearchCache = [];
    this.promptSaveDirHandle = null;
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

  async init() {
    if (await this.autoDetachFromActionPopupIfNeeded()) {
      return;
    }
    await this.dbService.open();
    await this.templateService.ensureSeedData();
    await this.refreshTemplateOptions();
    await this.loadAppearanceSettings();
    await this.loadApiSettings();
    await this.refreshPromptSavePathView();
    this.renderAboutInfo();
    this.bindEvents();
    this.autoConnectOnStartup();
    this.syncSceneChips(this.sceneSelect.value || "writing");
    this.updateInputCount();
    this.updateSearchClearButtonVisibility();
    this.updateUpdatedAtText();
  }

  bindEvents() {
    this.modeToggleBtn.addEventListener("click", async () => this.onThemeToggle());
    if (this.helpToggleBtn) {
      this.helpToggleBtn.addEventListener("click", () => this.toggleAboutModal());
    }
    if (this.aboutBackdrop) {
      this.aboutBackdrop.addEventListener("click", (event) => this.onAboutBackdropClick(event));
    }
    document.addEventListener("keydown", (event) => this.onGlobalKeyDown(event));
    this.toggleApiKeyBtn.addEventListener("click", () => this.onToggleApiKeyVisibility());
    this.settingsToggleBtn.addEventListener("click", () => this.toggleSettingsPanel());
    this.cardToggles.forEach((toggleBtn) => {
      toggleBtn.addEventListener("click", () => this.toggleSettingsCard(toggleBtn));
    });
    this.saveSettingsBtn.addEventListener("click", async () => this.onSaveSettings());
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
    this.clearSavedPromptSearchBtn.addEventListener("click", () =>
      this.onClearSavedPromptSearch()
    );
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
    this.exportBtn.addEventListener("click", async () => this.onExportTemplates());
  }

  renderAboutInfo() {
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

  onAboutBackdropClick(event) {
    if (!this.isAboutOpen || !this.aboutBackdrop) return;
    if (event.target === this.aboutBackdrop) {
      this.closeAboutModal();
    }
  }

  onGlobalKeyDown(event) {
    if (event.key === "Escape" && this.isAboutOpen) {
      this.closeAboutModal();
    }
  }

  toggleSettingsPanel() {
    if (this.isAboutOpen) {
      this.closeAboutModal();
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

  async refreshPromptSavePathView() {
    if (!this.promptSavePathText) return;
    const dirHandle = await this.settingsService.getPromptSaveDirHandle();
    this.promptSaveDirHandle = dirHandle || null;
    if (!dirHandle) {
      this.promptSavePathText.textContent = "未设置（请先选择保存目录）";
      return;
    }
    const dirName = dirHandle.name || "已授权目录";
    const pathLabel = `/${dirName}`;
    const files = await ExportService.listPromptJsonFiles(dirHandle);
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
    const pickerOptions = {};
    if (startInHandle) {
      pickerOptions.startIn = startInHandle;
    }
    const dirHandle = await window.showDirectoryPicker(pickerOptions);
    this.promptSaveDirHandle = dirHandle;
    await this.settingsService.savePromptSaveDirHandle(dirHandle);
    await this.refreshPromptSavePathView();
    return dirHandle;
  }

  async onSelectPromptSaveDir() {
    try {
      await this.pickPromptSaveDir(this.promptSaveDirHandle);
      this.setStatus("提示词保存目录已更新。");
    } catch (error) {
      if (error?.name === "AbortError") {
        this.setStatus("已取消选择保存目录。");
        return;
      }
      this.setStatus(`选择保存目录失败：${error.message}`, true);
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

  async onSaveSettings() {
    const endpoint = this.apiEndpointInput.value.trim();
    const apiKey = this.apiKeyInput.value.trim();
    const model = this.apiModelInput.value.trim() || "gpt-4";

    if (endpoint) {
      try {
        // 校验 URL 基本格式，避免保存明显无效地址。
        new URL(endpoint);
      } catch (_error) {
        this.setStatus("API 接口地址格式无效。", true);
        return;
      }
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
      this.setStatus(
        `接口已保存，但连接失败：${this.toShortErrorMessage(error)}`,
        true
      );
    }
  }

  async verifyApiConnection() {
    if (window.location.protocol === "file:") {
      throw new Error(
        "当前在 file:// 预览模式，浏览器会拦截跨域请求。请在 chrome://extensions 加载扩展后再测试。"
      );
    }

    const probePrompt = "连接测试：请仅回复“连接成功”。";
    await this.apiClient.enhanceWithRemoteModel({
      input: probePrompt,
      scene: "workplace",
      prompt: probePrompt
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
        return "接口是 http://，浏览器安全策略可能拦截。请改为 https://。";
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
    this.savedPromptSearchResults.innerHTML = "";
    this.savedPromptSearchResults.classList.add("hidden");
  }

  updateSearchClearButtonVisibility() {
    const hasText = !!this.savedPromptSearchInput.value.trim();
    this.clearSavedPromptSearchBtn.classList.toggle("hidden", !hasText);
  }

  renderSearchResults(items) {
    this.savedPromptSearchResults.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "search-empty";
      empty.textContent = "未找到匹配的提示词";
      this.savedPromptSearchResults.appendChild(empty);
      this.savedPromptSearchResults.classList.remove("hidden");
      return;
    }

    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-item";
      btn.textContent = item.displayName;
      btn.addEventListener("click", () => this.onSelectSavedPrompt(item));
      this.savedPromptSearchResults.appendChild(btn);
    }

    this.savedPromptSearchResults.classList.remove("hidden");
  }

  async loadSavedPromptSearchCache() {
    const sourceDirHandle = await this.settingsService.getPromptSaveDirHandle();
    if (!sourceDirHandle) {
      this.savedPromptSearchCache = [];
    this.promptSaveDirHandle = null;
      return;
    }

    const files = await ExportService.listPromptJsonFiles(sourceDirHandle);
    const cache = [];

    for (const item of files) {
      try {
        const file = await item.handle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);
        const promptText = typeof parsed?.prompt === "string" ? parsed.prompt : "";
        const name = typeof parsed?.name === "string" ? parsed.name : item.name.replace(/\.json$/i, "");
        cache.push({
          fileName: item.name,
          displayName: name,
          prompt: promptText
        });
      } catch (_error) {
        // 忽略格式异常文件，不中断搜索功能
      }
    }

    this.savedPromptSearchCache = cache;
  }

  async onSavedPromptSearchInput() {
    const keyword = this.savedPromptSearchInput.value.trim().toLowerCase();
    this.updateSearchClearButtonVisibility();
    if (!keyword) {
      this.clearSearchResults();
      return;
    }

    try {
      const sourceDirHandle = await this.settingsService.getPromptSaveDirHandle();
      if (!sourceDirHandle) {
        this.savedPromptSearchResults.innerHTML = "";
        const tip = document.createElement("div");
        tip.className = "search-empty";
        tip.textContent = "请先通过“保存该提示词”设置保存目录";
        this.savedPromptSearchResults.appendChild(tip);
        this.savedPromptSearchResults.classList.remove("hidden");
        return;
      }

      await this.loadSavedPromptSearchCache();
      const matches = this.savedPromptSearchCache.filter((item) =>
        item.displayName.toLowerCase().includes(keyword)
      );
      this.renderSearchResults(matches.slice(0, 50));
    } catch (error) {
      this.savedPromptSearchResults.innerHTML = "";
      const fail = document.createElement("div");
      fail.className = "search-empty";
      fail.textContent = `搜索失败：${error.message}`;
      this.savedPromptSearchResults.appendChild(fail);
      this.savedPromptSearchResults.classList.remove("hidden");
    }
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
    this.savedPromptSearchInput.value = item.displayName;
    this.updateSearchClearButtonVisibility();
    this.clearSearchResults();
    this.setStatus(`已导入提示词：${item.displayName}`);
  }

  onClearSavedPromptSearch() {
    this.savedPromptSearchInput.value = "";
    this.updateSearchClearButtonVisibility();
    this.clearSearchResults();
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

      const defaultName = this.templateName
        ? this.templateName.value.trim() || this.buildAutoTemplateName()
        : this.buildAutoTemplateName();
      const typedName = window.prompt("请输入要保存的提示词名称", defaultName);
      if (typedName === null) {
        this.setStatus("已取消保存。");
        return;
      }
      const name = typedName.trim();
      if (!name) {
        this.setStatus("提示词名称不能为空。", true);
        return;
      }

      const saveResult = await ExportService.savePromptToDirectory({
        dirHandle,
        promptName: name,
        promptText: sourceText,
        scene: this.sceneSelect.value
      });

      await this.refreshPromptSavePathView();

      const key = await this.templateService.saveTemplate({
        name,
        scene: this.sceneSelect.value,
        content: sourceText
      });
      if (this.templateName) {
        this.templateName.value = name;
      }
      await this.refreshTemplateOptions(key);
      if (this.templateSelect) {
        this.templateSelect.value = String(key);
      }
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
