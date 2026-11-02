import type { Source } from './types';

/**
 * 数据来源清单（方案 §23、§30）
 * 说明：本项目不打包任何受版权保护的图片、海报或档案扫描件。
 * 所有条目仅保留来源链接、元数据与引用。
 */
export const sources: Source[] = [
  {
    id: 'source_bundestag_weimar',
    title: 'Weimar Republic (1918–1933) — German Bundestag',
    publisher: 'Deutscher Bundestag',
    url: 'https://www.bundestag.de/en/parliament/history/parliamentarism/weimar',
    usage: '宪法结构、总统与总理关系、议会制度、政党系统、总统内阁与第48条背景',
    license_note: '仅引用与转述，不复制页面内容。',
  },
  {
    id: 'source_bundesarchiv_elections',
    title: 'Weimarer Republik — Wahlen (Virtuelle Ausstellung)',
    publisher: 'Bundesarchiv',
    url: 'https://weimar.bundesarchiv.de/WEIMAR/DE/Content/Virtuelle-Ausstellungen/Nach-dem-grossen-Krieg/wahlmarathon.html',
    usage: '全国选举时间、投票率、政府更迭、1932/1933 年选举过程',
    license_note: '档案图像需单独授权，本项目未打包图像。',
  },
  {
    id: 'source_dhm_cabinets',
    title: 'LeMO — Die Kabinette 1919–1933',
    publisher: 'Deutsches Historisches Museum',
    url: 'https://www.dhm.de/lemo/kapitel/weimarer-republik/innenpolitik/kabinette',
    usage: '历届内阁名称、任期、总理、部长与政党构成',
    license_note: '页面标注 CC BY-NC-SA 4.0；本项目仅作事实性引用与改写，不复制原文。',
  },
  {
    id: 'source_ghdi_maps',
    title: 'Interactive Map: Reichstag Elections in the Weimar Republic, 1919–1933',
    publisher: 'German History in Documents and Images (GHDI)',
    url: 'https://germanhistorydocs.org/en/weimar-germany-1918-1933/interactive-map-reichstag-elections-in-the-weimar-republic-1919-1933',
    usage: '选区结果、选举地图、选民资格与比例代表制背景',
    license_note: '仅引用数据与结构，不复制地图图像。',
  },
  {
    id: 'source_ghdi_constitution',
    title: 'The Weimar Constitution (August 11, 1919)',
    publisher: 'GHDI',
    url: 'https://germanhistorydocs.org/en/weimar-germany-1918-1933/the-weimar-constitution-august-11-1919',
    usage: '宪法原始文本、总统与国会权力结构',
    license_note: '1919 年法律文本属公有领域，译文为项目自撰。',
  },
  {
    id: 'source_ushmm_weimar',
    title: 'The Weimar Republic',
    publisher: 'United States Holocaust Memorial Museum',
    url: 'https://encyclopedia.ushmm.org/content/en/article/the-weimar-republic',
    usage: '战后社会、政治暴力、共和国建立与民主制度背景',
    license_note: '仅引用史实，不复制内容。',
  },
  {
    id: 'source_ushmm_article48',
    title: 'Article 48',
    publisher: 'USHMM',
    url: 'https://encyclopedia.ushmm.org/content/en/article/article-48',
    usage: '紧急权力的制度设计、历史使用与对议会权威的影响',
    license_note: '仅引用史实。',
  },
  {
    id: 'source_icpsr42',
    title: 'German Weimar Republic Data, 1919–1933 (ICPSR 42)',
    publisher: 'ICPSR, University of Michigan',
    url: 'https://www.icpsr.umich.edu/web/ICPSR/studies/42',
    usage: '全国及地区选举结果、总统选举、公投与人口数据（需核对获取条件）',
    license_note: '数据集再分发受限，本项目仅使用公开可核验的汇总值。',
  },
  {
    id: 'source_ghdi_dawes',
    title: 'Der Dawes-Plan (1924)',
    publisher: 'GHDI',
    url: 'https://germanhistorydocs.org/de/die-weimarer-republik-1918-1933/der-dawes-plan-1924',
    usage: '赔款安排、货币稳定、国际贷款与鲁尔危机后的经济调整',
    license_note: '仅引用史实。',
  },
  {
    id: 'source_diw_bruening',
    title: 'Austeritätspolitik der Ära Brüning',
    publisher: 'DIW Berlin, Wochenbericht 24/2022',
    url: 'https://www.diw.de/de/diw_01.c.842825.de/publikationen/wochenberichte/2022_24_1/austeritaetspolitik_der_aera_bruening_hat_den_wirtschaftseinbruch_verstaerkt_und_die_arbeitslosigkeit_erhoeht.html',
    usage: '布吕宁时期紧缩政策与经济下行、失业变化关系的研究结论',
    license_note: '作为研究结论与校准参考，不作为唯一解释。',
  },
  {
    id: 'source_kas_elections',
    title: 'Wahlen zum Reichstag in der Weimarer Republik 1919–1933',
    publisher: 'Konrad-Adenauer-Stiftung',
    url: 'https://www.kas.de/de/web/geschichte-der-cdu/wahlen-zum-reichtag-in-der-weimarer-republik-1919-1933-',
    usage: '多次国会选举得票与席位数据（与其他权威来源交叉核验）',
    license_note: '仅引用数据。',
  },
  {
    id: 'source_reichstag_db',
    title: 'Datenbank der deutschen Parlamentsabgeordneten',
    publisher: 'Reichstag-Abgeordnetendatenbank',
    url: 'https://www.reichstag-abgeordnetendatenbank.de/',
    usage: '议员姓名、党籍、选区、任期、职业与议会发言记录',
    license_note: '数据库条目用于事实核验；肖像授权状态需逐项确认，本项目不使用肖像。',
  },
  {
    id: 'source_weimar_whoswho',
    title: 'People — Who’s Who of the Weimar Republic',
    publisher: 'weimarer-republik.net',
    url: 'https://www.weimarer-republik.net/en/weimar-gateway/people-whos-who-of-the-weimar-republic/',
    usage: '总统、总理、部长、军方与政党人物扩展检索',
    license_note: '仅引用事实。',
  },
  {
    id: 'source_bundestag_chancellors',
    title: 'Die Reichskanzler der Weimarer Republik',
    publisher: 'Deutscher Bundestag',
    url: 'https://www.bundestag.de/besuche/ausstellungen/pol_parl/reichskanzler',
    usage: '十二位总理的生平与历史索引',
    license_note: '仅引用事实。',
  },
  {
    id: 'source_project_model',
    title: '本项目模拟参数（非史料）',
    publisher: 'Weimar Republic Simulator',
    url: '',
    usage: '模拟引擎的系数、弹性与行为假设，全部为研究型参数',
    license_note: '属模型假设，不得作为历史事实引用。',
  },
];

export const sourceMap = new Map(sources.map((s) => [s.id, s]));
