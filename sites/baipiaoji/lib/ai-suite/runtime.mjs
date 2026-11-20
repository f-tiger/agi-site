export function inputSpec(input) {
  const spec = {type:input.type, title:input.label.en};
  if(input.type==='string') spec.maxLength = input.maxLength ?? 12000;
  if(input.type==='number' || input.type==='integer') {
    spec.minimum = input.min ?? -1e12;
    spec.maximum = input.max ?? 1e12;
  }
  return spec;
}

export function toolInputSchema(tool) {
  const properties = Object.fromEntries(tool.inputs.map(input => [input.key,inputSpec(input)]));
  return {type:'object',properties,required:Object.keys(properties),additionalProperties:false};
}

export function executeSuiteTool(tool,args) {
  if(!args || typeof args!=='object' || Array.isArray(args)) throw Error('Expected an object of tool arguments.');
  if(Object.keys(args).length!==tool.inputs.length) throw Error('Supply the required input fields only.');
  const validated = {};
  for(const input of tool.inputs) {
    if(!Object.hasOwn(args,input.key)) throw Error('Missing input: '+input.label.en);
    const value=args[input.key], spec=inputSpec(input);
    const correctType=spec.type==='integer'?Number.isSafeInteger(value):typeof value===spec.type;
    if(!correctType) throw Error('Invalid input type: '+input.label.en);
    if(spec.type==='string' && value.length>spec.maxLength) throw Error('Text exceeds limit: '+input.label.en);
    if((spec.type==='integer' || spec.type==='number') && (!Number.isFinite(value)||value<spec.minimum||value>spec.maximum))
      throw Error('Number outside range: '+input.label.en);
    validated[input.key]=value;
  }
  if(new TextEncoder().encode(JSON.stringify(validated)).length>64000) throw Error('Arguments exceed 64 KB.');
  const result=tool.run(validated);
  const byteLimit = 180000;
  const tooLarge = () => Error('Result exceeds 180 KB. Use a smaller input.');
  let minimumBytes = 0;
  const json = JSON.stringify(result, function (key, value) {
    const type = typeof value;
    if (type === 'number' && !Number.isFinite(value)) throw Error('Result is outside the supported numeric range.');
    if (value === undefined || type === 'function' || type === 'symbol') return value;
    // Count a lower bound while walking. A join can reuse a large row many times.
    // Array indices are never serialized as keys. UTF-8 and escaping can add bytes.
    if (!Array.isArray(this)) minimumBytes += key.length;
    minimumBytes += type === 'string' ? value.length + 2 : 1;
    if (minimumBytes > byteLimit) throw tooLarge();
    return value;
  });
  if(json !== undefined && (json.length>byteLimit || new TextEncoder().encode(json).length>byteLimit)) throw tooLarge();
  return result;
}
