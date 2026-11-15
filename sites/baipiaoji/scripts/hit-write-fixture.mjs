// Event contract tests inspect hits separately from the bounded quality totals.
// Capture every write so privacy assertions can still inspect both channels.
export function hitWriteFixture(rows) {
  const writes=[];
  return {writes,prepare(sql){return {bind(...args){return {run:async()=>{
    writes.push({sql,args});
    if(/^INSERT INTO hits\s*\(/i.test(sql))rows.push(args);
    else if(!/^INSERT INTO bpj_traffic_quality\s*\(/i.test(sql))throw Error('Unexpected analytics write');
    return {meta:{changes:1}};
  }};}};}};
}
