/**
 * 坐标转换工具：WGS84 / GCJ02(火星坐标) / BD09(百度坐标) 互转
 */

const PI = Math.PI
const X_PI = (PI * 3000.0) / 180.0
const A = 6378245.0
const EE = 0.00669342162296594323
const EPSILON = 1e-9
const MAX_ITERATIONS = 10

/** 判断坐标是否在中国境外，境外不做偏移 */
function outOfChina(lng, lat) {
  if (lng < 72.004 || lng > 137.8347) return true
  if (lat < 0.8293 || lat > 55.8271) return true
  return false
}

/** 纬度偏移量计算 */
function transformLat(lng, lat) {
  let ret =
    -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

/** 经度偏移量计算 */
function transformLng(lng, lat) {
  let ret =
    300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/** 计算 WGS84→GCJ02 的偏移量 */
function delta(lng, lat) {
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI)
  return { dLng, dLat }
}

/** WGS84 → GCJ02（火星坐标） */
function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) return { lng, lat }
  const d = delta(lng, lat)
  return { lng: lng + d.dLng, lat: lat + d.dLat }
}

/** GCJ02（火星坐标）→ WGS84，迭代法逆转换 */
function gcj02ToWgs84(lng, lat) {
  if (outOfChina(lng, lat)) return { lng, lat }

  let wgsLng = lng
  let wgsLat = lat

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const gcj = wgs84ToGcj02(wgsLng, wgsLat)

    const errorLng = lng - gcj.lng
    const errorLat = lat - gcj.lat

    wgsLng += errorLng
    wgsLat += errorLat

    if (Math.abs(errorLng) < EPSILON && Math.abs(errorLat) < EPSILON) {
      break
    }
  }

  return { lng: wgsLng, lat: wgsLat }
}

/** GCJ02（火星坐标）→ BD09（百度坐标） */
function gcj02ToBd09(lng, lat) {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI)
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI)
  return {
    lng: z * Math.cos(theta) + 0.0065,
    lat: z * Math.sin(theta) + 0.006
  }
}

/** BD09（百度坐标）→ GCJ02（火星坐标） */
function bd09ToGcj02(lng, lat) {
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI)
  return {
    lng: z * Math.cos(theta),
    lat: z * Math.sin(theta)
  }
}

/** WGS84 → BD09（百度坐标） */
function wgs84ToBd09(lng, lat) {
  const gcj = wgs84ToGcj02(lng, lat)
  return gcj02ToBd09(gcj.lng, gcj.lat)
}

/** BD09（百度坐标）→ WGS84 */
function bd09ToWgs84(lng, lat) {
  const gcj = bd09ToGcj02(lng, lat)
  return gcj02ToWgs84(gcj.lng, gcj.lat)
}

// 导出（兼容 Node.js 和浏览器）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    wgs84ToGcj02, gcj02ToWgs84,
    gcj02ToBd09, bd09ToGcj02,
    wgs84ToBd09, bd09ToWgs84
  }
}
export { wgs84ToGcj02, gcj02ToWgs84, gcj02ToBd09, bd09ToGcj02, wgs84ToBd09, bd09ToWgs84 };
