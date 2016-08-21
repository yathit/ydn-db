ydn.debug.log('ydn.db', 300);
var schema = {stores: [
  {name: "test", keyPath: 'id', type: 'INTEGER',
    indexes: [
    { name: 'name', keyPath: 'name', type: 'TEXT'},
    { name: 'date', keyPath: 'date', type: 'INTEGER'},
    { name: 'local', keyPath: 'local', type: 'INTEGER'}
  ]}
]};
var dbName = "test";
var options = {
  mechanisms: ["websql", "indexeddb", "localstorage"], // default ordering
  size: 2 * 1024 * 1024
};


test("heavy load", function(){
  var db = new ydn.db.Storage(dbName, schema, options);

  for(var i=0; i<100; i++){
    var data = {"type":"0","xml":"<?xml version=\"1.0\" encoding=\"utf-16\"?><response>\n <result>\n <code>200</code>\n <message>Success</message>\n </result>\n <meta>\n <companybo>\n <fingerprint/>\n <createdbyid>1</createdbyid>\n <createddate>20110809125155</createddate>\n <lastmodifiedbyid>1</lastmodifiedbyid>\n <lastmodifieddate>20110809125155</lastmodifieddate>\n </companybo>\n <serverTime>20130311075824</serverTime>\n </meta>\n <data>\n <companybo>\n <id>10</id>\n <companyname>QWERTY Logistics</companyname>\n <naturalperson>False</naturalperson>\n <activities/>\n <documents/>\n <contacts/>\n <naturalpersonname/>\n <naturalpersonsurname/>\n <companycode/>\n <address>1709 Washington Boulevard</address>\n <city>LUTHERSBURG</city>\n <region/>\n <categories>\n <value>1</value>\n </categories>\n <stateprovince>PA</stateprovince>\n <state>Kazakhstan</state>\n <zipcode>15848</zipcode>\n <phone>(885) 544-2106</phone>\n <fax/>\n <normalizeemail>\n <emailnormalized>\n <email>hxpscf@yahoo.ca</email>\n <macrotype>0</macrotype>\n <subtype>0</subtype>\n <note/>\n </emailnormalized>\n </normalizeemail>\n <website/>\n <vatid/>\n <taxid/>\n <billed>0,0000</billed>\n <companytypeid>0</companytypeid>\n <contacttypeid>0</contacttypeid>\n <groups>\n <value>1</value>\n <value>0</value>\n </groups>\n <salepersons/>\n <ownerid>1</ownerid>\n <description/>\n <addresses>\n <addresses/>\n </addresses>\n <freefields>\n <ff_111/>\n <ff_113/>\n </freefields>\n </companybo>\n </data>\n</response>"};

    db.get("test", 0).done(function(d){
      db.put("test", data);
    });

  }
  ok( 1 == "1", "Passed!" );
});






