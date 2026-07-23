# CardKar 小红书卡片 Skill

`cardkar-xhs-cards` 是 CardKar 官方 Codex Skill。

用户提供话题或 Markdown 后，Codex 负责写作和使用内置生图能力生成封面，CardKar API 负责安全分页与高清 PNG 渲染。

## 当前状态

目前为邀请制 Beta：

- Skill 可以公开下载和安装。
- API Key 需要通过 CardKar 团队开通。
- API 按成功输出的卡片张数消耗积分。

```text
1 API 积分 = 成功输出 1 张卡片 PNG
```

失败请求不扣费，相同幂等请求的重放不重复扣费。

## 下载

- [下载最新 Beta Skill](https://github.com/zebrazjx/cardkar-xhs-cards/releases/download/v0.1.0-beta/cardkar-xhs-cards-v0.1.0-beta.skill)
- [查看全部 Releases](https://github.com/zebrazjx/cardkar-xhs-cards/releases)
- [查看 CardKar API 文档](https://beta.cardkar.com/workspace?view=api)

下载后，在 Codex 的 Skill 安装/导入入口选择 `.skill` 文件。

## 首次配置

必须把 API Key 安全配置到运行 Codex 的环境中：

```text
CARDKAR_API_KEY
```

Beta 环境还需要：

```text
CARDKAR_API_BASE_URL=https://beta.cardkar.com
```

可选身份配置：

```text
CARDKAR_NICKNAME=你的昵称
CARDKAR_HANDLE=@your_handle
CARDKAR_AVATAR=/absolute/path/to/avatar.png
```

不要把 API Key 粘贴到聊天、Prompt、Markdown、Skill 文件、命令参数或代码仓库中。

## 使用示例

安装并配置后，可以直接对 Codex 说：

```text
用 $cardkar-xhs-cards 把“第一次用 AI 做小红书的 5 个坑”
做成一套小红书卡片。
```

Codex 会：

1. 生成或整理 Markdown。
2. 按需使用内置生图能力生成无字 16:9 封面。
3. 调用 CardKar `xhs-highlight@1` API。
4. 把 `manifest.json` 和多张高清 PNG 保存到本地。
5. 告知卡片路径、张数、本次计量和剩余积分。

Codex 不会自动发布到任何外部平台。

## 安全边界

本仓库只包含公开的 Skill 编排、写作/封面规范和 API 客户端：

- 不包含 CardKar 私有模板 HTML 或 CSS。
- 不包含分页算法和服务端渲染实现。
- 不包含真实 API Key。
- 不包含来源账号的头像、昵称、认证素材或个人归档信息。

API Key 只从 `CARDKAR_API_KEY` 环境变量读取。

## Beta 文件校验

```text
SHA-256  5a9b82f5f88735c5b37fce6db0d64234337c04483a37adc5ea24b2c77c5313a8
File     cardkar-xhs-cards-v0.1.0-beta.skill
```
