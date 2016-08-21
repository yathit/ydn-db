/**
 * Created with IntelliJ IDEA.
 * User: mbikt
 * Date: 8/28/12
 * Time: 9:25 AM
 * To change this template use File | Settings | File Templates.
 */

schema = {
  Stores: [{
    name: 'customer',
    keyPath: 'email',
    type: 'TEXT',
    Indexes: [{
      name: 'email',
      type: 'TEXT',
      unique: true
    }, {
      name: 'age',
      type: 'NUMERIC'
    }, {
      name: 'first',
      type: 'TEXT'
    }]
  }]
};
db = new ydn.db.Storage('query_test6', schema);
customer_data = [{
  email: 'a@gmail.com',
  first: 'A',
  last: 'Z',
  full_name: 'A Z',
  sex: 'FEMALE',
  age: 24,
  country: 'SG'
}, {
  email: 'b@gmail.com',
  first: 'Ba',
  last: 'Z',
  full_name: 'Ba Z',
  sex: 'FEMALE',
  age: 18,
  country: 'US'
}, {
  email: 'c@gmail.com',
  first: 'Bc',
  last: 'Z',
  full_name: 'Bc Z',
  sex: 'MALE',
  age: 19,
  country: 'SG'
}, {
  email: 'd@gmail.com',
  first: 'D',
  last: 'Z',
  full_name: 'D Z',
  sex: 'FEMALE',
  age: 19,
  country: 'SG'
}];
db.put('customer', customer_data);
