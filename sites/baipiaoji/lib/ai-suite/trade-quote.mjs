import {ceilPositiveRatio, decimalIntegers, fromDecimalInteger} from './operations/core.mjs';
import {json, label, make, number, parse} from './tables-core.mjs';

export const TRADE_QUOTE_ENTRY_URL = 'https://baipiaoji.com/studio/ai/trade-export-quote?mcp_entry=trade-export-quote';

// Common currencies from the SIX ISO 4217 List One (2026-09-17).
// Payment providers can apply a separate settlement precision.
const twoPlaces = 'AED AUD BRL CAD CHF CNY COP DKK EUR GBP HKD IDR INR MXN MYR NOK NZD PEN PHP PLN QAR SAR SEK SGD THB TRY TWD USD ZAR'.split(' ');
const currencyPlaces = new Map([
  ...twoPlaces.map(code => [code,2]),
  ...['CLP','JPY','KRW','VND'].map(code => [code,0]),
  ...['BHD','JOD','KWD','OMR'].map(code => [code,3]),
]);
const terms = ['EXW','FOB','CIF'];
const cifCosts = ['freight','insurance'];
const feeKinds = [...cifCosts, 'freight_and_insurance'];
const feeFields = new Set(['name','amount','currency','kind','includedIn']);
const costPlaces = 6;
const ratePlaces = 8;
const percentPlaces = 4;
// Percent inputs are percentage points. 100.0000% is one whole revenue share.
const percentScale = 1_000_000n;
const maxMinor = 1_000_000_000_000_000n;
const maxMoneyInput = 1e9;

function currency(value) {
  const code = value.trim().toUpperCase();
  if (!currencyPlaces.has(code)) throw Error('Choose a supported currency code, such as CNY, USD, EUR, GBP, or JPY.');
  return code;
}

function scaled(value, places, field) {
  const {values:[integer], places:usedPlaces} = decimalIntegers([value]);
  if (usedPlaces > places) throw Error(field + ' supports up to ' + places + ' decimal places.');
  return integer * 10n ** BigInt(places - usedPlaces);
}

function readFees(input, costCurrency, quoteCurrency) {
  const rows = parse(input);
  if (!Array.isArray(rows) || rows.length > 30) throw Error('Supply a JSON array of up to 30 seller fee lines.');
  const fees = rows.map((row, index) => {
    if (!row || Array.isArray(row) || typeof row !== 'object' || Object.keys(row).some(key => !feeFields.has(key)) ||
        typeof row.name !== 'string' || typeof row.currency !== 'string' ||
        !Number.isFinite(row.amount) || row.amount < 0 || row.amount > maxMoneyInput) {
      throw Error('Each seller fee needs name, amount and currency. The optional fields are kind and includedIn. Amount must be a nonnegative number up to 1 billion.');
    }
    const name = row.name.trim();
    if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/u.test(name)) throw Error('Use single-line fee names of 1 to 80 characters.');
    const code = currency(row.currency);
    if (code !== costCurrency && code !== quoteCurrency) throw Error('Seller fee currency must match either the cost or quote currency.');
    const {kind, includedIn} = row;
    if (Object.hasOwn(row,'kind') && !feeKinds.includes(kind)) throw Error('Fee kind must be freight, insurance or freight_and_insurance.');
    if (Object.hasOwn(row,'includedIn') && (!kind || row.amount !== 0 || !Number.isInteger(includedIn) ||
        includedIn < 1 || includedIn > rows.length || includedIn === index + 1)) {
      throw Error('Use includedIn only on a typed zero fee to identify a different positive fee line by its 1-based number.');
    }
    return {name, amount:row.amount, currency:code, kind, includedIn};
  });
  for (const {includedIn} of fees) {
    if (includedIn !== undefined && fees[includedIn - 1].amount <= 0) {
      throw Error('The referenced includedIn fee line must have a positive charge.');
    }
  }
  return fees;
}

function checkSellerCosts(term, fees) {
  // Classify only expressly typed amounts or their single billed line. A label
  // such as "freight" or a separate zero amount carries no cost confirmation.
  const missing = term === 'CIF' ? cifCosts.filter(cost => !fees.some(fee =>
    (fee.kind === cost || fee.kind === 'freight_and_insurance') && (fee.amount > 0 || fee.includedIn !== undefined)
  )) : [];
  return {status: missing.length ? 'provisional' : 'costs_entered', missing};
}

function exportQuote({
  costCurrency, quoteCurrency, quotePerCostUnit, incoterm, quantity, unitProductCost,
  sellerFees, commissionPercent, paymentFeePercent, targetMarginPercent, quotedUnitPrice,
}) {
  const from = currency(costCurrency);
  const to = currency(quoteCurrency);
  const term = incoterm.trim().toUpperCase();
  if (!terms.includes(term)) throw Error('Enter EXW, FOB or CIF.');
  if (from === to && quotePerCostUnit !== 1) throw Error('Use exchange rate 1 when both currencies match.');
  const rate = scaled(quotePerCostUnit, ratePlaces, 'Exchange rate');
  const commission = scaled(commissionPercent, percentPlaces, 'Commission percent');
  const payment = scaled(paymentFeePercent, percentPlaces, 'Payment fee percent');
  const margin = scaled(targetMarginPercent, percentPlaces, 'Target margin percent');
  const available = percentScale - commission - payment - margin;
  if (available <= 0n) throw Error('Commission, payment fee and target margin must add up to less than 100%.');

  const decimals = currencyPlaces.get(to);
  const minorUnits = 10n ** BigInt(decimals);
  const units = BigInt(quantity);
  const convertedScale = 10n ** BigInt(costPlaces + ratePlaces);
  const noConversion = 10n ** BigInt(ratePlaces);
  function converted(amount, sourceCurrency) {
    const rateForLine = sourceCurrency === to ? noConversion : rate;
    return ceilPositiveRatio(amount * rateForLine * minorUnits, convertedScale);
  }
  function quoteAmount(amount) {
    if (amount > maxMinor) throw Error('A quote amount exceeds the supported range. Reduce order size or the target margin.');
    return fromDecimalInteger(amount, decimals);
  }

  const productCostBase = scaled(unitProductCost, costPlaces, 'Product unit cost') * units;
  const convertedProduct = converted(productCostBase, from);
  let cost = convertedProduct;
  const fees = readFees(sellerFees, from, to);
  const costCompleteness = checkSellerCosts(term, fees);
  const feeLines = fees.map(({name, amount, currency}) => {
    const inQuote = converted(scaled(amount, costPlaces, 'Seller fee amount'), currency);
    cost += inQuote;
    return {name, amount, currency, inQuoteCurrency:quoteAmount(inQuote)};
  });
  if (cost === 0n) throw Error('Enter a positive product cost or seller fee to calculate a meaningful minimum quote.');
  const minimumOrder = ceilPositiveRatio(cost * percentScale, available);
  const minimumUnit = ceilPositiveRatio(minimumOrder, units);
  const quotedUnit = scaled(quotedUnitPrice, decimals, 'Quoted unit price');
  let quotedOrder = null;
  if (quotedUnit > 0n) {
    const order = quotedUnit * units;
    const projectedCommission = order * commission;
    const projectedPayment = order * payment;
    const profit = (order - cost) * percentScale - projectedCommission - projectedPayment;
    const estimatedAmount = integer => fromDecimalInteger(integer, decimals + percentPlaces + 2);
    quotedOrder = {
      unitPrice:quoteAmount(quotedUnit),
      orderTotal:quoteAmount(order),
      commission:estimatedAmount(projectedCommission),
      paymentFee:estimatedAmount(projectedPayment),
      profit:estimatedAmount(profit),
      marginPercent:Number((100 * Number(profit) / Number(order * percentScale)).toFixed(4)),
      meetsTarget:costCompleteness.status === 'costs_entered' ? profit >= order * margin : null,
    };
  }

  return {
    incoterm:term,
    quantity,
    costCurrency:from,
    quoteCurrency:to,
    quotePerCostUnit,
    productCostInQuoteCurrency:quoteAmount(convertedProduct),
    sellerFeeLines:feeLines,
    sellerCost:quoteAmount(cost),
    commissionPercent,
    paymentFeePercent,
    targetMarginPercent,
    minimumOrderTotal:quoteAmount(minimumOrder),
    minimumUnitPrice:quoteAmount(minimumUnit),
    orderTotalAtMinimumUnitPrice:quoteAmount(minimumUnit * units),
    quotedOrder,
    costCompleteness,
  };
}

const money = {type:'number',minimum:0};
const codeSchema = {type:'string',enum:[...currencyPlaces.keys()]};
const quotedProperties = {
  unitPrice:money,orderTotal:money,commission:money,paymentFee:money,profit:{type:'number'},
  marginPercent:{type:'number'},meetsTarget:{
    type:['boolean','null'],
    description:'Null when costCompleteness.status is provisional. Otherwise, compares the margin from entered costs with the target.',
  },
};
const quoteProperties = {
  incoterm:{type:'string',enum:terms},
  quantity:{type:'integer',minimum:1},
  costCurrency:codeSchema,quoteCurrency:codeSchema,quotePerCostUnit:{type:'number',exclusiveMinimum:0},
  productCostInQuoteCurrency:money,
  sellerFeeLines:{type:'array',maxItems:30,items:{
    type:'object',additionalProperties:false,required:['name','amount','currency','inQuoteCurrency'],
    properties:{name:{type:'string',minLength:1,maxLength:80},amount:money,currency:codeSchema,inQuoteCurrency:money},
  }},
  sellerCost:money,commissionPercent:money,paymentFeePercent:money,targetMarginPercent:money,
  minimumOrderTotal:money,minimumUnitPrice:money,orderTotalAtMinimumUnitPrice:money,
  quotedOrder:{anyOf:[
    {type:'null'},
    {type:'object',additionalProperties:false,required:Object.keys(quotedProperties),properties:quotedProperties},
  ]},
  costCompleteness:{type:'object',additionalProperties:false,required:['status','missing'],properties:{
    status:{type:'string',enum:['costs_entered','provisional']},
    missing:{type:'array',maxItems:2,uniqueItems:true,items:{type:'string',enum:cifCosts}},
  }},
};

const quoteTool = make(
  'trade-export-quote',
  '外贸订单报价与毛利计算器',
  'Export order quote and margin calculator',
  '按输入的汇率、货品和卖方费用计算 EXW、FOB 或 CIF 底价与毛利。CIF 费用项用 kind 明确标记 freight、insurance 或 freight_and_insurance。若已含在同一笔正额费用中，额外零费用项可用 includedIn 指向该费用的行号（从 1 起）。costCompleteness.status 为 provisional 时，底价、利润和利润率仅按已填成本估算，试报结果的 meetsTarget 为 null。补齐运费和保险前，勿向买家发送该估价。',
  'Calculate an EXW, FOB or CIF price floor and margin from seller costs and exchange rates. In sellerFees JSON, mark CIF cost lines with kind freight, insurance or freight_and_insurance. When a billed fee already includes a cost, a separate typed zero line can refer to that positive fee by its 1-based line number in includedIn. If costCompleteness.status is provisional, price floors, profit and margin use known costs only, and meetsTarget is null for a proposed price. Confirm freight and cargo insurance before using the estimate in a buyer quote.',
  [
    label('incoterm','贸易术语（EXW、FOB 或 CIF）','Trade term (EXW, FOB, or CIF)','CIF'),
    label('costCurrency','货品成本币种（如 CNY）','Product cost currency (e.g. CNY)','CNY'),
    label('quoteCurrency','报价币种（如 USD）','Quote currency (e.g. USD)','USD'),
    number('quotePerCostUnit','汇率（每 1 成本币可换多少报价币）','Exchange rate (quote currency per 1 cost currency)',0.14,0.00000001,1_000_000),
    number('quantity','订单数量（整数）','Order quantity (whole units)',500,1,1_000_000,true),
    number('unitProductCost','货品单件成本（以成本币计）','Product cost per unit (in cost currency)',36,0,maxMoneyInput),
    json('sellerFees','每单卖方费用（JSON，可填 kind 与 includedIn）','Seller fees per order (JSON, optional kind and includedIn)',[
      {name:'Packaging',amount:350,currency:'CNY'},
      {name:'Pre-carriage',amount:650,currency:'CNY'},
      {name:'Freight',amount:250,currency:'USD',kind:'freight'},
      {name:'Insurance',amount:30,currency:'USD',kind:'insurance'},
    ]),
    number('commissionPercent','销售佣金（占报价金额的百分比）','Sales commission (% of quoted revenue)',5,0,100),
    number('paymentFeePercent','收款费（占报价金额的百分比）','Payment fee (% of quoted revenue)',2.5,0,100),
    number('targetMarginPercent','目标利润率（占报价金额的百分比）','Target margin (% of quoted revenue)',20,0,100),
    number('quotedUnitPrice','试报单价（以报价币计，填 0 只计算底价）','Proposed unit price (quote currency, 0 for price floor only)',8.4,0,maxMoneyInput),
  ],
  exportQuote,
);
quoteTool.searchAliases = ['export price floor','FOB quote','CIF pricing','EXW price','trade profit margin','外贸报价','出口报价','外币报价','外贸利润','外贸毛利','FOB报价','CIF报价'];
quoteTool.outputSchema = {
  type:'object',additionalProperties:false,required:Object.keys(quoteProperties),properties:{
    ...quoteProperties,
    entry_url:{type:'string',const:TRADE_QUOTE_ENTRY_URL,description:'Optional fixed link to continue in the free browser calculator after the MCP input costs are entered. The link carries no quote data.'},
  },
};

export const tools = [quoteTool];
