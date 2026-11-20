import {calc, num as n, count, deg, requireValue, wholeItems, neededItems} from './common.mjs';

const design=(id,...args)=>calc('design-'+id,...args);
const mm=(key,zh,en,sample)=>n(key,zh+'（毫米）',en+' (mm)',sample);
const trimW=mm('width','裁切宽度','Trim width',210);
const trimH=mm('height','裁切高度','Trim height',297);
const pixelW=count('pixelsWide','像素宽度','Width (px)',3600,1,1000000);
const pixelH=count('pixelsHigh','像素高度','Height (px)',2400,1,1000000);
const pages=count('pages','正文页数','Interior pages',96);
const ppi=n('ppi','采样密度（像素/英寸）','Sampling density (px/in)',300,.1,100000);
const focal=mm('focal','实际焦距','Actual focal length',50);
const aperture=n('fNumber','光圈值','F-number',8,.1,512);
const fps=n('fps','播放帧率（帧/秒）','Playback frame rate (fps)',24,.001,1000000);
const nonnegativeMm=(key,zh,en,sample)=>n(key,zh+'（毫米）',en+' (mm)',sample,0);
export const tools=[
  design('printable-size','图像可印尺寸','Printable image dimensions','给定像素尺寸和目标输出密度，求无需重采样的印刷尺寸。','Find physical print dimensions from raster size at a target pixel density without resampling.',
    [pixelW,pixelH,ppi],(w,h,p)=>({widthMm:w/p*25.4,heightMm:h/p*25.4})),
  design('scan-raster','扫描档像素预算','Scan raster dimensions','根据原稿宽高和扫描密度求所需像素，向上取整覆盖全稿。','Calculate the pixel dimensions needed to cover an original at the selected scanning resolution.',
    [trimW,trimH,ppi],(w,h,p)=>{const x=neededItems(w*p/25.4),y=neededItems(h*p/25.4);return {widthPx:x,heightPx:y,megapixels:x*y/1e6};}),
  design('effective-ppi','排版图片有效分辨率','Placed image effective PPI','根据原图像素与实际排版宽高计算两个方向的有效分辨率。','Check effective horizontal and vertical densities after placing an image at its final physical size.',
    [pixelW,pixelH,trimW,trimH],(px,py,w,h)=>({horizontalPpi:px*25.4/w,verticalPpi:py*25.4/h})),
  design('bleed-canvas','出血画板尺寸','Trim and bleed canvas','由裁切尺寸和四周等宽出血量求交付画板及裁切偏移。','Build delivery canvas dimensions and trim offsets from a uniform bleed allowance.',
    [trimW,trimH,nonnegativeMm('bleed','每边出血','Bleed per edge',3)],(w,h,b)=>({canvasWidthMm:w+2*b,canvasHeightMm:h+2*b,trimOffsetMm:b})),
  design('book-wrap','平装书封展开','Perfect-bound cover spread','按正文页数、单张纸厚和封面尺寸求书脊厚度及未加出血的封面展开尺寸。','Estimate spine thickness and the spread of a softcover using leaf caliper, page count, and trim size before bleed.',
    [trimW,trimH,pages,mm('caliper','单张内页纸厚','Interior leaf caliper',.1)],(w,h,p,c)=>{const s=neededItems(p/2)*c;return {spineMm:s,coverSpreadWidthMm:2*w+s,coverHeightMm:h};}),
  design('sheet-imposition','单张纸规则拼版','Regular sheet imposition','计入拼版间隙，比较两个统一方向的矩形网格可排多少件。','Compare single-orientation rectangular sheet layouts in both rotations with equal gutters.',
    [mm('sheetW','可用纸宽','Usable sheet width',450),mm('sheetH','可用纸高','Usable sheet height',320),mm('itemW','单件成品宽','Piece width',90),mm('itemH','单件成品高','Piece height',55),nonnegativeMm('gap','件间距','Gutter',3)],(w,h,x,y,g)=>{
      const a=wholeItems((w+g)/(x+g))*wholeItems((h+g)/(y+g)),b=wholeItems((w+g)/(y+g))*wholeItems((h+g)/(x+g));requireValue(Number.isSafeInteger(Math.max(a,b)),'Sheet count exceeds the supported exact integer range.');return {uprightPieces:a,rotatedPieces:b,bestRegularGrid:Math.max(a,b)};}),
  design('saddle-folio','骑马订对页页码','Saddle-stitch folio pairs','输入总页数和从外到内的纸张序号，返回左右两面的拼版页码；补页标为空白。','Return front and back printer’s pairs for the chosen folded sheet counted from the outside; padded pages are blank.',
    [pages,count('sheet','由外向内的纸张序号','Sheet number from outside',2)],(p,s)=>{const total=neededItems(p/4)*4;requireValue(s<=total/4,'Sheet number is outside this booklet.');
      const label=v=>v>p?'blank':v;return {frontLeft:label(total-2*(s-1)),frontRight:label(2*s-1),backLeft:label(2*s),backRight:label(total-2*s+1)};}),
  design('signature-count','折帖与补白页','Signature and blank-page count','根据每帖容量把正文分成整帖，列出补白和最终总页数。','Plan full equal-sized signatures and identify the blank pages required at the end.',
    [pages,count('signature','每帖页数（4 的倍数）','Pages per signature (multiple of 4)',16,4,256)],(p,s)=>{requireValue(s%4===0,'Use a signature size divisible by four.');const n=neededItems(p/s);return {signatures:n,blankPages:n*s-p,totalPrintedPages:n*s};}),
  design('poster-tiles','分幅海报拼接','Tiled poster coverage','给定海报、有效打印幅面和搭接宽度，求行列数及各边覆盖范围。','Calculate tile rows, columns, and coverage for an assembled poster with overlapping printable sheets.',
    [mm('posterW','海报宽','Poster width',800),mm('posterH','海报高','Poster height',500),mm('sheetW','单张有效宽','Printable width',200),mm('sheetH','单张有效高','Printable height',280),nonnegativeMm('overlap','搭接宽度','Overlap',10)],(w,h,x,y,o)=>{
      requireValue(o<Math.min(x,y),'Overlap must be smaller than either sheet dimension.');
      const a=Math.max(1,neededItems((w-o)/(x-o))),b=Math.max(1,neededItems((h-o)/(y-o)));return {columns:a,rows:b,sheets:a*b,coverageWidthMm:a*x-(a-1)*o,coverageHeightMm:b*y-(b-1)*o};}),
  design('copy-scale','复印缩放适配','Photocopier fit percentage','从原稿和目标可用幅面求等比缩放百分比及四边留白。','Compute the uniform photocopier zoom and equal margins to fit an original on the available sheet.',
    [mm('sourceW','原稿宽','Original width',210),mm('sourceH','原稿高','Original height',297),mm('targetW','可用宽','Available width',145),mm('targetH','可用高','Available height',200)],(w,h,x,y)=>{const s=Math.min(x/w,y/h);return {zoomPercent:s*100,sideMarginMm:(x-w*s)/2,topMarginMm:(y-h*s)/2};}),
  design('stock-batch-weight','印刷纸张批次重量','Print stock batch weight','由纸张尺寸、定量和张数估算裸纸质量。','Estimate bare stock weight from sheet dimensions, grammage, and sheet quantity.',
    [trimW,trimH,n('grammage','纸张定量（克/平方米）','Grammage (g/m2)',100),count('sheets','张数','Sheet count',500)],(w,h,g,q)=>({gramsPerSheet:w*h*g/1e6,batchKg:w*h*g*q/1e9})),
  design('halftone-levels','网屏灰阶数估算','Halftone tonal levels','由设备点分辨率和加网线数估算传统方形网穴的灰阶数。','Estimate available gray levels for a simple square halftone cell using device dots and screen ruling.',
    [n('dpi','输出分辨率（点/英寸）','Recorder resolution (dpi)',2400,1,100000),n('lpi','加网线数（线/英寸）','Screen ruling (lpi)',150,1,10000)],(d,l)=>{requireValue(d>=l,'Device resolution must cover the screen ruling.');const cell=wholeItems(d/l);return {wholeDotsPerCellEdge:cell,idealGrayLevels:1+cell*cell};}),
  design('bitmap-working-memory','无压缩位图内存','Raw bitmap working memory','按像素、通道数和通道位深估算紧密存储的原始位图大小。','Estimate packed, uncompressed bitmap storage from pixel dimensions, channel count, and bits per channel.',
    [pixelW,pixelH,count('channels','通道数','Channels',4,1,16),count('bits','每通道位数','Bits per channel',8,1,64)],(w,h,c,b)=>{const bytes=neededItems(w*h*c*b/8);return {packedBytes:bytes,mebibytes:bytes/1048576};}),
  design('display-pixel-pitch','屏幕像素间距','Display pixel pitch','由对角线长度和像素分辨率估算方形像素间距及面板像素密度。','Estimate square-pixel pitch and display density from diagonal inches and native resolution.',
    [pixelW,pixelH,n('diagonal','屏幕对角线（英寸）','Display diagonal (in)',27)],(w,h,d)=>{const p=Math.hypot(w,h)/d;return {pixelsPerInch:p,pixelPitchMm:25.4/p};}),
  design('column-grid','版面分栏宽度','Editorial column grid','输入版心边界、左右边距、栏距和栏数，求单栏宽及网格总宽。','Find the column width for a page with asymmetric margins and equal intercolumn gutters.',
    [trimW,nonnegativeMm('left','左边距','Left margin',15),nonnegativeMm('right','右边距','Right margin',15),count('columns','栏数','Column count',3,1,1000),nonnegativeMm('gutter','栏距','Gutter',6)],(w,l,r,c,g)=>{const net=w-l-r-(c-1)*g;requireValue(net>0,'Margins and gutters leave no column space.');return {columnMm:net/c,gridWidthMm:w-l-r};}),
  design('baseline-grid','基线网格行数','Baseline grid fit','由版心高度、首条基线距顶偏移和行距求能容纳的基线数。','Find how many baselines fit after the first baseline offset with a fixed leading interval.',
    [mm('live','版心高度','Text area height',200),nonnegativeMm('offset','首基线距顶','First baseline offset',5),mm('leading','行距','Leading',4)],(h,o,l)=>{requireValue(o<=h,'First baseline must fit the text area.');const rows=1+wholeItems((h-o)/l);return {baselines:rows,lastBaselineMm:o+(rows-1)*l,spaceBelowLastMm:h-o-(rows-1)*l};}),
  design('modular-type-scale','模数字号阶梯','Modular type scale step','按基准字号、比例和有符号级数求当前及相邻字号。','Compute a type size and adjacent sizes at a signed step of a modular ratio scale.',
    [n('base','基准字号（点）','Base type size (pt)',12),n('ratio','字号公比','Scale ratio',1.25,1.001,4),count('step','有符号级数','Signed scale step',2,-20,20)],(b,r,s)=>({sizePt:b*r**s,previousPt:b*r**(s-1),nextPt:b*r**(s+1)})),
  design('tracking-width','字距调整的宽度变化','Tracking width change','按字符间隔数、字号和千分之一 em 的字距值求排版宽度变化。','Calculate the added or removed line width for a tracking change in thousandths of an em.',
    [count('glyphs','字形数','Glyph count',20),n('size','字号（点）','Type size (pt)',12),n('tracking','字距调整（千分之一 em）','Tracking (1/1000 em)',25,-1000,1000)],(c,s,t)=>({intervals:c-1,widthChangePt:(c-1)*s*t/1000,widthChangeMm:(c-1)*s*t/1000*25.4/72})),
  design('camera-angle-of-view','镜头视场角','Rectilinear camera field of view','给定传感器宽高与实际焦距，估算无畸变直线投影镜头的横、纵和对角视场。','Find horizontal, vertical, and diagonal angle of view of a rectilinear lens at infinity focus.',
    [mm('sensorW','传感器宽','Sensor width',36),mm('sensorH','传感器高','Sensor height',24),focal],(w,h,f)=>({horizontalDeg:2*deg(Math.atan(w/(2*f))),verticalDeg:2*deg(Math.atan(h/(2*f))),diagonalDeg:2*deg(Math.atan(Math.hypot(w,h)/(2*f)))})),
  design('lens-depth-range','镜头景深范围','Lens depth-of-field range','按薄透镜近似和指定弥散圈求前后清晰界限；远界超出无穷时标记为无界。','Estimate near and far acceptable focus points from focal length, f-number, focus distance, and circle of confusion.',
    [focal,aperture,n('focus','对焦距离（米）','Focus distance (m)',3),mm('coc','容许弥散圈直径','Circle of confusion',.03)],(f,N,s,c)=>{
      const u=s*1000;requireValue(u>f,'Focus distance must exceed focal length.');const h=f*f/(N*c),d=u-f;
      return {nearM:h*s/(h+d),farM:d>=h?null:h*s/(h-d),farIsInfinite:d>=h,hyperfocalM:(h+f)/1000};}),
  design('macro-image-scale','微距视野尺寸','Macro subject field','按镜头实际放大倍率和传感器尺寸求可纳入画面的实物范围。','Calculate object-space frame dimensions at the given optical reproduction ratio.',
    [mm('sensorW','传感器宽','Sensor width',36),mm('sensorH','传感器高','Sensor height',24),n('magnification','成像放大倍率','Optical magnification',2)],(w,h,m)=>({subjectWidthMm:w/m,subjectHeightMm:h/m})),
  design('photo-exposure-value','摄影曝光值','Photographic exposure value','由光圈、快门秒数和 ISO 感光度求相机设置曝光值与 ISO 100 等效场景值。','Find the camera setting EV and ISO-100 equivalent scene EV from aperture, exposure time, and ISO.',
    [aperture,n('seconds','曝光时间（秒）','Exposure time (s)',.008),n('iso','感光度 ISO','ISO speed',200,1,1e7)],(N,t,i)=>({settingEv:Math.log2(N*N/t),sceneEv100:Math.log2(N*N/t*100/i)})),
  design('neutral-density-exposure','中灰镜曝光换算','Neutral-density filter exposure','由无滤镜曝光时间和中灰镜挡数估算等曝光快门时间。','Calculate compensated exposure time and transmittance for a neutral-density filter rated in stops.',
    [n('seconds','无滤镜曝光（秒）','Unfiltered exposure (s)',.01),n('stops','减光挡数','Filter stops',6,0,30)],(t,s)=>({filteredSeconds:t*2**s,transmittedPercent:100/2**s})),
  design('timelapse-interval','延时摄影间隔','Timelapse frame interval','给定拍摄跨度、播放时长和帧率，求包含首尾两帧的采样间隔。','Plan evenly spaced exposures spanning both endpoints from capture duration and intended playback length.',
    [n('capture','拍摄跨度（秒）','Capture span (s)',3600),n('play','播放时长（秒）','Playback duration (s)',10),fps],(c,p,f)=>{const frames=Math.round(p*f);requireValue(frames>=2 && Number.isSafeInteger(frames),'Use a duration corresponding to at least two supported frames.');return {frames,intervalSeconds:c/(frames-1),actualPlaybackSeconds:frames/f};}),
  design('shutter-angle','视频快门角与曝光时间','Cinema shutter angle exposure','根据快门开启角和帧率求各帧曝光时间及倒数快门。','Calculate each frame’s exposure duration and reciprocal shutter setting from shutter angle and frame rate.',
    [n('angle','快门开启角（度）','Shutter angle (deg)',180,.001,360),fps],(a,f)=>({exposureSeconds:a/(360*f),reciprocalShutter:360*f/a})),
  design('panorama-frames','全景分幅数量','Panorama shot count','由目标扫角、每帧有效视场与重叠率求覆盖所需最少张数。','Find the minimum number of frames for an open panorama sweep with a specified angular overlap.',
    [n('sweep','目标扫角（度）','Target sweep (deg)',180,.1,360),n('field','单张水平视角（度）','Horizontal field (deg)',60,.1,179),n('overlap','目标重叠率（%）','Overlap (%)',30,0,99)],(s,f,o)=>{const step=f*(1-o/100);const frames=1+neededItems(Math.max(0,s-f)/step);return {frames,stepDeg:step,coveredDeg:f+(frames-1)*step};}),
  design('diffraction-disk','衍射光斑尺寸','Diffraction spot diameter','按波长和光圈估算圆形孔径在像面上的第一暗环直径。','Calculate the theoretical Airy disk diameter at the image plane for a circular aperture.',
    [n('wave','波长（纳米）','Wavelength (nm)',550,300,1100),aperture],(w,N)=>({airyDiameterUm:2.44*w*N/1000})),
  design('projection-throw','投影机画幅','Projector throw dimensions','由投射比、投距与画幅比确定画面宽高和对角线。','Estimate projected picture width, height, and diagonal from throw ratio, distance, and aspect ratio.',
    [n('distance','投距（米）','Throw distance (m)',3),n('throwRatio','投射比（投距/画宽）','Throw ratio (distance/width)',1.5),n('ratioW','画幅比例宽','Aspect width',16),n('ratioH','画幅比例高','Aspect height',9)],(d,t,x,y)=>{const w=d/t,h=w*y/x;return {widthM:w,heightM:h,diagonalIn:Math.hypot(w,h)/.0254};}),
  design('anamor-desqueeze','变形镜视频还原比例','Anamorphic desqueeze dimensions','输入记录尺寸和水平挤压倍率，求还原宽度与显示画幅比。','Calculate display width and aspect ratio after horizontal desqueeze of anamorphic footage.',
    [pixelW,pixelH,n('squeeze','水平挤压倍率','Horizontal squeeze factor',1.33,1,4)],(w,h,s)=>({displayWidthPx:Math.round(w*s),displayHeightPx:h,displayAspect:w*s/h})),
  design('frame-safe-area','字幕安全框','Title safe frame','按每边内缩比例生成整数像素内框，用于字幕或屏显图形。','Build a whole-pixel safe rectangle for titles or on-screen graphics with a specified inset on every edge.',
    [pixelW,pixelH,n('inset','每边内缩（%）','Inset per edge (%)',5,0,49)],(w,h,i)=>{const x=neededItems(w*i/100),y=neededItems(h*i/100);requireValue(w>2*x&&h>2*y,'Insets leave no whole-pixel safe area.');return {leftPx:x,topPx:y,widthPx:w-2*x,heightPx:h-2*y};}),
];
