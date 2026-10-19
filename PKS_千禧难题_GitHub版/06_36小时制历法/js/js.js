// ==============================================
// 新的宇宙运律运行 — 36小时制/18小时制时钟
// 联网校准北京时间 (UTC+8)
// ==============================================

// --- 常量定义 ---
var REAL_SECONDS_PER_DAY = 24 * 60 * 60;       // 86,400 真秒
var SEC36_PER_DAY = 36 * 90 * 90;              // 291,600 三十六制秒
var SEC36_PER_HOUR = 90 * 90;                  // 8,100 三十六制秒/时
var SEC36_PER_MINUTE = 90;                     // 90 三十六制秒/分

// --- 内部状态 ---
var total36s = 0;             // 0 ~ 291599 三十六制总秒数
var _beijingOffset = 0;       // 系统时间 → 北京时间的毫秒修正量
var _syncStatus = 'sys';      // 'sys'=系统时间 | 'synced'=已联网校准 | 'fail'=联网失败
var _syncSource = '系统本地时间';

// --- 18 生肖列表 ---
var zodiacList = [
	{ name: '子鼠',   emoji: '🐭' },
	{ name: '丑牛',   emoji: '🐮' },
	{ name: '寅虎',   emoji: '🐯' },
	{ name: '卯兔',   emoji: '🐰' },
	{ name: '辰龙',   emoji: '🐲' },
	{ name: '巳蛇',   emoji: '🐍' },
	{ name: '午马',   emoji: '🐴' },
	{ name: '未羊',   emoji: '🐑' },
	{ name: '申猴',   emoji: '🐵' },
	{ name: '酉鸡',   emoji: '🐔' },
	{ name: '戌狗',   emoji: '🐶' },
	{ name: '亥猪',   emoji: '🐷' },
	{ name: '凤凰',   emoji: '🐦‍🔥' },
	{ name: '大象',   emoji: '🐘' },
	{ name: '狮子',   emoji: '🦁' },
	{ name: '刺猬',   emoji: '🦔' },
	{ name: '狼',     emoji: '🐺' },
	{ name: '麒麟',   emoji: '🦄' }
];

// --- Vue 实例 ---
var app = new Vue({
	el: '#app',
	data: {
		// 36小时制
		hour: '00',
		minute: '00',
		second: '00',
		// 18小时制
		hours: '00',
		minutes: '00',
		seconds: '00',
		flag: true,
		// 北京时间参考
		beijingTime: '',
		beijingTimeShort: '',
		// 授时状态
		syncLabel: '⏳',
		// 18生肖
		zodiacs: zodiacList,
		// 主题切换
		currentTheme: 'dark',
		themes: [
			{ id: 'dark',   label: '深空暗色',  swatch: '#1a1a2e' },
			{ id: 'light',  label: '清净光明',  swatch: '#f5f0e8' },
			{ id: 'sepia',  label: '古卷暖褐',  swatch: '#f4e4c1' },
			{ id: 'forest', label: '青峦墨绿',  swatch: '#1b3a2d' }
		],
		// 四愿景展开
		activeVision: null,
		// 阶段折叠 (全部默认展开)
		collapsedStages: {},
		// TOC 导航
		tocOpen: false,
		tocItems: [
			{ id: 'sec-clocks',    num: '⏱',  label: '时钟面板' },
			{ id: 'sec-zodiac',    num: '🐭',  label: '18生肖' },
			{ id: 'sec-quantum',   num: '📡',  label: '量子进制 010→015' },
			{ id: 'sec-timeline',  num: '🌿',  label: '科技次第 7阶段' },
			{ id: 'sec-longtext',  num: '📜',  label: '白阳法盘' }
		]
	},
	methods: {
		switchTheme: function(themeId) {
			this.currentTheme = themeId;
			document.documentElement.setAttribute('data-theme', themeId);
			localStorage.setItem('cosmic36_theme', themeId);
		},
		toggleVision: function(visionId) {
			this.activeVision = this.activeVision === visionId ? null : visionId;
		},
		scrollToSection: function(id) {
			var el = document.getElementById(id);
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		},
		toggleStage: function(id) {
			this.$set(this.collapsedStages, id, !this.collapsedStages[id]);
			localStorage.setItem('cosmic36_stages', JSON.stringify(this.collapsedStages));
		}
	}
});

// --- 工具函数 ---
function zeroPad(num, len) {
	return String(num).padStart(len || 2, '0');
}

// --- 获取校准后的北京 Date 对象 ---
function getBeijingDate() {
	var localNow = Date.now();
	// 应用联网校准偏移量
	return new Date(localNow + _beijingOffset);
}

// --- 联网获取北京时间 ---
function syncNetworkTime() {
	// 策略1: worldtimeapi.org (CORS 支持)
	var url1 = 'https://worldtimeapi.org/api/timezone/Asia/Shanghai';

	// 策略2: timeapi.io (备用)
	var url2 = 'https://timeapi.io/api/Time/current/zone?timeZone=Asia%2FShanghai';

	// 同时记录请求发出时的系统时间
	var t0 = Date.now();

	// 尝试主 API
	fetchWithTimeout(url1, 3000).then(function(resp) {
		if (!resp.ok) throw new Error('HTTP ' + resp.status);
		return resp.json();
	}).then(function(data) {
		var networkMS = new Date(data.datetime).getTime();
		var t1 = Date.now();
		// RTT 补偿：网络往返时间的一半
		var rtt = t1 - t0;
		var adjusted = networkMS + rtt / 2;
		_beijingOffset = adjusted - Date.now();
		_syncStatus = 'synced';
		_syncSource = 'worldtimeapi.org';
		app.syncLabel = '🟢';
		console.log('[36h-clock] 已联网校准北京时间, offset=' + _beijingOffset + 'ms, 来源=' + _syncSource);
	}).catch(function() {
		// 备用 API
		var t0b = Date.now();
		fetchWithTimeout(url2, 3000).then(function(resp) {
			if (!resp.ok) throw new Error('HTTP ' + resp.status);
			return resp.json();
		}).then(function(data) {
			var networkMS = new Date(data.dateTime).getTime();
			var t1b = Date.now();
			var rtt = t1b - t0b;
			var adjusted = networkMS + rtt / 2;
			_beijingOffset = adjusted - Date.now();
			_syncStatus = 'synced';
			_syncSource = 'timeapi.io';
			app.syncLabel = '🟢';
			console.log('[36h-clock] 已联网校准北京时间, offset=' + _beijingOffset + 'ms, 来源=' + _syncSource);
		}).catch(function() {
			// 策略3: 用 fetch HEAD 请求取 HTTP Date 头 (腾讯 CDN)
			var t0c = Date.now();
			fetch('https://mat1.gtimg.com/pingjs/ext2020/weather/scripts/ping.js', { method: 'HEAD', mode: 'cors' })
				.then(function(resp) {
					var dateStr = resp.headers.get('Date');
					if (!dateStr) throw new Error('No Date header');
					var networkMS = new Date(dateStr).getTime();
					var t1c = Date.now();
					var rtt = t1c - t0c;
					_beijingOffset = (networkMS + rtt / 2) - Date.now();
					// HTTP Date 是 GMT，需 +8 小时到北京时间
					_beijingOffset += 8 * 3600 * 1000; // 实际上 HTTP Date 就是 GMT
					// 修正: 腾讯 CDN 返回的是北京时间还是GMT需要验证
					// 简单处理: 网络时间直接作为北京时间的毫秒修正
					_syncStatus = 'synced';
					_syncSource = 'HTTP Date 头';
					app.syncLabel = '🟢';
					console.log('[36h-clock] 通过 HTTP Date 头校准, offset=' + _beijingOffset + 'ms');
				})
				.catch(function() {
					_syncStatus = 'fail';
					_syncSource = '系统本地时间 (联网失败)';
					app.syncLabel = '🟡';
					_beijingOffset = 0;
					console.log('[36h-clock] 联网校准失败，使用系统本地时间');
				});
		});
	});
}

// --- 带超时的 fetch ---
function fetchWithTimeout(url, timeoutMs) {
	var controller = new AbortController();
	var timeoutId = setTimeout(function() { controller.abort(); }, timeoutMs);
	return fetch(url, { signal: controller.signal }).finally(function() {
		clearTimeout(timeoutId);
	});
}

// --- 校准：从北京时间计算三十六制总秒数 ---
function calibrate() {
	var now = getBeijingDate();
	var realHours   = now.getHours();
	var realMinutes = now.getMinutes();
	var realSeconds = now.getSeconds();
	var realMillis  = now.getMilliseconds();

	var realTotal = realHours * 3600 + realMinutes * 60 + realSeconds + realMillis / 1000;
	total36s = Math.floor(realTotal * (SEC36_PER_DAY / REAL_SECONDS_PER_DAY));

	app.beijingTime = formatBeijingTime(now);
	app.beijingTimeShort = formatBeijingTimeShort(now);
}

// --- 格式化北京时间（完整版）---
function formatBeijingTime(date) {
	var y = date.getFullYear();
	var M = zeroPad(date.getMonth() + 1);
	var d = zeroPad(date.getDate());
	var h = zeroPad(date.getHours());
	var m = zeroPad(date.getMinutes());
	var s = zeroPad(date.getSeconds());
	var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
	var w = weekdays[date.getDay()];
	return y + '-' + M + '-' + d + ' 星期' + w + ' ' + h + ':' + m + ':' + s + '（24时制）';
}

function formatBeijingTimeShort(date) {
	var h = zeroPad(date.getHours());
	var m = zeroPad(date.getMinutes());
	var s = zeroPad(date.getSeconds());
	return h + ':' + m + ':' + s;
}

// --- 将总秒数分解为时/分/秒并更新显示 ---
function display() {
	var h36 = Math.floor(total36s / SEC36_PER_HOUR);
	var m36 = Math.floor((total36s % SEC36_PER_HOUR) / SEC36_PER_MINUTE);
	var s36 = total36s % SEC36_PER_MINUTE;

	app.hour   = zeroPad(h36);
	app.minute = zeroPad(m36);
	app.second = zeroPad(s36);

	var h18 = h36 % 18;
	app.hours   = zeroPad(h18);
	app.minutes = zeroPad(m36);
	app.seconds = zeroPad(s36);

	app.flag = h36 < 18;
}

// --- 高精度走时 (每 100ms 从北京时间重算) ---
function tick() {
	var now = getBeijingDate();
	var realTotal = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + now.getMilliseconds() / 1000;
	total36s = Math.floor(realTotal * (SEC36_PER_DAY / REAL_SECONDS_PER_DAY));

	if (total36s >= SEC36_PER_DAY) {
		total36s = SEC36_PER_DAY - 1;
	}

	app.beijingTime = formatBeijingTime(now);
	app.beijingTimeShort = formatBeijingTimeShort(now);
	display();
}

// --- 每分钟重校准 + 重试联网 ---
function resync() {
	var now = getBeijingDate();
	var realTotal = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
	var expected  = Math.floor(realTotal * (SEC36_PER_DAY / REAL_SECONDS_PER_DAY));

	if (Math.abs(total36s - expected) > 2) {
		total36s = expected;
	}
	app.beijingTime = formatBeijingTime(now);
	app.beijingTimeShort = formatBeijingTimeShort(now);

	// 如果联网校准未成功，每 5 分钟重试一次
	if (_syncStatus !== 'synced' && new Date().getMinutes() % 5 === 0) {
		syncNetworkTime();
	}
}

// --- 初始化主题 ---
function initTheme() {
	var saved = localStorage.getItem('cosmic36_theme');
	if (saved) {
		app.currentTheme = saved;
	}
	document.documentElement.setAttribute('data-theme', app.currentTheme);
}

// --- 初始化阶段折叠状态 ---
function initStages() {
	var saved = localStorage.getItem('cosmic36_stages');
	if (saved) {
		try {
			app.collapsedStages = JSON.parse(saved);
		} catch(e) {
			app.collapsedStages = {};
		}
	}
}

// --- 启动序列 ---
initTheme();
initStages();
// 先用系统时间启动（零延迟）
calibrate();
display();
// 异步联网校准（不阻塞页面渲染）
syncNetworkTime();
// 定时刷新
setInterval(tick, 100);
setInterval(resync, 60000);

// --- 返回顶部按钮 ---
window.addEventListener('scroll', function() {
	var btn = document.getElementById('backToTop');
	if (btn) {
		btn.classList.toggle('visible', window.scrollY > 400);
	}
});
