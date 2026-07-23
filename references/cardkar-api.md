# CardKar Skill API

## 正式地址

```text
API 服务页  https://cardkar.com/workspace?view=api#api-console
Base URL    https://cardkar.com
身份接口    GET /api/v1/skills/me/creator-profiles
制卡接口    POST /api/v1/skills/xhs-highlight/render
```

每个账号首次启用 API Key 赠送 30 次。只有成功输出的卡片才计次；1 张成品使用 1 次。快速体验展示 Skill 内置示例，不调用 API、不使用次数。

## Key 的安全配置

客户端按以下顺序读取 Key：

1. `CARDKAR_API_KEY` 环境变量；
2. 当前工作目录 `.cardkar/secret.txt`。

创建本地密钥文件：

```bash
node "$SKILL_DIR/scripts/cardkar-setup.mjs" --init
```

检查配置：

```bash
node "$SKILL_DIR/scripts/cardkar-setup.mjs" --check
```

`secret.txt` 的格式：

```text
CARDKAR_API_KEY=
```

完整 Key 由用户自行粘贴在等号后。不要读取后转述，不要显示前缀或后缀，不要把 Key 放进聊天、Markdown、Skill、命令参数、日志或 Git。脚本会把 `.cardkar/secret.txt` 加入当前目录的 `.gitignore`，并在 POSIX 系统上限制为 `0600`。

不得静默使用开发 Key、示例 Key、历史命令中的 Key或其他账号的 Key。

## 查询创作者身份

Key 配置成功后先运行：

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" --profiles
```

返回字段：

```text
id           传给 --profile-id 的 UUID
nickname     昵称
subNickname  副昵称；显示在昵称下面的一行账号名或身份说明
isDefault    是否为账号默认身份
hasAvatar    是否保存了头像
```

副昵称示例：`@CardKar`、`产品经理卡卡`、`AI 创作手记`。

使用账号身份时，只传 `--profile-id`，不要同时传 `--avatar`、`--nick` 或 `--handle`。服务器会按 Key 所属账号读取身份，客户端不会下载头像。

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" \
  --md ./cardkar-content.md \
  --profile-id "身份 UUID" \
  --outdir ./cardkar-cards
```

用户本次提供新身份时，不传 `--profile-id`：

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" \
  --md ./cardkar-content.md \
  --avatar ./avatar.png \
  --nick "昵称" \
  --handle "@账号名或身份说明" \
  --outdir ./cardkar-cards
```

没有身份时提供三个选择：

1. 使用 CardKar 默认身份快速测试；
2. 本次提供头像、昵称和副昵称；
3. 前往 CardKar 创建并保存创作者身份。

默认身份必须经用户明确同意，不能静默套用。

## 客户端

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" --help
```

支持参数：

```text
--profiles                 查询 Key 所属账号的创作者身份
--md PATH                  制卡时必需；Markdown 文件
--cover PATH               可选；PNG/JPEG/WebP，最大 4 MiB
--avatar PATH              可选；PNG/JPEG/WebP，最大 180 KiB
--profile-id UUID          可选；使用账号中保存的身份
--nick TEXT                可选；本次临时昵称
--handle TEXT              可选；本次临时副昵称
--secret-file PATH         可选；覆盖默认密钥文件路径
--max-cards N              可选；默认 12，最大 16
--outdir PATH              可选；默认 ./cardkar-cards
--base-url URL             可选；覆盖正式 Base URL
--idempotency-key VALUE    仅在重试既有请求时显式传入
--dry-run                  校验并显示脱敏摘要，不发送制卡请求
```

正式调用前用相同参数追加 `--dry-run`。预检只可以显示：

- Key 已配置或未配置；
- Key 来源是环境变量或工作区密钥文件；
- 正式 Base URL；
- 身份来源、头像/封面文件路径与大小；
- 稳定幂等键。

不得显示完整 Key、任何可识别的 Key 片段或密钥文件内容。

客户端根据规范化请求计算稳定幂等键。网络失败后使用相同文件和参数重试，不要修改幂等键。数据库 Key 会先按 `--max-cards` 预留次数，成功后按实际卡片张数结算并释放差额。

## HTTP 接口

查询身份：

```http
GET /api/v1/skills/me/creator-profiles
Authorization: Bearer <CARDKAR_API_KEY>
Accept: application/json
```

生成卡片：

```http
POST /api/v1/skills/xhs-highlight/render
Authorization: Bearer <CARDKAR_API_KEY>
Idempotency-Key: <stable-key>
Content-Type: application/json
Accept: multipart/form-data
```

响应包含 `manifest` 和多个 `pages`。客户端把 manifest 保存为 `manifest.json`，卡片保存为 `card-01.png` 等文件。

## 自动更新

每次使用先运行：

```bash
node "$SKILL_DIR/scripts/cardkar-update.mjs"
```

更新器只接受 CardKar 正式 HTTPS 域名下的清单和安装包；安装前验证 Skill 名称、语义版本、压缩包路径和 SHA-256。网络错误时继续使用当前稳定版本；清单或完整性校验错误时停止更新，不安装未知内容。

## 错误处理

| 错误码 | 处理 |
|---|---|
| `UNAUTHORIZED` | 停止，提醒用户重新检查或生成 Key，不显示 Key |
| `CREATOR_PROFILE_NOT_FOUND` | 重新查询身份，不能猜测其他账号的 ID |
| `CREATOR_PROFILE_CONFLICT` | `--profile-id` 与临时身份参数二选一 |
| `SKILL_API_NOT_CONFIGURED` | 停止，目标服务器尚未启用 Skill API |
| `UNKNOWN_FIELD` | 更新 Skill；不要自行猜测服务端字段 |
| `MARKDOWN_HTML_BLOCKED` | 删除原始 HTML |
| `MARKDOWN_RESOURCE_BLOCKED` | 删除 Markdown 图片和 URL；封面使用 `--cover` |
| `INVALID_AVATAR_DATA` | 压缩或缩小头像后重试 |
| `INVALID_COVER_DATA` | 转换为合规 PNG/JPEG/WebP 并缩小后重试 |
| `RENDER_PAGE_LIMIT` | 缩短文章或合理提高 `--max-cards` |
| `IDEMPOTENCY_CONFLICT` | 确认请求是否改变；不要自动生成新 Key |
| `REQUEST_IN_PROGRESS` | 等待片刻，复用原幂等键有限重试 |
| `INSUFFICIENT_CREDITS` | 停止并告知剩余次数；不要循环重试 |
| `IDEMPOTENT_ARTIFACT_UNAVAILABLE` | 告知旧结果不可用，由用户决定是否新建任务 |
| `RATE_LIMITED` / `RENDER_CAPACITY` | 遵循 `Retry-After`，复用原幂等键有限重试 |

鉴权、配置和幂等冲突错误不要循环重试。服务端错误正文不得进入最终内容。
