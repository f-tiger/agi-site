// Only public campaign identifiers issued by the fleet. No free-text UTM input.
export const SOURCES = new Set('youtube tiktok reddit x twitter linkedin threads meta facebook instagram google_business_profile wordpress gutefrage pinterest quora telegram github newsletter email owned owned_social agiscorecard baipiaoji getecoback thedollscout agi bpj eco tds gridlings gamesledger goldrush widget game_embed badge embed package reader_share tool_embed creator-kit agi_for_agents mcp mcp-registry zh_social developer_community'.split(' '));
export const MEDIUMS = new Set('social organic_video owned_video referral organic email newsletter directory site embed iframe copy share deep_page intl_deep_page zh_deep_page future_bet_result agi_type_page post_vote invest_profile leaderboard_streak timeline_tool advertise_page progress_index agi_test_lock agent_hub header post_scorecard footer_cta'.split(' '));
export const CAMPAIGNS = new Set('mentor-report-01 agents eco-cbam-handoff-2026-09-25 relay-friends-01 heatwave2026 calculator heatwave26 bpj-quota-clarity-01 agi_focus_20261001 moisture-decision heat0808 tds-image-01 ce_lite_launch trade agi_evidence_20261002 eco-bonus-01 mcp-server-listing free-tools listing ai-directories mcp-registry open-generative-ai bpj-ai-service-01 agi-timeline-01'.split(' '));
export function campaignFields(query) {
 const q = typeof query === 'string' ? new URLSearchParams(query) : query;
 const out = {};
 for (const [key,field,allowed] of [['utm_source','campaign_source',SOURCES],['utm_medium','campaign_medium',MEDIUMS],['utm_campaign','campaign_name',CAMPAIGNS]]) {
  const values=q.getAll(key);
  if(values.length===1 && allowed.has(values[0]))out[field]=values[0];
 }
 return out;
}
export function validatedCampaign(value) {
 if(!value || typeof value!=='object' || Array.isArray(value))return {};
 const out={};
 for(const [key,allowed] of [['campaign_source',SOURCES],['campaign_medium',MEDIUMS],['campaign_name',CAMPAIGNS]])if(allowed.has(value[key]))out[key]=value[key];
 return out;
}
