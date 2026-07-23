---
name: cardkar-xhs-cards
description: "Create Xiaohongshu content cards with Codex writing and built-in image generation, then call the private CardKar xhs-highlight API for secure pagination and high-resolution PNG rendering. Use when the user asks for CardKar cards, Xiaohongshu cards, 小红书卡片, 图文卡片, Markdown 转卡片, 文章出图, or a complete topic-to-card workflow."
---

# CardKar 小红书卡片

把话题或 Markdown 转成可发布的小红书卡片。把写作、封面创意和生图留在 Codex；只通过 CardKar API 完成私有分页和高清渲染。

## 资源

- 生成或改写文章前，完整读取 `references/writing-style.md`。
- 生成封面前，完整读取 `references/cover-style.md`。
- 调用 API 或处理错误前，完整读取 `references/cardkar-api.md`。
- 使用 `scripts/cardkar-client.mjs` 调用 API；不要自行重写 HTTP、multipart 或幂等逻辑。

## 模式

先判断请求属于哪种模式：

1. **完整模式（默认）**：用户给话题。生成文章、标签和引导评论；使用 Codex 内置生图能力生成封面；调用 CardKar API 输出卡片。
2. **文章转卡片**：用户提供 Markdown。保留原意并检查结构；按需生成或使用用户封面；调用 API。
3. **纯文字模式**：用户明确说不要图片、不要卡片或只要文字。只交付 Markdown、标签和引导评论，不调用 API。

不要自动发布到任何外部平台。只生成并交付本地文件，除非用户另行明确授权发布动作。

## 首次配置

调用 API 前检查：

```text
CARDKAR_API_KEY       必需，必须以 ck_test_ 或 ck_live_ 开头
CARDKAR_API_BASE_URL  可选，默认 https://cardkar.com
CARDKAR_NICKNAME      可选，默认 我是卡卡
CARDKAR_HANDLE        可选，默认 @cardkar
CARDKAR_AVATAR        可选，本地 PNG/JPEG/WebP 头像路径
```

API Key 只能从环境变量读取。禁止把它写入 Skill、Markdown、Prompt、日志、命令参数或交付文件；禁止输出完整 Key。

如果用户尚未配置身份资料，允许使用“我是卡卡 / @cardkar”做演示。正式为用户生成前，提醒其可以设置自己的昵称、账号名和头像；不要声称用户拥有任何认证身份。

## 完整工作流

### 1. 准备文章

生成 `cardkar-content.md`：

```markdown
# 12-24字的具体标题

正文第一段。

## 小标题

正文段落。
```

不要在 Markdown 中插入图片、HTML、外部 URL、hashtag、发布 CTA 或 API Key。全文通常控制在 700-1000 个中文字符；用户提供原文时优先尊重其长度和结构。

另外生成：

- 5-8 个与内容相关的标签，不使用固定个人标签。
- 2-3 句话的引导评论，与正文具体问题相关。

### 2. 生成封面

需要封面时，先根据 `references/cover-style.md` 写出具体场景 Prompt，再直接调用 Codex 内置生图能力。生成一张无字 16:9 PNG、JPEG 或 WebP，保存为 `cover.png` 或工具返回的本地路径。

不要调用第三方生图 API，也不要索取额外的生图服务密钥。

如果当前 Codex 环境没有生图能力或额度不足：

- 优先使用用户提供的封面；
- 或征得用户同意后生成纯文字卡片；
- 不要让整个写作结果丢失。

### 3. 调用 CardKar

先读取 `references/cardkar-api.md`，然后执行：

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" \
  --md ./cardkar-content.md \
  --cover ./cover.png \
  --outdir ./cardkar-cards
```

如果用户提供自己的身份：

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" \
  --md ./cardkar-content.md \
  --cover ./cover.png \
  --avatar ./avatar.png \
  --nick "用户昵称" \
  --handle "@user" \
  --max-cards 12 \
  --outdir ./cardkar-cards
```

将 `$SKILL_DIR` 替换为本 Skill 所在目录的绝对路径。不要把 API Key放进命令行。

### 4. 检查和交付

成功后检查：

- `cardkar-cards/manifest.json` 存在；
- `pageCount` 与实际 PNG 数量一致；
- 每张卡片使用 1080 × 1440 逻辑画布，当前高清成品为 2160 × 2880；
- 标题、正文、封面、昵称和头像未丢失；
- 没有重复页、空白页、裁底或意外认证徽章。

向用户交付：

- Markdown 文件路径；
- 封面文件路径（如有）；
- 卡片目录和每张 PNG 的路径；
- 卡片张数与本次 `billableUnits`；
- API 返回时一并说明 `creditsRemaining`，幂等重放的 `billableUnits` 必须为 0；
- 标签和引导评论。

API 报错时保留文章和封面，根据错误码修正一次；鉴权、余额或服务不可用错误不要循环重试。遇到 `REQUEST_IN_PROGRESS` 时等待后复用原幂等键，禁止为了绕过等待或计量生成新键。

## 边界

- 不包含、不复制、不重建 CardKar 模板 HTML、CSS、字体测量或分页算法。
- 不使用来源账号的头像、昵称、认证素材、归档地址、发布脚本或个人标签。
- 不发明数据、研究结论或真实经历；涉及实时事实时先核实或明确标注为用户提供。
- 不通过新的幂等键自动绕过计量；网络重试必须复用原幂等键。
