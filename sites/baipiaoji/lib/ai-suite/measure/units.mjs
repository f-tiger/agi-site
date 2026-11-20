import {requireValue} from './common.mjs';

// Factors map one unit to the dimension's base unit. Temperature includes offsets.
const dimensions = [
  ['length','长度','Length','排版、图纸或行程用的长度','design, drawing, and travel lengths',{m:1,mm:.001,cm:.01,km:1000,in:.0254,ft:.3048,yd:.9144,mi:1609.344,nmi:1852},'ft',6],
  ['area','面积','Area','图纸尺寸和土地面积','drawing and land areas',{m2:1,cm2:1e-4,mm2:1e-6,km2:1e6,ft2:.09290304,in2:.00064516,ha:10000,acre:4046.8564224},'ha',2],
  ['capacity','容积','Liquid volume','公制容积和美制液体量','metric and US liquid volumes',{L:1,mL:.001,m3:1000,ft3:28.316846592,USgal:3.785411784,USflOz:.0295735295625,impGal:4.54609},'USgal',3],
  ['mass','质量','Mass','包裹、配方和物料质量','parcel, recipe, and material masses',{kg:1,g:.001,mg:1e-6,t:1000,lb:.45359237,oz:.028349523125},'lb',8],
  ['duration','时长','Duration','固定长度的时间间隔','fixed-length time intervals',{s:1,ms:.001,us:1e-6,min:60,h:3600,d:86400,wk:604800},'h',2],
  ['speed','速度','Speed','地面速度与航海速度','ground and nautical speeds',{'m/s':1,'km/h':1/3.6,mph:.44704,kn:1852/3600,'ft/s':.3048},'mph',30],
  ['acceleration','加速度','Acceleration','运动传感器的加速度','motion sensor acceleration',{'m/s2':1,'cm/s2':.01,'ft/s2':.3048,g0:9.80665,Gal:.01},'g0',2],
  ['temperature','绝对温标','Temperature','摄氏、华氏、开尔文和兰氏温标','Celsius, Fahrenheit, Kelvin, and Rankine readings',{K:[1,0],degC:[1,273.15],degF:[5/9,459.67*5/9],degR:[5/9,0]},'degC',25],
  ['temperature-gap','温差','Temperature interval','两个温度之差及升降温幅度','temperature differences and changes',{deltaK:1,deltaC:1,deltaF:5/9,deltaR:5/9},'deltaF',18],
  ['angle','平面角','Plane angle','角度、弧度和角分秒','degrees, radians, and arcminutes or arcseconds',{deg:1,rad:180/Math.PI,turn:360,grad:.9,arcmin:1/60,arcsec:1/3600},'deg',90],
  ['pressure','压力','Pressure','表压或绝压读数，保持同一参考零点','pressure readings sharing one reference zero',{Pa:1,kPa:1000,MPa:1e6,bar:1e5,mbar:100,atm:101325,psi:6894.757293168,Torr:101325/760},'bar',1],
  ['force','力','Force','测力计读数和工程单位','force gauge readings in engineering units',{N:1,kN:1000,mN:.001,lbf:4.4482216152605,kgf:9.80665,dyn:1e-5},'lbf',12],
  ['torque','转矩','Torque','旋转设备的转矩','rotating equipment torque',{'N.m':1,'N.cm':.01,'lbf.ft':1.3558179483314,'lbf.in':.1129848290276,'kgf.cm':.0980665},'N.m',5],
  ['energy','能量','Energy','耗电、机械功和热量','electrical usage, work, and heat',{J:1,kJ:1000,MJ:1e6,Wh:3600,kWh:3600000,cal_th:4.184,kcal_th:4184,Btu_IT:1055.05585262},'kWh',1],
  ['power','功率','Power','电器和机械额定功率','appliance and mechanical power ratings',{W:1,kW:1000,mW:.001,MW:1e6,hp_mech:745.699871582,PS:735.49875,'Btu_IT/h':.2930710701722},'kW',2],
  ['frequency','频率','Frequency','循环频率与每分钟周期数','cycle frequency and cycles per minute',{Hz:1,kHz:1000,MHz:1e6,GHz:1e9,mHz:.001,rpm:1/60},'kHz',48],
  ['density','密度','Density','流体和固体的质量密度','mass densities of liquids and solids',{'kg/m3':1,'g/cm3':1000,'g/L':1,'lb/ft3':16.01846337396,'lb/USgal':119.826427317},'g/cm3',2.7],
  ['volume-flow','体积流量','Volume flow','管道和通风设备的体积流量','liquid and ventilation flow rates',{'m3/s':1,'m3/h':1/3600,'L/s':.001,'L/min':.001/60,cfm:.028316846592/60,'USgal/min':.003785411784/60},'L/min',60],
  ['mass-flow','质量流量','Mass flow','送料和流体输送的质量流量','material feed and fluid mass flow rates',{'kg/s':1,'kg/h':1/3600,'g/s':.001,'g/min':.001/60,'t/h':1000/3600,'lb/min':.45359237/60},'kg/h',360],
  ['dynamic-viscosity','动力黏度','Dynamic viscosity','流体材料表中的动力黏度','dynamic viscosity in fluid datasheets',{'Pa.s':1,'mPa.s':.001,cP:.001,P:.1,'lb/(ft.s)':.45359237/.3048},'cP',12],
  ['kinematic-viscosity','运动黏度','Kinematic viscosity','流体材料表中的运动黏度','kinematic viscosity in fluid datasheets',{'m2/s':1,'mm2/s':1e-6,cSt:1e-6,St:.0001,'ft2/s':.09290304},'cSt',32],
  ['electrical-charge','电荷','Electrical charge','安时、电池容量和库仑','ampere-hours, battery charge, and coulombs',{C:1,mC:.001,uC:1e-6,Ah:3600,mAh:3.6},'mAh',2500],
  ['magnetic-flux','磁通量','Magnetic flux','线圈和仪表的磁通量','coil and instrument magnetic flux',{Wb:1,mWb:.001,uWb:1e-6,Mx:1e-8},'mWb',5],
  ['flux-density','磁通密度','Magnetic flux density','探头测得的磁通密度','magnetic flux density from field probes',{T:1,mT:.001,uT:1e-6,nT:1e-9,G:1e-4},'uT',45],
  ['illuminance','照度','Illuminance','工作面的入射光照度','incident light on work surfaces',{lx:1,klx:1000,fc:1/.09290304,phot:10000},'fc',50],
  ['luminance','亮度','Luminance','屏幕或发光表面的亮度','screen and emitting surface luminance',{'cd/m2':1,'kcd/m2':1000,stilb:10000,lambert:10000/Math.PI,'ft-L':1/(Math.PI*.09290304)},'ft-L',16],
  ['information','数字存储量','Digital storage','十进制与二进制存储容量','decimal and binary storage sizes',{B:1,bit:.125,kB:1000,MB:1e6,GB:1e9,TB:1e12,KiB:1024,MiB:1048576,GiB:1073741824,TiB:1099511627776},'GiB',4],
  ['data-rate','数据传输率','Data rate','网络速率和每秒字节数','network bit rates and byte throughput',{'bit/s':1,'kbit/s':1000,'Mbit/s':1e6,'Gbit/s':1e9,'MB/s':8e6,'MiB/s':8388608},'Mbit/s',100],
  ['typographic-size','排印尺寸','Typographic size','CSS 绝对长度、印刷点和派卡','CSS absolute lengths, PostScript points, and picas',{in:1,mm:1/25.4,pt:1/72,pc:1/6,cssPx:1/96},'pt',12],
  ['paper-grammage','纸张定量','Paper grammage','纸张和织物的单位面积质量','paper and fabric mass per area',{'g/m2':1,'kg/m2':1000,'oz/yd2':28.349523125/.83612736,'lb/1000ft2':453.59237/92.90304},'g/m2',120],
];

export const tools = dimensions.map(([id, zh, en, zhUse, enUse, units, unit, value]) => {
  const options = Object.keys(units).join(', ');
  const signed = ['temperature','temperature-gap','angle','acceleration','pressure','force','torque','electrical-charge','magnetic-flux','flux-density'].includes(id);
  return {
    id:'units-'+id, title:{zh:zh+'单位换算',en:en+' unit converter'},
    description:{zh:'换算'+zhUse+'。输入单位可选 '+options+'，一次返回全部对应数值。',en:'Convert '+enUse+'. Enter one of '+options+' to return the equivalent value in every listed unit.'},
    inputs:[{key:'value',label:{zh:'输入数值',en:'Input value'},type:'number',min:signed?-1e12:0,max:1e12},
      {key:'unit',label:{zh:'输入单位（'+options+'）',en:'Input unit ('+options+')'},type:'string',maxLength:32}],
    example:{value,unit},
    run({value,unit}) {
      requireValue(Number.isFinite(value) && Math.abs(value)<=1e12 && (signed||value>=0), 'Value is outside the supported range.');
      requireValue(typeof unit==='string' && Object.hasOwn(units, unit), 'Use one of the listed unit symbols with matching case.');
      const scale = Array.isArray(units[unit]) ? units[unit] : [units[unit],0];
      const base = value*scale[0]+scale[1];
      requireValue(id!=='temperature' || base>=-1e-10,'Temperature must be at or above absolute zero.');
      const equivalents = Object.fromEntries(Object.entries(units).map(([name, factor]) => {
        const [ratio, offset] = Array.isArray(factor)?factor:[factor,0];
        return [name, Number(((base-offset)/ratio).toPrecision(12))];
      }));
      return {inputUnit:unit, equivalents};
    },
  };
});
