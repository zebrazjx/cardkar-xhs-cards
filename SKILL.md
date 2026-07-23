---
name: cardkar-xhs-cards
description: "Create Xiaohongshu content cards with Codex writing and image generation, then use the private CardKar API for secure pagination and high-resolution PNG rendering. Use for CardKar cards, 小红书卡片, 图文卡片, Markdown 转卡片, 文章出图, or a complete topic-to-card workflow."
---

# CardKar 小红书卡片

当前版本：`1.0.0`

把话题或 Markdown 转成可发布的小红书卡片。把写作、封面创意和生图留在 Codex；只通过 CardKar API 完成私有分页和高清渲染。

## 每次启动

在询问素材前运行：

```bash
node "$SKILL_DIR/scripts/cardkar-update.mjs"
```

- 已是最新版本：继续。
- 更新成功：重新完整读取更新后的 `SKILL.md`，再继续。
- 网络不可用：说明将使用当前稳定版本，继续任务。
- 校验失败：停止自动更新并说明原因；不要安装未验证的包。

把 `$SKILL_DIR` 替换为本 Skill 目录的绝对路径。不要直接 `git pull`，只安装 CardKar 正式清单中通过 SHA-256 校验的发布包。

## 首次体验分流

当用户第一次使用、只说“试一下”或尚未明确要制作自己的内容时，先给两个选择：

1. **快速看效果**：不配置 Key、不消耗次数，直接展示 `assets/demo/` 中的正式示例卡片。
2. **制作自己的卡片**：配置 API Key；每个账号首次启用赠送 30 次，成功输出 1 张卡片使用 1 次。

快速体验只展示预生成示例，不调用匿名制卡 API。展示后询问是否开始制作自己的内容。

用户已经明确提供主题、Markdown 或自己的素材时，直接进入正式使用，不重复询问体验方式。

## API Key 配置

API Key 只按以下顺序读取：

1. `CARDKAR_API_KEY` 环境变量；
2. 当前工作目录的 `.cardkar/secret.txt`。

只报告“已配置/未配置”和来源类型，绝不显示 Key、前缀、后缀或文件内容。

未配置时：

1. 给出可点击地址：`https://cardkar.com/workspace?view=api#api-console`。
2. 运行：

   ```bash
   node "$SKILL_DIR/scripts/cardkar-setup.mjs" --init
   ```

3. 把脚本返回的 `secretPath` 作为可点击本地文件告诉用户。
4. 告诉用户把完整 Key 粘贴在 `CARDKAR_API_KEY=` 后，保存文件，再回复“已粘贴”。
5. 用户确认后运行 `cardkar-setup.mjs --check`；只报告校验状态。
6. Key 未通过校验时停止 API 调用，不猜测、不复述文件内容。

`cardkar-setup.mjs` 会创建权限受限的 `.cardkar/secret.txt`，并加入当前目录的 `.gitignore`。不要让用户把 Key 粘贴进聊天、Skill、Markdown、命令参数或仓库。

## 创作者身份

Key 配置完成后运行：

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" --profiles
```

只展示返回的昵称、副昵称、是否默认和是否有头像，不展示任何密钥。

### 多个身份

按编号列出全部身份，让用户选择；额外提供“本次使用新的头像和昵称”。

### 一个身份

询问是否使用该默认身份；允许用户本次临时更换。

### 没有身份

提供三个选择：

1. 使用 CardKar 默认身份快速测试；
2. 现在提供头像、昵称和副昵称；
3. 前往 CardKar 创建创作者身份。

必须解释：**副昵称是显示在昵称下面的一行账号名或身份说明**，例如 `@CardKar`、`产品经理卡卡`、`AI 创作手记`。

用户选择账号身份时，调用渲染只传 `--profile-id`。服务器从 Key 所属账号读取头像、昵称和副昵称。用户本次明确提供的身份素材优先于账号身份。

## 本次素材确认

身份确定后，只询问当前任务仍缺少的内容：

- 主题或 Markdown；
- 16:9 封面/插图：使用用户图片、由 Codex 生成无字封面，或纯文字；
- 如果未使用账号身份：头像、昵称、副昵称。

不要重复询问用户已提供的项目。多个未确认项用一条合并消息询问。

身份与素材优先级：

1. 当前任务中用户明确提供的内容；
2. 用户选中的 CardKar 创作者身份；
3. 用户明确同意的 AI 生成内容；
4. 用户明确同意的 `我是卡卡 / @CardKar / CardKar 默认头像`。

不得静默套用默认值，不得自行添加认证徽章。

## 资源

- 写作或改写前完整读取 `references/writing-style.md`。
- 生成封面前完整读取 `references/cover-style.md`。
- 查询身份、调用 API 或处理错误前完整读取 `references/cardkar-api.md`。
- 使用 `scripts/cardkar-client.mjs`；不要重写 HTTP、multipart、凭据或幂等逻辑。

## 模式

1. **完整模式（默认）**：生成文章、标签和引导评论；按用户选择准备封面；调用 API。
2. **文章转卡片**：保留用户 Markdown 原意和结构；按需准备封面；调用 API。
3. **纯文字模式**：用户明确只要文字时，不配置 Key、不调用 API。

不要自动发布到外部平台。

## 正式工作流

### 1. 准备文章

生成 `cardkar-content.md`：

```markdown
# 12-24字的具体标题

正文第一段。

## 小标题

正文段落。
```

Markdown 中不放图片、HTML、外部 URL、标签、发布 CTA 或 API Key。全文通常为 700–1000 个中文字符；用户提供原文时优先尊重其长度和结构。

另外准备：

- 5–8 个相关标签；
- 2–3 句话的具体引导评论。

### 2. 准备封面

- 用户提供图片：直接使用，只检查 PNG/JPEG/WebP、16:9 和 4 MiB 限制。
- 用户同意 AI 生成：按 `cover-style.md` 使用 Codex 内置生图能力生成无字 16:9 图片。
- 用户选择纯文字：不传封面。

不要调用第三方生图 API。

### 3. 查询身份并预检

使用账号身份：

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" \
  --md ./cardkar-content.md \
  --profile-id "用户选择的 UUID" \
  --cover ./cover.png \
  --max-cards 12 \
  --outdir ./cardkar-cards \
  --dry-run
```

使用本次临时身份：

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" \
  --md ./cardkar-content.md \
  --avatar ./avatar.png \
  --nick "用户昵称" \
  --handle "@user" \
  --cover ./cover.png \
  --max-cards 12 \
  --outdir ./cardkar-cards \
  --dry-run
```

纯文字卡片删除 `--cover`。预检必须显示：Key 已配置、Key 来源类型、正式 Base URL、身份来源和封面来源。不得显示密钥。

### 4. 调用 API

确认预检通过后，用相同参数删除 `--dry-run`。API Key 不得进入命令行。

### 5. 检查和交付

检查：

- `manifest.json` 存在；
- `pageCount` 与 PNG 数量一致；
- 每张成品为 2160 × 2880；
- 标题、正文、封面和身份未丢失；
- 没有重复页、空白页、裁底或意外认证徽章。

交付：

- Markdown；
- 封面（如有）；
- 每张 PNG；
- 卡片张数、本次使用次数和剩余次数；
- 标签和引导评论。

幂等重放的 `billableUnits` 必须为 0。错误时保留文章和封面；鉴权、余额和服务不可用错误不要循环重试。

## 边界

- 不包含、复制或重建 CardKar 模板 HTML、CSS、字体测量或分页算法。
- 不使用其他账号的身份、认证素材、归档地址或个人标签。
- 不发明数据、研究结论或真实经历。
- 不用新幂等键绕过等待或计量。
