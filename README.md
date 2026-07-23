# CardKar 小红书卡片 Skill

`cardkar-xhs-cards` 是 CardKar 官方 Codex Skill。

你提供话题或 Markdown，Codex 负责写作和使用内置生图能力准备封面；CardKar API 负责安全分页与 2160 × 2880 高清 PNG 渲染。

## 安装

把下面这句话交给 Codex：

```text
请帮我安装这个 CardKar 小红书卡片 Skill：
https://cardkar.com/downloads/cardkar-xhs-cards.skill
```

也可以直接访问 [CardKar API 服务页](https://cardkar.com/workspace?view=api) 下载。

## 第一次使用

Skill 会先让你选择：

1. **快速看效果**：展示内置示例，不配置 API Key、不消耗次数。
2. **制作自己的卡片**：安全配置 API Key，再制作你的内容。

每个 CardKar 账号首次启用 API Key 赠送 30 次。成功生成 1 张卡片使用 1 次；失败请求不扣，相同幂等请求的重放不重复扣。

## API Key

在 [CardKar API 服务页](https://cardkar.com/workspace?view=api#api-console) 登录并生成 Key。

Skill 会在你的当前工作目录创建：

```text
.cardkar/secret.txt
```

把完整 Key 粘贴到：

```text
CARDKAR_API_KEY=
```

脚本会限制文件权限并加入 `.gitignore`。不要把 API Key 粘贴到聊天、Prompt、Markdown、Skill 文件、命令参数或代码仓库。

高级用户也可以使用 `CARDKAR_API_KEY` 环境变量；它的优先级高于工作区密钥文件。

## 创作者身份

Key 配置后，Skill 会读取当前 CardKar 账号保存的创作者身份：

- 多个身份：让你选择；
- 一个身份：询问是否使用；
- 没有身份：使用 CardKar 默认身份快速测试、本次提供新身份，或前往 CardKar 创建身份。

“副昵称”是昵称下方的一行账号名或身份说明，例如 `@CardKar`、`产品经理卡卡`、`AI 创作手记`。

你本次提供的头像、昵称、副昵称和封面始终优先；Skill 不会静默套用默认身份或自行添加认证徽章。

## 使用示例

```text
用 $cardkar-xhs-cards 把“第一次用 AI 做小红书的 5 个坑”
做成一套小红书卡片。
```

Codex 会：

1. 生成或整理 Markdown。
2. 优先使用你提供的头像、身份和 16:9 封面。
3. 经你同意后，使用内置生图能力生成无字封面。
4. 调用 CardKar `xhs-highlight@1` API。
5. 保存 `manifest.json` 和多张高清 PNG。
6. 告知文件路径、卡片张数、本次使用次数和剩余次数。

Codex 不会自动发布到任何外部平台。

## 自动更新

每次使用时，Skill 会读取 CardKar 正式更新清单。只有版本、来源、压缩包路径和 SHA-256 全部通过校验，才会安装新版本；网络不可用时继续使用当前稳定版本。

## 安全边界

本仓库只包含公开的 Skill 编排、写作/封面规范、更新器和 API 客户端：

- 不包含 CardKar 私有模板 HTML 或 CSS；
- 不包含分页算法和服务端渲染实现；
- 不包含真实 API Key；
- 不包含任何来源账号的私有身份素材；
- 不调用第三方生图 API。

## 正式地址

- 官网与 API 服务页：<https://cardkar.com/workspace?view=api>
- 稳定安装包：<https://cardkar.com/downloads/cardkar-xhs-cards.skill>
- 更新清单：<https://cardkar.com/downloads/cardkar-xhs-cards.json>
