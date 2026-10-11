#!/usr/bin/env python3
"""Draw the endpoint membership comparison using Matplotlib, no third-party artwork."""
import argparse
import json
import pathlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Patch

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--summary', type=pathlib.Path, default=pathlib.Path(__file__).with_name('summary.json'))
parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path(__file__).with_name('endpoint-comparison.png'))
parser.add_argument('--font', type=pathlib.Path, help='Optional CJK font file')
args = parser.parse_args()
font_path = args.font or pathlib.Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
if not font_path.exists():
    parser.error('Chinese font not found; pass --font PATH to a CJK font file.')
font_manager.fontManager.addfont(str(font_path))
font = font_manager.FontProperties(fname=str(font_path))
plt.rcParams.update({'font.family':font.get_name(),'axes.unicode_minus':False})
d = json.loads(args.summary.read_text(encoding='utf-8'))
values = [d['totals'][k]['endpoint'] for k in ['ai-drama','comic-drama']]
assert all(v['from']=='2026-10-05' and v['to']=='2026-10-11' for v in values)
common = [v['common'] for v in values]
added = [v['presentAtEndAbsentAtStart'] for v in values]
assert all(a+b==100 for a,b in zip(common,added))

background, ink, green, clay = '#F7F6F2', '#202B31', '#176D69', '#DCA281'
fig = plt.figure(figsize=(14,8.2),dpi=160,facecolor=background)
fig.text(.07,.95,'帧选 · 榜单观察',fontsize=14,color=green,fontweight='bold',va='top')
fig.text(.07,.86,'10 月 11 日的前 100 条，\n有多少也出现在 10 月 5 日？',fontsize=29,color=ink,linespacing=1.25,va='top')
fig.text(.07,.695,'红果官网两个榜单分别比较 · 2026 年 · 按 series_id 对齐，保留分季',fontsize=14,color='#58656A')
ax = fig.add_axes([.16,.325,.77,.285],facecolor=background)
ys = [1,0]
ax.barh(ys,common,height=.40,color=green)
ax.barh(ys,added,left=common,height=.40,color=clay)
for y,a,b in zip(ys,common,added):
    ax.text(a/2,y,f'{a} 条',ha='center',va='center',fontsize=23,color='white',fontweight='bold')
    ax.text(a+b/2,y,f'{b} 条',ha='center',va='center',fontsize=23,color=ink,fontweight='bold')
ax.set_yticks(ys,['AI 剧榜','漫剧榜'],fontsize=17,color=ink)
ax.tick_params(axis='y',length=0,pad=14)
ax.set_xlim(0,100)
ax.set_xticks([0,25,50,75,100],['0','25','50','75','100 条'],fontsize=12,color='#647177')
ax.tick_params(axis='x',length=0,pad=10)
for spine in ax.spines.values():spine.set_visible(False)
ax.legend(handles=[Patch(facecolor=green,label='两个日期均出现'),Patch(facecolor=clay,label='10/11 出现，10/5 未出现')],loc='lower left',bbox_to_anchor=(-.12,-.54),ncol=2,frameon=False,fontsize=14,handlelength=1.5,columnspacing=2.4)
fig.text(.07,.145,'仅比较两次前 100 条样本；不是新剧上线数、播放量或全市场规模。',fontsize=15,color=ink)
fig.text(.07,.098,'原始榜单与分类：红果短剧官网｜采样、对齐与计算：帧选自有研究',fontsize=12,color='#58656A')
fig.text(.07,.060,'采集时刻（北京时间）：10/5 14:15:21；10/11 15:18:52。采样之间的变化未观测。',fontsize=11.5,color='#58656A')
fig.savefig(args.output,dpi=160,facecolor=background,metadata={'Title':'帧选：红果榜单两次TOP100快照成员比较','Author':'帧选','Description':'Samples by series_id, seasons retained. Not new-release count, plays, or market size.'})
print(json.dumps({'output':str(args.output),'pixels':[2240,1312],'common':common,'presentAtEndAbsentAtStart':added,'font':str(font_path)},ensure_ascii=False))
