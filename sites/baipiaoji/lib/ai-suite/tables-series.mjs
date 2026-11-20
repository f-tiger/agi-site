import {make,vector,number,numbers,average,sum,sorted,median,variance,quantileAscending as quantile,divide,fail,frequency,ranks,xs,ys} from './tables-core.mjs';

const proportion=number('fraction','每端比例','Fraction at each end',0.1,0,0.49);
const windowField=number('width','窗口长度','Window size',3,1,500,true);
const lagField=number('lag','滞后期数','Lag in observations',1,1,499,true);
function windows(a,k,fn) {
  if (k>a.length) fail('Window size exceeds the series length.');
  return a.slice(k-1).map((_,i)=>fn(a.slice(i,i+k)));
}
function positive(a) {
  if (a.some(x=>x<=0)) fail('This calculation requires strictly positive numbers.');
}
function nonnegative(a) {
  if (a.some(x=>x<0)) fail('This calculation requires nonnegative numbers.');
}
function buckets(a) { return [...frequency(a)].sort((l,r)=>l[0]-r[0]); }
function cdf(a) {
  let count=0;
  return buckets(a).map(([value,n])=>({value,probability:(count+=n)/a.length}));
}
function lorenz(a) {
  nonnegative(a);
  const total=sum(a);
  if (!total) fail('A positive total is required.');
  let running=0;
  return [{population:0,share:0},...sorted(a).map((x,i)=>({population:(i+1)/a.length,share:(running+=x)/total}))];
}
function lagged(a,k,fn) {
  if (k>=a.length) fail('Lag must be shorter than the series.');
  return a.slice(k).map((x,i)=>fn(a[i],x,i+k));
}
function moment(a,order) {
  const mu=average(a), sd=Math.sqrt(variance(a));
  return average(a.map(x=>divide(x-mu,sd)**order));
}
function series(id,zh,en,zdesc,desc,fn,extra=[],min=1) {
  return make('series-'+id,zh,en,zdesc,desc,[vector(),...extra],p=>({result:fn(numbers(p.values,min),p)}));
}

export const seriesTools = [
  series('trimmed-mean','双端截尾平均数','Two-sided trimmed mean','按比例去除两端的完整观测值，返回剩余数据的均值。','Discard the specified whole count at both extremes and average the remainder.',(a,p)=>{
    const k=Math.floor(a.length*p.fraction);
    return average(sorted(a).slice(k,a.length-k));
  },[proportion]),
  series('winsorize','温莎化极值替换','Winsorize extreme observations','将尾部观测值限制在截尾位置的边界，并保留原顺序。','Clamp tail observations to the retained order-statistic boundaries in input order.',(a,p)=>{
    const s=sorted(a), k=Math.floor(s.length*p.fraction);
    return a.map(x=>Math.max(s[k],Math.min(s[s.length-1-k],x)));
  },[proportion]),
  series('geometric-mean','正数几何平均','Geometric mean of positive values','对正数取对数，计算适用于乘法比值的平均水平。','Average positive multiplicative factors in logarithmic space.',a=>{positive(a);return Math.exp(average(a.map(Math.log)));}),
  series('harmonic-mean','等距离速率调和平均','Harmonic mean of rates','对正速率取倒数求平均，再转换回原单位。','Average positive rates for trips of equal distance or other equal-quantity segments.',a=>{positive(a);return 1/average(a.map(x=>1/x));}),
  series('root-mean-square','信号均方根','Root mean square of readings','将观测值平方并平均，再开方求有效量。','Compute the square root of the mean squared reading.',a=>Math.sqrt(average(a.map(x=>x*x)))),
  series('median-absolute-deviation','中位绝对偏差','Median absolute deviation','用偏离中位数的绝对距离评估分散程度。','Measure dispersion with the median absolute distance from the sample median.',a=>{const m=median(a);return median(a.map(x=>Math.abs(x-m)));}),
  series('tukey-fences','四分位离群点围栏','Tukey outlier fences','按线性四分位数和 1.5 倍四分位距列出异常值及位置。','Locate observations outside the linear-quartile 1.5 IQR fences.',a=>{
    const s=sorted(a), q1=quantile(s,0.25), q3=quantile(s,0.75), offset=1.5*(q3-q1);
    return {lower:q1-offset,upper:q3+offset,outliers:a.flatMap((value,i)=>value<q1-offset||value>q3+offset?[{row:i+1,value}]:[])};
  }),
  series('z-scores','总体标准分数','Population z-scores','用总体标准差把各读数换成标准分数。','Center each observation and scale by its population standard deviation.',a=>{const m=average(a),sd=Math.sqrt(variance(a));return a.map(x=>divide(x-m,sd));}),
  series('robust-scale','中位数与四分位缩放','Median and IQR scaling','以中位数居中，用四分位距缩放各行。','Center values on the median and divide by the interpolated interquartile range.',a=>{
    const s=sorted(a), m=quantile(s,0.5), width=quantile(s,0.75)-quantile(s,0.25);
    return a.map(x=>divide(x-m,width));
  }),
  series('min-max-scale','数列归一化到零至一','Min-max normalization','按输入的最小值和最大值映射到零至一区间。','Map the minimum to zero and maximum to one using a linear transformation.',a=>{const lo=Math.min(...a),hi=Math.max(...a);return a.map(x=>divide(x-lo,hi-lo));}),
  series('unit-vector','欧氏单位向量','Euclidean unit vector','用欧氏长度缩放各分量，得到单位向量。','Scale each component by the Euclidean norm of the vector.',a=>{const norm=Math.hypot(...a);return a.map(x=>divide(x,norm));}),
  series('cumulative-share','按原顺序累计占比','Running contribution shares','计算非负数据各行累积至总量的比例。','Return the cumulative share of a nonnegative total in original order.',a=>{nonnegative(a);const total=sum(a);let t=0;return a.map(x=>divide(t+=x,total));}),
  series('dense-rank','并列稠密排名','Dense ranks with ties','给升序不同值连续排名，相同值共享名次。','Assign consecutive ranks to distinct ascending values and preserve input order.',a=>{const m=new Map(buckets(a).map(([x],i)=>[x,i+1]));return a.map(x=>m.get(x));}),
  series('midrank-percentiles','并列中秩百分位','Midrank percentiles','按小于的个数加一半相等个数计算每项的百分位。','Give each observation the fraction below it plus half the fraction tied with it.',a=>ranks(a).map(r=>(r-0.5)/a.length)),
  series('softmax','分值转换为软最大概率','Softmax score probabilities','减去最大分值后指数加权，输出归一化权重。','Exponentiate scores after subtracting the maximum and normalize to probabilities.',a=>{const max=Math.max(...a), w=a.map(x=>Math.exp(x-max)),total=sum(w);return w.map(x=>x/total);}),
  series('entropy','经验分布信息熵','Empirical Shannon entropy','根据不同数值出现频率计算以比特为单位的信息熵。','Compute the Shannon entropy in bits from observed value frequencies.',a=>-sum([...frequency(a).values()].map(n=>n/a.length*Math.log2(n/a.length)))),
  series('gini','非负数列基尼系数','Gini coefficient','根据非负观测值的洛伦兹曲线计算不均等程度。','Measure inequality for a nonnegative series using the Lorenz trapezoid areas.',a=>{
    const l=lorenz(a);return 1-sum(l.slice(1).map((p,i)=>(p.population-l[i].population)*(p.share+l[i].share)));
  }),
  series('lorenz','洛伦兹曲线坐标','Lorenz curve coordinates','按从小到大的观测值输出累计人口和累计份额。','Return cumulative population and value shares sorted from smallest observation to largest.',lorenz),
  series('variation-ratio','非众数占比','Variation ratio','计算没有取到最高频数值的观测比例。','Compute one minus the relative frequency of the most common observed value.',a=>1-Math.max(...frequency(a).values())/a.length),
  series('modes','列出并列众数','Tied modes and counts','列出达到最高出现次数的全部数值及频数。','Return all values tied for highest frequency and their shared count.',a=>{const b=buckets(a),max=Math.max(...b.map(([,n])=>n));return {values:b.filter(([,n])=>n===max).map(([x])=>x),count:max};}),
  series('moment-skewness','总体矩偏度','Population moment skewness','用标准化三阶中心矩评估分布不对称。','Compute the third standardized central moment of the empirical population.',a=>moment(a,3)),
  series('excess-kurtosis','总体超额峰度','Population excess kurtosis','比较四阶标准矩与正态分布的参考值三。','Subtract three from the fourth standardized central moment.',a=>moment(a,4)-3),
  series('mean-standard-error','样本均值标准误','Standard error of the sample mean','用样本标准差和观测数估计均值的标准误。','Divide the sample standard deviation by the square root of the observation count.',a=>Math.sqrt(variance(a,1)/a.length),[],2),
  series('relative-spread','相对标准差','Relative standard deviation','把样本标准差表示为均值绝对值的百分比。','Express the sample standard deviation as a percentage of the absolute sample mean.',a=>100*divide(Math.sqrt(variance(a,1)),Math.abs(average(a))),[],2),
  series('quantile','线性插值分位数','Linearly interpolated quantile','在排序数列的相邻位置之间进行线性插值。','Evaluate a requested quantile by interpolation at position (n - 1) times p.',(a,p)=>quantile(sorted(a),p.p),[number('p','分位比例','Quantile fraction',0.75,0,1)]),
  series('exceedance','阈值超出率','Threshold exceedance rate','计算严格高于指定阈值的数量和比例。','Count observations strictly above a threshold and return their share.',(a,p)=>{const n=a.filter(x=>x>p.threshold).length;return {count:n,fraction:n/a.length};},[number('threshold','阈值','Threshold',4,-1e12,1e12)]),
  series('empirical-cdf','经验累积分布','Empirical CDF steps','在每个不同取值处输出小于等于该值的比例。','List each distinct observation and the empirical probability at or below it.',cdf),
  series('histogram','等宽直方图','Equal-width histogram','按输入范围生成等宽区间，最后一个区间包含最大值。','Count observations in equal-width bins, including the maximum in the final bin.',(a,p)=>{
    const lo=Math.min(...a),hi=Math.max(...a);
    if(lo===hi)return [{lower:lo,upper:hi,count:a.length}];
    const w=(hi-lo)/p.bins;
    const bins=Array.from({length:p.bins},(_,i)=>({lower:lo+i*w,upper:i===p.bins-1?hi:lo+(i+1)*w,count:0}));
    for(const x of a)bins[Math.min(p.bins-1,Math.floor((x-lo)/w))].count++;
    return bins;
  },[number('bins','区间数','Bin count',4,1,64,true)]),
  series('lag-differences','指定滞后差分','Lagged differences','按指定期数计算当前读数与较早读数的差。','Subtract the earlier observation from each value at the requested lag.',(a,p)=>lagged(a,p.lag,(x,y)=>y-x),[lagField]),
  series('percent-changes','逐期增长百分比','Period-to-period percent changes','按前值计算相邻两期变化百分比，前值为零时返回空。','Compute adjacent percentage changes relative to the previous observation, returning null for a zero base.',a=>lagged(a,1,(x,y)=>x===0?null:100*(y-x)/x),[],2),
  series('drawdown','峰值回撤轨迹','Drawdown from running peaks','沿正值序列跟踪历史峰值及百分比回撤。','Track running peaks and percentage declines for a strictly positive series.',a=>{positive(a);let peak=a[0];return a.map(value=>{peak=Math.max(peak,value);return {peak,drawdownPercent:100*(value/peak-1)};});}),
  series('constant-runs','连续相等区段','Runs of equal observations','将连续相等的观测值压缩为起始行、取值和长度。','Compress adjacent equal observations into runs with one-based start rows.',a=>{
    const runs=[];
    a.forEach((value,i)=>{if(runs.at(-1)?.value===value)runs.at(-1).length++;else runs.push({start:i+1,value,length:1});});
    return runs;
  }),
  series('moving-mean','固定窗口移动均值','Rolling arithmetic mean','为每个完整窗口计算算术均值。','Return one mean for every full trailing window.',(a,p)=>windows(a,p.width,average),[windowField]),
  series('moving-median','固定窗口移动中位数','Rolling median filter','使用每个完整窗口的中位数平滑孤立尖峰。','Smooth isolated spikes with the median of each full trailing window.',(a,p)=>windows(a,p.width,median),[windowField]),
  series('moving-volatility','移动总体波动率','Rolling population volatility','按连续窗口估算读数的总体标准差。','Measure local volatility as population standard deviation in each full window.',(a,p)=>windows(a,p.width,w=>Math.sqrt(variance(w))),[windowField]),
  series('exponential-smooth','单指数平滑','Single exponential smoothing','以首个观测值初始化，用指定权重递推平滑值。','Seed with the first observation and recursively smooth with the supplied alpha.',(a,p)=>{let s=a[0];return a.map(x=>(s=p.alpha*x+(1-p.alpha)*s));},[number('alpha','新值权重','Weight of new observation',0.35,0,1)]),
  series('autocorrelation','指定滞后自相关','Lagged autocorrelation','用全样本均值和平方离差和计算指定期数的自相关。','Use the full-series mean and total squared deviation to compute autocorrelation at a given lag.',(a,p)=>{const m=average(a);return divide(sum(lagged(a,p.lag,(x,y)=>(x-m)*(y-m))),sum(a.map(x=>(x-m)**2)));},[lagField]),
  series('turning-points','严格局部极值','Strict turning points','查找同时高于或低于两侧相邻值的内部位置。','Identify interior rows strictly above or strictly below both neighbours.',a=>a.flatMap((value,i)=>{
    if(i===0||i===a.length-1)return [];
    const type=value>a[i-1]&&value>a[i+1]?'peak':value<a[i-1]&&value<a[i+1]?'trough':null;
    return type?[{row:i+1,value,type}]:[];
  }),[],3),
  series('cumulative-sum','有序数列前缀和','Running totals','逐项累计正负观测值，输出每个位置的总量。','Accumulate signed observations and return the prefix total at every position.',a=>{let total=0;return a.map(x=>total+=x);}),
  series('center','均值中心化','Mean-centered deviations','逐项减去算术均值，保留观测单位。','Subtract the arithmetic mean from every observation while retaining its units.',a=>{const m=average(a);return a.map(x=>x-m);}),
];

function paired(id,zh,en,zdesc,desc,fn,min=1) {
  return make('pairs-'+id,zh,en,zdesc,desc,[xs,ys],p=>{
    const x=numbers(p.x,min),y=numbers(p.y,min);
    if(x.length!==y.length)fail('Both series must have the same length.');
    return {result:fn(x,y)};
  });
}
function cov(x,y) {
  const a=average(x),b=average(y);
  return average(x.map((v,i)=>(v-a)*(y[i]-b)));
}
const pearson=(x,y)=>divide(cov(x,y),Math.sqrt(variance(x)*variance(y)));
const dot=(x,y)=>sum(x.map((v,i)=>v*y[i]));
const deltas=(x,y)=>x.map((v,i)=>y[i]-v);
function fit(x,y) {const slope=divide(cov(x,y),variance(x));return {slope,intercept:average(y)-slope*average(x)};}
function weights(x,y) {
  nonnegative(y);
  const total=sum(y);
  if (!total) fail('Weights must have a positive sum.');
  return y.map(w=>w/total);
}
export const pairedTools=[
  paired('pearson','皮尔逊线性相关','Pearson linear correlation','用成对数值的标准化协方差度量线性相关。','Measure linear association from the covariance of paired observations.',pearson,2),
  paired('spearman','斯皮尔曼秩相关','Spearman rank correlation','用并列平均秩比较两个变量的单调相关。','Measure monotonic association using average ranks for ties.',(x,y)=>pearson(ranks(x),ranks(y)),2),
  paired('kendall','肯德尔并列校正相关','Kendall tau-b with ties','统计一致和不一致观测对，并校正单边并列。','Count concordant and discordant pairs and correct the denominator for one-sided ties.',(x,y)=>{
    let c=0,d=0,tx=0,ty=0;
    for(let i=0;i<x.length;i++)for(let j=i+1;j<x.length;j++){
      const a=Math.sign(x[j]-x[i]),b=Math.sign(y[j]-y[i]);
      if(a&&b){if(a===b)c++;else d++;}else if(b)tx++;else if(a)ty++;
    }
    return {tau:divide(c-d,Math.sqrt((c+d+tx)*(c+d+ty))),concordant:c,discordant:d};
  },2),
  paired('sample-covariance','样本协方差','Sample covariance','以观测数减一为分母计算两个变量的样本协方差。','Measure joint sample spread using the n minus one denominator.',(x,y)=>cov(x,y)*x.length/(x.length-1),2),
  paired('linear-fit','一元最小二乘拟合','Simple least-squares fit','用第一组数值解释第二组，返回斜率、截距和拟合值。','Fit the second series to the first with a slope, intercept and fitted response per row.',(x,y)=>{const {slope,intercept}=fit(x,y);return {slope,intercept,fitted:x.map(v=>intercept+slope*v)};},2),
  paired('theil-sen','稳健泰尔森直线','Theil-Sen robust line','取不同横坐标点对的斜率中位数，再取各点截距中位数。','Estimate a robust line using the median nonvertical pair slope and median point intercept.',(x,y)=>{
    if(x.length>160)fail('Use up to 160 points for the pairwise slope estimator.');
    const slopes=[];
    for(let i=0;i<x.length;i++)for(let j=i+1;j<x.length;j++)if(x[i]!==x[j]) slopes.push((y[j]-y[i])/(x[j]-x[i]));
    if(!slopes.length)fail('At least two distinct x values are required.');
    const slope=median(slopes);
    return {slope,intercept:median(y.map((v,i)=>v-slope*x[i])),pairs:slopes.length};
  },2),
  paired('residual-diagnostics','预测残差诊断','Prediction residual diagnostics','输入观测和预测两列，返回预测减实际的残差及最大误差行。','Subtract actuals from predictions and locate the first largest absolute error.',(x,y)=>{const residuals=deltas(x,y),max=Math.max(...residuals.map(Math.abs));return {residuals,maximumAbsoluteError:max,row:1+residuals.findIndex(v=>Math.abs(v)===max)};}),
  paired('rmse','预测均方根误差','Root mean squared prediction error','对成对差值平方取均值，再开平方转换到原单位。','Summarize prediction errors with a quadratic penalty in the original units.',(x,y)=>Math.sqrt(average(deltas(x,y).map(v=>v*v)))),
  paired('absolute-error','预测绝对误差摘要','Absolute prediction error summary','给出绝对误差的平均值、中位数和第九十百分位数。','Summarize absolute errors by mean, median and ninetieth percentile.',(x,y)=>{const a=sorted(deltas(x,y).map(Math.abs));return {mean:average(a),median:median(a),p90:quantile(a,0.9)};}),
  paired('percentage-error','非零实际值百分比误差','Absolute percentage error on nonzero actuals','跳过实际值为零的行，汇总逐行绝对百分比误差。','Compute mean absolute percentage error over nonzero actuals and count skipped rows.',(x,y)=>{const a=x.flatMap((v,i)=>v===0?[]:[100*Math.abs((y[i]-v)/v)]);if(!a.length)fail('Provide a nonzero actual value.');return {percent:average(a),skipped:x.length-a.length};}),
  paired('forecast-skill','相对均值基线的拟合优度','R-squared against the observed mean','用实际值的总平方和比较给定预测的残差平方和。','Evaluate supplied predictions against the constant observed-mean baseline using R-squared.',(x,y)=>1-divide(sum(deltas(x,y).map(v=>v*v)),x.length*variance(x)),2),
  paired('bland-altman','配对测量一致性界限','Bland-Altman agreement limits','以第二组减第一组求差，计算平均偏差和 1.96 倍样本标准差界限。','Report average second-minus-first bias and agreement limits at 1.96 sample standard deviations.',(x,y)=>{const d=deltas(x,y),bias=average(d),w=1.96*Math.sqrt(variance(d,1));return {bias,lower:bias-w,upper:bias+w};},2),
  paired('weighted-mean','按观测权重求均值','Weighted mean from observation weights','用第二列作为非负权重，对第一列进行加权。','Weight the first series by nonnegative weights supplied in the second series.',(x,y)=>dot(x,weights(x,y))),
  paired('weighted-median','按累计权重取中位数','Weighted median by cumulative weight','按数值排序并选出累计权重首次达到一半的观测。','Sort by value and select the first observation reaching half the total weight.',(x,y)=>{weights(x,y);const s=x.map((value,i)=>({value,w:y[i]})).sort((a,b)=>a.value-b.value),half=sum(y)/2;let t=0;return s.find(item=>(t+=item.w)>=half).value;}),
  paired('weighted-variance','加权总体方差','Weighted population variance','用归一化非负权重计算均值周围的加权平方偏差。','Compute weighted squared deviations from the weighted population mean.',(x,y)=>{const w=weights(x,y),m=dot(x,w);return dot(w,x.map(v=>(v-m)**2));}),
  paired('cosine','向量余弦相似度','Cosine similarity of vectors','用两个非零向量的夹角余弦评估方向相似度。','Compare direction using the dot product divided by both nonzero Euclidean norms.',(x,y)=>divide(dot(x,y),Math.hypot(...x)*Math.hypot(...y))),
  paired('distance-profile','两向量距离对照','Vector distance profile','返回曼哈顿距离、欧氏距离和切比雪夫距离。','Report Manhattan, Euclidean and Chebyshev distances between two aligned vectors.',(x,y)=>{const d=deltas(x,y).map(Math.abs);return {manhattan:sum(d),euclidean:Math.hypot(...d),chebyshev:Math.max(...d)};}),
  paired('projection','向量正交投影','Orthogonal vector projection','把第一向量投影到第二向量的方向，输出投影和正交余量。','Project the first vector onto the second and return both projection and orthogonal residual.',(x,y)=>{const k=divide(dot(x,y),dot(y,y)),projection=y.map(v=>v*k);return {projection,residual:x.map((v,i)=>v-projection[i])};}),
  paired('trapezoid-integral','非等距梯形积分','Trapezoidal integral on uneven samples','按递增横坐标对相邻样本做梯形面积求和。','Integrate consecutive readings using trapezoids on strictly increasing x coordinates.',(x,y)=>sum(x.slice(1).map((v,i)=>{if(v<=x[i])fail('X coordinates must increase strictly.');return (v-x[i])*(y[i+1]+y[i])/2;})),2),
  paired('segment-slopes','相邻样本分段斜率','Slopes between sampled points','按顺序求相邻点纵向差与横向差的比值。','Compute the secant slope for every pair of adjacent sampled coordinates.',(x,y)=>x.slice(1).map((v,i)=>divide(y[i+1]-y[i],v-x[i])),2),
  paired('sign-counts','配对升降方向计数','Paired increase and decrease counts','比较配对测量的改变量并分别统计上升、相等和下降。','Count increases, ties and decreases between matched observations.',(x,y)=>{const d=deltas(x,y);return {increase:d.filter(v=>v>0).length,equal:d.filter(v=>v===0).length,decrease:d.filter(v=>v<0).length};}),
  paired('deming','等误差方差正交回归','Equal-variance orthogonal regression','假设两轴误差方差相同，估计正交回归直线。','Fit a Deming line with equal measurement error variance on both axes.',(x,y)=>{const c=cov(x,y),d=variance(y)-variance(x);if(!c)fail('A unique finite tilted Deming slope requires nonzero covariance.');const h=Math.hypot(d,2*c),slope=d>=0?(d+h)/(2*c):2*c/(h-d);return {slope,intercept:average(y)-slope*average(x)};},2),
  paired('cumulative-gains','排序累计增益','Cumulative gains by score','按预测分数从高到低分组并计算实际非负收益累计占比。','Rank by descending score and report cumulative nonnegative outcome share at each tied-score boundary.',(x,y)=>{
    nonnegative(y);const total=sum(y);if(!total)fail('Supply a positive total outcome.');
    const groups=new Map();x.forEach((v,i)=>{const g=groups.get(v)||{n:0,gain:0};g.n++;g.gain+=y[i];groups.set(v,g);});
    let n=0,gain=0;return [...groups].sort((a,b)=>b[0]-a[0]).map(([score,g])=>({score,population:(n+=g.n)/x.length,gain:(gain+=g.gain)/total}));
  }),
  paired('symmetric-error','对称百分比误差','Symmetric absolute percentage error','用预测和实际绝对值之和缩放误差，两者均为零的行计零。','Scale errors by the sum of absolute actual and forecast values, treating a double zero as zero error.',(x,y)=>average(x.map((v,i)=>v===0&&y[i]===0?0:200*Math.abs(v-y[i])/(Math.abs(v)+Math.abs(y[i]))))),
];
