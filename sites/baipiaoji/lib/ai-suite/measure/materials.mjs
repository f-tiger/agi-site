import {calc, num as n, count, requireValue, wholeItems, neededItems} from './common.mjs';

const shop=(id,...args)=>calc('material-'+id,...args);
const m=(k,z,e,v)=>n(k,z+'（米）',e+' (m)',v);
const mm=(k,z,e,v)=>n(k,z+'（毫米）',e+' (mm)',v);
const zeroMm=(k,z,e,v)=>n(k,z+'（毫米）',e+' (mm)',v,0);
const number=count('quantity','数量','Quantity',10);
const waste=n('waste','预留损耗（%）','Waste allowance (%)',10,0,100);
const area=n('area','净面积（平方米）','Net area (m2)',24);
const width=m('width','宽度','Width',4);
const length=m('length','长度','Length',6);
const height=m('height','高度','Height',2.5);
const percentYield=n('yield','可用比例（%）','Usable yield (%)',90,.01,100);
const pi=Math.PI;
export const tools=[
  shop('paint-cans','涂料桶数','Paint can order','由净涂刷面积、遍数、覆盖率和每桶容量计算用量及整桶余量。','Estimate paint volume and full cans to order using net area, coats, coverage, and can capacity.',
    [area,count('coats','涂刷遍数','Coats',2,1,100),n('coverage','每升覆盖面积（平方米）','Coverage (m2/L)',10),n('can','单桶容量（升）','Can volume (L)',5)],(a,c,k,v)=>{const need=a*c/k, cans=neededItems(need/v);return {litresNeeded:need,cans,surplusLitres:cans*v-need};}),
  shop('wallpaper-repeat','对花壁纸卷数','Pattern-repeat wallpaper rolls','按直对花重复长度向上取整每幅裁长，并计算连续墙面所需卷数。','Estimate drops and rolls for straight-match wallpaper by rounding each drop to a whole pattern repeat.',
    [m('wall','墙面总宽','Wall run',8),height,m('rollWidth','卷宽','Roll width',.53),m('rollLength','卷长','Roll length',10),m('repeat','花型重复长度','Pattern repeat',.32)],(w,h,r,l,p)=>{const cut=neededItems(h/p)*p,perRoll=wholeItems(l/cut),drops=neededItems(w/r);requireValue(perRoll>0,'One roll must contain at least one full drop.');return {cutLengthM:cut,drops,dropsPerRoll:perRoll,rolls:neededItems(drops/perRoll)};}),
  shop('floor-cartons','地板整箱采购','Flooring carton order','用净铺设面积、损耗和单箱覆盖面积计算整箱数及采购面积。','Calculate the carton count and ordered area for flooring with an explicit cutting allowance.',
    [area,waste,n('carton','每箱覆盖面积（平方米）','Coverage per carton (m2)',2.2)],(a,w,c)=>{const target=a*(1+w/100),cartons=neededItems(target/c);return {targetM2:target,cartons,orderedM2:cartons*c};}),
  shop('tile-joint-grid','瓷砖通缝网格','Tile grid with joints','按整砖尺寸和缝宽求矩形区域两个方向的整砖数和剩余宽度；不含边缘缝。','Find complete tiles per axis and remaining edge space in a rectangular area with internal joints only.',
    [mm('fieldW','区域宽','Field width',3000),mm('fieldH','区域高','Field height',2400),mm('tileW','砖宽','Tile width',300),mm('tileH','砖高','Tile height',200),zeroMm('joint','砖缝宽','Joint width',3)],(w,h,x,y,g)=>{const nx=wholeItems((w+g)/(x+g)),ny=wholeItems((h+g)/(y+g));return {columns:nx,rows:ny,fullTiles:nx*ny,remainingWidthMm:w-nx*x-Math.max(0,nx-1)*g,remainingHeightMm:h-ny*y-Math.max(0,ny-1)*g};}),
  shop('concrete-bag-yield','预拌料袋数','Bagged mix yield','按浇筑长宽厚度、损耗与厂家标注的每袋成品升数求袋数。','Estimate mix bags for a rectangular pour from its volume, allowance, and the manufacturer’s finished yield per bag.',
    [width,length,mm('thickness','厚度','Thickness',100),waste,n('bag','每袋成品体积（升）','Finished yield (L/bag)',12)],(w,l,t,a,b)=>{const v=w*l*t;return {netLitres:v,orderLitres:v*(1+a/100),bags:neededItems(v*(1+a/100)/b)};}),
  shop('loose-fill','散装填料质量','Loose-fill material weight','根据面积、目标厚度和松散堆积密度估算散料质量与体积。','Estimate loose-fill volume and mass from surface area, depth, and supplier bulk density.',
    [area,mm('depth','铺设厚度','Layer depth',50),n('density','松散堆积密度（千克/立方米）','Loose bulk density (kg/m3)',600)],(a,d,r)=>({volumeM3:a*d/1000,massKg:a*d*r/1000})),
  shop('shrinkage-fill','回填压实换算','Compacted fill delivery','给定成品压实体积和相对松方的缩减比例，计算需进场松方。','Calculate loose delivery volume from a target compacted volume and shrinkage measured against loose volume.',
    [n('target','目标压实体积（立方米）','Required compacted volume (m3)',10),n('shrink','松方到实方的缩减（%）','Volume loss from loose state (%)',20,0,99)],(v,s)=>({looseM3:v/(1-s/100),differenceM3:v/(1-s/100)-v})),
  shop('brick-coverage','砖墙按面排砖','Single-leaf brick count','用含灰缝的砖面模数、净墙面积与损耗估算单层墙面用砖数。','Estimate face bricks for a single leaf by modular face area including one mortar joint per axis.',
    [area,mm('brickW','砖面宽','Brick face length',215),mm('brickH','砖面高','Brick face height',65),zeroMm('joint','水平及竖直灰缝','Bed and perpend joint',10),waste],(a,w,h,g,l)=>{const per=1e6/((w+g)*(h+g));return {bricksPerM2:per,estimatedOrder:neededItems(a*per*(1+l/100))};}),
  shop('fence-posts','直线围栏立柱间距','Straight fence post spacing','将一段不含门洞的直围栏等分，满足最大柱距并计入两端立柱。','Divide an open straight fence without gates into equal bays under a maximum post spacing, including both ends.',
    [length,m('maxSpan','最大柱距','Maximum spacing',1.8)],(l,s)=>{const bays=neededItems(l/s);return {bays,posts:bays+1,actualSpacingM:l/bays};}),
  shop('baluster-spacing','栏杆净间隙排布','Even slat spacing','在两端保留相同间隙，给定净距上限与条宽求最少竖条数和实际净距。','Find the fewest equal-width slats that meet a chosen clear-gap maximum, including equal end gaps.',
    [mm('opening','可用净宽','Clear opening',1000),mm('slat','单条宽度','Slat width',30),mm('gap','目标最大净距','Target maximum gap',90)],(o,s,g)=>{const bars=Math.max(0,neededItems((o-g)/(s+g)));requireValue(bars*s<=o,'Slat width cannot fit this opening with the selected gap.');return {slats:bars,gaps:bars+1,actualGapMm:(o-bars*s)/(bars+1)};}),
  shop('even-shelf-holes','等距孔位','Evenly spaced hole positions','由总长、首尾孔边距与孔数求节距和中间孔位置。','Determine pitch and the middle pair of hole-center coordinates between symmetric end offsets.',
    [mm('span','构件总长','Overall span',800),zeroMm('edge','孔中心距端部','End to hole center',25),count('holes','孔数','Hole count',6,2,10000)],(l,e,c)=>{requireValue(2*e<l,'End offsets must leave a positive span.');const p=(l-2*e)/(c-1);return {pitchMm:p,firstMm:e,lastMm:l-e,middleLeftMm:e+wholeItems((c-1)/2)*p,middleRightMm:e+neededItems((c-1)/2)*p};}),
  shop('lumber-board-feet','木材板英尺','Lumber board footage','按实际厚宽（英寸）、长度（英尺）和件数计算板英尺体积。','Calculate board feet from actual inch thickness and width, linear feet, and piece count.',
    [n('thickness','厚度（英寸）','Thickness (in)',1),n('width','宽度（英寸）','Width (in)',6),n('length','长度（英尺）','Length (ft)',8),number],(t,w,l,q)=>({boardFeetPerPiece:t*w*l/12,totalBoardFeet:t*w*l*q/12})),
  shop('crosscut-stock','等长截料与锯缝','Equal crosscuts with kerf','按每个取件消耗一次锯缝的切割方式，估算每根出件、用料根数及余头。','Plan equal cutoffs when each cut piece consumes one kerf, with no end trimming allowance.',
    [mm('stock','原料长','Stock length',2400),mm('piece','所需件长','Cut length',400),zeroMm('kerf','每件锯缝','Kerf per piece',3),number],(s,p,k,q)=>{const per=wholeItems(s/(p+k));requireValue(per>0,'Stock must accommodate a piece and its kerf.');return {piecesPerStock:per,stockLengths:neededItems(q/per),remnantOnFullStockMm:s-per*(p+k)};}),
  shop('sheet-metal-mass','金属板重量','Sheet metal mass','由长宽、厚度、密度和张数求平板坯料重量。','Find the mass of flat metal blanks from plan dimensions, thickness, quantity, and material density.',
    [mm('length','板长','Sheet length',2000),mm('width','板宽','Sheet width',1000),mm('thickness','板厚','Thickness',2),n('density','密度（千克/立方米）','Density (kg/m3)',7850),number],(l,w,t,d,q)=>({perSheetKg:l*w*t*d/1e9,totalKg:l*w*t*d*q/1e9})),
  shop('bend-allowance','钣金弯曲展开','Sheet bend allowance','按弯曲转角、内半径、板厚和给定 K 因子求中性层弧长。','Calculate neutral-axis bend allowance from bend rotation, inside radius, thickness, and a supplied K factor.',
    [n('bend','弯曲转角（度）','Bend rotation (deg)',90,.001,180),mm('radius','内弯半径','Inside radius',2),mm('thickness','板厚','Thickness',1),n('k','K 因子','K factor',.4,0,1)],(a,r,t,k)=>({neutralRadiusMm:r+k*t,bendAllowanceMm:pi*a/180*(r+k*t)})),
  shop('fabric-shrink-cut','布料缩水前裁长','Fabric pre-shrink cut','按所需水洗后尺寸与经纬向单独缩水率，反推下料尺寸。','Calculate fabric cutting dimensions for a target washed size using independent warp and weft shrinkage.',
    [mm('targetW','水洗后目标宽','Finished width',800),mm('targetL','水洗后目标长','Finished length',1200),n('shrinkW','纬向缩水率（%）','Weft shrinkage (%)',2,0,90),n('shrinkL','经向缩水率（%）','Warp shrinkage (%)',5,0,90)],(w,l,a,b)=>({cutWidthMm:w/(1-a/100),cutLengthMm:l/(1-b/100)})),
  shop('curtain-fullness','窗帘褶量与幅数','Curtain fullness and drops','由轨道长度、褶量倍数和单幅可用布宽求幅数及实际饱满度。','Estimate the number of usable fabric widths and achieved fullness for one curtain track.',
    [m('track','轨道总长','Track width',3),n('fullness','褶量倍数','Fullness multiplier',2,1,10),m('fabric','每幅可用宽','Usable width per drop',1.4)],(t,f,w)=>{const c=neededItems(t*f/w);return {drops:c,targetFlatWidthM:t*f,actualFullness:c*w/t};}),
  shop('roll-remaining','卷料剩余长度','Remaining roll length','根据均匀材料厚度与卷芯、外卷直径，按紧密卷绕估算剩余长度。','Estimate remaining length of a tightly wound uniform roll from caliper, core diameter, and outer diameter.',
    [mm('outside','卷外径','Outer roll diameter',200),mm('core','卷芯外径','Core outside diameter',76),mm('caliper','单层料厚','Single-layer caliper',.1)],(o,c,t)=>{requireValue(o>=c,'Roll diameter must be at least the core diameter.');return {remainingM:pi*(o-c)*(o+c)/(4000*t)};}),
  shop('coil-winding-space','线圈单层排绕','Single-layer spool winding','给定绕线宽度、线材外径与卷芯直径，估算理想紧密单层圈数和用线长度。','Estimate whole turns and helical line length for one close-packed layer on a cylindrical core.',
    [mm('width','绕线有效宽','Usable winding width',100),mm('line','线材外径','Outside line diameter',2),mm('core','卷芯外径','Core outside diameter',50)],(w,d,c)=>{const turns=wholeItems(w/d);return {turns,lineM:turns*Math.hypot(pi*(c+d),d)/1000};}),
  shop('filament-spool','打印耗材剩余长度','3D filament spool length','由线材净重、直径与树脂密度估算剩余米数。','Estimate available filament length from net spool mass, measured diameter, and polymer density.',
    [n('mass','耗材净重（克）','Net filament mass (g)',250),mm('diameter','耗材直径','Filament diameter',1.75),n('density','密度（克/立方厘米）','Density (g/cm3)',1.24)],(m,d,r)=>({filamentM:m/(r*pi*(d/2)**2)})),
  shop('layer-height-plan','三维打印层高分配','3D print layer fit','给定模型高度、固定首层和目标最大后续层高，求等厚剩余层数和层高。','Fit a fixed first layer and equal remaining layers under a target maximum height.',
    [mm('height','模型高','Model height',20),mm('first','首层高','First layer',.3),mm('max','后续最大层高','Maximum subsequent layer',.2)],(h,f,m)=>{requireValue(f<=h,'First layer cannot exceed model height.');const c=neededItems((h-f)/m);return {totalLayers:1+c,remainingLayerHeightMm:c?(h-f)/c:0};}),
  shop('print-bead-flow','挤出体积流量','Extrusion bead throughput','以给定矩形近似截面、线宽、层高和走线速度估算打印体积流量。','Estimate volumetric throughput from a rectangular bead approximation, line width, layer height, and travel speed.',
    [mm('width','线宽','Line width',.45),mm('height','层高','Layer height',.2),n('speed','走线速度（毫米/秒）','Travel speed (mm/s)',60)],(w,h,s)=>({volumeMm3PerS:w*h*s,volumeCm3PerMinute:w*h*s*.06})),
  shop('adhesive-spread','胶黏剂铺展面积','Adhesive coverage by spread','由胶黏剂净重、目标单面涂布量和有效利用率估算可涂面积。','Find one-face coverage available from adhesive mass at a target spread and usable yield.',
    [n('mass','净重（千克）','Available mass (kg)',5),n('spread','单面涂布量（克/平方米）','Spread (g/m2)',200),percentYield],(m,s,y)=>({usableGrams:10*m*y,coverageM2:10*m*y/s})),
  shop('sealant-cartridge','密封胶接缝长度','Sealant cartridge yield','按均匀矩形接缝截面、胶筒容量与利用率估算单筒可填长度。','Estimate filled joint length from cartridge volume, rectangular joint dimensions, and available yield.',
    [n('cartridge','胶筒容量（毫升）','Cartridge volume (mL)',300),mm('width','缝宽','Joint width',10),mm('depth','缝深','Joint depth',5),percentYield],(v,w,d,y)=>({jointMetres:v*y/(100*w*d)})),
  shop('water-capture','屋顶集雨量','Roof rainwater capture','按水平投影面积、降雨深度和收集系数估算单次可收集雨量。','Estimate water collected from a rain event using horizontal catchment area and a supplied runoff coefficient.',
    [area,n('rain','降雨量（毫米）','Rainfall (mm)',20,0),n('coefficient','收集系数','Collection coefficient',.8,0,1)],(a,d,c)=>({grossLitres:a*d,collectedLitres:a*d*c})),
  shop('drip-bed','滴灌耗水与时长','Drip bed watering time','由种植床面积、目标水深、滴头流量与数量估算供水时间。','Estimate the ideal runtime to apply a target depth from the combined flow of identical emitters.',
    [area,n('depth','目标水深（毫米）','Target water depth (mm)',10),n('emitter','单滴头流量（升/小时）','Emitter flow (L/h)',2),count('emitters','滴头数','Emitter count',40)],(a,d,f,c)=>({waterLitres:a*d,totalLitresPerHour:f*c,runMinutes:60*a*d/(f*c)})),
  shop('seed-spacing','规则行列播种量','Rectangular planting grid','使用行距和株距布置长方形种植区，首行和首株各与边缘保留半间距。','Count planting positions on a rectangular grid, with the first row and plant centered half a spacing from the edge and matching clearance at the far side.',
    [width,length,m('row','行距','Row spacing',.5),m('plant','株距','In-row spacing',.25)],(w,l,r,p)=>({rows:wholeItems(w/r),plantsPerRow:wholeItems(l/p),plants:wholeItems(w/r)*wholeItems(l/p)})),
  shop('soil-planter','锥形花盆填土','Tapered planter soil volume','用圆形花盆内部上下口直径和实际装填高度计算截锥土量。','Find soil litres from the inside bottom diameter, inside diameter at the fill line, and fill height of a tapered round planter.',
    [mm('bottom','盆底内径','Inside bottom diameter',200),mm('top','装填线内径','Inside diameter at fill line',300),mm('height','装填高','Fill height',250)],(b,t,h)=>({soilLitres:pi*h*(b*b+b*t+t*t)/12e6})),
  shop('shipping-carton','单一朝向箱内装量','Carton uniform-orientation pack','尝试六种统一摆放朝向，在内箱尺寸和单件尺寸下求规则层叠最大装量。','Compare six uniform axis-aligned orientations to find the best regular packing count inside a carton.',
    [mm('boxX','箱内长','Carton inside length',600),mm('boxY','箱内宽','Carton inside width',400),mm('boxZ','箱内高','Carton inside height',300),mm('itemX','单件长','Item length',120),mm('itemY','单件宽','Item width',75),mm('itemZ','单件高','Item height',80)],(x,y,z,a,b,c)=>{
      const choices=[[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]].map(([w,h,d])=>({w,h,d,nx:wholeItems(x/w),ny:wholeItems(y/h),nz:wholeItems(z/d)}));
      const best=choices.reduce((p,v)=>v.nx*v.ny*v.nz>p.nx*p.ny*p.nz?v:p);const pieces=best.nx*best.ny*best.nz;requireValue(Number.isSafeInteger(pieces),'Carton count exceeds the supported exact integer range.');return {pieces,alongLength:best.nx,alongWidth:best.ny,layers:best.nz,utilizationPercent:100*pieces*a*b*c/(x*y*z)};}),
  shop('pallet-wrap','托盘缠绕膜估算','Pallet stretch wrap estimate','按矩形周长、缠绕高度、膜宽及搭接率计算等节距螺旋路径的近似长度。','Estimate unstretched film length for one rising helical pass around a rectangular pallet, excluding extra anchor wraps.',
    [width,length,height,m('film','膜宽','Film width',.5),n('overlap','相邻圈搭接率（%）','Wrap overlap (%)',50,0,95)],(w,l,h,f,o)=>{const p=f*(1-o/100),per=2*(w+l);const rises=Math.max(0,neededItems((h-f)/p));return {turns:1+rises,approxFilmM:per+rises*Math.hypot(per,p),coveredHeightM:f+rises*p};}),
];
