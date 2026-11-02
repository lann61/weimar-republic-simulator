# 历史地图数据

仅供历史地图页面展示，不修改模拟选区、席位分配或游戏状态。

来源：[GHDI / German Historical Institute — Interactive Map: Reichstag Elections in the Weimar Republic (1919–1933)](https://germanhistorydocs.org/en/weimar-germany-1918-1933/ghdi:map-5019)。资料设计：Gabriel Moss（MossMaps）与 Erik Jensen，2024。提取时间：2026-11-02。

从原交互地图公开提供的地理与逐区统计中提取两个事实数据集合；不包含原站脚本、叙述、界面或地图瓦片。

- `weimar-1919.geojson`：来源可用的 36 个多边形区域及 1919 年结果。
- `weimar-1920-1933.geojson`：35 个选区及 1920、1924年5月/12月、1928、1930、1932年7月/11月、1933 年结果。

保留原始边界坐标、名称和得票百分比。来源合并的 Zentrum/BVP 保持合并，不擅自拆分。少量原始统计存在数组缺项或合计口径差异，界面标注后按原值显示，不归一化、补造数据。GHDI 页面介绍的 1919 年完整行政划分为 38 区，但公开地理文件提供 36 个可绘制区域；本项目不补绘缺失区域。

本地展示使用独立编写的墨卡托投影与 SVG，修改内容为界面样式、颜色、中文地名、选举切换和无障碍交互。原数据用于教育和非商业用途，原作者权利保留；详见 [GHDI 使用说明](https://germanhistorydocs.org/en/terms)。本局全国结果投影仅是估算，和史实数据分别展示。
