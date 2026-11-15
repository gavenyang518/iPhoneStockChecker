# RestockCheck – Apple Store pickup alerts (Chrome extension)

Open-source browser extension that watches Apple Store in-store pickup availability and alerts you the moment your chosen product is in stock.

- Website: https://restockcheck.com
- Chrome Web Store: https://chromewebstore.google.com/detail/odpppmkaeifciiahdneccibdigdkjfnh
- [中文说明见下方](#中文说明)

Need alerts while your computer is off? Use https://restockcheck.com (server checks about every 5 s for the stores you choose, email/phone alerts).

## Features

- Country → model → color → storage → Apple Store, across 25 countries and regions (US stores searchable by city, state, or 5-digit ZIP; ZIP sorts by distance).
- Checks every 30 s – 5 min directly from your own browser, one small single-store request per store per cycle (batching all watched configurations at that store).
- Three clear states: in stock, not available, or not confirmed. Timeouts, rate limits, or transient network errors are never misreported as "out of stock".
- Alerts only when an item moves into stock; subsequent checks while stock persists remain silent.
- Request budget (max 20 requests / 10 min) and an automatic 15-minute cooldown if Apple returns HTTP 429, 403, or 541, ensuring your normal Apple Store browsing is never disrupted.
- Notification action buttons: "Reserve on Apple" and "Got it, stop".
- Toolbar badge showing the number of watched configurations currently in stock.
- Full English and Simplified Chinese interface.

## How it works

1. **Pick your configuration:** Select country, model, color, capacity, and Apple Store. Public model and store catalogs are fetched from `restockcheck.com` public APIs (`/api/stock/catalog`, `/api/stock/stores`).
2. **Local storage:** Your watch list and check settings are saved locally in `chrome.storage.local`.
3. **Direct browser polling:** Chrome alarms wake up the background service worker, which sends requests directly from your browser to Apple's public retail pickup availability endpoint (`www.apple.com` or `www.apple.com.cn`).
4. **Instant alerts:** When a monitored configuration transitions into stock, the extension displays a desktop notification and plays an audio chime via an offscreen document.

## Install

### Chrome Web Store (Recommended)

Install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/odpppmkaeifciiahdneccibdigdkjfnh).

### Load unpacked (Developer mode)

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the extension directory. No build step is required.
5. Pin RestockCheck to your toolbar, add your desired configuration, and click **Test alert**.

## Privacy summary

- **Stock checks:** Stock checks run in your browser, going directly to Apple (`apple.com` / `apple.com.cn`).
- **Store search & catalog:** Store search by city/ZIP and the model catalog are fetched from restockcheck.com public APIs (`/api/stock/stores`, `/api/stock/catalog`) — the city/ZIP you type is sent for that lookup.
- **Upgrade link:** ONLY the 'Upgrade' link carries your selected configuration and utm parameters (`utm_source=chrome_extension&utm_medium=extension&utm_campaign=upgrade`). Header and footer links to restockcheck.com are plain navigation links.
- **Local storage:** Watches and settings remain strictly on your device in `chrome.storage.local` and are deleted when the extension is removed.
- **No third-party analytics or ads:** No account required, no third-party analytics or ads.
- Full details: see [PRIVACY.md](PRIVACY.md).

## Permissions

| Permission                                              | Why                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `alarms`                                                | Schedules periodic stock checks.                                    |
| `notifications`                                         | Displays the "back in stock" alert.                                 |
| `storage`                                               | Saves your watches and preferences locally on your computer.        |
| `offscreen`                                             | Plays the alert chime (service workers cannot play audio directly). |
| `https://www.apple.com/*`, `https://www.apple.com.cn/*` | Queries Apple's public pickup availability endpoint for your store. |
| `https://restockcheck.com/*`                            | Reads the public model catalog and store directory.                 |

## License

MIT License. See [LICENSE](LICENSE) for details.

## Disclaimer

Not affiliated with Apple. RestockCheck is an independent tool. Apple and Apple Store are trademarks of Apple Inc. Alerts are observations of pickup availability, not reservations; always complete your purchase directly on Apple's official site.

---

## 中文说明

[RestockCheck](https://restockcheck.com) 是一款开源浏览器插件，在你自己的浏览器中监控 Apple Store 门店自提库存，并在所选机型恢复有货时弹出桌面通知并播放提示音。

- 官方网站: https://restockcheck.com
- Chrome 应用商店: https://chromewebstore.google.com/detail/odpppmkaeifciiahdneccibdigdkjfnh

需要电脑关机也能收到提醒？使用 https://restockcheck.com（服务器约每 5 秒检查你所选的直营店，支持邮件和手机推送提醒）。

### 功能特性

- 覆盖 25 个国家和地区，支持按国家 → 机型 → 颜色 → 容量 → 指定门店查询（美国门店支持城市、州或 5 位邮编搜索并按距离排序）。
- 在你自己的浏览器中每 30 秒至 5 分钟检查一次，每轮每店合并为 1 个轻量请求。
- 三种状态：有现货、暂无现货、暂未确认。超时、限流等异常绝不误报为“无货”。
- 仅在“无货 → 有货”状态转变时触发提醒，持续有货不重复打扰。
- 安全请求配额（10 分钟最多 20 次请求），遇 Apple 429/403/541 限流自动暂停 15 分钟冷静期，不干扰正常 Apple 官网浏览。
- 通知内置快捷操作：“去 Apple 预约”与“已买到，停止”。
- 图标角标实时显示当前有现货的监控项数量。
- 完整支持英文与简体中文。

### 工作原理

1. **选配加载：** 用户选择机型与门店，机型目录与门店列表通过 RestockCheck 公开接口（`/api/stock/catalog` 与 `/api/stock/stores`）获取。
2. **本地保存：** 监控项与偏好设置保存在本地浏览器的 `chrome.storage.local`。
3. **浏览器直查：** 定时唤醒 Service Worker，由浏览器直接向 Apple 官方自提接口（`www.apple.com` 或 `www.apple.com.cn`）发送请求。
4. **到货提醒：** 监控项恢复现货时，触发桌面通知并通过 Offscreen Document 播放提示音。

### 安装方法

#### 方式一：Chrome 应用商店安装（推荐）

访问 [Chrome Web Store](https://chromewebstore.google.com/detail/odpppmkaeifciiahdneccibdigdkjfnh) 直接添加至 Chrome。

#### 方式二：加载已解压的扩展程序（开发者模式）

1. 克隆或下载本仓库。
2. 在 Chrome 中打开 `chrome://extensions`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择本目录。无需构建或编译步骤。
5. 在工具栏固定 RestockCheck，添加监控项并点击“测试提醒”。

### 隐私说明

- **直连 Apple：** 库存检查在你的浏览器中直接运行，直连 Apple（`apple.com` / `apple.com.cn`）。
- **门店与目录查询：** 城市/邮编查店与机型目录调用 restockcheck.com 公开接口（`/api/stock/stores`、`/api/stock/catalog`），所输入的城市或邮编发送用于门店检索。
- **升级链接：** 仅“升级”链接携带所选机型配置与 UTM 参数（`utm_source=chrome_extension&utm_medium=extension&utm_campaign=upgrade`）；顶部与页脚官网链接均为纯净链接，不带参数。
- **本地存储：** 监控项和设置仅保存在本地设备 `chrome.storage.local`，卸载插件时自动删除。
- **无第三方统计或广告：** 无需账号，无第三方统计或广告。
- 完整隐私条款详见 [PRIVACY.md](PRIVACY.md)。

### 免责声明

本项目与 Apple Inc. 无任何关联。RestockCheck 为独立第三方工具。提醒仅代表查询时的自提状态观察，不等于官方库存锁定或预约；购买与自提预约须在 Apple 官方渠道完成。

### 开源许可

MIT 许可证。详见 [LICENSE](LICENSE)。
