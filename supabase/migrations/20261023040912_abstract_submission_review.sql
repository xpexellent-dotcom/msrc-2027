-- ABS-01--15 / REV-01--09. Local review only: no settings, users, activation or uploads.
begin;
create schema msrc_abstracts;
revoke all on schema msrc_abstracts from public,anon,authenticated,service_role;
create table msrc_abstracts.settings (
 edition_key text primary key references msrc_authorization.edition_config(edition_key) on delete restrict,
 version integer not null check(version>0), configuration jsonb not null check(jsonb_typeof(configuration)='object'),
 enabled boolean not null default false,evidence_ready boolean not null default false,
 next_reference bigint not null default 1 check(next_reference>0)
);
create table msrc_abstracts.settings_versions (
 edition_key text not null references msrc_abstracts.settings(edition_key) on delete restrict,
 version integer not null,configuration jsonb not null,primary key(edition_key,version)
);
create table msrc_abstracts.submissions (
 id uuid primary key default gen_random_uuid(),edition_key text not null references msrc_abstracts.settings(edition_key) on delete restrict,
 actor_id uuid not null,version integer not null check(version>0),document jsonb not null,
 status text not null default 'draft' check(status in('draft','submitted','scientific_review','revision_requested','revision_expired','accepted','rejected','withdrawn')),
 reference text unique,word_count integer not null check(word_count between 0 and 300),
 finalized_at timestamptz,pi_key text,created_at timestamptz not null default clock_timestamp(),
 revision_deadline timestamptz,revision_instructions text,unique(id,version)
);
create index abstract_owner on msrc_abstracts.submissions(edition_key,actor_id);
create index abstract_pi on msrc_abstracts.submissions(edition_key,pi_key) where finalized_at is not null;
create table msrc_abstracts.snapshots (
 submission_id uuid not null references msrc_abstracts.submissions(id) on delete restrict,
 version integer not null,document jsonb not null,word_count integer not null check(word_count between 1 and 300),
 settings_version integer not null,created_at timestamptz not null default clock_timestamp(),primary key(submission_id,version)
);
create table msrc_abstracts.authors (
 submission_id uuid not null,submission_version integer not null,position integer not null,
 author_id uuid not null,name text not null,email text not null,affiliations text[] not null,
 primary key(submission_id,submission_version,position),unique(submission_id,submission_version,author_id),
 foreign key(submission_id,submission_version) references msrc_abstracts.snapshots(submission_id,version) on delete restrict
);
create table msrc_abstracts.packets (
 submission_id uuid not null,submission_version integer not null,packet jsonb not null,
 prepared_by uuid not null,prepared_at timestamptz not null default clock_timestamp(),
 primary key(submission_id,submission_version),foreign key(submission_id,submission_version) references msrc_abstracts.snapshots(submission_id,version) on delete restrict
);
create table msrc_abstracts.reviewer_profiles (
 edition_key text not null references msrc_abstracts.settings(edition_key) on delete restrict,
 actor_id uuid not null,affiliations text[] not null check(cardinality(affiliations)>0),
 primary key(edition_key,actor_id)
);
create table msrc_abstracts.assignments (
 id uuid primary key default gen_random_uuid(),edition_key text not null references msrc_abstracts.settings(edition_key) on delete restrict,
 submission_id uuid not null,submission_version integer not null,rubric_version integer not null,
 reviewer_id uuid not null,status text not null default 'assigned' check(status in('assigned','draft','completed','declined','conflict','withdrawn')),
 version integer not null default 1,scorecard jsonb,score_total numeric,response_reason text,
 unique(submission_id,submission_version,reviewer_id),
 foreign key(submission_id,submission_version) references msrc_abstracts.packets(submission_id,submission_version) on delete restrict,
 foreign key(edition_key,rubric_version) references msrc_abstracts.settings_versions(edition_key,version) on delete restrict
);
create index abstract_assignments_edition on msrc_abstracts.assignments(edition_key,reviewer_id,status);
create index abstract_assignments_rubric on msrc_abstracts.assignments(edition_key,rubric_version);
create table msrc_abstracts.scorecard_versions (
 assignment_id uuid not null references msrc_abstracts.assignments(id) on delete restrict,version integer not null,
 scorecard jsonb not null,completed boolean not null,score_total numeric,primary key(assignment_id,version)
);
create table msrc_abstracts.decisions (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null,submission_version integer not null,
 outcome text not null check(outcome in('accept','reject','revise')),reason text not null,instructions text not null,
 revision_deadline timestamptz,created_at timestamptz not null default clock_timestamp(),actor_id uuid not null,
 review_basis jsonb not null check(jsonb_typeof(review_basis)='object'),
 foreign key(submission_id,submission_version) references msrc_abstracts.snapshots(submission_id,version) on delete restrict,
 check((outcome='revise')=(revision_deadline is not null))
);
create index abstract_decisions_submission on msrc_abstracts.decisions(submission_id,submission_version,created_at desc);
create table msrc_abstracts.batches (
 id uuid primary key,edition_key text not null references msrc_abstracts.settings(edition_key) on delete restrict,
 decision_ids uuid[] not null,actor_id uuid not null,created_at timestamptz not null default clock_timestamp()
);
create index abstract_batches_edition on msrc_abstracts.batches(edition_key);
create table msrc_abstracts.publications (
 decision_id uuid primary key references msrc_abstracts.decisions(id) on delete restrict,
 batch_id uuid not null references msrc_abstracts.batches(id) on delete restrict,published_at timestamptz not null default clock_timestamp()
);
create index abstract_publications_batch on msrc_abstracts.publications(batch_id);
create table msrc_abstracts.operations (
 edition_key text not null,actor_id uuid not null,operation_id uuid not null,input_hash bytea not null,result jsonb not null,
 primary key(edition_key,actor_id,operation_id)
);
create table msrc_abstracts.mutation_limits (
 actor_id uuid primary key,window_started_at timestamptz not null,used integer not null check(used between 1 and 61)
);
comment on table msrc_abstracts.mutation_limits is 'Independent actor-scoped anti-abuse budget: 60 new abstract mutations per minute. Cached operation retries and reads do not consume it; authentication email/form budgets are unrelated.';
create table msrc_abstracts.audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,actor_id uuid,session_id uuid,
 event text not null,target_id uuid,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default clock_timestamp()
);
create index abstract_audit_edition on msrc_abstracts.audit(edition_key,created_at,id);
do $$declare t text;begin
 foreach t in array array['settings','settings_versions','submissions','snapshots','authors','packets','reviewer_profiles','assignments','scorecard_versions','decisions','batches','publications','operations','mutation_limits','audit'] loop
 execute format('alter table msrc_abstracts.%I enable row level security',t);
 execute format('alter table msrc_abstracts.%I force row level security',t);
 if t not in('settings','submissions','reviewer_profiles','assignments','mutation_limits') then
 execute format('create trigger abstract_append_only before insert or update or delete on msrc_abstracts.%I for each row execute function msrc_staff.audit_immutable()',t);
 execute format('create trigger abstract_no_truncate before truncate on msrc_abstracts.%I for each statement execute function msrc_staff.audit_immutable()',t);
 end if;end loop;end$$;
revoke all on all tables in schema msrc_abstracts from public,anon,authenticated,service_role;
comment on column msrc_abstracts.settings.evidence_ready is 'Closed pending virus-scanning, private ethics/similarity evidence storage and validation policy. No staff RPC can change this release gate; only synthetic disposable tests set it.';
comment on column msrc_abstracts.submissions.pi_key is 'Canonicalized declared PI email, independent of the submitter. Alias/identity reconciliation is an owner activation gate; no account or author-order inference.';

create function msrc_abstracts.guard() returns void language plpgsql security invoker set search_path='' as $$begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Abstracts require READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
end$$;
create function msrc_abstracts.record(edition text,event_name text,target uuid,details jsonb default '{}'::jsonb) returns void
 language sql security definer set search_path='' as $$
 insert into msrc_abstracts.audit(edition_key,actor_id,session_id,event,target_id,details)
 values(edition,auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,event_name,target,details);
$$;
-- Unicode 17.0 L/N ranges generated from Node 24.21.0 /[\p{L}\p{N}]/u.
-- Explicit ranges avoid PostgreSQL collation-dependent alnum excluding fractions/new letters.
create function msrc_abstracts.word_count(body jsonb) returns integer language sql immutable security invoker set search_path='' as $$
 select count(*)::integer from regexp_split_to_table(
 translate(coalesce(body->>'background','')||' '||coalesce(body->>'aim','')||' '||coalesce(body->>'methods','')||' '||coalesce(body->>'results','')||' '||coalesce(body->>'conclusion',''),
 U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF',repeat(' ',19)),
 E'[ \t\n\r\f\013]+') token where token ~ '[0-9A-Za-zª²-³µ¹-º¼-¾À-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶ-ͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙՠ-ֈא-תׯ-ײؠ-ي٠-٩ٮ-ٯٱ-ۓەۥ-ۦۮ-ۼۿܐܒ-ܯݍ-ޥޱ߀-ߪߴ-ߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࡠ-ࡪࡰ-ࢇࢉ-࢏ࢠ-ࣉऄ-हऽॐक़-ॡ०-९ॱ-ঀঅ-ঌএ-ঐও-নপ-রলশ-হঽৎড়-ঢ়য়-ৡ০-ৱ৴-৹ৼਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹਖ਼-ੜਫ਼੦-੯ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હઽૐૠ-ૡ૦-૯ૹଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହଽଡ଼-ଢ଼ୟ-ୡ୦-୯ୱ-୷ஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹௐ௦-௲అ-ఌఎ-ఐఒ-నప-హఽౘ-ౚ౜-ౝౠ-ౡ౦-౯౸-౾ಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽ೜-ೞೠ-ೡ೦-೯ೱ-ೲഄ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖ൘-ൡ൦-൸ൺ-ൿඅ-ඖක-නඳ-රලව-ෆ෦-෯ก-ะา-ำเ-ๆ๐-๙ກ-ຂຄຆ-ຊຌ-ຣລວ-ະາ-ຳຽເ-ໄໆ໐-໙ໜ-ໟༀ༠-༳ཀ-ཇཉ-ཬྈ-ྌက-ဪဿ-၉ၐ-ၕၚ-ၝၡၥ-ၦၮ-ၰၵ-ႁႎ႐-႙Ⴀ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፩-፼ᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜑᜟ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜ០-៩៰-៹᠐-᠙ᠠ-ᡸᢀ-ᢄᢇ-ᢨᢪᢰ-ᣵᤀ-ᤞ᥆-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉ᧐-᧚ᨀ-ᨖᨠ-ᩔ᪀-᪉᪐-᪙ᪧᬅ-ᬳᭅ-ᭌ᭐-᭙ᮃ-ᮠᮮ-ᯥᰀ-ᰣ᱀-᱉ᱍ-ᱽᲀ-ᲊᲐ-ᲺᲽ-Ჿᳩ-ᳬᳮ-ᳳᳵ-ᳶᳺᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ⁰-ⁱ⁴-⁹ⁿ-₉ₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎ⅐-↉①-⒛⓪-⓿❶-➓Ⰰ-ⳤⳫ-ⳮⳲ-ⳳ⳽ⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々-〇〡-〩〱-〵〸-〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎ㆒-㆕ㆠ-ㆿㇰ-ㇿ㈠-㈩㉈-㉏㉑-㉟㊀-㊉㊱-㊿㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-Ƛ꟱-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢ꠰-꠵ꡀ-ꡳꢂ-ꢳ꣐-꣙ꣲ-ꣷꣻꣽ-ꣾ꤀-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏ-꧙ꧠ-ꧤꧦ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋ꩐-꩙ꩠ-ꩶꩺꩾ-ꪯꪱꪵ-ꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯢ꯰-꯹가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ𐀀-𐀋𐀍-𐀦𐀨-𐀺𐀼-𐀽𐀿-𐁍𐁐-𐁝𐂀-𐃺𐄇-𐄳𐅀-𐅸𐆊-𐆋𐊀-𐊜𐊠-𐋐𐋡-𐋻𐌀-𐌣𐌭-𐍊𐍐-𐍵𐎀-𐎝𐎠-𐏃𐏈-𐏏𐏑-𐏕𐐀-𐒝𐒠-𐒩𐒰-𐓓𐓘-𐓻𐔀-𐔧𐔰-𐕣𐕰-𐕺𐕼-𐖊𐖌-𐖒𐖔-𐖕𐖗-𐖡𐖣-𐖱𐖳-𐖹𐖻-𐖼𐗀-𐗳𐘀-𐜶𐝀-𐝕𐝠-𐝧𐞀-𐞅𐞇-𐞰𐞲-𐞺𐠀-𐠅𐠈𐠊-𐠵𐠷-𐠸𐠼𐠿-𐡕𐡘-𐡶𐡹-𐢞𐢧-𐢯𐣠-𐣲𐣴-𐣵𐣻-𐤛𐤠-𐤹𐥀-𐥙𐦀-𐦷𐦼-𐧏𐧒-𐨀𐨐-𐨓𐨕-𐨗𐨙-𐨵𐩀-𐩈𐩠-𐩾𐪀-𐪟𐫀-𐫇𐫉-𐫤𐫫-𐫯𐬀-𐬵𐭀-𐭕𐭘-𐭲𐭸-𐮑𐮩-𐮯𐰀-𐱈𐲀-𐲲𐳀-𐳲𐳺-𐴣𐴰-𐴹𐵀-𐵥𐵯-𐶅𐹠-𐹾𐺀-𐺩𐺰-𐺱𐻂-𐻇𐼀-𐼧𐼰-𐽅𐽑-𐽔𐽰-𐾁𐾰-𐿋𐿠-𐿶𑀃-𑀷𑁒-𑁯𑁱-𑁲𑁵𑂃-𑂯𑃐-𑃨𑃰-𑃹𑄃-𑄦𑄶-𑄿𑅄𑅇𑅐-𑅲𑅶𑆃-𑆲𑇁-𑇄𑇐-𑇚𑇜𑇡-𑇴𑈀-𑈑𑈓-𑈫𑈿-𑉀𑊀-𑊆𑊈𑊊-𑊍𑊏-𑊝𑊟-𑊨𑊰-𑋞𑋰-𑋹𑌅-𑌌𑌏-𑌐𑌓-𑌨𑌪-𑌰𑌲-𑌳𑌵-𑌹𑌽𑍐𑍝-𑍡𑎀-𑎉𑎋𑎎𑎐-𑎵𑎷𑏑𑏓𑐀-𑐴𑑇-𑑊𑑐-𑑙𑑟-𑑡𑒀-𑒯𑓄-𑓅𑓇𑓐-𑓙𑖀-𑖮𑗘-𑗛𑘀-𑘯𑙄𑙐-𑙙𑚀-𑚪𑚸𑛀-𑛉𑛐-𑛣𑜀-𑜚𑜰-𑜻𑝀-𑝆𑠀-𑠫𑢠-𑣲𑣿-𑤆𑤉𑤌-𑤓𑤕-𑤖𑤘-𑤯𑤿𑥁𑥐-𑥙𑦠-𑦧𑦪-𑧐𑧡𑧣𑨀𑨋-𑨲𑨺𑩐𑩜-𑪉𑪝𑪰-𑫸𑯀-𑯠𑯰-𑯹𑰀-𑰈𑰊-𑰮𑱀𑱐-𑱬𑱲-𑲏𑴀-𑴆𑴈-𑴉𑴋-𑴰𑵆𑵐-𑵙𑵠-𑵥𑵧-𑵨𑵪-𑶉𑶘𑶠-𑶩𑶰-𑷛𑷠-𑷩𑻠-𑻲𑼂𑼄-𑼐𑼒-𑼳𑽐-𑽙𑾰𑿀-𑿔𒀀-𒎙𒐀-𒑮𒒀-𒕃𒾐-𒿰𓀀-𓐯𓑁-𓑆𓑠-𔏺𔐀-𔙆𖄀-𖄝𖄰-𖄹𖠀-𖨸𖩀-𖩞𖩠-𖩩𖩰-𖪾𖫀-𖫉𖫐-𖫭𖬀-𖬯𖭀-𖭃𖭐-𖭙𖭛-𖭡𖭣-𖭷𖭽-𖮏𖵀-𖵬𖵰-𖵹𖹀-𖺖𖺠-𖺸𖺻-𖻓𖼀-𖽊𖽐𖾓-𖾟𖿠-𖿡𖿣𖿲-𖿶𗀀-𘳕𘳿-𘴞𘶀-𘷲𚿰-𚿳𚿵-𚿻𚿽-𚿾𛀀-𛄢𛄲𛅐-𛅒𛅕𛅤-𛅧𛅰-𛋻𛰀-𛱪𛱰-𛱼𛲀-𛲈𛲐-𛲙𜳰-𜳹𝋀-𝋓𝋠-𝋳𝍠-𝍸𝐀-𝑔𝑖-𝒜𝒞-𝒟𝒢𝒥-𝒦𝒩-𝒬𝒮-𝒹𝒻𝒽-𝓃𝓅-𝔅𝔇-𝔊𝔍-𝔔𝔖-𝔜𝔞-𝔹𝔻-𝔾𝕀-𝕄𝕆𝕊-𝕐𝕒-𝚥𝚨-𝛀𝛂-𝛚𝛜-𝛺𝛼-𝜔𝜖-𝜴𝜶-𝝎𝝐-𝝮𝝰-𝞈𝞊-𝞨𝞪-𝟂𝟄-𝟋𝟎-𝟿𝼀-𝼞𝼥-𝼪𞀰-𞁭𞄀-𞄬𞄷-𞄽𞅀-𞅉𞅎𞊐-𞊭𞋀-𞋫𞋰-𞋹𞓐-𞓫𞓰-𞓹𞗐-𞗭𞗰-𞗺𞛀-𞛞𞛠-𞛢𞛤-𞛥𞛧-𞛭𞛰-𞛴𞛾-𞛿𞟠-𞟦𞟨-𞟫𞟭-𞟮𞟰-𞟾𞠀-𞣄𞣇-𞣏𞤀-𞥃𞥋𞥐-𞥙𞱱-𞲫𞲭-𞲯𞲱-𞲴𞴁-𞴭𞴯-𞴽𞸀-𞸃𞸅-𞸟𞸡-𞸢𞸤𞸧𞸩-𞸲𞸴-𞸷𞸹𞸻𞹂𞹇𞹉𞹋𞹍-𞹏𞹑-𞹒𞹔𞹗𞹙𞹛𞹝𞹟𞹡-𞹢𞹤𞹧-𞹪𞹬-𞹲𞹴-𞹷𞹹-𞹼𞹾𞺀-𞺉𞺋-𞺛𞺡-𞺣𞺥-𞺩𞺫-𞺻🄀-🄌🯰-🯹𠀀-𪛟𪜀-𫠝𫠠-𬺭𬺰-𮯠𮯰-𮹝丽-𪘀𰀀-𱍊𱍐-𳑹]';
$$;
create function msrc_abstracts.settings_defaults() returns jsonb language sql immutable security invoker set search_path='' as $$
 select '{"opensAt":null,"closesAt":null,"reviewDeadline":null,"specialties":[],"studyTypes":[],"rubric":[],"reviewersPerAbstract":null,"blindingPolicy":null,"correspondingAuthorPolicy":null,"keywordCount":null,"ongoingPolicy":null,"aggregationPolicy":null,"acceptanceThreshold":null,"notApplicablePolicy":null}'::jsonb;
$$;
create function msrc_abstracts.settings_valid(c jsonb,complete boolean) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare k text;v jsonb;instant timestamptz;begin
 if jsonb_typeof(c) is distinct from 'object' or octet_length(c::text)>131072 or c<>msrc_abstracts.settings_defaults()||c
 or exists(select 1 from jsonb_object_keys(c) x where not(msrc_abstracts.settings_defaults()?x)) then return false;end if;
 foreach k in array array['opensAt','closesAt','reviewDeadline'] loop
 if c->k='null'::jsonb then if complete then return false;end if;
 else if jsonb_typeof(c->k)<>'string' then return false;end if;
 begin instant:=(c->>k)::timestamptz;exception when others then return false;end;
 if not isfinite(instant) then return false;end if;end if;end loop;
 if c->>'opensAt' is not null and c->>'closesAt' is not null and (c->>'opensAt')::timestamptz >= (c->>'closesAt')::timestamptz then return false;end if;
 if c->>'reviewDeadline' is not null and c->>'closesAt' is not null and (c->>'reviewDeadline')::timestamptz <= (c->>'closesAt')::timestamptz then return false;end if;
 foreach k in array array['specialties','studyTypes','rubric'] loop
 if jsonb_typeof(c->k) is distinct from 'array' then return false;end if;
 if complete and jsonb_array_length(c->k)=0 then return false;end if;
 if exists(select 1 from jsonb_array_elements(c->k) e where jsonb_typeof(e)<>'object' or coalesce(e->>'id','') !~ '^[A-Za-z0-9_-]{1,60}$'
 or jsonb_typeof(e->'label') is distinct from 'string' or char_length(btrim(e->>'label')) not between 1 and 300)
 or (select count(*)<>count(distinct e->>'id') from jsonb_array_elements(c->k) e) then return false;end if;
 for v in select value from jsonb_array_elements(c->k) loop
 if k='specialties' and v<>jsonb_build_object('id',v->'id','label',v->'label') then return false;end if;
 if k='studyTypes' and (v<>jsonb_build_object('id',v->'id','label',v->'label','template',v->'template') or coalesce(v->>'template','') not in('research','case_report')) then return false;end if;
 if k='rubric' then
 if v<>jsonb_build_object('id',v->'id','label',v->'label','weight',v->'weight','min',v->'min','max',v->'max')
 or jsonb_typeof(v->'weight') is distinct from 'number' or jsonb_typeof(v->'min') is distinct from 'number' or jsonb_typeof(v->'max') is distinct from 'number' then return false;end if;
 if (v->>'weight')::numeric<=0 or (v->>'max')::numeric<=(v->>'min')::numeric then return false;end if;end if;
 end loop;end loop;
 foreach k in array array['blindingPolicy','correspondingAuthorPolicy','ongoingPolicy','aggregationPolicy','notApplicablePolicy'] loop
 if c->k='null'::jsonb then if complete then return false;end if;
 elsif jsonb_typeof(c->k)<>'string' or char_length(btrim(c->>k)) not between 1 and 3000 then return false;end if;end loop;
 foreach k in array array['reviewersPerAbstract','keywordCount','acceptanceThreshold'] loop
 if c->k='null'::jsonb then if complete then return false;end if;
 elsif jsonb_typeof(c->k)<>'number' then return false;end if;end loop;
 if c->>'reviewersPerAbstract' is not null and ((c->>'reviewersPerAbstract')!~'^[1-5]$') then return false;end if;
 if c->>'keywordCount' is not null and ((c->>'keywordCount')!~'^[0-9]{1,3}$') then return false;end if;
 if c->>'acceptanceThreshold' is not null and ((c->>'acceptanceThreshold')::numeric<0 or (c->>'acceptanceThreshold')::numeric>100) then return false;end if;
 -- Supported calculations are explicitly selected, never inferred from arbitrary policy prose.
 if complete and (c->>'aggregationPolicy'<>'weighted_normalized_mean' or c->>'notApplicablePolicy'<>'all_required') then return false;end if;
 return true;
end$$;
create function msrc_abstracts.document_valid(d jsonb,c jsonb,finalizing boolean) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare k text;a jsonb;begin
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>262144
 or d<>jsonb_build_object('title',d->'title','specialtyId',d->'specialtyId','studyTypeId',d->'studyTypeId','completionStatus',d->'completionStatus',
 'body',d->'body','keywords',d->'keywords','authors',d->'authors','piAuthorId',d->'piAuthorId','correspondingAuthorId',d->'correspondingAuthorId',
 'presentingAuthorId',d->'presentingAuthorId','ethicsStatus',d->'ethicsStatus','ethicsExplanation',d->'ethicsExplanation',
 'conflictOfInterest',d->'conflictOfInterest','fundingDeclaration',d->'fundingDeclaration','authorityConfirmed',d->'authorityConfirmed') then return false;end if;
 foreach k in array array['title','specialtyId','studyTypeId','completionStatus','piAuthorId','correspondingAuthorId','ethicsStatus','ethicsExplanation','conflictOfInterest','fundingDeclaration'] loop
 if jsonb_typeof(d->k) is distinct from 'string' or char_length(d->>k)>6000 then return false;end if;end loop;
 if char_length(d->>'title')>500 or jsonb_typeof(d->'authorityConfirmed') is distinct from 'boolean'
 or coalesce(d->>'completionStatus','') not in('completed','ongoing') or coalesce(d->>'ethicsStatus','') not in('approval_required','exempt','not_required')
 or jsonb_typeof(d->'body') is distinct from 'object' or d->'body'<>jsonb_build_object('background',d->'body'->'background','aim',d->'body'->'aim',
 'methods',d->'body'->'methods','results',d->'body'->'results','conclusion',d->'body'->'conclusion') then return false;end if;
 foreach k in array array['background','aim','methods','results','conclusion'] loop
 if jsonb_typeof(d->'body'->k) is distinct from 'string' then return false;end if;end loop;
 if msrc_abstracts.word_count(d->'body')>300 or jsonb_typeof(d->'keywords') is distinct from 'array' or jsonb_typeof(d->'authors') is distinct from 'array' then return false;end if;
 if exists(select 1 from jsonb_array_elements(d->'keywords') v where jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>100) then return false;end if;
 -- No scientific author-count cap. Only the documented total payload-byte bound applies.
 for a in select value from jsonb_array_elements(d->'authors') loop
 if a<>jsonb_build_object('id',a->'id','name',a->'name','email',a->'email','affiliations',a->'affiliations')
 or coalesce(a->>'id','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
 or jsonb_typeof(a->'name') is distinct from 'string' or char_length(a->>'name')>500
 or jsonb_typeof(a->'email') is distinct from 'string' or char_length(a->>'email')>254
 or jsonb_typeof(a->'affiliations') is distinct from 'array' then return false;end if;
 if exists(select 1 from jsonb_array_elements(a->'affiliations') v where jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>500) then return false;end if;
 if finalizing and (char_length(btrim(a->>'name'))=0
 or ((a->>'email')<>'' and (a->>'email')!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
 or ((a->>'id') in(d->>'piAuthorId',d->>'correspondingAuthorId') and (a->>'email')='')
 or jsonb_array_length(a->'affiliations')=0 or exists(select 1 from jsonb_array_elements_text(a->'affiliations') v where btrim(v)='')) then return false;end if;
 end loop;
 if (select count(*)<>count(distinct lower(v->>'id')) from jsonb_array_elements(d->'authors') v) then return false;end if;
 if d->'presentingAuthorId'<>'null'::jsonb and jsonb_typeof(d->'presentingAuthorId') is distinct from 'string' then return false;end if;
 if not finalizing then return true;end if;
 if not msrc_abstracts.settings_valid(c,true) or char_length(btrim(d->>'title'))=0 or msrc_abstracts.word_count(d->'body')=0
 or d->>'authorityConfirmed'<>'true' or jsonb_array_length(d->'authors')=0
 or not exists(select 1 from jsonb_array_elements(c->'specialties') v where v->>'id'=d->>'specialtyId')
 or not exists(select 1 from jsonb_array_elements(c->'studyTypes') v where v->>'id'=d->>'studyTypeId')
 or jsonb_array_length(d->'keywords')<>(c->>'keywordCount')::integer then return false;end if;
 if exists(select 1 from jsonb_array_elements_text(d->'keywords') keyword_value where btrim(keyword_value)='') then return false;end if;
 foreach k in array array['piAuthorId','correspondingAuthorId'] loop
 if not exists(select 1 from jsonb_array_elements(d->'authors') v where v->>'id'=d->>k) then return false;end if;end loop;
 if d->>'presentingAuthorId' is not null and not exists(select 1 from jsonb_array_elements(d->'authors') v where v->>'id'=d->>'presentingAuthorId') then return false;end if;
 if char_length(btrim(d->>'conflictOfInterest'))=0 or char_length(btrim(d->>'fundingDeclaration'))=0
 or char_length(btrim(d->>'ethicsExplanation'))=0 then return false;end if;
 foreach k in array array['background','aim','methods','conclusion'] loop
 if char_length(btrim(d->'body'->>k))=0 then return false;end if;end loop;
 if d->>'completionStatus'='completed' and char_length(btrim(d->'body'->>'results'))=0 then return false;end if;
 return true;
end$$;
create function msrc_abstracts.projection(s msrc_abstracts.submissions) returns jsonb language sql volatile security invoker set search_path='' as $$
 select jsonb_build_object('id',s.id,'reference',s.reference,'status',case when s.status='revision_requested' and s.revision_deadline<=clock_timestamp() then 'revision_expired' else s.status end,
 'version',s.version,'document',s.document,'wordCount',s.word_count,'finalizedAt',s.finalized_at,'decision',
 (select jsonb_build_object('outcome',d.outcome,'instructions',d.instructions,'revisionDeadline',d.revision_deadline,
 'permittedFields',case when d.outcome='revise' then '["title","body","keywords"]'::jsonb else '[]'::jsonb end)
 from msrc_abstracts.decisions d join msrc_abstracts.publications p on p.decision_id=d.id where d.submission_id=s.id order by p.published_at desc,d.id desc limit 1));
$$;
create function msrc_abstracts.participant_settings(edition text) returns jsonb language sql volatile security invoker set search_path='' as $$
 select jsonb_build_object('specialties',c->'specialties','studyTypes',c->'studyTypes','keywordCount',c->'keywordCount','opensAt',c->'opensAt','closesAt',c->'closesAt',
 'correspondingAuthorPolicy',c->'correspondingAuthorPolicy','windowState',case when not msrc_abstracts.settings_valid(c,true) or not coalesce(s.evidence_ready,false) then 'not_ready'
 when coalesce(s.enabled,false) and clock_timestamp()>=(c->>'opensAt')::timestamptz and clock_timestamp()<(c->>'closesAt')::timestamptz then 'open' else 'closed' end)
 from (select coalesce((select configuration from msrc_abstracts.settings where edition_key=edition),msrc_abstracts.settings_defaults()) c) x
 left join msrc_abstracts.settings s on s.edition_key=edition;
$$;

create function public.msrc_abstracts_status(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
begin
 perform msrc_abstracts.guard();perform msrc_registration.server_only();
 return jsonb_build_object('enabled',coalesce((select enabled from msrc_abstracts.settings s where s.edition_key=edition_key),false),
 'settingsComplete',coalesce((select msrc_abstracts.settings_valid(configuration,true) and evidence_ready from msrc_abstracts.settings s where s.edition_key=edition_key),false),
 'evidenceGate','virus_scanning_and_evidence_pending');
end$$;
create function msrc_abstracts.participant(edition text,action text,submission_id uuid,expected_version integer,d jsonb,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_abstracts.settings%rowtype;s msrc_abstracts.submissions%rowtype;result jsonb;previous msrc_abstracts.operations%rowtype;budget msrc_abstracts.mutation_limits%rowtype;
 input bytea;pi text;reference_number bigint;window_open boolean;begin
 perform 1 from msrc_authorization.account_access a where a.actor_id=auth.uid() for share;
 perform 1 from auth.users u where u.id=auth.uid() for share;
 if not msrc_participant.ready() then return jsonb_build_object('state','closed');end if;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 if action='me' then
 select coalesce(jsonb_agg(msrc_abstracts.projection(q) order by q.created_at desc,q.id),'[]'::jsonb) into result from msrc_abstracts.submissions q where q.edition_key=edition and q.actor_id=auth.uid();
 return jsonb_build_object('state','ready','settings',msrc_abstracts.participant_settings(edition),'submissions',result);end if;
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
 if cfg.edition_key is null or not cfg.enabled or not msrc_abstracts.settings_valid(cfg.configuration,true) then return jsonb_build_object('state','closed');end if;
 window_open:=clock_timestamp()>=(cfg.configuration->>'opensAt')::timestamptz and clock_timestamp()<(cfg.configuration->>'closesAt')::timestamptz;
 if submission_id is not null then
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition and q.actor_id=auth.uid() for update;
 if not found then return jsonb_build_object('state','denied');end if;
 if s.version<>expected_version then return jsonb_build_object('state','conflict');end if;
 if action='finalize' and s.status in('submitted','scientific_review','accepted','rejected') then return jsonb_build_object('state','finalized','submission',msrc_abstracts.projection(s));end if;
 if s.status not in('draft','revision_requested') then return jsonb_build_object('state','locked');end if;
 if s.status='revision_requested' then window_open:=s.revision_deadline>clock_timestamp();end if;
 elsif expected_version<>0 or action<>'save' then return jsonb_build_object('state','invalid');end if;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 window_open:=case when s.status='revision_requested' then s.revision_deadline>clock_timestamp() else clock_timestamp()>=(cfg.configuration->>'opensAt')::timestamptz and clock_timestamp()<(cfg.configuration->>'closesAt')::timestamptz end;
 if not window_open then return jsonb_build_object('state','closed');end if;
 if action='save' then
 if not msrc_abstracts.document_valid(d,cfg.configuration,false) then return jsonb_build_object('state','invalid');end if;
 -- Revision authority is deliberately limited to scientific text/keywords. Identity and declarations stay locked.
 if s.status='revision_requested' and (d-array['title','body','keywords']) is distinct from (s.document-array['title','body','keywords']) then return jsonb_build_object('state','invalid');end if;
 if s.id is null then
 insert into msrc_abstracts.submissions(edition_key,actor_id,version,document,word_count) values(edition,auth.uid(),1,d,msrc_abstracts.word_count(d->'body')) returning * into s;
 else update msrc_abstracts.submissions q set document=d,word_count=msrc_abstracts.word_count(d->'body'),version=q.version+1 where q.id=s.id returning * into s;end if;
 perform msrc_abstracts.record(edition,'draft.saved',s.id,jsonb_build_object('version',s.version));
 result:=jsonb_build_object('state','saved','submission',msrc_abstracts.projection(s));
 elsif action='finalize' then
 if not cfg.evidence_ready then return jsonb_build_object('state','evidence_gate');end if;
 if not msrc_abstracts.document_valid(s.document,cfg.configuration,true) then return jsonb_build_object('state','invalid');end if;
 select lower(btrim(a->>'email')) into strict pi from jsonb_array_elements(s.document->'authors') a where a->>'id'=s.document->>'piAuthorId';
 perform pg_advisory_xact_lock(hashtextextended('abstract-pi:'||edition||':'||pi,0));
 if s.finalized_at is null and (select count(*) from msrc_abstracts.submissions q where q.edition_key=edition and q.pi_key=pi and q.finalized_at is not null)>=2 then return jsonb_build_object('state','pi_limit');end if;
 if s.reference is null then update msrc_abstracts.settings q set next_reference=q.next_reference+1 where q.edition_key=edition returning next_reference-1 into reference_number;end if;
 update msrc_abstracts.submissions q set status='submitted',finalized_at=coalesce(q.finalized_at,clock_timestamp()),pi_key=pi,
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
create function msrc_abstracts.forward(edition text,claims jsonb,action text,submission_id uuid,expected_version integer,d jsonb,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare saved text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform msrc_abstracts.guard();perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_abstracts.participant(edition,action,submission_id,expected_version,d,operation_id);
 exception when others then perform set_config('request.jwt.claims',coalesce(saved,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(saved,''),true);return result;
end$$;
create function public.msrc_abstracts_me(edition_key text,session_claims jsonb) returns jsonb language sql security definer set search_path='' as $$
 select msrc_abstracts.forward(edition_key,session_claims,'me',null,null,null,null);$$;
create function public.msrc_abstracts_save_draft(edition_key text,session_claims jsonb,submission_id uuid,expected_version integer,document jsonb,operation_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select msrc_abstracts.forward(edition_key,session_claims,'save',submission_id,expected_version,document,operation_id);$$;
create function public.msrc_abstracts_finalize(edition_key text,session_claims jsonb,submission_id uuid,expected_version integer,operation_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select msrc_abstracts.forward(edition_key,session_claims,'finalize',submission_id,expected_version,null,operation_id);$$;

create function public.msrc_staff_research_settings(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.settings%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select * into s from msrc_abstracts.settings q where q.edition_key=edition_key;
 return jsonb_build_object('state','ready','version',coalesce(s.version,0),'settings',coalesce(s.configuration,msrc_abstracts.settings_defaults()),
 'enabled',coalesce(s.enabled,false),'evidenceReady',coalesce(s.evidence_ready,false),'complete',coalesce(msrc_abstracts.settings_valid(s.configuration,true),false));
end$$;
create function public.msrc_staff_research_save_settings(edition_key text,expected_version integer,settings jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.settings%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if not msrc_abstracts.settings_valid(settings,false) or expected_version is null then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('abstract-settings:'||edition_key,0));
 select * into s from msrc_abstracts.settings q where q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if coalesce(s.version,0)<>expected_version then return jsonb_build_object('state','conflict');end if;
 if s.edition_key is null then insert into msrc_abstracts.settings(edition_key,version,configuration) values(edition_key,1,settings) returning * into s;
 else update msrc_abstracts.settings q set version=q.version+1,configuration=settings where q.edition_key=edition_key returning * into s;end if;
 insert into msrc_abstracts.settings_versions values(edition_key,s.version,settings);
 perform msrc_abstracts.record(edition_key,'settings.saved',null,jsonb_build_object('version',s.version));
 return public.msrc_staff_research_settings(edition_key);
end$$;
create function msrc_abstracts.science_document(d jsonb) returns jsonb language sql immutable security invoker set search_path='' as $$
 select d-array['ethicsStatus','ethicsExplanation'];$$;
create function public.msrc_staff_research_list(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare result jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'reference',s.reference,'status',s.status,'version',s.version,'title',s.document->>'title','wordCount',s.word_count,
 'packetReady',exists(select 1 from msrc_abstracts.packets p where p.submission_id=s.id and p.submission_version=s.version),
 'assignedCount',(select count(*) from msrc_abstracts.assignments a where a.submission_id=s.id and a.submission_version=s.version and a.status in('assigned','draft','completed') and msrc_abstracts.reviewer_eligible(s.edition_key,a.reviewer_id) and not msrc_abstracts.has_conflict(s.edition_key,s.id,a.reviewer_id)),
 'completedCount',(select count(*) from msrc_abstracts.assignments a where a.submission_id=s.id and a.submission_version=s.version and a.status='completed' and msrc_abstracts.reviewer_eligible(s.edition_key,a.reviewer_id) and not msrc_abstracts.has_conflict(s.edition_key,s.id,a.reviewer_id)
 and a.rubric_version=(select x.settings_version from msrc_abstracts.snapshots x where x.submission_id=s.id and x.version=s.version)),
 'decision',(select jsonb_build_object('id',d.id,'outcome',d.outcome,'reason',d.reason,'instructions',d.instructions,'revisionDeadline',d.revision_deadline,
 'state',case when exists(select 1 from msrc_abstracts.publications p where p.decision_id=d.id) then 'published' else 'draft' end)
 from msrc_abstracts.decisions d where d.submission_id=s.id and d.submission_version=s.version order by d.created_at desc,d.id desc limit 1)) order by s.created_at,s.id),'[]'::jsonb)
 into result from msrc_abstracts.submissions s where s.edition_key=edition_key and s.finalized_at is not null;
 return jsonb_build_object('state','ready','submissions',result);
end$$;
create function msrc_abstracts.review_summary(submission uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare s msrc_abstracts.submissions%rowtype;c jsonb;reviews jsonb;completed integer;mean numeric;begin
 select * into s from msrc_abstracts.submissions where id=submission;
 select v.configuration into c from msrc_abstracts.snapshots x join msrc_abstracts.settings_versions v on v.edition_key=s.edition_key and v.version=x.settings_version where x.submission_id=s.id and x.version=s.version;
 select coalesce(jsonb_agg(jsonb_build_object('assignmentId',a.id,'submissionVersion',a.submission_version,'rubricVersion',a.rubric_version,'total',a.score_total,'scorecard',a.scorecard,'rubric',v.configuration->'rubric') order by a.id),'[]'::jsonb),count(*)::integer,avg(a.score_total)
 into reviews,completed,mean from msrc_abstracts.assignments a join msrc_abstracts.settings_versions v on v.edition_key=a.edition_key and v.version=a.rubric_version
 where a.submission_id=s.id and a.submission_version=s.version and a.status='completed'
 and msrc_abstracts.reviewer_eligible(s.edition_key,a.reviewer_id) and not msrc_abstracts.has_conflict(s.edition_key,s.id,a.reviewer_id)
 and a.rubric_version=(select x.settings_version from msrc_abstracts.snapshots x where x.submission_id=s.id and x.version=s.version);
 return jsonb_build_object('requiredReviews',c->'reviewersPerAbstract','completedReviews',completed,'meanScore',case when completed>=(c->>'reviewersPerAbstract')::integer then mean end,'reviews',reviews);
end$$;
create function public.msrc_staff_research_submission(edition_key text,submission_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.submissions%rowtype;packet jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition_key and q.finalized_at is not null;
 if not found then return jsonb_build_object('state','unavailable');end if;
 select p.packet into packet from msrc_abstracts.packets p where p.submission_id=s.id and p.submission_version=s.version;
 perform msrc_abstracts.record(edition_key,'submission.read',s.id);
 return jsonb_build_object('state','ready','submission',(msrc_abstracts.projection(s)-'document')||jsonb_build_object('document',msrc_abstracts.science_document(s.document)),
 'packet',packet,'packetVersion',case when packet is null then 0 else s.version end,'reviewSummary',msrc_abstracts.review_summary(s.id));
end$$;
create function msrc_abstracts.packet_valid(p jsonb,d jsonb) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare needle text;k text;begin
 if jsonb_typeof(p) is distinct from 'object' or p<>jsonb_build_object('title',p->'title','body',p->'body','specialtyId',p->'specialtyId','studyTypeId',p->'studyTypeId','completionStatus',p->'completionStatus','keywords',p->'keywords')
 or jsonb_typeof(p->'title') is distinct from 'string' or char_length(btrim(p->>'title')) not between 1 and 500
 or p->'specialtyId' is distinct from d->'specialtyId' or p->'studyTypeId' is distinct from d->'studyTypeId' or p->'completionStatus' is distinct from d->'completionStatus'
 or jsonb_typeof(p->'keywords') is distinct from 'array' or octet_length(p::text)>16384
 or jsonb_typeof(p->'body') is distinct from 'object' or p->'body'<>jsonb_build_object('background',p->'body'->'background','aim',p->'body'->'aim','methods',p->'body'->'methods','results',p->'body'->'results','conclusion',p->'body'->'conclusion') then return false;end if;
 foreach k in array array['background','aim','methods','results','conclusion'] loop
 if jsonb_typeof(p->'body'->k) is distinct from 'string' then return false;end if;end loop;
 if msrc_abstracts.word_count(p->'body') not between 1 and 300 or p::text~*'[^[:space:]]+@[^[:space:]]+[.]' then return false;end if;
 if exists(select 1 from jsonb_array_elements(p->'keywords') v where jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>100) then return false;end if;
 -- Exact known identities plus human attestation: automatic stripping cannot prove body anonymity.
 for needle in select a->>'name' from jsonb_array_elements(d->'authors') a union all select a->>'email' from jsonb_array_elements(d->'authors') a
 union all select f from jsonb_array_elements(d->'authors') a cross join lateral jsonb_array_elements_text(a->'affiliations') f loop
 if char_length(btrim(needle))>1 and (position(lower(btrim(needle)) in lower(p::text))>0
 or position(regexp_replace(lower(needle),'[^[:alnum:]]','','g') in regexp_replace(lower(p::text),'[^[:alnum:]]','','g'))>0) then return false;end if;end loop;
 return true;
end$$;
create function public.msrc_staff_research_prepare_packet(edition_key text,submission_id uuid,expected_version integer,packet jsonb,attestation boolean) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.submissions%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 if not found or s.finalized_at is null then return jsonb_build_object('state','unavailable');end if;
 if s.version is distinct from expected_version then return jsonb_build_object('state','conflict');end if;
 if s.status not in('submitted','scientific_review') or not exists(select 1 from msrc_abstracts.snapshots x where x.submission_id=s.id and x.version=s.version) then return jsonb_build_object('state','unavailable');end if;
 if attestation is distinct from true or not msrc_abstracts.packet_valid(packet,s.document) then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_abstracts.packets p where p.submission_id=s.id and p.submission_version=s.version) then return jsonb_build_object('state','locked');end if;
 insert into msrc_abstracts.packets values(s.id,s.version,packet,auth.uid(),clock_timestamp());
 perform msrc_abstracts.record(edition_key,'packet.prepared',s.id,jsonb_build_object('version',s.version));return jsonb_build_object('state','prepared');
end$$;

create function msrc_abstracts.normalized_affiliation(value text) returns text language sql immutable security invoker set search_path='' as $$
 select regexp_replace(lower(btrim(value)),'[^[:alnum:]]','','g');$$;
create function msrc_abstracts.reviewer_eligible(edition text,reviewer uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from msrc_authorization.role_grants g join msrc_authorization.account_access a on a.actor_id=g.actor_id
 join msrc_staff.profiles p on p.actor_id=g.actor_id join msrc_abstracts.reviewer_profiles r on r.actor_id=g.actor_id and r.edition_key=g.edition_key
 where g.actor_id=reviewer and g.edition_key=edition and g.role_name='abstractReviewer' and g.scope_kind='edition' and g.state='active'
 and a.state='active' and not msrc_staff.recovery_blocked(g.actor_id));$$;
create function msrc_abstracts.has_conflict(edition text,submission uuid,reviewer uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from msrc_abstracts.submissions s where s.id=submission and (s.actor_id=reviewer or exists(
 select 1 from jsonb_array_elements(s.document->'authors') a where lower(btrim(a->>'email'))=(select lower(btrim(email)) from auth.users where id=reviewer))))
 or exists(select 1 from msrc_abstracts.submissions s cross join lateral jsonb_array_elements(s.document->'authors') a
 cross join lateral jsonb_array_elements_text(a->'affiliations') f join msrc_abstracts.reviewer_profiles r on r.edition_key=edition and r.actor_id=reviewer
 cross join lateral unnest(r.affiliations) rf where s.id=submission and msrc_abstracts.normalized_affiliation(f)=msrc_abstracts.normalized_affiliation(rf));$$;
create function public.msrc_staff_research_declare_affiliations(edition_key text,affiliations text[]) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare conflicted_id uuid;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['abstractReviewer']) is null then return jsonb_build_object('state','denied');end if;
 if affiliations is null or cardinality(affiliations)=0 or octet_length(affiliations::text)>16384
 or exists(select 1 from unnest(affiliations) a where a is null or char_length(btrim(a)) not between 1 and 500 or msrc_abstracts.normalized_affiliation(a)='') then return jsonb_build_object('state','invalid');end if;
 perform 1 from msrc_abstracts.settings s where s.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['abstractReviewer']) is null then return jsonb_build_object('state','denied');end if;
 if not found then return jsonb_build_object('state','area_not_ready');end if;
 insert into msrc_abstracts.reviewer_profiles values(edition_key,auth.uid(),affiliations) on conflict on constraint reviewer_profiles_pkey do update set affiliations=excluded.affiliations;
 -- A newly declared affiliation withdraws conflicting assignments, including completed cards from aggregation.
 for conflicted_id in update msrc_abstracts.assignments a set status='conflict',version=a.version+1,response_reason='Declared affiliation conflict'
 where a.edition_key=edition_key and a.reviewer_id=auth.uid() and a.status in('assigned','draft','completed') and msrc_abstracts.has_conflict(edition_key,a.submission_id,auth.uid()) returning a.id loop
 perform msrc_abstracts.record(edition_key,'review.conflict',conflicted_id,jsonb_build_object('reason','Declared affiliation conflict'));end loop;
 perform msrc_abstracts.record(edition_key,'reviewer.affiliations',auth.uid());return jsonb_build_object('state','updated');
end$$;
create function public.msrc_staff_research_reviewers(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare result jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.actor_id,'name',p.name,'affiliations',to_jsonb(r.affiliations),'activeAssignments',
 (select count(*) from msrc_abstracts.assignments a where a.edition_key=edition_key and a.reviewer_id=r.actor_id and a.status in('assigned','draft','completed'))) order by p.name,r.actor_id),'[]'::jsonb)
 into result from msrc_abstracts.reviewer_profiles r join msrc_staff.profiles p on p.actor_id=r.actor_id where r.edition_key=edition_key and msrc_abstracts.reviewer_eligible(edition_key,r.actor_id);
 return jsonb_build_object('state','ready','reviewers',result);
end$$;
create function msrc_abstracts.assign(edition text,submission uuid,reviewer uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s msrc_abstracts.submissions%rowtype;c msrc_abstracts.settings%rowtype;a msrc_abstracts.assignments%rowtype;withdrawn_id uuid;begin
 select * into c from msrc_abstracts.settings where edition_key=edition for update;
 if msrc_staff.authorize(edition,array['scientificAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 if not found or not msrc_abstracts.settings_valid(c.configuration,true) then return jsonb_build_object('state','area_not_ready');end if;
 select * into s from msrc_abstracts.submissions where id=submission and edition_key=edition for update;
 if not found or s.status not in('submitted','scientific_review') then return jsonb_build_object('state','unavailable');end if;
 select v.configuration,v.version into c.configuration,c.version from msrc_abstracts.snapshots x join msrc_abstracts.settings_versions v on v.edition_key=edition and v.version=x.settings_version where x.submission_id=s.id and x.version=s.version;
 if clock_timestamp()>=(c.configuration->>'reviewDeadline')::timestamptz then return jsonb_build_object('state','locked');end if;
 if not exists(select 1 from msrc_abstracts.packets p where p.submission_id=s.id and p.submission_version=s.version) then return jsonb_build_object('state','packet_required');end if;
 for withdrawn_id in update msrc_abstracts.assignments q set status='withdrawn',version=q.version+1
 where q.submission_id=s.id and q.submission_version=s.version and q.status in('assigned','draft','completed')
 and (not msrc_abstracts.reviewer_eligible(edition,q.reviewer_id) or msrc_abstracts.has_conflict(edition,s.id,q.reviewer_id)) returning q.id loop
 perform msrc_abstracts.record(edition,'review.withdrawn',withdrawn_id,jsonb_build_object('reason','Current eligibility or declared conflict'));end loop;
 if not msrc_abstracts.reviewer_eligible(edition,reviewer) then return jsonb_build_object('state','denied');end if;
 if msrc_abstracts.has_conflict(edition,s.id,reviewer) then return jsonb_build_object('state','coi');end if;
 if exists(select 1 from msrc_abstracts.assignments q where q.submission_id=s.id and q.submission_version=s.version and q.reviewer_id=reviewer) then return jsonb_build_object('state','duplicate');end if;
 if (select count(*) from msrc_abstracts.assignments q where q.submission_id=s.id and q.submission_version=s.version and q.status in('assigned','draft','completed')) >= (c.configuration->>'reviewersPerAbstract')::integer then return jsonb_build_object('state','full');end if;
 insert into msrc_abstracts.assignments(edition_key,submission_id,submission_version,rubric_version,reviewer_id)
 values(edition,s.id,s.version,c.version,reviewer) returning * into a;
 update msrc_abstracts.submissions set status='scientific_review' where id=s.id;
 perform msrc_abstracts.record(edition,'review.assigned',a.id,jsonb_build_object('submissionId',s.id,'submissionVersion',s.version,'rubricVersion',c.version));
 return jsonb_build_object('state','assigned','assignmentId',a.id);
end$$;
create function public.msrc_staff_research_assign(edition_key text,submission_id uuid,reviewer_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 return msrc_abstracts.assign(edition_key,submission_id,reviewer_id);end$$;
create function public.msrc_staff_research_auto_assign(edition_key text,submission_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare reviewer uuid;result jsonb;assigned integer:=0;c msrc_abstracts.settings%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 select * into c from msrc_abstracts.settings s where s.edition_key=edition_key for update;
 if not found or not msrc_abstracts.settings_valid(c.configuration,true) then return jsonb_build_object('state','area_not_ready');end if;
 for reviewer in select r.actor_id from msrc_abstracts.reviewer_profiles r where r.edition_key=edition_key
 and msrc_abstracts.reviewer_eligible(edition_key,r.actor_id) and not msrc_abstracts.has_conflict(edition_key,submission_id,r.actor_id)
 and not exists(select 1 from msrc_abstracts.assignments a join msrc_abstracts.submissions s on s.id=a.submission_id where a.submission_id=submission_id and a.submission_version=s.version and a.reviewer_id=r.actor_id)
 order by (select count(*) from msrc_abstracts.assignments a where a.edition_key=edition_key and a.reviewer_id=r.actor_id and a.status in('assigned','draft','completed')),r.actor_id loop
 result:=msrc_abstracts.assign(edition_key,submission_id,reviewer);if result->>'state'='full' then exit;end if;
 if result->>'state'<>'assigned' then return result;end if;assigned:=assigned+1;end loop;
 perform msrc_abstracts.record(edition_key,'review.auto_assigned',submission_id,jsonb_build_object('assigned',assigned));
 return jsonb_build_object('state','assigned','count',assigned);
end$$;
create function public.msrc_staff_research_queue(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare oversight boolean;result jsonb;affiliations jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['abstractReviewer','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 oversight:=msrc_staff.authorize(edition_key,array['abstractReviewer'],false) is null;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'reference',s.reference,'status',a.status,'version',a.version,'title',p.packet->>'title') order by s.reference,a.id),'[]'::jsonb)
 into result from msrc_abstracts.assignments a join msrc_abstracts.submissions s on s.id=a.submission_id join msrc_abstracts.packets p on p.submission_id=a.submission_id and p.submission_version=a.submission_version
 where a.edition_key=edition_key and (oversight or a.reviewer_id=auth.uid());
 select to_jsonb(r.affiliations) into affiliations from msrc_abstracts.reviewer_profiles r where r.edition_key=edition_key and r.actor_id=auth.uid();
 return jsonb_build_object('state','ready','oversight',oversight,'assignments',result,'ownAffiliations',coalesce(affiliations,'[]'::jsonb));
end$$;
create function public.msrc_staff_research_packet(edition_key text,assignment_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_abstracts.assignments%rowtype;p jsonb;c jsonb;is_reviewer boolean;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['abstractReviewer','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 is_reviewer:=msrc_staff.authorize(edition_key,array['abstractReviewer'],false) is not null;
 select * into a from msrc_abstracts.assignments q where q.id=assignment_id and q.edition_key=edition_key and (not is_reviewer or q.reviewer_id=auth.uid());
 if not found then return jsonb_build_object('state','denied');end if;
 if is_reviewer and (a.status in('conflict','declined','withdrawn') or msrc_abstracts.has_conflict(edition_key,a.submission_id,auth.uid())) then return jsonb_build_object('state','denied');end if;
 select packet into p from msrc_abstracts.packets q where q.submission_id=a.submission_id and q.submission_version=a.submission_version;
 select configuration into c from msrc_abstracts.settings_versions v where v.edition_key=edition_key and v.version=a.rubric_version;
 perform msrc_abstracts.record(edition_key,'packet.read',a.id);
 return jsonb_build_object('state','ready','assignment',jsonb_build_object('id',a.id,'version',a.version,'status',a.status,'submissionVersion',a.submission_version,'rubricVersion',a.rubric_version),
 'packet',p,'rubric',c->'rubric','scorecard',case when is_reviewer then a.scorecard else null end,
 'reviewPolicy',jsonb_build_object('deadline',c->'reviewDeadline','ongoingPolicy',c->'ongoingPolicy','requiredReviews',c->'reviewersPerAbstract','aggregationPolicy',c->'aggregationPolicy','notApplicablePolicy',c->'notApplicablePolicy'),
 'studyTemplate',(select t->>'template' from jsonb_array_elements(c->'studyTypes') t where t->>'id'=p->>'studyTypeId'));
end$$;
create function public.msrc_staff_research_review_response(edition_key text,assignment_id uuid,response text,reason text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_abstracts.assignments%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['abstractReviewer']) is null then return jsonb_build_object('state','denied');end if;
 if response is null or response not in('decline','conflict') or reason is null or char_length(btrim(reason)) not between 1 and 3000 then return jsonb_build_object('state','invalid');end if;
 perform 1 from msrc_abstracts.settings s where s.edition_key=edition_key for share;
 select * into a from msrc_abstracts.assignments q where q.id=assignment_id and q.edition_key=edition_key and q.reviewer_id=auth.uid() for update;
 if msrc_staff.authorize(edition_key,array['abstractReviewer']) is null then return jsonb_build_object('state','denied');end if;
 if not found then return jsonb_build_object('state','denied');end if;
 if a.status in('withdrawn','declined','conflict') then return jsonb_build_object('state','locked');end if;
 if not exists(select 1 from msrc_abstracts.submissions s where s.id=a.submission_id and s.version=a.submission_version and s.status='scientific_review') then return jsonb_build_object('state','locked');end if;
 update msrc_abstracts.assignments set status=case response when 'decline' then 'declined' else 'conflict' end,response_reason=reason,version=version+1 where id=a.id;
 perform msrc_abstracts.record(edition_key,'review.'||response,a.id);return jsonb_build_object('state','updated');
end$$;
create function public.msrc_staff_research_scorecard(edition_key text,assignment_id uuid,expected_version integer,scorecard jsonb,submit boolean) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_abstracts.assignments%rowtype;c jsonb;criterion jsonb;score jsonb;total numeric:=0;denominator numeric:=0;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['abstractReviewer']) is null then return jsonb_build_object('state','denied');end if;
 perform 1 from msrc_abstracts.settings s where s.edition_key=edition_key for share;
 select * into a from msrc_abstracts.assignments q where q.id=assignment_id and q.edition_key=edition_key and q.reviewer_id=auth.uid() for update;
 if msrc_staff.authorize(edition_key,array['abstractReviewer']) is null then return jsonb_build_object('state','denied');end if;
 if not found then return jsonb_build_object('state','denied');end if;
 if a.version is distinct from expected_version then return jsonb_build_object('state','conflict');end if;
 select configuration into c from msrc_abstracts.settings_versions v where v.edition_key=edition_key and v.version=a.rubric_version;
 if a.status not in('assigned','draft','completed') or clock_timestamp()>=(c->>'reviewDeadline')::timestamptz
 or not exists(select 1 from msrc_abstracts.submissions s where s.id=a.submission_id and s.version=a.submission_version and s.status='scientific_review') then return jsonb_build_object('state','locked');end if;
 if msrc_abstracts.has_conflict(edition_key,a.submission_id,auth.uid()) then return jsonb_build_object('state','coi');end if;
 if submit is null or jsonb_typeof(scorecard) is distinct from 'object' or scorecard<>jsonb_build_object('scores',scorecard->'scores','comments',scorecard->'comments','recommendation',scorecard->'recommendation')
 or jsonb_typeof(scorecard->'comments') is distinct from 'string' or char_length(scorecard->>'comments')>6000
 or not(coalesce(scorecard->>'recommendation','') in('accept','reject','revise') or (not submit and scorecard->'recommendation'='null'::jsonb))
 or jsonb_typeof(scorecard->'scores') is distinct from 'array' or (submit and jsonb_array_length(scorecard->'scores')<>jsonb_array_length(c->'rubric')) then return jsonb_build_object('state','invalid');end if;
 if (select count(*)<>count(distinct v->>'criterionId') from jsonb_array_elements(scorecard->'scores') v) then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from jsonb_array_elements(scorecard->'scores') v where not exists(select 1 from jsonb_array_elements(c->'rubric') r where r->>'id'=v->>'criterionId')) then return jsonb_build_object('state','invalid');end if;
 for criterion in select value from jsonb_array_elements(c->'rubric') loop
 select v into score from jsonb_array_elements(scorecard->'scores') v where v->>'criterionId'=criterion->>'id';
 if not found then if submit then return jsonb_build_object('state','invalid');else continue;end if;end if;
 if score<>jsonb_build_object('criterionId',score->'criterionId','value',score->'value') or jsonb_typeof(score->'value') is distinct from 'number' then return jsonb_build_object('state','invalid');end if;
 if (score->>'value')::numeric<(criterion->>'min')::numeric or (score->>'value')::numeric>(criterion->>'max')::numeric then return jsonb_build_object('state','invalid');end if;
 total:=total+((score->>'value')::numeric-(criterion->>'min')::numeric)/((criterion->>'max')::numeric-(criterion->>'min')::numeric)*(criterion->>'weight')::numeric;
 denominator:=denominator+(criterion->>'weight')::numeric;end loop;
 update msrc_abstracts.assignments q set scorecard=scorecard,score_total=case when denominator>0 then total/denominator*100 end,status=case when submit then 'completed' else 'draft' end,version=q.version+1 where q.id=a.id returning * into a;
 insert into msrc_abstracts.scorecard_versions values(a.id,a.version,scorecard,submit,a.score_total);
 perform msrc_abstracts.record(edition_key,case when submit then 'review.completed' else 'review.saved' end,a.id,jsonb_build_object('version',a.version));
 return jsonb_build_object('state','updated','version',a.version);
end$$;

create function msrc_abstracts.reviews_complete(submission uuid,version integer) returns boolean language sql stable security invoker set search_path='' as $$
 select count(a.id)>=(v.configuration->>'reviewersPerAbstract')::integer from msrc_abstracts.submissions s
 join msrc_abstracts.snapshots x on x.submission_id=s.id and x.version=reviews_complete.version
 join msrc_abstracts.settings_versions v on v.edition_key=s.edition_key and v.version=x.settings_version
 left join msrc_abstracts.assignments a on a.submission_id=s.id and a.submission_version=x.version and a.status='completed'
 and a.rubric_version=x.settings_version and msrc_abstracts.reviewer_eligible(s.edition_key,a.reviewer_id)
 and not msrc_abstracts.has_conflict(s.edition_key,s.id,a.reviewer_id)
 where s.id=submission group by v.configuration;
$$;
create function msrc_abstracts.review_basis(submission uuid,version integer) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('submissionVersion',x.version,'settingsVersion',x.settings_version,'completed',
 coalesce((select jsonb_agg(jsonb_build_object('assignmentId',a.id,'scorecardVersion',a.version,'rubricVersion',a.rubric_version) order by a.id)
 from msrc_abstracts.assignments a where a.submission_id=s.id and a.submission_version=x.version and a.status='completed'
 and a.rubric_version=x.settings_version and msrc_abstracts.reviewer_eligible(s.edition_key,a.reviewer_id)
 and not msrc_abstracts.has_conflict(s.edition_key,s.id,a.reviewer_id)),'[]'::jsonb))
 from msrc_abstracts.submissions s join msrc_abstracts.snapshots x on x.submission_id=s.id and x.version=review_basis.version where s.id=submission;
$$;
comment on column msrc_abstracts.decisions.review_basis is 'Immutable eligible completed assignment and scorecard version references. Components/totals and rubric are retained in their immutable version tables. Publication requires exactly the reviewed basis, including comment-only scorecard edits.';
create function public.msrc_staff_research_decision(edition_key text,submission_id uuid,expected_version integer,outcome text,reason text,instructions text,revision_deadline timestamptz) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.submissions%rowtype;id uuid;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 if outcome is null or outcome not in('accept','reject','revise') or reason is null or char_length(btrim(reason)) not between 1 and 3000
 or instructions is null or char_length(btrim(instructions)) not between 1 and 4000
 or (outcome='revise' and (revision_deadline is null or not isfinite(revision_deadline) or revision_deadline<=clock_timestamp()))
 or (outcome<>'revise' and revision_deadline is not null) then return jsonb_build_object('state','invalid');end if;
 -- Freeze the scientific basis against scorecard/response/profile mutations, using their common settings-first lock order.
 perform 1 from msrc_abstracts.settings q where q.edition_key=edition_key for update;
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 if not found or s.finalized_at is null then return jsonb_build_object('state','unavailable');end if;
 if s.version is distinct from expected_version then return jsonb_build_object('state','conflict');end if;
 if s.status not in('submitted','scientific_review') or not exists(select 1 from msrc_abstracts.snapshots q where q.submission_id=s.id and q.version=s.version) then return jsonb_build_object('state','locked');end if;
 if outcome='revise' and revision_deadline<=clock_timestamp() then return jsonb_build_object('state','invalid');end if;
 if outcome<>'revise' and not coalesce(msrc_abstracts.reviews_complete(s.id,s.version),false) then return jsonb_build_object('state','reviews_incomplete');end if;
 insert into msrc_abstracts.decisions(submission_id,submission_version,outcome,reason,instructions,revision_deadline,actor_id,review_basis)
 values(s.id,s.version,outcome,reason,instructions,revision_deadline,auth.uid(),msrc_abstracts.review_basis(s.id,s.version)) returning decisions.id into id;
 perform msrc_abstracts.record(edition_key,'decision.prepared',id,jsonb_build_object('submissionId',s.id,'version',s.version));
 return jsonb_build_object('state','prepared','decisionId',id);
end$$;
create function msrc_abstracts.message_valid(template text,version integer,locale text,recipient text,payload jsonb) returns boolean
 language plpgsql stable security invoker set search_path='' as $$
declare deadline timestamptz;begin
 if template is distinct from 'abstract_decision' or version is distinct from 1 or locale is distinct from 'en'
 or recipient is null or char_length(recipient)>254 or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
 or jsonb_typeof(payload) is distinct from 'object' or payload<>jsonb_build_object('reference',payload->'reference','outcome',payload->'outcome','instructions',payload->'instructions','revision_deadline',payload->'revision_deadline')
 or jsonb_typeof(payload->'reference') is distinct from 'string' or coalesce(payload->>'reference','')!~'^[A-Za-z0-9_-]{1,160}$'
 or coalesce(payload->>'outcome','') not in('accept','reject','revise') or jsonb_typeof(payload->'instructions') is distinct from 'string' or char_length(payload->>'instructions') not between 1 and 4000 then return false;end if;
 if payload->>'outcome'='revise' then
 if jsonb_typeof(payload->'revision_deadline') is distinct from 'string' then return false;end if;
 begin deadline:=(payload->>'revision_deadline')::timestamptz;exception when others then return false;end;
 return isfinite(deadline);end if;
 return payload->'revision_deadline'='null'::jsonb;
end$$;
alter table msrc_outbox.messages add column delivery_hold boolean not null default false;
alter table msrc_outbox.messages add constraint abstract_draft_delivery_hold check(template_key<>'abstract_decision' or (delivery_hold and status not in('sending','sent')));
alter table msrc_outbox.messages drop constraint outbox_template_input_check;
alter table msrc_outbox.messages add constraint outbox_template_input_check check(
 (template_key='synthetic_notice' and recipient_email~'^[A-Za-z0-9._%+-]{1,64}@example[.]invalid$' and jsonb_typeof(payload)='object'
 and payload=jsonb_build_object('reference',payload->'reference') and jsonb_typeof(payload->'reference') is not distinct from 'string' and coalesce(payload->>'reference'~'^[A-Za-z0-9_-]{1,80}$',false))
 or msrc_outbox.registration_message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_abstracts.message_valid(template_key,template_version,locale,recipient_email,payload));
create function msrc_abstracts.enqueue(decision_id uuid,recipient text,payload jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare key bytea;input bytea;i msrc_outbox.identities%rowtype;begin
 if current_user<>'postgres' or not msrc_abstracts.message_valid('abstract_decision',1,'en',recipient,payload) then raise exception using errcode='22023',message='Invalid abstract decision message.';end if;
 key:=sha256(convert_to('abstract-decision/'||decision_id::text,'UTF8'));input:=sha256(convert_to(jsonb_build_array('abstract_decision',1,'en',recipient,payload)::text,'UTF8'));
 insert into msrc_outbox.identities(key_hash,input_hash) values(key,input) on conflict do nothing returning * into i;
 if not found then select * into strict i from msrc_outbox.identities where key_hash=key for update;
 if i.input_hash<>input then raise exception using errcode='22023',message='Decision outbox idempotency conflict.';end if;return;end if;
 insert into msrc_outbox.messages(id,template_key,template_version,locale,recipient_email,payload,provider_idempotency_key,delivery_hold)
 values(i.id,'abstract_decision',1,'en',recipient,payload,'msrc-outbox/'||i.id::text,true);
end$$;
create function public.msrc_staff_research_batch(edition_key text,decision_ids uuid[],operation_id uuid,action text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare b msrc_abstracts.batches%rowtype;d msrc_abstracts.decisions%rowtype;s msrc_abstracts.submissions%rowtype;
 ids uuid[];preview jsonb:='[]'::jsonb;recipient text;total integer:=0;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 if operation_id is null or action is null or action not in('prepare','publish') or decision_ids is null or cardinality(decision_ids) not between 1 and 200
 or exists(select 1 from unnest(decision_ids) x where x is null) or (select count(*)<>count(distinct x) from unnest(decision_ids) x) then return jsonb_build_object('state','invalid');end if;
 select array_agg(x order by x) into ids from unnest(decision_ids) x;
 perform pg_advisory_xact_lock(hashtextextended('abstract-batch:'||operation_id::text,0));
 perform 1 from msrc_abstracts.settings q where q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 select * into b from msrc_abstracts.batches q where q.id=operation_id;
 if found and (b.edition_key<>edition_key or b.decision_ids<>ids) then return jsonb_build_object('state','conflict');end if;
 if action='publish' and b.id is null then return jsonb_build_object('state','preview_required');end if;
 if action='publish' and (select count(*) from msrc_abstracts.publications p where p.batch_id=b.id)=cardinality(ids) then return jsonb_build_object('state','published','batchId',b.id,'count',cardinality(ids),'emailState','draft_held');end if;
 -- Lock every target in a stable order and validate the whole batch before any write.
 perform 1 from msrc_abstracts.submissions q join msrc_abstracts.decisions x on x.submission_id=q.id where x.id=any(ids) order by q.id for update of q;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 if (select count(*) from msrc_abstracts.decisions x join msrc_abstracts.submissions q on q.id=x.submission_id where x.id=any(ids) and q.edition_key=edition_key)<>cardinality(ids)
 or (select count(*)<>count(distinct submission_id) from msrc_abstracts.decisions where id=any(ids)) then return jsonb_build_object('state','invalid');end if;
 for d in select * from msrc_abstracts.decisions q where q.id=any(ids) order by q.id loop
 select * into strict s from msrc_abstracts.submissions where id=d.submission_id;
 if s.version<>d.submission_version or s.status not in('submitted','scientific_review') or exists(select 1 from msrc_abstracts.publications p where p.decision_id=d.id)
 or exists(select 1 from msrc_abstracts.decisions newer where newer.submission_id=s.id and newer.submission_version=s.version and (newer.created_at,newer.id)>(d.created_at,d.id))
 or (d.outcome='revise' and d.revision_deadline<=clock_timestamp()) then return jsonb_build_object('state','conflict');end if;
 if d.outcome<>'revise' and not coalesce(msrc_abstracts.reviews_complete(s.id,s.version),false) then return jsonb_build_object('state','reviews_incomplete');end if;
 if d.review_basis is distinct from msrc_abstracts.review_basis(s.id,s.version) then return jsonb_build_object('state','conflict');end if;
 preview:=preview||jsonb_build_array(jsonb_build_object('id',d.id,'reference',s.reference,'outcome',d.outcome,'instructions',d.instructions,'revisionDeadline',d.revision_deadline));
 end loop;
 if b.id is null then insert into msrc_abstracts.batches values(operation_id,edition_key,ids,auth.uid(),clock_timestamp()) returning * into b;
 perform msrc_abstracts.record(edition_key,'batch.prepared',b.id,jsonb_build_object('count',cardinality(ids)));end if;
 if action='prepare' then return jsonb_build_object('state','prepared','batchId',b.id,'count',cardinality(ids),'decisions',preview);end if;
 for d in select * from msrc_abstracts.decisions q where q.id=any(ids) order by q.id loop
 select * into strict s from msrc_abstracts.submissions where id=d.submission_id;
 select email into strict recipient from auth.users where id=s.actor_id and email_confirmed_at is not null and deleted_at is null;
 perform msrc_abstracts.enqueue(d.id,recipient,jsonb_build_object('reference',s.reference,'outcome',d.outcome,'instructions',d.instructions,
 'revision_deadline',case when d.revision_deadline is not null then to_char(d.revision_deadline at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end));
 insert into msrc_abstracts.publications values(d.id,b.id,clock_timestamp());
 update msrc_abstracts.submissions set status=case d.outcome when 'accept' then 'accepted' when 'reject' then 'rejected' else 'revision_requested' end,
 revision_deadline=d.revision_deadline,revision_instructions=case when d.outcome='revise' then d.instructions end,
 version=case when d.outcome='revise' then version+1 else version end where id=s.id;
 update msrc_abstracts.assignments q set status='withdrawn',version=q.version+1 where q.submission_id=s.id and q.status in('assigned','draft');
 perform msrc_abstracts.record(edition_key,'decision.published',d.id,jsonb_build_object('batchId',b.id));total:=total+1;
 end loop;
 return jsonb_build_object('state','published','batchId',b.id,'count',total,'emailState','draft_held');
end$$;

revoke all on all functions in schema msrc_abstracts from public,anon,authenticated,service_role;
do $$declare p record;begin
 for p in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname like 'msrc_abstracts_%' loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',p.signature);
 execute format('grant execute on function %s to service_role',p.signature);end loop;
 for p in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname like 'msrc_staff_research_%' loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',p.signature);
 execute format('grant execute on function %s to authenticated',p.signature);end loop;
end$$;

-- Preserve the existing claim semantics; DRAFT abstract templates cannot acquire a delivery lease.
create or replace function public.msrc_outbox_claim(p_worker_id uuid,p_batch_size integer,p_daily_cap integer) returns jsonb
 language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare s msrc_outbox.settings%rowtype;m msrc_outbox.messages%rowtype;v_now timestamptz:=clock_timestamp();
 v_day date:=(clock_timestamp() at time zone 'UTC')::date;v_count integer;v_limit integer;v_claimed integer:=0;v_result jsonb:='[]'::jsonb;
begin
 if p_worker_id is null or p_batch_size is null or p_batch_size not between 1 and 10
  or p_daily_cap is null or p_daily_cap not between 0 and 100000 then
  raise exception using errcode='22023',message='Invalid outbox claim.';
 end if;
 -- A single short settings lock also serializes UTC-day budget admission. No
 -- send/render/network operation occurs while database locks are held.
 select * into strict s from msrc_outbox.settings where singleton for update;
 if not s.delivery_enabled then return v_result;end if;
 v_now:=clock_timestamp();
 v_day:=(v_now at time zone 'UTC')::date;
 v_limit:=least(s.daily_cap,p_daily_cap);
 if v_limit=0 then return v_result;end if;
 insert into msrc_outbox.daily_attempts values(v_day,0) on conflict do nothing;
 select attempt_count into v_count from msrc_outbox.daily_attempts where utc_day=v_day for update;
 if v_count>=v_limit then return v_result;end if;
 for m in select * from msrc_outbox.messages
  where not delivery_hold and ((status in('queued','failed_retryable') and next_attempt_at<=v_now)
   or (status='sending' and lease_expires_at<=v_now))
  order by next_attempt_at,created_at,id for update skip locked limit p_batch_size
 loop
  if m.attempt_count>=s.max_attempts or (m.first_attempt_at is not null
   and m.first_attempt_at+make_interval(secs=>s.retry_window_seconds)<=v_now) then
   update msrc_outbox.messages set status='failed_permanent',completed_at=v_now,updated_at=v_now,
    last_error_class=case when m.attempt_count>=s.max_attempts then 'max_attempts' else 'idempotency_window_expired' end,
    claimed_by=null,lease_token=null,lease_expires_at=null where id=m.id;
   continue;
  end if;
  exit when v_count+v_claimed>=v_limit;
  update msrc_outbox.messages set status='sending',attempt_count=attempt_count+1,
   claimed_by=p_worker_id,lease_token=gen_random_uuid(),lease_expires_at=v_now+make_interval(secs=>s.lease_seconds),
   first_attempt_at=coalesce(first_attempt_at,v_now),updated_at=v_now,completed_at=null
   where id=m.id returning * into m;
  v_claimed:=v_claimed+1;
  v_result:=v_result||jsonb_build_array(jsonb_build_object('id',m.id,'template_key',m.template_key,
   'template_version',m.template_version,'locale',m.locale,'recipient_email',m.recipient_email,'payload',m.payload,
   'attempt_count',m.attempt_count,'lease_token',m.lease_token,'lease_expires_at',m.lease_expires_at,
   'provider_idempotency_key',m.provider_idempotency_key,'provider_request',m.provider_request,'first_attempt_at',m.first_attempt_at));
 end loop;
 update msrc_outbox.daily_attempts set attempt_count=attempt_count+v_claimed where utc_day=v_day;
 return v_result;
end$$;


commit;
