# CardKar Skill API

## 环境变量

```text
CARDKAR_API_KEY       必需；ck_test_ 或 ck_live_ 开头
CARDKAR_API_BASE_URL  可选；默认 https://cardkar.com
CARDKAR_NICKNAME      可选；默认 我是卡卡
CARDKAR_HANDLE        可选；默认 @cardkar
CARDKAR_AVATAR        可选；本地头像路径
```

不要显示、记录或写入完整 API Key。不要通过 `--api-key` 命令参数传递。

## 客户端

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" --help
```

常用调用：

```bash
node "$SKILL_DIR/scripts/cardkar-client.mjs" \
  --md ./cardkar-content.md \
  --cover ./cover.png \
  --outdir ./cardkar-cards
```

支持参数：

```text
--md PATH                必需，Markdown 文件
--cover PATH             可选，PNG/JPEG/WebP，最大 4 MiB
--avatar PATH            可选，PNG/JPEG/WebP，最大 180 KiB
--nick TEXT              可选
--handle TEXT            可选
--max-cards N            可选，默认 12
--outdir PATH            可选，默认 ./cardkar-cards
--base-url URL           可选，覆盖环境变量
--idempotency-key VALUE  仅在重试既有请求时显式传入
--dry-run                只校验并显示脱敏请求摘要，不联网
```

客户端默认根据规范化请求计算稳定幂等键。网络失败后使用相同文件和参数重试，不要修改幂等键。

数据库 Key 会在开始渲染前按 `--max-cards` 预留积分，成功后只按实际输出张数结算并释放差额。把 `--max-cards` 设为本次真正允许的上限；余额必须至少覆盖该值。

## API

```http
POST /api/v1/skills/xhs-highlight/render
Authorization: Bearer <CARDKAR_API_KEY>
Idempotency-Key: <stable-key>
Content-Type: application/json
Accept: multipart/form-data
```

响应包含 `manifest` 和多个 `pages`。客户端把 manifest 保存为 `manifest.json`，卡片保存为 `card-01.png` 等文件。

## 错误处理

| 错误码 | 处理 |
|---|---|
| `UNAUTHORIZED` | 停止，提醒用户检查 `CARDKAR_API_KEY`，不要显示 Key |
| `SKILL_API_NOT_CONFIGURED` | 停止，目标服务器尚未启用 Skill API |
| `UNKNOWN_FIELD` | 使用当前客户端和固定字段重试一次 |
| `MARKDOWN_HTML_BLOCKED` | 删除原始 HTML |
| `MARKDOWN_RESOURCE_BLOCKED` | 删除 Markdown 图片和 URL；封面使用 `--cover` |
| `INVALID_AVATAR_DATA` | 压缩或缩小头像后重试 |
| `INVALID_COVER_DATA` | 转换为合规 PNG/JPEG/WebP 并缩小后重试 |
| `RENDER_PAGE_LIMIT` | 缩短文章或提高 `--max-cards`，不得超过服务器上限 |
| `IDEMPOTENCY_CONFLICT` | 不自动生成新 Key；确认请求是否确实改变后再创建新请求 |
| `REQUEST_IN_PROGRESS` | 等待片刻，复用原幂等键重试；不要新建幂等键 |
| `INSUFFICIENT_CREDITS` | 停止，提醒用户充值积分或合理降低 `--max-cards`，不要循环重试 |
| `IDEMPOTENT_ARTIFACT_UNAVAILABLE` | 原结果已不可用；告知用户后，由用户决定是否使用新幂等键重新生成 |
| `RATE_LIMITED` / `RENDER_CAPACITY` | 遵循 `Retry-After`，复用同一幂等键进行有限重试 |

鉴权、配置和幂等冲突错误不要循环重试。服务端返回的错误正文不得包含本地文件、API Key 或模板实现。
