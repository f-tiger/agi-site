import {calc, num as n, count, rad, requireValue} from './common.mjs';

const eng = (id,...args) => calc('eng-'+id,...args);
const mass=n('mass','质量（千克）','Mass (kg)',10);
const area=n('area','面积（平方米）','Area (m2)',4);
const flow=n('flow','体积流量（升/秒）','Volume flow (L/s)',2);
const density=n('density','密度（千克/立方米）','Density (kg/m3)',1000);
const delta=n('delta','温差（开尔文）','Temperature difference (K)',20,0);
const efficiency=n('efficiency','效率（%）','Efficiency (%)',80,.0001,100);
const rpm=n('rpm','转速（转/分钟）','Shaft speed (rpm)',1200);
const g=9.80665;
const pi=Math.PI;
export const tools=[
  eng('sensible-heat','物料显热需求','Sensible heat requirement','按质量、比热容和温差求理想显热需求，不计相变。','Find ideal sensible heat from mass, specific heat, and temperature difference at constant phase.',
    [mass,n('cp','比热容（千焦/千克·开尔文）','Specific heat (kJ/kg K)',4.18),delta],(m,c,t)=>({heatKJ:m*c*t,heatKWh:m*c*t/3600})),
  eng('latent-heat','相变潜热需求','Phase-change heat','按发生相变的物料质量与单位质量潜热求能量。','Calculate the energy absorbed or released during a phase change at constant temperature.',
    [mass,n('latent','单位质量潜热（千焦/千克）','Specific latent heat (kJ/kg)',334)],(m,l)=>({energyKJ:m*l,energyKWh:m*l/3600})),
  eng('mix-temperature','同种液体混合温度','Equal-fluid mixing temperature','根据两股同种液体的质量与温度估算隔热混合温度。','Predict the adiabatic mixing temperature of two portions with equal specific heat and no phase change.',
    [n('massA','第一份质量（千克）','First mass (kg)',2),n('tempA','第一份温度（摄氏度）','First temperature (C)',20,-273.15,1e5),n('massB','第二份质量（千克）','Second mass (kg)',3),n('tempB','第二份温度（摄氏度）','Second temperature (C)',50,-273.15,1e5)],(a,t,b,u)=>({mixedC:(a*t+b*u)/(a+b),totalKg:a+b})),
  eng('plane-wall-loss','平壁稳态导热','Steady conduction through a wall','输入材料导热系数、厚度、面积和温差，估算一维导热功率。','Estimate one-dimensional steady heat flow through a homogeneous plane layer.',
    [n('k','导热系数（瓦/米·开尔文）','Conductivity (W/m K)',.04),n('thickness','厚度（米）','Thickness (m)',.1),area,delta],(k,d,a,t)=>({heatFlowW:k*a*t/d,resistanceKPerW:d/(k*a)})),
  eng('thermal-expansion','线性热膨胀','Linear thermal expansion','以参考长度、线膨胀系数和温变估算自由伸缩量。','Estimate free length change using a constant linear expansion coefficient.',
    [n('length','参考长度（米）','Reference length (m)',10),n('alpha','线膨胀系数（微米/米·开尔文）','Expansion coefficient (um/m K)',12,-1000,1000),n('change','带符号温变（开尔文）','Signed temperature change (K)',40,-1000,1000)],(l,a,t)=>({changeMm:l*a*t/1000,finalM:l*(1+a*t/1e6)})),
  eng('convective-transfer','表面对流换热','Surface convection heat transfer','用给定换热系数、表面积和温差估算对流换热量。','Estimate convective heat transfer for a specified film coefficient, area, and temperature difference.',
    [n('coefficient','换热系数（瓦/平方米·开尔文）','Film coefficient (W/m2 K)',10),area,delta],(h,a,t)=>({heatFlowW:h*a*t,heatFluxWPerM2:h*t})),
  eng('heat-exchanger-lmtd','换热器对数平均温差','Heat exchanger log mean difference','由两端正温差求对数平均温差，温差相等时返回该差值。','Find log mean temperature difference from two positive terminal differences in a heat exchanger.',
    [n('endA','一端温差（开尔文）','First terminal difference (K)',40),n('endB','另一端温差（开尔文）','Second terminal difference (K)',20)],(a,b)=>({lmtdK:a===b?a:(Math.abs(a-b)<b*.1?(a-b)/Math.log1p((a-b)/b):(a-b)/Math.log(a/b))})),
  eng('heat-pump-electricity','热泵电耗','Heat pump electricity use','用输出热量和给定工况下的性能系数估算耗电量。','Estimate electrical energy from useful delivered heat and the COP at the stated operating condition.',
    [n('heat','输出热量（千瓦时）','Delivered heat (kWh)',30),n('cop','性能系数','Coefficient of performance',3,.01,50)],(q,c)=>({electricityKWh:q/c})),
  eng('room-air-changes','房间换气次数','Room air changes per hour','按房间容积与新风量估算名义换气次数和一次换气时间。','Calculate nominal air changes per hour and minutes per air change from fresh airflow and room volume.',
    [n('volume','房间容积（立方米）','Room volume (m3)',120),n('air','新风量（立方米/小时）','Outdoor airflow (m3/h)',360)],(v,f)=>({changesPerHour:f/v,minutesPerChange:60*v/f})),
  eng('air-dew-point','室内空气露点估算','Indoor dew point estimate','采用 Magnus 近似，由室温与相对湿度估算水面露点。','Estimate dew point over liquid water using the Magnus approximation for common indoor conditions.',
    [n('airC','气温（摄氏度）','Air temperature (C)',22,0,50),n('rh','相对湿度（%）','Relative humidity (%)',50,1,100)],(t,h)=>{const a=17.62,b=243.12,v=Math.log(h/100)+a*t/(b+t);return {dewPointC:b*v/(a-v)};}),
  eng('hydrostatic-head','静水压力差','Hydrostatic pressure difference','使用密度、液柱高度和标准重力计算静止液体的压力差。','Calculate pressure rise with depth in a resting fluid from density and standard gravity.',
    [density,n('head','液柱高度（米）','Fluid head (m)',4)],(d,h)=>({differencePa:d*g*h,differenceKPa:d*g*h/1000})),
  eng('pump-shaft-input','泵轴功率估算','Pump shaft power estimate','按扬程、流量、密度和泵效率估算水力功率与轴输入功率。','Estimate hydraulic output and shaft input from fluid head, flow, density, and pump efficiency.',
    [n('head','总扬程（米）','Total head (m)',12),flow,density,efficiency],(h,f,d,e)=>({hydraulicW:h*f*d*g/1000,shaftInputW:h*f*d*g/(10*e)})),
  eng('pipe-flow-speed','管内平均流速','Mean speed in a pipe','给定满管体积流量和内径，估算截面积和平均流速。','Calculate the cross-section and mean flow speed of a full circular pipe.',
    [flow,n('diameter','管内径（毫米）','Inside diameter (mm)',50)],(f,d)=>{const a=pi*(d/2000)**2;return {sectionM2:a,meanMPerS:f/1000/a};}),
  eng('reynolds-pipe','圆管雷诺数','Pipe Reynolds number','用平均流速、管径和运动黏度求无量纲雷诺数。','Calculate dimensionless Reynolds number from mean velocity, inside diameter, and kinematic viscosity.',
    [n('speed','平均流速（米/秒）','Mean speed (m/s)',1),n('diameter','管内径（毫米）','Inside diameter (mm)',20),n('viscosity','运动黏度（平方毫米/秒）','Kinematic viscosity (mm2/s)',1)],(v,d,k)=>({reynolds:1000*v*d/k})),
  eng('darcy-head-loss','直管沿程损失','Straight pipe friction loss','按 Darcy 摩擦系数、管径、长度和流速求沿程水头损失。','Estimate straight-pipe head loss with the Darcy friction factor and Darcy–Weisbach equation.',
    [n('factor','Darcy 摩擦系数','Darcy friction factor',.02,.00001,1),n('length','管长（米）','Pipe length (m)',20),n('diameter','内径（米）','Inside diameter (m)',.05),n('speed','流速（米/秒）','Mean speed (m/s)',1)],(f,l,d,v)=>({headLossM:f*l/d*v*v/(2*g)})),
  eng('reservoir-time','储液罐净充填时间','Tank net filling time','给定目标增加容积、恒定流入量和流出量，计算充填用时。','Find time to add a specified volume with constant concurrent inflow and outflow.',
    [n('volume','待增加容量（升）','Volume to add (L)',600),n('inflow','流入量（升/分）','Inflow (L/min)',30),n('outflow','流出量（升/分）','Outflow (L/min)',10,0)],(v,i,o)=>{requireValue(i>o,'Inflow must exceed outflow for filling.');return {netLitresPerMinute:i-o,minutes:v/(i-o)};}),
  eng('belt-speed','传送带线速度','Conveyor belt speed','根据滚筒有效直径与转速估算无滑移带速。','Estimate no-slip belt travel speed from effective drum diameter and rotation rate.',
    [n('diameter','滚筒有效直径（毫米）','Effective drum diameter (mm)',100),rpm],(d,r)=>({metresPerMinute:pi*d*r/1000,metresPerSecond:pi*d*r/60000})),
  eng('gear-pair','单级外啮合齿轮传动','External gear pair','根据主动、从动齿数与输入转速计算传动比和输出转速。','Calculate speed ratio and output speed of one external mesh from tooth counts and drive rpm.',
    [count('driver','主动轮齿数','Driver teeth',20),count('driven','从动轮齿数','Driven teeth',60),rpm],(a,b,r)=>({reductionRatio:b/a,drivenRpm:r*a/b,oppositeDirection:true})),
  eng('rotating-shaft-power','转轴机械功率','Rotating shaft power','由轴转矩和转速计算角速度及机械输出功率。','Compute angular velocity and shaft power from rotational speed and torque.',
    [n('torque','转矩（牛·米）','Torque (N m)',10),rpm],(t,r)=>({angularRadPerS:2*pi*r/60,shaftKW:2*pi*r*t/60000})),
  eng('lead-screw-travel','丝杠行程估算','Lead screw travel','根据导程、转速及运行时间计算匀速进给距离。','Calculate steady axial feed and travel from screw lead, rotation rate, and run time.',
    [n('lead','导程（毫米/转）','Lead (mm/rev)',4),rpm,n('time','运行时间（秒）','Run time (s)',10)],(p,r,t)=>({feedMmPerMinute:p*r,travelMm:p*r*t/60})),
  eng('spring-compression','线性弹簧储能','Linear spring energy','根据弹簧刚度和弹性范围内的压缩量求力及储存能量。','Calculate force and stored energy from linear spring stiffness and compression within the elastic range.',
    [n('stiffness','刚度（牛/毫米）','Stiffness (N/mm)',5),n('travel','压缩量（毫米）','Compression (mm)',10)],(k,x)=>({forceN:k*x,energyJ:k*x*x/2000})),
  eng('center-of-mass','两点质量的平衡位置','Two-mass balance position','标记参考轴上的两个位置与质量，求平衡点。','Determine the balance coordinate of two point masses along one axis.',
    [n('massA','第一质量（千克）','First mass (kg)',2),n('xA','第一位置（米）','First position (m)',0,-1e9),n('massB','第二质量（千克）','Second mass (kg)',3),n('xB','第二位置（米）','Second position (m)',10,-1e9)],(m,x,v,y)=>({balanceM:(m*x+v*y)/(m+v),totalMassKg:m+v})),
  eng('wheel-rollout','车轮滚动里程','Wheel rollout distance','按有效滚动直径和圈数估算无滑动行程。','Estimate ground distance from measured rolling diameter and counted turns without slip.',
    [n('diameter','有效直径（毫米）','Effective diameter (mm)',700),n('turns','累计圈数','Turns',500)],(d,t)=>({rolloutPerRevM:pi*d/1000,distanceM:pi*d*t/1000})),
  eng('pendulum-period','小幅单摆周期','Small-angle pendulum period','在小幅摆动与标准重力假设下，根据摆长估算周期和频率。','Estimate the small-angle period and frequency of a simple pendulum under standard gravity.',
    [n('length','悬点到质心的距离（米）','Pivot to mass center (m)',1)],l=>{const t=2*pi*Math.sqrt(l/g);return {periodS:t,frequencyHz:1/t};}),
  eng('mass-spring-resonance','质量弹簧固有频率','Mass-spring natural frequency','估算单自由度无阻尼质量弹簧系统的固有频率与周期。','Estimate natural frequency and period of an undamped single-degree-of-freedom mass-spring system.',
    [n('stiffness','弹簧刚度（牛/米）','Spring stiffness (N/m)',1000),mass],(k,m)=>({frequencyHz:Math.sqrt(k/m)/(2*pi),periodS:2*pi*Math.sqrt(m/k)})),
  eng('sound-path-delay','声程延时','Acoustic travel delay','给定干燥空气温度和传播距离，估算声速及单程到达延时。','Estimate one-way sound travel time and speed in dry air from path length and temperature.',
    [n('path','声程（米）','Path length (m)',34),n('air','空气温度（摄氏度）','Air temperature (C)',20,-30,50)],(l,t)=>{const v=331.3+.606*t;return {speedMPerS:v,delayMs:1000*l/v};}),
  eng('combined-sound-level','非相干声源叠加','Independent sound level sum','输入在同一位置测得的两个独立声级，按能量叠加。','Sum two incoherent source levels measured at the same listening point on the same weighting scale.',
    [n('a','第一声级（分贝）','First level (dB)',60,-100,200),n('b','第二声级（分贝）','Second level (dB)',60,-100,200)],(a,b)=>({combinedDb:10*Math.log10(10**(a/10)+10**(b/10))})),
  eng('room-reverb','房间混响时间估算','Sabine reverberation estimate','由空间容积及等效吸声面积估算扩散声场下的混响时间。','Estimate Sabine RT60 in a diffuse room from volume and equivalent absorption area.',
    [n('volume','房间容积（立方米）','Room volume (m3)',200),n('absorption','等效吸声面积（平方米）','Equivalent absorption area (m2)',50)],(v,a)=>({rt60Seconds:.161*v/a})),
  eng('point-source-light','点光源工作面照度','Point-source workplane illuminance','根据光强、距离及相对法线夹角计算点光源直射照度。','Estimate direct illuminance from luminous intensity, distance, and angle to the receiving surface normal.',
    [n('intensity','发光强度（坎德拉）','Luminous intensity (cd)',500),n('distance','距离（米）','Distance (m)',2),n('angle','与法线夹角（度）','Angle to normal (deg)',0,0,90)],(i,d,a)=>({lux:a===90?0:i*Math.cos(rad(a))/(d*d)})),
  eng('mean-piston-speed','往复机构平均活塞速度','Mean piston speed','根据曲轴转速和单程行程求每转往返的平均线速度。','Estimate mean piston travel speed from full stroke and crankshaft rpm using two strokes per revolution.',
    [n('stroke','单程行程（毫米）','Full stroke (mm)',80),rpm],(s,r)=>({meanMPerS:2*s*r/60000})),
];
