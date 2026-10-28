-- ENG-088 / ORG-068. ABS-01--08/12/13/15, PRV-04/05, SEC-01/02/06.
-- Review-only; no seeds, activation, hosted apply, scoring or mail changes.
begin;
alter table msrc_abstracts.submissions drop constraint submissions_word_count_check,
 add constraint submissions_word_count_check check(word_count between 0 and 350);
alter table msrc_abstracts.snapshots drop constraint snapshots_word_count_check,
 add constraint snapshots_word_count_check check(word_count between 1 and 350);
-- pi_key remains only for historical audit/reader compatibility, never eligibility.
comment on column msrc_abstracts.submissions.pi_key is 'Historical pre-ORG-068 PI identifier only; new submissions do not populate it or enforce a PI limit.';
drop index msrc_abstracts.abstract_pi;

-- Six fixed single-word headings count even in an incomplete draft. Unicode ranges/whitespace are unchanged.
create or replace function msrc_abstracts.word_count(body jsonb) returns integer language sql immutable security invoker set search_path='' as $$
 select 6+count(*)::integer from regexp_split_to_table(
 translate(coalesce(body->>'background','')||' '||coalesce(body->>'objectives',body->>'aim','')||' '||coalesce(body->>'methods','')||' '||coalesce(body->>'results','')||' '||coalesce(body->>'limitations','')||' '||coalesce(body->>'conclusion',''),
 U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF',repeat(' ',19)),
 E'[ \t\n\r\f\013]+') token where token ~ '[0-9A-Za-zª²-³µ¹-º¼-¾À-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶ-ͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙՠ-ֈא-תׯ-ײؠ-ي٠-٩ٮ-ٯٱ-ۓەۥ-ۦۮ-ۼۿܐܒ-ܯݍ-ޥޱ߀-ߪߴ-ߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࡠ-ࡪࡰ-ࢇࢉ-࢏ࢠ-ࣉऄ-हऽॐक़-ॡ०-९ॱ-ঀঅ-ঌএ-ঐও-নপ-রলশ-হঽৎড়-ঢ়য়-ৡ০-ৱ৴-৹ৼਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹਖ਼-ੜਫ਼੦-੯ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હઽૐૠ-ૡ૦-૯ૹଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହଽଡ଼-ଢ଼ୟ-ୡ୦-୯ୱ-୷ஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹௐ௦-௲అ-ఌఎ-ఐఒ-నప-హఽౘ-ౚ౜-ౝౠ-ౡ౦-౯౸-౾ಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽ೜-ೞೠ-ೡ೦-೯ೱ-ೲഄ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖ൘-ൡ൦-൸ൺ-ൿඅ-ඖක-නඳ-රලව-ෆ෦-෯ก-ะา-ำเ-ๆ๐-๙ກ-ຂຄຆ-ຊຌ-ຣລວ-ະາ-ຳຽເ-ໄໆ໐-໙ໜ-ໟༀ༠-༳ཀ-ཇཉ-ཬྈ-ྌက-ဪဿ-၉ၐ-ၕၚ-ၝၡၥ-ၦၮ-ၰၵ-ႁႎ႐-႙Ⴀ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፩-፼ᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜑᜟ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜ០-៩៰-៹᠐-᠙ᠠ-ᡸᢀ-ᢄᢇ-ᢨᢪᢰ-ᣵᤀ-ᤞ᥆-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉ᧐-᧚ᨀ-ᨖᨠ-ᩔ᪀-᪉᪐-᪙ᪧᬅ-ᬳᭅ-ᭌ᭐-᭙ᮃ-ᮠᮮ-ᯥᰀ-ᰣ᱀-᱉ᱍ-ᱽᲀ-ᲊᲐ-ᲺᲽ-Ჿᳩ-ᳬᳮ-ᳳᳵ-ᳶᳺᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ⁰-ⁱ⁴-⁹ⁿ-₉ₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎ⅐-↉①-⒛⓪-⓿❶-➓Ⰰ-ⳤⳫ-ⳮⳲ-ⳳ⳽ⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々-〇〡-〩〱-〵〸-〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎ㆒-㆕ㆠ-ㆿㇰ-ㇿ㈠-㈩㉈-㉏㉑-㉟㊀-㊉㊱-㊿㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-Ƛ꟱-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢ꠰-꠵ꡀ-ꡳꢂ-ꢳ꣐-꣙ꣲ-ꣷꣻꣽ-ꣾ꤀-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏ-꧙ꧠ-ꧤꧦ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋ꩐-꩙ꩠ-ꩶꩺꩾ-ꪯꪱꪵ-ꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯢ꯰-꯹가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ𐀀-𐀋𐀍-𐀦𐀨-𐀺𐀼-𐀽𐀿-𐁍𐁐-𐁝𐂀-𐃺𐄇-𐄳𐅀-𐅸𐆊-𐆋𐊀-𐊜𐊠-𐋐𐋡-𐋻𐌀-𐌣𐌭-𐍊𐍐-𐍵𐎀-𐎝𐎠-𐏃𐏈-𐏏𐏑-𐏕𐐀-𐒝𐒠-𐒩𐒰-𐓓𐓘-𐓻𐔀-𐔧𐔰-𐕣𐕰-𐕺𐕼-𐖊𐖌-𐖒𐖔-𐖕𐖗-𐖡𐖣-𐖱𐖳-𐖹𐖻-𐖼𐗀-𐗳𐘀-𐜶𐝀-𐝕𐝠-𐝧𐞀-𐞅𐞇-𐞰𐞲-𐞺𐠀-𐠅𐠈𐠊-𐠵𐠷-𐠸𐠼𐠿-𐡕𐡘-𐡶𐡹-𐢞𐢧-𐢯𐣠-𐣲𐣴-𐣵𐣻-𐤛𐤠-𐤹𐥀-𐥙𐦀-𐦷𐦼-𐧏𐧒-𐨀𐨐-𐨓𐨕-𐨗𐨙-𐨵𐩀-𐩈𐩠-𐩾𐪀-𐪟𐫀-𐫇𐫉-𐫤𐫫-𐫯𐬀-𐬵𐭀-𐭕𐭘-𐭲𐭸-𐮑𐮩-𐮯𐰀-𐱈𐲀-𐲲𐳀-𐳲𐳺-𐴣𐴰-𐴹𐵀-𐵥𐵯-𐶅𐹠-𐹾𐺀-𐺩𐺰-𐺱𐻂-𐻇𐼀-𐼧𐼰-𐽅𐽑-𐽔𐽰-𐾁𐾰-𐿋𐿠-𐿶𑀃-𑀷𑁒-𑁯𑁱-𑁲𑁵𑂃-𑂯𑃐-𑃨𑃰-𑃹𑄃-𑄦𑄶-𑄿𑅄𑅇𑅐-𑅲𑅶𑆃-𑆲𑇁-𑇄𑇐-𑇚𑇜𑇡-𑇴𑈀-𑈑𑈓-𑈫𑈿-𑉀𑊀-𑊆𑊈𑊊-𑊍𑊏-𑊝𑊟-𑊨𑊰-𑋞𑋰-𑋹𑌅-𑌌𑌏-𑌐𑌓-𑌨𑌪-𑌰𑌲-𑌳𑌵-𑌹𑌽𑍐𑍝-𑍡𑎀-𑎉𑎋𑎎𑎐-𑎵𑎷𑏑𑏓𑐀-𑐴𑑇-𑑊𑑐-𑑙𑑟-𑑡𑒀-𑒯𑓄-𑓅𑓇𑓐-𑓙𑖀-𑖮𑗘-𑗛𑘀-𑘯𑙄𑙐-𑙙𑚀-𑚪𑚸𑛀-𑛉𑛐-𑛣𑜀-𑜚𑜰-𑜻𑝀-𑝆𑠀-𑠫𑢠-𑣲𑣿-𑤆𑤉𑤌-𑤓𑤕-𑤖𑤘-𑤯𑤿𑥁𑥐-𑥙𑦠-𑦧𑦪-𑧐𑧡𑧣𑨀𑨋-𑨲𑨺𑩐𑩜-𑪉𑪝𑪰-𑫸𑯀-𑯠𑯰-𑯹𑰀-𑰈𑰊-𑰮𑱀𑱐-𑱬𑱲-𑲏𑴀-𑴆𑴈-𑴉𑴋-𑴰𑵆𑵐-𑵙𑵠-𑵥𑵧-𑵨𑵪-𑶉𑶘𑶠-𑶩𑶰-𑷛𑷠-𑷩𑻠-𑻲𑼂𑼄-𑼐𑼒-𑼳𑽐-𑽙𑾰𑿀-𑿔𒀀-𒎙𒐀-𒑮𒒀-𒕃𒾐-𒿰𓀀-𓐯𓑁-𓑆𓑠-𔏺𔐀-𔙆𖄀-𖄝𖄰-𖄹𖠀-𖨸𖩀-𖩞𖩠-𖩩𖩰-𖪾𖫀-𖫉𖫐-𖫭𖬀-𖬯𖭀-𖭃𖭐-𖭙𖭛-𖭡𖭣-𖭷𖭽-𖮏𖵀-𖵬𖵰-𖵹𖹀-𖺖𖺠-𖺸𖺻-𖻓𖼀-𖽊𖽐𖾓-𖾟𖿠-𖿡𖿣𖿲-𖿶𗀀-𘳕𘳿-𘴞𘶀-𘷲𚿰-𚿳𚿵-𚿻𚿽-𚿾𛀀-𛄢𛄲𛅐-𛅒𛅕𛅤-𛅧𛅰-𛋻𛰀-𛱪𛱰-𛱼𛲀-𛲈𛲐-𛲙𜳰-𜳹𝋀-𝋓𝋠-𝋳𝍠-𝍸𝐀-𝑔𝑖-𝒜𝒞-𝒟𝒢𝒥-𝒦𝒩-𝒬𝒮-𝒹𝒻𝒽-𝓃𝓅-𝔅𝔇-𝔊𝔍-𝔔𝔖-𝔜𝔞-𝔹𝔻-𝔾𝕀-𝕄𝕆𝕊-𝕐𝕒-𝚥𝚨-𝛀𝛂-𝛚𝛜-𝛺𝛼-𝜔𝜖-𝜴𝜶-𝝎𝝐-𝝮𝝰-𝞈𝞊-𝞨𝞪-𝟂𝟄-𝟋𝟎-𝟿𝼀-𝼞𝼥-𝼪𞀰-𞁭𞄀-𞄬𞄷-𞄽𞅀-𞅉𞅎𞊐-𞊭𞋀-𞋫𞋰-𞋹𞓐-𞓫𞓰-𞓹𞗐-𞗭𞗰-𞗺𞛀-𞛞𞛠-𞛢𞛤-𞛥𞛧-𞛭𞛰-𞛴𞛾-𞛿𞟠-𞟦𞟨-𞟫𞟭-𞟮𞟰-𞟾𞠀-𞣄𞣇-𞣏𞤀-𞥃𞥋𞥐-𞥙𞱱-𞲫𞲭-𞲯𞲱-𞲴𞴁-𞴭𞴯-𞴽𞸀-𞸃𞸅-𞸟𞸡-𞸢𞸤𞸧𞸩-𞸲𞸴-𞸷𞸹𞸻𞹂𞹇𞹉𞹋𞹍-𞹏𞹑-𞹒𞹔𞹗𞹙𞹛𞹝𞹟𞹡-𞹢𞹤𞹧-𞹪𞹬-𞹲𞹴-𞹷𞹹-𞹼𞹾𞺀-𞺉𞺋-𞺛𞺡-𞺣𞺥-𞺩𞺫-𞺻🄀-🄌🯰-🯹𠀀-𪛟𪜀-𫠝𫠠-𬺭𬺰-𮯠𮯰-𮹝丽-𪘀𰀀-𱍊𱍐-𳑹]';
$$;

create function msrc_abstracts.document_projection(d jsonb) returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select case when d ? 'analysisComplete' then d else
 (d-array['completionStatus','keywords','piAuthorId','correspondingAuthorId','ethicsStatus','ethicsExplanation']) || jsonb_build_object(
 'studyTypeOther','','analysisComplete',false,
 'body',jsonb_build_object('background',coalesce(d->'body'->>'background',''),'objectives',coalesce(d->'body'->>'objectives',d->'body'->>'aim',''),
 'methods',coalesce(d->'body'->>'methods',''),'results',coalesce(d->'body'->>'results',''),'limitations',coalesce(d->'body'->>'limitations',''),'conclusion',coalesce(d->'body'->>'conclusion','')),
 'supervisor',jsonb_build_object('fullName','','email','','phone',''),
 'ethics',jsonb_build_object('status',case when d->>'ethicsStatus'='approval_required' then 'approved' else coalesce(d->>'ethicsStatus','not_required') end,'committee','','reference','','explanation',coalesce(d->>'ethicsExplanation','')),
 'registration',jsonb_build_object('status','not_applicable','registry','','number',''),
 'englishConfirmed',false,'integrityConfirmed',false,'singlePresenterConfirmed',false,'oneSubmissionConfirmed',false) end;
$$;
-- Other competitions share only the tokenizer. They have no abstract headings.
create or replace function msrc_competitions.word_count(pitch text) returns integer
 language sql immutable security invoker set search_path='' as $$
 select msrc_abstracts.word_count(jsonb_build_object('background',coalesce(pitch,'')))-6;
$$;
create function msrc_abstracts.packet_projection(p jsonb) returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('title',p->'title','body',msrc_abstracts.document_projection(p)->'body',
 'specialtyId',p->'specialtyId','studyTypeId',p->'studyTypeId','studyTypeOther',coalesce(p->>'studyTypeOther',''),
 'analysisComplete',coalesce(p->'analysisComplete','false'::jsonb));
$$;
-- Mutable drafts are upgraded; immutable finalized records/snapshots/packets are
-- never rewritten. Readers project legacy fields at their private boundary.
update msrc_abstracts.submissions s set document=msrc_abstracts.document_projection(s.document),
 word_count=msrc_abstracts.word_count(msrc_abstracts.document_projection(s.document)->'body')
 where s.finalized_at is null and s.status='draft' and not(s.document ? 'analysisComplete');
-- Preserve surplus historical draft content as withdrawn private records, with an
-- immutable audit receipt. They were never finalized and do not consume a chance.
with ranked as (select id,row_number() over(partition by edition_key,actor_id order by created_at desc,id) n
 from msrc_abstracts.submissions where status='draft'), archived as (
 update msrc_abstracts.submissions s set status='withdrawn' from ranked r where s.id=r.id and r.n>1 returning s.*)
insert into msrc_abstracts.audit(edition_key,actor_id,event,target_id,details)
 select edition_key,actor_id,'draft.superseded',id,jsonb_build_object('reason','ORG-068 one draft; content retained privately') from archived;
create unique index abstract_one_draft on msrc_abstracts.submissions(edition_key,actor_id) where status='draft';

create function msrc_abstracts.presenter_eligible(actor uuid,edition text) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from msrc_participant.profile_details p where p.actor_id=actor and p.edition_key=edition
 and p.student_status in('year_1','year_2','year_3','year_4','year_5','year_6','internship','clinical_placement'));
$$;
-- Submission entry needs approved operational instants, not the PR-2 review
-- configuration or obsolete configurable taxonomy/keyword/author policies.
create function msrc_abstracts.submission_settings_ready(c jsonb) returns boolean
 language sql stable security invoker set search_path='' as $$
 select msrc_abstracts.settings_valid(c,false) and c->>'opensAt' is not null and c->>'closesAt' is not null;
$$;
create or replace function msrc_abstracts.participant_settings(edition text) returns jsonb language sql volatile security invoker set search_path='' as $$
 select jsonb_build_object('specialties',c->'specialties','studyTypes',c->'studyTypes','keywordCount',c->'keywordCount','opensAt',c->'opensAt','closesAt',c->'closesAt',
 'correspondingAuthorPolicy',c->'correspondingAuthorPolicy','windowState',case when not msrc_abstracts.submission_settings_ready(c) or not coalesce(s.evidence_ready,false) then 'not_ready'
 when coalesce(s.enabled,false) and clock_timestamp()>=(c->>'opensAt')::timestamptz and clock_timestamp()<(c->>'closesAt')::timestamptz then 'open' else 'closed' end)
 from (select coalesce((select configuration from msrc_abstracts.settings where edition_key=edition),msrc_abstracts.settings_defaults()) c) x
 left join msrc_abstracts.settings s on s.edition_key=edition;
$$;

-- Institution labels mirror the already approved profile catalog; profile
-- specialty interests and their existing settings-dependent completeness remain unchanged.
create function msrc_abstracts.presenter(actor uuid,edition text) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.actor_id,'name',p.name,'email',u.email,
 'institution',coalesce(d.institution_other,('{"umm-al-qura":"Umm Al-Qura University","islamic-university-madinah":"Islamic University of Madinah","imam-muhammad-bin-saud":"Imam Muhammad bin Saud Islamic University","king-saud":"King Saud University","king-abdulaziz":"King Abdulaziz University","king-fahd-petroleum-minerals":"King Fahd University of Petroleum and Minerals","king-faisal":"King Faisal University","king-khalid":"King Khalid University","qassim":"Qassim University","taibah":"Taibah University","taif":"Taif University","hail":"University of Ha''il","jazan":"Jazan University","jouf":"Jouf University","al-baha":"Al-Baha University","tabuk":"University of Tabuk","najran":"Najran University","northern-border":"Northern Border University","princess-nourah":"Princess Nourah Bint Abdul Rahman University","king-saud-health-sciences":"King Saud bin Abdulaziz University for Health Sciences","imam-abdulrahman-bin-faisal":"Imam Abdulrahman bin Faisal University","prince-sattam":"Prince Sattam bin Abdulaziz University","shaqra":"Shaqra University","majmaah":"Majmaah University","saudi-electronic":"Saudi Electronic University","jeddah":"University of Jeddah","bisha":"University of Bisha","king-abdullah-science-technology":"King Abdullah University of Science and Technology","hafr-al-batin":"University of Hafr Al Batin","arab-open":"Arab Open University","business-technology":"University of Business and Technology","prince-sultan":"Prince Sultan University","fahad-bin-sultan":"Fahad bin Sultan University","prince-mohammad-bin-fahd":"Prince Mohammad bin Fahd University","prince-mugrin":"University of Prince Mugrin","alfaisal":"Alfaisal University","al-yamamah":"Al Yamamah University","dar-al-uloom":"Dar Al Uloom University","effat":"Effat University","dar-al-hekma":"Dar Al-Hekma University","riyadh-elm":"Riyadh Elm University","al-maarefa":"Al Maarefa University","mustaqbal":"Mustaqbal University","sulaiman-al-rajhi":"Sulaiman Al Rajhi University","ibn-sina":"Ibn Sina National College","batterjee-medical":"Batterjee Medical College","al-riyada-health":"Al-Riyada College for Health Science","al-rayan":"Al-Rayan College","inaya-medical":"Inaya Medical Colleges","al-ghad-medical":"Al Ghad International College for Applied Medical Science","vision-jeddah":"Vision Colleges in Jeddah","vision-riyadh":"Vision Colleges in Riyadh","buraydah-colleges":"Buraydah College","saad-nursing-health":"Saad College of Nursing and Allied Health Sciences","fakeeh-medical":"Fakeeh College for Medical Science","mohammed-al-mana-medical":"Mohammed Al Mana College for Medical Science","northern-nursing":"Northern College of Nursing","almoosa-health":"Almoosa College of Health Science"}'::jsonb)->>d.institution_id,''),'status',d.student_status)
 from msrc_participant.profiles p join auth.users u on u.id=p.actor_id
 left join msrc_participant.profile_details d on d.actor_id=p.actor_id and d.edition_key=edition where p.actor_id=actor;
$$;
create function msrc_abstracts.bind_presenter(d jsonb,actor uuid,edition text) returns jsonb
 language sql stable security definer set search_path='' as $$
 select d||jsonb_build_object('presentingAuthorId',actor,'authors',jsonb_build_array(jsonb_build_object('id',actor,'name',p->>'name','email',p->>'email',
 'affiliations',case when p->>'institution'='' then '[]'::jsonb else jsonb_build_array(p->>'institution') end))||
 coalesce((select jsonb_agg(a order by n) from jsonb_array_elements(d->'authors') with ordinality x(a,n)
 where a->>'id'<>actor::text and a->>'id' is distinct from d->>'presentingAuthorId'),'[]'::jsonb))
 from (select msrc_abstracts.presenter(actor,edition) p) q;
$$;

create or replace function msrc_abstracts.document_valid(d jsonb,c jsonb,finalizing boolean) returns boolean
 language plpgsql stable security invoker set search_path='' as $$
declare k text;a jsonb;begin
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>262144 or d<>jsonb_build_object(
 'title',d->'title','specialtyId',d->'specialtyId','studyTypeId',d->'studyTypeId','studyTypeOther',d->'studyTypeOther','analysisComplete',d->'analysisComplete',
 'body',d->'body','authors',d->'authors','presentingAuthorId',d->'presentingAuthorId','supervisor',d->'supervisor','ethics',d->'ethics','registration',d->'registration',
 'conflictOfInterest',d->'conflictOfInterest','fundingDeclaration',d->'fundingDeclaration','authorityConfirmed',d->'authorityConfirmed',
 'englishConfirmed',d->'englishConfirmed','integrityConfirmed',d->'integrityConfirmed','singlePresenterConfirmed',d->'singlePresenterConfirmed','oneSubmissionConfirmed',d->'oneSubmissionConfirmed') then return false;end if;
 foreach k in array array['title','specialtyId','studyTypeId','studyTypeOther','conflictOfInterest','fundingDeclaration'] loop
 if jsonb_typeof(d->k) is distinct from 'string' or char_length(d->>k)>6000 then return false;end if;end loop;
 if char_length(d->>'studyTypeOther')>80 or msrc_abstracts.word_count(jsonb_build_object('background',d->>'title'))-6>20 then return false;end if;
 if d->>'specialtyId'<>'' and (d->>'specialtyId')<>all(array['internal_medicine','general_surgery','pediatrics','obstetrics_and_gynecology','family_medicine','emergency_medicine','anesthesiology','dermatology','psychiatry','neurology','neurosurgery','orthopedic_surgery','plastic_and_reconstructive_surgery','urology','ophthalmology','otolaryngology_ent','cardiothoracic_surgery','vascular_surgery','thoracic_surgery','pediatric_surgery','surgical_oncology']) then return false;end if;
 if d->>'studyTypeId'<>'' and (d->>'studyTypeId')<>all(array['retrospective_cohort','prospective_cohort','cross_sectional','case_control','randomized_controlled_trial','quasi_experimental','systematic_review_meta_analysis','qualitative','case_report_series','other']) then return false;end if;
 foreach k in array array['analysisComplete','authorityConfirmed','englishConfirmed','integrityConfirmed','singlePresenterConfirmed','oneSubmissionConfirmed'] loop
 if jsonb_typeof(d->k) is distinct from 'boolean' or finalizing and d->>k<>'true' then return false;end if;end loop;
 if jsonb_typeof(d->'body') is distinct from 'object' or d->'body'<>jsonb_build_object('background',d->'body'->'background','objectives',d->'body'->'objectives','methods',d->'body'->'methods','results',d->'body'->'results','limitations',d->'body'->'limitations','conclusion',d->'body'->'conclusion') then return false;end if;
 foreach k in array array['background','objectives','methods','results','limitations','conclusion'] loop
 if jsonb_typeof(d->'body'->k) is distinct from 'string' or finalizing and msrc_abstracts.word_count(jsonb_build_object('background',d->'body'->>k))=6 then return false;end if;end loop;
 if msrc_abstracts.word_count(d->'body')>350 or jsonb_typeof(d->'authors') is distinct from 'array' then return false;end if;
 for a in select value from jsonb_array_elements(d->'authors') loop
 if a<>jsonb_build_object('id',a->'id','name',a->'name','email',a->'email','affiliations',a->'affiliations')
 or coalesce(a->>'id','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
 or jsonb_typeof(a->'name') is distinct from 'string' or char_length(a->>'name')>500
 or jsonb_typeof(a->'email') is distinct from 'string' or char_length(a->>'email')>254
 or (finalizing and a->>'email'<>'' and (a->>'email')!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
 or jsonb_typeof(a->'affiliations') is distinct from 'array' then return false;end if;
 if exists(select 1 from jsonb_array_elements(a->'affiliations') v where jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>500) then return false;end if;
 if finalizing and (btrim(a->>'name')='' or jsonb_array_length(a->'affiliations')=0 or exists(select 1 from jsonb_array_elements_text(a->'affiliations') v where btrim(v)='')) then return false;end if;
 end loop;
 if (select count(*)<>count(distinct lower(v->>'id')) from jsonb_array_elements(d->'authors') v) then return false;end if;
 if d->'presentingAuthorId'<>'null'::jsonb and (jsonb_typeof(d->'presentingAuthorId') is distinct from 'string' or not exists(select 1 from jsonb_array_elements(d->'authors') person where person->>'id'=d->>'presentingAuthorId')) then return false;end if;
 a:=d->'supervisor';
 if jsonb_typeof(a) is distinct from 'object' or a<>jsonb_build_object('fullName',a->'fullName','email',a->'email','phone',a->'phone') then return false;end if;
 foreach k in array array['fullName','email','phone'] loop if jsonb_typeof(a->k) is distinct from 'string' or char_length(a->>k)>500 or finalizing and btrim(a->>k)='' then return false;end if;end loop;
 if finalizing and (a->>'email'<>'' and (a->>'email')!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or a->>'phone'<>'' and (a->>'phone')!~'^\+[1-9][0-9]{1,14}$') then return false;end if;
 a:=d->'ethics';
 if jsonb_typeof(a) is distinct from 'object' or a<>jsonb_build_object('status',a->'status','committee',a->'committee','reference',a->'reference','explanation',a->'explanation') or (a->>'status') not in('approved','exempt','not_required') then return false;end if;
 foreach k in array array['status','committee','reference','explanation'] loop if jsonb_typeof(a->k) is distinct from 'string' or char_length(a->>k)>6000 then return false;end if;end loop;
 if finalizing and (a->>'status'='approved' and (btrim(a->>'committee')='' or btrim(a->>'reference')='') or a->>'status'='exempt' and btrim(a->>'reference')='' and btrim(a->>'explanation')='' or a->>'status'='not_required' and btrim(a->>'explanation')='') then return false;end if;
 a:=d->'registration';
 if jsonb_typeof(a) is distinct from 'object' or a<>jsonb_build_object('status',a->'status','registry',a->'registry','number',a->'number') or (a->>'status') not in('registered','not_applicable') then return false;end if;
 foreach k in array array['status','registry','number'] loop if jsonb_typeof(a->k) is distinct from 'string' or char_length(a->>k)>6000 then return false;end if;end loop;
 if finalizing and (btrim(d->>'title')='' or d->>'specialtyId'='' or d->>'studyTypeId'='' or d->>'studyTypeId'='other' and btrim(d->>'studyTypeOther')=''
 or jsonb_array_length(d->'authors')=0 or d->>'presentingAuthorId' is null or btrim(d->>'conflictOfInterest')='' or btrim(d->>'fundingDeclaration')=''
 or a->>'status'='registered' and (btrim(a->>'registry')='' or btrim(a->>'number')='')) then return false;end if;
 return true;
end$$;

create or replace function msrc_abstracts.projection(s msrc_abstracts.submissions) returns jsonb language sql volatile security invoker set search_path='' as $$
 select jsonb_build_object('id',s.id,'reference',s.reference,'status',case when s.status='revision_requested' and s.revision_deadline<=clock_timestamp() then 'revision_expired' else s.status end,
 'version',s.version,'document',msrc_abstracts.document_projection(s.document),'wordCount',msrc_abstracts.word_count(s.document->'body'),'finalizedAt',s.finalized_at,'decision',
 (select jsonb_build_object('outcome',d.outcome,'instructions',d.instructions,'revisionDeadline',d.revision_deadline,
 'permittedFields',case when d.outcome='revise' then '[]'::jsonb else '[]'::jsonb end)
 from msrc_abstracts.decisions d join msrc_abstracts.publications p on p.decision_id=d.id where d.submission_id=s.id order by p.published_at desc,d.id desc limit 1));
$$;
create or replace function public.msrc_abstracts_status(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
begin
 perform msrc_abstracts.guard();perform msrc_registration.server_only();
 return jsonb_build_object('documentVersion',2,'enabled',coalesce((select enabled from msrc_abstracts.settings s where s.edition_key=edition_key),false),
 'settingsComplete',coalesce((select msrc_abstracts.submission_settings_ready(configuration) and evidence_ready from msrc_abstracts.settings s where s.edition_key=edition_key),false),
 'evidenceGate','virus_scanning_and_evidence_pending');
end$$;
create or replace function msrc_abstracts.participant(edition text,action text,submission_id uuid,expected_version integer,d jsonb,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_abstracts.settings%rowtype;s msrc_abstracts.submissions%rowtype;result jsonb;previous msrc_abstracts.operations%rowtype;budget msrc_abstracts.mutation_limits%rowtype;
 input bytea;reference_number bigint;window_open boolean;begin
 perform 1 from msrc_authorization.account_access a where a.actor_id=auth.uid() for share;
 perform 1 from auth.users u where u.id=auth.uid() for share;
 if not msrc_participant.ready() then return jsonb_build_object('state','closed');end if;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 if action='me' then
 select coalesce(jsonb_agg(msrc_abstracts.projection(q) order by q.created_at desc,q.id),'[]'::jsonb) into result from msrc_abstracts.submissions q where q.edition_key=edition and q.actor_id=auth.uid();
 return jsonb_build_object('state','ready','settings',msrc_abstracts.participant_settings(edition),'submissions',result,'presenter',msrc_abstracts.presenter(auth.uid(),edition));end if;
 if operation_id is null or expected_version is null or expected_version<0 then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('abstract-operation:'||edition||':'||auth.uid()::text||':'||operation_id::text,0));
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 input:=sha256(convert_to(jsonb_build_array(action,submission_id,expected_version,d)::text,'UTF8'));
 select * into previous from msrc_abstracts.operations o where o.edition_key=edition and o.actor_id=auth.uid() and o.operation_id=operation_id;
 if found then if previous.input_hash<>input then return jsonb_build_object('state','conflict');end if;return previous.result;end if;
 insert into msrc_abstracts.mutation_limits values(auth.uid(),clock_timestamp(),1)
 on conflict on constraint mutation_limits_pkey do update set
 window_started_at=case when msrc_abstracts.mutation_limits.window_started_at<=clock_timestamp()-interval '1 minute' then clock_timestamp() else msrc_abstracts.mutation_limits.window_started_at end,
 used=case when msrc_abstracts.mutation_limits.window_started_at<=clock_timestamp()-interval '1 minute' then 1 else least(61,msrc_abstracts.mutation_limits.used+1) end returning * into budget;
 if budget.used>60 then
 if not exists(select 1 from msrc_abstracts.audit a where a.actor_id=auth.uid() and a.event='mutation.limited' and a.created_at>=budget.window_started_at) then
 perform msrc_abstracts.record(edition,'mutation.limited',null);end if;return jsonb_build_object('state','limited');end if;
 -- Settings and window are re-read after lock acquisition. This serializes settings, finalization and edition references.
 select * into cfg from msrc_abstracts.settings q where q.edition_key=edition for update;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 if cfg.edition_key is null or not cfg.enabled or not msrc_abstracts.submission_settings_ready(cfg.configuration) or msrc_participant.profile_expired(edition) then return jsonb_build_object('state','closed');end if;
 window_open:=clock_timestamp()>=(cfg.configuration->>'opensAt')::timestamptz and clock_timestamp()<(cfg.configuration->>'closesAt')::timestamptz;
 if submission_id is not null then
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition and q.actor_id=auth.uid() for update;
 if not found then return jsonb_build_object('state','denied');end if;
 if s.version<>expected_version then return jsonb_build_object('state','conflict');end if;

 if s.status<>'draft' and s.finalized_at is null then return jsonb_build_object('state','locked');end if;

 elsif expected_version<>0 or action<>'save' then return jsonb_build_object('state','invalid');end if;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 window_open:=clock_timestamp()>=(cfg.configuration->>'opensAt')::timestamptz and clock_timestamp()<(cfg.configuration->>'closesAt')::timestamptz;
 if not window_open then return jsonb_build_object('state','closed');end if;
 -- Actor/edition locking serializes independent operation ids, single-draft creation
 -- and chance consumption. The settings-row lock is acquired first throughout.
 perform pg_advisory_xact_lock(hashtextextended('abstract-participant:'||edition||':'||auth.uid()::text,0));
 if action='finalize' then
 if not msrc_participant.profile_submission_gate(auth.uid(),edition) then return jsonb_build_object('state','profile_incomplete');end if;
 if not msrc_abstracts.presenter_eligible(auth.uid(),edition) then return jsonb_build_object('state','presenter_ineligible');end if;
 end if;
 if exists(select 1 from msrc_abstracts.submissions q where q.edition_key=edition and q.actor_id=auth.uid() and q.finalized_at is not null) then return jsonb_build_object('state','submission_used');end if;
 if action='save' then
 if not msrc_abstracts.document_valid(d,cfg.configuration,false) then return jsonb_build_object('state','invalid');end if;
 d:=msrc_abstracts.bind_presenter(d,auth.uid(),edition);
 if not msrc_abstracts.document_valid(d,cfg.configuration,false) then return jsonb_build_object('state','invalid');end if;
 if s.id is null and exists(select 1 from msrc_abstracts.submissions q where q.edition_key=edition and q.actor_id=auth.uid() and q.status='draft') then return jsonb_build_object('state','conflict');end if;
 if s.id is null then
 insert into msrc_abstracts.submissions(edition_key,actor_id,version,document,word_count) values(edition,auth.uid(),1,d,msrc_abstracts.word_count(d->'body')) returning * into s;
 else update msrc_abstracts.submissions q set document=d,word_count=msrc_abstracts.word_count(d->'body'),version=q.version+1 where q.id=s.id returning * into s;end if;
 perform msrc_abstracts.record(edition,'draft.saved',s.id,jsonb_build_object('version',s.version));
 result:=jsonb_build_object('state','saved','submission',msrc_abstracts.projection(s));
 elsif action='finalize' then
 s.document:=msrc_abstracts.bind_presenter(s.document,auth.uid(),edition);
 if not msrc_abstracts.document_valid(s.document,cfg.configuration,true) then return jsonb_build_object('state','invalid');end if;
 if not cfg.evidence_ready then return jsonb_build_object('state','evidence_gate');end if;
 if s.reference is null then update msrc_abstracts.settings q set next_reference=q.next_reference+1 where q.edition_key=edition returning next_reference-1 into reference_number;end if;
 update msrc_abstracts.submissions q set status='submitted',finalized_at=coalesce(q.finalized_at,clock_timestamp()),pi_key=null,document=s.document,word_count=msrc_abstracts.word_count(s.document->'body'),
 reference=coalesce(q.reference,edition||'-ABS-'||lpad(reference_number::text,6,'0')),revision_deadline=null,revision_instructions=null where q.id=s.id returning * into s;
 insert into msrc_abstracts.snapshots(submission_id,version,document,word_count,settings_version) values(s.id,s.version,s.document,s.word_count,cfg.version);
 insert into msrc_abstracts.authors(submission_id,submission_version,position,author_id,name,email,affiliations)
 select s.id,s.version,ordinality::integer,(a->>'id')::uuid,a->>'name',a->>'email',array(select jsonb_array_elements_text(a->'affiliations')) from jsonb_array_elements(s.document->'authors') with ordinality x(a,ordinality);
 update msrc_abstracts.assignments q set status='withdrawn',version=q.version+1 where q.submission_id=s.id and q.submission_version<>s.version and q.status in('assigned','draft');
 perform msrc_abstracts.record(edition,'submission.finalized',s.id,jsonb_build_object('version',s.version,'wordCount',s.word_count));
 result:=jsonb_build_object('state','finalized','submission',msrc_abstracts.projection(s));
 else return jsonb_build_object('state','invalid');end if;
 insert into msrc_abstracts.operations values(edition,auth.uid(),operation_id,input,result);return result;
end$$;

create or replace function msrc_abstracts.science_document(d jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select msrc_abstracts.document_projection(d)-array['ethics','registration'];
$$;
create or replace function msrc_abstracts.packet_valid(p jsonb,d jsonb) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare needle text;k text;source jsonb:=msrc_abstracts.document_projection(d);begin
 if jsonb_typeof(p) is distinct from 'object' or p<>jsonb_build_object('title',p->'title','body',p->'body','specialtyId',p->'specialtyId','studyTypeId',p->'studyTypeId','studyTypeOther',p->'studyTypeOther','analysisComplete',p->'analysisComplete')
 or jsonb_typeof(p->'title') is distinct from 'string' or btrim(p->>'title')='' or char_length(p->>'title')>6000 or msrc_abstracts.word_count(jsonb_build_object('background',p->>'title'))-6>20
 or p->'specialtyId' is distinct from source->'specialtyId' or p->'studyTypeId' is distinct from source->'studyTypeId'
 or p->'studyTypeOther' is distinct from source->'studyTypeOther' or p->'analysisComplete' is distinct from source->'analysisComplete'
 or octet_length(p::text)>16384 or jsonb_typeof(p->'body') is distinct from 'object'
 or p->'body'<>jsonb_build_object('background',p->'body'->'background','objectives',p->'body'->'objectives','methods',p->'body'->'methods','results',p->'body'->'results','limitations',p->'body'->'limitations','conclusion',p->'body'->'conclusion') then return false;end if;
 foreach k in array array['background','objectives','methods','results','limitations','conclusion'] loop
 if jsonb_typeof(p->'body'->k) is distinct from 'string' then return false;end if;end loop;
 if msrc_abstracts.word_count(p->'body')>350 or p::text~*'[^[:space:]]+@[^[:space:]]+[.]' then return false;end if;
 -- Identity canaries supplement the existing human sanitation attestation.
 for needle in select a->>'name' from jsonb_array_elements(source->'authors') a union all select a->>'email' from jsonb_array_elements(source->'authors') a
 union all select f from jsonb_array_elements(source->'authors') a cross join lateral jsonb_array_elements_text(a->'affiliations') f
 union all select source->'supervisor'->>'fullName' union all select source->'supervisor'->>'email' union all select source->'supervisor'->>'phone' loop
 if char_length(btrim(needle))>1 and (position(lower(btrim(needle)) in lower(p::text))>0
 or position(regexp_replace(lower(needle),'[^[:alnum:]]','','g') in regexp_replace(lower(p::text),'[^[:alnum:]]','','g'))>0) then return false;end if;end loop;
 return true;
end$$;
-- Read boundary projections leave immutable sanitized packets untouched.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.msrc_staff_research_packet(text,uuid)'::regprocedure);
 definition:=replace(definition,'''packet'',p,','''packet'',msrc_abstracts.packet_projection(p),');execute definition;
 definition:=pg_get_functiondef('public.msrc_staff_research_submission(text,uuid)'::regprocedure);
 definition:=replace(definition,'''packet'',packet,','''packet'',case when packet is null then null else msrc_abstracts.packet_projection(packet) end,');execute definition;
 definition:=pg_get_functiondef('public.msrc_staff_research_event_read(text,text)'::regprocedure);
 if strpos(definition,'''Aim: ''||(snap.document->''body''->>''aim'')')=0 then raise exception 'ENG-088 judging packet requires reconciliation';end if;
 definition:=replace(definition,'''Aim: ''||(snap.document->''body''->>''aim'')','''Objectives: ''||coalesce(snap.document->''body''->>''objectives'',snap.document->''body''->>''aim'')');
 definition:=replace(definition,'''Conclusion: ''||(snap.document->''body''->>''conclusion'')','''Limitations: ''||coalesce(snap.document->''body''->>''limitations'',''''),''Conclusion: ''||(snap.document->''body''->>''conclusion'')');execute definition;
 definition:=pg_get_functiondef('public.msrc_advisory_worker_claim(uuid,integer)'::regprocedure);
 if strpos(definition,'select au->>''name'' n from jsonb_array_elements(x.document->''authors'') au')=0 then raise exception 'ENG-088 advisory identity context requires reconciliation';end if;
 definition:=replace(definition,'select au->>''name'' n from jsonb_array_elements(x.document->''authors'') au',
 'select au->>''name'' n from jsonb_array_elements(x.document->''authors'') au union select x.document->''supervisor''->>''fullName''');execute definition;
 definition:=pg_get_functiondef('msrc_staff.reporting_cells(text,text[])'::regprocedure);
 definition:=replace(definition,
 'return query select ''submissions''::text,''specialty''::text,c.v->>''id'',count(s.id) from msrc_abstracts.settings cfg cross join lateral jsonb_array_elements(coalesce(cfg.configuration->''specialties'',''[]''::jsonb)) c(v) left join msrc_abstracts.submissions s on s.edition_key=edition and s.document->>''specialtyId''=c.v->>''id'' where cfg.edition_key=edition group by c.v->>''id'';',
 'return query select ''submissions''::text,''specialty''::text,c.id,count(s.id) from (select v->>''id'' id from msrc_abstracts.settings cfg cross join lateral jsonb_array_elements(coalesce(cfg.configuration->''specialties'',''[]''::jsonb)) v where cfg.edition_key=edition union select d.document->>''specialtyId'' from msrc_abstracts.submissions d where d.edition_key=edition) c left join msrc_abstracts.submissions s on s.edition_key=edition and s.document->>''specialtyId''=c.id group by c.id;');execute definition;
end$$;
-- Existing cleanup authorizes a narrow privacy exception to snapshot immutability:
-- only supervisor values may become blank, with scientific data untouched. The
-- pre-existing broader author/document retention gap is not silently claimed solved.
create function msrc_abstracts.redact_supervisor(value jsonb) returns jsonb
 language plpgsql immutable security invoker set search_path='' as $$
declare result jsonb;begin
 if jsonb_typeof(value)='object' then
 select coalesce(jsonb_object_agg(k,case when k='supervisor' and jsonb_typeof(v)='object'
 and v ?& array['fullName','email','phone'] then jsonb_build_object('fullName','','email','','phone','')
 else msrc_abstracts.redact_supervisor(v) end),'{}'::jsonb) into result from jsonb_each(value) x(k,v);
 return result;
 elsif jsonb_typeof(value)='array' then
 select coalesce(jsonb_agg(msrc_abstracts.redact_supervisor(v) order by n),'[]'::jsonb) into result from jsonb_array_elements(value) with ordinality x(v,n);return result;
 end if;return value;
end$$;
create function msrc_abstracts.supervisor_erasure_allowed(actor uuid,edition text) returns boolean
 language sql stable security definer set search_path='' as $$
 select msrc_participant.cleanup_authorized(actor) or (
 coalesce((select enabled from msrc_participant.retention_policy where singleton),false)
 and msrc_participant.profile_expired(edition));
$$;
create function msrc_abstracts.supervisor_snapshot_guard() returns trigger
 language plpgsql security invoker set search_path='' as $$
declare actor uuid;edition text;begin
 if tg_op='INSERT' and current_user='postgres' then return new;end if;
 if tg_op='UPDATE' and current_user='postgres' then
 if tg_table_name='snapshots' then
 select s.actor_id,s.edition_key into actor,edition from msrc_abstracts.submissions s where s.id=old.submission_id;
 if msrc_abstracts.supervisor_erasure_allowed(actor,edition) and to_jsonb(new)-'document'=to_jsonb(old)-'document'
 and new.document=msrc_abstracts.redact_supervisor(old.document) then return new;end if;
 elsif tg_table_name='operations' then
 if msrc_abstracts.supervisor_erasure_allowed(old.actor_id,old.edition_key) and to_jsonb(new)-'result'=to_jsonb(old)-'result'
 and new.result=msrc_abstracts.redact_supervisor(old.result) then return new;end if;
 end if;
 end if;
 raise exception using errcode='55000',message='Abstract evidence is append-only except authorized supervisor erasure.';
end$$;
drop trigger abstract_append_only on msrc_abstracts.snapshots;
create trigger abstract_append_only before insert or update or delete on msrc_abstracts.snapshots
 for each row execute function msrc_abstracts.supervisor_snapshot_guard();
drop trigger abstract_append_only on msrc_abstracts.operations;
create trigger abstract_append_only before insert or update or delete on msrc_abstracts.operations
 for each row execute function msrc_abstracts.supervisor_snapshot_guard();
create function msrc_abstracts.erase_supervisors(actor uuid,edition text) returns integer
 language plpgsql security definer set search_path='' as $$
declare total integer;begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='READ COMMITTED required.';end if;
 if not msrc_abstracts.supervisor_erasure_allowed(actor,edition) then raise exception using errcode='42501',message='Authorized supervisor erasure required.';end if;
 update msrc_abstracts.submissions s set document=msrc_abstracts.redact_supervisor(s.document)
 where s.edition_key=edition and (actor is null or s.actor_id=actor) and s.document is distinct from msrc_abstracts.redact_supervisor(s.document);
 get diagnostics total=row_count;
 update msrc_abstracts.snapshots x set document=msrc_abstracts.redact_supervisor(x.document)
 from msrc_abstracts.submissions s where s.id=x.submission_id and s.edition_key=edition and (actor is null or s.actor_id=actor)
 and x.document is distinct from msrc_abstracts.redact_supervisor(x.document);
 update msrc_abstracts.operations o set result=msrc_abstracts.redact_supervisor(o.result)
 where o.edition_key=edition and (actor is null or o.actor_id=actor) and o.result is distinct from msrc_abstracts.redact_supervisor(o.result);
 if total>0 then insert into msrc_abstracts.audit(edition_key,actor_id,event,details)
 values(edition,actor,'supervisor.erased',jsonb_build_object('submissions',total));end if;
 return total;
end$$;
-- Profile deletion is already limited to account erasure or the configured
-- conference-plus-one-year retention path. It also drains contacts from drafts
-- whose participant never saved a profile_details row.
do $$declare definition text;begin
 definition:=pg_get_functiondef('msrc_participant.profile_erasure()'::regprocedure);
 definition:=replace(definition,'return old;',
 'perform msrc_abstracts.erase_supervisors(old.actor_id,s.edition_key) from (select distinct edition_key from msrc_abstracts.submissions where actor_id=old.actor_id) s where msrc_abstracts.supervisor_erasure_allowed(old.actor_id,s.edition_key); return old;');execute definition;
 definition:=pg_get_functiondef('msrc_participant.profile_retention()'::regprocedure);
 definition:=replace(definition,'union select a.edition_key from msrc_participant.avatar_objects a where a.state<>''delete'' order by edition_key',
 'union select a.edition_key from msrc_participant.avatar_objects a where a.state<>''delete'' union select s.edition_key from msrc_abstracts.submissions s where s.document is distinct from msrc_abstracts.redact_supervisor(s.document) order by edition_key');
 definition:=replace(definition,'delete from msrc_participant.profile_details p where p.edition_key=edition;',
 'perform 1 from msrc_abstracts.settings s where s.edition_key=edition for update; perform msrc_abstracts.erase_supervisors(null,edition); delete from msrc_participant.profile_details p where p.edition_key=edition;');execute definition;
end$$;
revoke all on all functions in schema msrc_abstracts from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
