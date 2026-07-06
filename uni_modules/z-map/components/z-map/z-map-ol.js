/**
 * ZMapOl - OpenLayers 地图工具类
 * @description 封装 OpenLayers 常用地图操作
 * @author DescartesZ
 * @version 2.0.0
 * @date 2026.03.30
 */

import {
	Map,
	View
} from 'ol';
import TileLayer from 'ol/layer/Tile';
import VectorSource from 'ol/source/Vector';
import {
	Vector as VectorLayer
} from 'ol/layer';
import XYZ from 'ol/source/XYZ';
import {
	defaults as defaultControls
} from 'ol/control';
import {
	transform,
	fromLonLat
} from 'ol/proj';
import {
	LineString,
	Point,
	Polygon
} from 'ol/geom';
import Feature from 'ol/Feature';
import {
	Fill,
	Stroke,
	Style,
	Icon,
	Circle,
	Text
} from 'ol/style';
import {
	Heatmap
} from 'ol/layer';
import GeoJSON from 'ol/format/GeoJSON';
import {
	Cluster
} from 'ol/source';
import {
	getLength,
	getDistance,
	getArea
} from 'ol/sphere';

/**
 * 默认配置常量
 */
export const DEFAULT_CONFIG = {
	PROJECTION: 'EPSG:4326',
	ZOOM: {
		MIN: 1,
		MAX: 18,
		DEFAULT: 12,
		CENTER_ZOOM: 15
	},
	ICON: {
		DEFAULT_SCALE: 0.5,
		BASE_ZOOM: 12,
		SCALE_MIN: 0.3,
		SCALE_MAX: 2,
		ANCHOR: [0.5, 1],
		ANCHOR_X_UNITS: 'fraction',
		ANCHOR_Y_UNITS: 'fraction'
	},
	HEATMAP: {
		BLUR: 10,
		RADIUS: 5,
		MAX_RADIUS: 50,
		MIN_RADIUS: 1
	},
	STYLE: {
		POLYGON: {
			fill: 'rgba(37, 198, 122, 0.3)',
			stroke: '#28dd98',
			width: 2
		},
		PATH: {
			stroke: '#d70f19',
			width: 3
		},
		CIRCLE: {
			radius: 15,
			fill: '#765BBD',
			stroke: '#765BBD'
		}
	}
};

/**
 * 经纬度边界常量
 */
const COORDINATE_BOUNDS = {
	LNG_MIN: -180,
	LNG_MAX: 180,
	LAT_MIN: -90,
	LAT_MAX: 90
};

export class ZMapOl {
	/**
	 * 初始化地图
	 * @param {string} mapId - 地图容器 ID
	 * @param {Object} sourceParams - 瓦片源配置
	 * @param {Object} mapOptions - 地图选项
	 * @param {Object} controlOptions - 控件选项
	 * @returns {Map|null} 地图实例
	 */
	static initMap(mapId = 'map', sourceParams = {}, mapOptions = {}, controlOptions = {}) {
		const sourceKeys = Object.keys(sourceParams);

		if (sourceKeys.length === 0) {
			console.error('[ZMapOl] 错误：缺少地图瓦片源配置');
			return null;
		}

		try {
			const layerList = sourceKeys.map((key, index) => {
				const source = new XYZ({
					url: sourceParams[key] || '',
					crossOrigin: 'anonymous'
				});
				return new TileLayer({
					title: `瓦片-${index}`,
					source: source,
				});
			});

			const map = new Map({
				controls: defaultControls({
					attribution: controlOptions.attribution ?? false,
					zoom: controlOptions.zoom ?? false,
					rotate: controlOptions.rotate ?? false,
				}),
				target: mapId,
				layers: layerList,
				view: new View({
					projection: mapOptions.projection || DEFAULT_CONFIG.PROJECTION,
					center: mapOptions.center || [118.050, 24.621],
					zoom: mapOptions.zoom ?? DEFAULT_CONFIG.ZOOM.DEFAULT,
					minZoom: mapOptions.minZoom ?? DEFAULT_CONFIG.ZOOM.MIN,
					maxZoom: mapOptions.maxZoom ?? DEFAULT_CONFIG.ZOOM.MAX,
					enableRotation: mapOptions.enableRotation ?? false,
				}),
			});

			return map;
		} catch (err) {
			console.error('[ZMapOl] 初始化地图失败:', err);
			return null;
		}
	}

	/**
	 * 移动地图中心
	 * @param {Map} map - 地图实例
	 * @param {Object} params - 坐标参数
	 * @param {number} params.lng - 经度
	 * @param {number} params.lat - 纬度
	 * @param {string} params.projection - 坐标系
	 * @param {number} zoom - 缩放级别
	 * @returns {boolean}
	 */
	static changeCenter(map, {
		lng,
		lat,
		projection = DEFAULT_CONFIG.PROJECTION
	}, zoom = DEFAULT_CONFIG.ZOOM.CENTER_ZOOM) {
		if (!map) {
			console.error('[ZMapOl] 错误：地图实例不存在');
			return false;
		}

		if (!this.isValidCoordinate(lng, lat)) {
			return false;
		}

		try {
			const view = map.getView();
			view.setZoom(zoom);
			view.setCenter([Number(lng), Number(lat)]);
			map.render();
			return true;
		} catch (err) {
			console.error('[ZMapOl] 设置中心点失败:', err);
			return false;
		}
	}

	/**
	 * 验证坐标有效性
	 * @param {number} lng - 经度
	 * @param {number} lat - 纬度
	 * @returns {boolean}
	 */
	static isValidCoordinate(lng, lat) {
		if (lng == null || lat == null) {
			console.error('[ZMapOl] 错误：经纬度不能为空');
			return false;
		}

		const numLng = Number(lng);
		const numLat = Number(lat);

		if (isNaN(numLng) || isNaN(numLat)) {
			console.error('[ZMapOl] 错误：经纬度必须是有效数字');
			return false;
		}

		if (numLng < COORDINATE_BOUNDS.LNG_MIN || numLng > COORDINATE_BOUNDS.LNG_MAX) {
			console.error(`[ZMapOl] 错误：经度超出有效范围 [-180, 180]，当前值: ${numLng}`);
			return false;
		}

		if (numLat < COORDINATE_BOUNDS.LAT_MIN || numLat > COORDINATE_BOUNDS.LAT_MAX) {
			console.error(`[ZMapOl] 错误：纬度超出有效范围 [-90, 90]，当前值: ${numLat}`);
			return false;
		}

		return true;
	}

	/**
	 * 绘制图标
	 * @param {Map} map - 地图实例
	 * @param {Object} config - 图标配置
	 * @returns {Object|null}
	 */
	static drawIcon(map, {
		lng,
		lat,
		url,
		scale = DEFAULT_CONFIG.ICON.DEFAULT_SCALE
	} = {}) {
		if (!map) {
			console.error('[ZMapOl] 错误：地图实例不存在');
			return null;
		}

		if (!this.isValidCoordinate(lng, lat)) {
			return null;
		}

		if (!url) {
			console.error('[ZMapOl] 错误：图标 URL 不能为空');
			return null;
		}

		try {
			const vectorSource = new VectorSource();
			const iconLayer = new VectorLayer({
				source: vectorSource
			});
			map.addLayer(iconLayer);

			const iconFeature = new Feature({
				geometry: new Point([Number(lng), Number(lat)]),
			});

			iconFeature.setStyle(
				new Style({
					image: new Icon({
						src: url,
						scale: scale,
						anchor: DEFAULT_CONFIG.ICON.ANCHOR,
						anchorXUnits: DEFAULT_CONFIG.ICON.ANCHOR_X_UNITS,
						anchorYUnits: DEFAULT_CONFIG.ICON.ANCHOR_Y_UNITS,
						crossOrigin: 'anonymous',
					}),
				})
			);

			vectorSource.addFeature(iconFeature);
			map.render();

			return {
				iconLayer,
				iconFeature
			};
		} catch (err) {
			console.error('[ZMapOl] 绘制图标失败:', err);
			return null;
		}
	}

	/**
	 * 修改图标位置
	 * @param {Feature} feature - 图标要素
	 * @param {Array} location - 坐标数组
	 */
	static changeIconLocation(feature, location = []) {
		if (!feature || !Array.isArray(location) || location.length < 2) {
			console.error('[ZMapOl] 错误：参数无效');
			return;
		}

		try {
			const geometry = new Point(location);
			feature.setGeometry(geometry);
		} catch (err) {
			console.error('[ZMapOl] 修改图标位置失败:', err);
		}
	}

	/**
	 * 批量绘制图标
	 * @param {Map} map - 地图实例
	 * @param {Array} pointList - 点位列表
	 * @param {Object} options - 配置选项
	 * @returns {Object|null}
	 */
	static drawBatchIcon(map, pointList = [], options = {}) {
		if (!map) {
			console.error('[ZMapOl] 错误：地图实例不存在');
			return null;
		}

		if (!Array.isArray(pointList) || pointList.length === 0) {
			console.error('[ZMapOl] 错误：点位列表为空');
			return null;
		}

		try {
			const {
				scale = DEFAULT_CONFIG.ICON.DEFAULT_SCALE,
					enableCluster = false,
					clusterDistance = 50,
					anchor = DEFAULT_CONFIG.ICON.ANCHOR,
			} = options;

			const iconList = [];

			pointList.forEach((point, index) => {
				if (!this.isValidCoordinate(point.lng, point.lat)) {
					console.warn(`[ZMapOl] 警告：第 ${index} 个点位坐标无效，已跳过`);
					return;
				}

				if (!point.iconPath) {
					console.warn(`[ZMapOl] 警告：第 ${index} 个点位缺少图标路径，已跳过`);
					return;
				}

				const iconFeature = new Feature({
					name: point.name || '',
					id: point.id || `point-${index}`,
					geometry: new Point([Number(point.lng), Number(point.lat)]),
				});

				iconFeature.setStyle(
					new Style({
						image: new Icon({
							src: point.iconPath,
							scale: scale,
							anchor: anchor,
							anchorXUnits: DEFAULT_CONFIG.ICON.ANCHOR_X_UNITS,
							anchorYUnits: DEFAULT_CONFIG.ICON.ANCHOR_Y_UNITS,
							crossOrigin: 'anonymous',
						}),
					})
				);

				iconList.push(iconFeature);
			});

			if (iconList.length === 0) {
				console.error('[ZMapOl] 错误：没有有效的图标数据');
				return null;
			}

			const vectorSource = new VectorSource({
				features: iconList
			});
			let finalSource = vectorSource;

			if (enableCluster) {
				finalSource = new Cluster({
					distance: clusterDistance,
					source: vectorSource,
				});
			}

			const iconLayer = new VectorLayer({
				source: finalSource,
				renderBuffer: 200,
			});

			map.addLayer(iconLayer);
			map.render();

			return {
				iconLayer,
				iconList,
				vectorSource,
				clusterSource: enableCluster ? finalSource : null,
			};
		} catch (err) {
			console.error('[ZMapOl] 批量绘制图标失败:', err);
			return null;
		}
	}

	/**
	 * 绘制圆形
	 * @param {Map} map - 地图实例
	 * @param {Array} pointList - 圆心列表
	 * @param {Object} style - 样式配置
	 * @returns {Object|null}
	 */
	static drawCircle(map, pointList, style = {}) {
		if (!map) {
			console.error('[ZMapOl] 错误：地图实例不存在');
			return null;
		}

		if (!Array.isArray(pointList) || pointList.length === 0) {
			console.error('[ZMapOl] 错误：圆心列表为空');
			return null;
		}

		try {
			const circleList = pointList.map((point, index) => {
				return new Feature({
					geometry: new Point([Number(point.lng), Number(point.lat)]),
					id: point.id || `circle-${index}`,
					name: point.name || `Circle-${index}`,
					pointFill: point.fill || style.fill || DEFAULT_CONFIG.STYLE.CIRCLE.fill,
					pointRadius: point.radius || style.radius || DEFAULT_CONFIG.STYLE.CIRCLE.radius,
					pointStroke: point.stroke || style.stroke || DEFAULT_CONFIG.STYLE.CIRCLE.stroke
				});
			});

			const source = new VectorSource({
				features: circleList
			});

			const {
				radius = DEFAULT_CONFIG.STYLE.CIRCLE.radius,
					fill = DEFAULT_CONFIG.STYLE.CIRCLE.fill,
					stroke = DEFAULT_CONFIG.STYLE.CIRCLE.stroke,
					showLabel = false,
					zIndex = 0
			} = style;

			// 使用样式函数，为每个要素单独设置样式（支持文字标签）
			const circleLayer = new VectorLayer({
				source: source,
				style: function(feature) {
					const name = feature.get('name');
					const fFill = feature.get('pointFill');
					const fRadius = feature.get('pointRadius');
					const fStroke = feature.get('pointStroke');
					const styles = [
						new Style({
							image: new Circle({
								radius: fRadius,
								fill: new Fill({
									color: fFill
								}),
								stroke: new Stroke({
									color: fStroke,
									width: 2
								})
							})
						})
					];
					if (showLabel && name) {
						styles.push(
							new Style({
								text: new Text({
									text: name,
									font: '12px sans-serif',
									fill: new Fill({ color: '#333' }),
									stroke: new Stroke({ color: '#fff', width: 3 }),
									offsetY: -fRadius - 6,
									minResolution: 500
								})
							})
						);
					}
					return styles;
				}
			});

			circleLayer.setZIndex(zIndex);
			map.addLayer(circleLayer);
			map.render();

			return {
				circleLayer,
				circleList
			};
		} catch (err) {
			console.error('[ZMapOl] 绘制圆形失败:', err);
			return null;
		}
	}

	/**
	 * 绘制多边形区域
	 * @param {Map} map - 地图实例
	 * @param {Array} path - 路径点数组
	 * @param {Object} style - 样式配置
	 * @param {string} projection - 坐标系
	 * @returns {VectorLayer|null}
	 */
	static drawArea(map, path, style, projection = DEFAULT_CONFIG.PROJECTION) {
		if (!map) {
			console.error('[ZMapOl] 错误：地图实例不存在');
			return null;
		}

		if (!Array.isArray(path) || path.length < 3) {
			console.error('[ZMapOl] 错误：多边形至少需要 3 个顶点');
			return null;
		}

		try {
			const finalPath = path.map(p => fromLonLat([Number(p.lng), Number(p.lat)], projection));

			const styleOpt = {
				fill: style?.fill || DEFAULT_CONFIG.STYLE.POLYGON.fill,
				stroke: style?.stroke || DEFAULT_CONFIG.STYLE.POLYGON.stroke,
				width: style?.width || DEFAULT_CONFIG.STYLE.POLYGON.width
			};

			const polygon = new Polygon([finalPath]);
			const polygonFeature = new Feature({
				geometry: polygon
			});
			const source = new VectorSource({
				features: [polygonFeature]
			});

			const geoLayer = new VectorLayer({
				source: source,
				style: this.getStyle(styleOpt),
			});

			map.addLayer(geoLayer);
			map.render();

			return geoLayer;
		} catch (err) {
			console.error('[ZMapOl] 绘制多边形失败:', err);
			return null;
		}
	}

	/**
	 * 绘制路径
	 * @param {Map} map - 地图实例
	 * @param {Array} line - 路径坐标数组
	 * @param {Object} style - 样式配置
	 * @param {string} projection - 坐标系
	 * @returns {Object|null}
	 */
	static drawPath(map, line, style, projection = DEFAULT_CONFIG.PROJECTION) {
		if (!map) {
			console.error('[ZMapOl] 错误：地图实例不存在');
			return null;
		}

		if (!Array.isArray(line) || line.length < 2) {
			console.error('[ZMapOl] 错误：路径至少需要 2 个点');
			return null;
		}

		try {
			// 统一坐标转换
			let coordinates = line;
			if (projection !== DEFAULT_CONFIG.PROJECTION) {
				coordinates = line.map(coord => transform(coord, projection, DEFAULT_CONFIG.PROJECTION));
			}

			const styleOpt = {
				stroke: style?.stroke || DEFAULT_CONFIG.STYLE.PATH.stroke,
				width: style?.width || DEFAULT_CONFIG.STYLE.PATH.width
			};

			const lineString = new LineString(coordinates);
			const pathFeature = new Feature(lineString);
			const source = new VectorSource({
				features: [pathFeature]
			});

			const pathLayer = new VectorLayer({
				source: source,
				style: this.getStyle(styleOpt)
			});

			map.addLayer(pathLayer);
			map.render();

			return {
				pathLayer,
				lineString
			};
		} catch (err) {
			console.error('[ZMapOl] 绘制路径失败:', err);
			return null;
		}
	}

	/**
	 * 计算路径长度（使用球面距离）
	 * @param {LineString} lineString - 路径对象
	 * @param {string} unit - 单位 ('m' | 'km')
	 * @param {string} projection - 坐标系
	 * @returns {number|null}
	 */
	static computedPathLength(lineString, unit = 'm', projection = DEFAULT_CONFIG.PROJECTION) {
		if (!lineString) {
			console.error('[ZMapOl] 错误：路径数据不存在');
			return null;
		}

		try {
			const length = getLength(lineString, {
				projection: projection,
			});

			switch (unit.toLowerCase()) {
				case 'm':
					return Math.round(length);
				case 'km':
					return Math.round(length / 1000 * 100) / 100;
				default:
					return Math.round(length);
			}
		} catch (err) {
			console.error('[ZMapOl] 计算路径长度失败:', err);
			return null;
		}
	}

	/**
	 * 计算多边形面积（使用球面面积）
	 * @param {Polygon} polygon - 多边形几何对象
	 * @param {string} unit - 单位 ('m²' | 'km²' | 'mu' | 'ha')
	 * @param {string} projection - 坐标系
	 * @returns {number|null}
	 */
	static computedPolygonArea(polygon, unit = 'm²', projection = DEFAULT_CONFIG.PROJECTION) {
		if (!polygon) {
			console.error('[ZMapOl] 错误：多边形数据不存在');
			return null;
		}

		try {
			const area = getArea(polygon, {
				projection: projection,
			});

			switch (unit.toLowerCase()) {
				case 'm²':
				case 'm2':
				case 'sqm':
					return Math.round(area);
				case 'km²':
				case 'km2':
				case 'sqkm':
					return Math.round(area / 1000000 * 100) / 100;
				case 'ha':
				case 'hectare':
					return Math.round(area / 10000 * 100) / 100;
				case 'mu':
				case '亩':
					return Math.round(area / 666.667 * 100) / 100;
				default:
					return Math.round(area);
			}
		} catch (err) {
			console.error('[ZMapOl] 计算多边形面积失败:', err);
			return null;
		}
	}

	/**
	 * 计算两点之间的距离
	 * @param {Array} coord1 - 第一个坐标
	 * @param {Array} coord2 - 第二个坐标
	 * @returns {number}
	 */
	static getDistanceBetweenPoints(coord1, coord2) {
		try {
			return getDistance(coord1, coord2);
		} catch (err) {
			console.error('[ZMapOl] 计算两点距离失败:', err);
			return 0;
		}
	}

	/**
	 * 添加 GeoJSON 图层
	 * @param {Map} map - 地图实例
	 * @param {Object} geojson - GeoJSON 数据
	 * @param {Object} styleOpt - 样式配置
	 * @returns {VectorLayer|null}
	 */
	static addGeoJsonLayer(map, geojson, styleOpt = {}) {
		if (!map) {
			console.error('[ZMapOl] 错误：地图实例不存在');
			return null;
		}

		if (!geojson) {
			console.error('[ZMapOl] 错误：GeoJSON 数据不能为空');
			return null;
		}

		try {
			let features;
			if (typeof geojson === 'object' && geojson.type === 'FeatureCollection') {
				features = new GeoJSON().readFeatures(geojson);
			} else {
				console.error('[ZMapOl] 错误：GeoJSON 数据格式不正确');
				return null;
			}

			const source = new VectorSource({
				features: features
			});

			const layer = new VectorLayer({
				source,
				style: this.getStyle(styleOpt)
			});

			map.addLayer(layer);
			map.render();

			return layer;
		} catch (err) {
			console.error('[ZMapOl] 添加 GeoJSON 图层失败:', err);
			return null;
		}
	}

	/**
	 * 添加热力图图层
	 * @param {Map} map - 地图实例
	 * @param {Object} geojson - 热力图数据（GeoJSON）
	 * @param {Object} hotmapOpt - 热力图选项
	 * @returns {Heatmap|null}
	 */
	static addHotmapLayer(map, geojson, hotmapOpt = {}) {
		if (!map) {
			console.error('[ZMapOl] 错误：地图实例不存在');
			return null;
		}

		if (!geojson) {
			console.error('[ZMapOl] 错误：热力图数据不能为空');
			return null;
		}

		try {
			let features;
			if (typeof geojson === 'object' && geojson.type === 'FeatureCollection') {
				const featureCount = geojson.features?.length || 0;
				if (featureCount > 10000) {
					console.warn(`[ZMapOl] 热力图数据量较大(${featureCount}个要素)，可能影响性能`);
				}
				features = new GeoJSON().readFeatures(geojson);
			} else {
				console.error('[ZMapOl] 错误：热力图数据格式不正确，需要 GeoJSON FeatureCollection');
				return null;
			}

			const source = new VectorSource({
				features: features,
			});

			const blur = Math.max(0, hotmapOpt.blur ?? DEFAULT_CONFIG.HEATMAP.BLUR);
			const radius = Math.max(
				DEFAULT_CONFIG.HEATMAP.MIN_RADIUS,
				Math.min(DEFAULT_CONFIG.HEATMAP.MAX_RADIUS, hotmapOpt.radius ?? DEFAULT_CONFIG.HEATMAP.RADIUS)
			);

			const hotmapLayer = new Heatmap({
				source: source,
				blur: blur,
				radius: radius,
			});

			map.addLayer(hotmapLayer);
			map.render();

			return hotmapLayer;
		} catch (err) {
			console.error('[ZMapOl] 添加热力图失败:', err);
			return null;
		}
	}

	/**
	 * 获取通用样式
	 * @param {Object} options - 样式选项
	 * @returns {Style|null}
	 */
	static getStyle({
		fill = 'rgba(255, 255, 255, 0.5)',
		stroke = '#319FD3',
		width = 2,
		radius = 5
	} = {}) {
		try {
			return new Style({
				fill: new Fill({
					color: fill
				}),
				stroke: new Stroke({
					color: stroke,
					width
				}),
				image: new Circle({
					radius,
					fill: new Fill({
						color: stroke
					})
				})
			});
		} catch (err) {
			console.error('[ZMapOl] 创建样式失败:', err);
			return null;
		}
	}

	/**
	 * 坐标转换：经纬度转墨卡托
	 * @param {Array} coord - 坐标
	 * @returns {Array}
	 */
	static lonLat2Mercator(coord) {
		return transform(coord, 'EPSG:4326', 'EPSG:3857');
	}

	/**
	 * 坐标转换：墨卡托转经纬度
	 * @param {Array} coord - 坐标
	 * @returns {Array}
	 */
	static mercator2LonLat(coord) {
		return transform(coord, 'EPSG:3857', 'EPSG:4326');
	}

	/**
	 * 缩放到要素范围
	 * @param {Map} map - 地图实例
	 * @param {Array} features - 要素数组
	 * @param {number} maxZoom - 最大缩放级别
	 * @returns {boolean}
	 */
	static zoomToFeatures(map, features, maxZoom = 16) {
		if (!map || !features || features.length === 0) {
			console.error('[ZMapOl] 错误：参数无效');
			return false;
		}

		try {
			const source = new VectorSource({
				features
			});
			map.getView().fit(source.getExtent(), {
				maxZoom,
				padding: [20, 20, 20, 20]
			});
			map.render();
			return true;
		} catch (err) {
			console.error('[ZMapOl] 缩放到要素失败:', err);
			return false;
		}
	}

	/**
	 * 计算坐标数组的几何中心
	 * @param {Array} coords - 坐标数组
	 * @returns {Object|null}
	 */
	static calculateCenter(coords) {
		if (!Array.isArray(coords) || coords.length === 0) {
			console.error('[ZMapOl] 错误：坐标数组不能为空');
			return null;
		}

		try {
			let sumLng = 0;
			let sumLat = 0;
			let validCount = 0;

			for (const coord of coords) {
				if (typeof coord.lng === 'number' && typeof coord.lat === 'number') {
					sumLng += coord.lng;
					sumLat += coord.lat;
					validCount++;
				}
			}

			if (validCount === 0) {
				console.error('[ZMapOl] 错误：没有有效的坐标数据');
				return null;
			}

			return {
				lng: sumLng / validCount,
				lat: sumLat / validCount
			};
		} catch (err) {
			console.error('[ZMapOl] 计算中心点失败:', err);
			return null;
		}
	}
}

export {
	ZMapOl as zMapOl
};