/**
 * Buleks Todo（待办中心）for SiYuan
 *
 * 独立的任务/需求看板：
 *   - 点「新增待办」自己建任务（不扫描笔记）
 *   - 状态流转：待处理 / 进行中 / 已完成 / 已关闭 / 已取消
 *   - 按「分组」组织，组内按完成时间从新到旧排序
 *   - 待办可打标签，支持按 分组 + 标签 细化查看
 *   - 首页汇总：近 7 天已完成的待办按天汇总
 *   - 完成、关闭、取消都记录时间，并保留完整变更历史
 */
const { Plugin, Dialog, Menu, showMessage, openTab } = require("siyuan");

const PLUGIN_NAME = "buleks-todo";
const TAB_TYPE = "todo-board";
const STORAGE_KEY = "board.json";      // 存储文件（带后缀）
const LEGACY_KEY = "board";            // 旧版无后缀文件，仅用于迁移读取
const ARCHIVE_PREFIX = "archive-";     // 归档文件前缀：archive-YYYY.json
const PAGE_SIZE = 50;                  // 列表分页：每页渲染条数

const STATUSES = ["todo", "doing", "done", "closed", "cancelled"];
const STATUS_COLOR = {
    todo: "#8a8f99",
    doing: "#3b7cff",
    done: "#2ea84f",
    closed: "#6b7280",
    cancelled: "#d23f31",
};
const STATUS_ICON = {
    todo: "iconUncheck",
    doing: "iconPlay",
    done: "iconCheck",
    closed: "iconClose",
    cancelled: "iconClose",
};
const PALETTE = ["#3b7cff", "#2ea84f", "#e08a1e", "#d23f31", "#8b5cf6", "#0891b2", "#db2777", "#65a30d"];

const ZH = {
    title: "Blueks代办",
    newTask: "新增待办",
    searchPlaceholder: "搜索标题 / 描述",
    groups: "分组",
    allGroups: "全部",
    ungrouped: "未分组",
    newGroup: "新建分组",
    groupName: "分组名称",
    groupColor: "分组颜色",
    rename: "重命名",
    changeColor: "修改颜色",
    deleteGroup: "删除分组",
    deleteGroupConfirm: "删除后，该分组下的待办会移到「未分组」。确定删除吗？",
    groupNamePlaceholder: "例如：登录模块、支付流程",
    create: "创建",
    cancel: "取消",
    save: "保存",
    delete: "删除",
    confirm: "确定",
    statusTodo: "待处理",
    statusDoing: "进行中",
    statusDone: "已完成",
    statusClosed: "已关闭",
    statusCancelled: "已取消",
    statusChange: "切换状态",
    priority: "优先级",
    priorityNone: "无",
    priorityHigh: "高",
    priorityMid: "中",
    priorityLow: "低",
    dueDate: "截止",
    noDue: "无截止日期",
    createdAt: "创建时间",
    startedAt: "开始时间",
    doneAt: "完成时间",
    closedAt: "关闭时间",
    cancelledAt: "取消时间",
    detail: "详情",
    desc: "描述",
    descPlaceholder: "补充背景、验收标准…",
    history: "变更历史",
    noHistory: "暂无记录",
    deleteTask: "删除待办",
    deleteTaskConfirm: "删除后不可恢复，确定删除这条待办吗？",
    emptyTasks: "还没有待办",
    emptyTasksHint: "点右上角「新增待办」开始",
    noTasksInGroup: "这个分组下还没有待办",
    selectTask: "选择一条待办查看详情",
    newTaskTitle: "新建待办",
    taskTitle: "标题",
    taskTitlePlaceholder: "要做什么？",
    taskGroup: "分组",
    taskDesc: "描述（可选）",
    createTask: "创建",
    titleRequired: "请填写标题",
    activeCount: "{0} 进行中",
    doneCount: "{0} 已完成",
    todayDone: "今日完成 {0}",
    activeTotal: "{0} 项进行中",
    evCreate: "创建任务",
    evStatus: "状态 {0} → {1}",
    evTitle: "标题 {0} → {1}",
    evDue: "截止日期 {0} → {1}",
    evPriority: "优先级 {0} → {1}",
    evGroup: "分组 {0} → {1}",
    evDesc: "更新了描述",
    evNone: "无",
    duration: "用时 {0}",
    durationDay: "{0} 天",
    durationHour: "{0} 小时",
    durationMin: "{0} 分钟",
    close: "关闭",
    justCreated: "已创建",
    groupCreated: "分组已创建",
    filterAll: "全部",
    noGroupYet: "还没有分组，先建一个分组吧",
    boardMenu: "菜单",
    stats: "时间信息",
    tags: "标签",
    tagFilter: "标签",
    tagPlaceholder: "输入标签，回车添加（可多个）",
    tagNewPlaceholder: "用空格或逗号分隔多个标签",
    evTagAdd: "添加标签 {0}",
    evTagRemove: "移除标签 {0}",
    evTagChange: "标签 {0} → {1}",
    summaryTitle: "近7天汇总",
    summaryDone: "近7天完成 {0} 项",
    summaryDoneClosed: "近7天完成 {0} 项 · 关闭 {1} 项",
    summaryEmpty: "近7天还没有完成或关闭的待办",
    summaryGroups: "按分组：",
    settings: "设置",
    settingsTitle: "Blueks代办设置",
    settingsNotebook: "文档目录所在笔记本",
    settingsBasePath: "文档目录（笔记本下的路径）",
    settingsBasePathPlaceholder: "例如：待办中心",
    settingsHint: "为待办新建思源文档时，将创建到「笔记本 / 文档目录 / 分组 / 年月 / 待办名称」",
    editGroup: "编辑分组",
    archiveBtn: "归档已关闭待办",
    archiveTitle: "归档已关闭待办",
    archiveConfirm: "将 {0} 条已关闭的待办归档？归档后按关闭年份存入归档文件，开启「含归档」后仍可按分组和标签查看。",
    archivedDone: "已归档 {0} 条（{1}）",
    nothingToArchive: "没有已关闭的待办可归档",
    includeArchived: "含归档",
    filedChip: "归档 {0}",
    filedHint: "该待办已归档（{0} 年），仅供查看，如需修改请先取消归档",
    loadMore: "加载更多",
    remainingCount: "还有 {0} 条",
    unarchive: "取消归档",
    importBtn: "导入历史待办",
    importTitle: "导入历史待办",
    importHint: "每行一条待办，格式：- [X] 标题 / - [ ] 标题 / - [-] 标题（X=已完成，空=待办，-=已取消）。支持思源块引用 ((20260528100236-m90xogm \"标题\"))，导入后点击 📄 图标可直接打开关联文档。历史导入的已完成/已取消项不带时间，不进入近7天汇总。",
    importGroup: "导入到分组",
    importNewGroup: "或新建分组（填了则优先使用）",
    importGo: "开始导入",
    importDone: "已导入 {0} 条待办",
    importEmpty: "没有解析到任何待办，请检查格式",
    linkedDoc: "关联思源文档",
    relinkBtn: "修改关联",
    relinkTitle: "修改关联文档",
    relinkHint: "原关联的思源文档被删除或移动后，可在此改绑。支持粘贴：\n· 思源块引用，如 ((20260528100236-m90xogm \"标题\"))\n· 思源链接，如 siyuan://blocks/20260528100236-m90xogm\n· 直接粘贴 20 位块 ID",
    relinkPlaceholder: "粘贴块引用 / siyuan:// 链接 / 块 ID",
    relinkGo: "确认关联",
    relinkInvalid: "未找到该文档或块，请确认 ID 是否仍然存在",
    relinkDone: "已更新关联文档",
    relinkCleared: "已清除关联文档",
    clearDoc: "清除关联",
    clearDocConfirm: "确定清除该待办的关联文档？清除后可重新生成或再次关联。",
    batchToggle: "批量",
    batchSelCount: "已选 {0} 项",
    batchSelectAll: "全选",
    batchClear: "清空",
    batchDelete: "删除",
    batchDone: "已批量更新 {0} 条待办",
    batchSkipped: "{0} 条已归档待办已跳过（只读）",
    batchDeleteConfirm: "确定删除选中的 {0} 条待办？删除后不可恢复。",
    batchDeleted: "已删除 {0} 条待办",
    batchNoSelection: "请先勾选待办",
    batchNothingChanged: "选中待办无需更新",
    settingsSaved: "设置已保存",
    openDoc: "打开文档",
    createDoc: "新建思源文档",
    docCreated: "思源文档已创建",
    noSettings: "请先在设置里配置文档目录",
    docEvent: "创建思源文档",
    docName: "关联文档",
    loading: "加载中…",
    noNotebooks: "没有可用笔记本",
};

/* ---------------- 工具 ---------------- */
const pad2 = (n) => String(n).padStart(2, "0");
function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}
function fmtDate(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fmtDateInput(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fmtTime(ts) {
    const d = new Date(ts);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fmtDateTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return `${sameYear ? "" : d.getFullYear() + "-"}${fmtDate(ts)} ${fmtTime(ts)}`;
}
function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const WEEK_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
function fmtDayLabel(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${WEEK_CN[d.getDay()]}`;
}
function parseTags(s) {
    const out = [];
    String(s || "").split(/[\s,，、#]+/).forEach((x) => {
        const v = x.trim();
        if (v && !out.includes(v)) out.push(v);
    });
    return out;
}

const ICONS = `<symbol id="iconTodoHub" viewBox="0 0 32 32">
<path fill="currentColor" opacity=".16" d="M8.5 4h15A2.5 2.5 0 0 1 26 6.5v21a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 6 27.5v-21A2.5 2.5 0 0 1 8.5 4Z"/>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M8.5 5.5h15A1.5 1.5 0 0 1 25 7v20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 7 27V7a1.5 1.5 0 0 1 1.5-1.5Z"/>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2.6h8v4.2h-8z" stroke-linejoin="round"/>
<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="m11.6 16.4 3.1 3.1 6-6.4"/>
</symbol>
<symbol id="iconImport" viewBox="0 0 32 32">
<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M16 5v13m0 0-5.5-5.5M16 18l5.5-5.5"/>
<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M5 20.5V25a2.5 2.5 0 0 0 2.5 2.5h17A2.5 2.5 0 0 0 27 25v-4.5"/>
</symbol>`;

/* ---------------- 插件 ---------------- */
module.exports = class TodoHub extends Plugin {

    async onload() {
        // loadData 返回的是文件原始字符串（内核不解析 JSON），需手动 parse；
        // 缺文件或读取失败时返回 ""，按 null 处理
        const loadRaw = async (key) => {
            let raw = null;
            try {
                raw = await this.loadData(key);
            } catch (e) {
                raw = null;
            }
            if (typeof raw === "string") {
                if (!raw.trim()) return null;
                try {
                    return JSON.parse(raw);
                } catch (e) {
                    console.error("[buleks-todo] parse storage failed", e);
                    return null;
                }
            }
            return raw || null;
        };
        // 优先读 board.json，兼容迁移旧的无后缀 board 文件
        let saved = await loadRaw(STORAGE_KEY);
        if (!saved) saved = await loadRaw(LEGACY_KEY);
        this.board = Object.assign({ version: 1, groups: [], tasks: [], ui: {}, settings: {} }, saved || {});
        this.board.groups = Array.isArray(this.board.groups) ? this.board.groups : [];
        this.board.tasks = Array.isArray(this.board.tasks) ? this.board.tasks : [];
        this.board.ui = Object.assign({ group: "all", status: "all", taskId: "", tags: [], summary: true, includeArchived: false }, this.board.ui || {});
        // 旧版单选标签迁移
        if (!Array.isArray(this.board.ui.tags)) {
            this.board.ui.tags = this.board.ui.tag ? [this.board.ui.tag] : [];
        }
        delete this.board.ui.tag;
        this.board.settings = Object.assign({ notebook: "", basePath: "待办中心" }, this.board.settings || {});
        this.board.groups.forEach((g, i) => {
            if (!g.id) g.id = uid("g");
            if (!g.color) g.color = PALETTE[i % PALETTE.length];
            if (typeof g.order !== "number") g.order = i;
        });
        this.board.tasks.forEach((t) => {
            t.history = Array.isArray(t.history) ? t.history : [];
            if (!t.status) t.status = "todo";
            t.tags = Array.isArray(t.tags) ? t.tags : [];
        });
        this.board.archiveYears = Array.isArray(this.board.archiveYears) ? this.board.archiveYears : [];

        // 归档数据：按年份分文件 archive-YYYY.json
        this.archives = {};
        for (const y of this.board.archiveYears) {
            const data = await loadRaw(`${ARCHIVE_PREFIX}${y}.json`);
            const tasks = data && Array.isArray(data.tasks) ? data.tasks : [];
            tasks.forEach((t) => {
                t.history = Array.isArray(t.history) ? t.history : [];
                t.tags = Array.isArray(t.tags) ? t.tags : [];
                if (!t.status) t.status = "closed";
            });
            this.archives[y] = tasks;
        }
        this.rebuildArchivedIndex();

        this.search = "";
        this.page = 1;
        this.collapsed = new Set();
        this.batch = false;          // 批量操作模式（会话级，不持久化）
        this.batchSel = new Set();   // 批量选中的任务 id
        this.el = {};
        this.editBase = null;

        this.addIcons(ICONS);
        this.injectCss();
        this.addCommand({
            key: "todo-board-new",
            customHotkey: "⌥⌘T",
            callback: () => this.openBoard(true),
            editorCallback: () => this.openBoard(true),
        });
        this.addTab({
            type: TAB_TYPE,
            init: (tab) => this.initBoard(tab),
            destroy: () => { this.el = {}; },
        });
    }

    onLayoutReady() {
        this.addTopBar({
            icon: "iconTodoHub",
            title: this.t("title"),
            position: "right",
            callback: () => this.openBoard(false),
        });
    }

    onunload() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        const css = document.getElementById("buleks-todo-css");
        if (css) css.remove();
    }

    openBoard(withNew) {
        try {
            // 注意：custom.id 必须等于 注册键 = 插件名 + 页签type（直接拼接，无分隔符），
            // 否则内核在 plugin.models 里找不到工厂函数，页签会打开但没有内容
            const tab = openTab({
                app: this.app,
                custom: {
                    icon: "iconTodoHub",
                    title: this.t("title"),
                    id: PLUGIN_NAME + TAB_TYPE,
                },
            });
            if (!tab) {
                console.error("[buleks-todo] openTab returned nothing; tab model not found");
                showMessage(this.t("title"));
            }
        } catch (e) {
            console.error("[buleks-todo] openTab failed", e);
            showMessage(this.t("title"));
        }
        if (withNew) {
            setTimeout(() => this.openCreateDialog(), 500);
        }
    }

    /* ---------------- 基础 ---------------- */
    t(key, ...args) {
        let s = (this.i18n && this.i18n[key]) || ZH[key] || key;
        args.forEach((v, i) => { s = s.split(`{${i}}`).join(String(v)); });
        return s;
    }

    injectCss() {
        if (document.getElementById("buleks-todo-css")) return;
        const link = document.createElement("link");
        link.id = "buleks-todo-css";
        link.rel = "stylesheet";
        link.href = `/plugins/${PLUGIN_NAME}/index.css`;
        document.head.appendChild(link);
    }

    save() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            this.saveData(STORAGE_KEY, this.board).catch((e) => console.error("[buleks-todo] save failed", e));
        }, 300);
    }

    /* ---------------- 思源 API ---------------- */
    async api(endpoint, data) {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data || {}),
        });
        const r = await res.json();
        if (r.code !== 0) throw new Error(r.msg || endpoint);
        return r.data;
    }

    docFolderName(task) {
        // 两层：分组 / 年月
        const d = new Date();
        return {
            group: this.groupName(task.groupId),
            ym: `${d.getFullYear()}${pad2(d.getMonth() + 1)}`,
        };
    }

    openTaskDoc(task) {
        if (!task) return;
        // docId：插件生成的待办文档；blockId：导入历史待办时的思源块引用
        const id = task.docId || task.blockId;
        if (!id) return;
        try {
            openTab({ app: this.app, doc: { id } });
        } catch (e) {
            console.error("[buleks-todo] open doc failed", e);
        }
    }

    async createTaskDoc(task) {
        if (!task) return;
        const s = this.board.settings;
        if (!s || !s.notebook) {
            showMessage(this.t("noSettings"));
            this.openSettingsDialog();
            return;
        }
        const seg = (x) => String(x).replace(/[\\/:*?"<>|#\[\]]/g, "_").trim();
        const parts = [];
        const base = seg(s.basePath || "");
        if (base) parts.push(base);
        const folder = this.docFolderName(task);
        parts.push(seg(folder.group));
        parts.push(folder.ym);
        parts.push(seg(task.title) || "todo");
        const hpath = "/" + parts.join("/");
        const md = `# ${task.title}\n\n> 来自「Blueks代办」，状态：${this.statusLabel(task.status)}${(task.tags || []).length ? "，标签：" + task.tags.map((x) => "#" + x).join(" ") : ""}\n\n${task.desc || ""}\n`;
        try {
            const docId = await this.api("/api/filetree/createDocWithMd", {
                notebook: s.notebook, path: hpath, markdown: md,
            });
            task.docId = typeof docId === "string" ? docId : (docId && docId.id) || "";
            task.docPath = hpath;
            task.history.push({ ts: Date.now(), g: task.groupId, type: "doc", to: hpath });
            this.save();
            this.renderDetail();
            showMessage(this.t("docCreated"));
            this.openTaskDoc(task);
        } catch (e) {
            console.error("[buleks-todo] create doc failed", e);
            showMessage(String(e.message || e));
        }
    }

    /* ---------------- 修改关联文档 ---------------- */
    // 从多种输入中提取思源块 ID：
    // ((20260528100236-m90xogm "标题")) / siyuan://blocks/20260528100236-m90xogm / 裸 20 位 ID
    extractBlockId(text) {
        const s = String(text || "").trim();
        if (!s) return "";
        const RE = /[0-9]{14}-[a-z0-9]+/i;
        const pats = [
            s.match(/\(\(([0-9]{14}-[a-z0-9]+)/i),
            s.match(/siyuan:\/\/blocks\/([0-9]{14}-[a-z0-9]+)/i),
            RE.test(s) && !/\s/.test(s) ? s.match(RE) : null,
        ];
        for (const m of pats) if (m) return m[1] || m[0];
        return "";
    }

    // 关联文档失效（被删除/移动）后改绑：校验块存在性，取文档 root 与路径
    async relinkDoc(task) {
        if (!task) return;
        const dlg = new Dialog({
            title: this.t("relinkTitle"),
            width: "520px",
            content: `<div class="b3-dialog__content">
<div class="tb-dlg-text" style="white-space:pre-line">${esc(this.t("relinkHint"))}</div>
<input class="b3-text-field fn__block" id="tbRelinkInput" style="margin-top:8px" placeholder="${esc(this.t("relinkPlaceholder"))}" />
<div class="tb-dlg-actions"><button class="b3-button b3-button--cancel" id="tbNo">${esc(this.t("cancel"))}</button>
<button class="b3-button b3-button--text" id="tbGo">${esc(this.t("relinkGo"))}</button></div></div>`,
        });
        const input = dlg.element.querySelector("#tbRelinkInput");
        input.focus();
        const submit = async () => {
            const id = this.extractBlockId(input.value);
            if (!id) {
                showMessage(this.t("relinkInvalid"));
                return;
            }
            try {
                // 校验块是否仍然存在；被删除的块会返回非 0 code
                const info = await this.api("/api/block/getBlockInfo", { id });
                const rootId = (info && (info.rootID || info.rootId)) || id;
                let hpath = "";
                try {
                    hpath = await this.api("/api/filetree/getHPathByID", { id: rootId });
                } catch (e) { /* 文档路径取不到不阻塞关联 */ }
                task.blockId = id;
                task.docId = rootId;
                if (hpath) task.docPath = hpath;
                task.history.push({ ts: Date.now(), g: task.groupId, type: "doc", to: hpath || id });
                this.save();
                this.renderDetail();
                dlg.destroy();
                showMessage(this.t("relinkDone"));
                this.openTaskDoc(task);
            } catch (e) {
                console.error("[buleks-todo] relink failed", e);
                showMessage(this.t("relinkInvalid"));
            }
        };
        dlg.element.querySelector("#tbNo").addEventListener("click", () => dlg.destroy());
        dlg.element.querySelector("#tbGo").addEventListener("click", submit);
        input.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") submit();
        });
    }

    // 解除关联：关联文档彻底删除后清空记录，恢复可重新生成文档的状态
    clearDocLink(task) {
        if (!task) return;
        const dlg = new Dialog({
            title: this.t("clearDoc"),
            width: "460px",
            content: `<div class="b3-dialog__content"><div class="tb-dlg-text" style="white-space:pre-line">${esc(this.t("clearDocConfirm"))}</div>
<div class="tb-dlg-actions"><button class="b3-button b3-button--cancel" id="tbNo">${esc(this.t("cancel"))}</button>
<button class="b3-button b3-button--text" id="tbYes">${esc(this.t("confirm"))}</button></div></div>`,
        });
        dlg.element.querySelector("#tbNo").addEventListener("click", () => dlg.destroy());
        dlg.element.querySelector("#tbYes").addEventListener("click", () => {
            dlg.destroy();
            task.docId = "";
            task.blockId = "";
            task.docPath = "";
            task.history.push({ ts: Date.now(), g: task.groupId, type: "doc-clear" });
            this.save();
            this.renderDetail();
            showMessage(this.t("relinkCleared"));
        });
    }

    /* ---------------- 历史待办导入 ---------------- */
    // 解析粘贴的 markdown 待办清单：
    // - [X] 标题 → 已完成；- [ ] 标题 → 待办；- [-] 标题 → 已取消
    // 支持 ((20260528100236-m90xogm "标题")) 思源块引用，导入后记录 blockId 可直接打开关联文档
    parseImportLines(text) {
        const out = [];
        String(text || "").split(/\r?\n/).forEach((raw) => {
            const m = raw.match(/^\s*[-*+]\s+\[([ xX/-])\]\s*(.*)$/);
            if (!m) return;
            const mark = m[1].toLowerCase();
            let rest = m[2].trim();
            let blockId = "";
            const rm = rest.match(/\(\(([0-9]{14}-[a-z0-9]+)\s+"([^"]*)"\s*\)\)/i);
            if (rm) {
                blockId = rm[1];
                rest = rm[2].trim();
            } else {
                // 没带引号标题的块引用：剔除引用部分，用剩余文本做标题
                rest = rest.replace(/\(\([^)]*\)\)/g, "").trim();
            }
            if (!rest) return;
            out.push({
                title: rest,
                blockId,
                status: mark === "x" ? "done" : mark === "-" ? "cancelled" : "todo",
            });
        });
        return out;
    }

    doImport(text, groupId) {
        const items = this.parseImportLines(text);
        if (!items.length) {
            showMessage(this.t("importEmpty"));
            return 0;
        }
        const now = Date.now();
        items.forEach((it) => {
            this.board.tasks.push({
                id: uid("t"),
                title: it.title,
                desc: "",
                groupId: groupId || "",
                status: it.status,
                priority: 0,
                tags: [],
                createdAt: now,
                updatedAt: now,
                startedAt: null,
                // 历史导入没有准确的完成/关闭时间，保持 null：不进入近7天汇总，
                // 完结排序时按最旧处理（排在已完结区末尾）
                doneAt: null,
                closedAt: null,
                cancelledAt: null,
                dueAt: null,
                blockId: it.blockId,
                history: [{ ts: now, g: groupId || "", type: "import", to: it.status }],
            });
        });
        this.save();
        this.render();
        return items.length;
    }

    openImportDialog() {
        const dlg = new Dialog({
            title: this.t("importTitle"),
            width: "640px",
            content: `<div class="tb-setdlg">
  <div class="b3-dialog__scroller" style="padding:0">
    <label class="tb-set-field">
      <span>${esc(this.t("importGroup"))}</span>
      <select id="tbImportGroup" class="b3-select">
        <option value="">${esc(this.t("ungrouped"))}</option>
        ${this.sortedGroups().map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("")}
      </select>
    </label>
    <label class="tb-set-field">
      <span>${esc(this.t("importNewGroup"))}</span>
      <input id="tbImportNewGroup" class="b3-text-field" placeholder="${esc(this.t("groupNamePlaceholder"))}" />
    </label>
    <div class="tb-set-hint" style="white-space:pre-line">${esc(this.t("importHint"))}</div>
    <textarea id="tbImportText" class="b3-text-field" rows="14" style="width:100%;resize:vertical;font-family:var(--b3-font-family-code,monospace);font-size:12px"></textarea>
  </div>
  <div class="tb-set-foot">
    <button class="b3-button b3-button--cancel" id="tbImportCancel">${esc(this.t("cancel"))}</button>
    <button class="b3-button b3-button--text" id="tbImportOk">${esc(this.t("importGo"))}</button>
  </div>
</div>`,
        });
        const el = dlg.element;
        el.querySelector("#tbImportCancel").addEventListener("click", () => dlg.destroy());
        el.querySelector("#tbImportOk").addEventListener("click", () => {
            const text = el.querySelector("#tbImportText").value;
            let groupId = el.querySelector("#tbImportNewGroup").value.trim();
            if (groupId) {
                groupId = this.addGroup(groupId).id;
            } else {
                groupId = el.querySelector("#tbImportGroup").value;
            }
            const n = this.doImport(text, groupId);
            if (n > 0) {
                dlg.destroy();
                showMessage(this.t("importDone", n));
            }
        });
        // 打开弹窗即聚焦文本框，方便直接粘贴
        setTimeout(() => {
            const ta = el.querySelector("#tbImportText");
            if (ta) ta.focus();
        }, 100);
    }

    async listNotebooks() {
        const data = await this.api("/api/notebook/lsNotebooks", {});
        const list = (data && data.notebooks) || [];
        return list.filter((n) => !n.closed);
    }

    openSettingsDialog() {
        const s = this.board.settings;
        const dlg = new Dialog({
            title: this.t("settingsTitle"),
            width: "520px",
            content: `<div class="tb-setdlg">
  <div class="b3-dialog__scroller" style="padding:0">
    <label class="tb-set-field">
      <span>${esc(this.t("settingsNotebook"))}</span>
      <select id="tbSetNotebook" class="b3-select"><option value="">${esc(this.t("loading"))}</option></select>
    </label>
    <label class="tb-set-field">
      <span>${esc(this.t("settingsBasePath"))}</span>
      <input id="tbSetBasePath" class="b3-text-field" value="${esc(s.basePath || "")}" placeholder="${esc(this.t("settingsBasePathPlaceholder"))}" />
    </label>
    <div class="tb-set-hint">${esc(this.t("settingsHint"))}</div>
  </div>
  <div class="tb-set-foot">
    <button class="b3-button b3-button--cancel" id="tbSetCancel">${esc(this.t("cancel"))}</button>
    <button class="b3-button b3-button--text" id="tbSetOk">${esc(this.t("save"))}</button>
  </div>
</div>`,
        });
        const el = dlg.element;
        this.listNotebooks().then((list) => {
            const sel = el.querySelector("#tbSetNotebook");
            if (!list.length) {
                sel.innerHTML = `<option value="">${esc(this.t("noNotebooks"))}</option>`;
                return;
            }
            sel.innerHTML = list.map((n) =>
                `<option value="${esc(n.id)}"${n.id === s.notebook ? " selected" : ""}>${esc(n.name)}</option>`).join("");
        }).catch((e) => {
            const sel = el.querySelector("#tbSetNotebook");
            if (sel) sel.innerHTML = `<option value="">${esc(String(e.message || e))}</option>`;
        });
        el.querySelector("#tbSetCancel").addEventListener("click", () => dlg.destroy());
        el.querySelector("#tbSetOk").addEventListener("click", () => {
            this.board.settings.notebook = el.querySelector("#tbSetNotebook").value;
            this.board.settings.basePath = el.querySelector("#tbSetBasePath").value.trim();
            this.save();
            dlg.destroy();
            showMessage(this.t("settingsSaved"));
        });
    }

    statusLabel(key) {
        const map = {
            todo: "statusTodo", doing: "statusDoing", done: "statusDone",
            closed: "statusClosed", cancelled: "statusCancelled",
        };
        return this.t(map[key] || "statusTodo");
    }

    priorityLabel(p) {
        const map = { 1: "priorityHigh", 2: "priorityMid", 3: "priorityLow" };
        return p ? this.t(map[p]) : this.t("priorityNone");
    }

    groupOf(task) {
        return this.board.groups.find((g) => g.id === task.groupId) || null;
    }

    groupName(id) {
        const g = this.board.groups.find((x) => x.id === id);
        return g ? g.name : this.t("ungrouped");
    }

    groupColor(id) {
        const g = this.board.groups.find((x) => x.id === id);
        return g ? g.color : "#b6bac2";
    }

    sortedGroups() {
        return this.board.groups.slice().sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));
    }

    selectedTask() {
        const id = this.board.ui.taskId;
        const active = this.board.tasks.find((x) => x.id === id);
        if (active) return active;
        return this.allFiledTasks().find((x) => x.id === id) || null;
    }

    isArchived(task) {
        return task.status === "done" || task.status === "closed" || task.status === "cancelled";
    }

    /* ---------------- 文件归档 ---------------- */
    // 重建 归档任务id → 年份 索引
    rebuildArchivedIndex() {
        this.archivedIndex = new Map();
        Object.keys(this.archives || {}).forEach((y) => {
            (this.archives[y] || []).forEach((t) => this.archivedIndex.set(t.id, Number(y)));
        });
    }

    filedYear(task) {
        return this.archivedIndex ? this.archivedIndex.get(task.id) : null;
    }

    isFiled(task) {
        return this.filedYear(task) != null;
    }

    allFiledTasks() {
        const years = Object.keys(this.archives || {}).sort((a, b) => Number(b) - Number(a));
        return years.flatMap((y) => (this.archives[y] || []).map((t) => Object.assign(t, { __archiveYear: Number(y) })));
    }

    saveArchiveYear(year) {
        const tasks = this.archives[year] || [];
        return this.saveData(`${ARCHIVE_PREFIX}${year}.json`, { version: 1, year: Number(year), tasks })
            .catch((e) => console.error(`[buleks-todo] save archive ${year} failed`, e));
    }

    archiveClosed() {
        const candidates = this.board.tasks.filter((t) => t.status === "closed");
        if (!candidates.length) {
            showMessage(this.t("nothingToArchive"));
            return;
        }
        const dlg = new Dialog({
            title: this.t("archiveTitle"),
            width: "460px",
            content: `<div class="b3-dialog__content"><div class="tb-dlg-text" style="white-space:pre-line">${esc(this.t("archiveConfirm", candidates.length))}</div>
<div class="tb-dlg-actions"><button class="b3-button b3-button--cancel" id="tbNo">${esc(this.t("cancel"))}</button>
<button class="b3-button b3-button--text" id="tbYes">${esc(this.t("confirm"))}</button></div></div>`,
        });
        dlg.element.querySelector("#tbNo").addEventListener("click", () => dlg.destroy());
        dlg.element.querySelector("#tbYes").addEventListener("click", () => {
            dlg.destroy();
            const byYear = new Map();
            candidates.forEach((t) => {
                const y = new Date(t.closedAt || t.updatedAt || Date.now()).getFullYear();
                if (!byYear.has(y)) byYear.set(y, []);
                byYear.get(y).push(t);
            });
            const movedIds = new Set(candidates.map((t) => t.id));
            const years = [];
            byYear.forEach((tasks, y) => {
                if (!this.archives[y]) this.archives[y] = [];
                tasks.forEach((t) => {
                    t.history.push({ ts: Date.now(), g: t.groupId, type: "archive", to: String(y) });
                    this.archives[y].push(t);
                });
                years.push(y);
                this.saveArchiveYear(y);
            });
            this.board.tasks = this.board.tasks.filter((t) => !movedIds.has(t.id));
            this.board.archiveYears = Object.keys(this.archives).map(Number).sort((a, b) => a - b);
            this.rebuildArchivedIndex();
            if (this.board.ui.taskId && movedIds.has(this.board.ui.taskId)) this.board.ui.taskId = "";
            this.save();
            this.render();
            showMessage(this.t("archivedDone", candidates.length, years.sort((a, b) => a - b).join(" / ")));
        });
    }

    // 取消归档：从归档文件移回主列表
    unarchiveTask(task) {
        const y = this.filedYear(task);
        if (y == null) return;
        this.archives[y] = (this.archives[y] || []).filter((t) => t.id !== task.id);
        delete task.__archiveYear;
        this.board.tasks.unshift(task);
        this.board.archiveYears = Object.keys(this.archives).filter((k) => (this.archives[k] || []).length).map(Number).sort((a, b) => a - b);
        this.rebuildArchivedIndex();
        this.saveArchiveYear(y);
        this.save();
        this.render();
        showMessage(this.t("unarchive") + " ✓");
    }

    matchesSearch(task) {
        const kw = this.search.trim().toLowerCase();
        if (!kw) return true;
        return (task.title || "").toLowerCase().includes(kw) ||
            (task.desc || "").toLowerCase().includes(kw) ||
            this.groupName(task.groupId).toLowerCase().includes(kw) ||
            (task.tags || []).some((tg) => tg.toLowerCase().includes(kw));
    }

    /* 标签 */
    // 当前分组联动：标签列表只统计当前分组下的待办；分组选「全部」时展示全部标签
    tagScopeTasks() {
        // 「含归档」开启时，标签统计也覆盖归档待办
        let pool = this.board.tasks;
        if (this.board.ui.includeArchived) pool = pool.concat(this.allFiledTasks().map((t) => { const c = Object.assign({}, t); delete c.__archiveYear; return c; }));
        if (this.board.ui.group === "all") return pool;
        if (this.board.ui.group === "none") {
            return pool.filter((x) => !x.groupId || !this.board.groups.some((g) => g.id === x.groupId));
        }
        return pool.filter((x) => x.groupId === this.board.ui.group);
    }

    allTags() {
        const count = new Map();
        this.tagScopeTasks().forEach((t) => (t.tags || []).forEach((tg) => {
            count.set(tg, (count.get(tg) || 0) + 1);
        }));
        return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    }

    setTags(task, next) {
        if (this.isFiled(task)) {
            showMessage(this.t("filedHint", this.filedYear(task)));
            return;
        }
        const before = (task.tags || []).join("、");
        const after = next.join("、");
        if (before === after) return;
        task.tags = next;
        task.updatedAt = Date.now();
        task.history.push({ ts: Date.now(), g: task.groupId, type: "tag", from: before, to: after });
        this.save();
    }

    /* ---------------- 数据操作 ---------------- */
    createTask(payload) {
        const now = Date.now();
        const task = {
            id: uid("t"),
            title: payload.title.trim(),
            desc: payload.desc || "",
            groupId: payload.groupId || "",
            status: "todo",
            priority: Number(payload.priority) || 0,
            tags: Array.isArray(payload.tags) ? payload.tags : [],
            createdAt: now,
            updatedAt: now,
            startedAt: null,
            doneAt: null,
            closedAt: null,
            cancelledAt: null,
            dueAt: payload.dueAt || null,
            history: [{ ts: now, g: payload.groupId || "", type: "create", to: "todo" }],
        };
        this.board.tasks.unshift(task);
        this.board.ui.taskId = task.id;
        this.save();
        return task;
    }

    setStatus(task, to) {
        if (!task || task.status === to) return;
        if (this.isFiled(task)) {
            showMessage(this.t("filedHint", this.filedYear(task)));
            return;
        }
        const now = Date.now();
        const from = task.status;
        task.status = to;
        task.updatedAt = now;
        if (to === "doing" && !task.startedAt) task.startedAt = now;
        if (to === "todo" || to === "doing") {
            task.doneAt = null;
            task.closedAt = null;
            task.cancelledAt = null;
        }
        if (to === "done") task.doneAt = now;
        if (to === "closed") task.closedAt = now;
        if (to === "cancelled") task.cancelledAt = now;
        task.history.push({ ts: now, g: task.groupId, type: "status", from, to });
        this.save();
        this.render();
    }

    /* ---------------- 批量操作 ---------------- */
    batchToggle(id) {
        if (!id) return;
        if (this.batchSel.has(id)) this.batchSel.delete(id);
        else this.batchSel.add(id);
        this.renderList();
    }

    // 批量修改状态：与 setStatus 相同的时间戳/历史逻辑，但只保存渲染一次；
    // 已归档待办只读，跳过并提示
    batchSetStatus(to) {
        if (!STATUSES.includes(to)) return;
        if (!this.batchSel.size) {
            showMessage(this.t("batchNoSelection"));
            return;
        }
        const now = Date.now();
        let changed = 0;
        let skipped = 0;
        this.batchSel.forEach((id) => {
            const t = this.board.tasks.find((x) => x.id === id);
            if (!t) {
                // 不在主列表的（如归档任务）只读跳过，计入跳过数
                if (this.archivedIndex && this.archivedIndex.has(id)) skipped++;
                return;
            }
            if (this.isFiled(t)) { skipped++; return; }
            if (t.status === to) return;
            const from = t.status;
            t.status = to;
            t.updatedAt = now;
            if (to === "doing" && !t.startedAt) t.startedAt = now;
            if (to === "todo" || to === "doing") {
                t.doneAt = null;
                t.closedAt = null;
                t.cancelledAt = null;
            }
            if (to === "done") t.doneAt = now;
            if (to === "closed") t.closedAt = now;
            if (to === "cancelled") t.cancelledAt = now;
            t.history.push({ ts: now, g: t.groupId, type: "status", from, to });
            changed++;
        });
        this.batchSel.clear();
        if (changed) {
            this.save();
            this.render();
            showMessage(this.t("batchDone", changed));
        } else if (!skipped) {
            showMessage(this.t("batchNothingChanged"));
        }
        if (skipped) showMessage(this.t("batchSkipped", skipped));
    }

    confirmBatchDelete() {
        if (!this.batchSel.size) {
            showMessage(this.t("batchNoSelection"));
            return;
        }
        // 归档待办只读，删除时先剔除并提示
        const ids = [...this.batchSel].filter((id) => {
            const t = this.board.tasks.find((x) => x.id === id);
            return t && !this.isFiled(t);
        });
        const skipped = this.batchSel.size - ids.length;
        if (!ids.length) {
            showMessage(this.t("batchSkipped", skipped));
            return;
        }
        const dlg = new Dialog({
            title: this.t("batchDelete"),
            width: "420px",
            content: `<div class="b3-dialog__content"><div class="tb-dlg-text">${esc(this.t("batchDeleteConfirm", ids.length))}</div>
<div class="tb-dlg-actions"><button class="b3-button b3-button--cancel" id="tbBNo">${esc(this.t("cancel"))}</button>
<button class="b3-button b3-button--text" id="tbBYes">${esc(this.t("confirm"))}</button></div></div>`,
        });
        dlg.element.querySelector("#tbBNo").addEventListener("click", () => dlg.destroy());
        dlg.element.querySelector("#tbBYes").addEventListener("click", () => {
            const delSet = new Set(ids);
            this.board.tasks = this.board.tasks.filter((t) => !delSet.has(t.id));
            if (this.board.ui.taskId && delSet.has(this.board.ui.taskId)) this.board.ui.taskId = "";
            this.batchSel.clear();
            this.save();
            this.render();
            dlg.destroy();
            showMessage(this.t("batchDeleted", ids.length));
            if (skipped) showMessage(this.t("batchSkipped", skipped));
        });
    }

    updateField(task, field, value) {
        if (this.isFiled(task)) {
            showMessage(this.t("filedHint", this.filedYear(task)));
            return false;
        }
        const old = task[field];
        if (old === value) return false;
        task[field] = value;
        task.updatedAt = Date.now();
        const type = field === "groupId" ? "group" : field === "dueAt" ? "due" : field === "priority" ? "priority" : "edit";
        task.history.push({
            ts: task.updatedAt, g: task.groupId, type,
            field, from: old, to: value,
        });
        this.save();
        return true;
    }

    deleteTask(task) {
        this.board.tasks = this.board.tasks.filter((x) => x.id !== task.id);
        if (this.board.ui.taskId === task.id) this.board.ui.taskId = "";
        this.save();
        this.render();
    }

    addGroup(name, color) {
        const g = {
            id: uid("g"),
            name: name.trim(),
            color: color || PALETTE[this.board.groups.length % PALETTE.length],
            order: this.board.groups.length,
            createdAt: Date.now(),
        };
        this.board.groups.push(g);
        this.save();
        return g;
    }

    /* ---------------- 页签 ---------------- */
    initBoard(tab) {
        tab.element.innerHTML = `
<div class="tb-app">
  <header class="tb-head">
    <div class="tb-brand">
      <svg class="tb-logo"><use xlink:href="#iconTodoHub"></use></svg>
      <span class="tb-brand-name">${esc(this.t("title"))}</span>
      <span class="tb-brand-stat"></span>
    </div>
    <div class="tb-head-right">
      <button class="tb-iconbtn" data-act="import-tasks" title="${esc(this.t("importBtn"))}"><svg><use xlink:href="#iconImport"></use></svg></button>
      <button class="tb-iconbtn" data-act="archive-closed" title="${esc(this.t("archiveBtn"))}"><svg><use xlink:href="#iconInbox"></use></svg></button>
      <button class="tb-iconbtn" data-act="open-settings" title="${esc(this.t("settings"))}"><svg><use xlink:href="#iconSettings"></use></svg></button>
      <div class="tb-search">
        <svg><use xlink:href="#iconSearch"></use></svg>
        <input class="tb-search-input" type="text" placeholder="${esc(this.t("searchPlaceholder"))}" />
      </div>
      <button class="tb-primary" data-act="new-task">
        <svg><use xlink:href="#iconAdd"></use></svg><span>${esc(this.t("newTask"))}</span>
      </button>
    </div>
  </header>
  <div class="tb-body">
    <aside class="tb-rail">
      <div class="tb-rail-head">
        <span>${esc(this.t("groups"))}</span>
        <button class="tb-rail-add" data-act="new-group" title="${esc(this.t("newGroup"))}"><svg><use xlink:href="#iconAdd"></use></svg></button>
      </div>
      <div class="tb-groups"></div>
      <button class="tb-newgroup" data-act="new-group"><svg><use xlink:href="#iconAdd"></use></svg>${esc(this.t("newGroup"))}</button>
    </aside>
    <main class="tb-main"></main>
    <aside class="tb-detail"></aside>
  </div>
</div>`;

        const root = tab.element.querySelector(".tb-app");
        this.el = {
            root,
            rail: root.querySelector(".tb-groups"),
            main: root.querySelector(".tb-main"),
            detail: root.querySelector(".tb-detail"),
            stat: root.querySelector(".tb-brand-stat"),
            search: root.querySelector(".tb-search-input"),
        };

        root.addEventListener("click", (e) => this.onClick(e));
        root.addEventListener("contextmenu", (e) => this.onContextMenu(e));
        root.addEventListener("change", (e) => this.onChange(e));
        root.addEventListener("input", (e) => this.onInput(e));
        root.addEventListener("keydown", (e) => this.onKeyDown(e));
        root.addEventListener("focusin", (e) => this.onFocusIn(e));
        root.addEventListener("focusout", (e) => this.onFocusOut(e));
        if (this.el.search) {
            this.el.search.value = this.search;
            this.el.search.addEventListener("input", () => {
                this.search = this.el.search.value;
                this.page = 1;
                this.renderMain();
            });
        }
        // 列表滚动到底部自动加载下一页（虚拟滚动：始终只渲染已加载页数的卡片）
        this.el.main.addEventListener("scroll", () => {
            const m = this.el.main;
            if (!m || this._loadingMore) return;
            if (m.scrollTop + m.clientHeight >= m.scrollHeight - 240) {
                const total = this.visibleTasks().length;
                if (this.page * PAGE_SIZE < total) {
                    this._loadingMore = true;
                    this.page += 1;
                    this.renderList(true);
                    this._loadingMore = false;
                }
            }
        });
        this.render();
    }

    /* ---------------- 渲染 ---------------- */
    render() {
        if (!this.el.root) return;
        const gid = this.board.ui.group;
        if (gid !== "all" && gid !== "none" && !this.board.groups.some((g) => g.id === gid)) {
            this.board.ui.group = "all";
        }
        // 已选标签里不再存在于当前分组范围的自动剔除
        const scopeTags = new Set(this.tagScopeTasks().flatMap((t) => t.tags || []));
        this.board.ui.tags = (this.board.ui.tags || []).filter((tg) => scopeTags.has(tg));
        this.renderStats();
        this.renderRail();
        this.renderMain();
        this.renderDetail();
    }

    renderStats() {
        if (!this.el.stat) return;
        const active = this.board.tasks.filter((x) => x.status === "doing").length;
        const today0 = startOfDay(Date.now());
        const doneToday = this.board.tasks.filter((x) => x.doneAt && x.doneAt >= today0).length;
        this.el.stat.textContent = `${this.t("activeTotal", active)} · ${this.t("todayDone", doneToday)}`;
    }

    renderRail() {
        if (!this.el.rail) return;
        const active = (list) => list.filter((x) => x.status === "todo" || x.status === "doing").length;
        const groups = this.sortedGroups();
        const ungrouped = this.board.tasks.filter((x) => !x.groupId || !this.board.groups.some((g) => g.id === x.groupId));

        let html = `<div class="tb-group-item${this.board.ui.group === "all" ? " is-active" : ""}" data-act="select-group" data-g="all">
  <span class="tb-dot tb-dot--all"></span>
  <span class="tb-group-item-name">${esc(this.t("allGroups"))}</span>
  <span class="tb-group-item-count">${active(this.board.tasks)}</span>
</div>`;

        groups.forEach((g) => {
            const items = this.board.tasks.filter((x) => x.groupId === g.id);
            html += `<div class="tb-group-item${this.board.ui.group === g.id ? " is-active" : ""}" data-act="select-group" data-g="${g.id}" data-ctx="group">
  <span class="tb-dot" style="background:${g.color}"></span>
  <span class="tb-group-item-name" title="${esc(g.name)}">${esc(g.name)}</span>
  <span class="tb-group-item-count">${active(items)}</span>
  <button class="tb-group-item-more" data-act="edit-group" data-g="${g.id}" title="${esc(this.t("editGroup"))}"><svg><use xlink:href="#iconEdit"></use></svg></button>
  <button class="tb-group-item-more" data-act="group-menu" data-g="${g.id}" title="${esc(this.t("boardMenu"))}"><svg><use xlink:href="#iconMore"></use></svg></button>
</div>`;
        });

        if (ungrouped.length) {
            html += `<div class="tb-group-item${this.board.ui.group === "none" ? " is-active" : ""}" data-act="select-group" data-g="none">
  <span class="tb-dot" style="background:#b6bac2"></span>
  <span class="tb-group-item-name">${esc(this.t("ungrouped"))}</span>
  <span class="tb-group-item-count">${active(ungrouped)}</span>
</div>`;
        }

        if (!groups.length) {
            html += `<div class="tb-rail-empty">${esc(this.t("noGroupYet"))}</div>`;
        }

        // 标签区（随当前分组联动，可多选叠加筛选）
        const tags = this.allTags();
        if (tags.length) {
            const selCount = (this.board.ui.tags || []).length;
            html += `<div class="tb-rail-head tb-rail-head--tags"><span>${esc(this.t("tagFilter"))}${selCount ? `<span class="tb-tag-sel">${selCount}</span>` : ""}</span></div>`;
            html += `<div class="tb-tag-list">`;
            tags.forEach(([name, count]) => {
                const active = (this.board.ui.tags || []).includes(name);
                html += `<div class="tb-group-item tb-tag-item${active ? " is-active" : ""}" data-act="select-tag" data-tag="${esc(name)}">
  <span class="tb-dot tb-dot--tag"></span>
  <span class="tb-group-item-name" title="${esc(name)}">#${esc(name)}</span>
  <span class="tb-group-item-count">${count}</span>
</div>`;
            });
            html += `</div>`;
        }
        this.el.rail.innerHTML = html;
    }

    baseTasks() {
        // 「含归档」开启时，归档待办并入主列表参与分组/标签/搜索筛选
        let pool = this.board.tasks;
        if (this.board.ui.includeArchived) {
            pool = pool.concat(this.allFiledTasks());
        }
        let list = pool.filter((x) => this.matchesSearch(x));
        if (this.board.ui.group === "none") {
            list = list.filter((x) => !x.groupId || !this.board.groups.some((g) => g.id === x.groupId));
        } else if (this.board.ui.group !== "all") {
            list = list.filter((x) => x.groupId === this.board.ui.group);
        }
        // 标签筛选（多选，取并集；可与分组叠加）
        const sel = this.board.ui.tags || [];
        if (sel.length) {
            list = list.filter((x) => (x.tags || []).some((tg) => sel.includes(tg)));
        }
        return list;
    }

    visibleTasks() {
        const list = this.baseTasks();
        return this.board.ui.status === "all" ? list : list.filter((x) => x.status === this.board.ui.status);
    }

    sortTasks(list) {
        const finishTime = (t) => t.doneAt || t.closedAt || t.cancelledAt || 0;
        return list.slice().sort((a, b) => {
            const fa = this.isArchived(a), fb = this.isArchived(b);
            // 未完成的排在前面
            if (fa !== fb) return fa ? 1 : -1;
            if (fa) {
                // 已完结的：完成时间从新到旧
                return finishTime(b) - finishTime(a);
            }
            // 未完成的：优先级 → 截止日期 → 创建时间
            const pa = a.priority || 9, pb = b.priority || 9;
            if (pa !== pb) return pa - pb;
            const da = a.dueAt || Infinity, db = b.dueAt || Infinity;
            if (da !== db) return da - db;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }

    renderMain() {
        if (!this.el.main) return;
        this.renderList();
    }

    /* ---------------- 近7天汇总 ---------------- */
    summaryBlock() {
        const since = startOfDay(Date.now()) - 6 * 86400e3; // 含今天的前7天
        // 已完成按 doneAt、已关闭按 closedAt 计入近7天
        const finishAt = (t) => t.doneAt || t.closedAt || 0;
        const list = this.baseTasks().filter((t) =>
            (t.status === "done" || t.status === "closed") && finishAt(t) && finishAt(t) >= since);
        const doneCount = list.filter((t) => t.status === "done").length;
        const closedCount = list.filter((t) => t.status === "closed").length;
        const open = this.board.ui.summary;
        // 按分组统计
        const byGroup = new Map();
        list.forEach((t) => {
            const key = t.groupId || "";
            byGroup.set(key, (byGroup.get(key) || 0) + 1);
        });
        const groupStat = [...byGroup.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([gid, n]) => `<span class="tb-sum-g"><span class="tb-dot" style="background:${this.groupColor(gid)}"></span>${esc(this.groupName(gid))} ${n}</span>`)
            .join("");

        let html = `<section class="tb-summary${open ? " is-open" : ""}">
  <div class="tb-sum-head" data-act="toggle-summary">
    <svg class="tb-sec-arrow${open ? "" : " is-collapsed"}"><use xlink:href="#iconDown"></use></svg>
    <span class="tb-sum-title">${esc(this.t("summaryTitle"))}</span>
    <span class="tb-sum-count">${esc(this.t("summaryDoneClosed", doneCount, closedCount))}</span>
    <span class="tb-sum-groups">${groupStat}</span>
  </div>`;
        if (open) {
            if (!list.length) {
                html += `<div class="tb-sum-empty">${esc(this.t("summaryEmpty"))}</div>`;
            } else {
                const days = new Map();
                list.forEach((t) => {
                    const day = startOfDay(finishAt(t));
                    if (!days.has(day)) days.set(day, []);
                    days.get(day).push(t);
                });
                [...days.keys()].sort((a, b) => b - a).forEach((day) => {
                    const items = days.get(day).sort((a, b) => finishAt(b) - finishAt(a));
                    html += `<div class="tb-sum-day">
  <div class="tb-sum-date">${esc(fmtDayLabel(day))}<span>${items.length} 项</span></div>
  <div class="tb-sum-items">${items.map((t) => `
    <div class="tb-sum-item" data-act="select-task" data-id="${t.id}">
      <span class="tb-sum-time">${fmtTime(finishAt(t))}</span>
      <span class="tb-sum-name">${esc(t.title)}</span>
      <span class="tb-chip tb-chip--st" style="--c:${STATUS_COLOR[t.status] || "#8a8f99"}">${esc(this.statusLabel(t.status))}</span>
      ${t.priority ? `<span class="tb-chip tb-chip--p${t.priority}">P${t.priority}</span>` : ""}
    </div>`).join("")}</div>
</div>`;
                });
            }
        }
        html += `</section>`;
        return html;
    }

    /* ---------------- 列表视图 ---------------- */
    renderList(keepScroll) {
        this.page = Math.max(1, this.page | 0);
        const scrollTop = keepScroll && this.el.main ? this.el.main.scrollTop : 0;
        const base = this.baseTasks();
        const shown = this.visibleTasks();
        const counts = {
            all: base.length,
            todo: base.filter((t) => t.status === "todo").length,
            doing: base.filter((t) => t.status === "doing").length,
            done: base.filter((t) => t.status === "done").length,
            closed: base.filter((t) => t.status === "closed").length,
            cancelled: base.filter((t) => t.status === "cancelled").length,
        };
        const filters = ["all", "todo", "doing", "done", "closed", "cancelled"];
        const filterLabel = {
            all: this.t("filterAll"), todo: this.t("statusTodo"), doing: this.t("statusDoing"),
            done: this.t("statusDone"), closed: this.t("statusClosed"), cancelled: this.t("statusCancelled"),
        };
        let html = this.summaryBlock();

        html += `<div class="tb-filters">${filters.map((f) => `
  <button class="tb-filter${this.board.ui.status === f ? " is-active" : ""}" data-act="filter" data-status="${f}">
    ${esc(filterLabel[f])}<span>${counts[f]}</span>
  </button>`).join("")}
  <button class="tb-filter tb-filter--arch${this.board.ui.includeArchived ? " is-active" : ""}" data-act="toggle-archived" title="${esc(this.t("archiveBtn"))}">
    ${esc(this.t("includeArchived"))}${this.archivedIndex && this.archivedIndex.size ? `<span>${this.archivedIndex.size}</span>` : ""}
  </button>
  <button class="tb-filter tb-filter--batch${this.batch ? " is-active" : ""}" data-act="toggle-batch">${esc(this.t("batchToggle"))}</button></div>`;

        // 批量操作栏：勾选后一键批量改状态 / 删除
        if (this.batch) {
            const selCount = this.batchSel.size;
            const batchActions = [
                { st: "doing", label: filterLabel.doing },
                { st: "done", label: filterLabel.done },
                { st: "closed", label: filterLabel.closed },
                { st: "cancelled", label: filterLabel.cancelled },
            ];
            html += `<div class="tb-batchbar">
  <span class="tb-batch-count">${esc(this.t("batchSelCount", selCount))}</span>
  <button class="tb-batchbtn" data-act="batch-all">${esc(this.t("batchSelectAll"))}</button>
  <button class="tb-batchbtn" data-act="batch-none">${esc(this.t("batchClear"))}</button>
  <span class="tb-batch-sep"></span>
  ${batchActions.map((a) => `<button class="tb-batchbtn" data-act="batch-status" data-st="${a.st}">${esc(a.label)}</button>`).join("")}
  <button class="tb-batchbtn is-warn" data-act="batch-delete">${esc(this.t("batchDelete"))}</button>
</div>`;
        }

        // 注意：主数据可能全部已归档（board.tasks 为空），需用合并归档后的 base 判断，
        // 否则勾选「含归档」时归档待办无法展示
        if (!base.length) {
            html += this.emptyBlock(this.t("emptyTasks"), this.t("emptyTasksHint"), true);
            this.el.main.innerHTML = html;
            return;
        }
        if (!shown.length) {
            html += this.emptyBlock(this.t("noTasksInGroup"), this.t("emptyTasksHint"), true);
            this.el.main.innerHTML = html;
            return;
        }

        const sections = [];
        if (this.board.ui.group === "all") {
            this.sortedGroups().forEach((g) => {
                const items = this.sortTasks(shown.filter((t) => t.groupId === g.id));
                if (items.length) sections.push({ id: g.id, name: g.name, color: g.color, items });
            });
            const rest = this.sortTasks(shown.filter((t) => !t.groupId || !this.board.groups.some((g) => g.id === t.groupId)));
            if (rest.length) sections.push({ id: "none", name: this.t("ungrouped"), color: "#b6bac2", items: rest });
        } else if (this.board.ui.group === "none") {
            sections.push({ id: "none", name: this.t("ungrouped"), color: "#b6bac2", items: this.sortTasks(shown) });
        } else {
            const g = this.board.groups.find((x) => x.id === this.board.ui.group);
            if (g) sections.push({ id: g.id, name: g.name, color: g.color, items: this.sortTasks(shown) });
        }

        // 分页渲染：每页 PAGE_SIZE 条，底部「加载更多」，滚动到底自动追加
        const limit = this.page * PAGE_SIZE;
        let rendered = 0;
        let total = 0;
        sections.forEach((sec) => { total += sec.items.length; });
        sections.forEach((sec) => {
            const collapsed = this.collapsed.has(sec.id);
            const active = sec.items.filter((t) => t.status === "todo" || t.status === "doing").length;
            const done = sec.items.filter((t) => t.status === "done").length;
            const take = sec.items.length <= limit - rendered ? sec.items : sec.items.slice(0, Math.max(0, limit - rendered));
            rendered += take.length;
            html += `<section class="tb-section">
  <div class="tb-sec-head" data-act="toggle-section" data-g="${sec.id}">
    <svg class="tb-sec-arrow${collapsed ? " is-collapsed" : ""}"><use xlink:href="#iconDown"></use></svg>
    <span class="tb-dot" style="background:${sec.color}"></span>
    <span class="tb-sec-name">${esc(sec.name)}</span>
    <span class="tb-sec-stat">${this.t("activeCount", active)} · ${this.t("doneCount", done)}</span>
  </div>
  <div class="tb-cards${collapsed ? " is-collapsed" : ""}">
    ${take.map((task) => this.taskCard(task)).join("")}
  </div>
</section>`;
        });

        if (rendered < total) {
            html += `<button class="tb-loadmore" data-act="load-more">${esc(this.t("loadMore"))}<span>${esc(this.t("remainingCount", total - rendered))}</span></button>`;
        }

        this.el.main.innerHTML = html;
        if (keepScroll && scrollTop) this.el.main.scrollTop = scrollTop;
    }

    emptyBlock(title, hint, withAction) {
        return `<div class="tb-empty">
  <svg><use xlink:href="#iconTodoHub"></use></svg>
  <div class="tb-empty-title">${esc(title)}</div>
  <div class="tb-empty-hint">${esc(hint)}</div>
  ${withAction ? `<button class="tb-primary" data-act="new-task"><svg><use xlink:href="#iconAdd"></use></svg><span>${esc(this.t("newTask"))}</span></button>` : ""}
</div>`;
    }

    taskCard(task) {
        const color = STATUS_COLOR[task.status] || "#8a8f99";
        const now = Date.now();
        const filed = this.isFiled(task);
        const chips = [];
        if (filed) chips.push(`<span class="tb-chip tb-chip--filed">${esc(this.t("filedChip", this.filedYear(task)))}</span>`);
        chips.push(`<span class="tb-chip tb-chip--st" style="--c:${color}">${esc(this.statusLabel(task.status))}</span>`);
        if (task.priority) chips.push(`<span class="tb-chip tb-chip--p${task.priority}">P${task.priority}</span>`);
        (task.tags || []).forEach((tg) => {
            chips.push(`<span class="tb-chip tb-chip--tag">#${esc(tg)}</span>`);
        });
        if (task.dueAt) {
            const overdue = task.dueAt < startOfDay(now) && !this.isArchived(task);
            chips.push(`<span class="tb-chip${overdue ? " is-overdue" : ""}">${esc(this.t("dueDate"))} ${fmtDate(task.dueAt)}</span>`);
        }
        if (task.status === "closed" && task.closedAt) chips.push(`<span class="tb-chip tb-chip--time">${esc(this.t("closedAt"))} ${fmtDateTime(task.closedAt)}</span>`);
        else if (task.status === "cancelled" && task.cancelledAt) chips.push(`<span class="tb-chip tb-chip--time">${esc(this.t("cancelledAt"))} ${fmtDateTime(task.cancelledAt)}</span>`);
        else if (task.doneAt) chips.push(`<span class="tb-chip tb-chip--time">${esc(this.t("doneAt"))} ${fmtDateTime(task.doneAt)}</span>`);
        else if (task.closedAt) chips.push(`<span class="tb-chip tb-chip--time">${esc(this.t("closedAt"))} ${fmtDateTime(task.closedAt)}</span>`);
        else if (task.cancelledAt) chips.push(`<span class="tb-chip tb-chip--time">${esc(this.t("cancelledAt"))} ${fmtDateTime(task.cancelledAt)}</span>`);
        else chips.push(`<span class="tb-chip tb-chip--time">${esc(this.t("createdAt"))} ${fmtDateTime(task.createdAt)}</span>`);

        const batchOn = this.batchSel.has(task.id);
        const selected = this.batch ? batchOn : this.board.ui.taskId === task.id;
        const icon = STATUS_ICON[task.status] || "iconUncheck";
        const glyph = task.status === "doing"
            ? `<span class="tb-dotfill"></span>`
            : (this.isArchived(task) ? `<svg><use xlink:href="#${icon}"></use></svg>` : "");

        return `<div class="tb-card${selected ? " is-selected" : ""}${this.batch ? " is-batch" : ""}${this.isArchived(task) ? " is-archived" : ""}${filed ? " is-filed" : ""}" data-id="${task.id}"${filed ? ' data-filed="1"' : ""}>
  ${this.batch ? `<span class="tb-check${batchOn ? " is-on" : ""}${filed ? " is-disabled" : ""}" data-act="batch-toggle" data-id="${task.id}" title="${filed ? esc(this.t("filedHint", this.filedYear(task))) : ""}">${batchOn ? `<svg><use xlink:href="#iconCheck"></use></svg>` : ""}</span>` : ""}
  <button class="tb-statusbtn" data-act="${this.batch ? "batch-toggle" : "status-menu"}" data-id="${task.id}" title="${esc(this.batch ? "" : this.t("statusChange"))}" style="--c:${color}">${glyph}</button>
  <div class="tb-card-body" data-act="select-task" data-id="${task.id}">
    <div class="tb-card-title">${esc(task.title)}</div>
    <div class="tb-card-meta">${chips.join("")}</div>
    ${task.desc ? `<div class="tb-card-desc">${esc(task.desc)}</div>` : ""}
  </div>
  ${task.docId || task.blockId ? `<button class="tb-card-doc" data-act="open-doc" data-id="${task.id}" title="${esc(this.t("openDoc"))}"><svg><use xlink:href="#iconFile"></use></svg></button>` : ""}
  <button class="tb-card-more" data-act="task-menu" data-id="${task.id}" title="${esc(this.t("boardMenu"))}"><svg><use xlink:href="#iconMore"></use></svg></button>
</div>`;
    }

    /* ---------------- 详情 ---------------- */
    eventText(ev) {
        const fmtVal = (field, v) => {
            if (v == null || v === "") return this.t("evNone");
            if (field === "dueAt") return fmtDate(v);
            if (field === "priority") return this.priorityLabel(v);
            if (field === "groupId") return this.groupName(v);
            return String(v);
        };
        switch (ev.type) {
            case "create":
                return this.t("evCreate");
            case "status":
                return this.t("evStatus", this.statusLabel(ev.from), this.statusLabel(ev.to));
            case "due":
                return this.t("evDue", fmtVal("dueAt", ev.from), fmtVal("dueAt", ev.to));
            case "priority":
                return this.t("evPriority", fmtVal("priority", ev.from), fmtVal("priority", ev.to));
            case "group":
                return this.t("evGroup", fmtVal("groupId", ev.from), fmtVal("groupId", ev.to));
            case "tag":
                if (ev.to && !ev.from) return this.t("evTagAdd", ev.to);
                if (ev.from && !ev.to) return this.t("evTagRemove", ev.from);
                return this.t("evTagChange", ev.from, ev.to);
            case "edit":
                if (ev.field === "title") return this.t("evTitle", ev.from || "", ev.to || "");
                return this.t("evDesc");
            case "doc":
                return this.t("docEvent") + (ev.to ? `：${ev.to}` : "");
            case "archive":
                return this.t("filedChip", ev.to || "");
            default:
                return "";
        }
    }

    renderDetail() {
        if (!this.el.detail) return;
        const task = this.selectedTask();
        if (!task) {
            this.el.detail.innerHTML = `<div class="tb-detail-empty">
  <svg><use xlink:href="#iconTodoHub"></use></svg>
  <div>${esc(this.t("selectTask"))}</div>
</div>`;
            return;
        }
        const g = this.groupOf(task);
        const statusBtns = STATUSES.map((s) => `
  <button class="tb-stbtn${task.status === s ? " is-active" : ""}" data-act="set-status" data-status="${s}" style="--c:${STATUS_COLOR[s]}">
    <span class="tb-stbtn-dot"></span>${esc(this.statusLabel(s))}
  </button>`).join("");

        const groupOptions = [`<option value="">${esc(this.t("ungrouped"))}</option>`]
            .concat(this.sortedGroups().map((x) => `<option value="${x.id}"${x.id === task.groupId ? " selected" : ""}>${esc(x.name)}</option>`))
            .join("");

        const priOptions = [[0, this.t("priorityNone")], [1, this.t("priorityHigh")], [2, this.t("priorityMid")], [3, this.t("priorityLow")]]
            .map(([v, label]) => `<option value="${v}"${Number(task.priority) === v ? " selected" : ""}>${esc(label)}</option>`).join("");

        const times = [
            [this.t("createdAt"), task.createdAt],
            [this.t("startedAt"), task.startedAt],
            [this.t("doneAt"), task.doneAt],
            [this.t("closedAt"), task.closedAt],
            [this.t("cancelledAt"), task.cancelledAt],
        ].map(([label, ts]) => `<div class="tb-time-row"><span>${esc(label)}</span><b class="${ts ? "" : "is-empty"}">${ts ? fmtDateTime(ts) : "—"}</b></div>`).join("");

        const duration = task.doneAt ? this.fmtDuration(task.doneAt - (task.startedAt || task.createdAt)) : "";

        const history = (task.history || []).slice().sort((a, b) => b.ts - a.ts).map((ev) => `
  <div class="tb-his-row">
    <span class="tb-his-time">${fmtDateTime(ev.ts)}</span>
    <span class="tb-his-text">${esc(this.eventText(ev, task))}</span>
  </div>`).join("") || `<div class="tb-his-empty">${esc(this.t("noHistory"))}</div>`;

        const filed = this.isFiled(task);
        const filedBanner = filed ? `
  <div class="tb-dtl-filed">
    <span>${esc(this.t("filedHint", this.filedYear(task)))}</span>
    <button class="b3-button b3-button--text" data-act="unarchive-task">${esc(this.t("unarchive"))}</button>
  </div>` : "";

        this.el.detail.innerHTML = `<div class="tb-dtl">
  <div class="tb-dtl-head">
    <span>${esc(this.t("detail"))}</span>
    <button class="tb-iconbtn" data-act="close-detail" title="${esc(this.t("close"))}"><svg><use xlink:href="#iconClose"></use></svg></button>
  </div>
  ${filedBanner}
  <input class="tb-dtl-title" data-field="title" value="${esc(task.title)}"${filed ? " readonly" : ""} />
  <div class="tb-dtl-tags">
    <span class="tb-chip tb-chip--st" style="--c:${STATUS_COLOR[task.status]}">${esc(this.statusLabel(task.status))}</span>
    ${g ? `<span class="tb-chip"><span class="tb-dot" style="background:${g.color}"></span>${esc(g.name)}</span>` : ""}
    ${duration ? `<span class="tb-chip tb-chip--time">${esc(this.t("duration", duration))}</span>` : ""}
  </div>

  <div class="tb-dtl-sec">
    <div class="tb-dtl-label">${esc(this.t("statusChange"))}</div>
    <div class="tb-stbtns">${statusBtns}</div>
  </div>

  <div class="tb-dtl-grid">
    <label class="tb-dtl-field">
      <span>${esc(this.t("taskGroup"))}</span>
      <select class="b3-select" data-field="groupId">${groupOptions}</select>
    </label>
    <label class="tb-dtl-field">
      <span>${esc(this.t("priority"))}</span>
      <select class="b3-select" data-field="priority">${priOptions}</select>
    </label>
    <label class="tb-dtl-field">
      <span>${esc(this.t("dueDate"))}</span>
      <input class="b3-text-field" type="date" data-field="dueAt" value="${task.dueAt ? fmtDateInput(task.dueAt) : ""}" />
    </label>
  </div>

  <div class="tb-dtl-sec">
    <div class="tb-dtl-label">${esc(this.t("tags"))}</div>
    <div class="tb-tagedit">
      ${(task.tags || []).map((tg) => `
        <span class="tb-tagchip">#${esc(tg)}<button class="tb-tagchip-x" data-act="remove-tag" data-tag="${esc(tg)}" title="${esc(this.t("evTagRemove", tg))}">×</button></span>`).join("")}
      <input class="tb-taginput" data-field="tagInput" placeholder="${esc(this.t("tagPlaceholder"))}" />
    </div>
  </div>

  <div class="tb-dtl-sec">
    <div class="tb-dtl-label">${esc(this.t("desc"))}</div>
    <textarea class="tb-dtl-desc" data-field="desc" placeholder="${esc(this.t("descPlaceholder"))}">${esc(task.desc || "")}</textarea>
  </div>

  <div class="tb-dtl-sec">
    <div class="tb-dtl-label">${esc(this.t("docName"))}</div>
    ${task.docId
        ? `<div class="tb-docrow">
             <span class="tb-docrow-path" title="${esc(task.docPath || "")}">${esc(task.docPath || task.docId)}</span>
             <span class="tb-docrow-ops">
               <button class="b3-button b3-button--text" data-act="open-doc" data-id="${task.id}">${esc(this.t("openDoc"))}</button>
               <button class="b3-button b3-button--text" data-act="edit-doc" data-id="${task.id}">${esc(this.t("relinkBtn"))}</button>
               <button class="b3-button b3-button--text" data-act="clear-doc" data-id="${task.id}" style="color:var(--b3-theme-error)">${esc(this.t("clearDoc"))}</button>
             </span>
           </div>`
        : task.blockId
        ? `<div class="tb-docrow">
             <span class="tb-docrow-path" title="${esc(task.blockId)}">${esc(this.t("linkedDoc"))}</span>
             <span class="tb-docrow-ops">
               <button class="b3-button b3-button--text" data-act="open-doc" data-id="${task.id}">${esc(this.t("openDoc"))}</button>
               <button class="b3-button b3-button--text" data-act="edit-doc" data-id="${task.id}">${esc(this.t("relinkBtn"))}</button>
               <button class="b3-button b3-button--text" data-act="clear-doc" data-id="${task.id}" style="color:var(--b3-theme-error)">${esc(this.t("clearDoc"))}</button>
             </span>
           </div>`
        : `<button class="tb-docbtn" data-act="create-doc"><svg><use xlink:href="#iconFile"></use></svg>${esc(this.t("createDoc"))}</button>`}
  </div>

  <div class="tb-dtl-sec">
    <div class="tb-dtl-label">${esc(this.t("stats"))}</div>
    <div class="tb-times">${times}</div>
  </div>

  <div class="tb-dtl-sec">
    <div class="tb-dtl-label">${esc(this.t("history"))}</div>
    <div class="tb-his">${history}</div>
  </div>

  <button class="tb-danger" data-act="delete-task"><svg><use xlink:href="#iconClose"></use></svg>${esc(this.t("deleteTask"))}</button>
</div>`;
    }

    fmtDuration(ms) {
        const mins = Math.max(1, Math.round(ms / 60000));
        if (mins < 60) return this.t("durationMin", mins);
        const hours = Math.floor(mins / 60);
        if (hours < 24) return this.t("durationHour", hours);
        const days = Math.floor(hours / 24);
        const rest = hours % 24;
        return `${this.t("durationDay", days)}${rest ? " " + this.t("durationHour", rest) : ""}`;
    }

    /* ---------------- 交互 ---------------- */
    onClick(e) {
        const el = e.target.closest("[data-act]");
        if (!el) return;
        const act = el.dataset.act;
        switch (act) {
            case "new-task":
                this.openCreateDialog();
                break;
            case "open-settings":
                this.openSettingsDialog();
                break;
            case "import-tasks":
                this.openImportDialog();
                break;
            case "open-doc":
                this.openTaskDoc(this.board.tasks.find((x) => x.id === el.dataset.id));
                break;
            case "edit-doc":
                this.relinkDoc(this.board.tasks.find((x) => x.id === el.dataset.id) || this.selectedTask());
                break;
            case "clear-doc":
                this.clearDocLink(this.selectedTask());
                break;
            case "create-doc":
                this.createTaskDoc(this.selectedTask());
                break;
            case "new-group":
                this.openGroupDialog();
                break;
            case "select-group":
                this.board.ui.group = el.dataset.g;
                this.board.ui.taskId = "";
                this.page = 1;
                this.save();
                this.render();
                break;
            case "select-tag": {
                // 多选：再次点击取消；多个标签取并集
                const tg = el.dataset.tag;
                const sel = this.board.ui.tags || [];
                const idx = sel.indexOf(tg);
                if (idx >= 0) sel.splice(idx, 1);
                else sel.push(tg);
                this.board.ui.tags = sel;
                this.page = 1;
                this.save();
                this.render();
                break;
            }
            case "toggle-summary":
                this.board.ui.summary = !this.board.ui.summary;
                this.save();
                this.renderList();
                break;
            case "remove-tag": {
                const task = this.selectedTask();
                if (task) {
                    this.setTags(task, (task.tags || []).filter((x) => x !== el.dataset.tag));
                    this.render();
                }
                break;
            }
            case "filter":
                this.board.ui.status = el.dataset.status;
                this.page = 1;
                this.save();
                this.renderList();
                break;
            case "toggle-archived":
                this.board.ui.includeArchived = !this.board.ui.includeArchived;
                this.page = 1;
                this.save();
                this.render();
                break;
            case "toggle-batch":
                this.batch = !this.batch;
                this.batchSel.clear();
                this.renderList();
                break;
            case "batch-toggle":
                this.batchToggle(el.dataset.id);
                break;
            case "batch-all":
                // 全选当前可见（筛选后）的非归档待办
                this.visibleTasks().forEach((t) => { if (!this.isFiled(t)) this.batchSel.add(t.id); });
                this.renderList();
                break;
            case "batch-none":
                this.batchSel.clear();
                this.renderList();
                break;
            case "batch-status":
                this.batchSetStatus(el.dataset.st);
                break;
            case "batch-delete":
                this.confirmBatchDelete();
                break;
            case "load-more":
                this.page += 1;
                this.renderList(true);
                break;
            case "archive-closed":
                this.archiveClosed();
                break;
            case "unarchive-task": {
                const task = this.selectedTask();
                if (task) this.unarchiveTask(task);
                break;
            }
            case "select-task":
                // 批量模式下点卡片 = 勾选/取消勾选
                if (this.batch) {
                    this.batchToggle(el.dataset.id);
                    break;
                }
                // 点击卡片只选中查看详情；跳转文档请点卡片上的 📄 图标
                this.board.ui.taskId = el.dataset.id;
                this.save();
                this.renderList();
                this.renderDetail();
                break;
            case "close-detail":
                this.board.ui.taskId = "";
                this.save();
                this.renderMain();
                this.renderDetail();
                break;
            case "set-status":
                this.setStatus(this.selectedTask(), el.dataset.status);
                break;
            case "status-menu":
                this.openStatusMenu(el.dataset.id, el);
                break;
            case "task-menu":
                this.openTaskMenu(el.dataset.id, e);
                break;
            case "group-menu":
                this.openGroupMenu(el.dataset.g, e);
                break;
            case "edit-group": {
                const g = this.board.groups.find((x) => x.id === el.dataset.g);
                if (g) this.openGroupDialog(g, () => this.render());
                break;
            }
            case "toggle-section": {
                const id = el.dataset.g;
                if (this.collapsed.has(id)) this.collapsed.delete(id);
                else this.collapsed.add(id);
                this.renderList();
                break;
            }
            case "delete-task":
                this.confirmDeleteTask(this.selectedTask());
                break;
            default:
                break;
        }
    }

    onContextMenu(e) {
        const item = e.target.closest('[data-ctx="group"]');
        if (item) {
            e.preventDefault();
            this.openGroupMenu(item.dataset.g, e);
            return;
        }
        const card = e.target.closest(".tb-card");
        if (card) {
            e.preventDefault();
            this.openTaskMenu(card.dataset.id, e);
        }
    }

    onChange(e) {
        const field = e.target.dataset.field;
        if (!field) return;
        const task = this.selectedTask();
        if (!task) return;
        if (field === "dueAt") {
            const v = e.target.value ? new Date(`${e.target.value}T00:00:00`).getTime() : null;
            if (this.updateField(task, "dueAt", v)) this.render();
        } else if (field === "priority") {
            if (this.updateField(task, "priority", Number(e.target.value))) this.render();
        } else if (field === "groupId") {
            if (this.updateField(task, "groupId", e.target.value)) this.render();
        }
    }

    onInput(e) {
        const field = e.target.dataset.field;
        if (!field) return;
        const task = this.selectedTask();
        if (!task) return;
        if (this.isFiled(task) && (field === "title" || field === "desc")) {
            showMessage(this.t("filedHint", this.filedYear(task)));
            return;
        }
        if (field === "title") {
            task.title = e.target.value;
            task.updatedAt = Date.now();
            this.save();
            const cardTitle = this.el.main && this.el.main.querySelector(`.tb-card[data-id="${task.id}"] .tb-card-title`);
            if (cardTitle) cardTitle.textContent = task.title;
        } else if (field === "desc") {
            task.desc = e.target.value;
            task.updatedAt = Date.now();
            this.save();
        }
    }

    onKeyDown(e) {
        if (e.target && e.target.dataset && e.target.dataset.field === "tagInput" && e.key === "Enter") {
            e.preventDefault();
            const task = this.selectedTask();
            if (!task) return;
            const added = parseTags(e.target.value);
            if (!added.length) return;
            const next = (task.tags || []).slice();
            added.forEach((tg) => { if (!next.includes(tg)) next.push(tg); });
            this.setTags(task, next);
            this.render();
            // 重新渲染后聚焦标签输入框，方便连续输入
            const input = this.el.detail && this.el.detail.querySelector(".tb-taginput");
            if (input) input.focus();
        }
    }

    onFocusIn(e) {
        const field = e.target.dataset && e.target.dataset.field;
        if (field !== "title" && field !== "desc") return;
        const task = this.selectedTask();
        if (!task) return;
        this.editBase = { field, value: task[field] || "" };
    }

    onFocusOut(e) {
        const field = e.target.dataset && e.target.dataset.field;
        if (field !== "title" && field !== "desc") return;
        if (!this.editBase || this.editBase.field !== field) return;
        const task = this.selectedTask();
        if (!task) return;
        const before = this.editBase.value;
        const after = task[field] || "";
        this.editBase = null;
        if (before === after) return;
        if (field === "title" && !after.trim()) {
            task.title = before;
            this.render();
            return;
        }
        task.history.push({ ts: Date.now(), g: task.groupId, type: "edit", field, from: before, to: after });
        task.updatedAt = Date.now();
        this.save();
        this.render();
    }

    /* ---------------- 菜单 ---------------- */
    openStatusMenu(taskId, anchor) {
        const task = this.board.tasks.find((x) => x.id === taskId);
        if (!task) return;
        const menu = new Menu("buleks-todo-status");
        STATUSES.forEach((s) => {
            menu.addItem({
                icon: s === task.status ? "iconCheck" : STATUS_ICON[s],
                label: this.statusLabel(s),
                click: () => this.setStatus(task, s),
            });
        });
        const rect = anchor.getBoundingClientRect();
        menu.open({ x: rect.left, y: rect.bottom });
    }

    openTaskMenu(taskId, event) {
        const task = this.board.tasks.find((x) => x.id === taskId) || this.allFiledTasks().find((x) => x.id === taskId);
        if (!task) return;
        const menu = new Menu("buleks-todo-task");
        menu.addItem({
            icon: "iconOpen", label: this.t("detail"),
            click: () => {
                this.board.ui.taskId = task.id;
                this.save();
                this.renderMain();
                this.renderDetail();
            },
        });
        if (this.isFiled(task)) {
            menu.addItem({
                icon: "iconUndo", label: this.t("unarchive"),
                click: () => this.unarchiveTask(task),
            });
            menu.open({ x: event.clientX || 200, y: event.clientY || 200 });
            return;
        }
        menu.addSeparator();
        menu.addItem({
            icon: task.docId || task.blockId ? "iconFile" : "iconAdd",
            label: task.docId || task.blockId ? this.t("openDoc") : this.t("createDoc"),
            click: () => {
                if (task.docId || task.blockId) this.openTaskDoc(task);
                else {
                    this.board.ui.taskId = task.id;
                    this.save();
                    this.createTaskDoc(task);
                }
            },
        });
        if (task.docId || task.blockId) {
            menu.addItem({
                icon: "iconRefresh",
                label: this.t("relinkBtn"),
                click: () => this.relinkDoc(task),
            });
        }
        menu.addSeparator();
        STATUSES.forEach((s) => {
            menu.addItem({
                icon: s === task.status ? "iconCheck" : STATUS_ICON[s],
                label: this.statusLabel(s),
                click: () => this.setStatus(task, s),
            });
        });
        menu.addSeparator();
        menu.addItem({
            icon: "iconClose", label: this.t("deleteTask"), warning: true,
            click: () => this.confirmDeleteTask(task),
        });
        menu.open({ x: event.clientX || 200, y: event.clientY || 200 });
    }

    openGroupMenu(groupId, event) {
        const g = this.board.groups.find((x) => x.id === groupId);
        if (!g) return;
        const menu = new Menu("buleks-todo-group");
        menu.addItem({
            icon: "iconEdit", label: this.t("rename"),
            click: () => this.openGroupDialog(g, () => this.render()),
        });
        menu.addItem({
            icon: "iconList", label: this.t("changeColor"),
            click: () => this.openGroupDialog(g, () => this.render(), true),
        });
        menu.addSeparator();
        menu.addItem({
            icon: "iconClose", label: this.t("deleteGroup"), warning: true,
            click: () => {
                const dlg = new Dialog({
                    title: this.t("deleteGroup"),
                    width: "420px",
                    content: `<div class="b3-dialog__content"><div class="tb-dlg-text">${esc(this.t("deleteGroupConfirm"))}</div>
<div class="tb-dlg-actions"><button class="b3-button b3-button--cancel" id="tbNo">${esc(this.t("cancel"))}</button>
<button class="b3-button b3-button--text" id="tbYes">${esc(this.t("confirm"))}</button></div></div>`,
                });
                dlg.element.querySelector("#tbNo").addEventListener("click", () => dlg.destroy());
                dlg.element.querySelector("#tbYes").addEventListener("click", () => {
                    this.board.tasks.forEach((t) => { if (t.groupId === g.id) t.groupId = ""; });
                    this.board.groups = this.board.groups.filter((x) => x.id !== g.id);
                    if (this.board.ui.group === g.id) this.board.ui.group = "all";
                    dlg.destroy();
                    this.save();
                    this.render();
                });
            },
        });
        menu.open({ x: event.clientX || 200, y: event.clientY || 200 });
    }

    confirmDeleteTask(task) {
        if (!task) return;
        if (this.isFiled(task)) {
            showMessage(this.t("filedHint", this.filedYear(task)));
            return;
        }
        const dlg = new Dialog({
            title: this.t("deleteTask"),
            width: "420px",
            content: `<div class="b3-dialog__content"><div class="tb-dlg-text">${esc(this.t("deleteTaskConfirm"))}</div>
<div class="tb-dlg-actions"><button class="b3-button b3-button--cancel" id="tbNo">${esc(this.t("cancel"))}</button>
<button class="b3-button b3-button--text" id="tbYes">${esc(this.t("confirm"))}</button></div></div>`,
        });
        dlg.element.querySelector("#tbNo").addEventListener("click", () => dlg.destroy());
        dlg.element.querySelector("#tbYes").addEventListener("click", () => {
            this.deleteTask(task);
            dlg.destroy();
        });
    }

    /* ---------------- 弹窗 ---------------- */
    openCreateDialog(defaultGroup) {
        const groups = this.sortedGroups();
        const groupValue = defaultGroup != null
            ? defaultGroup
            : (this.board.ui.group !== "all" && this.board.ui.group !== "none" ? this.board.ui.group : (groups[0] ? groups[0].id : ""));
        const dlg = new Dialog({
            title: this.t("newTaskTitle"),
            width: "560px",
            content: `<div class="b3-dialog__content tb-create">
  <label class="tb-cre-field">
    <span>${esc(this.t("taskTitle"))}</span>
    <input class="b3-text-field fn__block" id="tbNewTitle" placeholder="${esc(this.t("taskTitlePlaceholder"))}" />
  </label>
  <div class="tb-cre-grid">
    <label class="tb-cre-field">
      <span>${esc(this.t("taskGroup"))}</span>
      <div class="tb-cre-inline">
        <select class="b3-select" id="tbNewGroup">${[`<option value="">${esc(this.t("ungrouped"))}</option>`]
            .concat(groups.map((g) => `<option value="${g.id}"${g.id === groupValue ? " selected" : ""}>${esc(g.name)}</option>`)).join("")}</select>
        <button class="b3-button b3-button--outline" id="tbNewGroupBtn">+</button>
      </div>
    </label>
    <label class="tb-cre-field">
      <span>${esc(this.t("priority"))}</span>
      <select class="b3-select" id="tbNewPri">
        <option value="0">${esc(this.t("priorityNone"))}</option>
        <option value="1">${esc(this.t("priorityHigh"))}</option>
        <option value="2">${esc(this.t("priorityMid"))}</option>
        <option value="3">${esc(this.t("priorityLow"))}</option>
      </select>
    </label>
    <label class="tb-cre-field">
      <span>${esc(this.t("dueDate"))}</span>
      <input class="b3-text-field" type="date" id="tbNewDue" />
    </label>
    <label class="tb-cre-field tb-cre-field--wide">
      <span>${esc(this.t("tags"))}</span>
      <input class="b3-text-field" id="tbNewTags" placeholder="${esc(this.t("tagNewPlaceholder"))}" />
    </label>
  </div>
  <label class="tb-cre-field">
    <span>${esc(this.t("taskDesc"))}</span>
    <textarea class="b3-text-field fn__block tb-cre-desc" id="tbNewDesc"></textarea>
  </label>
  <div class="tb-dlg-actions">
    <button class="b3-button b3-button--cancel" id="tbCancel">${esc(this.t("cancel"))}</button>
    <button class="b3-button b3-button--text" id="tbOk">${esc(this.t("createTask"))}</button>
  </div>
</div>`,
        });
        const el = dlg.element;
        const titleEl = el.querySelector("#tbNewTitle");
        setTimeout(() => titleEl.focus(), 80);

        el.querySelector("#tbNewGroupBtn").addEventListener("click", () => {
            this.openGroupDialog(null, (g) => {
                const sel = el.querySelector("#tbNewGroup");
                const opt = document.createElement("option");
                opt.value = g.id;
                opt.textContent = g.name;
                sel.appendChild(opt);
                sel.value = g.id;
            });
        });

        const submit = () => {
            const title = titleEl.value.trim();
            if (!title) {
                showMessage(this.t("titleRequired"));
                titleEl.focus();
                return;
            }
            const due = el.querySelector("#tbNewDue").value;
            this.createTask({
                title,
                groupId: el.querySelector("#tbNewGroup").value,
                priority: Number(el.querySelector("#tbNewPri").value),
                dueAt: due ? new Date(`${due}T00:00:00`).getTime() : null,
                desc: el.querySelector("#tbNewDesc").value.trim(),
                tags: parseTags(el.querySelector("#tbNewTags").value),
            });
            dlg.destroy();
            this.render();
            showMessage(this.t("justCreated"));
        };
        el.querySelector("#tbCancel").addEventListener("click", () => dlg.destroy());
        el.querySelector("#tbOk").addEventListener("click", submit);
        titleEl.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    }

    openGroupDialog(group, onDone, colorOnly) {
        const isEdit = !!group;
        const colors = PALETTE.map((c) => `<button class="tb-swatch${group && group.color === c ? " is-active" : ""}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join("");
        const dlg = new Dialog({
            title: colorOnly ? this.t("changeColor") : (isEdit ? this.t("rename") : this.t("newGroup")),
            width: "420px",
            content: `<div class="b3-dialog__content tb-groupdlg">
  ${colorOnly ? "" : `<label class="tb-cre-field"><span>${esc(this.t("groupName"))}</span>
<input class="b3-text-field fn__block" id="tbGroupName" value="${esc(group ? group.name : "")}" placeholder="${esc(this.t("groupNamePlaceholder"))}" /></label>`}
  <div class="tb-cre-field"><span>${esc(this.t("groupColor"))}</span><div class="tb-swatches" id="tbSwatches">${colors}</div></div>
  <div class="tb-dlg-actions">
    <button class="b3-button b3-button--cancel" id="tbGCancel">${esc(this.t("cancel"))}</button>
    <button class="b3-button b3-button--text" id="tbGOk">${esc(isEdit ? this.t("save") : this.t("create"))}</button>
  </div>
</div>`,
        });
        const el = dlg.element;
        let picked = group ? group.color : PALETTE[this.board.groups.length % PALETTE.length];
        el.querySelectorAll(".tb-swatch").forEach((btn) => {
            btn.addEventListener("click", () => {
                picked = btn.dataset.color;
                el.querySelectorAll(".tb-swatch").forEach((x) => x.classList.toggle("is-active", x === btn));
            });
        });
        el.querySelector("#tbGCancel").addEventListener("click", () => dlg.destroy());
        el.querySelector("#tbGOk").addEventListener("click", () => {
            if (isEdit) {
                if (!colorOnly) {
                    const name = el.querySelector("#tbGroupName").value.trim();
                    if (!name) return;
                    group.name = name;
                }
                group.color = picked;
                this.save();
                dlg.destroy();
                if (onDone) onDone(group);
                this.render();
                return;
            }
            const name = el.querySelector("#tbGroupName").value.trim();
            if (!name) return;
            const g = this.addGroup(name, picked);
            dlg.destroy();
            if (!onDone) this.board.ui.group = g.id;
            if (onDone) onDone(g);
            this.render();
            showMessage(this.t("groupCreated"));
        });
    }
};
