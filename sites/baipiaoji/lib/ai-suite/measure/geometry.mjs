import {calc, count, num, posLength as length, rad, deg, requireValue} from './common.mjs';

const pi = Math.PI;
const radius = length('radius','半径','Radius',3);
const side = length('side','边长','Side',4);
const height = length('height','垂直高度','Perpendicular height',6);
const width = length('width','宽','Width',4);
const depth = length('depth','深','Depth',3);
const base = length('base','底边','Base',5);
const outer = length('outerRadius','外半径','Outer radius',5);
const inner = length('innerRadius','内半径','Inner radius',3);
const arcAngle = num('angle','圆心角（度）','Central angle (deg)',60,1e-6,360);
const geo = (id,...args) => calc('geom-'+id,...args);
const axes = [length('a','半长轴','Semi-major axis',5),length('b','半短轴','Semi-minor axis',3)];
const orderedAxes = (a,b) => requireValue(a>=b,'The semi-major axis must be at least the semi-minor axis.');
const checkRadii = (o,i) => requireValue(o>i,'Outer radius must exceed inner radius.');
export const tools = [
  geo('triangle-three-sides','三边求三角形','Triangle from three sides','输入三条边，以海伦公式求面积、内切圆半径和周长。','Use Heron’s formula to find area, inradius, and perimeter from three side lengths.',
    [length('a','第一边','First side',3),length('b','第二边','Second side',4),length('c','第三边','Third side',5)],(a,b,c)=>{
      const [x,y,z]=[a,b,c].sort((m,n)=>n-m);
      requireValue(z>x-y,'These sides must satisfy the strict triangle inequality.');
      const area=Math.sqrt((x+(y+z))*(z-(x-y))*(z+(x-y))*(x+(y-z)))/4;
      return {areaM2:area,perimeterM:a+b+c,inradiusM:2*area/(a+b+c)};
    }),
  geo('right-triangle','直角三角形放样','Right triangle layout','由两条直角边计算斜边、锐角和面积。','Find the hypotenuse, acute angles, and area for two perpendicular legs.',
    [width,height],(w,h)=>({hypotenuseM:Math.hypot(w,h),angleToWidthDeg:deg(Math.atan2(h,w)),angleToHeightDeg:deg(Math.atan2(w,h)),areaM2:w*h/2})),
  geo('triangle-sas','两边夹角求三角形','Triangle from two sides and angle','输入两边及夹角，用余弦定理求第三边与面积。','Compute the included-angle triangle’s third side and enclosed area.',
    [side,base,num('angle','夹角（度）','Included angle (deg)',60,1e-6,179.999999)],(a,b,v)=>({oppositeSideM:Math.hypot(a-b*Math.cos(rad(v)),b*Math.sin(rad(v))),areaM2:a*b*Math.sin(rad(v))/2})),
  geo('trapezoid','梯形地块面积','Trapezoidal plot','输入两条平行边与垂直间距，计算地块中位线和面积。','Find the midline and area of a plot from parallel edges and their perpendicular separation.',
    [base,length('top','上底','Other parallel edge',3),height],(b,t,h)=>({midlineM:(b+t)/2,areaM2:h*(b+t)/2})),
  geo('rhombus','菱形对角线放样','Rhombus diagonal layout','由两条对角线计算菱形边长、面积和周长。','Calculate the side, area, and perimeter of a rhombus from its diagonals.',
    [length('p','对角线一','First diagonal',8),length('q','对角线二','Second diagonal',6)],(p,q)=>({sideM:Math.hypot(p,q)/2,areaM2:p*q/2,perimeterM:2*Math.hypot(p,q)})),
  geo('regular-polygon','正多边形尺寸','Regular polygon dimensions','给定边数和边长，求边心距、外接圆半径和面积。','Calculate apothem, circumradius, and area from a regular polygon’s side count and length.',
    [count('sides','边数','Sides',6,3,10000),side],(n,s)=>({apothemM:s/(2*Math.tan(pi/n)),circumradiusM:s/(2*Math.sin(pi/n)),areaM2:n*s*s/(4*Math.tan(pi/n))})),
  geo('circular-sector','圆形扇区放样','Circular sector layout','由半径与扫过的角度计算弧长和扇区面积。','Measure arc length and sector area from radius and swept angle.',
    [radius,arcAngle],(r,a)=>({arcM:r*rad(a),areaM2:r*r*rad(a)/2})),
  geo('circle-segment','圆弓形的弓高与面积','Circular segment dimensions','根据半径和圆心角计算弦长、弓高与弓形面积。','Calculate chord, sagitta, and circular segment area for the specified sweep.',
    [radius,arcAngle],(r,a)=>{const t=rad(a);const small=t<.001?t**3/6-t**5/120:t-Math.sin(t);
      return {chordM:a===360?0:2*r*Math.sin(t/2),sagittaM:2*r*Math.sin(t/4)**2,segmentAreaM2:r*r*small/2};}),
  geo('chord-radius','由弦长和弓高还原圆','Circle from chord and rise','输入拱的弦长和弓高，反算半径及圆心角。','Recover a circular arch’s radius and central angle from chord and rise.',
    [length('chord','弦长','Chord',8),length('rise','弓高','Sagitta',2)],(c,h)=>({radiusM:c*c/(8*h)+h/2,centralAngleDeg:4*deg(Math.atan2(2*h,c))})),
  geo('annulus','圆环截面','Annular cross-section','用内外半径计算圆环面积、壁厚与两条边界的总长度。','Compute material area, radial thickness, and total boundary length of an annulus.',
    [outer,inner],(o,i)=>{checkRadii(o,i);return {areaM2:pi*(o-i)*(o+i),thicknessM:o-i,boundaryM:2*pi*(o+i)};}),
  geo('ellipse','椭圆面积与周长估计','Ellipse area and perimeter estimate','由半轴求面积、焦距与拉马努金近似周长。','Compute area, focal separation, and Ramanujan’s approximate perimeter from the semi-axes.',
    axes,(a,b)=>{orderedAxes(a,b);const h=((a-b)/(a+b))**2;return {areaM2:pi*a*b,focalSeparationM:2*Math.sqrt((a-b)*(a+b)),approxPerimeterM:pi*(a+b)*(1+3*h/(10+Math.sqrt(4-3*h)))};}),
  geo('stadium','跑道形轮廓','Stadium outline','计算两段直边加两端半圆形成的轮廓周长和面积。','Calculate the area and perimeter of two semicircles joined by parallel straight sides.',
    [length('straight','一条直边长度','Length of one straight side',8),radius],(l,r)=>({perimeterM:2*l+2*pi*r,areaM2:2*r*l+pi*r*r,overallLengthM:l+2*r})),
  geo('cuboid','长方体展开尺寸','Rectangular box geometry','用长、宽、高求表面积、体积和体对角线。','Find surface area, volume, and body diagonal of a rectangular box.',
    [width,depth,height],(w,d,h)=>({volumeM3:w*d*h,surfaceM2:2*(w*d+d*h+h*w),diagonalM:Math.hypot(w,d,h)})),
  geo('cylinder','封闭圆柱尺寸','Closed cylinder geometry','由半径与高度计算侧面、总表面和体积。','Calculate lateral area, total closed area, and volume for a right circular cylinder.',
    [radius,height],(r,h)=>({lateralM2:2*pi*r*h,surfaceM2:2*pi*r*(h+r),volumeM3:pi*r*r*h})),
  geo('cone','直圆锥放样','Right cone pattern','由底半径与高计算母线、展开扇形角和圆锥体积。','Find slant height, sector angle of the flat pattern, and volume for a right cone.',
    [radius,height],(r,h)=>{const slant=Math.hypot(r,h);return {slantM:slant,patternAngleDeg:360*r/slant,volumeM3:pi*r*r*h/3};}),
  geo('conical-frustum','截锥容器体积','Truncated cone capacity','由两端半径及高求圆台容积和侧面积。','Find the capacity and lateral surface area of a conical frustum from its end radii and height.',
    [outer,inner,height],(o,i,h)=>{checkRadii(o,i);return {volumeM3:pi*h*(o*o+o*i+i*i)/3,lateralM2:pi*(o+i)*Math.hypot(h,o-i)};}),
  geo('sphere','球体尺寸','Sphere dimensions','由球体半径求表面积、大圆周长和体积。','Calculate volume, surface area, and great-circle circumference of a sphere.',
    [radius],r=>({volumeM3:4*pi*r**3/3,surfaceM2:4*pi*r*r,greatCircleM:2*pi*r})),
  geo('spherical-cap','球冠尺寸','Spherical cap dimensions','由球半径和截取高度求球冠曲面面积、底半径与容积。','Compute curved area, base radius, and volume from sphere radius and cap height.',
    [radius,length('cap','球冠高','Cap height',2)],(r,h)=>{requireValue(h<=2*r,'Cap height must not exceed the sphere diameter.');return {curvedAreaM2:2*pi*r*h,baseRadiusM:Math.sqrt(h*(2*r-h)),volumeM3:pi*h*h*(r-h/3)};}),
  geo('ring-torus','圆环体尺寸','Ring torus geometry','输入管中心线半径与管半径，求无自交圆环体体积和表面积。','Calculate solid volume and exterior area of a ring torus from its major and tube radii.',
    [length('major','中心线半径','Major radius',5),length('tube','管半径','Tube radius',1)],(R,r)=>{checkRadii(R,r);return {volumeM3:2*pi*pi*R*r*r,surfaceM2:4*pi*pi*R*r};}),
  geo('ellipsoid','三轴椭球体积','Triaxial ellipsoid volume','输入三条半轴，求体积及穿过中心的三个主截面面积。','Find ellipsoid volume and areas of all three central principal sections from its semi-axes.',
    [length('a','第一半轴','First semi-axis',5),length('b','第二半轴','Second semi-axis',4),length('c','第三半轴','Third semi-axis',3)],(a,b,c)=>({volumeM3:4*pi*a*b*c/3,sectionABM2:pi*a*b,sectionBCM2:pi*b*c,sectionACM2:pi*a*c})),
  geo('square-pyramid','正四棱锥尺寸','Square pyramid geometry','由正方形底边和垂高计算斜高、侧面积及体积。','Calculate face slant height, side area, and volume of a right square pyramid.',
    [side,height],(s,h)=>{const slant=Math.hypot(h,s/2);return {slantHeightM:slant,lateralAreaM2:2*s*slant,volumeM3:s*s*h/3};}),
  geo('hex-prism','六角柱尺寸','Hexagonal prism geometry','由正六边形底边和高计算对边距、侧面积及体积。','Find width across flats, lateral area, and volume of a regular hexagonal prism.',
    [side,height],(s,h)=>({acrossFlatsM:Math.sqrt(3)*s,lateralM2:6*s*h,volumeM3:1.5*Math.sqrt(3)*s*s*h})),
  geo('horizontal-tank','卧式圆筒部分充液','Part-filled horizontal tank','由筒长、半径和液深计算平端卧式圆筒的液体体积。','Calculate liquid volume in a level, flat-ended cylindrical tank at a specified fill depth.',
    [radius,length('length','筒长','Cylinder length',8),num('fill','液深（米）','Fill depth (m)',2,0)],(r,l,h)=>{
      requireValue(h<=2*r,'Fill depth must not exceed the diameter.');
      const t=4*Math.asin(Math.sqrt(h/(2*r)));
      const area=r*r*(t<.001?t**3/6-t**5/120:t-Math.sin(t))/2;
      return {filledM3:area*l,capacityM3:pi*r*r*l,filledPercent:100*area/(pi*r*r)};
    }),
  geo('pipe-shell','空心圆管用料','Hollow pipe material volume','输入内外半径和管长，求圆管材料体积及内部空间。','Calculate material volume and internal space of a cylindrical pipe from its two radii and length.',
    [outer,inner,length('length','管长','Pipe length',7)],(o,i,l)=>{checkRadii(o,i);return {materialM3:pi*(o-i)*(o+i)*l,internalM3:pi*i*i*l};}),
  geo('ramp-grade','坡面标注','Ramp grade and angle','用水平距离和高差换算坡度百分比、斜长和倾角。','Calculate signed grade, slope length, and incline from horizontal run and elevation change.',
    [length('run','水平距离','Horizontal run',20),num('rise','高差（米）','Vertical change (m)',2,-1e9)],(x,y)=>({gradePercent:100*y/x,slopeM:Math.hypot(x,y),inclineDeg:deg(Math.atan2(y,x))})),
  geo('map-scale','地图比例尺距离','Map scale distance','根据比例尺分母和图上量距求实地直线距离。','Convert a measured map length into ground distance using the scale denominator.',
    [num('mapCm','图上长度（厘米）','Map length (cm)',4),num('denominator','比例尺分母','Scale denominator',25000,1,1e9)],(m,d)=>({groundM:m*d/100,groundKm:m*d/100000})),
  geo('plan-bearing','平面坐标方位角','Plan bearing from offsets','以北为零顺时针测量，求东西、南北偏移对应的方位角和距离。','Find clockwise bearing from north and distance for signed east and north displacement.',
    [num('east','向东偏移（米）','East displacement (m)',3,-1e9),num('north','向北偏移（米）','North displacement (m)',4,-1e9)],(e,n)=>{requireValue(e!==0||n!==0,'A bearing needs nonzero displacement.');return {bearingDeg:(deg(Math.atan2(e,n))+360)%360,distanceM:Math.hypot(e,n)};}),
  geo('helix','螺旋线展开长度','Helix developed length','由半径、螺距和圈数求螺旋线总长、轴向长度及螺旋角。','Calculate helix length, axial travel, and lead angle from radius, pitch, and turns.',
    [radius,length('pitch','每圈轴向螺距','Axial pitch per turn',.4),num('turns','圈数','Turns',8)],(r,p,n)=>({lengthM:n*Math.hypot(2*pi*r,p),axialM:n*p,leadAngleDeg:deg(Math.atan2(p,2*pi*r))})),
  geo('circle-tangents','圆外点切线','Circle tangent from an outside point','由点心距离和半径计算切线长度及两切线夹角。','Find tangent length and the angle between two tangents from an external point.',
    [radius,length('distance','点到圆心距离','Distance to center',5)],(r,d)=>{requireValue(d>r,'Point must lie outside the circle.');return {tangentM:Math.sqrt((d-r)*(d+r)),betweenTangentsDeg:2*deg(Math.asin(r/d))};}),
  geo('offset-fillet','两直边之间的圆角','Fillet between two edges','由两边内角及圆角半径求切点退距、圆心距离和圆角弧长。','Calculate tangent setbacks, center offset, and arc length for a fillet inside a corner.',
    [radius,num('interior','内角（度）','Interior angle (deg)',90,.001,179.999)],(r,a)=>({setbackM:r/Math.tan(rad(a)/2),centerFromVertexM:r/Math.sin(rad(a)/2),arcM:r*rad(180-a)})),
];
