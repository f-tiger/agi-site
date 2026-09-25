// Fixed diagnostic vocabulary. Never return SQL, customer data or RPC payloads.
export function failureReason(error) {
  const message = String(error?.reason || error?.message || '');
  if (/^(rpc_http_[1-5][0-9]{2}|rpc_invalid_json|rpc_rejected|wrong_chain|token_precision|chain_unavailable|not_configured)$/.test(message)) return message;
  if (/no such (table|column)/i.test(message)) return 'database_schema';
  if (/quota|limit exceeded|exceeded.*limit|too many.*(requests|rows)/i.test(message)) return 'database_limit';
  if (/D1|SQLITE|database/i.test(message)) return 'database_error';
  if (error?.name === 'TypeError') return 'runtime_type_error';
  if (error?.name === 'AbortError') return 'rpc_timeout';
  return 'internal_error';
}
