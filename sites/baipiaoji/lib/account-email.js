import {ensureAccounts,hash,now,randomToken,normalizeEmail,validEmail} from './free-account.js';

export const EMAIL_VERIFY_SECONDS=86400;
export const EMAIL_RESET_SECONDS=1800;
const MAIL_ENDPOINT='https://api.resend.com/emails';
const ACCOUNT_ORIGIN='https://baipiaoji.com';

export function mailAvailable(env){
 const key=env.RESEND_API_KEY,from=env.ACCOUNT_MAIL_FROM;
 if(!env.HITS||typeof key!=='string'||!key.trim()||typeof from!=='string'||!from.trim()||/[\r\n]/.test(from))return false;
 const address=from.match(/<([^<>]+)>\s*$/)?.[1]||from.trim();
 return validEmail(normalizeEmail(address));
}

export async function ensureAccountEmail(env){
 await ensureAccounts(env);
 await env.HITS.batch([
  env.HITS.prepare(`CREATE TABLE IF NOT EXISTS free_account_email_tokens (
   token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES free_accounts(id) ON DELETE CASCADE,
   email TEXT NOT NULL,action TEXT NOT NULL CHECK(action IN ('verify','reset')),
   version INTEGER NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL,
   state TEXT NOT NULL CHECK(state IN ('pending','ready')),UNIQUE(account_id,action))`),
  env.HITS.prepare('CREATE INDEX IF NOT EXISTS free_account_email_tokens_expiry ON free_account_email_tokens(expires)'),
  env.HITS.prepare('DELETE FROM free_account_email_tokens WHERE expires<=?').bind(now()),
 ]);
}

function mailContent(action,token,lang){
 const path=lang==='en'?'/en/account':'/account';
 const url=`${ACCOUNT_ORIGIN}${path}#email-action=${action}&token=${token}`;
 const verify=action==='verify';
 const subject=verify?'验证白嫖计账户邮箱 / Verify your BPJ email':'重置白嫖计账户密码 / Reset your BPJ password';
 const text=verify?
  `请仅为您自己创建的白嫖计账户验证邮箱。\n请登录申请验证的同一账户，再打开以下链接确认。链接24小时内有效，且只能使用一次：\n${url}\n\n如果不是您本人申请，请忽略此邮件，不要替他人的账户确认。\n\nVerify only a BPJ account you created yourself. Sign in to the same account that requested verification, then open this link to confirm. It expires in 24 hours and can be used once:\n${url}\n\nIf you did not request this, ignore this email. Do not verify an account created by someone else.`:
  `有人申请重置您的白嫖计账户密码。链接30分钟内有效，且只能使用一次：\n${url}\n\n重置成功后，旧登录会话和旧恢复码均失效。请保存页面上显示的新恢复码。\n如果不是您本人申请，请忽略此邮件；您的密码不会因此改变。请勿转发链接。\n\nA password reset was requested for your BPJ account. This link expires in 30 minutes and can be used once:\n${url}\n\nA successful reset revokes existing sessions and the old recovery code. Save the new recovery code shown on the page. If you did not request this, ignore this email; your password is unchanged. Do not share this link.`;
 return {subject,text:text+'\n\n这是一封账户安全事务邮件，不是营销邮件，也不会订阅任何推广。\nThis transactional account-security email is not marketing and does not subscribe you to promotions.'};
}

// The raw token lives only in memory and the controlled mail-provider payload.
// Every new attempt replaces the previous token BEFORE sending. Failure removes
// this attempt; it never restores an older usable token, including on timeouts.
export async function sendAccountEmail(env,user,action,lang){
 if(!mailAvailable(env)||!['verify','reset'].includes(action))return false;
 const token=randomToken(),digest=hash(token),t=now();
 const seconds=action==='verify'?EMAIL_VERIFY_SECONDS:EMAIL_RESET_SECONDS;
 const eligible=action==='reset'?1:0;
 const inserted=await env.HITS.prepare(`INSERT INTO free_account_email_tokens(token_hash,account_id,email,action,version,created,expires,state)
  SELECT ?,a.id,i.email,?,a.session_version,?,?,'pending' FROM free_accounts a
  JOIN free_account_identities i ON i.account_id=a.id
  WHERE a.id=? AND a.session_version=? AND i.email=? AND i.email_verified=?
  ON CONFLICT(account_id,action) DO UPDATE SET token_hash=excluded.token_hash,email=excluded.email,
   version=excluded.version,created=excluded.created,expires=excluded.expires,state='pending'
  RETURNING token_hash`).bind(digest,action,t,t+seconds,user.id,user.session_version,user.email,eligible).first();
 if(!inserted)return false;
 try{
  const content=mailContent(action,token,lang);
  const response=await fetch(MAIL_ENDPOINT,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
   headers:{'Authorization':`Bearer ${env.RESEND_API_KEY.trim()}`,'Content-Type':'application/json','Idempotency-Key':`bpj-account-${action}-${digest}`},
   body:JSON.stringify({from:env.ACCOUNT_MAIL_FROM.trim(),to:[user.email],...content}),
  });
  if(!response.ok)throw Error('mail delivery unavailable');
  const result=await response.json();
  if(typeof result?.id!=='string'||!result.id||result.id.length>128)throw Error('mail delivery unavailable');
  const activated=await env.HITS.prepare(`UPDATE free_account_email_tokens SET state='ready'
   WHERE token_hash=? AND state='pending' AND expires>? AND EXISTS(
    SELECT 1 FROM free_accounts a JOIN free_account_identities i ON i.account_id=a.id
    WHERE a.id=free_account_email_tokens.account_id AND a.session_version=free_account_email_tokens.version
     AND i.email=free_account_email_tokens.email AND i.email_verified=?) RETURNING token_hash`).bind(digest,now(),eligible).first();
  if(!activated)throw Error('mail delivery unavailable');
  return true;
 }catch{
  await env.HITS.prepare('DELETE FROM free_account_email_tokens WHERE token_hash=?').bind(digest).run();
  return false;
 }
}

export async function emailToken(env,token,action){
 return await env.HITS.prepare(`SELECT t.token_hash,t.account_id,t.email,t.version FROM free_account_email_tokens t
  JOIN free_accounts a ON a.id=t.account_id AND a.session_version=t.version
  JOIN free_account_identities i ON i.account_id=t.account_id AND i.email=t.email
  WHERE t.token_hash=? AND t.action=? AND t.state='ready' AND t.expires>? AND i.email_verified=?`)
  .bind(hash(token),action,now(),action==='reset'?1:0).first()||null;
}
