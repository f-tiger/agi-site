export function impact({amount,price,gas,feeGwei,ethUsd}){
 for(const n of [amount,price,gas,feeGwei,ethUsd])if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e12)throw Error('Use finite non-negative values within 1 trillion.');
 if(price===0||ethUsd===0)throw Error('Prices must be greater than zero.');
 return {value:amount*price,difference:amount*(price-1),gasUsd:gas*feeGwei*1e-9*ethUsd};
}
