/**
 * @fileoverview Generate random data.
 *
 * User: kyawtun
 * Date: 22/11/12
 */



pickOne = function(arr) {
  return arr[(arr.length * Math.random()) | 0];
};

pickMany = function(arr, n) {
  var out = [];
  n = n || 5;
  for (var i = 0; i < 1 + Math.random() * n; i++) {
    out.push(pickOne(arr));
  }
  return out;
};


/**
 * Generate random name
 *
 * @return {string} return a random name.
 */
randString = function (n) {
  var s = [];
  for (var i = 0; i < n; i++) {

    s[i] = 'abcdefghijklmnopqrstuvwxyz'.charAt((26 * Math.random()) | 0);

  }
  return s.join('');
};

/**
 * Generate random name
 *
 * @return {string} return a random name.
 */
randName = function() {
  return randString(1).toUpperCase() + randString(Math.random() * 8);
};

/**
 * Generate a random email
 *
 * @return {string} return a random email.
 */
randEmail = function() {
  var id = randString(Math.random() * 7 + 1);
  var dn = randString(Math.random() * 5 + 1);
  return id + '@' + dn + '.com';
};


/**
 * Generate a random sentence without fullstop mark.
 *
 * @param {Array} keywords
 * @param {number} n_phase
 */
randSentence = function(keywords, n_phase) {

  var s1 = ['computer', 'software', 'javascript', 'browser', 'software testing', 'web framework', 'database', 'milddware'];
  var be = ['are', 'is', 'must', 'would', 'should'];
  var v1 = ['designed', 'process', 'compute', 'analyzed', 'carried out', 'removes', 'requires', 'drive', 'suspend'];
  var adv = ['obviously', 'immediately', 'quickly', 'slowly'];
  var c1 = ['initial state', 'halt', 'resting state', 'null', 'object store', 'IndexedDB', 'API', 'WebSQL', 'prototype', 'class'];
  var a1 = ['the', 'a', 'their', 'that', 'which'];
  var cj = ['but', 'not only', 'however', ',i.e,', 'is also called,', 'and', 'then', 'despite the fact that', 'on the other hand'];

  var phase = function(out, cap_first) {
    var s = pickOne(s1);
    if (cap_first) {
      s = s.substring(0, 1).toUpperCase() + s.substring(1);
    }
    out.push(s);
    if (keywords.length > 1) {
      out.push(pickOne(keywords));
    }

    var rv = Math.random();
    if (rv > 0.9) {
      out.push(pickOne(adv));
    } else if (rv > 0.8) {
      out.push(pickOne(be));
    }
    out.push(pickOne(v1));
    if (keywords.length > 0) {
      var w = pickOne(keywords);
      if (w) {
        out.push(w.toLowerCase());
      }
    }
    out.push(pickOne(a1));
    out.push(pickOne(c1));
  };

  var out = [];
  var n = !!n_phase ? n_phase : Math.random()*3 + 1;
  for (var i = 0; i < n; i++) {
    phase(out, i == 0);
    if (i < n-1) {
      out.push(pickOne(cj));
    }
  }
  return out.join(' ');
};


/**
 * Generate random paragraph.
 * @param {Array.<string>=} keywords optional keywords to include.
 * @return {string}
 */
randParagraph = function(keywords) {
  var out = [];
  var ns = Math.random() * 15 + 1;
  for (var i = 0; i < ns; i++) {
    var w = [];
    var wn = Math.random() * 20 + 1;
    for (var j = 0; j < wn; j++) {
      w[j] = randSentence(keywords);
    }
    var r = Math.random();
    var tr = r < 0.01 ? '!' : r < 0.05 ? '?' : '.';
    out[i] = w.join('').trim() + tr;
  }
  return out.join(' ');
};


/**
 * Generate random topics.
 * @param {number} n
 */
genTopics = function(n) {

  var topics = ['object-relational mapper','website wireframe','distributed computing','dynamic systems development method','open source','integrated library system','network programming framework','assistive technology','digital repository','geographic information system','irc services','file sharing','learning content management system','3d game engine','computer game','video transcoding','business intelligence software','compatibility layer','vulnerability scanner','water quality','software testing','web application framework','data cleansing','nosql','database','voice chat','television on demand','customer relationship management','digital library management system','jabber/xmpp server','image management','concurrent versions system','charting application','web scraping','internet browser add-on','middleware','collective code ownership','embodied agent','pdf reader','construction estimating software','optical character recognition','project management','virtualization','vector graphics editor','kata','statistics','continuous integration','voice over ip','backup software','distributed search engine','digital magazine','internet forum','runtime','network security services','data integration','electronic calendar','test automation','planner','electronic commerce','firmware','semantic wiki','central ad server','dvd authoring','machine translation','free software','email marketing','online spreadsheet','xml database','scripting language','field service management','web service','content repository','database management system','computer accessibility','weather forecasting','object-relational database','ftp server','a/b testing','business intelligence 2.0','social bookmarking','personalization engine','web application','machine learning','adobe flash','object database','diagramming software','semantic search','retail software','data compression','e-mail','windows mobile','php script','photos','data analysis','music tracker','expert system shell','guitar tablature software','non-linear editing system','programming language','photography','business software','music','platform','ringtone maker','animation','build automation','aggregator','law practice management software','community media','infrastructure as a service','audio software','terminal emulator','java platform, enterprise edition','parsing','software as a service','language learning software','unix-like','bittorrent client','grid computing','widget engine','software widget','source-to-source compiler','anti-spyware','email marketing software express standard edition','file transfer protocol','email sender accreditation','educational assessment','image viewer','uml tool','pdf converter','collaborative software','information extraction','triplestore','user assistance and performance support','content-control software','android mobile tools','video game console emulator','online public access catalog','wordpress','text editor','behavior driven development','uml case tool','framework','time banking','enterprise server','web service framework','graphics library','wysiwyg html editor','google drive','peer-to-peer','interpreter','actionscript','computer virus','productivity','data visualization','digital media framework','site-specific browser','google chrome extensions','ip scanner','email marketing software express advanced edition','media center','integrated test management','email campaigns','revit','natural language processing','ssh client','network utility','reverse engineering','object-oriented programming language','add-on','assembler','resource editor','business','online banking','enterprise resource planning','layout engine','browser plug-in','window manager','visual programming language','fleet management software','numerical linear algebra','wiki software','equation solver','wind farm','information visualization','wind power','communication','video','artificial intelligence','data conversion','web server','chatterbot','office suite','electronic payment','debugger','vocaloid','c to java virtual machine compilers','email marketing','malware scanner','expert system','first-person shooter','statistical machine translation','representational state transfer','outliner','personal information manager','vector based drawing application','office','social network','project velocity','scientific software','bug tracking system','software build','radio','solid','semantic web-the next gen web','internet marketing','audio player','visualization','on-the-fly encryption','rich internet application','dlna server','supply chain management software','desktop environment','presentation','bpm','energy accounting software','column-oriented dbms','learning management system','document classification','indexing','image organizer','side-scrolling','peer-to-peer file sharing','agile management','application server','calendar','web service','ad optimization','web analytics','remote backup service','core banking','web browser','information management','web search engine','printer driver','news client','instant messaging server','tax compliance solutions','puzzle','spy software','collaborative development environment','educational','volunteer computing','massively multiplayer online game','file system','network security toolkit','platform as a service','geospatial','chess engine','newsletter','business process management','e-commerce','energy planning software','disk encryption software','celebrity','antivirus software','game engine','bioinformatics','http file server','discussion board','template engine','programming language implementation','video conversion','electronic medical record','archive','named entity recognition','text processor','web browsers that run on mac os x','dns server','plug-in','relational database management system','screensaver','firefox extension','news reader','macintosh','refactoring','wind energy software','internet relay chat','e-mail client','proxy server','wireless media streaming','tag editor','file format converter program','traditional game','content management system','jquery plugin','operating system','3d rendering software','revision control','email appending','loudspeaker design','music notation software','computer aided design','mashup','educational software','computer-supported collaboration','getty images','data mining','media server','desktop application','audio engineer','file manager','natural language processing toolkits','build software','enterprise content management','computer vision','media asset management','audio signal processing','library','artificial life','java applet','multi-paradigm programming language','accounting software','procurement software','statistical package','kernel','computer software','network intrusion detection system','search engine','linux distribution','email marketing software express','friend-to-friend','cryptography','captcha','creative commons license','social software','graphics software','font management software','portable document format','osgi','city-building game','knowledge management system','format conversion','file archiver','java virtual machine','x86 virtualization','telephony','medical software','java persistence api','unit testing framework','blog software','video editing software','network connectivity','javascript framework','ergodic literature','virtual globe','raster graphics editor','quantum chemistry computer programs','key-value store','recruitment database software','rdf','media player','genealogy software','spreadsheet','hierarchical database management system','digital distribution','emulator','remote desktop software','molecular dynamics','home theater pc','business intelligence tools','windowing system','xml editor','device driver','multimedia','digital image editing','inter-process communication','business intelligence','email marketing software','board game','retail banking','extreme programming practices','systems management','utility software','product backlog','computer algebra system','scene graph engine','videoconferencing','freebase mass data operation script','bulk email marketing software','energy management software','simulation','rss','voxel','photo viewer','integrated development environment','digital asset management system','wiki','password manager','graph database','web application security scanner','opencalais','distributed revision control','object-relational mapping','hp quicktest professional','numerical data','software test engineering and quality assurance','enterprise 2.0','web-based email','component object model','port scanner','inventory management software','identity and access management','gambling','internet relay chat bot','address book','virtual world','word processor','software framework','natural language understanding','host/digital audio workstation','turn-based strategy','mobile resource management','social network analysis software','conversational agent','ajax','widget toolkit','download manager','sports','compiler','computer security','class driver','issue tracking system','desktop publishing','screencast','hp quality center','intelligent agent','internet content filtering','desktop organizer','browser extension','software library','document-oriented database','api','video on demand','internet relay chat bot','television','authentication','3d computer graphics software','instant messaging','disassembler','instant messaging client','citation analysis','general game playing','code review','internet security','federated database system','seo software tools','mathematics','web content management system','visual modelling and simulation environment','prototyping','collaboration','wardriving','web portal','mobile voip','html editor','multiplayer game','web ontology language','package management system','calculator software'];
  var out = [];

  for (var i = 0; i < n; i++) {
    out[i] = {
      name: topics[i],
      description: randParagraph([topics[i], topics[i]])
    };
  }
  return out;
};


/**
 * Generate random authors.
 * @param {number} n
 * @return {Array}
 */
genAuthors = function(n) {
  var out = [];
  for (var i = 0; i < n; i++) {
    out[i] = {
      first: randName(),
      last: randName(),
      born: +(new Date(1900+Math.random()*70, 12*Math.random(), 30*Math.random())),
      email: randEmail(),
      company: pickOne(companyList),
      hobby: pickMany(hobbyList)
    };
  }
  return out;
};

publishers = ['Nature', 'ACM', 'IEEE', 'Elsevier', 'Gale', 'Swets', 'AAS', 'EBSCO', 'Oxford', 'Springer'];

hobbyList = ['programming', 'camping', 'skitting', 'guitar', 'music', 'acting', 'football', 'blogging', 'teaching'];

companyList = ['Google', 'Amazon', 'Facebook', 'Twitter', 'Microsoft', 'Apple', 'Oracle', 'Netflix', 'Mozilla', 'Reddit', 'Cisco'];

companies = [
  {name: 'Google', slogan: "Don't be evil"},
  {name: 'Amazon', slogan: "…and You're Done"},
  {name: 'Facebook', slogan: "connects you with the people around you"},
  {name: 'Twitter', slogan: 'What are you doing right now?'},
  {name: 'Apple', slogan: 'Think different'},
  {name: 'Oracle', slogan: 'Software. Hardware. Complete.'},
  {name: 'Netflix', slogan: 'Save gas and time.'},
  {name: 'Mozilla', slogan: 'Get involved.'},
  {name: 'Reddit', slogan: 'The front page of the internet.'},
  {name: 'Cisco', slogan: 'This is the Power of the Network. Now.'},
  {name: 'Microsoft', slogan: "Be What's Next."}
];


/**
 * Generated random articles.
 * @param {number} n
 * @param {!Array.<string>} topics
 * @return {Array}
 */
genArticles = function(n, topics) {
  var out = [];
  for (var i = 0; i < n; i++) {

    var paragraphs = [];
    for (var j = 0, m = Math.random()*4; j < m; j++) {
      paragraphs[j] = randParagraph(topics);
    }
    out[i] = {
      title: randSentence(topics, 1),
      content: '<p>' + paragraphs.join('</p><p>') + '</p>',
      license: pickOne(['CC', 'ND', 'SA', 'NC', 'BY']),
      publisher: pickOne(publishers),
      publish: +(new Date(1990+Math.random()*12, 12*Math.random(), 30*Math.random())),
      topics: topics
    };
  }
  return out;
};

topic_store_schema = {
  name: 'topic',
  keyPath: 'name',
  type: 'TEXT'
};
author_store_schema = {
  name: 'author',
  keyPath: 'email',
  type: 'TEXT',
  indexes: [
    {
      keyPath: 'born',
      type: 'NUMERIC'
    }, {
      keyPath: 'company',
      type: 'TEXT'
    }, {
      keyPath: 'hobby',
      type: 'TEXT',
      multiEntry: true
    }]
};
company_store_schema = {
  name: 'company',
  keyPath: 'name',
  type: 'TEXT'
};
article_store_schema = {
  name: 'article',
  // type: ['TEXT', 'NUMERIC'],
  indexes: [
    {
      keyPath: 'title',
      type: 'TEXT'
    }, {
      keyPath: 'publish',
      type: 'NUMERIC'
    }, {
      keyPath: 'license',
      type: 'TEXT'
    }, {
      keyPath: 'publisher',
      type: 'TEXT'
    }, {
      keyPath: 'topics',
      multiEntry: true,
      type: 'TEXT'
//        }, {
//          name: 'topics, license',
//          keyPath: ['topics', 'license'],
//          multiEntry: true,
//          type: 'TEXT'
//        }, {
//
//Currently, multiEntry compound is not supported.
//http://www.w3.org/TR/IndexedDB/#widl-IDBObjectStore-createIndex-IDBIndex-DOMString-name-any-keyPath-IDBIndexParameters-optionalParameters
//
//          name: 'publish, title',
//          keyPath: ['publish', 'title'],
//          multiEntry: true,
//          type: 'TEXT'
    }, {
      keyPath: ['license', 'title']
    }, {
      keyPath: ['publisher', 'title']
    }, {
      name: 'publisher, publish',
      keyPath: ['publisher', 'publish']
    }, {
      keyPath: ['license', 'publisher']
    }, {
      keyPath: ['license', 'publisher', 'title']
    }, {
      keyPath: ['license', 'publisher', 'publish']
    }, {
//          keyPath: ['topics', 'title'],
//          multiEntry: true,
//          type: 'TEXT'
//        }, {
//          name: 'topics, license, title',
//          keyPath: ['topics', 'license', 'title'],
//          multiEntry: true,
//          type: 'TEXT'
//        }, {
      keyPath: ['license', 'publish']
//        }, {
//          name: 'topics, publish',
//          keyPath: ['topics', 'publish'],
//          multiEntry: true,
//          type: 'TEXT'
//        }, {
//          name: 'topics, license, publish',
//          keyPath: ['topics', 'license', 'publish'],
//          multiEntry: true,
//          type: 'TEXT'
    }
  ]
};

author_article_topic_schema = {
  version: 2,
  stores: [
    topic_store_schema, company_store_schema, author_store_schema, article_store_schema
  ]
};
