# Chrome Web Store listing (draft)

## Name

RestockCheck – Store Pickup Stock Alerts

## Summary (≤132 chars)

Free alerts when an iPhone or Mac is back in stock for pickup at the Apple Store you pick. Checks run in your browser.

## Category

Shopping

## Description (en)

Waiting for an iPhone to be available for in-store pickup? Pick the exact model, color, storage and your Apple Store. RestockCheck checks pickup availability from your own browser and alerts you with a desktop notification and a chime the moment it is back, so you can reserve on Apple before it sells out.

• 25 countries and regions, every Apple Store (US: search by city, state or ZIP)
• Checks every 30 seconds to 5 minutes; a safe request budget keeps your own Apple browsing working
• Clear states: in stock, not available, or not confirmed (a timeout is never shown as "out of stock")
• Alerts only when stock appears, with "Reserve on Apple" and "Got it, stop" buttons
• English and 简体中文
• Stock checks run in your browser: stock checks go directly from your browser to Apple; the city/ZIP you type is sent to restockcheck.com public APIs to look up stores; only the Upgrade link carries the selected configuration and utm parameters; no account, no third-party analytics or ads

Need alerts while your computer is off? Use https://restockcheck.com (server checks about every 5 s for the stores you choose, email/phone alerts)

Not affiliated with Apple Inc.

## Description (zh_CN)

在等 iPhone 门店自提？选好机型、颜色、容量和你的 Apple Store，RestockCheck 在你自己的浏览器里检查门店自提库存，一有货立刻弹出桌面通知并播放提示音，让你抢在售罄前去 Apple 预约。

• 覆盖 25 个国家和地区的所有 Apple Store
• 每 30 秒到 5 分钟检查一次，安全的请求额度不影响你正常浏览 Apple 官网
• 状态清楚：有现货 / 暂无现货 / 暂未确认，超时绝不显示成无货
• 只在到货时提醒，通知里可直接"去 Apple 预约"或"已买到，停止"
• 浏览器直查：库存检查直接由浏览器发往 Apple；所输入的城市/邮编发送至 restockcheck.com 公开接口查询就近门店；仅升级链接携带所选配置与 utm 参数；无需账号，无第三方统计或广告

电脑关机也想收到提醒？使用 https://restockcheck.com（服务器约每 5 秒检查你所选的直营店，支持邮件和手机推送提醒）。

与 Apple Inc. 无任何关联。

## Single purpose

Notify the user when an Apple product they choose becomes available for in-store pickup at an Apple Store they choose.

## Permission justifications

- alarms: schedules the periodic availability checks the user configured.
- notifications: shows the "back in stock" alert, the extension's core function.
- storage: saves the user's watch list and settings locally.
- offscreen: plays the alert chime; MV3 service workers cannot play audio.
- Host apple.com / apple.com.cn: requests Apple's public pickup availability for the user's chosen store and product directly from the user's browser.
- Host restockcheck.com: loads the public model catalog and performs store lookup by country/city/ZIP via public endpoints.

## Data usage disclosure

The extension requires no account, and watches and preferences are stored locally on your device (`chrome.storage.local`).

- Stock availability checks go directly from your browser to Apple (`apple.com`, `apple.com.cn`).
- Model catalog and store lists are fetched from `restockcheck.com` public endpoints (`/api/stock/catalog`, `/api/stock/stores`); the city/ZIP you type is sent to restockcheck.com to look up stores.
- ONLY the Upgrade link carries your selected configuration and utm parameters (`utm_source=chrome_extension&utm_medium=extension&utm_campaign=upgrade`); header and footer links are plain.
- No account, no third-party analytics or ads. Settings are stored locally only. Does not sell user data. Background data requests fetch model/store catalogs from RestockCheck and pickup availability from Apple. User-clicked links also open RestockCheck or Apple pages; Upgrade links include the configuration and campaign parameters disclosed above. Not used for creditworthiness or lending.

## 数据使用说明（Data usage disclosure 中文对照）

插件无需注册账号，监控项与偏好设置仅保存在本地设备（`chrome.storage.local`）。

- 库存可用性检查直接由浏览器发往 Apple 官方（`apple.com`、`apple.com.cn`）。
- 机型目录与门店列表通过 `restockcheck.com` 公开接口（`/api/stock/catalog`、`/api/stock/stores`）获取；输入的城市或邮编会发送至 restockcheck.com 用于查询就近门店。
- 仅升级链接携带所选机型配置与 utm 参数（`utm_source=chrome_extension&utm_medium=extension&utm_campaign=upgrade`）；页眉与页脚为纯净官网链接。
- 无需账号，无第三方统计或广告。设置仅保存在本地。不售卖用户数据。后台数据请求会从 RestockCheck 获取机型与门店目录，并直接向 Apple 查询自提库存。用户点击的链接会打开 RestockCheck 或 Apple 页面；“升级”链接会带上前文说明的配置与来源参数。不用于信用评估或贷款。

## Remote code

No. All code is packaged; only JSON data is fetched.

## Privacy policy URL

https://restockcheck.com/extension#privacy (full text: PRIVACY.md)

## Assets to upload

- Icon 128×128: icons/icon-128.png
- Screenshots 1280×800 (at least 1): popup with a watch list, add-watch form, notification
- Small promo tile 440×280 (optional)
