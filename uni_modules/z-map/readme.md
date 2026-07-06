# ZMap 组件使用文档
## 概述
ZMap 是一个基于 OpenLayers 的 uni-app 跨平台地图组件，支持 H5 和 App 端。提供地图初始化、中心点绘制、批量点位、几何图形绘制、GeoJSON 加载和热力图等功能。

## 安装依赖
```bash
npm install ol
```

## 组件引入
```vue
<template>
  <z-map ref="mapRef" @ready="onMapReady" />
</template>

<script setup>
import ZMap from '@/components/z-map/z-map.vue';
import { ref } from 'vue';

const mapRef = ref(null);
const onMapReady = () => {
  mapRef.value?.mapInit({
    sourceParams: { /* 瓦片源配置 */ },
    mapOptions: { /* 地图选项 */ },
    controlOptions: { /* 控件选项 */ }
  });
};
</script>
```

## Props

|属性名		|类型						|默认值	|说明																|
|:-:			|:-:						|:-:		|:-:																|
|mapHeight|Number / String|'100vh'|地图容器高度，支持数字（rpx）或字符串	|
|autoInit	|Boolean				|true		|是否自动触发 ready 事件							|

## Events
|事件名								|参数												|说明																	|
|:-:									|:-:												|:-:																	|
|ready								|-													|组件挂载完成，可在此事件中初始化地图			|
|click-point					|{ id, name, geometry, ... }|点击点位时触发，返回点位数据							|
|path-distance-change	|{ distance, unit }					|绘制线段后触发，返回距离值和单位					|
|polygon-area-change	|{ area, unit, pointCount }	|绘制多边形后触发，返回面积、单位和顶点数	|

## 地图初始化方法

### mapInit(mapConfig) 
初始化地图实例，必须在 ready 事件后调用。

#### 参数:
|参数名					|类型	|必填	|说明									|
|:-:					|:-:	|:-:	|:-:									|
|sourceParams			|Object	|是		|瓦片源配置，键为自定义名称，值为瓦片 URL	|
|mapOptions				|Object	|是		|地图视图选项								|
|mapOptions.projection	|String	|否		|坐标系，默认 'EPSG:4326'					|
|mapOptions.center		|Array	|否		|初始中心点 [lng, lat]					|
|mapOptions.zoom		|Number	|否		|初始缩放级别，默认 12						|
|controlOptions			|Object	|否		|控件配置								|
|controlOptions.zoom	|Boolean|否		|缩放控件								|

#### 示例：
```js
mapRef.value?.mapInit({
  sourceParams: {
    tdt: 'https://t0.tianditu.gov.cn/...'
  },
  mapOptions: {
    center: [118.050, 24.621],
    zoom: 12
  },
  controlOptions: {
    zoom: false,
    attribution: false
  }
});
```

## 地图中心控制方法

### mapChangeCenter({ lat, lng, projection, zoom }) 
移动地图中心点。

#### 参数：
|参数名			|类型		|必填	|说明										|
|:-:				|:-:		|:-:	|:-:										|
|lat				|Number	|是		|纬度										|
|lng				|Number	|是		|经度										|
|projection	|String	|否		|坐标系，默认 'EPSG:4326'	|
|zoom				|Number	|否		|缩放级别，默认 15				|

#### 示例：
```js
mapRef.value?.mapChangeCenter({
  lat: 24.620,
  lng: 119.055,
  zoom: 10
});
```

## 图标绘制方法

**注意**
若在App端进行使用，则需安装依赖：
```bash
npm install image-tools
```
对路径资源进行base64化处理。

### mapDrawCenterPoint(iconConfig) 
在地图中心点绘制图标。

#### 参数：
|参数名	|类型		|必填	|说明																																	|
|:-:		|:-:		|:-:	|:-:																																	|
|lng		|Number	|是		|经度																																	|
|lat		|Number	|是		|纬度																																	|
|url		|String	|是		|图标路径（H5可使用网络地址或本地相对路径，App环境下只能使用base64格式资源）	|
|scale	|Number	|否		|缩放比例，默认 0.5																											|

#### 清除：
使用`mapDrawCenterPoint('remove')`， 传入 'remove'即可 清除当前中心点图标。

#### 示例：
```js
const centerIcon = await pathToBase64('/static/z-map/nav-up.png')
zMapRef.value?.mapDrawCenterPoint({
	lng: 118.050,
	lat: 24.621,
	url: centerIcon,
	scale: 0.6
});
```
> **注意**
> 
> `H5`可直接使用静态资源路径，但若在`App`中运行则需使用`pathToBase64`转为`base64`格式，否则在真机中**不显示**图标

### mapDrawBatchIcon(listConfig)
批量绘制点位图标。

#### 参数：												
|参数名									|类型		|必填	|说明											|
|:-:										|:-:		|:-:	|:-:											|
|config									|Object	|否		|全局配置									|
|config.scale						|Number	|否		|图标缩放，默认 0.5					|
|config.enableCluster		|Boolean|否		|是否启用聚合簇，默认 false	|
|config.clusterDistance	|Number	|否		|聚合距离（像素），默认 50		|
|list										|Array	|是		|点位列表									|
|list[].lng							|Number	|是		|经度											|
|list[].lat							|Number	|是		|纬度											|
|list[].iconPath				|String	|是		|图标路径									|
|list[].id							|String	|否		|点位唯一标识								|
|list[].name						|String	|否		|点位名称									|

#### 清除：
使用`mapDrawBatchIcon('remove')`， 传入 'remove'即可 清除当前中心点图标。

#### 示例：
```js
const iconPath = await pathToBase64('/static/z-map/location.png');
const listConfig = {
	config: {
		scale: 0.5,
		enableCluster: false
	},
	list: [{
			lng: 118.051,
			lat: 24.621,
			iconPath,
			id: 'p1',
			name: '点位 1'
		},
		{
			lng: 118.052,
			lat: 24.621,
			iconPath,
			id: 'p2',
			name: '点位 2'
		},
		{
			lng: 118.053,
			lat: 24.621,
			iconPath,
			id: 'p3',
			name: '点位 3'
		},
		{
			lng: 118.054,
			lat: 24.621,
			iconPath,
			id: 'p4',
			name: '点位 4'
		},
	]
};

zMapRef.value?.mapDrawBatchIcon(listConfig);

```

## 几何图形绘制方法

### mapDrawCircle(circleConfig) 
绘制圆形标记。

#### 参数：
|参数名				|类型		|必填	|说明									|
|:-:					|:-:		|:-:	|:-:									|
|list					|Array	|是		|圆心列表							|
|list[].lng		|Number	|是		|经度									|
|list[].lat		|Number	|是		|纬度									|
|style				|Object	|否		|样式配置							|
|style.radius	|Number	|否		|半径（像素），默认 15		|
|style.fill		|String	|否		|填充色，默认 '#765BBD'	|
|style.stroke	|String	|否		|边框色，默认 '#765BBD'	|

#### 清除：
使用`mapDrawCircle('remove')`，传入 'remove' 清除所有圆形。
 
#### 示例：
```js
const circleConfig = {
	style: {
		radius: 50,
		fill: 'rgba(118, 91, 189, 0.3)',
		stroke: '#765BBD'
	},
	list: [{
			lng: 118.061,
			lat: 24.621,
			id: 'c1',
			name: '区域 1'
		},
		{
			lng: 118.072,
			lat: 24.621,
			id: 'c2',
			name: '区域 2'
		},
		{
			lng: 118.083,
			lat: 24.621,
			id: 'c3',
			name: '区域 3'
		},
	]
};

zMapRef.value?.mapDrawCircle(circleConfig);
```
 
### mapDrawPolygonPath(pathConfig) 
绘制多边形。

#### 参数：
|参数名						|类型						|必填	|说明																													|
|:-:							|:-:						|:-:	|:-:																													|
|path							|Array					|是		|顶点数组 [{ lng, lat }]																			|
|style						|Object					|否		|样式配置																											|
|style.fill				|String					|否		|填充色，默认 'rgba(37, 198, 122, 0.3)'												|
|style.stroke			|String					|否		|边框色，默认 '#28dd98'																				|
|style.width			|Number					|否		|边框宽度，默认 2																							|
|calculateArea		|Boolean				|否		|是否计算面积，默认 false																			|
|areaUnit					|String					|否		|面积单位 'm²', 'km²', 'ha', 'mu'，默认 'm²'									|
|polygonCenter		|Boolean/Object	|否		|是否自动计算中心点并移动地图，或传入自定义中心点 { lng, lat }|
|polygonCenterZoom|Number					|否		|移动中心后的缩放级别，默认 14																|

#### 清除：
使用`mapDrawPolygonPath('remove')`，传入 'remove' 清除多边形。

#### 示例：
```js
const pathConfig = {
	style: {
		fill: 'rgba(37, 198, 122, 0.3)',
		stroke: '#28dd98',
		width: 2
	},
	path: [{
			lng: 118.050,
			lat: 24.621
		},
		{
			lng: 118.083,
			lat: 24.624
		},
		{
			lng: 118.084,
			lat: 24.685
		},
		{
			lng: 118.055,
			lat: 24.686
		},
	],
	projection: 'EPSG:4326',
	calculateArea: true,
	areaUnit: 'mu',
	polygonCenter: true,
	polygonCenterZoom: 14
};

zMapRef.value?.mapDrawPolygonPath(pathConfig);
```

### mapDrawLinePath(lineConfig)
绘制线段路径。

#### 参数：
|参数名				|类型		|必填	|说明													|
|:-:					|:-:		|:-:	|:-:													|
|path					|Array	|是		|坐标数组 [[lng, lat], ...]		|
|style				|Object	|否		|样式配置											|
|style.stroke	|String	|否		|线条颜色，默认 '#d70f19'				|
|style.width	|Number	|否		|线条宽度，默认 3								|
|distanceUnit	|String	|否		|距离单位 'm' 或 'km'，默认 'm'	|

#### 清除：
使用`mapDrawLinePath('remove')`，传入 'remove' 清除线段。

#### 示例：
```js
onst lineConfig = {
	style: {
		stroke: '#6ed718',
		width: 3
	},
	path: [
		[118.055, 24.621],
		[118.056, 24.621],
		[118.057, 24.621],
		[118.058, 24.621],
		[118.059, 24.620],
		[118.059, 24.619],
		[118.055, 24.620],
	],
	distanceUnit: 'm'
};

zMapRef.value?.mapDrawLinePath(lineConfig);
```

## 数据图层方法

### mapDrawGeoJson(geoJsonConfig)
加载 GeoJSON 图层。

#### 参数：
|参数名			|类型		|必填	|说明							|
|:-:				|:-:		|:-:	|:-:							|
|geoJsonData|Object	|是		|GeoJSON 数据对象	|
|style			|Object	|否		|样式配置					|

#### 清除：
使用`mapDrawGeoJson('remove')`，传入 'remove' 清除 GeoJSON 图层。

#### 示例：
```js
import GEOJSON_XIAMEN from '@/static/geojson/xiamen.json';

const geoJsonConfig = {
	style: {
		fill: 'rgba(240, 255, 96, 0.1)',
		stroke: '#fff700',
		width: 2
	},
	geoJsonData: GEOJSON_XIAMEN
};

zMapRef.value?.mapDrawGeoJson(geoJsonConfig);
```

### mapDrawHotMap(hotMapConfig)
加载热力图。

#### 参数：
|参数名					|类型		|必填	|说明												|
|:-:				|:-:		|:-:	|:-:							|
|hotMapData			|Object	|是		|GeoJSON 格式的热力数据			|
|options				|Object	|否		|热力图选项									|
|options.blur		|Number	|否		|模糊半径，默认 10					|
|options.radius	|Number	|否		|点半径，默认 5（范围 1-50）|

#### 清除：
使用`mapDrawHotMap('remove')`，传入 'remove' 清除热力图。

#### 示例：
```js
import GEOJSON_HOTMAP from '@/static/geojson/qywz.json';

const hotMapConfig = {
	options: {
		blur: 10,
		radius: 5,
	},
	hotMapData: GEOJSON_HOTMAP
};

zMapRef.value?.mapDrawHotMap(hotMapConfig);
```

## 注意事项

0. 平台兼容性：本组件仅支持 H5 和 App 端，小程序端不可用。

2. 依赖安装：使用前必须安装 ol 依赖。

3. 瓦片服务：推荐使用天地图或其他支持跨域的瓦片服务。

4. 图标路径：本地图标建议放在 /static 目录下，直接使用相对路径。

5. 性能优化：当点位数量超过 500 时，建议启用 enableCluster 聚合簇。

## 更新日志

### v2.0.0 (2026.03.30)
- 初始版本发布