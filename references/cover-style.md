# CardKar 无字封面规范

## 使用方式

先根据文章的核心冲突写一个具体画面 Prompt，再调用 Codex 内置生图能力。不要调用外部生图 API。输出 16:9 的 PNG、JPEG 或 WebP。

## 画面目标

生成一张无字、适合嵌入小红书卡片的成人编辑插画：

- 粗糙手绘黑色墨线，允许轻微不规则；
- 低饱和但有层次的扁平色块；
- 具体成人场景和可理解的隐喻；
- 构图简洁，人物与关键动作在小尺寸下仍然清楚；
- 每张选择一个主色和 2-3 个辅助色，避免连续使用黄色或米黄色背景。

不要生成文字、字母、数字、标题、水印或 Logo。不要使用 3D、写实、日漫、Q 版、可爱吉祥物、赛博朋克、科技 UI、精致库存插画或复杂背景。

## Prompt 判断流程

在生成前确定：

1. 文章核心情绪和冲突是什么；
2. 画面需要 1 人、2 人还是小群像；
3. 每个人的年龄感、体型、发型、衣服、姿态和表情如何区分；
4. 哪个具体动作能表达文章隐喻；
5. 主色是否与近期封面重复。

Prompt 必须写清人物数量、人物差异、动作、场景、主色和隐喻。不要只把标题原样交给生图工具。

示例：

```text
A quiet 16:9 editorial cartoon with no text. Main palette: muted teal room, dusty coral desk, small olive accents. One short woman with round glasses calmly holds a single checklist while dozens of oversized interview papers circle above her like birds. An exhausted tall man in a wrinkled blue shirt tries to catch every paper at once. Rough black ink outlines, flat low-saturation colors, simple background. The scene is a metaphor for replacing anxious preparation with one clear decision system. No letters, numbers, captions, logos, or watermark.
```

## 生成后检查

- 比例是否为 16:9；
- 是否出现任何可读文字或乱码；
- 人物是否为成年人；
- 隐喻是否与文章相关；
- 小尺寸下主体是否清晰；
- 文件是否小于 4 MiB。过大时转换为高质量 JPEG 或 WebP 后再调用 API。
