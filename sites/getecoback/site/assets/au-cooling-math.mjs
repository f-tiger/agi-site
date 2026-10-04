export function calculate(input){
 const bounds={watts:[0,10000],hours1:[0,24],cents1:[0,500],hours2:[0,24],cents2:[0,500],days:[1,366]},x={};
 for(const [key,[lo,hi]]of Object.entries(bounds)){const v=input[key];if(v===''||v===null||v===undefined||typeof v==='boolean')throw new RangeError('Complete every numeric field.');const n=Number(v);if(!Number.isFinite(n)||n<lo||n>hi)throw new RangeError('Use values within the displayed ranges.');x[key]=n;}
 if(x.hours1+x.hours2>24)throw new RangeError('The two time blocks must total no more than 24 hours per day.');
 const dailyKwh=x.watts/1000*(x.hours1+x.hours2),dailyAud=x.watts/1000*(x.hours1*x.cents1+x.hours2*x.cents2)/100;
 return {dailyKwh,dailyAud,periodKwh:dailyKwh*x.days,periodAud:dailyAud*x.days};
}
