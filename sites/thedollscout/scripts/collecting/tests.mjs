import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isRetiredPath,RETIRED_PREFIXES} from '../../functions/retired-paths.mjs';
import {isHubPath} from '../../document-assets/hub-core.mjs';
test('retired routes remain gone across old aliases, language prefixes and encoded paths',()=>{
 for(const prefix of RETIRED_PREFIXES)for(const locale of ['','/en','/de','/zh','/th'])for(const suffix of ['','/','.html','/archived-page'])assert.equal(isRetiredPath(locale+prefix+suffix),true);
 for(const p of ['/VENDORS/old','/%76endors/old','/de/%2576endors/old','//guides//old','/vendors.htm'])assert.equal(isRetiredPath(p),true,p);
 for(const p of ['/','/de/','/brands/jellycat','/mcp','/llms-full.txt','/collector-guide','/document-tools','/pdf-to-text','/workbench/collectorledger','/api/member','/guides-new'])assert.equal(isRetiredPath(p),false,p);
});
test('digital hub moves without dropping historical aggregate support',()=>{
 for(const p of ['/document-tools','/de/document-tools','/zh/document-tools','/','/de/'])assert.equal(isHubPath(p),true);
 for(const p of ['/brands/jellycat','/image-compressor','/document-tools?file=secret'])assert.equal(isHubPath(p),false);
});
