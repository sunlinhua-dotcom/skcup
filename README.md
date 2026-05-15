# 斯凯奇杯壶类爆款策略

31 页客户提案 deck，纯静态前端（HTML + CSS + JS），无构建步骤。

## 本地预览

```bash
python3 -m http.server 4603
# 浏览器打开 http://127.0.0.1:4603/index.html
```

或直接 `file://` 打开 `index.html`（已用 `strategy_pages.js` 作为数据 wrapper，绕过 fetch CORS）。

## 在线预览

通过 GitHub Pages 部署：[https://sunlinhua-dotcom.github.io/skcup/](https://sunlinhua-dotcom.github.io/skcup/)

## 内容编辑

- **`strategy_pages.json`** 是单一数据源。改内容只动这一份。
- 改完后同步生成 JS wrapper：

```bash
python3 -c "import json; d=json.load(open('strategy_pages.json')); open('strategy_pages.js','w').write('window.DECK_DATA = '+json.dumps(d, ensure_ascii=False, indent=2)+';\n')"
```

- 然后刷 `index.html` 里的 `?v=` 版本号清缓存。

## 操作

- **左右箭头 / 空格 / 触屏滑动** — 翻页
- **鼠标点底部缩略点** — 跳页
- **`?video` URL 参数** — 进入视频录制模式（隐藏导航栏）

## 文件结构

```
index.html                    # 入口
styles.css                    # 全部样式（含 16 种 layout）
app.js                        # 渲染 + 动画 + 翻页逻辑
strategy_pages.json           # 31 页数据源
strategy_pages.js             # JSON 的 JS wrapper（file:// 兼容）
assets/products/              # 4 款英雄产品 hero 图
assets/generated/             # 11 张 AI 生成的辅助图
```

## 设计原则

1. **数据 / 提案 / 待补** 三层口径明示，所有 KPI 红线、价格、件数都打 tag pill
2. **31 页结构**：开篇 → 数据口径 → 市场机会 → 品类爆款 4 路径 → 案例（GERM/Owala/Stanley）→ 心智地图 → 路径选择 → 消费者 → 品牌资产翻译 → 4 款英雄 → 渠道 → 验证 → 监控 → 90 天 → 节奏表 → 风险 → 数据请求
3. **全局排版**：中文 `word-break: keep-all` + `hanging-punctuation: allow-end`，标点不掉行首
4. **所有数字、产品名、品牌资产 (MEMORY FOAM / SKECH-AIR / etc) 锁定**，humanize 改写时不动

## 数据来源

- Skechers 2024 年财报新闻稿（89.7 亿$ / 中国 12.18 亿$）
- 斯凯奇品牌介绍 PDF p5（NO.1 中国运动休闲、亚洲 NO.1 儿童运动）
- 国家体育总局《中国户外运动产业发展报告 2024-2025》
- TIME 2024（Stanley 2023 ~$750M）
- 2026 斯凯奇杯壶手册（25 个 SKU 容量 / 价格 / 材质）
- 项目方告知（3800 家门店 / 29000 库存 / 京东月度报销 2000）

提案、KPI 阈值、收入预测、铺货件数全部标记为 B 类提案 / C 类待补，等斯凯奇方真实平台、门店、会员、供应链数据接入后复算。
