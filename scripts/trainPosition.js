/**
 * 列车实时位置计算工具
 * 根据时刻表和路线数据，计算列车当前应处的地理位置
 */

/**
 * 解析时间字符串为分钟数（支持跨日，如 "25:30" → 1530）
 * @param {string} timeStr - 时间字符串 "HH:mm"
 * @returns {number|null} 分钟数，解析失败返回 null
 */
export function parseTimeToMinutes(timeStr) {
	if (!timeStr || timeStr === '-' || timeStr === '') return null;
	const parts = timeStr.split(':');
	if (parts.length < 2) return null;
	const hours = parseInt(parts[0], 10);
	const minutes = parseInt(parts[1], 10);
	if (isNaN(hours) || isNaN(minutes)) return null;
	return hours * 60 + minutes;
}

/**
 * 获取当前时间的分钟数（当天 00:00 起）
 * @returns {number}
 */
export function getCurrentTimeMinutes() {
	const now = new Date();
	return now.getHours() * 60 + now.getMinutes();
}

/**
 * 根据时刻表计算列车当前所在区间和进度（纯时间进度，无需 mileage）
 *
 * @param {Array} timetable - 时刻表，每项含 { station, arrive, depart }
 * @param {number} currentMinutes - 当前时间的分钟数
 * @returns {Object|null}
 *   { currentStation, nextStation, progress, status }
 *   status: 'running' | 'stopped' | 'not_departed' | 'arrived'
 */
export function calculateTrainProgress(timetable, currentMinutes) {
	if (!timetable || timetable.length < 2) return null;

	// 转换为数值格式
	const stations = timetable.map((s, i) => {
		let arriveMin = parseTimeToMinutes(s.arrive);
		let departMin = parseTimeToMinutes(s.depart);
		return {
			index: i,
			name: s.station || '',
			arriveMin,
			departMin,
		};
	});

	// 处理跨日：后站时间小于前站则加 24h
	for (let i = 1; i < stations.length; i++) {
		const prev = stations[i - 1];
		const cur = stations[i];
		if (cur.arriveMin !== null && prev.departMin !== null && cur.arriveMin < prev.departMin) {
			cur.arriveMin += 1440;
		}
		if (cur.departMin !== null && cur.arriveMin !== null && cur.departMin < cur.arriveMin) {
			cur.departMin += 1440;
		}
	}

	// 查找运行中的区间（出发 ≤ 当前 ≤ 到达下一站）
	for (let i = 0; i < stations.length - 1; i++) {
		const depart = stations[i].departMin;
		const arrive = stations[i + 1].arriveMin;
		if (depart === null || arrive === null) continue;

		if (depart <= currentMinutes && currentMinutes <= arrive) {
			const totalTime = arrive - depart;
			const elapsed = currentMinutes - depart;
			const progress = totalTime > 0 ? elapsed / totalTime : 0;
			return {
				currentStation: stations[i].name,
				nextStation: stations[i + 1].name,
				progress: Math.max(0, Math.min(1, progress)),
				status: 'running'
			};
		}
	}

	// 检查是否停靠在某站（到达 ≤ 当前 ≤ 出发）
	for (const s of stations) {
		if (s.arriveMin !== null && s.departMin !== null) {
			if (s.arriveMin <= currentMinutes && currentMinutes <= s.departMin) {
				return {
					currentStation: s.name,
					nextStation: '',
					progress: 0,
					status: 'stopped'
				};
			}
		}
	}

	// 在首站之前
	const first = stations[0];
	if (first.departMin !== null && currentMinutes < first.departMin) {
		return {
			currentStation: first.name,
			nextStation: stations[1]?.name || '',
			progress: 0,
			status: 'not_departed'
		};
	}

	// 在末站之后
	const last = stations[stations.length - 1];
	if (last.arriveMin !== null && currentMinutes > last.arriveMin) {
		return {
			currentStation: last.name,
			nextStation: '',
			progress: 1,
			status: 'arrived'
		};
	}

	return null;
}

/**
 * 根据车站名和时间进度在路线路径上插值计算坐标
 * （只依赖时刻表顺序和路径几何，不依赖 mileage）
 *
 * @param {Object} mapLines - 路线段 { "站A-站B": { index, line: [[lng,lat],...] } }
 * @param {Array} mapStations - 站点坐标 [{ "站名": [lng,lat] }]
 * @param {string} stationA - 当前车站（起点）
 * @param {string} stationB - 下一车站（终点）
 * @param {number} timeProgress - 时间进度 0~1
 * @returns {Object|null} { lng, lat }
 */
export function interpolatePositionOnRoute(mapLines, mapStations, stationA, stationB, timeProgress) {
	if (!mapLines || !stationA || !stationB) return null;

	// 1. 构建站名 → 坐标映射
	const stationCoordMap = {};
	if (mapStations) {
		mapStations.forEach(s => {
			const entries = Object.entries(s);
			if (entries.length > 0) {
				stationCoordMap[entries[0][0]] = {
					lng: entries[0][1][0],
					lat: entries[0][1][1]
				};
			}
		});
	}

	// 2. 按段 index 排序
	const segmentEntries = Object.entries(mapLines)
		.filter(([key]) => key.includes('-'))
		.sort((a, b) => a[1].index - b[1].index);

	if (segmentEntries.length === 0) return null;

	// 3. 构建平坦路径 = 站坐标嵌入段路径中
	const flatPath = [];   // [{lng, lat}]
	const stationNameAtIdx = {}; // idx → stationName

	segmentEntries.forEach(([key, segData], segIdx) => {
		const parts = key.split('-');
		const nameA = parts[0];
		const nameB = parts[1];
		const ca = stationCoordMap[nameA];
		const cb = stationCoordMap[nameB];

		if (segIdx === 0 && ca) {
			const idx = flatPath.length;
			flatPath.push({ lng: ca.lng, lat: ca.lat });
			stationNameAtIdx[idx] = nameA;
		}

		(segData.line || []).forEach(pt => {
			flatPath.push({ lng: pt[0], lat: pt[1] });
		});

		if (cb) {
			const idx = flatPath.length;
			flatPath.push({ lng: cb.lng, lat: cb.lat });
			stationNameAtIdx[idx] = nameB;
		}
	});

	if (flatPath.length < 2) return null;

	// 4. 在 flatPath 中找到 stationA 和 stationB 的索引
	let startIdx = -1;
	let endIdx = -1;
	Object.entries(stationNameAtIdx).forEach(([idxStr, name]) => {
		const idx = parseInt(idxStr);
		if (name === stationA) startIdx = idx;
		if (name === stationB) endIdx = idx;
	});

	if (startIdx === -1 || endIdx === -1) {
		return null;
	}

	// 5. 确定方向并切片
	const isReversed = startIdx > endIdx;
	const lo = Math.min(startIdx, endIdx);
	const hi = Math.max(startIdx, endIdx);
	let segmentPoints = flatPath.slice(lo, hi + 1);
	if (isReversed) {
		segmentPoints = segmentPoints.slice().reverse();
	}

	if (segmentPoints.length < 2) {
		return { lng: segmentPoints[0].lng, lat: segmentPoints[0].lat };
	}

	// 6. 沿路径计算累积距离
	let totalDistance = 0;
	const cumulativeDistances = [0];

	for (let i = 1; i < segmentPoints.length; i++) {
		const dist = Math.sqrt(
			Math.pow(segmentPoints[i].lng - segmentPoints[i - 1].lng, 2) +
			Math.pow(segmentPoints[i].lat - segmentPoints[i - 1].lat, 2)
		);
		totalDistance += dist;
		cumulativeDistances.push(totalDistance);
	}

	if (totalDistance === 0) {
		return { lng: segmentPoints[0].lng, lat: segmentPoints[0].lat };
	}

	// 7. 用 timeProgress 直接插值（等价于 server.py 的 ArcLengthInterpolator）
	const p = Math.max(0, Math.min(1, timeProgress));
	const targetDistance = totalDistance * p;

	for (let i = 0; i < cumulativeDistances.length - 1; i++) {
		if (cumulativeDistances[i] <= targetDistance && targetDistance <= cumulativeDistances[i + 1]) {
			const segD = cumulativeDistances[i + 1] - cumulativeDistances[i];
			const segP = segD > 0 ? (targetDistance - cumulativeDistances[i]) / segD : 0;
			return {
				lng: segmentPoints[i].lng + (segmentPoints[i + 1].lng - segmentPoints[i].lng) * segP,
				lat: segmentPoints[i].lat + (segmentPoints[i + 1].lat - segmentPoints[i].lat) * segP,
			};
		}
	}

	return {
		lng: segmentPoints[segmentPoints.length - 1].lng,
		lat: segmentPoints[segmentPoints.length - 1].lat
	};
}

/**
 * 便捷函数：一次计算列车当前位置坐标（纯时间进度方式）
 *
 * @param {Array} timetable - 时刻表
 * @param {Object} mapLines - 路线段数据
 * @param {Array} mapStations - 站点坐标
 * @param {number} [currentMinutes] - 当前分钟数，缺省使用系统时间
 * @returns {Object|null} { lng, lat, currentStation, nextStation, status, progress }
 */
export function getTrainPosition(timetable, mapLines, mapStations, currentMinutes) {
	const mins = currentMinutes !== undefined ? currentMinutes : getCurrentTimeMinutes();
	const prog = calculateTrainProgress(timetable, mins);
	if (!prog) {
		return null;
	}

	// 非 running 状态：直接返回车站坐标
	if (prog.status !== 'running') {
		const stationCoordMap = {};
		if (mapStations) {
			mapStations.forEach(s => {
				const entries = Object.entries(s);
				if (entries.length > 0) {
					stationCoordMap[entries[0][0]] = {
						lng: entries[0][1][0],
						lat: entries[0][1][1]
					};
				}
			});
		}
		const stationName = prog.status === 'not_departed' ? prog.currentStation
			: prog.status === 'arrived' ? timetable[timetable.length - 1].station
			: prog.currentStation;
		const coord = stationCoordMap[stationName];
		if (coord) {
			return {
				...coord,
				currentStation: prog.currentStation,
				nextStation: prog.nextStation,
				status: prog.status,
				progress: prog.progress,
			};
		}
		return null;
	}

	// running 状态：根据 stationA/stationB + timeProgress 插值
	const coord = interpolatePositionOnRoute(mapLines, mapStations,
		prog.currentStation, prog.nextStation, prog.progress);
	if (!coord) {
		return null;
	}

	return {
		...coord,
		currentStation: prog.currentStation,
		nextStation: prog.nextStation,
		status: prog.status,
		progress: prog.progress,
	};
}
