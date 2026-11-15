PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE businesses (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL UNIQUE,
  address      TEXT NOT NULL DEFAULT '',
  upi          TEXT NOT NULL DEFAULT '',
  note         TEXT NOT NULL DEFAULT '',
  pass_hash    TEXT NOT NULL,
  salt         TEXT NOT NULL,
  created_at   INTEGER NOT NULL
, status TEXT NOT NULL DEFAULT 'active', plan TEXT NOT NULL DEFAULT 'free', is_super_admin INTEGER NOT NULL DEFAULT 0, last_active_at INTEGER NOT NULL DEFAULT 0, email TEXT NOT NULL DEFAULT '', token_mode TEXT NOT NULL DEFAULT 'daily', hide_loss_on_slip INTEGER NOT NULL DEFAULT 1, charge_basis TEXT NOT NULL DEFAULT 'output');
INSERT INTO "businesses" ("id","name","phone","address","upi","note","pass_hash","salt","created_at","status","plan","is_super_admin","last_active_at","email","token_mode","hide_loss_on_slip","charge_basis") VALUES('biz-maurya-solar-001','मौर्या सोलर चक्की','9554880713','सोलर ऊर्जा आटा, मसाला व तेल घानी','','सोलर ऊर्जा से संचालित आधुनिक चक्की','fa2126a06957e1640242afa2c0b64759ae17de2bd8770dfcda323a7fb9a508a1','74ae67ab009b91b3743b438ac99d2bc0',1794273600000,'active','pro',1,1794708248726,'home.rkmaurya@gmail.com','loop100',1,'output');
CREATE TABLE sessions (
  token_hash   TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('4c5cf37ef17739603656428befe411b56029f5548fb7c1ccba4d83c49ccdace4','biz-maurya-solar-001',1794273339278,1796865339278);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('167fc824a163eb2f86977d73c176379702e2fbef3ec653906332f0a04f5df719','biz-maurya-solar-001',1794273731883,1796865731883);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('a1b2d73d593bc02535994a99432f8c8069faa17c0c4434e19468e77ad894d420','biz-maurya-solar-001',1794273834907,1796865834907);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('f5345f86789d372cea7cdc0f3cdf9bb41c2a71b9fa0bddc80466e407bb4fe8ea','biz-maurya-solar-001',1794274669902,1796866669902);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('2f8027b852da9bb4bdefe31bb123224452a04c6665fea5475920e5261d791588','biz-maurya-solar-001',1794275116224,1796867116224);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('00a48d8ad4d864f35fc29bd0039e9fbfe1b3ef49df128ff2f0f0bda7c09bc920','biz-maurya-solar-001',1794275330276,1796867330276);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('12133ca66977312d2572ed0d14f29bac62a51734124e9e0532f8aa2e798b6159','biz-maurya-solar-001',1794275946943,1796867946943);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('eee02d69c929c27f0e0580454ec162c6503985174e58a6b785865d19183a82e4','biz-maurya-solar-001',1794275964188,1796867964188);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('131f01d2436fab0dc4866671f3508f1f4cb7b8f6ce1e4b519f2fed1b3a6749ad','biz-maurya-solar-001',1794276198691,1796868198691);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('40b00ccb20efe01149451e9c4b40ed4ec142a1a37a8ba4f30949dfed90cd13d8','biz-maurya-solar-001',1794277145620,1796869145620);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('343abdfe8fc97a1c32a617ff22eb81a94b05ff3a8cd2e554c7d7da1ffec3bafc','biz-maurya-solar-001',1794277657031,1796869657031);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('3e3b81d11f73c83736ab20f6b1cacfbeb910a0ef9141b3d14ccb38eff3b2a9e2','biz-maurya-solar-001',1794277682034,1796869682034);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('b446d42bb87b30c0edd0954770cc84384e19435314f19edcf4bfec0ca0489a4c','biz-maurya-solar-001',1794290079610,1796882079610);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('3a8b88f17c3bd784c6ad1d38e88cdd8d712256b7e5ee698ccf0ac23e35ff056a','biz-maurya-solar-001',1794290089450,1796882089450);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('5b3588081d4805c6845d845ccbab1f84d78451e73170910a82925390fbe14ac6','biz-maurya-solar-001',1794290097732,1796882097732);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('465fde8a765db47f8542229f810616962fb1836dd655e587bdc11780e5bf2ab3','biz-maurya-solar-001',1794290119297,1796882119297);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('a9a34a7df069eccb73ee1ba2da178a20c66286dacc4bb3a0e30872d872d5b1f0','biz-maurya-solar-001',1794290577838,1796882577838);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('918ac820a1de29c76d197bbd1a28c116a999ce33034636a223e78a9ff3bdeaa8','biz-maurya-solar-001',1794290718900,1796882718900);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('be2d5737059e1523b004f591f41668991be597662dca351ac563140c6940f609','biz-maurya-solar-001',1794290793534,1796882793534);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('18df96448d882339572c5baa0562cd7fdb8b55d26c2df49266ef78575cab4152','biz-maurya-solar-001',1794290806218,1796882806218);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('5eb16bed7699d86b74f1faefc7b3990825843607a2fcce51ee9c1e33a0222c61','biz-maurya-solar-001',1794290972553,1796882972553);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('2f5199a5f813aec2945bc2c8faf2eec71108269829c2303ad22db96b82a343f0','biz-maurya-solar-001',1794291973446,1796883973446);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('66a59e8e79fe58a8ef21c501eb926723639bcf17e5355be307081ac2bb8f428e','biz-maurya-solar-001',1794295115963,1796887115963);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('b32e4c1c4153498ea986f1ae08403a22417967e834dfb283d33ba92607b59ecc','biz-maurya-solar-001',1794295139404,1796887139404);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('d1a488b560b831f32801e0eb20278deb6cfe76e2380503a04f48854ff7c32ce4','biz-maurya-solar-001',1794296556687,1796888556687);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('0c27346d65be0b81ec60c06ed074d3e5c8794274f9950b6bd25d9719fe24417b','biz-maurya-solar-001',1794297618327,1796889618327);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('3f5b55424f7b4b0699843f4a251567bb74568510ed5e9afe81b4e0d1b7c30d78','biz-maurya-solar-001',1794298882525,1796890882525);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('b782a7dad6864ca54cb01b55975a820d55592cecb36320bbc7b7dc452557d495','biz-maurya-solar-001',1794299765673,1796891765673);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('3c962243ffc6c582314a56f76b53c3b8d2bd7587b933dfc048ddfe9992771811','biz-maurya-solar-001',1794302112046,1796894112046);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('8d4db8f00da2c5bab9bd375d643e79ade446e092d7b1c123cc50f529fc5d67ad','biz-maurya-solar-001',1794302496565,1796894496565);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('425a35632af3d00b4f1b83df8ee50a2aaf15dd3b584cf9d01f178f65d16cbc49','biz-maurya-solar-001',1794303257476,1796895257476);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('266d6791454a02b5c5ff07b85bf8edf8432c893e9b84d7a057111f1189a9170d','biz-maurya-solar-001',1794304072871,1796896072871);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('12954d63c7802e28ec369e598a527ba21177e56a2342a14d2fab32578347d885','biz-maurya-solar-001',1794304763243,1796896763243);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('73c8c0a2c490062badd1574219179d2f29b82c7e4cdedf39bc740b80c862ae01','biz-maurya-solar-001',1794304940632,1796896940632);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('ce46c22c6bf8021ed20d0626e535b6f3db575ce8f7400caac8e17c1ef3d41001','biz-maurya-solar-001',1794309181165,1796901181165);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('be1fd3403162c7dfc0f3801c91e6012fd8ffef2b2da589bca0c98c3f3dcfc92c','biz-maurya-solar-001',1794412279795,1797004279795);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('c37a80cf0888a9c08dbdf9902ccf49b94be151d65f87bbd55c86d4cef65ef38d','biz-maurya-solar-001',1794453541613,1797045541613);
INSERT INTO "sessions" ("token_hash","business_id","created_at","expires_at") VALUES('bdd5479030af0a5a8d4fea6fde82d7538dcead20b88510bdfdd7e45d722dfbf2','biz-maurya-solar-001',1794474515904,1797066515904);
CREATE TABLE services (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  name         TEXT NOT NULL,
  unit         TEXT NOT NULL DEFAULT 'kg',
  rate_paise   INTEGER NOT NULL DEFAULT 0,
  loss_rate_g  REAL NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "services" ("id","business_id","name","unit","rate_paise","loss_rate_g","active","sort") VALUES('svc-1','biz-maurya-solar-001','गेहूँ पिसाई (Wheat)','kg',120,15,1,0);
INSERT INTO "services" ("id","business_id","name","unit","rate_paise","loss_rate_g","active","sort") VALUES('svc-2','biz-maurya-solar-001','मक्का पिसाई (Maize)','kg',200,20,1,1);
INSERT INTO "services" ("id","business_id","name","unit","rate_paise","loss_rate_g","active","sort") VALUES('svc-3','biz-maurya-solar-001','चना / बेसन पिसाई (Chana)','kg',500,15,1,2);
INSERT INTO "services" ("id","business_id","name","unit","rate_paise","loss_rate_g","active","sort") VALUES('svc-4','biz-maurya-solar-001','बाजरा पिसाई (Bajra)','kg',350,20,1,3);
INSERT INTO "services" ("id","business_id","name","unit","rate_paise","loss_rate_g","active","sort") VALUES('svc-5','biz-maurya-solar-001','पशु आहार','kg',120,15,1,4);
INSERT INTO "services" ("id","business_id","name","unit","rate_paise","loss_rate_g","active","sort") VALUES('svc-6','biz-maurya-solar-001','मसाला पिसाई (Spices)','kg',2500,0,1,5);
INSERT INTO "services" ("id","business_id","name","unit","rate_paise","loss_rate_g","active","sort") VALUES('svc-7','biz-maurya-solar-001','सरसों तेल घानी (Mustard Oil)','kg',400,0,1,6);
CREATE TABLE customers (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_key     TEXT NOT NULL,
  village      TEXT NOT NULL DEFAULT '',
  village_key  TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL
, photo TEXT NOT NULL DEFAULT '');
CREATE TABLE entries (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  customer_id  TEXT,
  kind         TEXT NOT NULL,
  service_id   TEXT,
  name         TEXT NOT NULL DEFAULT '',
  village      TEXT NOT NULL DEFAULT '',
  gross_weight REAL,
  loss_g       REAL NOT NULL DEFAULT 0,
  net_weight   REAL,
  rate_paise   INTEGER,
  amount_paise INTEGER NOT NULL,
  paid         INTEGER NOT NULL DEFAULT 1,
  note         TEXT NOT NULL DEFAULT '',
  token_no     INTEGER,
  day          TEXT NOT NULL,
  created_at   INTEGER NOT NULL
, item_name TEXT NOT NULL DEFAULT '', unit TEXT NOT NULL DEFAULT 'kg', hide_loss INTEGER NOT NULL DEFAULT 0);
INSERT INTO "entries" ("id","business_id","customer_id","kind","service_id","name","village","gross_weight","loss_g","net_weight","rate_paise","amount_paise","paid","note","token_no","day","created_at","item_name","unit","hide_loss") VALUES('20ce0679-183e-4f67-a833-75e5a71e851d','biz-maurya-solar-001',NULL,'job','svc-1','Ramesh','Ashogapur',40,800,39.2,120,4800,1,'',9,'2026-11-10',1794329420214,'','kg',0);
INSERT INTO "entries" ("id","business_id","customer_id","kind","service_id","name","village","gross_weight","loss_g","net_weight","rate_paise","amount_paise","paid","note","token_no","day","created_at","item_name","unit","hide_loss") VALUES('c5eef847-b97d-4100-93f9-11c5324ffb0a','biz-maurya-solar-001',NULL,'job','svc-1','Ramesh','Ashogapur',40,800,39.2,120,4800,1,'',9,'2026-11-10',1794329629093,'','kg',0);
INSERT INTO "entries" ("id","business_id","customer_id","kind","service_id","name","village","gross_weight","loss_g","net_weight","rate_paise","amount_paise","paid","note","token_no","day","created_at","item_name","unit","hide_loss") VALUES('d8e1f106-3a2e-4f4f-adca-54a33c717122','biz-maurya-solar-001',NULL,'job','svc-2','सुरेश','नकहा',12,240,11.76,200,2352,1,'',NULL,'2026-11-12',1794474094378,'','kg',0);
INSERT INTO "entries" ("id","business_id","customer_id","kind","service_id","name","village","gross_weight","loss_g","net_weight","rate_paise","amount_paise","paid","note","token_no","day","created_at","item_name","unit","hide_loss") VALUES('b9280310-980c-4a07-be69-2a2d68dcaeb7','biz-maurya-solar-001','','job','svc-1','','',31.2,468,30.732,120,3688,1,'',1,'2026-11-12',1794474335741,'','kg',0);
INSERT INTO "entries" ("id","business_id","customer_id","kind","service_id","name","village","gross_weight","loss_g","net_weight","rate_paise","amount_paise","paid","note","token_no","day","created_at","item_name","unit","hide_loss") VALUES('da67473b-2dd2-4f0b-a4d4-fd68a08666b6','biz-maurya-solar-001',NULL,'job','svc-1','Manoj','केवल पुरवा',31.2,468,30.732,120,3688,1,'',1,'2026-11-12',1794474388313,'','kg',0);
INSERT INTO "entries" ("id","business_id","customer_id","kind","service_id","name","village","gross_weight","loss_g","net_weight","rate_paise","amount_paise","paid","note","token_no","day","created_at","item_name","unit","hide_loss") VALUES('c0bbe739-d28b-4285-b9e3-ae1c0049d4e4','biz-maurya-solar-001','','job','svc-1','','',22.8,342,22.458000000000002,120,2736,1,'',NULL,'2026-11-12',1794484977821,'','kg',0);
CREATE TABLE tokens (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  day          TEXT NOT NULL,
  no           INTEGER NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  village      TEXT NOT NULL DEFAULT '',
  service_id   TEXT,
  gross_weight REAL DEFAULT 0,
  loss_g       REAL NOT NULL DEFAULT 0,
  net_weight   REAL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'waiting',
  created_at   INTEGER NOT NULL
, phone TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', hide_loss INTEGER NOT NULL DEFAULT 0);
INSERT INTO "tokens" ("id","business_id","day","no","name","village","service_id","gross_weight","loss_g","net_weight","status","created_at","phone","note","hide_loss") VALUES('aa9feb54-95b1-4083-8732-ac96ff1b1e30','biz-maurya-solar-001','2026-11-10',1,'रामेश्वर मौर्य','रामपुर','svc-1',25,375,24.625,'done',1794274671952,'9876543210','',0);
INSERT INTO "tokens" ("id","business_id","day","no","name","village","service_id","gross_weight","loss_g","net_weight","status","created_at","phone","note","hide_loss") VALUES('a3c2f0d6-a601-43ee-9f53-238297778b89','biz-maurya-solar-001','2026-11-10',2,'दिनेश कुमार','रामपुर',NULL,0,0,0,'done',1794298890468,'','',0);
INSERT INTO "tokens" ("id","business_id","day","no","name","village","service_id","gross_weight","loss_g","net_weight","status","created_at","phone","note","hide_loss") VALUES('0d013d0a-0ba6-4eac-9339-17d82313e204','biz-maurya-solar-001','2026-11-10',3,'रामू किसान','बहेड़ी','svc-1',50,750,49.25,'done',1794301257943,'9876543210','',0);
INSERT INTO "tokens" ("id","business_id","day","no","name","village","service_id","gross_weight","loss_g","net_weight","status","created_at","phone","note","hide_loss") VALUES('0e58510c-a374-4b25-a677-1581ab2ff1c8','biz-maurya-solar-001','2026-11-10',9,'Ramesh','Ashogapur','svc-1',40,800,39.2,'done',1794328255634,'9565121314','Mahin pisna hai',0);
INSERT INTO "tokens" ("id","business_id","day","no","name","village","service_id","gross_weight","loss_g","net_weight","status","created_at","phone","note","hide_loss") VALUES('69801677-cfcb-46a0-b4c5-f87fa7d360f1','biz-maurya-solar-001','2026-11-11',1,'ग्राहक','','svc-1',40,600,39.4,'done',1794412513757,'','',0);
INSERT INTO "tokens" ("id","business_id","day","no","name","village","service_id","gross_weight","loss_g","net_weight","status","created_at","phone","note","hide_loss") VALUES('69b5addb-b16a-412f-8b92-d97da7307804','biz-maurya-solar-001','2026-11-12',1,'ग्राहक','','svc-1',31.2,468,30.732,'delivered',1794460105676,'','',0);
INSERT INTO "tokens" ("id","business_id","day","no","name","village","service_id","gross_weight","loss_g","net_weight","status","created_at","phone","note","hide_loss") VALUES('c47bfdab-d613-41c7-90fd-17dbfc322363','biz-maurya-solar-001','2026-11-12',2,'ग्राहक','','svc-1',30.8,462,30.338,'delivered',1794460153566,'','',0);
INSERT INTO "tokens" ("id","business_id","day","no","name","village","service_id","gross_weight","loss_g","net_weight","status","created_at","phone","note","hide_loss") VALUES('d7972544-af78-430d-a951-4c7ae1e7a317','biz-maurya-solar-001','2026-11-12',3,'अमन मौर्या','केवल पुरवा','svc-1',40,800,39.2,'delivered',1794473826237,'','Mahin pisna hai',0);
INSERT INTO "tokens" ("id","business_id","day","no","name","village","service_id","gross_weight","loss_g","net_weight","status","created_at","phone","note","hide_loss") VALUES('4f3ee9a3-8e40-4c0c-a9c3-87bb79eab76d','biz-maurya-solar-001','2026-11-12',4,'संतोष','सहजनी','svc-7',25,0,25,'serving',1794474219134,'','',0);
INSERT INTO "tokens" ("id","business_id","day","no","name","village","service_id","gross_weight","loss_g","net_weight","status","created_at","phone","note","hide_loss") VALUES('ee283474-8ce8-4c86-95c6-d0ef3474210e','biz-maurya-solar-001','2026-11-13',1,'गोमति','','svc-1',29,435,28.565,'serving',1794537254906,'','',0);
CREATE TABLE day_counters (
  business_id  TEXT NOT NULL,
  day          TEXT NOT NULL,
  last_no      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, day)
);
INSERT INTO "day_counters" ("business_id","day","last_no") VALUES('biz-maurya-solar-001','2026-11-10',9);
INSERT INTO "day_counters" ("business_id","day","last_no") VALUES('biz-maurya-solar-001','2026-11-11',1);
INSERT INTO "day_counters" ("business_id","day","last_no") VALUES('biz-maurya-solar-001','2026-11-12',4);
INSERT INTO "day_counters" ("business_id","day","last_no") VALUES('biz-maurya-solar-001','2026-11-13',1);
CREATE TABLE products (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'both', unit TEXT NOT NULL DEFAULT 'kg', default_rate_paise INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
INSERT INTO "products" ("id","business_id","name","type","unit","default_rate_paise","active","created_at") VALUES('prod-m-01','biz-maurya-solar-001','शुद्ध सरसों तेल','sale','ltr',15000,1,1794273600000);
INSERT INTO "products" ("id","business_id","name","type","unit","default_rate_paise","active","created_at") VALUES('prod-m-02','biz-maurya-solar-001','ताजा चक्की आटा','sale','kg',3200,1,1794273600000);
INSERT INTO "products" ("id","business_id","name","type","unit","default_rate_paise","active","created_at") VALUES('prod-m-03','biz-maurya-solar-001','चना बेसन','sale','kg',8500,1,1794273600000);
INSERT INTO "products" ("id","business_id","name","type","unit","default_rate_paise","active","created_at") VALUES('prod-m-04','biz-maurya-solar-001','सरसों खली (पशु आहार)','both','kg',2800,1,1794273600000);
INSERT INTO "products" ("id","business_id","name","type","unit","default_rate_paise","active","created_at") VALUES('prod-m-05','biz-maurya-solar-001','गेहूँ चोकर / भूसी','sale','kg',2200,1,1794273600000);
INSERT INTO "products" ("id","business_id","name","type","unit","default_rate_paise","active","created_at") VALUES('prod-m-06','biz-maurya-solar-001','मक्का आटा','sale','kg',3000,1,1794273600000);
INSERT INTO "products" ("id","business_id","name","type","unit","default_rate_paise","active","created_at") VALUES('prod-m-07','biz-maurya-solar-001','सरसों (किसान से खरीद)','purchase','kg',5200,1,1794273600000);
INSERT INTO "products" ("id","business_id","name","type","unit","default_rate_paise","active","created_at") VALUES('prod-m-08','biz-maurya-solar-001','गेहूँ (किसान से खरीद)','purchase','kg',2400,1,1794273600000);
INSERT INTO "products" ("id","business_id","name","type","unit","default_rate_paise","active","created_at") VALUES('prod-m-09','biz-maurya-solar-001','मक्का (किसान से खरीद)','purchase','kg',2000,1,1794273600000);
INSERT INTO "products" ("id","business_id","name","type","unit","default_rate_paise","active","created_at") VALUES('prod-m-10','biz-maurya-solar-001','चना (किसान से खरीद)','purchase','kg',5800,1,1794273600000);
CREATE INDEX sessions_biz ON sessions(business_id);
CREATE INDEX services_biz ON services(business_id);
CREATE UNIQUE INDEX customers_biz_name_village ON customers(business_id, name_key, village_key);
CREATE INDEX entries_biz_time ON entries(business_id, created_at);
CREATE INDEX entries_biz_cust ON entries(business_id, customer_id);
CREATE UNIQUE INDEX tokens_biz_day_no ON tokens(business_id, day, no);
CREATE INDEX tokens_biz_day ON tokens(business_id, day, status);
CREATE INDEX products_biz ON products(business_id);
CREATE INDEX idx_entries_cust_bal ON entries(business_id, customer_id, kind, paid, amount_paise, created_at);
CREATE INDEX idx_entries_biz_time ON entries(business_id, created_at DESC);
CREATE INDEX idx_entries_biz_kind_paid ON entries(business_id, kind, paid, created_at);
CREATE INDEX idx_tokens_biz_day_status ON tokens(business_id, day, status, no);
CREATE INDEX idx_customers_biz_name_village ON customers(business_id, name_key, village_key);
CREATE INDEX idx_services_biz_active ON services(business_id, active, sort);
CREATE INDEX idx_products_biz_active ON products(business_id, active);
